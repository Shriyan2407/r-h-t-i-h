import { describe, expect, it } from "vitest";
import { runBacktest } from "@/lib/backtest/engine";
import { maxDrawdown, computeMetrics } from "@/lib/backtest/metrics";
import { rsi, sma } from "@/lib/backtest/indicators";
import { buyAndHold, rsiMeanReversion, smaCrossover } from "@/lib/backtest/strategies";
import { walkForward } from "@/lib/backtest/walkForward";
import type { Bar, Strategy } from "@/lib/backtest/types";

const NO_COST = { feeBps: 0, slippageBps: 0 };

function makeBars(closes: number[], opens?: number[]): Bar[] {
  return closes.map((c, i) => ({
    date: new Date(Date.UTC(2020, 0, 1 + i)).toISOString().slice(0, 10),
    open: opens ? opens[i] : c,
    high: c,
    low: c,
    close: c,
    volume: 1000,
  }));
}

/** Deterministic pseudo-random walk (LCG) so tests are reproducible. */
function walk(n: number, seed = 7): number[] {
  let s = seed;
  let p = 100;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    p *= 1 + ((s / 4294967296 - 0.5) * 0.04);
    out.push(p);
  }
  return out;
}

describe("indicators", () => {
  it("sma matches hand calculation", () => {
    expect(sma([1, 2, 3, 4, 5], 3).slice(2)).toEqual([2, 3, 4]);
  });
  it("rsi is 100 for a strictly rising series and 0 for a strictly falling one", () => {
    const up = Array.from({ length: 30 }, (_, i) => 100 + i);
    const down = Array.from({ length: 30 }, (_, i) => 100 - i);
    expect(rsi(up, 14)[29]).toBe(100);
    expect(rsi(down, 14)[29]).toBeCloseTo(0, 6);
  });
});

describe("metrics", () => {
  it("max drawdown", () => {
    expect(maxDrawdown([100, 120, 90, 110])).toBeCloseTo(-0.25, 10);
    expect(maxDrawdown([100, 110, 120])).toBe(0);
  });
  it("returns null (not 0 or Infinity) when a ratio is undefined", () => {
    const flat = [100, 100, 100, 100].map((e, i) => ({ date: String(i), equity: e }));
    const m = computeMetrics(flat, [], 0);
    expect(m.sharpe).toBeNull();
    expect(m.sortino).toBeNull();
    expect(m.winRate).toBeNull();
    expect(m.profitFactor).toBeNull();
  });
  it("win rate and profit factor from trades", () => {
    const eq = [100, 101, 102].map((e, i) => ({ date: String(i), equity: e }));
    const t = (r: number) => ({ entryDate: "a", exitDate: "b", entryPrice: 1, exitPrice: 1, returnPct: r, bars: 1 });
    const m = computeMetrics(eq, [t(0.1), t(0.05), t(-0.05)], 2);
    expect(m.winRate).toBeCloseTo(2 / 3, 10);
    expect(m.profitFactor).toBeCloseTo(3, 10);
  });
});

describe("engine: look-ahead prevention", () => {
  it("fills a signal at the NEXT bar's open, not the same bar's close", () => {
    // Signal says long from bar 0. Bar 0 close=100; bar 1 open=110. Fill must be 110.
    const bars = makeBars([100, 120, 120, 120], [100, 110, 120, 120]);
    const r = runBacktest(bars, buyAndHold, { initialCapital: 1000, costs: NO_COST });
    expect(r.trades[0].entryPrice).toBe(110);
    expect(r.trades[0].entryDate).toBe(bars[1].date);
    // 1000 buys 1000/110 shares, worth 120 each at the end.
    expect(r.finalEquity).toBeCloseTo((1000 / 110) * 120, 8);
  });

  it("never trades on the final bar's signal", () => {
    const bars = makeBars([100, 100, 100, 100]);
    const lateLong: Strategy = {
      id: "late", label: "late", warmup: 0,
      positions: (b) => b.map((_, i) => (i === b.length - 1 ? 1 : 0)),
    };
    const r = runBacktest(bars, lateLong, { initialCapital: 1000, costs: NO_COST });
    expect(r.trades).toHaveLength(0);
    expect(r.finalEquity).toBe(1000);
  });

  it("built-in strategies are causal: truncating the future never changes earlier signals", () => {
    const bars = makeBars(walk(300));
    for (const s of [smaCrossover(10, 30), rsiMeanReversion(14, 35, 55), buyAndHold]) {
      const full = s.positions(bars);
      for (const cut of [60, 120, 250]) {
        const partial = s.positions(bars.slice(0, cut));
        expect(partial).toEqual(full.slice(0, cut));
      }
    }
  });
});

describe("engine: costs", () => {
  it("costs strictly reduce the result of the same trades", () => {
    const bars = makeBars(walk(300, 3));
    const s = smaCrossover(10, 30);
    const free = runBacktest(bars, s, { initialCapital: 100000, costs: NO_COST });
    const paid = runBacktest(bars, s, { initialCapital: 100000, costs: { feeBps: 10, slippageBps: 10 } });
    expect(free.trades.length).toBeGreaterThan(0);
    expect(paid.finalEquity).toBeLessThan(free.finalEquity);
  });

  it("charges exactly fee+slippage on a flat round trip", () => {
    // Price never moves; a buy and a sell at 20 bps/side total must lose ~0.4%.
    const bars = makeBars([100, 100, 100, 100, 100]);
    const inOut: Strategy = {
      id: "io", label: "io", warmup: 0,
      positions: (b) => b.map((_, i) => (i === 0 || i === 1 ? 1 : 0)),
    };
    const r = runBacktest(bars, inOut, { initialCapital: 1000, costs: { feeBps: 10, slippageBps: 10 } });
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0].returnPct).toBeCloseTo(-0.004, 3);
  });

  it("marks and counts an open position at the end", () => {
    const bars = makeBars([100, 100, 110, 121]);
    const r = runBacktest(bars, buyAndHold, { initialCapital: 1000, costs: NO_COST });
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0].returnPct).toBeCloseTo(0.21, 8);
  });
});

describe("result labelling", () => {
  it("is tagged as a backtest result and states it is not a prediction", () => {
    const r = runBacktest(makeBars(walk(50)), buyAndHold, { initialCapital: 1000, costs: NO_COST });
    expect(r.kind).toBe("BACKTEST_RESULT");
    expect(r.assumptions.join(" ")).toMatch(/NOT a prediction/);
  });
});

describe("walk-forward", () => {
  const bars = makeBars(walk(500, 11));
  const folds = walkForward(bars, [buyAndHold, smaCrossover(10, 30), rsiMeanReversion()], {
    initialCapital: 100000,
    costs: { feeBps: 5, slippageBps: 5 },
    trainBars: 150,
    testBars: 50,
  });

  it("produces the expected number of folds", () => {
    expect(folds).toHaveLength(7); // (500 - 150) / 50
  });
  it("test windows follow their training window and never overlap each other", () => {
    for (const f of folds) expect(f.testStart > f.trainEnd).toBe(true);
    for (let i = 1; i < folds.length; i++) expect(folds[i].testStart > folds[i - 1].testEnd).toBe(true);
  });
  it("evaluates out-of-sample on exactly the test window", () => {
    for (const f of folds) {
      expect(f.outOfSample.equity[0].date).toBe(f.testStart);
      expect(f.outOfSample.equity.at(-1)!.date).toBe(f.testEnd);
    }
  });
});
