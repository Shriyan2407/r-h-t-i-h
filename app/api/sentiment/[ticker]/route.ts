import { NextRequest, NextResponse } from "next/server";
import { getSocialSentiment } from "@/lib/services/socialSentiment";
import { parseTicker, invalidTickerResponse } from "@/lib/validation/ticker";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await params;
  const T = parseTicker(ticker);
  if (!T) return invalidTickerResponse();

  try {
    const sentiment = await getSocialSentiment(T);
    return NextResponse.json(sentiment, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch sentiment", ticker: T },
      { status: 500 },
    );
  }
}
