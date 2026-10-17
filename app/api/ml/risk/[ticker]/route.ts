import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { enforceRateLimit, POLICIES } from "@/lib/ratelimit/guard";
import { invalidTickerResponse, parseTicker } from "@/lib/validation/ticker";
import { INDEX_SYMBOL, VIX_SYMBOL, fetchAdjustedBars } from "@/lib/ml/data";
import { buildRiskForecast } from "@/lib/ml/riskForecast";
import { explainRisk } from "@/lib/ai/riskExplainer";
import { log } from "@/lib/observability/logger";
import { reportError } from "@/lib/observability/errors";
import { incr, timed } from "@/lib/observability/metrics";

export const maxDuration = 30;

/**
 * GET /api/ml/risk/[ticker]?explain=llm
 * 5-day volatility forecast + market regime + evidence + explanation. Never a direction or price target.
 */
export async function GET(req: Request, ctx: { params: Promise<{ ticker: string }> }) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const headers = { "x-request-id": requestId, "Cache-Control": "private, no-store" };
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });

  const ticker = parseTicker((await ctx.params).ticker);
  if (!ticker) return invalidTickerResponse();

  const limited = await enforceRateLimit(req, POLICIES.mlRisk, session.user.id);
  if (limited) return limited;

  const started = performance.now();
  try {
    const [index, vix] = await Promise.all([fetchAdjustedBars(INDEX_SYMBOL, 3), fetchAdjustedBars(VIX_SYMBOL, 3)]);
    if (!index || !vix) {
      return NextResponse.json({ available: false, reason: "MARKET_DATA_UNAVAILABLE", detail: "NIFTY 50 or India VIX history unavailable" }, { status: 503, headers });
    }
    let symbol = `${ticker}.NS`;
    let stock = await fetchAdjustedBars(symbol, 3);
    if (!stock) {
      symbol = `${ticker}.BO`;
      stock = await fetchAdjustedBars(symbol, 3);
    }
    if (!stock) return NextResponse.json({ available: false, reason: "NO_DATA", detail: `No price history for ${ticker}` }, { status: 404, headers });

    const result = await timed("ml.inference.volatility", async () => buildRiskForecast({ ticker, symbol, stock: stock!, index, vix }));
    if (!result.available) {
      incr("ml.prediction.unavailable");
      return NextResponse.json(result, { status: 422, headers });
    }
    const wantLlm = new URL(req.url).searchParams.get("explain") === "llm";
    const explanation = await explainRisk(result.contract, { useLlm: wantLlm });
    incr("ml.prediction.count");
    log.info("ml.prediction", {
      requestId, ticker, model: `${result.contract.model.id}@${result.contract.model.version}`,
      asOf: result.contract.asOf, stale: result.contract.stale, explanation: explanation.source,
      latencyMs: Math.round(performance.now() - started),
    });
    return NextResponse.json({ ...result.contract, explanation }, { headers });
  } catch (err) {
    incr("ml.prediction.error");
    reportError("ml.prediction.failed", err, { requestId, ticker });
    return NextResponse.json({ error: "Forecast failed", requestId }, { status: 500, headers });
  }
}
