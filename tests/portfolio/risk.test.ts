import { describe, expect, it } from "vitest";
import {
  alignSeries, analyzePortfolio, concentration, corrMatrix, covMatrix, historicalCVaR, historicalReplay, historicalVaR,
  marketShock, maxDrawdown, riskContributions, sectorShock, volatilityShock,
} from "@/lib/portfolio/risk";
import type { Bar } from "@/lib/backtest/types";
import { synthBars } from "../ml/synth";

const bar = (date: string, close: number, volume = 1000): Bar => ({ date, open: close, high: close, low: close, close, volume });

describe("building blocks", () => {
  it("concentration: equal weights give effective holdings = N", () => {
    const c = concentration([0.25, 0.25, 0.25, 0.25]);
    expect(c.hhi).toBeCloseTo(0.25, 12);
    expect(c.effectiveHoldings).toBeCloseTo(4, 12);
    expect(concentration([1]).effectiveHoldings).toBe(1);
  });

  it("risk contributions sum to 1 and equal weights for identical uncorrelated assets", () => {
    const cov = [[0.04, 0], [0, 0.04]];
    const rc = riskContributions([0.5, 0.5], cov);
    expect(rc[0]).toBeCloseTo(0.5, 12);
    expect(rc[0] + rc[1]).toBeCloseTo(1, 12);
    const rc2 = riskContributions([0.5, 0.5], [[0.09, 0], [0, 0.01]]);
    expect(rc2[0]).toBeCloseTo(0.9, 12); // the riskier asset dominates
  });

  it("correlation of perfectly co-moving series is 1 and of mirrored series is -1", () => {
    const a = [0.01, -0.02, 0.03, 0.0, -0.01];
    const corr = corrMatrix(covMatrix([a, a.map((x) => 2 * x), a.map((x) => -x)]));
    expect(corr[0][1]).toBeCloseTo(1, 12);
    expect(corr[0][2]).toBeCloseTo(-1, 12);
  });

  it("max drawdown and VaR on known paths", () => {
    expect(maxDrawdown([0.1, -0.5, 0.2])).toBeCloseTo(-0.5, 12);
    const r = Array.from({ length: 100 }, (_, i) => (i - 50) / 1000); // -0.05..0.049
    expect(historicalVaR(r, 0.95)).toBeCloseTo(0.046, 12);
  });

  it("CVaR averages the tail at and beyond the VaR cut-off, so it is never below VaR", () => {
    const r = Array.from({ length: 100 }, (_, i) => (i - 50) / 1000);
    expect(historicalCVaR(r, 0.95)).toBeCloseTo(0.048, 12); // mean of -0.050..-0.046
    for (const level of [0.9, 0.95, 0.99]) expect(historicalCVaR(r, level)).toBeGreaterThanOrEqual(historicalVaR(r, level));
  });

  it("alignSeries keeps only dates where every series traded (no forward fill)", () => {
    const a = alignSeries([[bar("d1", 1), bar("d2", 2), bar("d3", 3)], [bar("d1", 1), bar("d3", 3)]], [bar("d1", 1), bar("d2", 2), bar("d3", 3)]);
    expect(a.dates).toEqual(["d1", "d3"]);
  });
});

describe("analyzePortfolio", () => {
  const index = synthBars(400, 2, "2020-01-01", 0.02);
  const s1 = synthBars(400, 3);
  const s2 = synthBars(400, 4);
  const holdings = [{ ticker: "AAA", quantity: 10, sector: "IT" }, { ticker: "BBB", quantity: 30, sector: "Banks" }];
  const r = analyzePortfolio(holdings, [s1, s2], index);

  it("weights are market-value weights that sum to 1", () => {
    const v1 = 10 * s1.at(-1)!.close, v2 = 30 * s2.at(-1)!.close;
    expect(r.holdings[0].weight).toBeCloseTo(v1 / (v1 + v2), 12);
    expect(r.holdings.reduce((a, h) => a + h.weight, 0)).toBeCloseTo(1, 12);
    expect(r.totalValue).toBeCloseTo(v1 + v2, 8);
  });

  it("risk contributions sum to 1; diversification ratio >= 1", () => {
    expect(r.holdings.reduce((a, h) => a + h.riskContribution, 0)).toBeCloseTo(1, 10);
    expect(r.historical.diversificationRatio).toBeGreaterThanOrEqual(1 - 1e-12);
  });

  it("a single-stock portfolio equals that stock's own statistics", () => {
    const one = analyzePortfolio([holdings[0]], [s1], index);
    expect(one.historical.annualVol).toBeCloseTo(one.holdings[0].annualVol, 10);
    expect(one.historical.beta).toBeCloseTo(one.holdings[0].beta, 10);
    expect(one.concentration.effectiveHoldings).toBe(1);
  });

  it("the index itself has beta 1 and correlation 1", () => {
    const self = analyzePortfolio([{ ticker: "IDX", quantity: 1, sector: "Index" }], [index], index);
    expect(self.historical.beta).toBeCloseTo(1, 10);
    expect(self.historical.correlationToIndex).toBeCloseTo(1, 10);
  });

  it("days to liquidate scales with position size", () => {
    const big = analyzePortfolio([{ ...holdings[0], quantity: 1000 }, holdings[1]], [s1, s2], index);
    expect(big.holdings[0].daysToLiquidate! / r.holdings[0].daysToLiquidate!).toBeCloseTo(100, 6);
  });

  it("refuses to compute with too little common history", () => {
    expect(() => analyzePortfolio(holdings, [s1.slice(0, 30), s2], index)).toThrow(/common trading days/);
  });
});

describe("stress scenarios", () => {
  const index = synthBars(400, 2, "2020-01-01", 0.02);
  const r = analyzePortfolio([{ ticker: "IDX", quantity: 1, sector: "Index" }], [index], index);

  it("market shock on an index-only portfolio equals the shock", () => {
    expect(marketShock(r, -0.1).portfolioReturn).toBeCloseTo(-0.1, 8);
  });

  it("sector shock only hits that sector's weight", () => {
    expect(sectorShock(r, "Index", -0.2).portfolioReturn).toBeCloseTo(-0.2, 12);
    expect(sectorShock(r, "Pharma", -0.2).portfolioReturn).toBe(0);
  });

  it("volatility shock scales VaR", () => {
    expect(volatilityShock(r, 2).portfolioReturn).toBeCloseTo(-2 * r.historical.var95, 12);
  });

  it("historical replay uses actual prices and reports partial coverage honestly", () => {
    const a = [bar("2020-02-19", 100), bar("2020-03-23", 60)];
    const b = [bar("2021-01-01", 50), bar("2021-06-01", 55)]; // listed after the window
    const out = historicalReplay("covid", "COVID crash", "2020-02-19", "2020-03-23",
      [{ ticker: "A", quantity: 1, sector: "x" }, { ticker: "B", quantity: 1, sector: "y" }], [0.6, 0.4], [a, b]);
    expect(out.portfolioReturn).toBeCloseTo(-0.4, 12);
    expect(out.coverage).toBeCloseTo(0.6, 12);
    expect(out.notes).toMatch(/Only 60%/);
  });

  it("returns null, not 0, when no holding covers the window", () => {
    const out = historicalReplay("x", "x", "2020-02-19", "2020-03-23", [{ ticker: "B", quantity: 1, sector: "y" }], [1], [[bar("2021-01-01", 50), bar("2021-02-01", 51)]]);
    expect(out.portfolioReturn).toBeNull();
    expect(out.coverage).toBe(0);
  });
});
