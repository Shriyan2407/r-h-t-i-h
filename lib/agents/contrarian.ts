/**
 * Agent 6 — Research / Contrarian Analyst.
 *
 * Runs after the analysts. It works out the emerging thesis (the confidence-weighted direction of their views) and
 * then tries to break it with their own evidence: valuation stretch, over-extension, fragile data, risk the others
 * discounted, disagreement between agents, and the absence of any validated directional model. Each attack has a
 * fixed severity; the survival score is 100 minus 10 points per severity unit.
 *
 * It cites evidence by re-registering the items it relies on (same value, source and timestamp) under its own ids,
 * labelled with the agent they came from, so every attack is traceable to data rather than to opinion.
 */
import type { AgentOutput, InvestmentAgent } from "./agent";
import type { EvidenceLog } from "./evidence";
import { AGENT_NAMES, type AgentEvidence, type AgentId, type AgentResult, type Claim, type View } from "./schema";

export type ThesisVerdict = "THESIS SURVIVES" | "THESIS WEAKENED" | "THESIS INVALIDATED";
export type ThesisDirection = "bullish" | "bearish" | "no_edge";

export interface Attack {
  attack: string;
  severity: 1 | 2 | 3;
  evidenceIds: string[];
}

export interface ContrarianDetails {
  thesis: { direction: ThesisDirection; statement: string; score: number };
  thesisAttacks: Attack[];
  contradictoryEvidence: string[];
  hiddenRisks: string[];
  alternativeHypotheses: string[];
  bearCase: string;
  thesisSurvivalScore: number;
  verdict: ThesisVerdict;
}

const VIEW_SCORE: Record<View, number> = { bullish: 2, lean_bullish: 1, neutral: 0, lean_bearish: -1, bearish: -2, no_view: 0 };

export function viewScore(v: View): number {
  return VIEW_SCORE[v];
}

/** Confidence-weighted mean view of the analysts that produced one, in [-2, 2]. */
export function emergingThesis(prior: readonly AgentResult[]): { direction: ThesisDirection; score: number } {
  const voters = prior.filter((r) => r.status !== "failed" && r.view !== "no_view" && r.agent !== "contrarian" && r.agent !== "cio");
  const wsum = voters.reduce((a, r) => a + r.confidence, 0);
  const score = wsum > 0 ? voters.reduce((a, r) => a + viewScore(r.view) * r.confidence, 0) / wsum : 0;
  return { direction: score >= 0.5 ? "bullish" : score <= -0.5 ? "bearish" : "no_edge", score };
}

export function verdictFor(survival: number): ThesisVerdict {
  return survival >= 65 ? "THESIS SURVIVES" : survival >= 35 ? "THESIS WEAKENED" : "THESIS INVALIDATED";
}

class Ref {
  private copied = new Map<string, string>();
  constructor(private readonly prior: readonly AgentResult[], private readonly ev: EvidenceLog) {}
  get(agent: AgentId) {
    return this.prior.find((r) => r.agent === agent && r.status !== "failed");
  }
  metric(agent: AgentId, key: string): number | null {
    const v = this.get(agent)?.metrics[key];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  }
  /** Re-cite another agent's evidence item (matched by label) under a contrarian id. */
  cite(agent: AgentId, label: RegExp): string | null {
    const r = this.get(agent);
    const e = r?.evidence.find((x) => label.test(x.label));
    if (!r || !e) return null;
    const key = `${agent}:${e.id}`;
    const hit = this.copied.get(key);
    if (hit) return hit;
    const { id: origId, ...rest } = e as AgentEvidence;
    const id = this.ev.add({ ...rest, label: `${AGENT_NAMES[agent]}: ${e.label} (${origId})` });
    this.copied.set(key, id);
    return id;
  }
}

function attacksOnBullish(ref: Ref, add: (a: string, s: 1 | 2 | 3, ids: (string | null)[]) => void) {
  const pe = ref.metric("fundamental", "pe"), peg = ref.metric("fundamental", "peg");
  if (pe !== null && pe > 40) add(`Valuation is stretched: a trailing P/E of ${pe.toFixed(1)}x prices in sustained growth, leaving little room for a miss.`, pe > 60 ? 3 : 2, [ref.cite("fundamental", /^Trailing P\/E/)]);
  if (peg !== null && peg > 2) add(`The multiple is high relative to growth (PEG ${peg.toFixed(2)}).`, 2, [ref.cite("fundamental", /^PEG/)]);
  const ext = ref.get("quant")?.evidence.find((e) => /Price vs 200-day average/.test(e.label));
  if (ext && typeof ext.value === "number" && ext.value > 0.25) add(`Price is ${(ext.value * 100).toFixed(1)}% above its 200-day average; extended moves often mean-revert.`, 2, [ref.cite("quant", /Price vs 200-day average/)]);
  const rsi = ref.metric("quant", "rsi14");
  if (rsi !== null && rsi > 70) add(`RSI ${rsi.toFixed(1)} is overbought.`, 1, [ref.cite("quant", /^RSI/)]);
  const risk = ref.get("risk")?.metrics.riskLevel;
  if (risk === "high" || risk === "extreme") add(`The risk agent rates downside ${String(risk).toUpperCase()}; a bullish view has to absorb that.`, risk === "extreme" ? 3 : 2, [ref.cite("risk", /CVaR/), ref.cite("risk", /maximum drawdown/)]);
  const fd = ref.get("fundamental");
  if (fd && (fd.view === "lean_bearish" || fd.view === "bearish")) add("Fundamentals do not support the price action: the fundamental analyst's view is negative.", 2, [ref.cite("fundamental", /Revenue growth|Earnings growth|Return on equity|Debt to equity/)]);
  const neg = ref.get("intelligence")?.details as { items?: Array<{ impact: string; catalyst: string | null; evidenceId: string }> } | undefined;
  const reg = neg?.items?.find((i) => i.impact === "negative" && i.catalyst === "regulatory");
  if (reg) add("A recent negative regulatory headline could matter more than the trend suggests.", 2, [ref.cite("intelligence", /Headline/)]);
  const st = ref.get("strategist")?.details as { marketRegime?: { vol: string; trend: string } | null } | undefined;
  if (st?.marketRegime?.vol === "HIGH") add("The market is in a high-volatility regime, when drawdowns are historically more frequent.", 1, [ref.cite("strategist", /Market regime/)]);
}

function attacksOnBearish(ref: Ref, add: (a: string, s: 1 | 2 | 3, ids: (string | null)[]) => void) {
  const fd = ref.get("fundamental");
  if (fd && (fd.view === "bullish" || fd.view === "lean_bullish")) add("Fundamentals are solid; the weakness may be sentiment or market-driven rather than a broken business.", 2, [ref.cite("fundamental", /Return on equity|Revenue growth|Earnings growth/)]);
  const pe = ref.metric("fundamental", "pe"), peg = ref.metric("fundamental", "peg");
  if ((pe !== null && pe > 0 && pe < 15) || (peg !== null && peg < 1)) add("Valuation is undemanding, which limits downside if earnings hold.", 2, [ref.cite("fundamental", /^Trailing P\/E|^PEG/)]);
  const rsi = ref.metric("quant", "rsi14");
  if (rsi !== null && rsi < 30) add(`RSI ${rsi.toFixed(1)} is oversold; sharp rebounds are common from here.`, 1, [ref.cite("quant", /^RSI/)]);
  const risk = ref.get("risk")?.metrics.riskLevel;
  if (risk === "low" || risk === "medium") add(`Measured risk is only ${String(risk).toUpperCase()}; the bearish case may overstate downside.`, 1, [ref.cite("risk", /annualised volatility/)]);
  const pos = ref.get("intelligence");
  if (pos && pos.catalysts.length) add("There are positive catalysts in recent news that a bearish view ignores.", 1, [ref.cite("intelligence", /Headline/)]);
}

function commonAttacks(prior: readonly AgentResult[], ref: Ref, add: (a: string, s: 1 | 2 | 3, ids: (string | null)[]) => void, direction: ThesisDirection) {
  // Disagreement between independent analysts.
  const voters = prior.filter((r) => r.status !== "failed" && r.view !== "no_view" && r.agent !== "risk");
  const pos = voters.filter((r) => viewScore(r.view) > 0).map((r) => AGENT_NAMES[r.agent]);
  const neg = voters.filter((r) => viewScore(r.view) < 0).map((r) => AGENT_NAMES[r.agent]);
  if (pos.length && neg.length) add(`The analysts disagree: ${pos.join(", ")} lean positive while ${neg.join(", ")} lean negative.`, 2, []);
  // Fragile evidence.
  const failed = prior.filter((r) => r.status === "failed" || r.view === "no_view").map((r) => AGENT_NAMES[r.agent]);
  if (failed.length) add(`Part of the committee had no usable data (${failed.join(", ")}); the thesis rests on incomplete evidence.`, failed.length >= 2 ? 2 : 1, []);
  // No validated directional model; when the quant rule score's own test is on record, cite it.
  if (direction !== "no_edge") {
    const evalId = ref.cite("quant", /^Quant rule score: out-of-sample/);
    const noEdge = ref.get("quant")?.evidence.some((e) => /^Quant rule score: out-of-sample/.test(e.label) && /no measured edge/.test(e.display));
    if (evalId && noEdge) add("The quant rule score showed no edge over future returns in a point-in-time test, and no model in this system predicts direction; the price signals here describe the chart rather than forecast it.", 1, [evalId]);
    else add("No model in this system has shown out-of-sample skill at predicting price direction; the case rests on rules and historical description, not a validated forecast.", 1, [ref.cite("quant", /Holdout share/)]);
  }
  // Survivorship and in-sample statistics.
  if (ref.get("quant")?.evidence.some((e) => /in-sample/.test(e.label))) add("The trend-rule statistic is in-sample on a company that survived to today, so it flatters the rule (survivorship and look-back bias).", 1, [ref.cite("quant", /in-sample/)]);
}

function alternatives(ref: Ref, direction: ThesisDirection): string[] {
  const out: string[] = [];
  const beta = ref.metric("quant", "beta");
  if (beta !== null && beta > 1.2) out.push(`Much of the move may be market exposure (beta ${beta.toFixed(2)}) rather than company-specific merit.`);
  if (ref.get("intelligence")?.catalysts.length) out.push("A news-driven move can fade once the headline is priced in.");
  const g = ref.get("fundamental")?.metrics.revenueGrowth;
  if (typeof g === "number" && g > 25) out.push("Unusually fast growth may be cyclical or one-off rather than a new trend.");
  if (direction === "bearish") out.push("The decline may reflect sector rotation rather than deterioration in this company.");
  if (!out.length) out.push("The price may simply be fairly valued, with no edge in either direction.");
  return out;
}

export const contrarianAgent: InvestmentAgent<ContrarianDetails> = {
  id: "contrarian",
  async analyze(_ctx, prior, ev): Promise<AgentOutput<ContrarianDetails>> {
    const ref = new Ref(prior, ev);
    const { direction, score } = emergingThesis(prior);
    const attacks: Attack[] = [];
    const add = (attack: string, severity: 1 | 2 | 3, ids: (string | null)[]) => attacks.push({ attack, severity, evidenceIds: ids.filter((x): x is string => !!x) });
    if (direction === "bullish") attacksOnBullish(ref, add);
    if (direction === "bearish") attacksOnBearish(ref, add);
    commonAttacks(prior, ref, add, direction);

    const survival = Math.max(0, 100 - 10 * attacks.reduce((a, x) => a + x.severity, 0));
    const verdict = verdictFor(survival);
    const statement = direction === "bullish" ? "The analysts lean positive." : direction === "bearish" ? "The analysts lean negative." : "The analysts see no clear edge either way.";
    // The contrarian never adds conviction: it is neutral when the thesis survives and leans against it otherwise.
    const against: View = direction === "bullish" ? "lean_bearish" : direction === "bearish" ? "lean_bullish" : "neutral";
    const view: View = verdict === "THESIS INVALIDATED" ? against : "neutral";
    const ranked = [...attacks].sort((a, b) => b.severity - a.severity);
    const claims: Claim[] = ranked.filter((a) => a.evidenceIds.length).map((a) => ({
      text: `${a.attack} ${a.evidenceIds.map((i) => `[${i}]`).join(" ")}`,
      evidenceIds: a.evidenceIds,
      direction: direction === "bullish" ? "negative" : direction === "bearish" ? "positive" : "neutral",
    }));
    const usable = prior.filter((r) => r.status !== "failed" && r.view !== "no_view").length;
    return {
      status: usable ? "success" : "partial",
      conclusion: `${verdict}: ${statement} ${attacks.length} challenge${attacks.length === 1 ? "" : "s"} raised; survival score ${survival}/100.`,
      view,
      confidence: Math.round(Math.min(1, usable / Math.max(1, prior.length)) * 100) / 100,
      claims,
      metrics: { thesisScore: Math.round(score * 100) / 100, attacks: attacks.length, survivalScore: survival },
      risks: ranked.filter((a) => a.severity >= 2).map((a) => a.attack),
      catalysts: [],
      disagreements: attacks.filter((a) => /disagree/.test(a.attack)).map((a) => a.attack),
      missingData: [],
      reasoningSummary: "Each challenge is a fixed rule applied to the other agents' evidence; severity weights are published in docs/AGENTS.md.",
      details: {
        thesis: { direction, statement, score },
        thesisAttacks: ranked,
        contradictoryEvidence: ranked.filter((a) => a.evidenceIds.length).map((a) => a.attack),
        hiddenRisks: ranked.filter((a) => !a.evidenceIds.length).map((a) => a.attack),
        alternativeHypotheses: alternatives(ref, direction),
        bearCase: direction === "bearish" ? "The bearish thesis is the bear case; see the risk agent's stress tests." : ranked.slice(0, 3).map((a) => a.attack).join(" ") || "No material bear case was found in the evidence.",
        thesisSurvivalScore: survival,
        verdict,
      },
    };
  },
};
