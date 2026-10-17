/**
 * Structured evidence contract. Every number a user sees about a forecast is an `Evidence` item with a
 * source and timestamp. Explanations (template or LLM) may only reference these items; see numericGuard.ts.
 *
 * Layers are kept explicit so nothing is mislabelled as "AI":
 *   market_data        raw prices/levels from the data provider
 *   derived_indicator  deterministic formulas on market data (not AI)
 *   statistical_model  rule-based / statistical classification (e.g. regime cut-offs)
 *   ml_model           output of a trained, validated, registered model
 *   model_validation   measured out-of-sample performance of that model
 */
export type EvidenceKind = "market_data" | "derived_indicator" | "statistical_model" | "ml_model" | "model_validation";

export interface Evidence {
  id: string;
  kind: EvidenceKind;
  label: string;
  value: number | string;
  /** Exactly how the value is shown to users (and the only form an explanation may quote). */
  display: string;
  source: string;
  asOf: string | null;
}

export interface FactorSummary {
  group: string;
  /** Contribution to log-volatility vs the training average. Positive = raises the forecast. */
  value: number;
}

export interface RiskContract {
  schema: "risk-forecast/1";
  ticker: string;
  symbol: string;
  asOf: string;
  dataAgeDays: number;
  stale: boolean;
  direction: { available: false; reason: string };
  volatility: {
    horizonDays: number;
    dailyVol: number;
    dailyVolLow: number;
    dailyVolHigh: number;
    annualizedVol: number;
    fiveDayMove: number;
    /** Where today's forecast sits among this stock's forecasts over the past year (0-100), or null. */
    percentileVsOwnYear: number | null;
  };
  regime: {
    name: string;
    trend: "UP" | "DOWN";
    vol: "LOW" | "NORMAL" | "HIGH";
    asOf: string;
    historicalFwd5dVol: number | null;
    historicalP5dDrawdownOver3pct: number | null;
  } | null;
  factors: { raising: FactorSummary[]; lowering: FactorSummary[] };
  evidence: Evidence[];
  model: {
    id: string;
    version: string;
    status: string;
    trainedAt: string;
    validation: { r2VsNaive: number; mseVsPersist: number; interval80Coverage: number; foldsBeatingPersist: number; folds: number };
    holdout: { r2VsNaive: number; mseVsPersist: number; interval80Coverage: number; pristine: boolean };
    limitations: string[];
  };
  disclaimers: string[];
}

export const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;

export const RISK_DISCLAIMERS = [
  "This forecasts how much the price may move, not which way. It is not a buy or sell signal.",
  "Forecasts are probabilistic and can be wrong, especially around unexpected news and in unprecedented market conditions.",
  "Past model performance does not guarantee future performance. Not investment advice.",
  "Prices come from Yahoo Finance and may be delayed or contain errors.",
];

export const DIRECTION_UNAVAILABLE_REASON =
  "No direction model passed validation: 6 candidates (logistic regression, random forest, gradient boosting; two targets) " +
  "scored ROC-AUC 0.50-0.51 out of sample with negative Brier skill, so no up/down probability is shown.";
