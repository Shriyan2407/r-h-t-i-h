import { describe, expect, it } from "vitest";
import { characteristics, factorExposures, referenceStats, type FactorReference } from "@/lib/portfolio/factors";
import { buildPortfolioRisk } from "@/lib/portfolio/riskService";
import reference from "@/lib/portfolio/factorReference.json";
import { synthBars, synthMarket } from "../ml/synth";

const ref: FactorReference = {
  asOf: "2026-10-14", universe: "test", count: 3,
  stats: { size: { mean: 10, std: 1, n: 3 }, value: { mean: 0.5, std: 0.25, n: 3 }, momentum: { mean: 0, std: 0.1, n: 3 }, lowVol: { mean: -0.2, std: 0.05, n: 3 } },
};

describe("characteristics", () => {
  it("computes 12-1 momentum and volatility from bars, size/value from fundamentals", () => {
    const bars = synthBars(300, 3);
    const c = characteristics(bars, { marketCap: Math.exp(12), priceToBook: 2 });
    const n = bars.length;
    expect(c.momentum).toBeCloseTo(bars[n - 22].close / bars[n - 253].close - 1, 12);
    expect(c.lowVol!).toBeLessThan(0);
    expect(c.size).toBeCloseTo(12, 12);
    expect(c.value).toBeCloseTo(0.5, 12);
  });
  it("leaves characteristics missing (not zero) when inputs are missing", () => {
    const c = characteristics(synthBars(100, 3), null);
    expect(c).toEqual({});
    expect(characteristics(synthBars(300, 3), { marketCap: 0, priceToBook: -1 }).size).toBeUndefined();
  });
});

describe("factorExposures", () => {
  it("is the value-weighted z-score with coverage", () => {
    const e = factorExposures([0.75, 0.25], [{ size: 11 }, { size: 8 }], ref);
    const size = e.find((x) => x.factor === "size")!;
    expect(size.exposure).toBeCloseTo(0.75 * 1 + 0.25 * -2, 12);
    expect(size.coverage).toBeCloseTo(1, 12);
  });
  it("re-weights over covered holdings and caps outliers at ±3", () => {
    const e = factorExposures([0.5, 0.5], [{ value: 10 }, {}], ref);
    const v = e.find((x) => x.factor === "value")!;
    expect(v.exposure).toBe(3);
    expect(v.coverage).toBeCloseTo(0.5, 12);
  });
  it("reports null exposure with zero coverage instead of 0", () => {
    const e = factorExposures([1], [{}], ref);
    for (const x of e) {
      expect(x.exposure).toBeNull();
      expect(x.coverage).toBe(0);
    }
  });
  it("referenceStats gives mean/std over available values only", () => {
    const s = referenceStats([{ size: 1 }, { size: 3 }, {}]);
    expect(s.size).toEqual({ mean: 2, std: Math.SQRT2, n: 2 });
    expect(s.value.n).toBe(0);
  });
  it("the committed reference covers every factor with a positive spread", () => {
    for (const f of ["size", "value", "momentum", "lowVol"] as const) {
      expect((reference as FactorReference).stats[f].std).toBeGreaterThan(0);
      expect((reference as FactorReference).stats[f].n).toBeGreaterThan(30);
    }
  });
});

describe("risk service integrates exposures", () => {
  it("includes all four factors and uses the fundamentals fetcher once", async () => {
    const m = synthMarket(700);
    let calls = 0;
    const res = await buildPortfolioRisk(
      [{ ticker: "AAA", quantity: 10, sector: "IT", exchange: "NSE" }],
      async () => synthBars(700, 9),
      { index: m.index, vix: m.vix },
      async (t) => { calls++; return Object.fromEntries(t.map((x) => [x, { marketCap: 3e12, priceToBook: 3 }])); },
    );
    if ("error" in res) throw new Error("expected report");
    expect(calls).toBe(1);
    expect(res.factors.exposures.map((e) => e.factor)).toEqual(["size", "value", "momentum", "lowVol"]);
    for (const e of res.factors.exposures) expect(e.coverage).toBeCloseTo(1, 10);
  });
});
