/**
 * Characteristic-based style exposures. For each holding we measure four characteristics, standardise each
 * against the current Nifty 50 cross-section (lib/portfolio/factorReference.json), and take the
 * value-weighted average. This describes WHAT the portfolio holds (bigger/cheaper/trendier/calmer than the
 * index members). It is not a returns-based factor model and makes no claim that these styles earn premia.
 */
import type { Bar } from "@/lib/backtest/types";

export const FACTORS = ["size", "value", "momentum", "lowVol"] as const;
export type Factor = (typeof FACTORS)[number];

export const FACTOR_LABELS: Record<Factor, { name: string; high: string; low: string; definition: string }> = {
  size: { name: "Size", high: "larger companies", low: "smaller companies", definition: "log market capitalisation" },
  value: { name: "Value", high: "cheaper (higher book/price)", low: "more expensive", definition: "book value / price (1 / P/B)" },
  momentum: { name: "Momentum", high: "stronger past-year trend", low: "weaker trend", definition: "return from 12 months to 1 month ago" },
  lowVol: { name: "Low volatility", high: "calmer stocks", low: "more volatile stocks", definition: "minus 1-year annualised volatility" },
};

export interface FundamentalsSnapshot {
  marketCap?: number | null;
  priceToBook?: number | null;
}

export type Characteristics = Partial<Record<Factor, number>>;

export interface FactorReference {
  asOf: string;
  universe: string;
  count: number;
  stats: Record<Factor, { mean: number; std: number; n: number }>;
}

/** Raw characteristics for one stock. Missing inputs give missing characteristics, never zeros. */
export function characteristics(bars: readonly Bar[], f: FundamentalsSnapshot | null): Characteristics {
  const out: Characteristics = {};
  const n = bars.length;
  if (n >= 253) {
    const c = bars.map((b) => b.close);
    out.momentum = c[n - 22] / c[n - 253] - 1;
    const r: number[] = [];
    for (let i = n - 252; i < n; i++) r.push(c[i] / c[i - 1] - 1);
    const m = r.reduce((a, b) => a + b, 0) / r.length;
    const sd = Math.sqrt(r.reduce((a, b) => a + (b - m) ** 2, 0) / (r.length - 1));
    out.lowVol = -sd * Math.sqrt(252);
  }
  if (f?.marketCap && f.marketCap > 0) out.size = Math.log(f.marketCap);
  if (f?.priceToBook && f.priceToBook > 0) out.value = 1 / f.priceToBook;
  return out;
}

const clip = (z: number) => Math.max(-3, Math.min(3, z));

export interface FactorExposure {
  factor: Factor;
  /** Value-weighted mean z-score (0 = typical Nifty 50 member), or null with no coverage. */
  exposure: number | null;
  /** Share of portfolio value with this characteristic available. */
  coverage: number;
}

export function factorExposures(weights: readonly number[], chars: readonly Characteristics[], ref: FactorReference): FactorExposure[] {
  return FACTORS.map((factor) => {
    const { mean, std } = ref.stats[factor];
    let wSum = 0;
    let zSum = 0;
    chars.forEach((c, i) => {
      const v = c[factor];
      if (v === undefined || !Number.isFinite(v) || !(std > 0)) return;
      wSum += weights[i];
      zSum += weights[i] * clip((v - mean) / std);
    });
    return { factor, exposure: wSum > 0 ? zSum / wSum : null, coverage: wSum };
  });
}

/** Mean and sample std of each characteristic across a universe (used by the reference build script). */
export function referenceStats(all: readonly Characteristics[]): FactorReference["stats"] {
  const stats = {} as FactorReference["stats"];
  for (const f of FACTORS) {
    const xs = all.map((c) => c[f]).filter((v): v is number => v !== undefined && Number.isFinite(v));
    const mean = xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1);
    const std = xs.length > 1 ? Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1)) : 0;
    stats[f] = { mean, std, n: xs.length };
  }
  return stats;
}
