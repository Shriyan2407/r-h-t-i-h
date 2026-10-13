import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { enforceRateLimit, POLICIES } from "@/lib/ratelimit/guard";
import { runBacktest } from "@/lib/backtest/engine";
import { backtestRequestSchema } from "@/lib/backtest/request";
import { strategyFromId } from "@/lib/backtest/strategies";
import { fetchDailyBars } from "@/lib/backtest/data";

export const maxDuration = 30;

const MIN_BARS = 120;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await enforceRateLimit(req, POLICIES.backtest, session.user.id);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 });
  }
  const parsed = backtestRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", code: "INVALID_REQUEST", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 400 },
    );
  }
  const { ticker, strategy, years, initialCapital, feeBps, slippageBps } = parsed.data;

  const data = await fetchDailyBars(ticker, years);
  if (!data) {
    return NextResponse.json({ error: `No price history available for ${ticker}`, code: "NO_DATA" }, { status: 404 });
  }
  if (data.bars.length < MIN_BARS) {
    return NextResponse.json(
      { error: `Only ${data.bars.length} bars available; at least ${MIN_BARS} are needed for a meaningful backtest`, code: "INSUFFICIENT_DATA" },
      { status: 422 },
    );
  }

  const result = runBacktest(data.bars, strategyFromId(strategy), { initialCapital, costs: { feeBps, slippageBps } });
  return NextResponse.json({ ticker, symbol: data.symbol, years, barCount: data.bars.length, result });
}
