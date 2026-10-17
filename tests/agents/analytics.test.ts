import { describe, expect, it } from "vitest";
import { betaAndCorrelation, technicalSnapshot, trendRuleStudy } from "@/lib/agents/analytics";
import type { Bar } from "@/lib/backtest/types";
import { trendBars } from "./fixtures";

const line = (closes: number[]): Bar[] => closes.map((c, i) => ({ date: `2020-01-${String(i + 1).padStart(4, "0")}`, open: c, high: c, low: c, close: c, volume: 100 }));

describe("technical snapshot", () => {
  it("returns null without enough history rather than zeros", () => {
    expect(technicalSnapshot(trendBars(20))).toBeNull();
  });

  it("leaves long-window fields null when history is short", () => {
    const s = technicalSnapshot(trendBars(120))!;
    expect(s.sma200).toBeNull();
    expect(s.trend).toBe("unknown");
    expect(s.ret12m1m).toBeNull();
    expect(s.high52).toBeNull();
    expect(s.rsi14).not.toBeNull();
  });

  it("classifies a steady rise as an uptrend and a steady fall as a downtrend", () => {
    expect(technicalSnapshot(trendBars(400, { drift: 0.002, wobble: 0.002 }))!.trend).toBe("uptrend");
    expect(technicalSnapshot(trendBars(400, { drift: -0.002, wobble: 0.002 }))!.trend).toBe("downtrend");
  });

  it("computes returns exactly from closes", () => {
    const closes = Array.from({ length: 300 }, (_, i) => 100 + i);
    const s = technicalSnapshot(line(closes))!;
    expect(s.ret1m).toBeCloseTo(399 / 378 - 1, 12);
    expect(s.ret12m1m).toBeCloseTo(378 / 147 - 1, 12);
    expect(s.priceVsSma200).toBeCloseTo(399 / (mean(closes.slice(-200))) - 1, 12);
  });
});

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe("beta and correlation", () => {
  it("a stock that moves exactly twice the index has beta 2 and correlation 1", () => {
    const idx = trendBars(300, { wobble: 0.01 });
    const stock = idx.map((b, i) => ({ ...b, close: i === 0 ? 100 : 0 }));
    for (let i = 1; i < idx.length; i++) stock[i].close = stock[i - 1].close * (1 + 2 * (idx[i].close / idx[i - 1].close - 1));
    const r = betaAndCorrelation(stock, idx)!;
    expect(r.beta).toBeCloseTo(2, 9);
    expect(r.correlation).toBeCloseTo(1, 9);
    expect(r.n).toBe(252);
  });

  it("needs at least 60 common days", () => {
    expect(betaAndCorrelation(trendBars(50), trendBars(50))).toBeNull();
  });
});

describe("trend rule study", () => {
  it("is null without enough observations and reports rates in [0,1] otherwise", () => {
    expect(trendRuleStudy(trendBars(300))).toBeNull();
    const s = trendRuleStudy(trendBars(800))!;
    expect(s.observations).toBe(800 - 199 - 20);
    for (const v of [s.upRateAbove, s.upRateBelow, s.baseRate]) if (v !== null) expect(v).toBeGreaterThanOrEqual(0);
  });
});
