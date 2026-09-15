// Pre-generates the sample cutouts shipped in /public/samples.
// Same model and pipeline the browser uses, run once here so the landing page
// needs no inference.   node scripts/cutouts.mjs
import { readdirSync } from "node:fs";
import path from "node:path";
import { pipeline, RawImage, env } from "@huggingface/transformers";
import sharp from "sharp";

env.allowLocalModels = false;

const DIR = path.join(process.cwd(), "public/samples");
const MODEL = "onnx-community/BiRefNet_lite-ONNX"; // MIT
const MAX = 1100;

const segment = await pipeline("background-removal", MODEL, { dtype: "fp32" });

// Sources are the retained `<name>-src.jpg`; a bare `<name>.jpg` counts too when
// you drop a fresh photo in. Prefer the bare file when both exist, so one photo
// never gets processed twice under two names.
const all = readdirSync(DIR).filter((f) => f.endsWith(".jpg"));
const bare = new Set(all.filter((f) => !f.endsWith("-src.jpg")).map((f) => f.replace(/\.jpg$/, "")));
const files = all.filter((f) => !(f.endsWith("-src.jpg") && bare.has(f.replace(/-src\.jpg$/, ""))));
console.log(`${files.length} photos\n`);

for (const file of files) {
  const name = file.replace(/(-src)?\.jpg$/, "");
  const src = path.join(DIR, file);

  const meta = await sharp(src).metadata();
  const scale = Math.min(1, MAX / Math.max(meta.width, meta.height));
  const w = Math.round(meta.width * scale);
  const h = Math.round(meta.height * scale);

  const { data } = await sharp(src).resize(w, h).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const image = new RawImage(new Uint8ClampedArray(data), w, h, 3);

  const out = await segment(image);
  const first = Array.isArray(out) ? out[0] : out;
  const sized = first.width === w ? first : await first.resize(w, h);

  let rgba;
  if (sized.channels === 4) {
    rgba = Buffer.from(sized.data);
  } else {
    rgba = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      rgba[i * 4] = data[i * 3];
      rgba[i * 4 + 1] = data[i * 3 + 1];
      rgba[i * 4 + 2] = data[i * 3 + 2];
      rgba[i * 4 + 3] = sized.data[i];
    }
  }

  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(DIR, `${name}-cut.png`));

  // Only needed when the input was a fresh full-size photo; `-src.jpg` is already it.
  if (!file.endsWith("-src.jpg")) {
    await sharp(src).resize(w, h).jpeg({ quality: 82 }).toFile(path.join(DIR, `${name}-src.jpg`));
  }

  console.log(`  ${name}  ${w}x${h}`);
}

console.log("\ndone");
