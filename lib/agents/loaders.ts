/**
 * Production data loaders for the committee. Each one goes through the existing shared-cache services, so repeated
 * questions within a provider's TTL cost no upstream calls:
 *   bars          lib/ml/data fetchAdjustedBars   (shared cache "mlbars")
 *   fundamentals  lib/services/fundamentals        (shared cache "fundamentals", 5 min)
 *   news          lib/services/newsAggregator      (shared cache "news", 2 min)
 *   macro         lib/services/macro               (shared cache "macro")
 * Committee results are not cached: they depend on the signed-in user's holdings.
 */
import { INDEX_SYMBOL, VIX_SYMBOL, fetchAdjustedBars } from "@/lib/ml/data";
import { getFundamentals } from "@/lib/services/fundamentals";
import { getMacroIntelligence } from "@/lib/services/macro";
import { getStockNews } from "@/lib/services/newsAggregator";
import type { DataLoaders, Holding } from "./context";

/** Eight years of history, so the 2020 and 2022 stress windows can be replayed. */
export const HISTORY_YEARS = 8;

export function productionLoaders(holdings: () => Promise<Holding[] | null>): DataLoaders {
  return {
    async stockBars(ticker) {
      for (const symbol of [`${ticker}.NS`, `${ticker}.BO`]) {
        const bars = await fetchAdjustedBars(symbol, HISTORY_YEARS);
        if (bars?.length) return { symbol, bars };
      }
      return null;
    },
    marketBars: (which) => fetchAdjustedBars(which === "index" ? INDEX_SYMBOL : VIX_SYMBOL, HISTORY_YEARS),
    fundamentals: (ticker) => getFundamentals(ticker),
    news: (ticker) => getStockNews(ticker),
    macro: () => getMacroIntelligence(),
    holdings,
  };
}
