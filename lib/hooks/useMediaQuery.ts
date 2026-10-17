"use client";
import { useSyncExternalStore } from "react";

/**
 * Subscribe to a CSS media query. Returns `serverValue` during SSR and hydration, then the live match.
 * Use it to MOUNT only the layout that is visible, so data-fetching panels do not run twice
 * (once in a CSS-hidden desktop column and once in a CSS-hidden mobile column).
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** Tailwind's `lg` breakpoint, matching the stock page's `hidden lg:flex` / `lg:hidden` columns. */
export const LG_QUERY = "(min-width: 1024px)";
