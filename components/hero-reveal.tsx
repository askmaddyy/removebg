"use client";

import { useTheme } from "next-themes";
import MorphSlider from "@/components/MorphSlider";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * One subject morphing between the untouched photo and its cutout, forever.
 *
 * The frame uses the SOURCE image's own aspect ratio — anything else letterboxes
 * and leaks a strip of checkerboard down the side.
 */
export function HeroReveal({
  shot = "cat",
  label = "Cat",
  ratio = 900 / 619,
}: {
  shot?: string;
  label?: string;
  ratio?: number;
}) {
  const { resolvedTheme } = useTheme();
  const ready = useHydrated();
  const dark = !ready || resolvedTheme !== "light";

  return (
    <div className="mx-auto w-full max-w-[600px]">
      <div
        className="checker relative isolate overflow-hidden rounded-[18px] border border-edge"
        style={{ aspectRatio: String(ratio) }}
      >
        {ready && (
          <MorphSlider
            items={[
              { image: `/samples/${shot}-src.jpg`, caption: label },
              { image: `/samples/${shot}-cut.png`, caption: "background removed" },
            ]}
            transition="melt"
            intensity={0.62}
            aberration={0.28}
            drift={0.3}
            autoplay
            autoplayDelay={2.4}
            duration={1.3}
            ease="power2.inOut"
            scale={2}
            loop
            radius={18}
            overlayColor={dark ? "#0b0c0f" : "#fbfbf9"}
            showCaptions
            showControls={false}
            showIndicators={false}
          />
        )}
      </div>
    </div>
  );
}
