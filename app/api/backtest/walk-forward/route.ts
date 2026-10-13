import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { enforceRateLimit, POLICIES } from "@/lib/ratelimit/guard";
import { fetchDailyBars } from "@/lib/backtest/data";
import { buyAndHold, rsiMeanReversion, smaCrossover } from "@/lib/backtest/strategies";
import { walkForward } from "@/lib/backtest/walkForward";
import { walkForwardRequestSchema } from "@/lib/backtest/walkForwardRequest";
import { computeMetrics } from "@/lib/backtest/metrics";
import type { EquityPoint } from "@/lib/backtest/types";

export const maxDuration = 30;

/**
 * POST /api/backtest/walk-forward
 * For each fold: choose the rule with the best in-sample Sharpe on the training window, then trade ONLY that choice
 * on the next unseen window. Out-of-sample folds are chained into one equity curve and compared with buy-and-hold.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceRateLimit(req, POLICIES.backtest, session.user.id);
  if (limited) return limited;

  const parsed = walkForwardRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", code: "INVALID_REQUEST", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 400 },
    );
  }
  const q = parsed.data;
  const data = await fetchDailyBars(q.ticker, q.years);
  if (!data) return NextResponse.json({ error: `No price history for ${q.ticker}`, code: "NO_DATA" }, { status: 404 });
  if (data.bars.length < q.trainBars + q.testBars) {
    return NextResponse.json({ error: `Only ${data.bars.length} bars; need ${q.trainBars + q.testBars}`, code: "INSUFFICIENT_DATA" }, { status: 422 });
  }

  const candidates = [buyAndHold, smaCrossover(20, 50), smaCrossover(10, 30), rsiMeanReversion()];
  const folds = walkForward(data.bars, candidates, {
    initialCapital: q.initialCapital,
    costs: { feeBps: q.feeBps, slippageBps: q.slippageBps },
    trainBars: q.trainBars,
    testBars: q.testBars,
  });

  // Chain out-of-sample folds into one curve: each fold starts from the previous fold's ending equity.
  let eq = q.initialCapital;
  let bm = q.initialCapital;
  const oos: EquityPoint[] = [];
  const bench: EquityPoint[] = [];
  let inMarket = 0;
  for (const f of folds) {
    const e = f.outOfSample.equity;
    const b = f.outOfSample.benchmark;
    for (let i = oos.length ? 1 : 0; i < e.length; i++) {
      oos.push({ date: e[i].date, equity: (eq * e[i].equity) / e[0].equity });
      bench.push({ date: b[i].date, equity: (bm * b[i].equity) / b[0].equity });
    }
    eq = oos[oos.length - 1].equity;
    bm = bench[bench.length - 1].equity;
    inMarket += Math.round(f.outOfSample.metrics.exposure * (e.length - 1));
  }
  const trades = folds.flatMap((f) => f.outOfSample.trades);

  return NextResponse.json({
    kind: "WALK_FORWARD_RESULT",
    ticker: q.ticker,
    symbol: data.symbol,
    candidates: candidates.map((c) => ({ id: c.id, label: c.label })),
    folds: folds.map((f) => ({
      fold: f.fold, trainStart: f.trainStart, trainEnd: f.trainEnd, testStart: f.testStart, testEnd: f.testEnd,
      chosen: f.chosen, inSampleSharpe: f.inSampleSharpe, outOfSample: f.outOfSample.metrics,
    })),
    equity: oos,
    benchmark: bench,
    metrics: computeMetrics(oos, trades, inMarket),
    benchmarkMetrics: computeMetrics(bench, [], Math.max(0, bench.length - 1)),
    assumptions: [
      "Rule choice per fold uses ONLY the training window; the test window is never seen before it is traded.",
      `Costs per side: ${q.feeBps} bps fees + ${q.slippageBps} bps slippage. Positions are closed at the end of each fold.`,
      "Results describe the past. They are not a prediction.",
    ],
  });
}
