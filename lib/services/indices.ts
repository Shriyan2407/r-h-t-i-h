import { unstable_cache } from "next/cache";
import { getMarketSnapshot, type MarketSnapshot } from "./marketSnapshot";

/**
 * Indices and rates shown in the app-wide market bar. `symbol` is the Yahoo Finance
 * ticker; `kind` controls formatting (rates/volatility show 2 decimals, indices use
 * Indian digit grouping).
 */
export const INDEX_DEFINITIONS = [
  { label: "NIFTY 50", symbol: "^NSEI", kind: "index" },
  { label: "SENSEX", symbol: "^BSESN", kind: "index" },
  { label: "NIFTY BANK", symbol: "^NSEBANK", kind: "index" },
  { label: "NIFTY IT", symbol: "^CNXIT", kind: "index" },
  { label: "INDIA VIX", symbol: "^INDIAVIX", kind: "rate" },
  { label: "USD/INR", symbol: "INR=X", kind: "rate" },
  { label: "NIFTY MIDCAP", symbol: "^CNXMIDCAP", kind: "index" },
  { label: "NIFTY PHARMA", symbol: "^CNXPHARMA", kind: "index" },
] as const;

export interface IndexRow {
  label: string;
  symbol: string;
  kind: "index" | "rate";
  value: number;
  /** Day change in percent. */
  changePct: number;
}

export interface MarketIndices {
  asOf: string;
  indices: IndexRow[];
  movers: { gainers: { ticker: string; change: number }[]; losers: { ticker: string; change: number }[] };
}

type RawQuote = { symbol?: string; regularMarketPrice?: number; regularMarketChangePercent?: number };

/**
 * Keep only definitions that Yahoo actually returned a numeric price for. A missing
 * index is omitted - never replaced with a placeholder value. Pure, so it is unit-testable.
 */
export function toIndexRows(quotes: RawQuote[]): IndexRow[] {
  const bySymbol = new Map<string, RawQuote>();
  for (const q of quotes) if (typeof q.symbol === "string") bySymbol.set(q.symbol, q);

  const rows: IndexRow[] = [];
  for (const def of INDEX_DEFINITIONS) {
    const q = bySymbol.get(def.symbol);
    if (!q || typeof q.regularMarketPrice !== "number" || !Number.isFinite(q.regularMarketPrice)) continue;
    rows.push({
      label: def.label,
      symbol: def.symbol,
      kind: def.kind,
      value: q.regularMarketPrice,
      changePct: typeof q.regularMarketChangePercent === "number" ? q.regularMarketChangePercent : 0,
    });
  }
  return rows;
}

async function fetchIndices(): Promise<MarketIndices> {
  const YFClass = (await import("yahoo-finance2")).default;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const yf = new (YFClass as any)();

  const [indexQuotes, snapshot] = await Promise.all([
    yf.quote(INDEX_DEFINITIONS.map((d) => d.symbol)).catch(() => [] as RawQuote[]),
    getMarketSnapshot().catch(() => null as MarketSnapshot | null),
  ]);

  const indices = toIndexRows(Array.isArray(indexQuotes) ? indexQuotes : []);
  if (indices.length === 0) throw new Error("no index data available");

  return {
    asOf: new Date().toISOString(),
    indices,
    movers: {
      gainers: snapshot?.topGainers ?? [],
      losers: snapshot?.topLosers ?? [],
    },
  };
}

const cached = unstable_cache(fetchIndices, ["market-indices-v1"], { revalidate: 60 });

/** Shared 60s cache across instances. Throws when no real data could be fetched. */
export function getMarketIndices(): Promise<MarketIndices> {
  return cached();
}
