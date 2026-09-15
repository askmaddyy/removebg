/// <reference lib="webworker" />
import { AutoModel, AutoProcessor, RawImage, env } from "@huggingface/transformers";

env.allowLocalModels = false;
if (typeof caches !== "undefined") env.useBrowserCache = true;

/**
 * RMBG-1.4 — the fastest and cleanest of everything measured here (0.2s on a
 * dark, low-contrast photo where BiRefNet-lite-512 took 0.8s).
 *
 * LICENCE, deliberately: Bria license this non-commercially. This project is
 * free, open source and unmonetised, which is a defensible reading, and the
 * weights are never redistributed — the visitor's browser fetches them from
 * Hugging Face directly. If this ever takes money (ads, sponsorship, a paid
 * tier), swap to onnx-community/ormbg-ONNX, which is Apache-2.0 but
 * human-focused, or studioludens/birefnet-lite-512, which is MIT. Both were
 * verified working in this worker.
 *
 * Two details that fail silently if you get them wrong:
 *   - the input tensor is `input` (BiRefNet's is `input_image`)
 *   - the head is a LIST of multi-scale outputs; the mask needs indexing twice
 */
const MODEL_ID = "briaai/RMBG-1.4";

/** The processor resizes internally; this only stops a 4000px phone photo from
 *  being copied around at full size, which is pure cost. */
const INFER_CAP = 1024;

type Dtype = "fp16" | "fp32";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loaded = { model: any; processor: any; device: string; dtype: Dtype };
let loading: Promise<Loaded> | null = null;
let preferredDtype: Dtype = "fp16";

function post(msg: Record<string, unknown>) {
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg);
}

async function load(): Promise<Loaded> {
  const devices: Array<"webgpu" | "wasm"> = [];
  if ("gpu" in navigator) devices.push("webgpu");
  devices.push("wasm");

  let last: unknown;
  for (const device of devices) {
    try {
      // Multi-threaded WASM is where the flaky allocations show up; one thread
      // is slower but survives.
      if (device === "wasm" && env.backends?.onnx?.wasm) {
        env.backends.onnx.wasm.numThreads = 1;
      }
      const [model, processor] = await Promise.all([
        AutoModel.from_pretrained(MODEL_ID, {
          device,
          dtype: preferredDtype,
          progress_callback: (p: { status: string; progress?: number }) => {
            if (p.status === "progress" && typeof p.progress === "number") {
              post({ type: "load", progress: p.progress });
            }
          },
        }),
        AutoProcessor.from_pretrained(MODEL_ID, {}),
      ]);
      post({ type: "ready", device: `${device}/${preferredDtype}` });
      return { model, processor, device, dtype: preferredDtype };
    } catch (err) {
      last = err;
    }
  }
  throw last instanceof Error ? last : new Error("Could not start the model");
}

function getLoaded() {
  if (!loading) {
    loading = load().catch((e) => {
      loading = null; // a failed load must not poison later attempts
      throw e;
    });
  }
  return loading;
}

/**
 * Catches a run that collapsed to all-on or all-off — the known failure mode of
 * some fp16 exports.
 *
 * The bounds are deliberately extreme. A subject can legitimately fill almost
 * the whole frame (a cat sprawled over a laptop, a close-up portrait), and an
 * earlier 99.8% ceiling threw those away as "empty" when the cut was fine.
 * Only a mask with essentially no variation is actually broken.
 */
function alphaLooksSane(rgba: Uint8ClampedArray) {
  let on = 0;
  let n = 0;
  for (let i = 3; i < rgba.length; i += 4 * 37, n++) if (rgba[i] > 127) on++;
  const frac = on / Math.max(1, n);
  return frac > 0.0005 && frac < 0.9995;
}

async function runModel(loaded: Loaded, image: RawImage): Promise<RawImage> {
  const { pixel_values } = await loaded.processor(image);
  const out = await loaded.model({ input: pixel_values });

  const tensor = out.output ?? out.logits ?? Object.values(out)[0];
  if (!tensor) throw new Error("The model returned no mask");
  // A list of multi-scale heads; the finest is first, and it needs indexing
  // once more to reach the mask itself. Reading `head` gives a wrong slice —
  // it decodes as horizontal striping rather than failing outright.
  const head = Array.isArray(tensor) ? tensor[0] : tensor;
  return RawImage.fromTensor(head[0].mul(255).to("uint8")) as RawImage;
}

/**
 * Downscale the source for inference, keeping its aspect ratio. Doing this
 * before the model runs also means a full-resolution phone photo isn't held at
 * full size while ONNX works, which is where memory-tight browsers fall over.
 */
function toModelInput(bitmap: ImageBitmap) {
  const k = Math.min(1, INFER_CAP / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * k));
  const h = Math.max(1, Math.round(bitmap.height * k));
  const c = new OffscreenCanvas(w, h);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  return new RawImage(new Uint8ClampedArray(data), w, h, 4);
}

async function cut(bitmap: ImageBitmap, id: number) {
  let loaded = await getLoaded();
  post({ type: "stage", id, stage: "matting" });

  const W = bitmap.width;
  const H = bitmap.height;
  const src = new OffscreenCanvas(W, H);
  const sctx = src.getContext("2d", { willReadFrequently: true })!;
  sctx.drawImage(bitmap, 0, 0);
  const full = sctx.getImageData(0, 0, W, H);

  const wide = toModelInput(bitmap);

  let coarse: RawImage;
  try {
    coarse = await runModel(loaded, wide);
  } catch (err) {
    // WebGPU can load cleanly and still fail inside OrtRun; drop to WASM rather
    // than failing the cut outright.
    if (!loaded.device.startsWith("webgpu")) throw err;
    loading = null;
    post({ type: "load", progress: 0 });
    loaded = await getLoaded();
    coarse = await runModel(loaded, wide);
  }

  // A crop-and-re-infer second pass lived here and was removed. On an easy
  // photo it sharpened edges; on a hard one it destroyed the subject, because
  // it derived the crop box FROM the first mask. A weak first pass produced a
  // wrong box, and pasting the second result over that region locked the
  // mistake in instead of correcting it. It also doubled the runtime.
  const mask = coarse;

  const sized =
    mask.width === W && mask.height === H ? mask : await mask.resize(W, H);
  for (let i = 0; i < sized.data.length; i++) full.data[i * 4 + 3] = sized.data[i];

  // A degenerate mask is nearly always fp16 collapsing, not a bad photo. Rebuild
  // the engine at fp32 and run it again before giving up — and if that still
  // looks wrong, hand back what we have rather than blocking: a rough cut the
  // refine brush can fix beats a dead end.
  if (!alphaLooksSane(full.data) && loaded.dtype === "fp16") {
    preferredDtype = "fp32";
    loading = null;
    post({ type: "load", progress: 0 });
    loaded = await getLoaded();

    const retry = await runModel(loaded, wide);
    const sizedRetry =
      retry.width === W && retry.height === H ? retry : await retry.resize(W, H);
    // The canvas still holds the untouched source at this point — putImageData
    // hasn't run yet — so this is a clean copy of the original pixels.
    const candidate = sctx.getImageData(0, 0, W, H);
    for (let i = 0; i < sizedRetry.data.length; i++) {
      candidate.data[i * 4 + 3] = sizedRetry.data[i];
    }
    // Keep it only if it's actually better; otherwise ship the first attempt.
    if (alphaLooksSane(candidate.data)) full.data.set(candidate.data);
  }

  sctx.putImageData(full, 0, 0);
  const blob = await src.convertToBlob({ type: "image/png" });
  post({
    type: "done",
    id,
    blob,
    device: loaded.device,
    width: bitmap.width,
    height: bitmap.height,
  });
  bitmap.close();
}

self.onmessage = async (e: MessageEvent) => {
  const { type } = e.data;
  if (type === "warm") {
    try {
      await getLoaded();
    } catch (err) {
      post({ type: "error", message: (err as Error).message });
    }
    return;
  }
  if (type === "cut") {
    try {
      await cut(e.data.bitmap, e.data.id);
    } catch (err) {
      post({ type: "error", id: e.data.id, message: (err as Error).message });
    }
  }
};
