/**
 * Chooses the smallest set of agents that can answer an intent, and the order they run in.
 *
 *   wave 1  independent analysts, in parallel (each sees only data)
 *   wave 2  contrarian (attacks wave-1 conclusions, so it must run after them)
 *   wave 3  CIO (judges everything)
 *
 * When the question cannot be answered with the data we have (an unsupported asset, too few tickers to build a
 * portfolio) only the CIO runs, and it returns INSUFFICIENT DATA with the reason. Nothing is run for show.
 */
import type { AgentId, Intent, IntentType } from "./schema";

const ANALYSTS: Record<IntentType, AgentId[]> = {
  investment_decision: ["strategist", "quant", "fundamental", "intelligence", "risk", "contrarian"],
  explain_move: ["intelligence", "quant", "fundamental"],
  valuation: ["fundamental", "quant", "intelligence", "risk", "contrarian"],
  risk_assessment: ["risk", "quant", "strategist", "contrarian"],
  portfolio_review: ["strategist", "quant", "fundamental", "risk", "contrarian"],
  portfolio_construction: ["strategist", "fundamental", "quant", "risk", "contrarian"],
  general_research: ["strategist"],
};

const WHY: Record<AgentId, string> = {
  strategist: "sets the market regime and macro backdrop",
  quant: "measures trend, momentum, volatility and the validated volatility forecast",
  fundamental: "checks growth, profitability, balance sheet and valuation",
  intelligence: "collects dated, sourced headlines and catalysts",
  risk: "sizes downside: drawdown, VaR/CVaR, stress scenarios and position limits",
  contrarian: "attacks the emerging thesis and looks for what the others missed",
  cio: "weighs the evidence, resolves disagreements and decides",
};

export interface ExecutionPlan {
  intent: IntentType;
  /** Agents in execution order (CIO last). */
  agents: AgentId[];
  waves: AgentId[][];
  reasons: Partial<Record<AgentId, string>>;
  /** Set when the question cannot be analysed; the CIO reports it as INSUFFICIENT DATA. */
  blocked: string | null;
}

export const MIN_CONSTRUCTION_TICKERS = 2;
export const MAX_CONSTRUCTION_TICKERS = 15;

function blockedReason(i: Intent): string | null {
  const assetIntent = i.intent === "investment_decision" || i.intent === "explain_move" || i.intent === "valuation" || i.intent === "risk_assessment";
  if (i.unresolvedAsset && !i.ticker) {
    return `${i.unresolvedAsset} is not covered: EquityLens analyses NSE/BSE-listed Indian equities only, so no data was retrieved for it.`;
  }
  if (assetIntent && !i.ticker && i.intent !== "risk_assessment") return "The question does not name a stock we could identify.";
  if (i.intent === "portfolio_construction" && i.tickers.length < MIN_CONSTRUCTION_TICKERS) {
    return `Portfolio construction needs at least ${MIN_CONSTRUCTION_TICKERS} NSE stocks to choose between; name the candidates in the question.`;
  }
  if (i.intent === "portfolio_construction" && i.tickers.length > MAX_CONSTRUCTION_TICKERS) {
    return `Portfolio construction is limited to ${MAX_CONSTRUCTION_TICKERS} candidate stocks per request.`;
  }
  return null;
}

export function planExecution(intent: Intent): ExecutionPlan {
  const blocked = blockedReason(intent);
  const analysts = blocked ? [] : ANALYSTS[intent.intent];
  const wave1 = analysts.filter((a) => a !== "contrarian");
  const waves: AgentId[][] = [];
  if (wave1.length) waves.push(wave1);
  if (analysts.includes("contrarian")) waves.push(["contrarian"]);
  waves.push(["cio"]);
  const agents = waves.flat();
  return { intent: intent.intent, agents, waves, reasons: Object.fromEntries(agents.map((a) => [a, WHY[a]])), blocked };
}
