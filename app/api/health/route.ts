import { NextResponse } from "next/server";
import { cache } from "@/lib/services/cache";

export async function GET() {
  const anthropicConfigured = !!(process.env.ANTHROPIC_API_KEY?.trim());

  let yahooStatus = "unknown";
  try {
    const yf = await import("yahoo-finance2");
    const q  = await (yf.default as any).quote("^NSEI");
    yahooStatus = q?.regularMarketPrice ? "ok" : "degraded";
  } catch {
    yahooStatus = "error";
  }

  const stats = cache.stats();

  return NextResponse.json({
    status:   "ok",
    ts:       new Date().toISOString(),
    services: {
      yahoo_finance: yahooStatus,
      anthropic_api: anthropicConfigured ? "configured" : "not_configured",
      cache:         `${stats.size} entries`,
    },
    routes: {
      quote:        "/api/stocks/[ticker]/quote",
      candles:      "/api/stocks/[ticker]/candles",
      technicals:   "/api/technicals/[ticker]",
      intelligence: "/api/intelligence/[ticker]",
      news:         "/api/news/[ticker]",
      sentiment:    "/api/sentiment/[ticker]",
      market:       "/api/market/indices",
    },
    env: {
      node: process.version,
      next: process.env.npm_package_version ?? "unknown",
    },
  });
}
