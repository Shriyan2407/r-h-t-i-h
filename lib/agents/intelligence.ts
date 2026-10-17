/**
 * Agent 4 — Intelligence & Sentiment Analyst.
 *
 * Works only from dated, sourced headlines returned by the news aggregator. Each item becomes evidence with its
 * publisher, link, timestamp and a publisher-tier reliability. What it does not do:
 *   - call a headline the cause of a price move (it is "possibly related")
 *   - call anything "breaking" (it reports the age in hours)
 *   - report insider trades, institutional flows or an events calendar: no feed for them is connected
 *   - let headline text act as instructions: it is sanitized, and instruction-like items are quarantined
 *
 * Tone comes from the aggregator's keyword classifier, so it is labelled "keyword tone", and headlines alone can
 * move the view at most to lean_bullish / lean_bearish.
 */
import type { NewsItem } from "@/lib/services/newsAggregator";
import { noDataOutput, type AgentOutput, type InvestmentAgent } from "./agent";
import type { ResearchContext } from "./context";
import { newsReliability, type EvidenceLog } from "./evidence";
import type { Claim, View } from "./schema";
import { looksLikeInjection, safeUrl, sanitizeExternalText } from "./untrusted";

export const CATALYST_TYPES: Array<[string, RegExp]> = [
  ["earnings", /\b(results?|quarterly|q[1-4]|earnings|net profit|revenue|ebitda|guidance)\b/i],
  ["corporate action", /\b(dividend|buyback|bonus|split|rights issue|record date)\b/i],
  ["deal", /\b(acquir\w*|acquisition|merger|stake|partnership|joint venture|order|contract|deal)\b/i],
  ["regulatory", /\b(sebi|rbi|penalty|probe|investigation|ban|licen[cs]e|court|tax demand|show[- ]cause|notice|compliance)\b/i],
  ["analyst rating", /\b(upgrade[sd]?|downgrade[sd]?|target price|rating|outperform|underperform|overweight|underweight)\b/i],
  ["management", /\b(ceo|cfo|md|chairman|resign\w*|appoint\w*|board)\b/i],
  ["product", /\b(launch\w*|unveil\w*|rollout|new product|capacity)\b/i],
];

export const MAX_AGE_HOURS = 14 * 24;
const MIN_RELEVANCE = 0.3;

export interface IntelItem {
  evidenceId: string;
  claim: string;
  source: string;
  url?: string;
  timestamp: string;
  ageHours: number;
  impact: "positive" | "negative" | "neutral";
  reliability: number;
  catalyst: string | null;
}

export interface IntelligenceDetails {
  items: IntelItem[];
  tone: { positive: number; negative: number; neutral: number; balance: number | null; method: string };
  catalysts: Array<{ type: string; evidenceId: string }>;
  quarantined: number;
  unavailable: string[];
}

export function catalystOf(title: string): string | null {
  for (const [type, re] of CATALYST_TYPES) if (re.test(title)) return type;
  return null;
}

const normTitle = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

/** Recent, relevant, de-duplicated headlines, most relevant and recent first. */
export function selectHeadlines(news: readonly NewsItem[], limit = 10): { kept: NewsItem[]; quarantined: number } {
  const seen = new Set<string>();
  let quarantined = 0;
  const kept: NewsItem[] = [];
  const ranked = [...news]
    .filter((n) => n.ageHours >= 0 && n.ageHours <= MAX_AGE_HOURS && n.relevance >= MIN_RELEVANCE)
    .sort((a, b) => b.relevance - a.relevance || a.ageHours - b.ageHours);
  for (const n of ranked) {
    if (looksLikeInjection(`${n.title} ${n.summary ?? ""}`)) { quarantined++; continue; }
    const key = normTitle(n.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    kept.push(n);
    if (kept.length >= limit) break;
  }
  return { kept, quarantined };
}

export const UNAVAILABLE_FEEDS = [
  "Insider trading disclosures (DATA_UNAVAILABLE: no feed connected)",
  "Institutional (FII/DII) flows for this stock (DATA_UNAVAILABLE)",
  "Earnings and events calendar (DATA_UNAVAILABLE)",
];

async function analyze(ctx: ResearchContext, ticker: string, ev: EvidenceLog): Promise<AgentOutput<IntelligenceDetails | null>> {
  const d = await ctx.news(ticker);
  if (!d.value) return noDataOutput(`No recent headlines mentioning ${ticker} were found.`, [`${ticker} news (${d.status})`, ...UNAVAILABLE_FEEDS]);
  const { kept, quarantined } = selectHeadlines(d.value);
  if (kept.length === 0) {
    return noDataOutput(`No relevant headlines about ${ticker} from the last 14 days${quarantined ? ` (${quarantined} quarantined as instruction-like)` : ""}.`, UNAVAILABLE_FEEDS);
  }

  const items: IntelItem[] = [];
  const claims: Claim[] = [];
  const catalysts: IntelligenceDetails["catalysts"] = [];
  let pos = 0, neg = 0, neu = 0, weighted = 0, weights = 0;
  for (const n of kept) {
    const title = sanitizeExternalText(n.title, 200);
    const source = sanitizeExternalText(n.source, 80);
    const reliability = newsReliability(source);
    const id = ev.add({ kind: "news", label: `Headline (${source})`, value: title, display: `"${title}"`, source, url: safeUrl(n.url), asOf: n.publishedAt, reliability });
    const impact = n.sentiment;
    const cat = catalystOf(title);
    items.push({ evidenceId: id, claim: title, source, url: safeUrl(n.url), timestamp: n.publishedAt, ageHours: Math.round(n.ageHours), impact, reliability, catalyst: cat });
    if (cat) catalysts.push({ type: cat, evidenceId: id });
    if (impact === "positive") pos++; else if (impact === "negative") neg++; else neu++;
    const s = impact === "positive" ? 1 : impact === "negative" ? -1 : 0;
    weighted += s * reliability;
    weights += reliability;
    claims.push({
      text: `${source} reported "${title}" ${Math.round(n.ageHours)} hours ago [${id}]; possibly related, not verified as a cause.`,
      evidenceIds: [id],
      direction: impact,
    });
  }
  const balance = weights > 0 ? weighted / weights : null;
  // Headlines can tilt the view, never carry it: at least 3 items and a clear balance are needed, and the cap is "lean".
  const view: View = balance === null || kept.length < 3 ? "neutral" : balance >= 0.4 ? "lean_bullish" : balance <= -0.4 ? "lean_bearish" : "neutral";
  const freshest = Math.min(...kept.map((n) => n.ageHours));
  const meanRel = items.reduce((a, i) => a + i.reliability, 0) / items.length;
  const negCats = items.filter((i) => i.impact === "negative" && i.catalyst).map((i) => `${i.catalyst}: "${i.claim}" [${i.evidenceId}]`);
  const posCats = items.filter((i) => i.impact !== "negative" && i.catalyst).map((i) => `${i.catalyst}: "${i.claim}" [${i.evidenceId}]`);

  return {
    status: "success",
    conclusion: `${kept.length} relevant headlines in the last 14 days (${pos} positive, ${neg} negative, ${neu} neutral by keyword tone); newest is ${Math.round(freshest)} hours old.`,
    view,
    // Coverage: up to 5 items count as full coverage; scaled by the mean publisher reliability.
    confidence: Math.round(Math.min(1, kept.length / 5) * meanRel * 100) / 100,
    claims,
    metrics: { headlines: kept.length, positive: pos, negative: neg, neutral: neu, toneBalance: balance, newestAgeHours: Math.round(freshest), quarantined },
    risks: [...negCats, ...(quarantined ? [`${quarantined} retrieved item(s) contained instruction-like text and were quarantined.`] : [])],
    catalysts: posCats,
    disagreements: [],
    missingData: UNAVAILABLE_FEEDS,
    reasoningSummary: "Headlines matched to the company by name; tone is the aggregator's keyword classification weighted by publisher reliability. Matching shows co-occurrence in time, not causation.",
    details: {
      items,
      tone: { positive: pos, negative: neg, neutral: neu, balance, method: "keyword tone from the news aggregator, weighted by publisher-tier reliability" },
      catalysts,
      quarantined,
      unavailable: UNAVAILABLE_FEEDS,
    },
  };
}

export const intelligenceAgent: InvestmentAgent<IntelligenceDetails | null> = {
  id: "intelligence",
  async analyze(ctx, _prior, ev) {
    const subject = await ctx.subject();
    if (subject.kind !== "asset") return noDataOutput("News analysis needs a single stock.", ["a stock to search news for"]);
    return analyze(ctx, subject.ticker, ev);
  },
};
