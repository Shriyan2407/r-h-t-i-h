import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FEATURE_NAMES } from "@/lib/ml/features";
import { VOL_ARTIFACT, designVector, groupContributions, predictVolatility } from "@/lib/ml/volatility";
import registry from "@/lib/ml/registry.json";
import parity from "./fixtures/volatility-parity.json";

describe("volatility model: Python <-> TypeScript parity", () => {
  it("reproduces every Python reference prediction", () => {
    expect(parity.cases.length).toBeGreaterThanOrEqual(20);
    for (const c of parity.cases) {
      const p = predictVolatility(c.features);
      expect(Math.abs(p.logForecast - c.expectedLogRv5)).toBeLessThan(1e-6);
    }
  });

  it("design vector follows the artifact column order and has the log transforms", () => {
    const f = parity.cases[0].features;
    const x = designVector(f);
    expect(x).toHaveLength(VOL_ARTIFACT.columns.length);
    const iRv = FEATURE_NAMES.indexOf("rv_20");
    const j = VOL_ARTIFACT.columns.indexOf("log_rv_20");
    expect(x[j]).toBeCloseTo(Math.log(Math.max(f[iRv], VOL_ARTIFACT.logFloor)), 12);
  });

  it("refuses non-finite or missing inputs instead of guessing", () => {
    const f = [...parity.cases[0].features];
    f[0] = NaN;
    expect(() => designVector(f)).toThrow(/non-finite/);
  });
});

describe("volatility prediction semantics", () => {
  const p = predictVolatility(parity.cases[5].features);

  it("is positive, ordered, and consistent in units", () => {
    expect(p.dailyVol).toBeGreaterThan(0);
    expect(p.dailyVolLow).toBeLessThan(p.dailyVol);
    expect(p.dailyVolHigh).toBeGreaterThan(p.dailyVol);
    expect(p.annualizedVol).toBeCloseTo(p.dailyVol * Math.sqrt(252), 10);
    expect(p.fiveDayMove).toBeCloseTo(p.dailyVol * Math.sqrt(5), 10);
  });

  it("rises with the dominant own-volatility measure (ATR %), all else equal", () => {
    // rv_20 alone has ~0 weight: ATR (a more efficient range-based estimator) carries the signal.
    const base = [...parity.cases[5].features];
    const hi = [...base];
    const i = FEATURE_NAMES.indexOf("atr_pct");
    hi[i] = base[i] * 2;
    expect(predictVolatility(hi).dailyVol).toBeGreaterThan(predictVolatility(base).dailyVol);
  });

  it("is monotone in own volatility across all parity cases (regression test for the v1.0.0 defect)", () => {
    const idx = ["rv_20", "atr_pct", "bb_width", "hl_range"].map((n) => FEATURE_NAMES.indexOf(n as (typeof FEATURE_NAMES)[number]));
    for (const c of parity.cases) {
      const up = [...c.features];
      for (const i of idx) up[i] = c.features[i] * 1.5;
      expect(predictVolatility(up).dailyVol).toBeGreaterThan(predictVolatility(c.features).dailyVol);
    }
  });

  it("contributions sum (with the training-mean intercept) to the forecast", () => {
    const total = p.contributions.reduce((a, c) => a + c.value, 0) + VOL_ARTIFACT.intercept;
    expect(total).toBeCloseTo(p.logForecast, 10);
  });

  it("groups contributions, largest effect first", () => {
    const g = groupContributions(p.contributions);
    for (let i = 1; i < g.length; i++) expect(Math.abs(g[i - 1].value)).toBeGreaterThanOrEqual(Math.abs(g[i].value));
    expect(new Set(g.map((x) => x.group)).size).toBe(g.length);
  });
});

describe("model registry integrity", () => {
  it("production artifact hash matches the file on disk (no silent replacement)", () => {
    const entry = registry.models.find((m) => m.status === "production")!;
    const body = readFileSync(join(process.cwd(), entry.artifact as string));
    expect(createHash("sha256").update(body).digest("hex")).toBe(entry.artifactSha256);
  });

  it("keeps the defective v1.0.0 on record as superseded, with the reason", () => {
    const old = registry.models.find((m) => m.id === "volatility-ridge" && m.version === "1.0.0") as { status: string; reason?: string; supersededBy?: string };
    expect(old.status).toBe("superseded");
    expect(old.supersededBy).toBe("1.1.0");
    expect(old.reason).toMatch(/collinear/);
  });

  it("flags the v1.1.0 holdout as a second look", () => {
    const cur = registry.models.find((m) => m.status === "production") as { holdout: { pristine: boolean } };
    expect(cur.holdout.pristine).toBe(false);
  });

  it("has exactly one production model, a volatility forecaster", () => {
    const prod = registry.models.filter((m) => m.status === "production");
    expect(prod).toHaveLength(1);
    expect(prod[0].task).toBe("volatility_forecast");
  });

  it("every rejected direction model records why and has no artifact", () => {
    const rejected = registry.models.filter((m) => m.status === "rejected");
    expect(rejected.length).toBeGreaterThanOrEqual(6);
    for (const m of rejected) {
      expect(m.artifact).toBeNull();
      expect(String((m as { reason?: string }).reason)).toMatch(/pre-registered deployment gate/);
    }
  });

  it("no registered model claims direction skill it does not have", () => {
    const directionProd = registry.models.filter((m) => m.task === "direction_classification" && m.status === "production");
    expect(directionProd).toHaveLength(0);
  });

  it("artifact feature version matches the code's feature version", async () => {
    const { FEATURE_VERSION } = await import("@/lib/ml/features");
    expect(VOL_ARTIFACT.featureVersion).toBe(FEATURE_VERSION);
  });
});
