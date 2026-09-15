"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  before: string;
  /** Image for the "after" half. Ignored when `afterNode` is given. */
  after?: string;
  /** Render the "after" half yourself — use it to show the composed result
   *  (new background, shadow) rather than the bare transparent cutout. */
  afterNode?: ReactNode;
  /** Aspect of the frame, e.g. 1 or 4/5. Defaults to square. */
  ratio?: number;
  /** Fixed frame height. Wins over `ratio` — use it so a tall portrait can't
   *  blow the frame past the viewport; both images letterbox on the checkerboard. */
  height?: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
};

/**
 * Before/after wipe. Left of the divider is the original (background intact),
 * right is the cutout sitting on the checkerboard so transparency reads.
 */
export function CompareSlider({
  before,
  after,
  afterNode,
  ratio = 1,
  height,
  beforeLabel = "Original",
  afterLabel = "Cutout",
  className = "",
}: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [pct, setPct] = useState(50);
  const [dragging, setDragging] = useState(false);

  const moveTo = useCallback((clientX: number) => {
    const el = box.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPct(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      e.preventDefault();
      moveTo(e.clientX);
    };
    const up = () => setDragging(false);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragging, moveTo]);

  return (
    <div
      ref={box}
      className={`checker relative isolate overflow-hidden rounded-xl border select-none ${className}`}
      style={
        height
          ? // Frame takes the image's own shape at a capped height, so nothing letterboxes.
            { height, aspectRatio: String(ratio), width: "auto", maxWidth: "100%", marginInline: "auto", touchAction: "none" }
          : { aspectRatio: String(ratio), touchAction: "none" }
      }
      onPointerDown={(e) => {
        setDragging(true);
        moveTo(e.clientX);
      }}
    >
      {/* "after" sits underneath; where it's transparent the checkerboard shows through */}
      {afterNode ? (
        <div className="pointer-events-none absolute inset-0">{afterNode}</div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={after}
          alt={afterLabel}
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        />
      )}

      {/* original clipped to the left of the divider */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={before}
          alt={beforeLabel}
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain"
        />
      </div>

      {/* labels */}
      <span className="mono pointer-events-none absolute left-3 top-3 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] tracking-wide text-white backdrop-blur-sm">
        {beforeLabel}
      </span>
      <span className="mono pointer-events-none absolute right-3 top-3 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] tracking-wide text-white backdrop-blur-sm">
        {afterLabel}
      </span>

      {/* divider */}
      <div
        className="pointer-events-none absolute inset-y-0 w-px bg-white mix-blend-difference"
        style={{ left: `${pct}%` }}
      />

      {/* handle — also the keyboard target */}
      <button
        type="button"
        role="slider"
        aria-label="Compare original and cutout"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        onPointerDown={(e) => {
          e.stopPropagation();
          setDragging(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setPct((p) => Math.max(0, p - (e.shiftKey ? 10 : 2)));
          if (e.key === "ArrowRight") setPct((p) => Math.min(100, p + (e.shiftKey ? 10 : 2)));
          if (e.key === "Home") setPct(0);
          if (e.key === "End") setPct(100);
        }}
        className="absolute top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full border border-white/40 bg-white/10 text-white shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md"
        style={{ left: `${pct}%` }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18-6-6 6-6" />
          <path d="m15 6 6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}
