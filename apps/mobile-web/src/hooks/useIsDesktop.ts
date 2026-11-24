import { useEffect, useState } from "react";
import { Platform, useWindowDimensions } from "react-native";

/**
 * Desktop-shell breakpoint (px) — matches the mockup shell grid in
 * `/mockups/070-stammdaten/_palette.css` (`@media (max-width: 760px)` hides
 * the drawer; above it the app shows AppBar + 240px sidebar). Keep in sync
 * with the `ns` screen in `tailwind.config.js`.
 */
export const DESKTOP_BREAKPOINT = 760;

/** Minimal matchMedia surface (SSR/undici-safe, no DOM lib dependency). */
interface MediaQueryListLike {
  matches: boolean;
  addEventListener?: (
    type: "change",
    listener: (event: { matches: boolean }) => void,
  ) => void;
  removeEventListener?: (
    type: "change",
    listener: (event: { matches: boolean }) => void,
  ) => void;
  addListener?: (listener: (event: { matches: boolean }) => void) => void;
  removeListener?: (listener: (event: { matches: boolean }) => void) => void;
}

/**
 * True when the window is at least 760px wide and the desktop shell
 * (AppBar + sidebar drawer instead of the bottom tab bar) should render.
 *
 * - Web: `window.matchMedia('(min-width: 760px)')` with a change listener —
 *   SSR-safe (no `window` / no `matchMedia` → `false`, no crash).
 * - Native: `useWindowDimensions().width >= 760`.
 */
export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  // Web-only state: initialized lazily, updated by the matchMedia listener.
  const [webMatches, setWebMatches] = useState<boolean>(() => {
    if (Platform.OS !== "web") return false;
    const matchMedia = (globalThis as { matchMedia?: (query: string) => MediaQueryListLike })
      .matchMedia;
    return typeof matchMedia === "function"
      ? matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`).matches
      : false;
  });

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const matchMedia = (globalThis as { matchMedia?: (query: string) => MediaQueryListLike })
      .matchMedia;
    if (typeof matchMedia !== "function") return;

    const mql = matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    const handleChange = (event: { matches: boolean }) => setWebMatches(event.matches);

    setWebMatches(mql.matches);
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handleChange);
      return () => {
        mql.removeEventListener?.("change", handleChange);
      };
    }
    // Legacy Safari (< 14) fallback.
    if (typeof mql.addListener === "function") {
      mql.addListener(handleChange);
      return () => {
        mql.removeListener?.(handleChange);
      };
    }
    return undefined;
  }, []);

  if (Platform.OS === "web") return webMatches;
  return width >= DESKTOP_BREAKPOINT;
}
