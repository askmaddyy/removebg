"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const noop = () => () => {};
/** false during SSR and the first client render, true once hydrated. */
const useHydrated = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

/**
 * The logo carries the wordmark, so no text sits beside it. Both files render and
 * CSS picks one — swapping on `resolvedTheme` would flash the wrong mark on load.
 */
export function Wordmark({ className = "h-16" }: { className?: string }) {
  return (
    <Link href="/" aria-label="removebg.fyi home" className="flex shrink-0 items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-light.png" alt="removebg.fyi" className={`${className} w-auto dark:hidden`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-dark.png" alt="removebg.fyi" className={`hidden ${className} w-auto dark:block`} />
    </Link>
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const ready = useHydrated();

  // Before mount the resolved theme is unknown, so keep label and icon neutral —
  // anything theme-dependent here mismatches the server HTML.
  const dark = ready && resolvedTheme === "dark";
  return (
    <button
      type="button"
      aria-label={ready ? (dark ? "Switch to light theme" : "Switch to dark theme") : "Switch theme"}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="grid size-9 place-items-center rounded-full border border-edge bg-surface text-text-2 transition-colors hover:text-text"
    >
      {/* Render a stable icon until mounted so SSR and client agree. */}
      {dark ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      )}
    </button>
  );
}

export function Header({ cta = true }: { cta?: boolean }) {
  return (
    <header className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
      <div className="flex items-center gap-8">
        <Wordmark />
        <nav className="hidden items-center gap-6 lg:flex">
          <Link href="/app" className="text-[13.5px] text-text-2 transition-colors hover:text-text">Editor</Link>
          <a href="https://github.com/askmaddyy/removebg" target="_blank" rel="noreferrer" className="text-[13.5px] text-text-2 transition-colors hover:text-text">Source</a>
        </nav>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="mono hidden items-center gap-2 rounded-full border border-edge bg-surface px-3 py-1.5 text-[11px] text-text-2 md:inline-flex">
          <span className="size-[5px] rounded-full bg-live" />
          on-device
        </span>
        <ThemeToggle />
        {cta && (
          <Link
            href="/app"
            className="rounded-full bg-ink px-4 py-2 text-[13.5px] font-semibold text-on-ink transition-opacity hover:opacity-90"
          >
            Open app
          </Link>
        )}
      </div>
    </header>
  );
}
