import { NextRequest, NextResponse } from "next/server";
import { getStockNews } from "@/lib/services/newsAggregator";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await params;
  const T = ticker.toUpperCase().replace(/\.(NS|BO)$/i, "");

  try {
    const news = await getStockNews(T);
    return NextResponse.json(
      { ticker: T, count: news.length, items: news, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "s-maxage=600, stale-while-revalidate=1200" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch news", ticker: T },
      { status: 500 },
    );
  }
}
