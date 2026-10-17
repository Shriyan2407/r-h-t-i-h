/**
 * Agent 7 — CIO / Investment Committee.
 *
 * Decides from the other agents' structured results; it does not average scores blindly and it never calls an LLM.
 *   1. Sufficiency: too few usable analysts, or a blocked question, gives INSUFFICIENT DATA.
 *   2. Weighting: each analyst's view is weighted by its role for this intent, adjusted for the stated horizon,
 *      and multiplied by evidence quality (confidence x mean source reliability x freshness).
 *   3. Disagreements: every pair of analysts with opposite views is listed with how the weighting resolved it.
 *   4. Mapping: the weighted score maps to a decision at published thresholds.
 *   5. Overrides: risk caps the decision (HIGH -> at most ACCUMULATE, EXTREME -> at most WATCH); a weakened or
 *      invalidated thesis downgrades it; STRONG BUY needs no disagreement, at least two outright bullish analysts,
 *      a surviving thesis and medium-or-lower risk.
 * Conviction (0-100) measures how strong and how agreed the evidence is. It is not a probability of profit.
 */
import type { InvestmentAgent } from "./agent";
import type { ResearchContext } from "./context";
import type { ContrarianDetails, ThesisVerdict } from "./contrarian";
import { viewScore } from "./contrarian";
import { evidenceQuality } from "./evidence";
import { buildMemo, type InvestmentMemo } from "./memo";
import type { ExecutionPlan } from "./router";
import { AGENT_NAMES, type AgentId, type AgentResult, type Decision, type IntentType } from "./schema";

export const ROLE_WEIGHTS: Record<IntentType, Partial<Record<AgentId, number>>> = {
  investment_decision: { strategist: 0.1, quant: 0.25, fundamental: 0.3, intelligence: 0.1, risk: 0.25 },
  valuation: { fundamental: 0.5, quant: 0.15, intelligence: 0.1, risk: 0.25 },
  risk_assessment: { risk: 0.5, quant: 0.3, strategist: 0.2 },
  portfolio_review: { strategist: 0.15, quant: 0.25, fundamental: 0.25, risk: 0.35 },
  portfolio_construction: { strategist: 0.15, quant: 0.25, fundamental: 0.25, risk: 0.35 },
  explain_move: { intelligence: 0.4, quant: 0.4, fundamental: 0.2 },
  general_research: { strategist: 1 },
};

const LADDER: Decision[] = ["AVOID", "SELL", "REDUCE", "WATCH", "HOLD", "ACCUMULATE", "BUY", "STRONG BUY"];
const rank = (d: Decision) => LADDER.indexOf(d);
const capAt = (d: Decision, cap: Decision): Decision => (rank(d) > rank(cap) ? cap : d);
const down = (d: Decision, steps: number): Decision => (rank(d) <= rank("HOLD") ? d : LADDER[Math.max(rank("HOLD"), rank(d) - steps)]);

export interface Disagreement {
  between: [AgentId, AgentId];
  about: string;
  resolution: string;
}

export interface AgentWeight {
  agent: AgentId;
  roleWeight: number;
  quality: number;
  effectiveWeight: number;
  view: string;
}

export interface CioDetails {
  decision: Decision | null;
  decisionNote: string;
  conviction: number;
  score: number | null;
  horizon: string;
  weights: AgentWeight[];
  disagreements: Disagreement[];
  overrides: string[];
  thesisVerdict: ThesisVerdict | null;
  memo: InvestmentMemo;
}

/** Evidence quality in [0,1]: confidence x mean reliability x share of evidence that is fresh. */
export function agentQuality(r: AgentResult, now: Date): number {
  if (r.status === "failed" || r.view === "no_view") return 0;
  const q = evidenceQuality(r.evidence, now);
  const reliability = q.meanReliability ?? 0.5;
  const fresh = q.items ? 1 - q.stale / q.items : 1;
  return r.confidence * reliability * fresh;
}

export function horizonMultiplier(agent: AgentId, horizon: string): number {
  if (horizon === "long") return agent === "fundamental" ? 1.5 : agent === "quant" || agent === "intelligence" ? 0.6 : 1;
  if (horizon === "short") return agent === "quant" || agent === "intelligence" ? 1.5 : agent === "fundamental" ? 0.6 : 1;
  return 1;
}

/** Published thresholds on the weighted score (-2..+2). Wide bands on purpose: no direction model is validated. */
export function scoreToDecision(score: number, held: boolean): Decision {
  if (score >= 1.5) return "STRONG BUY";
  if (score >= 1.0) return "BUY";
  if (score >= 0.5) return "ACCUMULATE";
  if (score > -0.5) return "HOLD";
  if (score > -1.0) return held ? "REDUCE" : "WATCH";
  return held ? "SELL" : "AVOID";
}

export interface CommitteeInput {
  intent: IntentType;
  horizon: string;
  results: readonly AgentResult[];
  plan: Pick<ExecutionPlan, "agents" | "blocked">;
  held: boolean;
  now: Date;
}

export function decide(input: CommitteeInput): Omit<CioDetails, "memo"> {
  const { intent, horizon, results, plan, held, now } = input;
  const roles = ROLE_WEIGHTS[intent];
  const contrarian = results.find((r) => r.agent === "contrarian" && r.status !== "failed");
  const thesisVerdict = (contrarian?.details as ContrarianDetails | undefined)?.verdict ?? null;
  const explanatory = intent === "explain_move" || intent === "general_research";

  const weights: AgentWeight[] = results
    .filter((r) => roles[r.agent] !== undefined)
    .map((r) => {
      const roleWeight = (roles[r.agent] ?? 0) * horizonMultiplier(r.agent, horizon);
      const quality = agentQuality(r, now);
      return { agent: r.agent, roleWeight, quality, effectiveWeight: roleWeight * quality, view: r.view };
    });

  const base = { horizon, weights, thesisVerdict };
  if (plan.blocked) return { ...base, decision: explanatory ? null : "INSUFFICIENT DATA", decisionNote: plan.blocked, conviction: 0, score: null, disagreements: [], overrides: [] };

  const usable = weights.filter((w) => w.quality > 0);
  const analysts = plan.agents.filter((a) => roles[a] !== undefined);
  const coverage = analysts.length ? usable.length / analysts.length : 0;
  const coreOk = intent === "risk_assessment" ? usable.some((w) => w.agent === "risk")
    : intent === "valuation" ? usable.some((w) => w.agent === "fundamental")
      : usable.some((w) => w.agent === "quant" || w.agent === "fundamental");
  const wsum = usable.reduce((a, w) => a + w.effectiveWeight, 0);
  const score = wsum > 0 ? usable.reduce((a, w) => a + w.effectiveWeight * viewScore(w.view as never), 0) / wsum : null;

  // Disagreements: opposite-signed views; the side carrying more effective weight prevails.
  const disagreements: Disagreement[] = [];
  for (let i = 0; i < usable.length; i++) for (let j = i + 1; j < usable.length; j++) {
    const a = usable[i], b = usable[j];
    const va = viewScore(a.view as never), vb = viewScore(b.view as never);
    if (va * vb >= 0) continue;
    const ra = results.find((r) => r.agent === a.agent)!, rb = results.find((r) => r.agent === b.agent)!;
    const winner = a.effectiveWeight >= b.effectiveWeight ? a : b;
    disagreements.push({
      between: [a.agent, b.agent],
      about: `${AGENT_NAMES[a.agent]}: ${ra.conclusion} | ${AGENT_NAMES[b.agent]}: ${rb.conclusion}`,
      resolution: `Weighted toward the ${AGENT_NAMES[winner.agent]} (role ${winner.roleWeight.toFixed(2)} × evidence quality ${winner.quality.toFixed(2)}${horizon !== "unknown" ? `, ${horizon} horizon` : ""}).`,
    });
  }

  if (explanatory) {
    return { ...base, decision: null, decisionNote: "The question asks for an explanation, not an investment decision, so none is given.", conviction: 0, score, disagreements, overrides: [] };
  }
  if (!coreOk || usable.length < Math.min(2, analysts.length) || score === null) {
    const missing = analysts.filter((a) => !usable.some((w) => w.agent === a)).map((a) => AGENT_NAMES[a]);
    return { ...base, decision: "INSUFFICIENT DATA", decisionNote: `Not enough usable evidence: no usable result from ${missing.join(", ") || "the core analysts"}.`, conviction: 0, score, disagreements, overrides: [] };
  }

  let decision = scoreToDecision(score, held);
  const overrides: string[] = [];
  const riskLevel = results.find((r) => r.agent === "risk" && r.status !== "failed")?.metrics.riskLevel;
  if (riskLevel === "extreme" && rank(decision) > rank("WATCH")) { decision = capAt(decision, "WATCH"); overrides.push("Risk is EXTREME: the decision is capped at WATCH."); }
  if (riskLevel === "high" && rank(decision) > rank("ACCUMULATE")) { decision = capAt(decision, "ACCUMULATE"); overrides.push("Risk is HIGH: the decision is capped at ACCUMULATE (build gradually)."); }
  if (thesisVerdict === "THESIS INVALIDATED" && rank(decision) > rank("HOLD")) { decision = down(decision, 2); overrides.push("The contrarian invalidated the thesis: downgraded two steps."); }
  if (thesisVerdict === "THESIS WEAKENED" && rank(decision) > rank("HOLD")) { decision = down(decision, 1); overrides.push("The contrarian weakened the thesis: downgraded one step."); }
  const outrightBulls = usable.filter((w) => w.view === "bullish").length;
  if (decision === "STRONG BUY" && (disagreements.length > 0 || outrightBulls < 2 || thesisVerdict !== "THESIS SURVIVES" || !(riskLevel === "low" || riskLevel === "medium") || coverage < 0.8)) {
    decision = "BUY";
    overrides.push("STRONG BUY requires no disagreement, at least two outright bullish analysts, a surviving thesis, low or medium risk and at least 80% of analysts reporting: lowered to BUY.");
  }

  const agreement = usable.length > 1 ? 1 - disagreements.length / ((usable.length * (usable.length - 1)) / 2) : 1;
  const conviction = Math.round(100 * Math.min(1, Math.abs(score) / 1.5) * coverage * agreement);
  return {
    ...base,
    decision,
    decisionNote: `Weighted committee score ${score.toFixed(2)} on a −2 to +2 scale from ${usable.length} of ${analysts.length} analysts.`,
    conviction,
    score,
    disagreements,
    overrides,
  };
}

export const cioAgent: InvestmentAgent<CioDetails> = {
  id: "cio",
  async analyze(ctx: ResearchContext, prior) {
    const plan = ctx.plan ?? { agents: prior.map((r) => r.agent), blocked: null };
    const subject = await ctx.subject();
    let held = false;
    if (subject.kind === "asset") {
      const h = await ctx.holdings();
      held = !!h.value?.some((x) => x.ticker === subject.ticker);
    } else if (subject.kind === "portfolio" && subject.source === "saved") held = true;
    const d = decide({ intent: ctx.intent.intent, horizon: ctx.intent.horizon, results: prior, plan, held, now: ctx.now });
    const memo = buildMemo(ctx.intent, subject, prior, d, ctx.now);
    return {
      status: d.decision === "INSUFFICIENT DATA" ? "partial" : "success",
      conclusion: d.decision ? `${d.decision} (conviction ${d.conviction}/100). ${d.decisionNote}` : d.decisionNote,
      view: d.score === null ? "no_view" : d.score >= 1.0 ? "bullish" : d.score >= 0.5 ? "lean_bullish" : d.score <= -1.0 ? "bearish" : d.score <= -0.5 ? "lean_bearish" : "neutral",
      confidence: d.conviction / 100,
      claims: [],
      metrics: { decision: d.decision, conviction: d.conviction, score: d.score, disagreements: d.disagreements.length },
      risks: memo.keyRisks,
      catalysts: memo.keyCatalysts,
      disagreements: d.disagreements.map((x) => `${AGENT_NAMES[x.between[0]]} vs ${AGENT_NAMES[x.between[1]]}: ${x.resolution}`),
      missingData: [...new Set(prior.flatMap((r) => r.missingData))],
      reasoningSummary: [d.decisionNote, ...d.overrides].join(" "),
      details: { ...d, memo },
    };
  },
};
