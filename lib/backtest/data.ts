import YFConstructor from "yahoo-finance2";
import { sharedGet, sharedSet } from "@/lib/cache/shared";
import type { Bar } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yf = new (YFConstructor as any)();

interface RawQuote {
  date?: string | Date;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
}

/** Drop incomplete rows, sort ascending and de-duplicate by date. Exported for testing. */
export function cleanBars(quotes: readonly RawQuote[]): Bar[] {
  const byDate = new Map<string, Bar>();
  for (const q of quotes) {
    if (!q?.date || q.open == null || q.high == null || q.low == null || q.close == null) continue;
    const o = Number(q.open), h = Number(q.high), l = Number(q.low), c = Number(q.close);
    if (![o, h, l, c].every((x) => Number.isFinite(x) && x > 0)) continue;
    const date = new Date(q.date).toISOString().slice(0, 10);
    byDate.set(date, { date, open: o, high: h, low: l, close: c, volume: Number(q.volume) || 0 });
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Daily bars for an NSE (then BSE) symbol. Returns null when Yahoo has nothing. */
export async function fetchDailyBars(ticker: string, years: number): Promise<{ symbol: string; bars: Bar[] } | null> {
  const key = `${ticker}:${years}`;
  const hit = await sharedGet<{ symbol: string; bars: Bar[] }>("bars", key);
  if (hit) return hit;

  const period1 = new Date();
  period1.setFullYear(period1.getFullYear() - years);
  for (const symbol of [`${ticker}.NS`, `${ticker}.BO`]) {
    try {
      const raw = await yf.chart(symbol, {
        period1: period1.toISOString().slice(0, 10),
        period2: new Date().toISOString().slice(0, 10),
        interval: "1d",
      });
      const bars = cleanBars(raw?.quotes ?? []);
      if (bars.length > 0) {
        const out = { symbol, bars };
        await sharedSet("bars", key, out, 6 * 3600); // daily history changes once per session
        return out;
      }
    } catch {
      /* try next exchange */
    }
  }
  return null;
}
