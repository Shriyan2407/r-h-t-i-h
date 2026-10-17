/**
 * Live quote snapshots for the SSE stream. One batched Yahoo request per poll, shared-cached for POLL_SEC so many
 * viewers of the same tickers cost one upstream call. Yahoo quotes for NSE/BSE may be delayed: every quote says so.
 */
import YFConstructor from "yahoo-finance2";
import { sharedGet, sharedSet } from "@/lib/cache/shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yf: any = new (YFConstructor as any)();

export const POLL_SEC = 10;
export const MAX_TICKERS = 20;

export interface LiveQuote {
  ticker: string;
  price: number;
  change: number;
  changePct: number;
  /** Exchange timestamp of the price (ISO), as reported by the provider. */
  time: string | null;
  marketState: string | null;
  delayed: true;
  source: "yahoo-finance";
}

interface RawQuote {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: Date | string | number;
  marketState?: string;
}

export function toLiveQuote(ticker: string, q: RawQuote | undefined): LiveQuote | null {
  if (!q || typeof q.regularMarketPrice !== "number" || !Number.isFinite(q.regularMarketPrice)) return null;
  const t = q.regularMarketTime;
  const time = t instanceof Date ? t.toISOString() : typeof t === "number" ? new Date(t * (t < 1e12 ? 1000 : 1)).toISOString() : typeof t === "string" ? t : null;
  return {
    ticker,
    price: q.regularMarketPrice,
    change: q.regularMarketChange ?? 0,
    changePct: q.regularMarketChangePercent ?? 0,
    time,
    marketState: q.marketState ?? null,
    delayed: true,
    source: "yahoo-finance",
  };
}

export async function fetchLiveQuotes(tickers: readonly string[]): Promise<Record<string, LiveQuote | null>> {
  const out: Record<string, LiveQuote | null> = {};
  const missing: string[] = [];
  for (const t of tickers) {
    const hit = await sharedGet<LiveQuote>("livequote", t);
    if (hit) out[t] = hit;
    else missing.push(t);
  }
  if (missing.length) {
    try {
      const res = await yf.quote(missing.map((t) => `${t}.NS`));
      const rows: RawQuote[] = Array.isArray(res) ? res : [res];
      for (const t of missing) {
        const q = toLiveQuote(t, rows.find((r) => r?.symbol === `${t}.NS`));
        out[t] = q;
        if (q) await sharedSet("livequote", t, q, POLL_SEC);
      }
    } catch {
      for (const t of missing) out[t] = null;
    }
  }
  return out;
}

/** Quotes whose price or timestamp changed since the last send (first call sends everything available). */
export function changedQuotes(prev: Record<string, LiveQuote>, next: Record<string, LiveQuote | null>): LiveQuote[] {
  const out: LiveQuote[] = [];
  for (const q of Object.values(next)) {
    if (!q) continue;
    const p = prev[q.ticker];
    if (!p || p.price !== q.price || p.time !== q.time) out.push(q);
  }
  return out;
}

/** Serialise one Server-Sent Event. Data is JSON on a single line, so it cannot inject extra fields. */
export function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export { moveVsForecast } from "./signal";
