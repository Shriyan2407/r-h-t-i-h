import { NextRequest, NextResponse } from "next/server";
import { getFundamentals } from "@/lib/services/fundamentals";
import { parseTicker, invalidTickerResponse } from "@/lib/validation/ticker";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await params;
  const T = parseTicker(ticker);
  if (!T) return invalidTickerResponse();

  try {
    const result = await getFundamentals(T);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Fundamentals] ${T}:`, msg);
    return NextResponse.json(
      { error: msg, ticker: T },
      { status: 500 },
    );
  }
}
