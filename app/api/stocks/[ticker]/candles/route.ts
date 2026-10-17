import { NextRequest, NextResponse } from "next/server";
import YFConstructor from "yahoo-finance2";
import { parseTicker, invalidTickerResponse } from "@/lib/validation/ticker";
/* yahoo-finance2 v3: default export is the class — must instantiate */
const yf = new (YFConstructor as any)();

/** Map UI range label → { period back in months, yf interval } */
const RANGE_MAP: Record<string, { months: number; interval: string; isIntraday: boolean }> = {
  "1D":  { months: 0,   interval: "5m",  isIntraday: true  },
  "1W":  { months: 0,   interval: "30m", isIntraday: true  },
  "1M":  { months: 1,   interval: "1d",  isIntraday: false },
  "3M":  { months: 3,   interval: "1d",  isIntraday: false },
  "6M":  { months: 6,   interval: "1d",  isIntraday: false },
  "1Y":  { months: 12,  interval: "1d",  isIntraday: false },
  "3Y":  { months: 36,  interval: "1wk", isIntraday: false },
  "5Y":  { months: 60,  interval: "1wk", isIntraday: false },
  "MAX": { months: 240, interval: "1mo", isIntraday: false },
  // lowercase
  "1d":  { months: 0,   interval: "5m",  isIntraday: true  },
  "1w":  { months: 0,   interval: "30m", isIntraday: true  },
  "1m":  { months: 1,   interval: "1d",  isIntraday: false },
  "3m":  { months: 3,   interval: "1d",  isIntraday: false },
  "6m":  { months: 6,   interval: "1d",  isIntraday: false },
  "1y":  { months: 12,  interval: "1d",  isIntraday: false },
  "3y":  { months: 36,  interval: "1wk", isIntraday: false },
  "5y":  { months: 60,  interval: "1wk", isIntraday: false },
  "max": { months: 240, interval: "1mo", isIntraday: false },
};

/** "YYYY-MM-DD" — always UTC to avoid off-by-one from timezone shifts */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Build period1 date from months-back config.
 *  For intraday (1D/1W) use yesterday/5 days ago so we get enough bars. */
function buildPeriod1(months: number, isIntraday: boolean, range: string): string {
  const now = new Date();
  if (isIntraday) {
    const days = range.toUpperCase() === "1D" ? 1 : 5;
    now.setDate(now.getDate() - days);
  } else {
    now.setMonth(now.getMonth() - months);
  }
  return toDateStr(now);
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ ticker: string }> }
) {
  const { ticker: rawTicker } = await context.params;
  const ticker = parseTicker(rawTicker);
  if (!ticker) return invalidTickerResponse();
  const { searchParams } = new URL(_req.url);
  const rangeParam = (searchParams.get("range") ?? "3M").toUpperCase();
  const cfg = RANGE_MAP[rangeParam] ?? RANGE_MAP["3M"];

  const period1 = buildPeriod1(cfg.months, cfg.isIntraday, rangeParam);
  const period2 = toDateStr(new Date());

  // Try NSE first, then BSE
  const base = ticker.toUpperCase().replace(/\.(NS|BO|NSE|BSE)$/i, "");
  const symbols = [`${base}.NS`, `${base}.BO`];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let raw: any = null;
  let usedSymbol = "";

  for (const sym of symbols) {
    try {
      raw = await yf.chart(sym, { period1, period2, interval: cfg.interval });
      if (Array.isArray(raw?.quotes) && raw.quotes.length > 0) {
        usedSymbol = sym;
        break;
      }
    } catch (e) {
      console.error(`[candles] ${sym} error:`, (e as Error).message);
    }
  }

  if (!raw?.quotes?.length) {
    return NextResponse.json(
      {
        error:
          `No candle data found for "${ticker}" ` +
          `(tried ${symbols.join(", ")} with period1=${period1}).`,
      },
      { status: 404 }
    );
  }

  // Build clean candle array
  const candles: { time: string | number; open: number; high: number; low: number; close: number; volume: number }[] = [];

  for (const q of raw.quotes as any[]) {
    if (!q || q.open == null || q.high == null || q.low == null || q.close == null || !q.date) {
      continue;
    }
    const d = new Date(q.date as string);
    const time: string | number = cfg.isIntraday
      ? Math.floor(d.getTime() / 1000)   // Unix seconds — UTCTimestamp for LW Charts
      : toDateStr(d);                      // "YYYY-MM-DD"   — BusinessDay for LW Charts

    candles.push({
      time,
      open:   Math.round(Number(q.open)  * 100) / 100,
      high:   Math.round(Number(q.high)  * 100) / 100,
      low:    Math.round(Number(q.low)   * 100) / 100,
      close:  Math.round(Number(q.close) * 100) / 100,
      volume: Number(q.volume) || 0,
    });
  }

  if (candles.length === 0) {
    return NextResponse.json(
      { error: `Yahoo Finance returned data for ${usedSymbol} but all OHLCV values were null.` },
      { status: 404 }
    );
  }

  // LW Charts requires strictly ascending, non-duplicate timestamps
  const seen = new Set<string | number>();
  const clean = candles
    .filter((c) => { const ok = !seen.has(c.time); seen.add(c.time); return ok; })
    .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));

  return NextResponse.json(
    { ticker: ticker.toUpperCase(), symbol: usedSymbol, range: rangeParam, candles: clean },
    { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } }
  );
}
