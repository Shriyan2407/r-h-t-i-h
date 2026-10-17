import { describe, expect, it } from "vitest";
import { REGIME_CONFIG, classifyFromInputs, classifyRegime } from "@/lib/ml/regime";
import type { Bar } from "@/lib/backtest/types";
import parity from "./fixtures/regime-parity.json";

const bar = (date: string, close: number): Bar => ({ date, open: close, high: close, low: close, close, volume: 0 });

describe("regime classifier", () => {
  it("reproduces every Python reference classification", () => {
    expect(parity.cases.length).toBeGreaterThanOrEqual(20);
    for (const c of parity.cases) expect(classifyFromInputs(c.close, c.sma200, c.vix).name).toBe(c.expected);
  });

  it("covers all six regimes through the thresholds", () => {
    const { vixLowCutoff: lo, vixHighCutoff: hi } = REGIME_CONFIG;
    const names = new Set([
      classifyFromInputs(110, 100, lo - 1).name, classifyFromInputs(110, 100, (lo + hi) / 2).name, classifyFromInputs(110, 100, hi + 1).name,
      classifyFromInputs(90, 100, lo - 1).name, classifyFromInputs(90, 100, (lo + hi) / 2).name, classifyFromInputs(90, 100, hi + 1).name,
    ]);
    expect(names.size).toBe(6);
  });

  it("boundary semantics: VIX exactly at the high cutoff is HIGH; exactly at the low cutoff is NORMAL", () => {
    expect(classifyFromInputs(110, 100, REGIME_CONFIG.vixHighCutoff).vol).toBe("HIGH");
    expect(classifyFromInputs(110, 100, REGIME_CONFIG.vixLowCutoff).vol).toBe("NORMAL");
  });

  it("classifies from bars, exposes auditable inputs, and attaches history", () => {
    const idx = Array.from({ length: 260 }, (_, i) => bar(new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10), 100 + i * 0.1));
    const vix = idx.map((b) => bar(b.date, 12));
    const r = classifyRegime(idx, vix)!;
    expect(r.trend).toBe("UP");
    expect(r.vol).toBe("LOW");
    expect(r.name).toBe("Calm uptrend");
    expect(r.inputs.indiaVix).toBe(12);
    expect(r.history?.regime).toBe("Calm uptrend");
    expect(r.asOf).toBe(idx[259].date);
  });

  it("returns null rather than guessing when data is insufficient", () => {
    const idx = Array.from({ length: 50 }, (_, i) => bar(`2024-01-${String((i % 28) + 1).padStart(2, "0")}`, 100));
    expect(classifyRegime(idx, [bar("2024-01-01", 12)])).toBeNull();
    const idx2 = Array.from({ length: 260 }, (_, i) => bar(new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10), 100));
    expect(classifyRegime(idx2, [])).toBeNull();
  });

  it("historical table backs the claim that regimes separate risk (stress >2x calm volatility)", () => {
    const h = Object.fromEntries(REGIME_CONFIG.historical.map((x) => [x.regime, x]));
    expect(h["Market stress"].meanFwd5dVol).toBeGreaterThan(2 * h["Calm uptrend"].meanFwd5dVol);
    expect(h["Market stress"].pFwd5dDrawdownOver3pct).toBeGreaterThan(3 * h["Calm uptrend"].pFwd5dDrawdownOver3pct);
  });
});
