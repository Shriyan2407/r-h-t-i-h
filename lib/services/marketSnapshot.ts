/**
 * Live market snapshot used by the daily briefing (cron and Telegram /briefing).
 *
 * Every field is either real data fetched just now or absent. Nothing here falls
 * back to a made-up number: callers must handle `undefined` and, if the core index
 * data is missing, skip the send rather than fabricate a briefing.
 */

export interface IndexQuote {
  price: number;
  /** Day change in percent. */
  change: number;
}

export interface Mover {
  ticker: string;
  change: number;
}

export interface BasketQuote {
  ticker: string;
  price: number;
  /** Day change in percent. */
  change: number;
}

export interface MarketSnapshot {
  nifty?: IndexQuote;
  banknifty?: IndexQuote;
  sensex?: IndexQuote;
  indiaVix?: IndexQuote;
  usdinr?: number;
  /** Quotes for every symbol of MOVER_BASKET that Yahoo returned, in basket order. */
  quotes: BasketQuote[];
  topGainers: Mover[];
  topLosers: Mover[];
  /** ISO timestamp of when the snapshot was taken. */
  asOf: string;
}

/**
 * Basket of liquid large-caps used to rank "movers". This is a fixed, documented
 * basket - it is NOT claimed to be the current NIFTY 50 constituent list.
 */
export const MOVER_BASKET = [
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "BHARTIARTL", "SBIN", "ITC",
  "HINDUNILVR", "KOTAKBANK", "LT", "AXISBANK", "BAJFINANCE", "MARUTI", "SUNPHARMA",
  "TITAN", "ASIANPAINT", "ULTRACEMCO", "NTPC", "POWERGRID", "ONGC", "TATASTEEL",
  "WIPRO", "HCLTECH", "TECHM", "M&M", "NESTLEIND", "COALINDIA", "ADANIENT", "JSWSTEEL",
] as const;

export type RawQuote = {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
};

function toIndex(q: RawQuote | null | undefined): IndexQuote | undefined {
  if (!q || typeof q.regularMarketPrice !== "number") return undefined;
  return { price: q.regularMarketPrice, change: q.regularMarketChangePercent ?? 0 };
}

/** Convert raw Yahoo quotes into basket quotes, dropping anything without a real price. Pure. */
export function toBasketQuotes(quotes: RawQuote[]): BasketQuote[] {
  const bySymbol = new Map<string, BasketQuote>();
  for (const q of quotes) {
    if (typeof q.symbol !== "string" || typeof q.regularMarketPrice !== "number") continue;
    const ticker = q.symbol.replace(/\.(NS|BO)$/i, "");
    bySymbol.set(ticker, {
      ticker,
      price: q.regularMarketPrice,
      change: q.regularMarketChangePercent ?? 0,
    });
  }
  return (MOVER_BASKET as readonly string[]).flatMap((t) => {
    const hit = bySymbol.get(t);
    return hit ? [hit] : [];
  });
}

/** Rank movers from raw quotes. Pure, so it can be unit-tested without the network. */
export function rankMovers(quotes: RawQuote[], n = 3): { gainers: Mover[]; losers: Mover[] } {
  const rows: Mover[] = [];
  for (const q of quotes) {
    if (typeof q.symbol !== "string" || typeof q.regularMarketChangePercent !== "number") continue;
    rows.push({
      ticker: q.symbol.replace(/\.(NS|BO)$/i, ""),
      change: q.regularMarketChangePercent,
    });
  }

  const gainers = rows.filter((r) => r.change > 0).sort((a, b) => b.change - a.change).slice(0, n);
  const losers = rows.filter((r) => r.change < 0).sort((a, b) => a.change - b.change).slice(0, n);
  return { gainers, losers };
}

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const YFClass = (await import("yahoo-finance2")).default;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const yf = new (YFClass as any)();

  const [nifty, bank, sensex, vix, fx, basket] = await Promise.allSettled([
    yf.quote("^NSEI"),
    yf.quote("^NSEBANK"),
    yf.quote("^BSESN"),
    yf.quote("^INDIAVIX"),
    yf.quote("INR=X"),
    yf.quote(MOVER_BASKET.map((t) => `${t}.NS`)),
  ]);

  const value = <T,>(r: PromiseSettledResult<T>): T | null => (r.status === "fulfilled" ? r.value : null);

  const fxQuote = value(fx) as RawQuote | null;
  const basketQuotes = value(basket) as RawQuote[] | null;
  const rawBasket = Array.isArray(basketQuotes) ? basketQuotes : [];
  const { gainers, losers } = rankMovers(rawBasket);

  return {
    nifty: toIndex(value(nifty) as RawQuote | null),
    banknifty: toIndex(value(bank) as RawQuote | null),
    sensex: toIndex(value(sensex) as RawQuote | null),
    indiaVix: toIndex(value(vix) as RawQuote | null),
    quotes: toBasketQuotes(rawBasket),
    usdinr: typeof fxQuote?.regularMarketPrice === "number" ? fxQuote.regularMarketPrice : undefined,
    topGainers: gainers,
    topLosers: losers,
    asOf: new Date().toISOString(),
  };
}
