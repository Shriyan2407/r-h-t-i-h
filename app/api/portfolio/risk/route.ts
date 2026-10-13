import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/auth/prisma";
import { enforceRateLimit, POLICIES } from "@/lib/ratelimit/guard";
import { INDEX_SYMBOL, VIX_SYMBOL, fetchAdjustedBars } from "@/lib/ml/data";
import { buildPortfolioRisk } from "@/lib/portfolio/riskService";
import { log } from "@/lib/observability/logger";
import { timed } from "@/lib/observability/metrics";

export const maxDuration = 60;

/** GET /api/portfolio/risk - risk analytics, stress scenarios and model-based forward volatility for the user's holdings. */
export async function GET(req: Request) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const headers = { "x-request-id": requestId, "Cache-Control": "private, no-store" };
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  const limited = await enforceRateLimit(req, POLICIES.portfolioRisk, session.user.id);
  if (limited) return limited;

  try {
    const portfolio = await prisma.portfolio.findUnique({ where: { userId: session.user.id }, include: { holdings: true } });
    const rows = (portfolio?.holdings ?? []).map((h) => ({ ticker: h.ticker, quantity: Number(h.quantity), sector: h.sector ?? "Other", exchange: h.exchange }));
    if (rows.length === 0) return NextResponse.json({ empty: true }, { headers });

    const [index, vix] = await Promise.all([fetchAdjustedBars(INDEX_SYMBOL, 8), fetchAdjustedBars(VIX_SYMBOL, 8)]);
    if (!index || !vix) return NextResponse.json({ error: "Market data unavailable", code: "MARKET_DATA_UNAVAILABLE" }, { status: 503, headers });

    const result = await timed("portfolio.risk", () => buildPortfolioRisk(rows, fetchAdjustedBars, { index, vix }));
    if ("error" in result) return NextResponse.json(result, { status: 422, headers });
    // Holdings are private financial data: log only counts, never tickers or values.
    log.info("portfolio.risk", { requestId, holdings: rows.length, analysed: result.report.holdings.length, excluded: result.excluded.length });
    return NextResponse.json(result, { headers });
  } catch (err) {
    log.error("portfolio.risk.failed", { requestId, error: err });
    return NextResponse.json({ error: "Risk analysis failed", requestId }, { status: 500, headers });
  }
}
