/**
 * Volatility forecast inference (ridge regression, exported by ml/train/final_vol.py).
 *
 * Predicts the RMS of the next 5 daily returns. It forecasts the SIZE of moves, never their
 * direction. The model has measured skill (see lib/ml/registry.json); direction models were
 * evaluated and rejected, so nothing here produces a price target or an up/down probability.
 */
import artifact from "./artifacts/volatility-ridge-1.1.0.json";
import { FEATURE_NAMES } from "./features";

export interface VolatilityArtifact {
  id: string;
  version: string;
  featureVersion: string;
  columns: string[];
  winsorLo: number[];
  winsorHi: number[];
  mean: number[];
  scale: number[];
  coef: number[];
  intercept: number;
  residualQ10: number;
  residualQ90: number;
  logFloor: number;
}

export const VOL_ARTIFACT = artifact as unknown as VolatilityArtifact;

/** Features the model log-transforms (must match LOG_COLS in ml/train/vol.py). */
const LOG_COLS = ["rv_20", "atr_pct", "bb_width", "idx_vol_20", "hl_range", "vix_level"] as const;

export const FACTOR_GROUPS: Record<string, string> = {
  rv_20: "Own volatility", rv_ratio_20_60: "Own volatility", atr_pct: "Own volatility", bb_width: "Own volatility",
  hl_range: "Own volatility", log_rv_20: "Own volatility", log_atr_pct: "Own volatility", log_bb_width: "Own volatility",
  log_hl_range: "Own volatility",
  idx_vol_20: "Market volatility", idx_ret_5: "Market trend", idx_ret_20: "Market trend", idx_dd_252: "Market drawdown",
  log_idx_vol_20: "Market volatility", vix_level: "India VIX", vix_chg_5: "India VIX", log_vix_level: "India VIX",
  beta_60: "Market sensitivity", corr_60: "Market sensitivity", rel_str_20: "Relative strength",
  vol_ratio_5_20: "Volume",
};
const groupOf = (name: string) => FACTOR_GROUPS[name] ?? "Price & trend";

/** Build the model's design vector (raw features + log transforms) in artifact column order. */
export function designVector(features: ArrayLike<number>, art: VolatilityArtifact = VOL_ARTIFACT): number[] {
  const byName = new Map<string, number>();
  FEATURE_NAMES.forEach((n, i) => byName.set(n, features[i]));
  for (const c of LOG_COLS) byName.set(`log_${c}`, Math.log(Math.max(byName.get(c) as number, art.logFloor)));
  return art.columns.map((c) => {
    const v = byName.get(c);
    if (v === undefined || !Number.isFinite(v)) throw new Error(`missing or non-finite feature: ${c}`);
    return v;
  });
}

export interface Contribution {
  feature: string;
  group: string;
  /** Contribution to the log-volatility forecast relative to the training average (exact for a linear model). */
  value: number;
}

export interface VolatilityPrediction {
  /** Expected RMS daily move over the next 5 trading days, as a fraction (0.015 = 1.5%/day). */
  dailyVol: number;
  /** 80% interval for the same quantity. */
  dailyVolLow: number;
  dailyVolHigh: number;
  annualizedVol: number;
  /** Rough 1-sigma move over the 5-day horizon (dailyVol * sqrt(5)); a scale, not a price target. */
  fiveDayMove: number;
  logForecast: number;
  contributions: Contribution[];
}

export function predictVolatility(features: ArrayLike<number>, art: VolatilityArtifact = VOL_ARTIFACT): VolatilityPrediction {
  const x = designVector(features, art);
  let log = art.intercept;
  const contributions: Contribution[] = [];
  for (let j = 0; j < x.length; j++) {
    const clipped = Math.min(Math.max(x[j], art.winsorLo[j]), art.winsorHi[j]);
    const z = (clipped - art.mean[j]) / art.scale[j];
    const c = art.coef[j] * z;
    log += c;
    contributions.push({ feature: art.columns[j], group: groupOf(art.columns[j]), value: c });
  }
  const dailyVol = Math.exp(log);
  return {
    dailyVol,
    dailyVolLow: Math.exp(log + art.residualQ10),
    dailyVolHigh: Math.exp(log + art.residualQ90),
    annualizedVol: dailyVol * Math.sqrt(252),
    fiveDayMove: dailyVol * Math.sqrt(5),
    logForecast: log,
    contributions,
  };
}

export interface FactorSummary {
  group: string;
  value: number;
}

/** Sum feature contributions into human-readable groups, largest absolute effect first. */
export function groupContributions(contributions: readonly Contribution[]): FactorSummary[] {
  const m = new Map<string, number>();
  for (const c of contributions) m.set(c.group, (m.get(c.group) ?? 0) + c.value);
  return [...m.entries()].map(([group, value]) => ({ group, value })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}
