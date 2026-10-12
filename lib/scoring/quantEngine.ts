/* ═══════════════════════════════════════════════════════════════
   R.H.T.I.H — Deterministic Quant Scoring Engine
   All analytics are computed here. AI only interprets the output.
═══════════════════════════════════════════════════════════════ */

import type { TechnicalIndicators, FundamentalData } from "@/lib/types";

export type ScoredVerdict = "STRONG BUY" | "BUY" | "HOLD" | "SELL" | "STRONG SELL";

export interface QuantScore {
  technical:   number; // 0-100
  momentum:    number; // 0-100
  fundamental: number; // 0-100
  volatility:  number; // 0-100 (higher = lower volatility = better)
  risk:        number; // 0-100 (higher = lower risk = better)
  composite:   number; // 0-100
  verdict:     ScoredVerdict;
  /** 0-100 agreement of the rule signals. NOT a probability - see computeSignalStrength. */
  signalStrength: number;
  signals: {
    bullish: string[];
    bearish: string[];
    neutral: string[];
  };
}

/**
 * SignalStrength: how one-sided the rule-based signals are, 0-100.
 *   0   = no signals fired, or bullish and bearish signals are perfectly balanced
 *   100 = every signal that fired points the same way
 *
 * It measures agreement between hand-written indicator rules. It is deliberately NOT called
 * "confidence": it has never been calibrated against outcomes and says nothing about the
 * probability that a trade makes money. A real probability needs a validated model
 * (see docs/QUANT_ENGINE.md); until one exists the UI reports probability as unavailable.
 */
export function computeSignalStrength(bullishCount: number, bearishCount: number): number {
  const total = bullishCount + bearishCount;
  if (total <= 0) return 0;
  return Math.round((Math.abs(bullishCount - bearishCount) / total) * 100);
}

/* ── clamp helper ──────────────────────────────────────────── */
function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v));
}

/* ── Technical Score (0–100) ────────────────────────────────
   RSI, MACD, EMA alignment, Bollinger, ADX, Stochastic        */
function scoreTechnical(t: TechnicalIndicators, price: number): { score: number; bullish: string[]; bearish: string[] } {
  let score = 50;
  const bullish: string[] = [];
  const bearish: string[] = [];

  // RSI (14) — 0-30 oversold=buy, 70-100 overbought=sell
  if (t.rsi_14 < 30) { score += 12; bullish.push(`RSI oversold (${t.rsi_14.toFixed(1)})`); }
  else if (t.rsi_14 < 45) { score += 6; bullish.push(`RSI mildly oversold (${t.rsi_14.toFixed(1)})`); }
  else if (t.rsi_14 > 70) { score -= 12; bearish.push(`RSI overbought (${t.rsi_14.toFixed(1)})`); }
  else if (t.rsi_14 > 55) { score -= 4; }
  else { score += 2; } // neutral zone 45-55 = slight positive

  // MACD histogram direction
  if (t.macd_histogram > 0 && t.macd > t.macd_signal) { score += 10; bullish.push("MACD bullish crossover"); }
  else if (t.macd_histogram < 0 && t.macd < t.macd_signal) { score -= 10; bearish.push("MACD bearish crossover"); }
  else if (t.macd_histogram > 0) { score += 5; bullish.push("MACD histogram positive"); }
  else { score -= 5; bearish.push("MACD histogram negative"); }

  // EMA alignment: price vs 20/50/200
  const aboveEma20  = price > t.ema_20;
  const aboveEma50  = price > t.ema_50;
  const aboveEma200 = price > t.ema_200;
  const ema20Above50  = t.ema_20 > t.ema_50;
  const ema50Above200 = t.ema_50 > t.ema_200;

  if (aboveEma20 && aboveEma50 && aboveEma200 && ema20Above50 && ema50Above200) {
    score += 15; bullish.push("Price above all EMAs (20/50/200)");
  } else if (aboveEma200) {
    score += 6; bullish.push("Price above EMA-200 (long-term uptrend)");
  } else if (!aboveEma200 && !aboveEma50) {
    score -= 10; bearish.push("Price below EMA-50 and EMA-200");
  } else if (!aboveEma200) {
    score -= 6; bearish.push("Price below EMA-200 (caution)");
  }

  // Bollinger position
  const bbRange = t.bb_upper - t.bb_lower;
  if (bbRange > 0) {
    const bbPct = (price - t.bb_lower) / bbRange; // 0=lower band, 1=upper
    if (bbPct < 0.2) { score += 8; bullish.push("Near Bollinger lower band (buy zone)"); }
    else if (bbPct > 0.85) { score -= 6; bearish.push("Near Bollinger upper band (stretched)"); }
  }

  // ADX — trend strength (not direction)
  if (t.adx > 25) { score += 5; } // strong trend, amplify direction
  else if (t.adx < 15) { score -= 3; } // weak/no trend

  // Stochastic
  if (t.stoch_k < 20 && t.stoch_d < 20) { score += 8; bullish.push(`Stochastic oversold (K:${t.stoch_k.toFixed(0)})`); }
  else if (t.stoch_k > 80 && t.stoch_d > 80) { score -= 8; bearish.push(`Stochastic overbought (K:${t.stoch_k.toFixed(0)})`); }

  return { score: clamp(score), bullish, bearish };
}

/* ── Momentum Score (0–100) ─────────────────────────────────
   Trend, position in 52W range, EMA momentum                  */
function scoreMomentum(t: TechnicalIndicators, price: number, hi52: number, lo52: number): { score: number; bullish: string[]; bearish: string[] } {
  let score = 50;
  const bullish: string[] = [];
  const bearish: string[] = [];

  // Trend classification
  if (t.trend === "UPTREND" && t.trend_strength === "STRONG") { score += 20; bullish.push("Strong uptrend confirmed"); }
  else if (t.trend === "UPTREND") { score += 12; bullish.push("Uptrend in place"); }
  else if (t.trend === "DOWNTREND" && t.trend_strength === "STRONG") { score -= 20; bearish.push("Strong downtrend"); }
  else if (t.trend === "DOWNTREND") { score -= 12; bearish.push("Downtrend in place"); }
  else { score += 0; } // SIDEWAYS = neutral

  // 52-week range position
  if (hi52 > lo52) {
    const rangePct = (price - lo52) / (hi52 - lo52); // 0=52W low, 1=52W high
    if (rangePct > 0.8) { score += 8; bullish.push("Trading near 52-week high"); }
    else if (rangePct > 0.6) { score += 4; }
    else if (rangePct < 0.2) { score -= 10; bearish.push("Near 52-week low (possible value or breakdown)"); }
    else if (rangePct < 0.35) { score -= 4; }
  }

  // Price vs VWAP
  if (price > t.vwap) { score += 5; bullish.push("Price above VWAP"); }
  else { score -= 5; bearish.push("Price below VWAP"); }

  // OBV direction — approximate from sign only
  if (t.obv > 0) { score += 3; } // positive OBV = accumulation
  else if (t.obv < 0) { score -= 3; }

  return { score: clamp(score), bullish, bearish };
}

/* ── Fundamental Score (0–100) ──────────────────────────────
   Valuation, profitability, growth, financial health           */
function scoreFundamental(f: FundamentalData): { score: number; bullish: string[]; bearish: string[] } {
  let score = 50;
  const bullish: string[] = [];
  const bearish: string[] = [];

  // PE ratio (Indian Large/Mid cap context)
  if (f.pe_ratio !== null) {
    if (f.pe_ratio > 0 && f.pe_ratio < 15)       { score += 12; bullish.push(`Attractive P/E: ${f.pe_ratio.toFixed(1)}x`); }
    else if (f.pe_ratio < 25)                     { score += 6; }
    else if (f.pe_ratio > 60)                     { score -= 10; bearish.push(`Expensive P/E: ${f.pe_ratio.toFixed(1)}x`); }
    else if (f.pe_ratio > 40)                     { score -= 4; }
    else if (f.pe_ratio < 0)                      { score -= 8; bearish.push("Negative earnings (P/E < 0)"); }
  }

  // ROE
  if (f.roe !== null) {
    if (f.roe >= 20)  { score += 10; bullish.push(`High ROE: ${f.roe.toFixed(1)}%`); }
    else if (f.roe >= 12) { score += 5; }
    else if (f.roe < 5)   { score -= 8; bearish.push(`Low ROE: ${f.roe.toFixed(1)}%`); }
  }

  // Revenue growth
  if (f.revenue_growth_yoy !== null) {
    if (f.revenue_growth_yoy >= 15) { score += 8; bullish.push(`Strong revenue growth: ${f.revenue_growth_yoy.toFixed(1)}%`); }
    else if (f.revenue_growth_yoy >= 8) { score += 4; }
    else if (f.revenue_growth_yoy < 0) { score -= 10; bearish.push(`Negative revenue growth: ${f.revenue_growth_yoy.toFixed(1)}%`); }
    else if (f.revenue_growth_yoy < 4) { score -= 4; }
  }

  // Net margin
  if (f.net_margin !== null) {
    if (f.net_margin >= 20)     { score += 8; bullish.push(`High net margin: ${f.net_margin.toFixed(1)}%`); }
    else if (f.net_margin >= 10) { score += 4; }
    else if (f.net_margin < 0)   { score -= 10; bearish.push("Negative net margins"); }
    else if (f.net_margin < 3)   { score -= 4; }
  }

  // Debt/Equity
  if (f.debt_to_equity !== null) {
    if (f.debt_to_equity < 0.3)  { score += 6; bullish.push("Low debt (D/E < 0.3)"); }
    else if (f.debt_to_equity < 0.8) { score += 2; }
    else if (f.debt_to_equity > 2.0) { score -= 10; bearish.push(`High leverage: D/E ${f.debt_to_equity.toFixed(1)}`); }
    else if (f.debt_to_equity > 1.2) { score -= 5; }
  }

  // P/B ratio
  if (f.pb_ratio !== null && f.pb_ratio > 0) {
    if (f.pb_ratio < 1.5)  { score += 6; bullish.push(`Low P/B: ${f.pb_ratio.toFixed(1)}x`); }
    else if (f.pb_ratio > 8) { score -= 6; bearish.push(`Rich P/B: ${f.pb_ratio.toFixed(1)}x`); }
  }

  // Free cash flow
  if (f.free_cash_flow !== null) {
    if (f.free_cash_flow > 0) { score += 5; bullish.push("Positive free cash flow"); }
    else if (f.free_cash_flow < 0) { score -= 5; bearish.push("Negative free cash flow"); }
  }

  return { score: clamp(score), bullish, bearish };
}

/* ── Volatility Score (0–100, higher = calmer) ──────────────
   ATR relative to price, distance from 52W extremes           */
function scoreVolatility(t: TechnicalIndicators, price: number, hi52: number, lo52: number): number {
  // ATR as % of price — lower is calmer
  const atrPct = price > 0 ? (t.atr_14 / price) * 100 : 5;
  let score = 50;
  if (atrPct < 1)      score = 85;
  else if (atrPct < 2) score = 70;
  else if (atrPct < 3) score = 55;
  else if (atrPct < 5) score = 40;
  else                  score = 25;

  // Bollinger width as % of price — narrower = calmer
  const bbWidth = price > 0 ? ((t.bb_upper - t.bb_lower) / price) * 100 : 10;
  if (bbWidth < 3) score = Math.min(score + 10, 100);
  else if (bbWidth > 10) score = Math.max(score - 10, 0);

  return clamp(score);
}

/* ── Risk Score (0–100, higher = lower risk) ────────────────
   Financial health composite                                   */
function scoreRisk(f: FundamentalData): number {
  let score = 60;

  if (f.current_ratio !== null) {
    if (f.current_ratio > 2)   score += 8;
    else if (f.current_ratio > 1.5) score += 4;
    else if (f.current_ratio < 1)   score -= 12;
  }

  if (f.debt_to_equity !== null) {
    if (f.debt_to_equity < 0.3)  score += 10;
    else if (f.debt_to_equity < 0.8) score += 4;
    else if (f.debt_to_equity > 2)   score -= 12;
    else if (f.debt_to_equity > 1.2) score -= 6;
  }

  if (f.promoter_holding !== null) {
    if (f.promoter_holding > 50) score += 6;
    else if (f.promoter_holding < 25) score -= 6;
  }

  if (f.pledged_shares !== null) {
    if (f.pledged_shares > 20) score -= 8;
    else if (f.pledged_shares > 10) score -= 4;
  }

  if (f.free_cash_flow !== null && f.free_cash_flow > 0) score += 5;

  return clamp(score);
}

/* ── Verdict from composite score ───────────────────────────── */
function verdictFromScore(score: number): ScoredVerdict {
  if (score >= 72) return "STRONG BUY";
  if (score >= 60) return "BUY";
  if (score >= 43) return "HOLD";
  if (score >= 30) return "SELL";
  return "STRONG SELL";
}

/* ── Main scoring function ─────────────────────────────────── */
export function computeQuantScore(
  technical: TechnicalIndicators,
  fundamental: FundamentalData,
  price: number,
  hi52: number,
  lo52: number,
): QuantScore {
  const bullish: string[] = [];
  const bearish: string[] = [];
  const neutral: string[] = [];

  const tech = scoreTechnical(technical, price);
  const mom  = scoreMomentum(technical, price, hi52, lo52);
  const fund = scoreFundamental(fundamental);
  const vol  = scoreVolatility(technical, price, hi52, lo52);
  const risk = scoreRisk(fundamental);

  bullish.push(...tech.bullish, ...mom.bullish, ...fund.bullish);
  bearish.push(...tech.bearish, ...mom.bearish, ...fund.bearish);

  if (technical.trend === "SIDEWAYS") neutral.push("Sideways trend — wait for breakout");
  if (bullish.length === 0 && bearish.length === 0) neutral.push("Mixed signals — no strong conviction");

  // Weighted composite
  const composite = clamp(
    tech.score  * 0.30 +
    mom.score   * 0.25 +
    fund.score  * 0.25 +
    vol         * 0.10 +
    risk        * 0.10
  );

  const signalStrength = computeSignalStrength(bullish.length, bearish.length);

  return {
    technical:   Math.round(tech.score),
    momentum:    Math.round(mom.score),
    fundamental: Math.round(fund.score),
    volatility:  Math.round(vol),
    risk:        Math.round(risk),
    composite:   Math.round(composite),
    verdict:     verdictFromScore(composite),
    signalStrength,
    signals:     { bullish, bearish, neutral },
  };
}

/* ── Compressed summary for AI prompt (~200 tokens) ─────────── */
export function buildQuantSummary(score: QuantScore, price: number, ticker: string): string {
  return [
    `QUANT SCORES for ${ticker} @ ₹${price.toFixed(2)}:`,
    `Technical=${score.technical}/100 | Momentum=${score.momentum}/100 | Fundamental=${score.fundamental}/100`,
    `Volatility=${score.volatility}/100 | Risk=${score.risk}/100 | COMPOSITE=${score.composite}/100`,
    `QUANT VERDICT: ${score.verdict} (signal strength ${score.signalStrength}/100 = agreement between rule signals; not a probability)`,
    `BULLISH SIGNALS (${score.signals.bullish.length}): ${score.signals.bullish.slice(0, 5).join("; ") || "none"}`,
    `BEARISH SIGNALS (${score.signals.bearish.length}): ${score.signals.bearish.slice(0, 5).join("; ") || "none"}`,
    score.signals.neutral.length > 0 ? `NEUTRAL: ${score.signals.neutral.join("; ")}` : "",
  ].filter(Boolean).join("\n");
}
