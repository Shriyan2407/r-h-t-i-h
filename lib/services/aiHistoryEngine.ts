/* ═══════════════════════════════════════════════════════════════
   R.H.T.I.H — AI Company History Engine
   Uses Claude to generate REAL, company-specific institutional
   history for any NSE/BSE ticker not in the hardcoded archive.

   The generated history covers:
   - Actual IPO / founding era with real dates and prices
   - Real corporate milestones (acquisitions, mergers, pivots)
   - Actual crises, scandals, regulatory battles
   - Real stock price cycles (approximate ₹ levels)
   - Authentic institutional behavior at each event
   - Narrative evolution from founding to present
═══════════════════════════════════════════════════════════════ */

import { callClaude, extractJSON } from "./claudeService";
import type {
  StockHistoryProfile, TimelineEvent, NarrativeEra,
  SentimentDataPoint, EventSentiment, EventCategory,
} from "@/lib/stockHistory";

/* ── Fix common JSON issues from LLM output ─────────────────── */
function fixJSON(s: string): string {
  return s
    .replace(/,\s*\}/g, "}")
    .replace(/,\s*\]/g, "]")
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\n/g, " ")
    .trim();
}

/* ── Clamp to 0–100 ─────────────────────────────────────────── */
const clamp = (v: any) => Math.max(0, Math.min(100, Math.round(Number(v) || 50)));

/* ── Normalize & type-safe a raw Claude payload ─────────────── */
function normalizeProfile(
  d:        any,
  ticker:   string,
  company:  string,
  sector:   string,
  cap:      string,
  exchange: string,
): StockHistoryProfile {
  const VALID_SENT:  EventSentiment[] = ["BULLISH","BEARISH","NEUTRAL","MIXED"];
  const VALID_CAT:   EventCategory[]  = ["EARNINGS","MACRO","CORPORATE","REGULATORY","SOCIAL","TECHNICAL","FUNDRAISE","CONTROVERSY"];
  const ERA_COLORS   = ["#FFD700","#00FF9C","#38BDF8","#FFB800","#C084FC","#FF4D4D"];

  const timeline: TimelineEvent[] = (Array.isArray(d.timeline) ? d.timeline : []).map((e: any) => ({
    year:              Number(e.year) || 2020,
    month:             e.month ?? undefined,
    headline:          String(e.headline ?? "Company milestone"),
    context:           String(e.context ?? ""),
    marketReaction:    String(e.marketReaction ?? ""),
    institutionalRead: String(e.institutionalRead ?? ""),
    retailSentiment:   String(e.retailSentiment ?? ""),
    longTermImpact:    String(e.longTermImpact ?? ""),
    impactScore:       clamp(e.impactScore),
    sentiment:         VALID_SENT.includes(e.sentiment) ? e.sentiment : "NEUTRAL",
    category:          VALID_CAT.includes(e.category) ? e.category : "CORPORATE",
    institutionalConf: clamp(e.institutionalConf),
    retailExcitement:  clamp(e.retailExcitement),
    ltImportance:      clamp(e.ltImportance),
  })).sort((a: TimelineEvent, b: TimelineEvent) => a.year - b.year);

  const narrativeEvolution: NarrativeEra[] = (Array.isArray(d.narrativeEvolution) ? d.narrativeEvolution : []).map((e: any, i: number) => ({
    period:      String(e.period ?? `Era ${i + 1}`),
    title:       String(e.title ?? ""),
    description: String(e.description ?? ""),
    sentiment:   clamp(e.sentiment),
    dominant:    String(e.dominant ?? ""),
    color:       String(e.color ?? ERA_COLORS[i % ERA_COLORS.length]),
  }));

  const sentimentChart: SentimentDataPoint[] = (Array.isArray(d.sentimentChart) ? d.sentimentChart : []).map((e: any) => ({
    year:  Number(e.year) || 2020,
    score: clamp(e.score),
    label: String(e.label ?? ""),
  })).sort((a: SentimentDataPoint, b: SentimentDataPoint) => a.year - b.year);

  const CURR_SENT = VALID_SENT.includes(d.currentSentiment) ? d.currentSentiment : "NEUTRAL";

  return {
    ticker:             ticker.toUpperCase(),
    name:               String(d.name ?? company),
    sector:             String(d.sector ?? sector),
    cap:                String(d.cap ?? cap),
    exchange:           String(d.exchange ?? exchange),
    currentTrend:       String(d.currentTrend ?? "Trend analysis in progress"),
    currentSentiment:   CURR_SENT,
    oneLiner:           String(d.oneLiner ?? `${company} — institutional history archive`),
    timeline,
    narrativeEvolution,
    sentimentChart,
    smartMoneyAnalysis: String(d.smartMoneyAnalysis ?? ""),
    macroConnections:   String(d.macroConnections ?? ""),
    latestDevelopments: [],
    keyRisks:           Array.isArray(d.keyRisks) ? d.keyRisks.map(String) : [],
  };
}

/* ── System prompt ──────────────────────────────────────────── */
const HISTORY_SYSTEM = `You are an institutional-grade Indian equity historian for R.H.T.I.H (Real History Through Institutional Horizons).

You have encyclopedic knowledge of every NSE/BSE listed company:
- Real IPO dates, prices, over-subscription data
- Actual mergers, acquisitions, demergers with deal values in ₹ or $
- Real product and service launches that transformed businesses
- Genuine leadership changes, founder successions, CEO transitions
- Actual crises: debt defaults, accounting fraud, regulatory battles, competition disruption
- Real stock price cycles with approximate ₹ price levels
- Actual FII/DII/promoter holding changes during key events
- Real earnings inflection points and guidance history

CRITICAL RULES:
1. Every single event must be SPECIFIC to the named company — NEVER generic sector commentary
2. Include real names (founders, CEOs, deal counterparties), real years/months, real ₹ amounts
3. institutionalRead must explain what FIIs/MFs/smart money did and their SPECIFIC reasoning
4. If unsure of exact month, omit it — never guess a wrong month
5. Return ONLY valid JSON — zero markdown, zero text outside the JSON`;

/* ═══════════════════════════════════════════════════════════════
   PUBLIC API — generate complete company history via Claude
═══════════════════════════════════════════════════════════════ */

export async function generateAICompanyHistory(
  ticker:  string,
  quote:   any,
  summary: any,
  news:    any[],
): Promise<StockHistoryProfile> {
  const T       = ticker.toUpperCase();
  const company = quote?.longName ?? quote?.shortName ?? T;
  const sector  = quote?.sector ?? summary?.assetProfile?.sector ?? "Indian Equity";
  const exchange = quote?.exchange ?? "NSE";
  const mc      = quote?.marketCap;
  const cap     = !mc        ? "Unknown"
                : mc > 2e12  ? "Mega Cap"
                : mc > 5e11  ? "Large Cap"
                : mc > 1e11  ? "Mid Cap"
                              : "Small Cap";
  const price   = quote?.regularMarketPrice;
  const hi52    = quote?.fiftyTwoWeekHigh;
  const lo52    = quote?.fiftyTwoWeekLow;
  const desc    = (summary?.assetProfile?.longBusinessSummary ?? "").slice(0, 600);
  const foundedYear = summary?.assetProfile?.founded
    ?? summary?.assetProfile?.yearFounded
    ?? null;

  const prompt = `Generate a REAL, COMPANY-SPECIFIC institutional history archive for the following Indian listed company.

━━━━━ COMPANY INFO ━━━━━
TICKER:   ${T}
NAME:     ${company}
SECTOR:   ${sector}
EXCHANGE: ${exchange}
CAP:      ${cap}
PRICE:    ${price ? `₹${price.toFixed(0)}` : "N/A"}
52W:      ${lo52 ? `₹${lo52.toFixed(0)}` : "N/A"} – ${hi52 ? `₹${hi52.toFixed(0)}` : "N/A"}
FOUNDED:  ${foundedYear ?? "unknown — infer from company knowledge"}
BUSINESS: ${desc || "Indian listed company on NSE/BSE"}

━━━━━ WHAT TO GENERATE ━━━━━
Generate 10–13 REAL historical events for ${company}.

MANDATORY events to include (if applicable):
1. The ACTUAL IPO or original BSE/NSE listing — with real year, issue price, subscription level, market reaction
2. The company's FIRST major business transformation or expansion
3. REAL acquisitions or mergers — specific target companies, deal values
4. REAL leadership changes — founder succession, new CEO hires with their actual names
5. The WORST crisis this company ever faced — debt default, fraud, competition, or regulatory
6. REAL product or service launches that changed the business trajectory
7. How this company was SPECIFICALLY affected by a major macro event (2008 GFC, 2013 taper tantrum, 2016 demonetization, 2020 COVID)
8. The most recent major development (2023–2025)

QUALITY RULES (non-negotiable):
- Each event must be recognizable as ${company} ONLY — not a generic "IT sector event" or "banking sector event"
- Include real ₹ price levels for stock movements where possible
- institutionalRead must be specific: "FIIs reduced position by X% because Y" not "institutions were cautious"
- retailSentiment must reflect actual retail behavior: what they bought/sold and what they got wrong

━━━━━ JSON STRUCTURE ━━━━━
Return ONLY this JSON (no markdown, no preamble):

{
  "ticker": "${T}",
  "name": "${company}",
  "sector": "${sector}",
  "cap": "${cap}",
  "exchange": "${exchange}",
  "currentTrend": "Brief technical trend phrase",
  "currentSentiment": "BULLISH" or "BEARISH" or "NEUTRAL" or "MIXED",
  "oneLiner": "One sentence capturing ${company}'s complete evolution — must be uniquely about this company, not generic",
  "timeline": [
    {
      "year": 2010,
      "month": "Apr",
      "headline": "Specific event title — only makes sense for ${company}",
      "context": "3–4 sentences. Real facts: actual numbers, names, dates, deal values. NEVER generic.",
      "marketReaction": "Stock moved X% — from ₹Y to ₹Z. Include approximate price if known. Not just 'stock fell'.",
      "institutionalRead": "What specifically did FIIs/domestic MFs/smart money do and WHY. Include their reasoning and position-sizing logic.",
      "retailSentiment": "What retail investors did. What narrative dominated Twitter/social media. What they got wrong.",
      "longTermImpact": "How this event permanently changed ${company}'s business or valuation story.",
      "impactScore": 85,
      "sentiment": "BULLISH",
      "category": "CORPORATE",
      "institutionalConf": 80,
      "retailExcitement": 70,
      "ltImportance": 85
    }
  ],
  "narrativeEvolution": [
    {
      "period": "2005–2010",
      "title": "Era title specific to ${company}",
      "description": "2–3 sentences on how investors/analysts perceived ${company} in this era. What narrative drove the valuation multiple.",
      "sentiment": 65,
      "dominant": "The primary market narrative for ${company} during this era",
      "color": "#FFD700"
    }
  ],
  "sentimentChart": [
    { "year": 2010, "score": 65, "label": "${company}-specific 2-word label" }
  ],
  "smartMoneyAnalysis": "2–3 paragraphs on FII/DII/smart money behavior history specific to ${company}. Include actual ownership % changes if known. When did institutions accumulate? When did they exit? Why?",
  "macroConnections": "How macro factors (RBI policy, crude oil, USD/INR, US interest rates, global cycles) specifically affect ${company}'s business model and stock price. Company-specific transmission mechanisms, not generic.",
  "latestDevelopments": [],
  "keyRisks": [
    "Risk 1 — specific to ${company}'s business model",
    "Risk 2",
    "Risk 3",
    "Risk 4",
    "Risk 5"
  ]
}

FIELD CONSTRAINTS:
- category: must be one of "EARNINGS" | "MACRO" | "CORPORATE" | "REGULATORY" | "SOCIAL" | "TECHNICAL" | "FUNDRAISE" | "CONTROVERSY"
- sentiment: "BULLISH" | "BEARISH" | "NEUTRAL" | "MIXED"
- currentSentiment: "BULLISH" | "BEARISH" | "NEUTRAL" | "MIXED"
- sentimentChart: one data point per year from the IPO year (or max 15 years back) to 2025
- narrativeEvolution: 3–5 eras, each with a different color from: "#FFD700" "#00FF9C" "#38BDF8" "#FFB800" "#C084FC" "#FF4D4D"
- All scores (impactScore, institutionalConf, retailExcitement, ltImportance, sentiment in eras) are integers 0–100`;

  const raw     = await callClaude(prompt, HISTORY_SYSTEM);
  const jsonStr = extractJSON(raw);
  const data    = JSON.parse(fixJSON(jsonStr));
  return normalizeProfile(data, T, company, sector, cap, exchange);
}
