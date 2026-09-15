"use client";

import { useTheme } from "next-themes";
import LiquidEther from "@/components/LiquidEther";
import { useHydrated } from "@/lib/use-hydrated";

/* Neutral inks rather than a colour pop — the palette has no accent, and the
   fluid should read as the page's own material moving. */
/* The fluid has to be LIGHTER than its ground to be visible, so the ramps
   invert with the theme: near-white on the dark page, near-ink on the light one.
   Dark-on-dark was the bug — the effect was there, just invisible. */
const DARK_COLORS = ["#4a5160", "#8f97a8", "#eef1f7"];
const LIGHT_COLORS = ["#c9ccd3", "#8f95a3", "#454b58"];

export function SiteFooter() {
  const { resolvedTheme } = useTheme();
  const ready = useHydrated();

  const light = ready && resolvedTheme === "light";

  return (
    <footer className="relative isolate mt-20 overflow-hidden">
      {/* The canvas is masked rather than covered by a matching gradient. A
          colour overlay has to match the canvas exactly or it shows a seam;
          a mask fades the pixels themselves to real transparency, so the page
          simply shows through and there is no edge to match. */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 18%, rgba(0,0,0,0.8) 38%, #000 55%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 18%, rgba(0,0,0,0.8) 38%, #000 55%)",
        }}
      >
        {ready && (
          <LiquidEther
            colors={light ? LIGHT_COLORS : DARK_COLORS}
            // Transparent ground so the mask can reveal the page behind it —
            // an opaque backgroundColor would defeat the fade.
            backgroundColor="transparent"
            lightMode={light}
            autoDemo
            autoSpeed={0.35}
            autoIntensity={1.8}
            resolution={0.4}
            className="size-full"
          />
        )}
      </div>

      {/* Blurs the fluid into a soft wash rather than leaving it as sharp
          ribbons. Masked on the same curve as the canvas — an unmasked blur
          layer starts abruptly at the footer's top edge and draws exactly the
          hard line the fade is meant to remove. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 backdrop-blur-[26px]"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 18%, rgba(0,0,0,0.8) 38%, #000 55%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 18%, rgba(0,0,0,0.8) 38%, #000 55%)",
        }}
      />

      <div className="relative mx-auto flex max-w-[1180px] flex-col gap-10 px-5 pb-10 pt-24 sm:px-8 sm:pt-32">
        <p className="pointer-events-none select-none text-center text-[clamp(2.6rem,12vw,9rem)] font-semibold leading-[0.85] tracking-[-0.05em]">
          removebg<span className="text-text-3">.fyi</span>
        </p>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-edge pt-6">
          <span className="mono text-[11px] text-text-3">
            runs on your device · nothing uploaded
          </span>
          <div className="flex items-center gap-5">
            <a
              href="https://askmaddyy.com"
              target="_blank"
              rel="noreferrer"
              className="text-[13px] text-text-2 transition-colors hover:text-text"
            >
              Built by <span className="font-medium text-text">AskMaddyy</span>
            </a>
            <a href="https://github.com/askmaddyy/removebg" target="_blank" rel="noreferrer" className="text-[13px] text-text-2 transition-colors hover:text-text">
              Source
            </a>
            <a href="/app" className="text-[13px] text-text-2 transition-colors hover:text-text">
              Editor
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
