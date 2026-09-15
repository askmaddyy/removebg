# removebg.fyi

Free background remover that runs entirely in your browser. Nothing is uploaded —
the model is downloaded to the visitor's machine and every image is processed
locally, so there is no server to send photos to.

**[removebg.fyi](https://removebg.fyi)**

## How it works

A matting model runs client-side via [Transformers.js](https://huggingface.co/docs/transformers.js),
on WebGPU where available and WebAssembly everywhere else. The weights are cached
by the browser after the first visit, so it keeps working offline.

```
drop / paste / pick a file
          ↓
   Web Worker (off the main thread)
          ↓
   RMBG-1.4 via Transformers.js
          ↓
    WebGPU · WASM fallback
          ↓
  transparent PNG, full resolution
```

There are no API routes and no server-side image processing. The whole site is a
static export.

## Features

- Cutout at the source image's full resolution
- Background replacement — transparent, solid, gradient, or the original blurred
- Cast shadow with opacity, blur, angle and distance
- Refine brush — erase and restore by hand, with undo
- Before/after compare slider
- Download PNG or copy straight to the clipboard
- Light and dark themes

## Running locally

```bash
npm install
npm run dev
```

```bash
npm run build      # static export to ./out
npm run lint
```

Regenerate the sample cutouts shipped in `public/samples` (only needed if you
change the sample photos):

```bash
node scripts/cutouts.mjs
```

Compare candidate models on your own image:

```bash
node scripts/compare-models.mjs path/to/photo.jpg
```

## Deployment

Static export, so any static host works. Build command `npm run build`, output
directory `out`.

## A note on the model licence

**The code in this repository is MIT. The model is not.**

The default model is [`briaai/RMBG-1.4`](https://huggingface.co/briaai/RMBG-1.4),
which Bria license for **non-commercial use**. The weights are never
redistributed here — the visitor's browser fetches them from Hugging Face
directly — and this site is free, open and unmonetised. If you fork this and
intend to make money from it, swap the model. Two drop-in alternatives were
tested and work in `lib/bg.worker.ts`:

| Model | Licence | Notes |
| --- | --- | --- |
| `briaai/RMBG-1.4` | Non-commercial | Current default. Fastest and cleanest in testing. |
| `onnx-community/ormbg-ONNX` | Apache-2.0 | Open alternative, human-focused. |
| `studioludens/birefnet-lite-512` | MIT | Needs `input_image` as the tensor name and a 512² square input. |

Swapping means changing `MODEL_ID` and the tensor names in `runModel` — the
comments in that file spell out what each model expects.

## Stack

Next.js (static export) · Transformers.js · Tailwind · GSAP

UI components from [ObsidianUI](https://obsidianui.dev) and
[React Bits](https://reactbits.dev).

## Licence

MIT — see [LICENSE](./LICENSE). Model weights are licensed separately by their
respective authors; see the note above.

Built by [AskMaddyy](https://askmaddyy.com).
