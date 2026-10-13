/**
 * Market regime from two measurable inputs: NIFTY 50 vs its 200-day average, and India VIX against
 * cut-offs learned on pre-2025 history (see ml/train/regimes.py and lib/ml/regimes.json).
 *
 * Regimes describe RISK. In history they separate subsequent volatility and drawdown frequency
 * strongly; they do not predict return direction and must not be presented as a buy/sell signal.
 */
import type { Bar } from "@/lib/backtest/types";
import config from "./regimes.json";
import { alignClose } from "./features";
import { rollingMean } from "./indicators";

export type Trend = "UP" | "DOWN";
export type VolState = "LOW" | "NORMAL" | "HIGH";

export interface RegimeStats {
  regime: string;
  days: number;
  share: number;
  meanFwd5dVol: number;
  meanFwd5dReturn: number;
  pFwd5dDrawdownOver3pct: number;
}

export interface Regime {
  name: string;
  trend: Trend;
  vol: VolState;
  /** Inputs used, so the classification is auditable. */
  inputs: { indexClose: number; sma200: number; indiaVix: number; vixLowCutoff: number; vixHighCutoff: number };
  /** What followed this regime historically (descriptive; sample = config.sampleRange). */
  history: RegimeStats | null;
}

export const REGIME_CONFIG = config;

export function classifyFromInputs(close: number, sma200: number, vix: number, cfg = config): { name: string; trend: Trend; vol: VolState } {
  const trend: Trend = close > sma200 ? "UP" : "DOWN";
  const vol: VolState = vix < cfg.vixLowCutoff ? "LOW" : vix >= cfg.vixHighCutoff ? "HIGH" : "NORMAL";
  const name = (cfg.names as Record<string, string>)[`${trend}|${vol}`];
  return { name, trend, vol };
}

/** Classify the latest bar. Returns null when the index lacks 200 bars or VIX is unavailable. */
export function classifyRegime(index: readonly Bar[], vix: readonly Bar[]): (Regime & { asOf: string }) | null {
  if (index.length < 200 || vix.length === 0) return null;
  const closes = index.map((b) => b.close);
  const sma = rollingMean(closes, 200);
  const last = index.length - 1;
  const v = alignClose([index[last].date], vix)[0];
  if (!Number.isFinite(sma[last]) || !Number.isFinite(v)) return null;
  const r = classifyFromInputs(closes[last], sma[last], v);
  return {
    ...r,
    asOf: index[last].date,
    inputs: { indexClose: closes[last], sma200: sma[last], indiaVix: v, vixLowCutoff: config.vixLowCutoff, vixHighCutoff: config.vixHighCutoff },
    history: (config.historical as RegimeStats[]).find((h) => h.regime === r.name) ?? null,
  };
}
