"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Header } from "@/components/chrome";
import { HeroReveal } from "@/components/hero-reveal";
import { SiteFooter } from "@/components/site-footer";
import { TextStream } from "@/components/block/text-stream";
import { TextFillAnimation } from "@/components/block/text-fill-animation";
import DomeGallery from "@/components/DomeGallery";
import { useHydrated, useMediaQuery } from "@/lib/use-hydrated";

/* Curated to the cleanest cuts — hard silhouettes and clear subject separation
   read well at sphere scale; softer, busier crops do not. */
const ALL = [
  "portrait-a", "portrait-b", "shoe", "mug", "chair", "parrot",
  "plant", "bike", "headphones", "lamp", "cat", "dog",
];

export default function Landing() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const ready = useHydrated();
  const phone = useMediaQuery("(max-width: 640px)");
  const input = useRef<HTMLInputElement>(null);
  const dark = !ready || resolvedTheme !== "light";

  const send = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      sessionStorage.setItem("pending", JSON.stringify({ url, name: file.name }));
      router.push("/app");
    },
    [router],
  );

  // Paste or drop anywhere on the page jumps straight into the editor and cuts.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith("image/"));
      if (f) send(f);
    };
    const onDrop = (e: DragEvent) => {
      const f = Array.from(e.dataTransfer?.files ?? []).find((x) => x.type.startsWith("image/"));
      if (f) {
        e.preventDefault();
        send(f);
      }
    };
    const stop = (e: DragEvent) => e.preventDefault();
    window.addEventListener("paste", onPaste);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragover", stop);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragover", stop);
    };
  }, [send]);

  return (
    <div className="ambient relative min-h-dvh overflow-x-hidden">
      <Grain />
      <Header />

      {/* ---- hero ------------------------------------------------------- */}
      <section className="relative mx-auto max-w-[1180px] px-5 pb-8 pt-10 text-center sm:px-8 sm:pt-16">
        <span className="inline-flex items-center gap-2.5 rounded-full border border-edge bg-surface py-1.5 pl-2 pr-3.5">
          <span className="mono rounded-full bg-surface-2 px-2 py-0.5 text-[10px]">FREE</span>
          <span className="text-[12.5px] text-text-2">No account. No watermark. No upload.</span>
        </span>

        <h1 className="mx-auto mt-7 max-w-[15ch] text-[clamp(2.7rem,8.5vw,6.2rem)] font-medium leading-[0.92] tracking-[-0.045em] text-balance">
          Remove the background. Keep <em className="font-serif not-italic">everything</em> else.
        </h1>

        <p className="mx-auto mt-6 max-w-[54ch] text-[15px] leading-relaxed text-text-2 sm:text-[17px]">
          A matting model runs on your own GPU — so nothing is uploaded, and full resolution
          costs nothing. Drop a photo and watch it cut in under a second.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="inline-flex items-center gap-2.5 rounded-full bg-ink px-7 py-4 text-[15px] font-semibold text-on-ink transition-transform hover:-translate-y-px"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v13" /><path d="m6 9 6-6 6 6" /><path d="M4 21h16" />
            </svg>
            Drop an image
          </button>
          <Link
            href="/app"
            className="rounded-full border border-edge bg-surface px-6 py-4 text-[15px] font-medium transition-colors hover:border-edge-bright"
          >
            Open the editor
          </Link>
        </div>
        <p className="mono mt-4 text-[11px] text-text-3">drop or paste anywhere on this page</p>
      </section>

      {/* the hero animation — the fade IS the background coming off */}
      <section className="relative mx-auto max-w-[1180px] px-5 sm:px-8">
        <HeroReveal shot="cat" label="Cat" />

        <dl className="mx-auto mt-12 flex max-w-[640px] flex-wrap items-start justify-center gap-x-12 gap-y-6 border-t border-edge pt-8">
          {[
            ["0.7s", "per image, on WebGPU"],
            ["100%", "stays on your device"],
            ["0", "accounts, credits, watermarks"],
          ].map(([v, k]) => (
            <div key={k} className="text-center">
              <dt className="mono text-[24px] font-medium tracking-tight">{v}</dt>
              <dd className="mt-1 text-[12px] text-text-3">{k}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ---- subjects --------------------------------------------------- */}
      <section className="relative mx-auto mt-24 max-w-[1180px] px-5 sm:px-8">
        <div className="px-2 sm:px-8">
          <TextStream
            items={[
              "portraits", "products", "cars", "pets",
              "logos", "screenshots", "furniture", "everything",
            ]}
            highlight="everything"
            prefix="Cut out"
            height="340px"
            fontSize="clamp(1.4rem, 3.8vw, 2.7rem)"
            fontWeight={400}
          />
        </div>
      </section>

      {/* ---- dome gallery ----------------------------------------------- */}
      <section className="relative mt-24">
        <div className="relative h-[clamp(500px,92vh,980px)] w-full">
          {ready && (
            <DomeGallery
              images={ALL.map((k) => ({ src: `/samples/${k}-cut.png`, alt: k }))}
              grayscale={false}
              // Sphere deliberately larger than the viewport — you're inside it,
              // seeing a curved wall of cutouts rather than a ball on a page.
              // On a phone that same radius makes each tile fill the screen, so
              // the curve pulls in and the tiles come back to a readable size.
              fit={phone ? 0.75 : 1.45}
              minRadius={phone ? 620 : 2000}
              padFactor={phone ? 0.18 : 0.08}
              autoRotate={4}
              imageBorderRadius="20px"
              openedImageBorderRadius="20px"
              overlayBlurColor={dark ? "#0b0c0f" : "#fbfbf9"}
            />
          )}
          {/* feather the sphere into the page instead of cutting it with a rule */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-bg to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-bg to-transparent" />
        </div>
      </section>

      {/* ---- why free ---------------------------------------------------- */}
      <section className="relative mt-24">
        <TextFillAnimation
          text="Every other tool charges you because they pay for the GPU. We don't have one. Your machine does the work, so full resolution costs us nothing."
          primaryColor="var(--text)"
          dimColor="color-mix(in srgb, var(--text) 16%, transparent)"
          backgroundColor="transparent"
          textColor="var(--text)"
          textSize="clamp(1.6rem, 4.4vw, 3.4rem)"
          mobileTextSize="1.7rem"
          tabletTextSize="2.8rem"
          textWidth="min(940px, 86%)"
          tabletTextWidth="88%"
          mobileTextWidth="90%"
          start="top 70%"
          end="+=60%"
          height="150vh"
          viewportHeight="100vh"
          scrub={0.25}
          showDetails={false}
        />
      </section>

      {/* pulled up tight — the pinned block above already leaves plenty of air */}
      <section className="relative mx-auto -mt-[30vh] max-w-[1180px] px-5 text-center sm:px-8">
        <h2 className="mx-auto max-w-[16ch] text-[clamp(1.9rem,5vw,3.4rem)] font-medium leading-[1.02] tracking-[-0.035em] text-balance">
          Try it on something hard.
        </h2>
        <Link
          href="/app"
          className="mt-8 inline-flex items-center gap-2.5 rounded-full bg-ink px-7 py-4 text-[15px] font-semibold text-on-ink transition-transform hover:-translate-y-px"
        >
          Open the editor
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      </section>

      <SiteFooter />

      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) send(f);
        }}
      />
    </div>
  );
}

function Grain() {
  return (
    <svg className="grain" aria-hidden>
      <filter id="grain-n">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain-n)" />
    </svg>
  );
}
