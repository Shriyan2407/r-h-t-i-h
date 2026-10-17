/**
 * Agent 5 — Risk & Portfolio Manager.
 *
 * Measures downside with the same engine as the portfolio page (lib/portfolio/risk): volatility, beta, maximum
 * drawdown, 1-day 95% VaR and CVaR, Sharpe and Sortino, liquidity, and stress tests that are either beta-scaled
 * (labelled hypothetical) or replays of real windows (COVID 2020, the 2022 rate-hike sell-off).
 *
 * It is the committee's brake: its view is never bullish, only neutral or bearish, and the CIO lets it cap the
 * decision. Position sizing is a published volatility-budget rule, not advice.
 */
import { STOCKS } from "@/lib/data/searchUniverse";
import type { Bar } from "@/lib/backtest/types";
import {
  alignSeries, analyzePortfolio, historicalCVaR, historicalReplay, marketShock, returns, sectorShock,
  volatilityShock, type HoldingInput, type PortfolioRiskReport, type StressResult,
} from "@/lib/portfolio/risk";
import { HISTORICAL_SCENARIOS, stressVolMultiplier } from "@/lib/portfolio/riskService";
import { coverageConfidence, noDataOutput, type AgentOutput, type InvestmentAgent } from "./agent";
import type { Holding, ResearchContext } from "./context";
import { fmtNum, fmtPct, type EvidenceLog } from "./evidence";
import type { Claim, Intent, View } from "./schema";

export type RiskLevel = "low" | "medium" | "high" | "extreme";

/** Annualised-volatility budget and single-position cap per risk profile. Unknown profiles use "moderate". */
export const SIZING_RULES: Record<Exclude<Intent["riskProfile"], "unknown">, { budget: number; cap: number }> = {
  conservative: { budget: 0.015, cap: 0.05 },
  moderate: { budget: 0.025, cap: 0.1 },
  aggressive: { budget: 0.04, cap: 0.15 },
};

/** Largest single-stock weight when building a basket from named candidates (raised to 1/n if n is small). */
export const CONSTRUCTION_CAP: Record<Exclude<Intent["riskProfile"], "unknown">, number> = { conservative: 0.25, moderate: 0.3, aggressive: 0.4 };

/** Below this average daily traded value (₹1 crore) a stock is treated as illiquid. */
export const ILLIQUID_ADV = 1e7;

export interface RiskDetails {
  subject: "asset" | "portfolio" | "construction";
  riskLevel: RiskLevel;
  levelReasons: string[];
  stressTests: Array<StressResult & { evidenceId?: string }>;
  recommendedPositionSize: { maxWeight: number; rule: string; profile: string } | null;
  portfolioImpact: string | null;
  riskReward: string;
  proposedWeights?: Array<{ ticker: string; weight: number; annualVol: number }>;
  correlation?: { tickers: string[]; matrix: number[][] };
}

const LEVELS: RiskLevel[] = ["low", "medium", "high", "extreme"];
const bump = (l: RiskLevel): RiskLevel => LEVELS[Math.min(3, LEVELS.indexOf(l) + 1)];

export function classifyRisk(m: { annualVol: number; maxDrawdown: number; cvar95: number; avgDailyValue: number | null }): { level: RiskLevel; reasons: string[] } {
  let level: RiskLevel = m.annualVol < 0.2 ? "low" : m.annualVol < 0.35 ? "medium" : m.annualVol < 0.55 ? "high" : "extreme";
  const reasons = [`annualised volatility ${fmtPct(m.annualVol)}`];
  if (m.maxDrawdown < -0.4) { level = bump(level); reasons.push(`a ${fmtPct(m.maxDrawdown)} drawdown in the past year`); }
  if (m.cvar95 > 0.06) { level = bump(level); reasons.push(`average loss on the worst 5% of days of ${fmtPct(m.cvar95)}`); }
  if (m.avgDailyValue !== null && m.avgDailyValue < ILLIQUID_ADV) { level = bump(level); reasons.push("thin trading (under ₹1 crore a day)"); }
  return { level, reasons };
}

export function riskView(level: RiskLevel): View {
  return level === "extreme" ? "bearish" : level === "high" ? "lean_bearish" : "neutral";
}

export function positionCap(annualVol: number, profile: Intent["riskProfile"]) {
  const key = profile === "unknown" ? "moderate" : profile;
  const r = SIZING_RULES[key];
  const maxWeight = Math.min(r.cap, annualVol > 0 ? r.budget / annualVol : r.cap);
  return {
    maxWeight,
    profile: profile === "unknown" ? "moderate (no risk profile stated)" : key,
    rule: `At most ${fmtPct(r.budget)} of portfolio value in annualised stand-alone volatility per position, capped at ${fmtPct(r.cap, 0)}: ${fmtPct(r.budget)} ÷ ${fmtPct(annualVol)} = ${fmtPct(r.budget / Math.max(annualVol, 1e-9))}${r.budget / Math.max(annualVol, 1e-9) > r.cap ? `, capped at ${fmtPct(r.cap, 0)}` : ""}. A risk-budget ceiling, not a recommendation to buy.`,
  };
}

/** Inverse-volatility weights with a per-stock cap, excess redistributed pro rata. Risk balancing, not return optimisation. */
export function inverseVolWeights(vols: readonly number[], cap: number): number[] {
  const n = vols.length;
  if (n === 0) return [];
  const effCap = Math.max(cap, 1 / n);
  const inv = vols.map((v) => (v > 0 ? 1 / v : 0));
  let w = inv.map((x) => x / inv.reduce((a, b) => a + b, 0));
  for (let iter = 0; iter < 50; iter++) {
    const over = w.map((x) => x > effCap + 1e-12);
    if (!over.some(Boolean)) break;
    const excess = w.reduce((a, x, i) => a + (over[i] ? x - effCap : 0), 0);
    const free = w.reduce((a, x, i) => a + (over[i] ? 0 : x), 0);
    w = w.map((x, i) => (over[i] ? effCap : free > 0 ? x + (excess * x) / free : x));
  }
  return w;
}

function portfolioReturns(report: PortfolioRiskReport, bars: readonly (readonly Bar[])[], index: readonly Bar[]): number[] {
  const a = alignSeries(bars, index);
  const rets = a.closes.map(returns);
  const w = report.holdings.map((h) => h.weight);
  return returns(a.index).map((_, t) => rets.reduce((s, r, k) => s + w[k] * r[t], 0));
}

function scenarioOrder(intent: Intent): string[] {
  if (intent.scenario === "recession" || intent.scenario === "market_crash") return ["covid_2020", "rates_2022"];
  if (intent.scenario === "rate_shock" || intent.scenario === "inflation") return ["rates_2022", "covid_2020"];
  return ["covid_2020", "rates_2022"];
}

function stressSuite(report: PortfolioRiskReport, holdings: HoldingInput[], bars: Bar[][], intent: Intent): StressResult[] {
  const weights = report.holdings.map((h) => h.weight);
  const replays = scenarioOrder(intent).map((id) => HISTORICAL_SCENARIOS.find((s) => s.id === id)!).map((s) => historicalReplay(s.id, s.label, s.from, s.to, holdings, weights, bars));
  const top = report.sectors[0]?.sector;
  return [
    ...replays,
    { ...marketShock(report, -0.1), label: "NIFTY 50 falls 10% (hypothetical, beta-scaled)" },
    { ...marketShock(report, -0.2), label: "NIFTY 50 falls 20% (hypothetical, beta-scaled)" },
    ...(holdings.length > 1 && top ? [{ ...sectorShock(report, top, -0.2), label: `${top} sector falls 20% (hypothetical)` }] : []),
    volatilityShock(report, stressVolMultiplier()),
  ];
}

function worst20d(bars: readonly Bar[]): { ret: number; from: string; to: string } | null {
  if (bars.length < 21) return null;
  let best = { ret: Infinity, from: "", to: "" };
  for (let i = 20; i < bars.length; i++) {
    const r = bars[i].close / bars[i - 20].close - 1;
    if (r < best.ret) best = { ret: r, from: bars[i - 20].date, to: bars[i].date };
  }
  return best;
}

interface Measured { report: PortfolioRiskReport; cvar95: number; stress: StressResult[] }

function measure(holdings: HoldingInput[], bars: Bar[][], index: Bar[], intent: Intent): Measured {
  const report = analyzePortfolio(holdings, bars, index);
  const cvar95 = historicalCVaR(portfolioReturns(report, bars, index), 0.95);
  return { report, cvar95, stress: stressSuite(report, holdings, bars, intent) };
}

function citeCore(m: Measured, ev: EvidenceLog, src: string, label: string) {
  const h = m.report.historical;
  const asOf = m.report.asOf;
  const id = (l: string, v: number, d: string) => ev.add({ kind: "derived_indicator", label: `${label}: ${l}`, value: v, display: d, source: src, asOf });
  return {
    vol: id("annualised volatility (1 year)", h.annualVol, fmtPct(h.annualVol)),
    dd: id("maximum drawdown (1 year)", h.maxDrawdown, fmtPct(h.maxDrawdown)),
    var: id("1-day 95% VaR", h.var95, fmtPct(h.var95, 2)),
    cvar: id("1-day 95% CVaR", m.cvar95, fmtPct(m.cvar95, 2)),
    beta: Number.isFinite(h.beta) ? id("beta to NIFTY 50", h.beta, fmtNum(h.beta)) : null,
    sharpe: h.sharpe !== null ? id("Sharpe ratio (1 year, risk-free 0)", h.sharpe, fmtNum(h.sharpe)) : null,
  };
}

function stressEvidence(stress: StressResult[], ev: EvidenceLog, asOf: string) {
  return stress.map((s) => s.portfolioReturn === null ? s : {
    ...s,
    evidenceId: ev.add({ kind: s.id.startsWith("market_") || s.id.startsWith("sector_") || s.id === "high_volatility" ? "agent_inference" : "market_data", label: `Stress: ${s.label}`, value: s.portfolioReturn, display: fmtPct(s.portfolioReturn, 1, true), source: s.method, asOf }),
  });
}

async function analyzeAsset(ctx: ResearchContext, ticker: string, ev: EvidenceLog): Promise<AgentOutput<RiskDetails | null>> {
  const [stock, index] = await Promise.all([ctx.stock(ticker), ctx.index()]);
  if (!stock.value || !index.value) return noDataOutput(`Price history for ${ticker} or the NIFTY 50 was unavailable.`, [`${ticker} history (${stock.status})`, `NIFTY 50 history (${index.status})`]);
  const sector = STOCKS[ticker]?.sector ?? "Other";
  let m: Measured;
  try { m = measure([{ ticker, quantity: 1, sector }], [stock.value.bars], index.value, ctx.intent); } catch (e) {
    return noDataOutput(`Too little overlapping history to measure ${ticker}'s risk: ${(e as Error).message}.`, ["at least 61 common trading days with the NIFTY 50"]);
  }
  const h = m.report.historical;
  const adv = m.report.holdings[0].avgDailyValue;
  const ids = citeCore(m, ev, `Computed from ${stock.source}`, ticker);
  const { level, reasons } = classifyRisk({ annualVol: h.annualVol, maxDrawdown: h.maxDrawdown, cvar95: m.cvar95, avgDailyValue: adv });
  const sizing = positionCap(h.annualVol, ctx.intent.riskProfile);
  const stress = stressEvidence(m.stress, ev, m.report.asOf);
  const w = worst20d(stock.value.bars);
  const worstId = w ? ev.add({ kind: "market_data", label: `${ticker} worst 20-day return in available history`, value: w.ret, display: fmtPct(w.ret, 1, true), source: stock.source, asOf: w.to }) : null;
  const missing: string[] = [];
  for (const s of stress) if (s.portfolioReturn === null) missing.push(`${s.label}: price history does not cover the window`);

  // Portfolio impact: only when the user has saved holdings.
  let impact: string | null = null;
  const held = await ctx.holdings();
  if (held.value?.length) impact = await holdingImpact(ctx, held.value, ticker, sector, sizing.maxWeight);

  const claims: Claim[] = [
    { text: `${ticker}'s annualised volatility over the past year is ${fmtPct(h.annualVol)} [${ids.vol}] with a maximum drawdown of ${fmtPct(h.maxDrawdown)} [${ids.dd}].`, evidenceIds: [ids.vol, ids.dd], direction: level === "low" ? "neutral" : "negative" },
    { text: `On the worst 5% of days it lost ${fmtPct(m.cvar95, 2)} on average [${ids.cvar}] (95% VaR ${fmtPct(h.var95, 2)} [${ids.var}]).`, evidenceIds: [ids.cvar, ids.var], direction: "negative" },
  ];
  for (const s of stress.filter((x) => "evidenceId" in x && x.evidenceId).slice(0, 3)) {
    claims.push({ text: `${s.label}: ${fmtPct(s.portfolioReturn!, 1, true)} [${(s as { evidenceId: string }).evidenceId}].`, evidenceIds: [(s as { evidenceId: string }).evidenceId], direction: s.portfolioReturn! < 0 ? "negative" : "positive" });
  }
  if (worstId && w) claims.push({ text: `Its worst 20-day stretch in the data was ${fmtPct(w.ret, 1, true)} (${w.from} to ${w.to}) [${worstId}].`, evidenceIds: [worstId], direction: "negative" });

  const sharpeTxt = h.sharpe !== null ? `Past-year Sharpe ${fmtNum(h.sharpe)}${h.sortino !== null ? `, Sortino ${fmtNum(h.sortino)}` : ""} (historical return per unit of risk, risk-free rate 0; not a forecast).` : "Sharpe ratio unavailable.";
  return {
    status: missing.length ? "partial" : "success",
    conclusion: `Risk level: ${level.toUpperCase()} (${reasons.join(", ")}). Suggested ceiling ${fmtPct(sizing.maxWeight)} of a portfolio under the ${sizing.profile} profile.`,
    view: riskView(level),
    confidence: coverageConfidence(m.report.observations, 252),
    claims,
    metrics: { riskLevel: level, annualVol: h.annualVol, maxDrawdown1y: h.maxDrawdown, var95: h.var95, cvar95: m.cvar95, beta: Number.isFinite(h.beta) ? h.beta : null, sharpe: h.sharpe, sortino: h.sortino, avgDailyValue: adv, maxWeight: sizing.maxWeight },
    risks: [
      ...(level === "high" || level === "extreme" ? [`${level[0].toUpperCase()}${level.slice(1)} risk: ${reasons.join(", ")}.`] : []),
      ...stress.filter((s) => (s.portfolioReturn ?? 0) < -0.25).map((s) => `${s.label} would have cost ${fmtPct(s.portfolioReturn!, 0, true)}.`),
    ],
    catalysts: [],
    disagreements: [],
    missingData: missing,
    reasoningSummary: `One-year daily returns (${m.report.observations} days) through ${m.report.asOf}; stress tests replay real windows where history allows and otherwise scale by beta.`,
    details: { subject: "asset", riskLevel: level, levelReasons: reasons, stressTests: stress, recommendedPositionSize: sizing, portfolioImpact: impact, riskReward: sharpeTxt },
  };
}

async function holdingImpact(ctx: ResearchContext, holdings: Holding[], ticker: string, sector: string, cap: number): Promise<string | null> {
  const list = holdings.slice(0, 20);
  const [index, ...rows] = await Promise.all([ctx.index(), ...list.map((h) => ctx.stock(h.ticker))]);
  const usable = list.map((h, k) => ({ h, b: rows[k].value?.bars })).filter((x): x is { h: Holding; b: Bar[] } => !!x.b && x.b.length > 61);
  if (!index.value || usable.length === 0) return null;
  try {
    const r = analyzePortfolio(usable.map((u) => u.h), usable.map((u) => u.b), index.value);
    const cur = r.holdings.find((x) => x.ticker === ticker)?.weight ?? 0;
    const secW = r.sectors.find((s) => s.sector.toLowerCase() === sector.toLowerCase())?.weight ?? 0;
    return `${ticker} is ${cur ? `${fmtPct(cur)} of your saved portfolio` : "not in your saved portfolio"}; holdings in the same sector are ${fmtPct(secW)}. ` +
      (cur >= cap ? `That is at or above the ${fmtPct(cap)} ceiling.` : `Room to the ${fmtPct(cap)} ceiling: ${fmtPct(cap - cur)}.`);
  } catch {
    return null;
  }
}

async function analyzeBasket(ctx: ResearchContext, kind: "saved" | "query", tickers: string[], ev: EvidenceLog): Promise<AgentOutput<RiskDetails | null>> {
  const index = await ctx.index();
  if (!index.value) return noDataOutput("NIFTY 50 history was unavailable.", [`NIFTY 50 history (${index.status})`]);
  const saved = kind === "saved" ? (await ctx.holdings()).value ?? [] : [];
  const list = kind === "saved" ? saved.slice(0, 40) : tickers.map((t) => ({ ticker: t, quantity: 1, sector: STOCKS[t]?.sector ?? "Other" }));
  const fetched = await Promise.all(list.map(async (h) => ({ h, d: await ctx.stock(h.ticker) })));
  const missing: string[] = [];
  const usable: Array<{ h: HoldingInput; bars: Bar[] }> = [];
  for (const f of fetched) {
    if (f.d.value && f.d.value.bars.length > 61 && f.h.quantity > 0) usable.push({ h: f.h, bars: f.d.value.bars });
    else missing.push(`${f.h.ticker} (${f.d.value ? "insufficient history" : f.d.status})`);
  }
  if (usable.length === 0) return noDataOutput("No holding had usable price history.", missing);

  let proposed: RiskDetails["proposedWeights"];
  let holdings = usable.map((u) => u.h);
  const bars = usable.map((u) => u.bars);
  if (kind === "query") {
    // Build: inverse-volatility weights with the profile's single-stock cap, then express them as quantities.
    const vols = bars.map((b) => {
      const r = returns(b.slice(-253).map((x) => x.close));
      const m = r.reduce((a, x) => a + x, 0) / r.length;
      return Math.sqrt(r.reduce((a, x) => a + (x - m) ** 2, 0) / (r.length - 1)) * Math.sqrt(252);
    });
    const cap = CONSTRUCTION_CAP[ctx.intent.riskProfile === "unknown" ? "moderate" : ctx.intent.riskProfile];
    const w = inverseVolWeights(vols, cap);
    proposed = usable.map((u, i) => ({ ticker: u.h.ticker, weight: w[i], annualVol: vols[i] }));
    holdings = usable.map((u, i) => ({ ...u.h, quantity: (w[i] * 1_000_000) / u.bars[u.bars.length - 1].close }));
  }
  let m: Measured;
  try { m = measure(holdings, bars, index.value, ctx.intent); } catch (e) {
    return noDataOutput(`Could not measure the portfolio: ${(e as Error).message}.`, missing);
  }
  const h = m.report.historical;
  const ids = citeCore(m, ev, "Computed from Yahoo Finance daily bars", kind === "saved" ? "Portfolio" : "Proposed portfolio");
  const c = m.report.concentration;
  const concId = ev.add({ kind: "portfolio", label: "Largest single holding", value: c.topWeight, display: fmtPct(c.topWeight), source: kind === "saved" ? "Your saved holdings at latest prices" : "Proposed weights", asOf: m.report.asOf });
  const { level, reasons } = classifyRisk({ annualVol: h.annualVol, maxDrawdown: h.maxDrawdown, cvar95: m.cvar95, avgDailyValue: null });
  if (c.topWeight > 0.25) reasons.push(`concentration (largest holding ${fmtPct(c.topWeight)})`);
  const lvl = c.topWeight > 0.25 && level !== "extreme" ? bump(level) : level;
  const stress = stressEvidence(m.stress, ev, m.report.asOf);
  const claims: Claim[] = [
    { text: `The ${kind === "saved" ? "portfolio" : "proposed portfolio"} has ${fmtPct(h.annualVol)} annualised volatility [${ids.vol}], a ${fmtPct(h.maxDrawdown)} maximum drawdown over the past year [${ids.dd}] and 95% CVaR of ${fmtPct(m.cvar95, 2)} a day [${ids.cvar}].`, evidenceIds: [ids.vol, ids.dd, ids.cvar], direction: "neutral" },
    { text: `The largest holding is ${fmtPct(c.topWeight)} of the total [${concId}]; effective number of holdings ${c.effectiveHoldings.toFixed(1)}.`, evidenceIds: [concId], direction: c.topWeight > 0.25 ? "negative" : "neutral" },
  ];
  for (const s of stress.filter((x) => "evidenceId" in x && x.evidenceId).slice(0, 3)) {
    claims.push({ text: `${s.label}: ${fmtPct(s.portfolioReturn!, 1, true)} [${(s as { evidenceId: string }).evidenceId}].`, evidenceIds: [(s as { evidenceId: string }).evidenceId], direction: s.portfolioReturn! < 0 ? "negative" : "positive" });
  }
  for (const s of stress) if (s.portfolioReturn === null) missing.push(`${s.label}: no holding has history covering the window`);
  return {
    status: missing.length ? "partial" : "success",
    conclusion: `Portfolio risk: ${lvl.toUpperCase()} (${reasons.join(", ")}).`,
    view: riskView(lvl),
    confidence: coverageConfidence(usable.length, list.length),
    claims,
    metrics: { riskLevel: lvl, annualVol: h.annualVol, maxDrawdown1y: h.maxDrawdown, var95: h.var95, cvar95: m.cvar95, beta: Number.isFinite(h.beta) ? h.beta : null, sharpe: h.sharpe, sortino: h.sortino, topWeight: c.topWeight, effectiveHoldings: c.effectiveHoldings },
    risks: [
      ...(lvl === "high" || lvl === "extreme" ? [`${lvl[0].toUpperCase()}${lvl.slice(1)} risk: ${reasons.join(", ")}.`] : []),
      ...(m.report.sectors[0] && m.report.sectors[0].weight > 0.4 ? [`${fmtPct(m.report.sectors[0].weight)} in one sector (${m.report.sectors[0].sector}).`] : []),
      ...stress.filter((s) => (s.portfolioReturn ?? 0) < -0.25).map((s) => `${s.label} would have cost ${fmtPct(s.portfolioReturn!, 0, true)}.`),
    ],
    catalysts: [],
    disagreements: [],
    missingData: missing,
    reasoningSummary: m.report.conventions.join(" "),
    details: {
      subject: kind === "saved" ? "portfolio" : "construction",
      riskLevel: lvl,
      levelReasons: reasons,
      stressTests: stress,
      recommendedPositionSize: null,
      portfolioImpact: null,
      riskReward: h.sharpe !== null ? `Past-year Sharpe ${fmtNum(h.sharpe)} (historical, risk-free rate 0; not a forecast).` : "Sharpe ratio unavailable.",
      proposedWeights: proposed,
      correlation: m.report.correlation,
    },
  };
}

export const riskAgent: InvestmentAgent<RiskDetails | null> = {
  id: "risk",
  async analyze(ctx, _prior, ev) {
    const subject = await ctx.subject();
    if (subject.kind === "asset") return analyzeAsset(ctx, subject.ticker, ev);
    if (subject.kind === "portfolio") {
      if (subject.tickers.length === 0) return noDataOutput("There are no saved holdings to analyse.", ["saved portfolio holdings"]);
      return analyzeBasket(ctx, subject.source, subject.tickers, ev);
    }
    return noDataOutput("Risk analysis needs a stock or a portfolio.", ["a stock or portfolio"]);
  },
};

