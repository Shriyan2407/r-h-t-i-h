import { NextRequest, NextResponse } from "next/server";
import YFClass from "yahoo-finance2";
import type { SearchResult } from "@/lib/types";

/* yahoo-finance2 v3: default export is the class — must instantiate */
const yf = new (YFClass as any)();

const CAP_MAP: Record<string, SearchResult["market_cap_category"]> = {
  "Large Cap": "Large Cap",
  "Mid Cap":   "Mid Cap",
  "Small Cap": "Small Cap",
};

function capCategory(mktCap?: number): SearchResult["market_cap_category"] {
  if (!mktCap) return "Mid Cap";
  const cr = mktCap / 1e7; // convert to ₹ crore
  if (cr >= 20000) return "Large Cap";
  if (cr >= 5000)  return "Mid Cap";
  if (cr >= 500)   return "Small Cap";
  return "Micro Cap";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 1) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const raw = await yf.search(q, { newsCount: 0, quotesCount: 12 });
    const quotes: any[] = raw?.quotes ?? [];

    const results: SearchResult[] = quotes
      .filter((r: any) => r.symbol && (r.symbol.endsWith(".NS") || r.symbol.endsWith(".BO")))
      .slice(0, 8)
      .map((r: any) => ({
        ticker:              r.symbol.replace(/\.(NS|BO)$/i, ""),
        company_name:        r.longname ?? r.shortname ?? r.symbol,
        exchange:            r.symbol.endsWith(".BO") ? "BSE" : "NSE",
        sector:              r.sector ?? "Unknown",
        market_cap_category: capCategory(r.marketCap),
        current_price:       r.regularMarketPrice   ?? undefined,
        change_pct:          r.regularMarketChangePercent ?? undefined,
      }));

    return NextResponse.json(results, {
      headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    console.error("[search]", (err as Error).message);
    return NextResponse.json([], { status: 200 });
  }
}
