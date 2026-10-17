/**
 * Agent 3 — Fundamental Analyst.
 *
 * Scores four areas from reported figures with published thresholds: growth, profitability, financial health and
 * valuation. Figures the provider does not supply (ROCE, interest coverage, FCF yield) and qualitative areas we have
 * no data for (moat, market share, management) are reported as DATA_UNAVAILABLE, never estimated.
 *
 * Units follow the provider: margins, returns and growth are percentages; debt/equity is a percentage (30 = 0.3x);
 * free cash flow is in ₹ crore.
 */
import { STOCKS } from "@/lib/data/searchUniverse";
import type { FundamentalData } from "@/lib/types";
import { coverageConfidence, noDataOutput, type AgentOutput, type InvestmentAgent } from "./agent";
import type { ResearchContext } from "./context";
import type { EvidenceLog } from "./evidence";
import type { Claim, View } from "./schema";

export const DATA_UNAVAILABLE = "DATA_UNAVAILABLE" as const;

export type Grade = "strong" | "adequate" | "weak" | typeof DATA_UNAVAILABLE;

export interface Section {
  grade: Grade;
  /** Mean points per scored rule, in [-1, 1]; null when no rule in the area had data. */
  score: number | null;
  /** Number of rules that had data and were scored. */
  scored: number;
  notes: string[];
}

export interface FundamentalDetails {
  subject: "asset" | "portfolio";
  fundamentalScore: number | null;
  growth: Section;
  profitability: Section;
  financialHealth: Section;
  valuation: Section;
  competitivePosition: { grade: typeof DATA_UNAVAILABLE; reason: string };
  keyStrengths: string[];
  keyWeaknesses: string[];
  perTicker?: Array<{ ticker: string; score: number | null; pe: number | null; roe: number | null }>;
}

const isLender = (ticker: string) => {
  const s = STOCKS[ticker];
  return !!s && (s.sector === "banking" || s.sector === "finance");
};

interface Rule {
  key: keyof FundamentalData;
  label: string;
  unit: "%" | "x" | "cr" | "ratio";
  /** Points for the value, or null when the rule does not apply. */
  score: (v: number) => number;
  good: string;
  bad: string;
}

const fmt = (v: number, unit: Rule["unit"]) =>
  unit === "%" ? `${v.toFixed(1)}%` : unit === "x" ? `${v.toFixed(1)}x` : unit === "cr" ? `₹${Math.round(v).toLocaleString("en-IN")} cr` : v.toFixed(2);

const GROWTH: Rule[] = [
  { key: "revenue_growth_yoy", label: "Revenue growth (year on year)", unit: "%", score: (v) => (v >= 15 ? 1 : v >= 5 ? 0.5 : v < 0 ? -1 : 0), good: "double-digit revenue growth", bad: "shrinking revenue" },
  { key: "profit_growth_yoy", label: "Earnings growth (year on year)", unit: "%", score: (v) => (v >= 15 ? 1 : v >= 5 ? 0.5 : v < 0 ? -1 : 0), good: "strong earnings growth", bad: "falling earnings" },
];
const PROFITABILITY: Rule[] = [
  { key: "roe", label: "Return on equity", unit: "%", score: (v) => (v >= 18 ? 1 : v >= 12 ? 0.5 : v < 8 ? -1 : 0), good: "high return on equity", bad: "low return on equity" },
  { key: "operating_margin", label: "Operating margin", unit: "%", score: (v) => (v >= 20 ? 0.5 : v < 5 ? -0.5 : 0), good: "wide operating margin", bad: "thin operating margin" },
  { key: "net_margin", label: "Net margin", unit: "%", score: (v) => (v >= 15 ? 0.5 : v < 3 ? -0.5 : 0), good: "high net margin", bad: "thin net margin" },
];
const HEALTH: Rule[] = [
  { key: "debt_to_equity", label: "Debt to equity", unit: "%", score: (v) => (v < 50 ? 1 : v > 150 ? -1 : 0), good: "low leverage", bad: "high leverage" },
  { key: "current_ratio", label: "Current ratio", unit: "ratio", score: (v) => (v < 1 ? -0.5 : v >= 1.5 ? 0.5 : 0), good: "comfortable short-term liquidity", bad: "current liabilities exceed current assets" },
  { key: "free_cash_flow", label: "Free cash flow", unit: "cr", score: (v) => (v > 0 ? 0.5 : v < 0 ? -0.5 : 0), good: "positive free cash flow", bad: "negative free cash flow" },
];
const VALUATION: Rule[] = [
  { key: "pe_ratio", label: "Trailing P/E", unit: "x", score: (v) => (v < 0 ? -1 : v > 60 ? -1 : v > 40 ? -0.5 : v < 15 ? 0.5 : 0), good: "modest earnings multiple", bad: "rich or negative earnings multiple" },
  { key: "ev_ebitda", label: "EV/EBITDA", unit: "x", score: (v) => (v > 30 ? -0.5 : v > 0 && v < 10 ? 0.5 : 0), good: "low EV/EBITDA", bad: "high EV/EBITDA" },
  { key: "pb_ratio", label: "Price to book", unit: "x", score: () => 0, good: "", bad: "" },
  { key: "forward_pe", label: "Forward P/E", unit: "x", score: () => 0, good: "", bad: "" },
];

const gradeOf = (mean: number | null): Grade => (mean === null ? DATA_UNAVAILABLE : mean >= 0.5 ? "strong" : mean <= -0.25 ? "weak" : "adequate");

interface Scored { sections: Pick<FundamentalDetails, "growth" | "profitability" | "financialHealth" | "valuation">; claims: Claim[]; strengths: string[]; weaknesses: string[]; used: number; total: number; missing: string[]; pe: number | null; peg: number | null }

export function scoreFundamentals(ticker: string, f: FundamentalData, ev: EvidenceLog, source: string): Scored {
  const claims: Claim[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const missing: string[] = [];
  let used = 0, total = 0;

  const section = (rules: Rule[]): Section => {
    let score = 0, n = 0;
    const notes: string[] = [];
    for (const r of rules) {
      if (r.key === "debt_to_equity" && isLender(ticker)) { notes.push("Debt/equity is not meaningful for a lender and is not scored."); continue; }
      total++;
      const v = f[r.key];
      if (typeof v !== "number" || !Number.isFinite(v)) { missing.push(`${r.label} (${DATA_UNAVAILABLE})`); continue; }
      used++;
      const id = ev.add({ kind: "fundamentals", label: r.label, value: v, display: fmt(v, r.unit), source, asOf: null });
      const pts = r.score(v);
      if (r.good) { score += pts; n++; }
      if (pts > 0 && r.good) { strengths.push(`${r.good} (${fmt(v, r.unit)})`); claims.push({ text: `${r.label} is ${fmt(v, r.unit)} [${id}], a sign of ${r.good}.`, evidenceIds: [id], direction: "positive" }); }
      else if (pts < 0 && r.bad) { weaknesses.push(`${r.bad} (${fmt(v, r.unit)})`); claims.push({ text: `${r.label} is ${fmt(v, r.unit)} [${id}], indicating ${r.bad}.`, evidenceIds: [id], direction: "negative" }); }
      else notes.push(`${r.label}: ${fmt(v, r.unit)} [${id}]`);
    }
    const mean = n ? score / n : null;
    return { grade: gradeOf(mean), score: mean, scored: n, notes };
  };

  const growth = section(GROWTH);
  const profitability = section(PROFITABILITY);
  const financialHealth = section(HEALTH);
  const valuation = section(VALUATION);

  // PEG: trailing P/E over earnings growth, only when both exist and growth is positive.
  const pe = typeof f.pe_ratio === "number" ? f.pe_ratio : null;
  const g = typeof f.profit_growth_yoy === "number" ? f.profit_growth_yoy : null;
  let peg: number | null = null;
  if (pe !== null && pe > 0 && g !== null && g > 0) {
    peg = pe / g;
    const id = ev.add({ kind: "agent_inference", label: "PEG (trailing P/E / earnings growth)", value: peg, display: peg.toFixed(2), source: "Computed from trailing P/E and year-on-year earnings growth", asOf: null });
    const pts = peg < 1 ? 1 : peg > 2.5 ? -1 : 0;
    valuation.score = ((valuation.score ?? 0) * valuation.scored + pts) / (valuation.scored + 1);
    valuation.scored += 1;
    valuation.grade = gradeOf(valuation.score);
    if (pts > 0) { strengths.push(`earnings growth outpaces the P/E (PEG ${peg.toFixed(2)})`); claims.push({ text: `PEG is ${peg.toFixed(2)} [${id}]: the multiple looks low relative to earnings growth.`, evidenceIds: [id], direction: "positive" }); }
    if (pts < 0) { weaknesses.push(`P/E is high relative to growth (PEG ${peg.toFixed(2)})`); claims.push({ text: `PEG is ${peg.toFixed(2)} [${id}]: the multiple is high relative to earnings growth.`, evidenceIds: [id], direction: "negative" }); }
  }
  missing.push(`ROCE (${DATA_UNAVAILABLE})`, `Interest coverage (${DATA_UNAVAILABLE})`, `Free-cash-flow yield (${DATA_UNAVAILABLE}: no market capitalisation in the fundamentals feed)`);
  return { sections: { growth, profitability, financialHealth, valuation }, claims, strengths, weaknesses, used, total, missing, pe, peg };
}

/** 0-100 from the available section scores; null when fewer than two sections have data. */
export function fundamentalScore(s: Scored["sections"]): number | null {
  const parts = [s.growth, s.profitability, s.financialHealth, s.valuation].filter((x) => x.score !== null);
  if (parts.length < 2) return null;
  // Section scores lie in [-1, 1]; their mean maps linearly onto 10-90, so 50 is "neither strong nor weak".
  const m = parts.reduce((a, x) => a + (x.score as number), 0) / parts.length;
  return Math.max(0, Math.min(100, Math.round(50 + m * 40)));
}

export function viewFromFundamentalScore(score: number | null): View {
  if (score === null) return "no_view";
  if (score >= 70) return "bullish";
  if (score >= 58) return "lean_bullish";
  if (score <= 30) return "bearish";
  if (score <= 42) return "lean_bearish";
  return "neutral";
}

const COMPETITIVE = { grade: DATA_UNAVAILABLE, reason: "No data source covers moat, market share, pricing power or management quality; these are not assessed." } as const;

async function analyzeAsset(ctx: ResearchContext, ticker: string, ev: EvidenceLog): Promise<AgentOutput<FundamentalDetails | null>> {
  const d = await ctx.fundamentals(ticker);
  if (!d.value) return noDataOutput(`No fundamental data was available for ${ticker}.`, [`${ticker} fundamentals (${d.status})`]);
  const s = scoreFundamentals(ticker, d.value, ev, d.source);
  const score = fundamentalScore(s.sections);
  const view = viewFromFundamentalScore(score);
  const sect = s.sections;
  return {
    status: score === null ? "partial" : "success",
    conclusion: score === null
      ? `Too few reported figures to score ${ticker}'s fundamentals.`
      : `Fundamental score ${score}/100: growth ${sect.growth.grade}, profitability ${sect.profitability.grade}, balance sheet ${sect.financialHealth.grade}, valuation ${sect.valuation.grade}.`,
    view,
    confidence: coverageConfidence(s.used, s.total),
    claims: s.claims,
    metrics: { fundamentalScore: score, pe: s.pe, forwardPe: d.value.forward_pe, peg: s.peg, roe: d.value.roe, debtToEquity: d.value.debt_to_equity, revenueGrowth: d.value.revenue_growth_yoy },
    risks: s.weaknesses.map((w) => w[0].toUpperCase() + w.slice(1) + "."),
    catalysts: [],
    disagreements: [],
    missingData: s.missing,
    reasoningSummary: "Reported ratios scored against fixed thresholds per area. Figures are the latest the provider reports; it gives no reporting date, so they may lag the most recent quarter.",
    details: { subject: "asset", fundamentalScore: score, ...sect, competitivePosition: COMPETITIVE, keyStrengths: s.strengths, keyWeaknesses: s.weaknesses },
  };
}

async function analyzeBasket(ctx: ResearchContext, tickers: string[], ev: EvidenceLog): Promise<AgentOutput<FundamentalDetails | null>> {
  const list = tickers.slice(0, 10);
  const rows = await Promise.all(list.map(async (t) => ({ t, d: await ctx.fundamentals(t) })));
  const per: NonNullable<FundamentalDetails["perTicker"]> = [];
  const claims: Claim[] = [];
  const missing: string[] = [];
  const weak: string[] = [];
  for (const { t, d } of rows) {
    if (!d.value) { missing.push(`${t} fundamentals (${d.status})`); continue; }
    const s = scoreFundamentals(t, d.value, ev, d.source);
    const score = fundamentalScore(s.sections);
    per.push({ ticker: t, score, pe: s.pe, roe: d.value.roe });
    claims.push(...s.claims.filter((c) => c.direction === "negative").slice(0, 1).map((c) => ({ ...c, text: `${t}: ${c.text}` })));
    if (score !== null && score <= 42) weak.push(t);
  }
  const scored = per.filter((p) => p.score !== null);
  if (scored.length === 0) return noDataOutput("No holding had enough reported figures to score.", missing);
  const avg = Math.round(scored.reduce((a, p) => a + (p.score as number), 0) / scored.length);
  if (tickers.length > list.length) missing.push(`fundamentals for ${tickers.length - list.length} further holdings (only the first ${list.length} are scored)`);
  const na: Section = { grade: DATA_UNAVAILABLE, score: null, scored: 0, notes: ["See per-holding scores."] };
  return {
    status: missing.length ? "partial" : "success",
    conclusion: `Average fundamental score ${avg}/100 across ${scored.length} holdings${weak.length ? `; weakest: ${weak.join(", ")}` : ""}.`,
    view: viewFromFundamentalScore(avg),
    confidence: coverageConfidence(scored.length, list.length),
    claims,
    metrics: { averageScore: avg, holdingsScored: scored.length, weakHoldings: weak.length },
    risks: weak.length ? [`Weak fundamentals in ${weak.join(", ")}.`] : [],
    catalysts: [],
    disagreements: [],
    missingData: missing,
    reasoningSummary: "Each holding scored with the same thresholds as single-stock analysis, then averaged equally.",
    details: { subject: "portfolio", fundamentalScore: avg, growth: na, profitability: na, financialHealth: na, valuation: na, competitivePosition: COMPETITIVE, keyStrengths: [], keyWeaknesses: weak.map((t) => `${t} scores weakly`), perTicker: per },
  };
}

export const fundamentalAgent: InvestmentAgent<FundamentalDetails | null> = {
  id: "fundamental",
  async analyze(ctx, _prior, ev) {
    const subject = await ctx.subject();
    if (subject.kind === "asset") return analyzeAsset(ctx, subject.ticker, ev);
    if (subject.kind === "portfolio" && subject.tickers.length) return analyzeBasket(ctx, subject.tickers, ev);
    return noDataOutput("There is no stock or holding to analyse.", ["a stock or portfolio"]);
  },
};
