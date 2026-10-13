import { computeMetrics } from "./metrics";
import type { BacktestResult, Bar, CostModel, EquityPoint, Strategy, Trade } from "./types";

export interface RunOptions {
  initialCapital: number;
  costs: CostModel;
}

/**
 * Daily-bar, long-only, fully-invested-or-flat backtest.
 *
 * Look-ahead prevention: the strategy's target position for bar i is computed from bars[0..i].
 * It is executed at the OPEN of bar i+1, never at bar i's close, and the final bar's signal is
 * never traded. Costs are charged per side as fee + slippage (price moved against us).
 */
export function runBacktest(bars: readonly Bar[], strategy: Strategy, opts: RunOptions): BacktestResult {
  if (bars.length < 3) throw new Error("Need at least 3 bars");
  const { initialCapital, costs } = opts;
  const slip = costs.slippageBps / 10_000;
  const fee = costs.feeBps / 10_000;
  const targets = strategy.positions(bars);

  let cash = initialCapital;
  let shares = 0;
  let entryPrice = 0;
  let entryIdx = 0;
  let entryEquity = 0;
  let barsInMarket = 0;
  const trades: Trade[] = [];
  const equity: EquityPoint[] = [{ date: bars[0].date, equity: initialCapital }];

  for (let i = 1; i < bars.length; i++) {
    const want = targets[i - 1]; // decided at close of i-1, filled at open of i
    const bar = bars[i];
    if (want === 1 && shares === 0) {
      const fill = bar.open * (1 + slip);
      shares = cash / (fill * (1 + fee));
      entryEquity = cash;
      cash = 0;
      entryPrice = fill;
      entryIdx = i;
    } else if (want === 0 && shares > 0) {
      const fill = bar.open * (1 - slip);
      cash = shares * fill * (1 - fee);
      trades.push({
        entryDate: bars[entryIdx].date,
        exitDate: bar.date,
        entryPrice,
        exitPrice: fill,
        returnPct: cash / entryEquity - 1,
        bars: i - entryIdx,
      });
      shares = 0;
    }
    if (shares > 0) barsInMarket++;
    equity.push({ date: bar.date, equity: cash + shares * bar.close });
  }

  // An open position is marked to market at the last close (net of exit costs) and counted.
  if (shares > 0) {
    const last = bars[bars.length - 1];
    const proceeds = shares * last.close * (1 - slip) * (1 - fee);
    trades.push({
      entryDate: bars[entryIdx].date,
      exitDate: last.date,
      entryPrice,
      exitPrice: last.close,
      returnPct: proceeds / entryEquity - 1,
      bars: bars.length - 1 - entryIdx,
    });
  }

  const first = bars[0].close;
  const benchmark: EquityPoint[] = bars.map((b) => ({ date: b.date, equity: (initialCapital * b.close) / first }));

  return {
    kind: "BACKTEST_RESULT",
    strategyId: strategy.id,
    initialCapital,
    finalEquity: equity[equity.length - 1].equity,
    equity,
    benchmark,
    trades,
    metrics: computeMetrics(equity, trades, barsInMarket),
    benchmarkMetrics: computeMetrics(benchmark, [], bars.length - 1),
    assumptions: [
      "Signals use data up to the close of day t and are filled at the open of day t+1.",
      `Costs per side: ${costs.feeBps} bps fees + ${costs.slippageBps} bps slippage.`,
      "Long-only, all-in or flat; no leverage, shorting, dividends, taxes or position sizing.",
      "Prices come from Yahoo Finance; corporate-action errors are possible.",
      "Sharpe/Sortino use a 0% risk-free rate and 252 trading days.",
      "A backtest describes the past. It is NOT a prediction and not evidence of future returns.",
    ],
  };
}
