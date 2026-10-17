/**
 * Evidence engine for the committee. Every number or headline an agent relies on is registered here and gets a
 * citation id ([Q3], [N1], ...). Reliability is assigned by source type and publisher tier, never by the agent's
 * opinion of the content, and freshness is computed from the data's own timestamp.
 */
import type { AgentEvidence, SourceType } from "./schema";

/**
 * Baseline trust per source type. Market prices are close to ground truth; rule-based and model outputs are
 * weaker; an agent's own inference is the weakest. These are fixed policy values, documented in docs/EVIDENCE_ENGINE.md.
 */
export const SOURCE_RELIABILITY: Record<SourceType, number> = {
  market_data: 0.95,
  derived_indicator: 0.9,
  model_validation: 0.9,
  macro: 0.9,
  portfolio: 0.95,
  fundamentals: 0.8,
  ml_model: 0.7,
  statistical_model: 0.65,
  news: 0.6,
  agent_inference: 0.5,
};

/**
 * Publisher tiers for headlines, matched on the publisher name the aggregator reports. Aggregators are checked
 * first: a feed called "Google News — NSE India" is an aggregator, not the exchange.
 */
const NEWS_TIERS: Array<[RegExp, number]> = [
  [/^google news/i, 0.55],
  [/\b(reuters|bloomberg|nse|bse|sebi|rbi)\b/i, 0.85],
  [/\b(economic times|business standard|livemint|mint|moneycontrol|ndtv profit|financial express|hindu businessline|cnbc)\b/i, 0.75],
];

export function newsReliability(source: string): number {
  for (const [re, r] of NEWS_TIERS) if (re.test(source)) return r;
  return 0.6;
}

/** Collects one agent's evidence and hands out sequential ids with that agent's prefix. */
export class EvidenceLog {
  private items: AgentEvidence[] = [];
  constructor(private readonly prefix: string) {}

  add(e: Omit<AgentEvidence, "id" | "reliability"> & { reliability?: number }): string {
    const id = `${this.prefix}${this.items.length + 1}`;
    this.items.push({ ...e, id, reliability: e.reliability ?? SOURCE_RELIABILITY[e.kind] });
    return id;
  }

  all(): AgentEvidence[] {
    return [...this.items];
  }
}

/** Whole days between an ISO timestamp/date and `now`, or null when the timestamp is missing or invalid. */
export function ageDays(asOf: string | null, now: Date): number | null {
  if (!asOf) return null;
  const t = Date.parse(asOf);
  return Number.isFinite(t) ? Math.max(0, Math.floor((now.getTime() - t) / 86_400_000)) : null;
}

/** Daily market data older than this is stale (weekend plus a holiday). */
export const STALE_MARKET_DAYS = 4;

export interface EvidenceQuality {
  items: number;
  meanReliability: number | null;
  stale: number;
  undated: number;
}

/** Summary used by the CIO to weigh an agent: how much evidence, how trustworthy, how fresh. */
export function evidenceQuality(evidence: readonly AgentEvidence[], now: Date, staleAfterDays = 30): EvidenceQuality {
  if (evidence.length === 0) return { items: 0, meanReliability: null, stale: 0, undated: 0 };
  let stale = 0, undated = 0;
  for (const e of evidence) {
    const age = ageDays(e.asOf, now);
    if (age === null) undated++;
    else if (age > (e.kind === "market_data" || e.kind === "derived_indicator" ? STALE_MARKET_DAYS : staleAfterDays)) stale++;
  }
  const meanReliability = evidence.reduce((a, e) => a + e.reliability, 0) / evidence.length;
  return { items: evidence.length, meanReliability, stale, undated };
}

export const fmtPct = (v: number, digits = 1, signed = false) => `${signed && v > 0 ? "+" : ""}${(v * 100).toFixed(digits)}%`;
export const fmtNum = (v: number, digits = 2) => v.toFixed(digits);
