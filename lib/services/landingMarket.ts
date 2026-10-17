import { unstable_cache } from "next/cache";
import { getMarketSnapshot } from "./marketSnapshot";

export interface LandingIndex {
  label: string;
  value: number;
  /** Day change in percent. */
  change: number;
}

export interface LandingQuote {
  ticker: string;
  price: number;
  change: number;
}

/** Serializable, real-data-only view of the market for the public landing page. */
export interface LandingMarket {
  asOf: string;
  indices: LandingIndex[];
  quotes: LandingQuote[];
}

const FETCH_TIMEOUT_MS = 4000;

async function fetchLandingMarket(): Promise<LandingMarket> {
  const snapshot = await Promise.race([
    getMarketSnapshot(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("market snapshot timed out")), FETCH_TIMEOUT_MS),
    ),
  ]);

  const indices: LandingIndex[] = [];
  const add = (label: string, q?: { price: number; change: number }) => {
    if (q) indices.push({ label, value: q.price, change: q.change });
  };
  add("NIFTY 50", snapshot.nifty);
  add("SENSEX", snapshot.sensex);
  add("INDIA VIX", snapshot.indiaVix);

  if (indices.length === 0 && snapshot.quotes.length === 0) {
    // Throwing keeps the failure out of the shared cache so the next request retries.
    throw new Error("no live market data available");
  }
  return { asOf: snapshot.asOf, indices, quotes: snapshot.quotes };
}

const cached = unstable_cache(fetchLandingMarket, ["landing-market-v1"], { revalidate: 60 });

/** Live market data for the landing page, shared across requests for 60s. `null` when unavailable. */
export async function getLandingMarket(): Promise<LandingMarket | null> {
  try {
    return await cached();
  } catch (err) {
    console.warn("[landing] live market data unavailable:", (err as Error).message);
    return null;
  }
}
