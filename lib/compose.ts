export type Background =
  | { kind: "none" }
  | { kind: "solid"; color: string }
  | { kind: "gradient"; from: string; to: string; angle: number }
  | { kind: "blur"; src: string; amount: number };

export type Shadow = { on: boolean; opacity: number; blur: number; angle: number; distance: number };

export type Rect = { x: number; y: number; w: number; h: number };

/** Largest contain-fit of src inside box, scaled by `scale`, centred. Pure — see selfCheck. */
export function fitContain(
  srcW: number,
  srcH: number,
  boxW: number,
  boxH: number,
  scale = 1,
): Rect {
  const k = Math.min(boxW / srcW, boxH / srcH) * scale;
  const w = srcW * k;
  const h = srcH * k;
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
}

/** Shadow offset from an angle in degrees (0 = right, positive = clockwise/down). */
export function shadowOffset(angle: number, distance: number) {
  const r = (angle * Math.PI) / 180;
  return { dx: Math.cos(r) * distance, dy: Math.sin(r) * distance };
}

function paintBackground(
  ctx: CanvasRenderingContext2D,
  bg: Background,
  w: number,
  h: number,
  blurImg?: CanvasImageSource,
) {
  if (bg.kind === "none") return;
  if (bg.kind === "solid") {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (bg.kind === "gradient") {
    const r = (bg.angle * Math.PI) / 180;
    // Project the gradient line across the full diagonal so it always covers the box.
    const len = Math.abs(w * Math.cos(r)) + Math.abs(h * Math.sin(r));
    const cx = w / 2;
    const cy = h / 2;
    const g = ctx.createLinearGradient(
      cx - (Math.cos(r) * len) / 2,
      cy - (Math.sin(r) * len) / 2,
      cx + (Math.cos(r) * len) / 2,
      cy + (Math.sin(r) * len) / 2,
    );
    g.addColorStop(0, bg.from);
    g.addColorStop(1, bg.to);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (bg.kind === "blur" && blurImg) {
    ctx.save();
    ctx.filter = `blur(${bg.amount}px)`;
    // Overdraw past the edges so the blur doesn't pull in transparent pixels.
    const pad = bg.amount * 2;
    ctx.drawImage(blurImg, -pad, -pad, w + pad * 2, h + pad * 2);
    ctx.restore();
  }
}

export async function compose(opts: {
  cutout: CanvasImageSource;
  cutoutW: number;
  cutoutH: number;
  outW: number;
  outH: number;
  scale?: number;
  background: Background;
  shadow: Shadow;
  blurSource?: CanvasImageSource;
}): Promise<Blob> {
  const { cutout, cutoutW, cutoutH, outW, outH, background, shadow, blurSource } = opts;
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;

  paintBackground(ctx, background, outW, outH, blurSource);

  const r = fitContain(cutoutW, cutoutH, outW, outH, opts.scale ?? 0.92);

  if (shadow.on && shadow.opacity > 0) {
    const { dx, dy } = shadowOffset(shadow.angle, shadow.distance);
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${shadow.opacity})`;
    ctx.shadowBlur = shadow.blur;
    ctx.shadowOffsetX = dx;
    ctx.shadowOffsetY = dy;
    ctx.drawImage(cutout, r.x, r.y, r.w, r.h);
    ctx.restore();
  }

  ctx.drawImage(cutout, r.x, r.y, r.w, r.h);

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode the image"))),
      "image/png",
    ),
  );
}

/** Run with: npx tsx lib/compose.ts */
export function selfCheck() {
  const a = fitContain(100, 50, 200, 200);
  console.assert(a.w === 200 && a.h === 100, "wide image fills width", a);
  console.assert(a.x === 0 && a.y === 50, "wide image centres vertically", a);

  const b = fitContain(50, 100, 200, 200);
  console.assert(b.w === 100 && b.h === 200, "tall image fills height", b);
  console.assert(b.x === 50 && b.y === 0, "tall image centres horizontally", b);

  const c = fitContain(100, 100, 200, 200, 0.5);
  console.assert(c.w === 100 && c.x === 50, "scale shrinks and stays centred", c);

  const right = shadowOffset(0, 10);
  console.assert(Math.abs(right.dx - 10) < 1e-9 && Math.abs(right.dy) < 1e-9, "0deg is right", right);

  const down = shadowOffset(90, 10);
  console.assert(Math.abs(down.dy - 10) < 1e-9 && Math.abs(down.dx) < 1e-9, "90deg is down", down);

  console.log("compose: ok");
}

if (typeof process !== "undefined" && process.argv?.[1]?.includes("compose")) selfCheck();
