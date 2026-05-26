import { NextRequest, NextResponse } from "next/server";
import { getSocialSentiment } from "@/lib/services/socialSentiment";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await params;
  const T = ticker.toUpperCase().replace(/\.(NS|BO)$/i, "");

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
