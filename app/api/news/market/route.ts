import { NextResponse } from "next/server";
import { getMarketNews } from "@/lib/services/newsAggregator";

export const dynamic     = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const items = await getMarketNews();
    return NextResponse.json(
      { count: items.length, items, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store, no-cache", "X-Feed": "market" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch market news", count: 0, items: [] },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
