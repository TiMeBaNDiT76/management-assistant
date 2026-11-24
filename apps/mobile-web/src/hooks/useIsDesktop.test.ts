import { renderHook, waitFor } from "@testing-library/react-native";
import { describe, beforeEach, afterEach, it, expect } from "@jest/globals";
import { Dimensions, Platform } from "react-native";
import { useIsDesktop, DESKTOP_BREAKPOINT } from "./useIsDesktop";

type MqlListener = (event: { matches: boolean }) => void;

/**
 * Controlled matchMedia double: tests flip `matches` and notify listeners.
 * (On web `globalThis.matchMedia` === `window.matchMedia`.)
 */
const mediaQuery = {
  matches: false,
  listeners: [] as MqlListener[],
  addEventListener: jest.fn((_type: "change", listener: MqlListener) => {
    mediaQuery.listeners.push(listener);
  }),
  removeEventListener: jest.fn((_type: "change", listener: MqlListener) => {
    mediaQuery.listeners = mediaQuery.listeners.filter((entry) => entry !== listener);
  }),
};

/** Dimensions.set is public-but-internal; typed loosely here for tests. */
function setWindowWidth(width: number): void {
  (Dimensions as unknown as {
    set: (dims: { window: { width: number; height: number } }) => void;
  }).set({ window: { width, height: 800 } });
}

beforeEach(() => {
  mediaQuery.matches = false;
  mediaQuery.listeners = [];
  (mediaQuery.addEventListener as jest.Mock).mockClear();
  (mediaQuery.removeEventListener as jest.Mock).mockClear();
  setWindowWidth(750);
  (globalThis as { matchMedia?: unknown }).matchMedia = jest.fn(() => mediaQuery);
});

afterEach(() => {
  delete (globalThis as { matchMedia?: unknown }).matchMedia;
  (Platform as { OS: string }).OS = "ios";
});

describe("useIsDesktop (native: window width)", () => {
  it("is false just below the 760px breakpoint (759px)", async () => {
    setWindowWidth(759);
    const { result } = await renderHook(() => useIsDesktop());
    await waitFor(() => expect(result.current).toBe(false));
  });

  it("is true from 760px onward", async () => {
    setWindowWidth(760);
    const { result } = await renderHook(() => useIsDesktop());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("updates when the window is resized across the breakpoint", async () => {
    setWindowWidth(759);
    const { result } = await renderHook(() => useIsDesktop());
    await waitFor(() => expect(result.current).toBe(false));

    // Dimensions.set fires the change listener synchronously; RNTL's waitFor
    // flushes the resulting state update (no explicit act needed).
    setWindowWidth(1024);
    await waitFor(() => expect(result.current).toBe(true));

    setWindowWidth(600);
    await waitFor(() => expect(result.current).toBe(false));
  });

  it("never consults matchMedia on native", async () => {
    setWindowWidth(1200);
    const { result } = await renderHook(() => useIsDesktop());
    await waitFor(() => expect(result.current).toBe(true));
    expect(globalThis.matchMedia).not.toHaveBeenCalled();
  });
});

describe("useIsDesktop (web: matchMedia)", () => {
  beforeEach(() => {
    (Platform as { OS: string }).OS = "web";
  });

  it("reads the initial value from window.matchMedia", async () => {
    mediaQuery.matches = true;
    const { result } = await renderHook(() => useIsDesktop());
    await waitFor(() => expect(result.current).toBe(true));
    expect(globalThis.matchMedia).toHaveBeenCalledWith(
      `(min-width: ${DESKTOP_BREAKPOINT}px)`,
    );
  });

  it("is false without a matchMedia implementation (SSR safety)", async () => {
    delete (globalThis as { matchMedia?: unknown }).matchMedia;
    const { result } = await renderHook(() => useIsDesktop());
    await waitFor(() => expect(result.current).toBe(false));
  });

  it("follows matchMedia change events and unsubscribes on unmount", async () => {
    mediaQuery.matches = false;
    const { result, unmount } = await renderHook(() => useIsDesktop());
    await waitFor(() => expect(result.current).toBe(false));
    expect(mediaQuery.addEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );

    mediaQuery.matches = true;
    for (const listener of [...mediaQuery.listeners]) listener({ matches: true });
    await waitFor(() => expect(result.current).toBe(true));

    unmount();
    await waitFor(() => {
      expect(mediaQuery.removeEventListener).toHaveBeenCalledWith(
        "change",
        expect.any(Function),
      );
    });
  });
});
