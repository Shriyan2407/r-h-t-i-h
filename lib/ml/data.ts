import YFConstructor from "yahoo-finance2";
import type { Bar } from "@/lib/backtest/types";
import { sharedGet, sharedSet } from "@/lib/cache/shared";
import { toAdjustedBars } from "./features";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yf: any = new (YFConstructor as any)();

export const INDEX_SYMBOL = "^NSEI";
export const VIX_SYMBOL = "^INDIAVIX";
const TTL_SEC = 30 * 60;

interface RawQuote {
  date?: string | Date;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  adjclose?: number | null;
  volume?: number | null;
}

/** Convert Yahoo chart quotes to split/dividend-adjusted bars (same transform the model was trained on). */
export function quotesToAdjustedBars(quotes: readonly RawQuote[]): Bar[] {
  const rows = [];
  for (const q of quotes) {
    if (!q?.date || q.open == null || q.high == null || q.low == null || q.close == null) continue;
    rows.push({
      date: new Date(q.date).toISOString().slice(0, 10),
      open: q.open, high: q.high, low: q.low, close: q.close,
      adjClose: q.adjclose ?? q.close, volume: q.volume ?? 0,
    });
  }
  // de-duplicate by date (last wins) and sort ascending, as in ml/build-dataset
  const byDate = new Map(rows.map((r) => [r.date, r]));
  return toAdjustedBars([...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1)));
}

/** ~`years` of daily adjusted bars for a Yahoo symbol; null when unavailable. Shared-cached. */
export async function fetchAdjustedBars(symbol: string, years = 3): Promise<Bar[] | null> {
  const key = `${symbol}:${years}`;
  const hit = await sharedGet<Bar[]>("mlbars", key);
  if (hit) return hit;
  const p1 = new Date();
  p1.setFullYear(p1.getFullYear() - years);
  try {
    const res = await yf.chart(symbol, { period1: p1.toISOString().slice(0, 10), period2: new Date().toISOString().slice(0, 10), interval: "1d" });
    const bars = quotesToAdjustedBars(res?.quotes ?? []);
    if (bars.length === 0) return null;
    await sharedSet("mlbars", key, bars, TTL_SEC);
    return bars;
  } catch {
    return null;
  }
}
