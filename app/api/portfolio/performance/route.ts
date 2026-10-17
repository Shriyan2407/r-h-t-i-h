import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/auth/prisma";
import { enforceRateLimit, POLICIES } from "@/lib/ratelimit/guard";
import { INDEX_SYMBOL, fetchAdjustedBars } from "@/lib/ml/data";
import { performanceSeries } from "@/lib/portfolio/performance";
import { reportError } from "@/lib/observability/errors";

export const maxDuration = 30;

/** GET /api/portfolio/performance — current holdings over the last ~3 months vs NIFTY 50, from real closes. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceRateLimit(req, POLICIES.portfolioPerformance, session.user.id);
  if (limited) return limited;
  try {
    const p = await prisma.portfolio.findUnique({ where: { userId: session.user.id }, include: { holdings: true } });
    const rows = (p?.holdings ?? []).slice(0, 40);
    if (rows.length === 0) return NextResponse.json({ empty: true });
    const index = await fetchAdjustedBars(INDEX_SYMBOL, 1);
    if (!index) return NextResponse.json({ error: "Market data unavailable" }, { status: 503 });
    const inputs = await Promise.all(rows.map(async (h) => {
      const bars = (await fetchAdjustedBars(`${h.ticker}.${h.exchange === "BSE" ? "BO" : "NS"}`, 1)) ?? [];
      return { ticker: h.ticker, quantity: Number(h.quantity), bars };
    }));
    const series = performanceSeries(inputs, index);
    if (!series) return NextResponse.json({ error: "Not enough price history" }, { status: 422 });
    return NextResponse.json(series, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (err) {
    reportError("portfolio.performance.failed", err);
    return NextResponse.json({ error: "Performance unavailable" }, { status: 500 });
  }
}
