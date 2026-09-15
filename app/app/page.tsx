"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/chrome";
import { CompareSlider } from "@/components/compare-slider";
import { compose, shadowOffset, type Background, type Shadow } from "@/lib/compose";
import { useRemover } from "@/lib/use-remover";
import { LiquidOrb } from "@/components/liquid-orb";
import { RefineBrush } from "@/components/refine-brush";

const BACKDROPS: { id: string; label: string; bg: Background; swatch: string }[] = [
  { id: "none", label: "Transparent", bg: { kind: "none" }, swatch: "" },
  { id: "white", label: "White", bg: { kind: "solid", color: "#ffffff" }, swatch: "#ffffff" },
  { id: "bone", label: "Bone", bg: { kind: "solid", color: "#efede6" }, swatch: "#efede6" },
  { id: "ink", label: "Ink", bg: { kind: "solid", color: "#16171a" }, swatch: "#16171a" },
  { id: "warm", label: "Warm", bg: { kind: "gradient", from: "#d8c4a6", to: "#5e4429", angle: 135 }, swatch: "linear-gradient(135deg,#d8c4a6,#5e4429)" },
  { id: "cool", label: "Cool", bg: { kind: "gradient", from: "#8fa3b6", to: "#2b3643", angle: 135 }, swatch: "linear-gradient(135deg,#8fa3b6,#2b3643)" },
  { id: "sage", label: "Sage", bg: { kind: "gradient", from: "#a9bca2", to: "#46603f", angle: 135 }, swatch: "linear-gradient(135deg,#a9bca2,#46603f)" },
  { id: "rose", label: "Rose", bg: { kind: "gradient", from: "#e6c4bc", to: "#a05e4e", angle: 135 }, swatch: "linear-gradient(135deg,#e6c4bc,#a05e4e)" },
  { id: "studio", label: "Studio", bg: { kind: "gradient", from: "#ffffff", to: "#c8c6c0", angle: 160 }, swatch: "linear-gradient(160deg,#ffffff,#c8c6c0)" },
];

export default function Editor() {
  const { status, progress, device, error, cuts, cut, warm, setCuts } = useRemover();
  const [refining, setRefining] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [backdrop, setBackdrop] = useState("none");
  const [blurAmount, setBlurAmount] = useState(18);
  const [useBlur, setUseBlur] = useState(false);
  const [shadow, setShadow] = useState<Shadow>({ on: false, opacity: 0.35, blur: 24, angle: 70, distance: 18 });
  const [compare, setCompare] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const active = useMemo(
    () => cuts.find((c) => c.id === activeId) ?? cuts[0] ?? null,
    [cuts, activeId],
  );

  // Pick up a file handed over from the landing page.
  useEffect(() => {
    const raw = sessionStorage.getItem("pending");
    if (!raw) return;
    sessionStorage.removeItem("pending");
    const { url, name } = JSON.parse(raw) as { url: string; name: string };
    fetch(url)
      .then((r) => r.blob())
      .then((b) => cut(new File([b], name, { type: b.type })))
      .finally(() => URL.revokeObjectURL(url));
  }, [cut]);

  useEffect(() => {
    warm();
  }, [warm]);

  const onFiles = useCallback(
    (files: FileList | null) => {
      const f = files?.[0];
      if (f?.type.startsWith("image/")) cut(f);
    },
    [cut],
  );

  // Paste-to-cut, the shortcut people actually reach for.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? [])[0];
      if (f?.type.startsWith("image/")) cut(f);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [cut]);

  const background: Background = useMemo(
    () =>
      useBlur
        ? { kind: "blur", src: active?.original ?? "", amount: blurAmount }
        : (BACKDROPS.find((b) => b.id === backdrop)?.bg ?? { kind: "none" }),
    [useBlur, active?.original, blurAmount, backdrop],
  );

  const stageStyle = useMemo(() => {
    if (background.kind === "solid") return { background: background.color };
    if (background.kind === "gradient")
      return { background: `linear-gradient(${background.angle}deg, ${background.from}, ${background.to})` };
    return {};
  }, [background]);

  const { dx, dy } = shadowOffset(shadow.angle, shadow.distance);
  const cutoutFilter = shadow.on
    ? `drop-shadow(${dx.toFixed(1)}px ${dy.toFixed(1)}px ${shadow.blur}px rgba(0,0,0,${shadow.opacity}))`
    : undefined;

  // A newly-arrived cut morphs out of its original rather than snapping in, so
  // you see the background leave. Same read as the hero.
  const [revealing, setRevealing] = useState(false);
  const revealedId = useRef<number | null>(null);
  useEffect(() => {
    if (!active || revealedId.current === active.id) return;
    revealedId.current = active.id;
    setRevealing(true);
    const t = setTimeout(() => setRevealing(false), 60);
    return () => clearTimeout(t);
  }, [active]);

  // The composed result — backdrop, then the cutout with its shadow. Shared by the
  // flat view and the compare slider so both show exactly the same thing.
  const composed = active ? (
    <div className="absolute inset-0" style={stageStyle}>
      {background.kind === "blur" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={active.original}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-110 object-cover"
          style={{ filter: `blur(${blurAmount}px)` }}
        />
      )}
      {/* No conditional padding — insetting the subject only when a backdrop is
          chosen made it visibly shrink the moment you picked one. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={active.cutout}
        alt={active.name}
        className="absolute inset-0 h-full w-full object-contain"
        style={{ filter: cutoutFilter }}
      />
      {/* the original, fading off the moment the cut lands */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={active.original}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-contain transition-opacity duration-[1100ms] ease-out"
        style={{ opacity: revealing ? 1 : 0 }}
      />
    </div>
  ) : null;

  /** Flatten the current backdrop + shadow + cutout to a full-resolution PNG. */
  const renderBlob = useCallback(async () => {
    if (!active) return null;
    const img = await loadImage(active.cutout);
    const blurSource = background.kind === "blur" ? await loadImage(active.original) : undefined;
    return compose({
      cutout: img,
      cutoutW: active.width,
      cutoutH: active.height,
      outW: active.width,
      outH: active.height,
      scale: background.kind === "none" ? 1 : 0.92,
      background,
      shadow,
      blurSource,
    });
  }, [active, background, shadow]);

  const download = useCallback(async () => {
    if (!active) return;
    setBusy(true);
    try {
      const blob = await renderBlob();
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${active.name.replace(/\.[^.]+$/, "")}-cutout.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } finally {
      setBusy(false);
    }
  }, [active, renderBlob]);

  const copy = useCallback(async () => {
    if (!active) return;
    setBusy(true);
    try {
      // Safari only accepts a ClipboardItem whose value is a promise resolved
      // during the user gesture, so the blob is passed unresolved.
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": renderBlob() as Promise<Blob> }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    } finally {
      setBusy(false);
    }
  }, [active, renderBlob]);

  const loading = status === "loading";
  const working = status === "working";

  return (
    <div className="ambient flex min-h-dvh flex-col">
      <Header cta={false} />

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* stage */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
            {!active ? (
              <Dropzone
                onPick={() => input.current?.click()}
                onFiles={onFiles}
                loading={loading}
                progress={progress}
                working={working}
              />
            ) : (
              <div className="w-full max-w-[620px]">
                {refining ? (
                  <RefineBrush
                    original={active.original}
                    cutout={active.cutout}
                    width={active.width}
                    height={active.height}
                    onCommit={(blob) => {
                      const url = URL.createObjectURL(blob);
                      setCuts((prev) =>
                        prev.map((c) => {
                          if (c.id !== active.id) return c;
                          URL.revokeObjectURL(c.cutout);
                          return { ...c, cutout: url };
                        }),
                      );
                    }}
                    onClose={() => setRefining(false)}
                  />
                ) : compare ? (
                  // The "after" half is the composed result, so a chosen backdrop and
                  // shadow show up in the comparison rather than only in the flat view.
                  <CompareSlider
                    before={active.original}
                    afterNode={composed}
                    ratio={active.width / active.height}
                  />
                ) : (
                  <div
                    className="checker relative overflow-hidden rounded-xl border border-edge"
                    style={{ aspectRatio: String(active.width / active.height) }}
                  >
                    {composed}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCompare((c) => !c)}
                      disabled={refining}
                      className="rounded-full border border-edge bg-surface px-3.5 py-1.5 text-[12.5px] text-text-2 transition-colors hover:text-text disabled:opacity-40"
                    >
                      {compare ? "Hide compare" : "Compare"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefining((r) => !r)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors ${
                        refining
                          ? "border-edge-bright bg-surface-2 font-medium text-text"
                          : "border-edge bg-surface text-text-2 hover:text-text"
                      }`}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20l7-7a4 4 0 0 0-5.66-5.66L4 16.34V20h3.66Z" /><path d="M14 6l4 4" />
                      </svg>
                      Refine
                    </button>
                    <button
                      type="button"
                      onClick={() => input.current?.click()}
                      className="rounded-full border border-edge bg-surface px-3.5 py-1.5 text-[12.5px] text-text-2 transition-colors hover:text-text"
                    >
                      New image
                    </button>
                  </div>
                  <span className="mono text-[11px] text-text-3">
                    {active.width}×{active.height} · {(active.ms / 1000).toFixed(1)}s
                    {device ? ` · ${device}` : ""}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* filmstrip */}
          {cuts.length > 0 && (
            <div className="no-bar flex shrink-0 items-center gap-2.5 overflow-x-auto border-t border-edge px-4 py-3 sm:px-6">
              {cuts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={`checker size-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    active?.id === c.id ? "border-ink" : "border-edge"
                  }`}
                  style={{ ["--check-size" as string]: "10px" }}
                  aria-label={c.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.cutout} alt="" className="size-full object-contain" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="grid size-14 shrink-0 place-items-center rounded-lg border border-dashed border-edge-bright text-text-3"
                aria-label="Add another image"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
          )}
        </main>

        {/* controls */}
        <aside className="w-full shrink-0 border-t border-edge p-5 lg:w-[336px] lg:border-l lg:border-t-0">
          <h2 className="text-[15px] font-semibold tracking-[-0.018em]">Background</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-text-3">
            Transparent, a solid, a gradient, or the original blurred behind the subject.
          </p>

          <div className="mt-4 grid grid-cols-6 gap-2">
            {BACKDROPS.map((b) => {
              const on = !useBlur && backdrop === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  title={b.label}
                  aria-label={b.label}
                  onClick={() => {
                    setUseBlur(false);
                    setBackdrop(b.id);
                  }}
                  className={`${b.id === "none" ? "checker" : ""} aspect-square rounded-lg border border-edge transition-shadow`}
                  style={{
                    background: b.swatch || undefined,
                    ["--check-size" as string]: "8px",
                    boxShadow: on ? "0 0 0 2px var(--ink), 0 0 0 4px var(--surface-2)" : undefined,
                  }}
                />
              );
            })}
            <button
              type="button"
              title="Blur the original"
              aria-label="Blur the original"
              onClick={() => setUseBlur(true)}
              disabled={!active}
              className="grid aspect-square place-items-center rounded-lg border border-edge text-text-3 disabled:opacity-40"
              style={{ boxShadow: useBlur ? "0 0 0 2px var(--ink), 0 0 0 4px var(--surface-2)" : undefined }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <circle cx="12" cy="12" r="8" strokeDasharray="2 3" />
              </svg>
            </button>
          </div>

          {/* Always occupies its slot — rendering it only in blur mode shoved
              every control below it down the moment you picked the backdrop. */}
          <div
            className={useBlur ? "" : "pointer-events-none opacity-0"}
            aria-hidden={!useBlur}
          >
            <Rail
              label="Blur amount"
              value={blurAmount}
              min={2}
              max={60}
              onChange={setBlurAmount}
              suffix="px"
            />
          </div>

          {/* shadow */}
          <div className="mt-6 border-t border-edge pt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-medium">Cast shadow</h3>
              <button
                type="button"
                role="switch"
                aria-checked={shadow.on}
                aria-label="Cast shadow"
                onClick={() => setShadow((s) => ({ ...s, on: !s.on }))}
                className={`relative h-[19px] w-[34px] rounded-full transition-colors ${shadow.on ? "bg-ink" : "bg-surface-2"}`}
              >
                <span
                  className="absolute top-0.5 size-[15px] rounded-full bg-bg transition-all"
                  style={{ left: shadow.on ? 17 : 2 }}
                />
              </button>
            </div>
            <div className={shadow.on ? "" : "pointer-events-none opacity-40"}>
              <Rail label="Opacity" value={Math.round(shadow.opacity * 100)} min={0} max={100} suffix="%" onChange={(v) => setShadow((s) => ({ ...s, opacity: v / 100 }))} />
              <Rail label="Blur" value={shadow.blur} min={0} max={80} suffix="px" onChange={(v) => setShadow((s) => ({ ...s, blur: v }))} />
              <Rail label="Angle" value={shadow.angle} min={0} max={360} suffix="°" onChange={(v) => setShadow((s) => ({ ...s, angle: v }))} />
              <Rail label="Distance" value={shadow.distance} min={0} max={80} suffix="px" onChange={(v) => setShadow((s) => ({ ...s, distance: v }))} />
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={download}
              disabled={!active || busy}
              className="flex flex-1 items-center justify-center gap-2.5 rounded-full bg-ink py-3.5 text-[14px] font-semibold text-on-ink transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
              {busy ? "Preparing…" : "Download PNG"}
            </button>
            <button
              type="button"
              onClick={copy}
              disabled={!active || busy}
              aria-label="Copy image to clipboard"
              title="Copy image to clipboard"
              className="flex items-center justify-center gap-2 rounded-full border border-edge bg-surface px-4 py-3.5 text-[13px] font-medium text-text-2 transition-colors hover:border-edge-bright hover:text-text disabled:opacity-40"
            >
              {copied ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-lg border border-edge px-3 py-2.5 text-[12.5px] text-err">
              {error}
            </p>
          )}

          <p className="mono mt-5 border-t border-edge pt-4 text-[10.5px] leading-relaxed text-text-3">
            {device ? `${device} · ready` : loading ? `loading model · ${Math.round(progress)}%` : "starting"}
            <br />
            nothing leaves this tab
          </p>
        </aside>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Rail({
  label,
  value,
  min,
  max,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-baseline justify-between">
        <label className="text-[12px] text-text-2">{label}</label>
        <span className="mono text-[11px] text-text-3">
          {value}
          {suffix}
        </span>
      </div>
      <input
        className="rail"
        type="range"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function Dropzone({
  onPick,
  onFiles,
  loading,
  progress,
  working,
}: {
  onPick: () => void;
  onFiles: (f: FileList | null) => void;
  loading: boolean;
  progress: number;
  working: boolean;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles(e.dataTransfer.files);
      }}
      className={`grid w-full max-w-[560px] place-items-center rounded-2xl border border-dashed p-10 text-center transition-colors sm:p-16 ${
        over ? "border-edge-bright bg-surface" : "border-edge"
      }`}
    >
      {loading || working ? (
        <LiquidOrb className="mb-2 size-[190px]" />
      ) : (
        <div className="checker mb-5 grid size-16 place-items-center rounded-2xl border border-edge" style={{ ["--check-size" as string]: "10px" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v13" /><path d="m6 9 6-6 6 6" /><path d="M4 21h16" />
          </svg>
        </div>
      )}

      <p className="text-[19px] font-medium tracking-[-0.02em]">
        {working ? "Cutting…" : loading ? "Setting up, once" : "Drop an image"}
      </p>
      <p className="mt-1.5 text-[13px] text-text-2">
        {loading
          ? "Downloading the model to your browser. It never needs the network again."
          : "JPG, PNG, WebP · or paste with ⌘V"}
      </p>

      {!loading && !working && (
        <button
          type="button"
          onClick={onPick}
          className="mt-6 rounded-full bg-ink px-6 py-3 text-[14px] font-semibold text-on-ink transition-opacity hover:opacity-90"
        >
          Choose a file
        </button>
      )}

      {(loading || working) && (
        <div className="mt-6 w-full max-w-[320px]">
          <div className="mb-2 flex justify-between">
            <span className="mono text-[11px] text-text-2">
              {working ? "running the model" : "downloading"}
            </span>
            <span className="mono text-[11px] text-text-3">
              {working ? "" : `${Math.round(progress)}%`}
            </span>
          </div>
          <div className="h-[3px] overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-ink transition-[width] duration-300"
              style={{ width: working ? "100%" : `${progress}%` }}
            />
          </div>
          <p className="mono mt-2 text-[10.5px] text-text-3">
            you can drop an image now — it runs the moment this finishes
          </p>
        </div>
      )}
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read the image"));
    img.src = src;
  });
}
