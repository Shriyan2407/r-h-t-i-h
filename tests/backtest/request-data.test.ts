import { describe, expect, it, vi } from "vitest";

vi.mock("yahoo-finance2", () => ({ default: class {} }));

import { backtestRequestSchema } from "@/lib/backtest/request";
import { cleanBars } from "@/lib/backtest/data";

describe("backtest request schema", () => {
  const ok = { ticker: "reliance", strategy: "sma_crossover" };

  it("normalises the ticker and applies defaults", () => {
    const r = backtestRequestSchema.parse(ok);
    expect(r.ticker).toBe("RELIANCE");
    expect(r.years).toBe(3);
    expect(r.feeBps).toBe(10);
  });

  it.each([
    [{ ...ok, ticker: "../etc/passwd" }],
    [{ ...ok, ticker: "A".repeat(21) }],
    [{ ...ok, strategy: "martingale" }],
    [{ ...ok, years: 50 }],
    [{ ...ok, years: 2.5 }],
    [{ ...ok, initialCapital: -1 }],
    [{ ...ok, feeBps: 5000 }],
    [{ ...ok, slippageBps: Number.NaN }],
  ])("rejects %j", (input) => {
    expect(backtestRequestSchema.safeParse(input).success).toBe(false);
  });
});

describe("cleanBars", () => {
  it("drops incomplete or non-positive rows, sorts and de-duplicates", () => {
    const bars = cleanBars([
      { date: "2024-01-03", open: 3, high: 3, low: 3, close: 3, volume: 1 },
      { date: "2024-01-01", open: 1, high: 1, low: 1, close: 1, volume: 1 },
      { date: "2024-01-02", open: null, high: 2, low: 2, close: 2 },
      { date: "2024-01-04", open: 0, high: 1, low: 1, close: 1 },
      { date: "2024-01-01", open: 9, high: 9, low: 9, close: 9, volume: 2 },
    ]);
    expect(bars.map((b) => b.date)).toEqual(["2024-01-01", "2024-01-03"]);
    expect(bars[0].close).toBe(9); // later duplicate wins
  });
});
