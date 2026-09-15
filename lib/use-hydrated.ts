"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * false during SSR and the first client render, true once hydrated.
 * Use this instead of a `setState` mount effect — anything theme- or
 * WebGL-dependent has to wait for the client, and the effect version both
 * mismatches the server HTML and trips react-hooks/set-state-in-effect.
 */
export function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

/**
 * Live media-query match. Server renders false, so gate anything that would
 * mismatch on `useHydrated()` as well.
 */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
