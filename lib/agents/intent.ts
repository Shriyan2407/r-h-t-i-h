/**
 * Turns a free-text question into a structured Intent. Deterministic keyword rules, not an LLM: the result is
 * reproducible, testable and cannot be steered by text pasted into the query.
 *
 * Asset resolution covers the NSE/BSE universe the data layer supports. A company we cannot resolve (for
 * example a US stock) is returned as `unresolvedAsset` so the committee can say so instead of guessing.
 */
import { STOCKS } from "@/lib/data/searchUniverse";
import { TICKER_PATTERN } from "@/lib/validation/ticker";
import type { Intent, IntentType } from "./schema";

/** Non-Indian names users commonly ask about. The data layer only covers NSE/BSE listings. */
const FOREIGN: Record<string, string> = {
  nvidia: "NVIDIA", nvda: "NVIDIA", tesla: "Tesla", tsla: "Tesla", apple: "Apple", aapl: "Apple",
  microsoft: "Microsoft", msft: "Microsoft", amazon: "Amazon", amzn: "Amazon", alphabet: "Alphabet", google: "Alphabet",
  googl: "Alphabet", netflix: "Netflix", nflx: "Netflix", berkshire: "Berkshire Hathaway", bitcoin: "Bitcoin", btc: "Bitcoin",
  "meta platforms": "Meta", facebook: "Meta",
};

/** Upper-case words that look like tickers but are ordinary finance vocabulary. */
const NOT_TICKERS = new Set([
  "I", "A", "AI", "ML", "BUY", "SELL", "HOLD", "NSE", "BSE", "IPO", "ETF", "PE", "EPS", "RSI", "MACD", "ROE", "ROCE", "FCF", "GDP",
  "CPI", "RBI", "FII", "DII", "SIP", "USD", "INR", "US", "UK", "EU", "CEO", "CFO", "YOY", "QOQ", "VIX", "NIFTY", "SENSEX", "OK", "IT",
  "VS", "TODAY", "NOW", "MY", "THE", "AND", "OR",
]);

interface NameKey { phrase: string; ticker: string }

function buildNameIndex(): NameKey[] {
  const firstWords = new Map<string, string[]>();
  for (const s of Object.values(STOCKS)) {
    const w = s.name.split(/\s+/)[0].toLowerCase();
    firstWords.set(w, [...(firstWords.get(w) ?? []), s.ticker]);
  }
  const keys: NameKey[] = [];
  for (const s of Object.values(STOCKS)) {
    keys.push({ phrase: s.name.toLowerCase(), ticker: s.ticker });
    if (s.short) keys.push({ phrase: s.short.toLowerCase(), ticker: s.ticker });
    const first = s.name.split(/\s+/)[0].toLowerCase();
    // A company's first word ("Reliance", "Infosys") is used only when no other company shares it ("Tata").
    if (first.length >= 4 && firstWords.get(first)?.length === 1) keys.push({ phrase: first, ticker: s.ticker });
    for (const a of s.aliases) if (a.includes(" ") && a.length >= 6) keys.push({ phrase: a.toLowerCase(), ticker: s.ticker });
  }
  // Longest phrase first, so "hdfc bank" wins over "hdfc".
  return keys.sort((a, b) => b.phrase.length - a.phrase.length);
}

let NAME_INDEX: NameKey[] | null = null;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasWord = (text: string, phrase: string) => new RegExp(`(?:^|[^a-z0-9])${escapeRe(phrase)}(?:$|[^a-z0-9])`).test(text);

export interface ResolvedAssets { tickers: string[]; unresolved: string | null }

export function resolveAssets(query: string): ResolvedAssets {
  const lower = query.toLowerCase();
  const found: string[] = [];
  const add = (t: string) => { if (!found.includes(t)) found.push(t); };

  for (const tok of query.match(/\b[A-Za-z0-9&-]{1,20}\b/g) ?? []) {
    const up = tok.toUpperCase();
    if (STOCKS[up] && (tok === up || tok.length >= 4)) add(up);
  }
  NAME_INDEX ??= buildNameIndex();
  let rest = lower;
  for (const k of NAME_INDEX) {
    if (hasWord(rest, k.phrase)) {
      add(k.ticker);
      rest = rest.replace(new RegExp(escapeRe(k.phrase), "g"), " ");
    }
  }

  let unresolved: string | null = null;
  for (const [key, name] of Object.entries(FOREIGN)) if (hasWord(lower, key)) { unresolved = name; break; }

  // An upper-case ticker-like word outside the static universe is kept as a candidate; the data layer verifies it.
  if (found.length === 0 && !unresolved) {
    for (const tok of query.match(/\b[A-Z][A-Z0-9&-]{1,19}\b/g) ?? []) {
      if (!NOT_TICKERS.has(tok) && TICKER_PATTERN.test(tok)) { add(tok); break; }
    }
  }
  return { tickers: found, unresolved };
}

const RULES: Array<[IntentType, RegExp]> = [
  ["portfolio_construction", /\b(build|construct|create|design|make|suggest)\b.*\bportfolio\b|\ballocat(e|ion)\b|\bdiversif(y|ied)\b.*\bacross\b/],
  ["portfolio_review", /\bmy (portfolio|holdings|stocks|investments)\b|\bportfolio\b/],
  ["explain_move", /\bwhy\b.*\b(fall|fell|falling|drop|dropped|dropping|down|rise|rose|rising|up|move|moved|moving|rally|rallied|crash|crashed|surge|surged|jump|jumped|plunge|plunged|spike|spiked|tank|tanked)\b/],
  ["valuation", /\b(overvalued|undervalued|valuation|fair value|intrinsic value|expensive|cheap|worth|priced in)\b/],
  ["risk_assessment", /\b(risk|risky|safe|safety|downside|drawdown|volatil\w*|var)\b/],
  ["investment_decision", /\b(buy|sell|hold|invest|should i|add|exit|accumulate|enter|analy[sz]e|analysis|thesis|research|outlook|view on|good stock)\b/],
];

export function classifyIntent(query: string, hasAsset: boolean): IntentType {
  const q = query.toLowerCase();
  for (const [intent, re] of RULES) {
    if (!re.test(q)) continue;
    // Asset-specific intents need an asset; without one the question is about the market or the user's portfolio.
    if (!hasAsset && (intent === "explain_move" || intent === "valuation" || intent === "investment_decision")) continue;
    if (intent === "risk_assessment" && !hasAsset && !/\bportfolio\b/.test(q)) continue;
    return intent;
  }
  return hasAsset ? "investment_decision" : "general_research";
}

export function parseHorizon(q: string): Intent["horizon"] {
  const s = q.toLowerCase();
  if (/\b(long[- ]term|years|decade|retire\w*|\d{1,2}\s*-?\s*years?|wealth)\b/.test(s)) return "long";
  if (/\b(medium[- ]term|months|this year|next year|one year|1\s*year|12 months)\b/.test(s)) return "medium";
  if (/\b(today|tomorrow|this week|short[- ]term|swing|intraday|right now|next few (days|weeks)|quick)\b/.test(s)) return "short";
  return "unknown";
}

export function parseRiskProfile(q: string): Intent["riskProfile"] {
  const s = q.toLowerCase();
  if (/\b(conservative|low[- ]risk|safe|capital preservation|cautious)\b/.test(s)) return "conservative";
  if (/\b(aggressive|high[- ]risk|risk[- ]seeking)\b/.test(s)) return "aggressive";
  if (/\b(moderate|balanced|medium[- ]risk)\b/.test(s)) return "moderate";
  return "unknown";
}

export function parseScenario(q: string): Intent["scenario"] {
  const s = q.toLowerCase();
  if (/\brecession|slowdown|downturn\b/.test(s)) return "recession";
  if (/\b(rate (hike|shock|rise|increase)|rates? (go|going) up|higher rates)\b/.test(s)) return "rate_shock";
  if (/\b(crash|bear market|sell-?off|correction)\b/.test(s)) return "market_crash";
  if (/\binflation\b/.test(s)) return "inflation";
  return "none";
}

export const MAX_QUERY_LENGTH = 500;

export function parseIntent(rawQuery: string): Intent {
  const query = rawQuery.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
  const { tickers, unresolved } = resolveAssets(query);
  const intent = classifyIntent(query, tickers.length > 0 || unresolved !== null);
  return {
    query,
    intent,
    ticker: intent === "portfolio_construction" || intent === "portfolio_review" ? null : (tickers[0] ?? null),
    unresolvedAsset: tickers.length === 0 ? unresolved : null,
    tickers,
    horizon: parseHorizon(query),
    riskProfile: parseRiskProfile(query),
    scenario: parseScenario(query),
  };
}
