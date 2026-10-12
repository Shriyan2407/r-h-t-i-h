"use client";
import { useEffect, useSyncExternalStore } from "react";
import type { MarketIndices } from "@/lib/services/indices";

/**
 * One shared poller for the market bar and any page that wants index quotes.
 * Components subscribe to a single module-level store, so ten mounted consumers cost one
 * request per minute, polling pauses while the tab is hidden, and a failed refresh keeps
 * the last good data but flags it as stale instead of silently pretending it is fresh.
 */
export type MarketIndicesState =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: MarketIndices; error: null; stale: boolean }
  | { status: "error"; data: null; error: string };

const REFRESH_MS = 60_000;

let state: MarketIndicesState = { status: "loading", data: null, error: null };
let timer: ReturnType<typeof setInterval> | null = null;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: MarketIndicesState) {
  state = next;
  listeners.forEach((l) => l());
}

async function refresh(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await fetch("/api/market/indices", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as MarketIndices;
      set({ status: "ready", data, error: null, stale: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Market data unavailable";
      if (state.status === "ready") set({ ...state, stale: true });
      else set({ status: "error", data: null, error: message });
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

function start() {
  if (timer) return;
  void refresh();
  timer = setInterval(() => {
    if (typeof document !== "undefined" && document.hidden) return;
    void refresh();
  }, REFRESH_MS);
}

function stop() {
  if (timer && listeners.size === 0) {
    clearInterval(timer);
    timer = null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
    stop();
  };
}

const getSnapshot = () => state;
const getServerSnapshot = (): MarketIndicesState => ({ status: "loading", data: null, error: null });

export function useMarketIndices(): MarketIndicesState {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Refresh immediately when the tab becomes visible again after being hidden.
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return s;
}

/** Test helper: reset the module-level store. */
export function __resetMarketIndicesStore() {
  if (timer) clearInterval(timer);
  timer = null;
  inFlight = null;
  listeners.clear();
  state = { status: "loading", data: null, error: null };
}
