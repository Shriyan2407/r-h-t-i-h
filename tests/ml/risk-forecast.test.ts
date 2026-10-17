import { describe, expect, it } from "vitest";
import { buildRiskForecast, STALE_AFTER_DAYS } from "@/lib/ml/riskForecast";
import { templateExplanation } from "@/lib/ai/riskExplainer";
import { checkExplanation } from "@/lib/ai/numericGuard";
import { VOL_ARTIFACT } from "@/lib/ml/volatility";
import { synthMarket } from "./synth";

const m = synthMarket();
const lastDate = new Date(Date.parse(m.stock.at(-1)!.date) + 86400000);
const res = buildRiskForecast({ ticker: "TEST", symbol: "TEST.NS", ...m }, lastDate);

describe("risk forecast contract", () => {
  it("refuses short histories instead of guessing", () => {
    const r = buildRiskForecast({ ticker: "T", symbol: "T.NS", ...m, stock: m.stock.slice(0, 100) });
    expect(r).toMatchObject({ available: false, reason: "INSUFFICIENT_HISTORY" });
  });

  it("never offers a direction prediction and states why", () => {
    if (!res.available) throw new Error("expected forecast");
    expect(res.contract.direction.available).toBe(false);
    expect(res.contract.direction.reason).toMatch(/No direction model passed validation/);
  });

  it("is tied to the registered production model version", () => {
    if (!res.available) throw new Error("expected forecast");
    expect(res.contract.model.id).toBe(VOL_ARTIFACT.id);
    expect(res.contract.model.version).toBe(VOL_ARTIFACT.version);
    expect(res.contract.model.status).toBe("production");
  });

  it("evidence ids are unique and every item has a source", () => {
    if (!res.available) throw new Error("expected forecast");
    const ids = res.contract.evidence.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of res.contract.evidence) expect(e.source.length).toBeGreaterThan(0);
  });

  it("forecast numbers are consistent and the percentile is a valid rank", () => {
    if (!res.available) throw new Error("expected forecast");
    const v = res.contract.volatility;
    expect(v.dailyVolLow).toBeLessThan(v.dailyVol);
    expect(v.dailyVolHigh).toBeGreaterThan(v.dailyVol);
    if (v.percentileVsOwnYear !== null) {
      expect(v.percentileVsOwnYear).toBeGreaterThanOrEqual(0);
      expect(v.percentileVsOwnYear).toBeLessThanOrEqual(100);
    }
  });

  it("flags stale data", () => {
    const later = new Date(Date.parse(m.stock.at(-1)!.date) + (STALE_AFTER_DAYS + 3) * 86400000);
    const r = buildRiskForecast({ ticker: "T", symbol: "T.NS", ...m }, later);
    if (!r.available) throw new Error("expected forecast");
    expect(r.contract.stale).toBe(true);
    if (!res.available) throw new Error("expected forecast");
    expect(res.contract.stale).toBe(false);
  });

  it("the deterministic template passes the numeric guard (only evidence numbers, cited)", () => {
    if (!res.available) throw new Error("expected forecast");
    const e = templateExplanation(res.contract);
    const verdict = checkExplanation([e.why, e.supports, e.invalidates, e.unknowns].join(" "), res.contract.evidence);
    expect(verdict.problems).toEqual([]);
  });
});
