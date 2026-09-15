"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { ORB_SHADER } from "@/lib/orb-shader";

/* Uniform layout — 40 scalars, then vec4 colours on the next 16-byte boundary.
   Must match the struct in orb-shader.ts exactly. */
const F = {
  size: 0,
  time: 2,
  speed: 3,
  radius: 4,
  zoom: 5,
  warp: 6,
  ridgeAmt: 7,
  sharp: 8,
  shade: 9,
  sheen: 10,
  gloss: 11,
  shellMidAlpha: 12,
  shellEdgeAlpha: 13,
  exposure: 14,
  style: 15,
  edgeSoftness: 16,
  edgeGlow: 17,
  paletteCount: 18,
  glassEnabled: 19,
  glassOpacity: 20,
  contourDeform: 21,
} as const;

const COLORS = 40;
const TOTAL_FLOATS = 136;

/** Scalars for the "liquid chrome under glass" look (style 12). */
const SCALARS: Array<[number, number]> = [
  [F.speed, 0.55],
  [F.radius, 0.72],
  [F.zoom, 0.36],
  [F.warp, 3.8],
  [F.ridgeAmt, 0.44],
  [F.sharp, 5.2],
  [F.shade, 0.58],
  [F.sheen, 0.36],
  [F.gloss, 0.28],
  [F.shellMidAlpha, 0.2],
  [F.shellEdgeAlpha, 0.22],
  [F.exposure, 1.08],
  [F.style, 12],
  [F.edgeSoftness, 0.005],
  [F.glassEnabled, 1],
  [F.glassOpacity, 0.42],
  [F.contourDeform, 0.42],
];

type RGB = [number, number, number];
/** colorD is the low end of the chrome ramp, colorA the bright flare. */
type Palette = {
  a: RGB; b: RGB; c: RGB; d: RGB;
  highlight: RGB; shellInner: RGB; shellMid: RGB; shellEdge: RGB;
  sheen: RGB; spec: RGB; canvas: RGB; glow: RGB;
};

const DARK: Palette = {
  a: [1, 1, 1],
  b: [0.725, 0.753, 0.792],
  c: [0.204, 0.227, 0.263],
  d: [0.012, 0.016, 0.02],
  highlight: [1, 1, 1],
  shellInner: [1, 1, 1],
  shellMid: [0.725, 0.753, 0.792],
  shellEdge: [1, 1, 1],
  sheen: [0.918, 0.957, 1],
  spec: [0.863, 0.918, 1],
  canvas: [0.02, 0.024, 0.031],
  glow: [1, 1, 1],
};

/* Light mode inverts the ramp: graphite chrome on a near-white disc, so the
   same material reads on a pale page instead of washing out. */
const LIGHT: Palette = {
  a: [0.05, 0.05, 0.06],
  b: [0.22, 0.24, 0.27],
  c: [0.55, 0.57, 0.6],
  d: [0.9, 0.905, 0.91],
  highlight: [0.99, 0.99, 0.98],
  shellInner: [1, 1, 1],
  shellMid: [0.62, 0.66, 0.72],
  shellEdge: [0.99, 0.99, 1],
  sheen: [1, 1, 1],
  spec: [0.88, 0.92, 1],
  canvas: [0.965, 0.965, 0.955],
  glow: [0.2, 0.22, 0.26],
};

function buildUniforms(p: Palette) {
  const v = new Float32Array(TOTAL_FLOATS);
  for (const [i, n] of SCALARS) v[i] = n;
  const order: RGB[] = [
    p.a, p.b, p.c, p.d, p.highlight, p.shellInner,
    p.shellMid, p.shellEdge, p.sheen, p.spec, p.canvas, p.glow,
  ];
  order.forEach((rgb, i) => {
    v.set([rgb[0], rgb[1], rgb[2], 1], COLORS + i * 4);
  });
  return v;
}

export function LiquidOrb({ className = "" }: { className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const [failed, setFailed] = useState(false);
  // Keep the latest palette in a ref so a theme flip re-colours the next frame
  // instead of tearing down the GPU device.
  const palette = useRef(DARK);
  useEffect(() => {
    palette.current = resolvedTheme === "light" ? LIGHT : DARK;
  }, [resolvedTheme]);

  useEffect(() => {
    const el = canvas.current;
    if (!el || !("gpu" in navigator)) {
      setFailed(true);
      return;
    }

    let stopped = false;
    let frame = 0;
    let device: GPUDevice | null = null;
    let phase = 0;
    let last: number | null = null;

    (async () => {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw new Error("no adapter");
        device = await adapter.requestDevice();
        if (stopped) {
          device.destroy();
          return;
        }
        const ctx = el.getContext("webgpu");
        if (!ctx) throw new Error("no context");

        const format = navigator.gpu.getPreferredCanvasFormat();
        ctx.configure({ device, format, alphaMode: "premultiplied" });

        const shader = device.createShaderModule({ code: ORB_SHADER });
        const info = await shader.getCompilationInfo();
        const errors = info.messages.filter((m) => m.type === "error");
        if (errors.length) throw new Error(errors.map((m) => m.message).join("; "));

        const pipeline = device.createRenderPipeline({
          layout: "auto",
          vertex: { module: shader, entryPoint: "vs_main" },
          fragment: {
            module: shader,
            entryPoint: "fs_main",
            targets: [
              {
                format,
                blend: {
                  color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
                  alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
                },
              },
            ],
          },
          primitive: { topology: "triangle-list" },
        });

        const values = buildUniforms(palette.current);
        const buffer = device.createBuffer({
          size: values.byteLength,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        const bind = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [{ binding: 0, resource: { buffer } }],
        });

        device.lost.then(() => setFailed(true));

        const draw = (now: number) => {
          if (stopped || !device) return;
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const w = Math.max(1, Math.floor(el.clientWidth * dpr));
          const h = Math.max(1, Math.floor(el.clientHeight * dpr));
          if (el.width !== w || el.height !== h) {
            el.width = w;
            el.height = h;
          }

          values.set(buildUniforms(palette.current));
          const dt = last === null ? 0 : Math.min(0.1, (now - last) / 1000);
          last = now;
          phase += dt * Math.max(values[F.speed], 0);
          values[F.size] = w;
          values[F.size + 1] = h;
          values[F.time] = phase / Math.max(values[F.speed], 0.001);
          device.queue.writeBuffer(buffer, 0, values);

          const enc = device.createCommandEncoder();
          const pass = enc.beginRenderPass({
            colorAttachments: [
              {
                view: ctx.getCurrentTexture().createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                loadOp: "clear",
                storeOp: "store",
              },
            ],
          });
          pass.setPipeline(pipeline);
          pass.setBindGroup(0, bind);
          pass.draw(3);
          pass.end();
          device.queue.submit([enc.finish()]);
          frame = requestAnimationFrame(draw);
        };
        frame = requestAnimationFrame(draw);
      } catch {
        setFailed(true);
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      device?.destroy();
    };
  }, []);

  if (failed) return <OrbFallback className={className} />;
  return <canvas ref={canvas} aria-hidden className={className} />;
}

/** No WebGPU — which is exactly the WASM crowd, so it has to look deliberate. */
function OrbFallback({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`${className} grid place-items-center`}>
      <span className="relative block size-1/2">
        <span className="absolute inset-0 animate-ping rounded-full bg-text-3/25 [animation-duration:2.4s]" />
        <span className="absolute inset-[18%] rounded-full bg-gradient-to-br from-text-2/40 to-text-3/10 blur-[1px]" />
        <span className="absolute inset-[34%] rounded-full bg-text/20" />
      </span>
    </div>
  );
}
