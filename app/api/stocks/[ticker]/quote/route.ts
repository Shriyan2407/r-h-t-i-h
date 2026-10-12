import { NextRequest, NextResponse } from "next/server";
import YFConstructor from "yahoo-finance2";
import { parseTicker, invalidTickerResponse } from "@/lib/validation/ticker";

const yf = new (YFConstructor as any)();

function buildSymbols(raw: string): string[] {
  const t = raw.toUpperCase().replace(/\.(NS|BO|NSE|BSE)$/i, "");
  return [`${t}.NS`, `${t}.BO`];
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ ticker: string }> }
) {
  const { ticker: rawTicker } = await context.params;
  const ticker = parseTicker(rawTicker);
  if (!ticker) return invalidTickerResponse();
  const symbols = buildSymbols(ticker);

  let data: any = null;
  let usedSymbol = "";

  for (const sym of symbols) {
    try {
      data = await yf.quoteSummary(sym, {
        modules: ["price", "summaryDetail", "assetProfile", "defaultKeyStatistics"],
      });
      if (data?.price?.regularMarketPrice) {
        usedSymbol = sym;
        break;
      }
    } catch (e) {
      console.error(`[quote] ${sym} error:`, (e as Error).message);
    }
  }

  if (!data?.price?.regularMarketPrice) {
    return NextResponse.json(
      { error: `No quote data for "${ticker}" (tried: ${symbols.join(", ")})` },
      { status: 404 }
    );
  }

  const p = data.price;
  const s = data.summaryDetail ?? {};
  const a = data.assetProfile ?? {};
  const k = data.defaultKeyStatistics ?? {};

  const currentPrice = Number(p.regularMarketPrice) || 0;
  const prevClose    = Number(p.regularMarketPreviousClose) || currentPrice;
  const change       = currentPrice - prevClose;
  const changePct    = prevClose ? (change / prevClose) * 100 : 0;

  return NextResponse.json(
    {
      ticker:         ticker.toUpperCase(),
      symbol:         usedSymbol,
      exchange:       usedSymbol.endsWith(".BO") ? "BSE" : "NSE",
      company_name:   p.longName ?? p.shortName ?? ticker.toUpperCase(),
      sector:         a.sector ?? p.sector ?? "Unknown",
      industry:       a.industry ?? "Unknown",
      current_price:  Math.round(currentPrice  * 100) / 100,
      open:           Math.round((Number(p.regularMarketOpen)    || currentPrice) * 100) / 100,
      high:           Math.round((Number(p.regularMarketDayHigh) || currentPrice) * 100) / 100,
      low:            Math.round((Number(p.regularMarketDayLow)  || currentPrice) * 100) / 100,
      close:          Math.round(currentPrice  * 100) / 100,
      prev_close:     Math.round(prevClose     * 100) / 100,
      change:         Math.round(change        * 100) / 100,
      change_pct:     Math.round(changePct     * 10000) / 10000,
      volume:         Number(p.regularMarketVolume)   || 0,
      avg_volume:     Number(p.averageDailyVolume10Day || p.averageDailyVolume3Month) || 0,
      market_cap:     Math.round((Number(p.marketCap) || 0) / 1e7),   // INR Crores
      week_52_high:   Math.round((Number(s.fiftyTwoWeekHigh) || currentPrice) * 100) / 100,
      week_52_low:    Math.round((Number(s.fiftyTwoWeekLow)  || currentPrice) * 100) / 100,
      pe_ratio:       s.trailingPE    ? Math.round(Number(s.trailingPE)    * 100) / 100 : null,
      pb_ratio:       k.priceToBook   ? Math.round(Number(k.priceToBook)   * 100) / 100 : null,
      eps:            p.epsTrailingTwelveMonths ? Math.round(Number(p.epsTrailingTwelveMonths) * 100) / 100 : null,
      dividend_yield: s.dividendYield ? Math.round(Number(s.dividendYield) * 10000) / 100 : null,
      beta:           s.beta          ? Math.round(Number(s.beta)          * 100) / 100 : null,
      last_updated:   new Date().toISOString(),
    },
    { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } }
  );
}
