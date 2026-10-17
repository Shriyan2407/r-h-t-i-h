/**
 * Agent 2 — Quantitative Analyst.
 *
 * Reads price action through fixed, published rules (trend, momentum, MACD, 52-week position, RSI extremes) and
 * the registered volatility model. Four things are reported separately and never merged:
 *   signal                the rule score and the view it maps to
 *   probability           a calibrated direction probability — unavailable: no direction model passed validation
 *   confidence            share of required inputs that were present and fresh
 *   historical reliability  the volatility model's walk-forward validation, and a descriptive in-sample study of
 *                         the trend rule (labelled as such)
 */
import { DIRECTION_UNAVAILABLE_REASON } from "@/lib/ai/evidence";
import { buildRiskForecast } from "@/lib/ml/riskForecast";
import { coverageConfidence, noDataOutput, type AgentOutput, type InvestmentAgent } from "./agent";
import { betaAndCorrelation, technicalSnapshot, trendRuleStudy, type TechnicalSnapshot } from "./analytics";
import type { ResearchContext } from "./context";
import { STALE_MARKET_DAYS, ageDays, fmtNum, fmtPct, type EvidenceLog } from "./evidence";
import type { Claim, View } from "./schema";

export interface QuantSignal {
  name: string;
  reading: string;
  score: number;
  evidenceId: string;
}

export interface QuantDetails {
  subject: "asset" | "portfolio";
  trend: TechnicalSnapshot["trend"] | null;
  ruleScore: number;
  signals: QuantSignal[];
  probability: { available: false; reason: string };
  volatilityForecast: { available: true; dailyVol: number; low80: number; high80: number; percentileVsOwnYear: number | null; model: string } | { available: false; reason: string };
  historicalReliability: {
    volatilityModel: { interval80Coverage: number; r2VsNaive: number; foldsBeatingPersist: number; folds: number; holdoutPristine: boolean } | null;
    trendRule: ReturnType<typeof trendRuleStudy>;
    directionalAccuracy: { available: false; reason: string };
  };
  breadth?: { tickers: number; uptrend: number; downtrend: number; medianRet6m: number | null; perTicker: Array<{ ticker: string; trend: string; ret6m: number | null }> };
}

/** Rule thresholds, published in docs/AGENTS.md. */
export const QUANT_RULES = {
  momentum6m: 0.1,
  momentum12m1m: 0.15,
  nearHigh: -0.05,
  farFromHigh: -0.3,
  overbought: 75,
  oversold: 25,
};

export function viewFromScore(score: number): View {
  if (score >= 2.5) return "bullish";
  if (score >= 1) return "lean_bullish";
  if (score <= -2.5) return "bearish";
  if (score <= -1) return "lean_bearish";
  return "neutral";
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

export type RuleName = "trend" | "momentum_6m" | "momentum_12_1" | "macd" | "range_52w" | "rsi";

/**
 * The six published rules as pure points, null where the snapshot lacks the input. Used by the agent and, unchanged,
 * by the historical evaluation (ml/evaluate-quant-agent.ts), so what is evaluated is exactly what runs.
 */
export function ruleScores(s: TechnicalSnapshot): Record<RuleName, number | null> {
  return {
    trend: s.priceVsSma200 === null ? null : s.trend === "uptrend" ? 1 : s.trend === "downtrend" ? -1 : 0,
    momentum_6m: s.ret6m === null ? null : s.ret6m > QUANT_RULES.momentum6m ? 1 : s.ret6m < -QUANT_RULES.momentum6m ? -1 : 0,
    momentum_12_1: s.ret12m1m === null ? null : s.ret12m1m > QUANT_RULES.momentum12m1m ? 1 : s.ret12m1m < -QUANT_RULES.momentum12m1m ? -1 : 0,
    macd: s.macdHist === null ? null : s.macdHist > 0 ? 0.5 : s.macdHist < 0 ? -0.5 : 0,
    range_52w: s.fromHigh52 === null ? null : s.fromHigh52 > QUANT_RULES.nearHigh ? 0.5 : s.fromHigh52 < QUANT_RULES.farFromHigh ? -0.5 : 0,
    rsi: s.rsi14 === null ? null : s.rsi14 > QUANT_RULES.overbought ? -0.5 : 0,
  };
}

/** Sum of the available rule points. */
export function ruleScore(s: TechnicalSnapshot): number {
  return Object.values(ruleScores(s)).reduce<number>((a, x) => a + (x ?? 0), 0);
}

function scoreSignals(s: TechnicalSnapshot, ev: EvidenceLog, src: string): QuantSignal[] {
  const out: QuantSignal[] = [];
  const sc = ruleScores(s);
  const add = (name: string, label: string, value: number, display: string, score: number, reading: string) =>
    out.push({ name, reading, score, evidenceId: ev.add({ kind: "derived_indicator", label, value, display, source: src, asOf: s.asOf }) });

  if (s.priceVsSma200 !== null) {
    const score = sc.trend!;
    add("trend", "Price vs 200-day average", s.priceVsSma200, fmtPct(s.priceVsSma200, 1, true), score,
      s.trend === "uptrend" ? "above a rising 200-day average" : s.trend === "downtrend" ? "below a falling 200-day average" : "trend signals disagree");
  }
  if (s.ret6m !== null) {
    const score = sc.momentum_6m!;
    add("momentum_6m", "6-month return", s.ret6m, fmtPct(s.ret6m, 1, true), score, score > 0 ? "strong 6-month momentum" : score < 0 ? "weak 6-month momentum" : "flat 6-month momentum");
  }
  if (s.ret12m1m !== null) {
    const score = sc.momentum_12_1!;
    add("momentum_12_1", "12-month return excluding last month", s.ret12m1m, fmtPct(s.ret12m1m, 1, true), score, score > 0 ? "positive 12-1 momentum" : score < 0 ? "negative 12-1 momentum" : "neutral 12-1 momentum");
  }
  if (s.macdHist !== null) {
    const score = sc.macd!;
    add("macd", "MACD histogram (12,26,9)", s.macdHist, fmtNum(s.macdHist), score, s.macdHist > 0 ? "MACD above its signal line" : "MACD below its signal line");
  }
  if (s.fromHigh52 !== null) {
    const score = sc.range_52w!;
    add("range_52w", "Distance from 52-week high", s.fromHigh52, fmtPct(s.fromHigh52, 1, true), score, score > 0 ? "near its 52-week high" : score < 0 ? "far below its 52-week high" : "mid-range");
  }
  if (s.rsi14 !== null) {
    const score = sc.rsi!;
    add("rsi", "RSI (14)", s.rsi14, fmtNum(s.rsi14, 1), score,
      s.rsi14 > QUANT_RULES.overbought ? "overbought; short-term pullback risk" : s.rsi14 < QUANT_RULES.oversold ? "oversold" : "neither overbought nor oversold");
  }
  return out;
}

async function analyzeAsset(ctx: ResearchContext, ticker: string, ev: EvidenceLog): Promise<AgentOutput<QuantDetails | null>> {
  const [stock, index, vix] = await Promise.all([ctx.stock(ticker), ctx.index(), ctx.vix()]);
  if (!stock.value) return noDataOutput(`No price history was available for ${ticker}.`, [`${ticker} daily price history (${stock.status})`]);
  const bars = stock.value.bars;
  const snap = technicalSnapshot(bars);
  if (!snap) return noDataOutput(`Only ${bars.length} trading days of history for ${ticker}; too few for quantitative analysis.`, ["at least 30 trading days of price history"]);

  const src = `Computed from ${stock.source}`;
  const missing: string[] = [];
  const closeId = ev.add({ kind: "market_data", label: "Last close", value: snap.close, display: `₹${snap.close.toFixed(2)}`, source: stock.source, asOf: snap.asOf });
  const signals = scoreSignals(snap, ev, src);
  if (snap.sma200 === null) missing.push("200 trading days of history (trend and 12-month momentum)");

  let bc: ReturnType<typeof betaAndCorrelation> = null;
  if (index.value) bc = betaAndCorrelation(bars, index.value);
  else missing.push(`NIFTY 50 history (${index.status}) for beta and correlation`);
  const betaIds = bc ? [
    ev.add({ kind: "derived_indicator", label: "Beta to NIFTY 50 (1 year)", value: bc.beta, display: fmtNum(bc.beta), source: src, asOf: snap.asOf }),
    ev.add({ kind: "derived_indicator", label: "Correlation to NIFTY 50 (1 year)", value: bc.correlation, display: fmtNum(bc.correlation), source: src, asOf: snap.asOf }),
  ] : [];

  const volIds: string[] = [];
  if (snap.vol20Annual !== null) volIds.push(ev.add({ kind: "derived_indicator", label: "Realised volatility (20 days, annualised)", value: snap.vol20Annual, display: fmtPct(snap.vol20Annual), source: src, asOf: snap.asOf }));
  if (snap.volumeRatio !== null) volIds.push(ev.add({ kind: "derived_indicator", label: "Volume, last 5 days vs prior 60", value: snap.volumeRatio, display: `${snap.volumeRatio.toFixed(2)}x`, source: src, asOf: snap.asOf }));

  let volatilityForecast: QuantDetails["volatilityForecast"] = { available: false, reason: "India VIX or NIFTY 50 history unavailable" };
  let volatilityModel: QuantDetails["historicalReliability"]["volatilityModel"] = null;
  let forecastIds: string[] = [];
  if (index.value && vix.value) {
    const f = buildRiskForecast({ ticker, symbol: stock.value.symbol, stock: bars, index: index.value, vix: vix.value }, ctx.now);
    if (f.available) {
      const c = f.contract;
      const model = `${c.model.id}@${c.model.version}`;
      volatilityForecast = { available: true, dailyVol: c.volatility.dailyVol, low80: c.volatility.dailyVolLow, high80: c.volatility.dailyVolHigh, percentileVsOwnYear: c.volatility.percentileVsOwnYear, model };
      volatilityModel = { interval80Coverage: c.model.holdout.interval80Coverage, r2VsNaive: c.model.validation.r2VsNaive, foldsBeatingPersist: c.model.validation.foldsBeatingPersist, folds: c.model.validation.folds, holdoutPristine: c.model.holdout.pristine };
      forecastIds = [
        ev.add({ kind: "ml_model", label: "Forecast daily volatility, next 5 days", value: c.volatility.dailyVol, display: fmtPct(c.volatility.dailyVol, 2), source: model, asOf: c.asOf }),
        ev.add({ kind: "model_validation", label: "Holdout share of days inside the 80% range", value: c.model.holdout.interval80Coverage, display: fmtPct(c.model.holdout.interval80Coverage), source: `${model} registry`, asOf: c.model.trainedAt }),
      ];
    } else {
      volatilityForecast = { available: false, reason: f.detail };
      missing.push(`volatility forecast (${f.reason})`);
    }
  } else missing.push(`India VIX / NIFTY 50 history (${vix.status}/${index.status}) for the volatility forecast`);

  const study = trendRuleStudy(bars);
  const studyId = study && study.upRateAbove !== null
    ? ev.add({ kind: "statistical_model", label: "Share of 20-day windows that rose when above the 200-day average (in-sample, this stock)", value: study.upRateAbove, display: fmtPct(study.upRateAbove, 0), source: src, asOf: snap.asOf })
    : null;

  const ruleScore = signals.reduce((a, s) => a + s.score, 0);
  const view = viewFromScore(ruleScore);
  const age = ageDays(snap.asOf, ctx.now) ?? 0;
  const stale = age > STALE_MARKET_DAYS;
  if (stale) missing.push(`fresh prices (latest bar is ${age} days old)`);
  const confidence = Math.round(coverageConfidence(1 + (snap.sma200 !== null ? 1 : 0) + (bc ? 1 : 0) + (volatilityForecast.available ? 1 : 0), 4) * (stale ? 0.5 : 1) * 100) / 100;

  const claims: Claim[] = signals.filter((s) => s.score !== 0 || s.name === "trend").map((s) => ({
    text: `${ticker} is ${s.reading} [${s.evidenceId}].`, evidenceIds: [s.evidenceId], direction: s.score > 0 ? "positive" : s.score < 0 ? "negative" : "neutral",
  }));
  if (forecastIds.length) claims.push({ text: `The validated volatility model expects daily moves of about ${fmtPct((volatilityForecast as { dailyVol: number }).dailyVol, 2)} [${forecastIds[0]}]; it does not forecast direction.`, evidenceIds: forecastIds.slice(0, 1), direction: "neutral" });
  if (bc) claims.push({ text: `Beta to the NIFTY 50 is ${fmtNum(bc.beta)} [${betaIds[0]}].`, evidenceIds: [betaIds[0]], direction: "neutral" });

  const risks: string[] = [];
  if (volatilityForecast.available && (volatilityForecast.percentileVsOwnYear ?? 0) >= 80) risks.push("Forecast volatility is in the top fifth of this stock's past year.");
  if (snap.rsi14 !== null && snap.rsi14 > QUANT_RULES.overbought) risks.push("RSI is overbought; short-term pullbacks are common from here.");
  if (snap.trend === "downtrend") risks.push("Price is in a downtrend below its 200-day average.");
  const catalysts = snap.volumeRatio !== null && snap.volumeRatio >= 1.8 ? [`Unusual volume: ${snap.volumeRatio.toFixed(2)}x the prior 60-day average.`] : [];

  return {
    status: missing.length ? "partial" : "success",
    conclusion: `Rule score ${ruleScore.toFixed(1)} → ${view.replace("_", " ")}. Trend: ${snap.trend}. No validated model forecasts direction, so there is no up/down probability.`,
    view,
    confidence,
    claims,
    metrics: {
      close: snap.close, trend: snap.trend, ruleScore, rsi14: snap.rsi14, adx14: snap.adx14, ret3m: snap.ret3m, ret6m: snap.ret6m, ret12m1m: snap.ret12m1m,
      realisedVol20: snap.vol20Annual, beta: bc?.beta ?? null, correlation: bc?.correlation ?? null,
      forecastDailyVol: volatilityForecast.available ? volatilityForecast.dailyVol : null, predictionProbability: null,
    },
    risks,
    catalysts,
    disagreements: [],
    missingData: missing,
    reasoningSummary: `Scored ${signals.length} published rules on ${bars.length} daily bars ending ${snap.asOf} [${closeId}]. ` +
      (studyId ? `Descriptive only: in this stock's history, ${fmtPct(study!.upRateAbove!, 0)} of 20-day windows rose when price was above its 200-day average vs ${fmtPct(study!.baseRate, 0)} overall.` : ""),
    details: {
      subject: "asset",
      trend: snap.trend,
      ruleScore,
      signals,
      probability: { available: false, reason: DIRECTION_UNAVAILABLE_REASON },
      volatilityForecast,
      historicalReliability: {
        volatilityModel,
        trendRule: study,
        directionalAccuracy: { available: false, reason: "The rule score has not been validated out of sample, so no accuracy figure is claimed for it." },
      },
    },
  };
}

async function analyzeBasket(ctx: ResearchContext, tickers: string[], ev: EvidenceLog): Promise<AgentOutput<QuantDetails | null>> {
  const list = tickers.slice(0, 20);
  const rows = await Promise.all(list.map(async (t) => ({ t, d: await ctx.stock(t) })));
  const per: NonNullable<QuantDetails["breadth"]>["perTicker"] = [];
  const claims: Claim[] = [];
  const missing: string[] = [];
  for (const { t, d } of rows) {
    const s = d.value ? technicalSnapshot(d.value.bars) : null;
    if (!s) { missing.push(`${t} price history (${d.status})`); continue; }
    per.push({ ticker: t, trend: s.trend, ret6m: s.ret6m });
    if (s.ret6m !== null) {
      const id = ev.add({ kind: "derived_indicator", label: `${t} 6-month return`, value: s.ret6m, display: fmtPct(s.ret6m, 1, true), source: `Computed from ${d.source}`, asOf: s.asOf });
      claims.push({ text: `${t} is in a ${s.trend} with a 6-month return of ${fmtPct(s.ret6m, 1, true)} [${id}].`, evidenceIds: [id], direction: s.trend === "uptrend" ? "positive" : s.trend === "downtrend" ? "negative" : "neutral" });
    }
  }
  if (per.length === 0) return noDataOutput("No price history was available for any holding.", missing);
  const up = per.filter((p) => p.trend === "uptrend").length;
  const down = per.filter((p) => p.trend === "downtrend").length;
  const med = median(per.map((p) => p.ret6m).filter((x): x is number => x !== null));
  const breadthScore = (up - down) / per.length;
  const ruleScore = breadthScore * 2 + (med === null ? 0 : med > 0.05 ? 0.5 : med < -0.05 ? -0.5 : 0);
  const view = viewFromScore(ruleScore);
  if (tickers.length > list.length) missing.push(`trend data for ${tickers.length - list.length} further holdings (only the first ${list.length} are scored)`);
  return {
    status: missing.length ? "partial" : "success",
    conclusion: `${up} of ${per.length} holdings are in uptrends and ${down} in downtrends${med !== null ? `; median 6-month return ${fmtPct(med, 1, true)}` : ""}.`,
    view,
    confidence: coverageConfidence(per.length, list.length),
    claims,
    metrics: { holdingsScored: per.length, uptrend: up, downtrend: down, medianRet6m: med, ruleScore, predictionProbability: null },
    risks: down > per.length / 2 ? ["More than half of the holdings are in downtrends."] : [],
    catalysts: [],
    disagreements: [],
    missingData: missing,
    reasoningSummary: "Breadth of 200-day trends and median 6-month momentum across the holdings.",
    details: {
      subject: "portfolio",
      trend: null,
      ruleScore,
      signals: [],
      probability: { available: false, reason: DIRECTION_UNAVAILABLE_REASON },
      volatilityForecast: { available: false, reason: "Portfolio-level volatility is forecast by the risk agent." },
      historicalReliability: { volatilityModel: null, trendRule: null, directionalAccuracy: { available: false, reason: "Breadth rules are not validated out of sample." } },
      breadth: { tickers: per.length, uptrend: up, downtrend: down, medianRet6m: med, perTicker: per },
    },
  };
}

export const quantAgent: InvestmentAgent<QuantDetails | null> = {
  id: "quant",
  async analyze(ctx, _prior, ev) {
    const subject = await ctx.subject();
    if (subject.kind === "asset") return analyzeAsset(ctx, subject.ticker, ev);
    if (subject.kind === "portfolio") {
      if (subject.tickers.length === 0) return noDataOutput("There are no holdings to analyse.", ["saved portfolio holdings"]);
      return analyzeBasket(ctx, subject.tickers, ev);
    }
    return noDataOutput("The question names no stock or portfolio.", ["a stock or portfolio to analyse"]);
  },
};
