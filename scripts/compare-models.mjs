// One-off bake-off: run the same hard image through each candidate model and
// write the cutouts side by side so they can actually be looked at.
//   node scripts/compare-models.mjs <image.jpg>
import path from "node:path";
import { AutoModel, AutoProcessor, RawImage, env } from "@huggingface/transformers";
import sharp from "sharp";

env.allowLocalModels = false;

const CANDIDATES = [
  { id: "studioludens/birefnet-lite-512", key: "input_image", label: "birefnet-512" },
  { id: "briaai/RMBG-1.4", key: "input", label: "rmbg-1.4" },
];

const input = process.argv[2];
if (!input) {
  console.error("usage: node scripts/compare-models.mjs <image>");
  process.exit(1);
}

const OUT = path.join(process.cwd(), "tmp-compare");
await sharp(input).toFile(path.join(OUT, "_source.jpg")).catch(async () => {
  const { mkdirSync } = await import("node:fs");
  mkdirSync(OUT, { recursive: true });
  await sharp(input).toFile(path.join(OUT, "_source.jpg"));
});

const meta = await sharp(input).metadata();
const scale = Math.min(1, 900 / Math.max(meta.width, meta.height));
const w = Math.round(meta.width * scale);
const h = Math.round(meta.height * scale);
const { data } = await sharp(input).resize(w, h).removeAlpha().raw().toBuffer({ resolveWithObject: true });

for (const { id, key, label } of CANDIDATES) {
  const t0 = Date.now();
  try {
    const model = await AutoModel.from_pretrained(id, { dtype: "fp32" });
    const processor = await AutoProcessor.from_pretrained(id, {});
    const image = new RawImage(new Uint8ClampedArray(data), w, h, 3);

    const { pixel_values } = await processor(image);
    const out = await model({ [key]: pixel_values });
    const tensor = out.logits ?? out.output_image ?? out.output ?? Object.values(out)[0];
    const head = Array.isArray(tensor) ? tensor[0] : tensor;
    const activated = out.logits ? head.sigmoid() : head;

    const mh = activated.dims.at(-2);
    const mw = activated.dims.at(-1);
    const a = activated.data;

    const gray = Buffer.alloc(mw * mh);
    for (let i = 0; i < gray.length; i++) gray[i] = Math.round(a[i] * 255);
    const maskFull = await sharp(gray, { raw: { width: mw, height: mh, channels: 1 } })
      .resize(w, h)
      .raw()
      .toBuffer();

    const rgba = Buffer.alloc(w * h * 4);
    let on = 0;
    for (let i = 0; i < w * h; i++) {
      rgba[i * 4] = data[i * 3];
      rgba[i * 4 + 1] = data[i * 3 + 1];
      rgba[i * 4 + 2] = data[i * 3 + 2];
      rgba[i * 4 + 3] = maskFull[i];
      if (maskFull[i] > 127) on++;
    }
    await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
      .png()
      .toFile(path.join(OUT, `${label}.png`));

    console.log(
      `${label.padEnd(16)} ${((Date.now() - t0) / 1000).toFixed(1)}s  foreground ${((on / (w * h)) * 100).toFixed(1)}%`,
    );
  } catch (err) {
    console.log(`${label.padEnd(16)} FAILED  ${err.message.slice(0, 90)}`);
  }
}

console.log(`\nwrote ${OUT}`);
