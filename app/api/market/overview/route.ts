import { NextRequest, NextResponse } from "next/server";
import { getMarketNews } from "@/lib/services/newsAggregator";
import { cache, TTL } from "@/lib/services/cache";
import YFClass from "yahoo-finance2";
const yahooFinance = new (YFClass as any)();

const NIFTY_SYMBOLS = [
  "^NSEI", "^BSESN", "^NSEBANK", "^CNXIT", "INDIAVIX.NS",
];

async function getMarketSnapshot() {
  return cache.wrap("market:snapshot", TTL.MARKET, async () => {
    const results = await Promise.allSettled(
      NIFTY_SYMBOLS.map(sym => yahooFinance.quote(sym)),
    );

    return results.map((r, i) => ({
      symbol:    NIFTY_SYMBOLS[i],
      price:     r.status === "fulfilled" ? ((r.value as any).regularMarketPrice ?? 0)        : 0,
      change:    r.status === "fulfilled" ? ((r.value as any).regularMarketChangePercent ?? 0) : 0,
      available: r.status === "fulfilled",
    }));
  });
}

export async function GET(_req: NextRequest) {
  try {
    const [snapshot, news] = await Promise.all([
      getMarketSnapshot(),
      getMarketNews(),
    ]);

    return NextResponse.json({
      snapshot,
      topNews:    news.slice(0, 20),
      fetchedAt:  new Date().toISOString(),
    }, {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" },
    });

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Market data unavailable" },
      { status: 500 },
    );
  }
}
