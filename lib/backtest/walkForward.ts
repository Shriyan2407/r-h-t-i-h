import { runBacktest, type RunOptions } from "./engine";
import type { BacktestResult, Bar, Strategy } from "./types";

export interface WalkForwardFold {
  fold: number;
  trainStart: string;
  trainEnd: string;
  testStart: string;
  testEnd: string;
  chosen: string;
  inSampleSharpe: number | null;
  outOfSample: BacktestResult;
}

/**
 * Walk-forward validation. For each fold, pick the candidate with the best in-sample Sharpe on
 * the training window, then evaluate ONLY that choice on the following unseen test window.
 * Test windows never overlap and never precede their training window.
 */
export function walkForward(
  bars: readonly Bar[],
  candidates: readonly Strategy[],
  opts: RunOptions & { trainBars: number; testBars: number },
): WalkForwardFold[] {
  const { trainBars, testBars } = opts;
  if (candidates.length === 0) throw new Error("No candidates");
  if (trainBars < 3 || testBars < 3) throw new Error("Windows must have at least 3 bars");
  const folds: WalkForwardFold[] = [];
  for (let start = 0, k = 1; start + trainBars + testBars <= bars.length; start += testBars, k++) {
    const train = bars.slice(start, start + trainBars);
    const test = bars.slice(start + trainBars, start + trainBars + testBars);
    let best = candidates[0];
    let bestScore = -Infinity;
    let bestSharpe: number | null = null;
    for (const c of candidates) {
      const sh = runBacktest(train, c, opts).metrics.sharpe;
      const score = sh ?? -Infinity;
      if (score > bestScore) {
        best = c;
        bestScore = score;
        bestSharpe = sh;
      }
    }
    folds.push({
      fold: k,
      trainStart: train[0].date,
      trainEnd: train[train.length - 1].date,
      testStart: test[0].date,
      testEnd: test[test.length - 1].date,
      chosen: best.id,
      inSampleSharpe: bestSharpe,
      outOfSample: runBacktest(test, best, opts),
    });
  }
  return folds;
}
