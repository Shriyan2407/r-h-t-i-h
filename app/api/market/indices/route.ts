import { NextResponse } from "next/server";
import { getMarketIndices } from "@/lib/services/indices";

export const dynamic = "force-dynamic";

/**
 * Real index and rate quotes for the app-wide market bar.
 * 503 (not fabricated numbers) when Yahoo Finance returns nothing.
 */
export async function GET() {
  try {
    const data = await getMarketIndices();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (err) {
    console.warn("[market/indices] unavailable:", (err as Error).message);
    return NextResponse.json(
      { error: "Market data is temporarily unavailable.", code: "MARKET_DATA_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
