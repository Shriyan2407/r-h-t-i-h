import { describe, expect, it } from "vitest";
import { FEATURE_NAMES, alignClose, computeFeatureMatrix, isCompleteRow, latestFeatures, toAdjustedBars } from "@/lib/ml/features";
import { HORIZON, buildDatasetRows, validateDataset } from "@/lib/ml/dataset";
import { adx, atr, ema, pctChange } from "@/lib/ml/indicators";
import type { Bar } from "@/lib/backtest/types";

/** Deterministic synthetic OHLCV (LCG) so tests are reproducible. */
function synth(n: number, seed: number, start = "2018-01-01"): Bar[] {
  let s = seed;
  let p = 100;
  const t0 = Date.parse(start);
  const bars: Bar[] = [];
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const r = (s / 4294967296 - 0.5) * 0.04;
    s = (s * 1664525 + 1013904223) % 4294967296;
    const gap = (s / 4294967296 - 0.5) * 0.01;
    const open = p * (1 + gap);
    p = open * (1 + r);
    bars.push({
      date: new Date(t0 + i * 86400000).toISOString().slice(0, 10),
      open, close: p, high: Math.max(open, p) * 1.003, low: Math.min(open, p) * 0.997,
      volume: 1000 + ((s >> 8) % 500),
    });
  }
  return bars;
}

const stock = synth(500, 1);
const index = synth(500, 2);
const vix = synth(500, 3).map((b) => ({ ...b, close: 10 + (b.close % 20) }));

describe("indicators", () => {
  it("pctChange is NaN until enough history, never 0", () => {
    const r = pctChange([1, 2, 4], 2);
    expect(Number.isNaN(r[0]) && Number.isNaN(r[1])).toBe(true);
    expect(r[2]).toBe(3);
  });
  it("ema seeds with the SMA of the first period values", () => {
    const e = ema([1, 2, 3, 4, 5], 3);
    expect(e[1]).toBeNaN();
    expect(e[2]).toBe(2);
    expect(e[3]).toBeCloseTo(3, 10);
  });
  it("atr and adx are positive and bounded on noisy data", () => {
    const h = stock.map((b) => b.high), l = stock.map((b) => b.low), c = stock.map((b) => b.close);
    const a = atr(h, l, c)[300];
    const d = adx(h, l, c)[300];
    expect(a).toBeGreaterThan(0);
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThanOrEqual(100);
  });
  it("adx is high for a clean trend and low for chop", () => {
    const up = Array.from({ length: 120 }, (_, i) => 100 + i);
    const chop = Array.from({ length: 120 }, (_, i) => 100 + (i % 2));
    const adxUp = adx(up.map((v) => v + 0.5), up.map((v) => v - 0.5), up)[110];
    const adxChop = adx(chop.map((v) => v + 0.5), chop.map((v) => v - 0.5), chop)[110];
    expect(adxUp).toBeGreaterThan(50);
    expect(adxChop).toBeLessThan(adxUp);
  });
});

describe("feature matrix: point-in-time safety (leakage)", () => {
  const full = computeFeatureMatrix(stock, index, vix);

  it("has one named column per feature and one row per bar", () => {
    expect(full.rows).toHaveLength(stock.length);
    expect(full.rows[0].length).toBe(FEATURE_NAMES.length);
  });

  it("row t is identical when ALL later data (stock, index, vix) is removed", () => {
    for (const t of [270, 330, 400, 499]) {
      const cut = stock[t].date;
      const part = computeFeatureMatrix(
        stock.slice(0, t + 1),
        index.filter((b) => b.date <= cut),
        vix.filter((b) => b.date <= cut),
      );
      const a = full.rows[t];
      const b = part.rows[t];
      for (let k = 0; k < a.length; k++) {
        if (Number.isNaN(a[k])) expect(b[k]).toBeNaN();
        else expect(b[k]).toBeCloseTo(a[k], 10);
      }
    }
  });

  it("changing a FUTURE price never changes an earlier row", () => {
    const tampered = stock.map((b, i) => (i > 400 ? { ...b, close: b.close * 3, open: b.open * 3, high: b.high * 3, low: b.low * 3 } : b));
    const m = computeFeatureMatrix(tampered, index, vix);
    for (const t of [300, 350, 400]) expect(Array.from(m.rows[t])).toEqual(Array.from(full.rows[t]));
  });

  it("index values dated after t are never used (forward-fill only looks backwards)", () => {
    const dates = ["2020-01-02", "2020-01-03", "2020-01-06"];
    const ref: Bar[] = [
      { date: "2020-01-03", open: 5, high: 5, low: 5, close: 5, volume: 0 },
      { date: "2020-01-06", open: 9, high: 9, low: 9, close: 9, volume: 0 },
    ];
    const a = alignClose(dates, ref);
    expect(a[0]).toBeNaN(); // nothing known yet on 01-02
    expect(a[1]).toBe(5);
    expect(a[2]).toBe(9);
  });

  it("warm-up rows are incomplete, not zero-filled", () => {
    expect(isCompleteRow(full.rows[10])).toBe(false);
    expect(isCompleteRow(full.rows[400])).toBe(true);
  });

  it("latestFeatures refuses short histories", () => {
    expect(latestFeatures(stock.slice(0, 100), index, vix)).toBeNull();
    expect(latestFeatures(stock, index, vix)).not.toBeNull();
  });
});

describe("price adjustment", () => {
  it("rescales OHLC by adjClose/close so a split does not create a fake gap", () => {
    const raw = [
      { date: "2020-01-01", open: 200, high: 210, low: 190, close: 200, adjClose: 100, volume: 1 },
      { date: "2020-01-02", open: 101, high: 105, low: 99, close: 100, adjClose: 100, volume: 1 },
    ];
    const b = toAdjustedBars(raw);
    expect(b[0].close).toBe(100);
    expect(b[0].open).toBe(100);
    expect(b[1].open / b[0].close - 1).toBeCloseTo(0.01, 10);
  });
  it("drops rows with invalid prices", () => {
    expect(toAdjustedBars([{ date: "x", open: 0, high: 1, low: 1, close: 1, adjClose: 1, volume: 0 }])).toHaveLength(0);
  });
});

describe("dataset labels", () => {
  const rows = buildDatasetRows("TEST", stock, index, vix);

  it("passes integrity validation (no duplicates, exit after decision, finite features)", () => {
    expect(rows.length).toBeGreaterThan(100);
    expect(validateDataset(rows)).toEqual([]);
  });

  it("enters at the next open and exits at close t+5", () => {
    const r = rows[10];
    const t = stock.findIndex((b) => b.date === r.date);
    expect(r.exitDate).toBe(stock[t + HORIZON].date);
    expect(r.fwdRet).toBeCloseTo(stock[t + HORIZON].close / stock[t + 1].open - 1, 12);
  });

  it("never labels the final HORIZON bars (no future available)", () => {
    const last = rows[rows.length - 1];
    const t = stock.findIndex((b) => b.date === last.date);
    expect(t + HORIZON).toBeLessThanOrEqual(stock.length - 1);
  });

  it("features are independent of the label's future window", () => {
    const tampered = stock.map((b, i) => (i > 450 ? { ...b, close: b.close * 2, open: b.open * 2, high: b.high * 2, low: b.low * 2 } : b));
    const other = buildDatasetRows("TEST", tampered, index, vix);
    const a = rows.find((r) => r.date === stock[440].date)!;
    const b = other.find((r) => r.date === stock[440].date)!;
    expect(b.features).toEqual(a.features);
  });

  it("validateDataset detects planted problems", () => {
    const dup = [rows[0], rows[0]];
    expect(validateDataset(dup).join()).toMatch(/duplicate/);
    expect(validateDataset([{ ...rows[0], exitDate: rows[0].date }]).join()).toMatch(/exitDate/);
    expect(validateDataset([{ ...rows[0], label: rows[0].label === 1 ? 0 : 1 }]).join()).toMatch(/label inconsistent/);
  });
});
