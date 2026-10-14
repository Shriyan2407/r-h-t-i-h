import YFConstructor from "yahoo-finance2";
import { sharedGet, sharedSet } from "@/lib/cache/shared";
import type { FundamentalsSnapshot } from "./factors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yf: any = new (YFConstructor as any)();
const TTL_SEC = 6 * 3600;

/** Market cap and price/book for many NSE symbols in one Yahoo request; per-symbol shared cache. */
export async function fetchFundamentalsSnapshots(tickers: readonly string[]): Promise<Record<string, FundamentalsSnapshot | null>> {
  const out: Record<string, FundamentalsSnapshot | null> = {};
  const missing: string[] = [];
  for (const t of tickers) {
    const hit = await sharedGet<FundamentalsSnapshot>("fundsnap", t);
    if (hit) out[t] = hit;
    else missing.push(t);
  }
  if (missing.length) {
    try {
      const res = await yf.quote(missing.map((t) => `${t}.NS`));
      const rows: Array<{ symbol?: string; marketCap?: number; priceToBook?: number }> = Array.isArray(res) ? res : [res];
      for (const t of missing) {
        const q = rows.find((r) => r?.symbol === `${t}.NS`);
        const snap = q ? { marketCap: q.marketCap ?? null, priceToBook: q.priceToBook ?? null } : null;
        out[t] = snap;
        if (snap && (snap.marketCap || snap.priceToBook)) await sharedSet("fundsnap", t, snap, TTL_SEC);
      }
    } catch {
      for (const t of missing) out[t] = null;
    }
  }
  return out;
}
