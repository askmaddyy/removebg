"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  original: string;
  cutout: string;
  width: number;
  height: number;
  /** Called once per stroke with a fresh full-resolution PNG. */
  onCommit: (blob: Blob) => void;
  onClose: () => void;
};

type Mode = "erase" | "restore";

/**
 * Hand-refine the cutout. The mask is a full-resolution greyscale canvas seeded
 * from the model's alpha; painting writes into it and the visible result is
 * recomposited from the ORIGINAL pixels, so restoring brings back real detail
 * rather than smearing whatever survived the first pass.
 */
export function RefineBrush({ original, cutout, width, height, onCommit, onClose }: Props) {
  const view = useRef<HTMLCanvasElement>(null);
  const mask = useRef<HTMLCanvasElement | null>(null);
  const source = useRef<HTMLImageElement | null>(null);
  const undo = useRef<ImageData[]>([]);
  const painting = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const [mode, setMode] = useState<Mode>("erase");
  const [size, setSize] = useState(64);
  const [feather, setFeather] = useState(50);
  // Screen-px per image-px, captured on move so the brush ring can be sized
  // without reading the canvas ref during render.
  const [cursor, setCursor] = useState<{ x: number; y: number; scale: number } | null>(null);
  const [steps, setSteps] = useState(0);
  const [loaded, setLoaded] = useState(false);

  /** Repaint the visible canvas: original pixels, masked. */
  const render = useCallback(() => {
    const v = view.current;
    const m = mask.current;
    const img = source.current;
    if (!v || !m || !img) return;
    const ctx = v.getContext("2d")!;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(m, 0, 0);
    ctx.globalCompositeOperation = "source-over";
  }, [width, height]);

  // Seed the mask from the model's alpha.
  useEffect(() => {
    let dead = false;
    const orig = new Image();
    const cut = new Image();
    orig.crossOrigin = cut.crossOrigin = "anonymous";
    Promise.all([
      new Promise<void>((r, j) => { orig.onload = () => r(); orig.onerror = () => j(); orig.src = original; }),
      new Promise<void>((r, j) => { cut.onload = () => r(); cut.onerror = () => j(); cut.src = cutout; }),
    ])
      .then(() => {
        if (dead) return;
        source.current = orig;
        const m = document.createElement("canvas");
        m.width = width;
        m.height = height;
        m.getContext("2d")!.drawImage(cut, 0, 0, width, height);
        mask.current = m;
        undo.current = [];
        setSteps(0);
        setLoaded(true);
        render();
      })
      .catch(() => setLoaded(false));
    return () => { dead = true; };
  }, [original, cutout, width, height, render]);

  const toImage = (e: React.PointerEvent) => {
    const v = view.current!;
    const r = v.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * width,
      y: ((e.clientY - r.top) / r.height) * height,
    };
  };

  const stroke = (from: { x: number; y: number } | null, to: { x: number; y: number }) => {
    const m = mask.current;
    if (!m) return;
    const ctx = m.getContext("2d")!;
    // Erase clears alpha; restore paints it back opaque.
    ctx.globalCompositeOperation = mode === "erase" ? "destination-out" : "source-over";
    const soft = Math.max(0.01, feather / 100);
    const grad = ctx.createRadialGradient(to.x, to.y, size * (1 - soft) * 0.5, to.x, to.y, size / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.lineWidth = size;
    ctx.strokeStyle = "rgba(255,255,255,1)";
    if (from) {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(to.x, to.y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    render();
  };

  const commit = useCallback(() => {
    const v = view.current;
    if (!v) return;
    v.toBlob((b) => b && onCommit(b), "image/png");
  }, [onCommit]);

  const pushUndo = () => {
    const m = mask.current;
    if (!m) return;
    undo.current.push(m.getContext("2d")!.getImageData(0, 0, width, height));
    if (undo.current.length > 20) undo.current.shift();
    setSteps(undo.current.length);
  };

  const stepBack = useCallback(() => {
    const prev = undo.current.pop();
    const m = mask.current;
    if (!prev || !m) return;
    m.getContext("2d")!.putImageData(prev, 0, 0);
    setSteps(undo.current.length);
    render();
    commit();
  }, [render, commit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        stepBack();
      }
      if (e.key === "[") setSize((s) => Math.max(8, s - 8));
      if (e.key === "]") setSize((s) => Math.min(300, s + 8));
      if (e.key === "e") setMode("erase");
      if (e.key === "r") setMode("restore");
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stepBack, onClose]);

  return (
    <div className="w-full">
      <div
        className="checker relative overflow-hidden rounded-xl border border-edge"
        style={{ aspectRatio: String(width / height), touchAction: "none", cursor: "none" }}
        onPointerLeave={() => setCursor(null)}
      >
        <canvas
          ref={view}
          width={width}
          height={height}
          className="absolute inset-0 h-full w-full"
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            pushUndo();
            painting.current = true;
            const p = toImage(e);
            last.current = p;
            stroke(null, p);
          }}
          onPointerMove={(e) => {
            const r = view.current!.getBoundingClientRect();
            setCursor({ x: e.clientX - r.left, y: e.clientY - r.top, scale: r.width / width });
            if (!painting.current) return;
            const p = toImage(e);
            stroke(last.current, p);
            last.current = p;
          }}
          onPointerUp={() => {
            if (!painting.current) return;
            painting.current = false;
            last.current = null;
            commit();
          }}
        />

        {/* brush ring, sized in screen px to match the image-space radius */}
        {cursor && (
          <span
            aria-hidden
            className="pointer-events-none absolute rounded-full border border-white mix-blend-difference"
            style={{
              left: cursor.x,
              top: cursor.y,
              width: size * cursor.scale,
              height: size * cursor.scale,
              transform: "translate(-50%, -50%)",
            }}
          />
        )}

        {!loaded && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="mono text-[11px] text-text-3">loading…</span>
          </div>
        )}
      </div>

      {/* controls */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex rounded-full border border-edge bg-surface p-1">
          {(["erase", "restore"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] capitalize transition-colors ${
                mode === m ? "bg-ink text-on-ink font-medium" : "text-text-2 hover:text-text"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2">
          <span className="text-[12px] text-text-2">Size</span>
          <input
            className="rail w-24"
            type="range"
            min={8}
            max={300}
            value={size}
            aria-label="Brush size"
            onChange={(e) => setSize(Number(e.target.value))}
          />
          <span className="mono w-8 text-[11px] text-text-3">{size}</span>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-[12px] text-text-2">Edge</span>
          <input
            className="rail w-20"
            type="range"
            min={0}
            max={100}
            value={feather}
            aria-label="Brush softness"
            onChange={(e) => setFeather(Number(e.target.value))}
          />
        </label>

        <button
          type="button"
          onClick={stepBack}
          disabled={steps === 0}
          className="rounded-full border border-edge bg-surface px-3.5 py-1.5 text-[12.5px] text-text-2 transition-colors hover:text-text disabled:opacity-40"
        >
          Undo
        </button>

        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded-full bg-ink px-4 py-1.5 text-[12.5px] font-semibold text-on-ink"
        >
          Done
        </button>
      </div>

      <p className="mono mt-2 text-[10.5px] text-text-3">
        E erase · R restore · [ ] size · ⌘Z undo
      </p>
    </div>
  );
}
