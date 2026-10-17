/**
 * Builds the risk-forecast contract for one ticker: adjusted market data -> point-in-time features ->
 * registered volatility model -> regime -> evidence. No LLM is involved in any number produced here.
 */
import type { Bar } from "@/lib/backtest/types";
import { DIRECTION_UNAVAILABLE_REASON, RISK_DISCLAIMERS, pct, type Evidence, type RiskContract } from "@/lib/ai/evidence";
import { FEATURE_NAMES, MIN_BARS, computeFeatureMatrix, isCompleteRow } from "./features";
import { classifyRegime } from "./regime";
import registry from "./registry.json";
import { VOL_ARTIFACT, groupContributions, predictVolatility } from "./volatility";

export interface MarketInputs {
  ticker: string;
  symbol: string;
  stock: readonly Bar[];
  index: readonly Bar[];
  vix: readonly Bar[];
}

export type RiskForecastResult =
  | { available: true; contract: RiskContract }
  | { available: false; reason: "INSUFFICIENT_HISTORY" | "INCOMPLETE_FEATURES"; detail: string };

/** Trading data older than this many calendar days is flagged stale (covers weekends + one holiday). */
export const STALE_AFTER_DAYS = 4;

const prodModel = () => {
  const m = registry.models.find((x) => x.status === "production" && x.id === VOL_ARTIFACT.id && x.version === VOL_ARTIFACT.version);
  if (!m) throw new Error(`artifact ${VOL_ARTIFACT.id}@${VOL_ARTIFACT.version} is not the registered production model`);
  return m as typeof m & {
    validation: { r2VsNaive: number; mseVsPersist: number; interval80Coverage: number; foldsBeatingPersist: number; folds: number };
    holdout: { r2VsNaive: number; mseVsPersist: number; interval80Coverage: number; pristine: boolean };
    limitations: string[];
  };
};

export function buildRiskForecast(inp: MarketInputs, now: Date = new Date()): RiskForecastResult {
  if (inp.stock.length < MIN_BARS) {
    return { available: false, reason: "INSUFFICIENT_HISTORY", detail: `${inp.stock.length} daily bars; ${MIN_BARS} needed` };
  }
  const { dates, rows } = computeFeatureMatrix(inp.stock, inp.index, inp.vix);
  const last = rows.length - 1;
  if (!isCompleteRow(rows[last])) {
    const missing = FEATURE_NAMES.filter((_, k) => Number.isNaN(rows[last][k]));
    return { available: false, reason: "INCOMPLETE_FEATURES", detail: `missing: ${missing.join(", ")}` };
  }

  const p = predictVolatility(rows[last]);
  // Context: today's forecast vs this stock's own forecasts over the previous ~year (same model, same features).
  const past: number[] = [];
  for (let i = Math.max(0, last - 252); i < last; i++) if (isCompleteRow(rows[i])) past.push(predictVolatility(rows[i]).dailyVol);
  const percentile = past.length >= 120 ? Math.round((100 * past.filter((v) => v < p.dailyVol).length) / past.length) : null;

  const asOf = dates[last];
  const ageDays = Math.floor((now.getTime() - Date.parse(asOf)) / 86_400_000);
  const regime = classifyRegime(inp.index, inp.vix);
  const groups = groupContributions(p.contributions);
  const model = prodModel();
  const f = (name: (typeof FEATURE_NAMES)[number]) => rows[last][FEATURE_NAMES.indexOf(name)];
  const src = `${model.id}@${model.version}`;

  const ev: Evidence[] = [
    { id: "E1", kind: "market_data", label: "Last close (adjusted)", value: inp.stock[last].close, display: inp.stock[last].close.toFixed(2), source: `Yahoo Finance ${inp.symbol}`, asOf },
    { id: "E2", kind: "derived_indicator", label: "Realised volatility, last 20 days (daily)", value: f("rv_20"), display: pct(f("rv_20")), source: "std of daily returns", asOf },
    { id: "E3", kind: "derived_indicator", label: "Average true range, 14 days (% of price)", value: f("atr_pct"), display: pct(f("atr_pct")), source: "Wilder ATR", asOf },
    { id: "E4", kind: "ml_model", label: "Forecast daily volatility, next 5 trading days", value: p.dailyVol, display: pct(p.dailyVol), source: src, asOf },
    { id: "E5", kind: "ml_model", label: "80% forecast range (daily volatility)", value: `${p.dailyVolLow}-${p.dailyVolHigh}`, display: `${pct(p.dailyVolLow)} to ${pct(p.dailyVolHigh)}`, source: src, asOf },
    { id: "E6", kind: "ml_model", label: "Typical 5-day move (1 standard deviation)", value: p.fiveDayMove, display: pct(p.fiveDayMove), source: src, asOf },
    { id: "E7", kind: "model_validation", label: "Out-of-sample error vs a persistence baseline (walk-forward)", value: model.validation.mseVsPersist, display: pct(model.validation.mseVsPersist), source: "lib/ml/registry.json", asOf: model.trainedAt },
    { id: "E8", kind: "market_data", label: "India VIX", value: f("vix_level"), display: f("vix_level").toFixed(2), source: "Yahoo Finance ^INDIAVIX", asOf },
    { id: "E9", kind: "derived_indicator", label: "Beta to NIFTY 50, 60 days", value: f("beta_60"), display: f("beta_60").toFixed(2), source: "rolling regression", asOf },
  ];
  if (percentile !== null) {
    ev.push({ id: "E10", kind: "ml_model", label: "Forecast percentile vs this stock's past year", value: percentile, display: `${percentile}th percentile`, source: src, asOf });
  }
  if (regime) {
    ev.push({ id: "E11", kind: "statistical_model", label: "Market regime", value: regime.name, display: regime.name, source: "NIFTY vs 200-day average + India VIX cut-offs", asOf: regime.asOf });
    if (regime.history) {
      ev.push({ id: "E12", kind: "statistical_model", label: "Historical chance of a >3% index drawdown within 5 days in this regime", value: regime.history.pFwd5dDrawdownOver3pct, display: `${pct(regime.history.pFwd5dDrawdownOver3pct)} of 5-day windows had a >3% index drawdown`, source: "lib/ml/regimes.json (2011-2026)", asOf: null });
    }
  }

  const contract: RiskContract = {
    schema: "risk-forecast/1",
    ticker: inp.ticker,
    symbol: inp.symbol,
    asOf,
    dataAgeDays: ageDays,
    stale: ageDays > STALE_AFTER_DAYS,
    direction: { available: false, reason: DIRECTION_UNAVAILABLE_REASON },
    volatility: {
      horizonDays: 5,
      dailyVol: p.dailyVol, dailyVolLow: p.dailyVolLow, dailyVolHigh: p.dailyVolHigh,
      annualizedVol: p.annualizedVol, fiveDayMove: p.fiveDayMove, percentileVsOwnYear: percentile,
    },
    regime: regime
      ? { name: regime.name, trend: regime.trend, vol: regime.vol, asOf: regime.asOf,
          historicalFwd5dVol: regime.history?.meanFwd5dVol ?? null, historicalP5dDrawdownOver3pct: regime.history?.pFwd5dDrawdownOver3pct ?? null }
      : null,
    factors: {
      raising: groups.filter((g) => g.value > 0).slice(0, 3),
      lowering: groups.filter((g) => g.value < 0).slice(0, 3),
    },
    evidence: ev,
    model: {
      id: model.id, version: model.version, status: model.status, trainedAt: model.trainedAt,
      validation: model.validation, holdout: model.holdout, limitations: model.limitations,
    },
    disclaimers: RISK_DISCLAIMERS,
  };
  return { available: true, contract };
}
