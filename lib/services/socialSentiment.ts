/* ═══════════════════════════════════════════════════════════════
   EquityLens — Social Sentiment Intelligence
   Sources: Reddit (public JSON API — no auth needed)
            StockTwits (free read access)
   All fetches are server-side (no CORS issues)
═══════════════════════════════════════════════════════════════ */

import { TTL } from "./cache";
import { isUsable, sharedWrap } from "@/lib/cache/shared";

export interface RedditPost {
  title:     string;
  body:      string;
  subreddit: string;
  score:     number;
  comments:  number;
  url:       string;
  age:       string;
  ageHours:  number;
  sentiment: "bullish" | "bearish" | "neutral";
}

export interface StockTwit {
  body:      string;
  sentiment: "Bullish" | "Bearish" | null;
  createdAt: string;
  likes:     number;
}

export interface SentimentReport {
  ticker:            string;
  overallScore:      number;         // 0 (bearish) → 100 (bullish)
  overallSentiment:  "BULLISH" | "BEARISH" | "NEUTRAL" | "MIXED";
  bullishCount:      number;
  bearishCount:      number;
  neutralCount:      number;
  mentionVelocity:   "LOW" | "MODERATE" | "HIGH" | "EXTREME";
  totalMentions:     number;
  fomoSignal:        boolean;        // extreme bullish spike = FOMO
  fearSignal:        boolean;        // extreme bearish spike = fear
  redditPosts:       RedditPost[];
  stockTwits:        StockTwit[];
  topThemes:         string[];       // extracted discussion themes
  sentimentSummary:  string;         // human-readable summary
}

/* ── SENTIMENT KEYWORDS ─────────────────────────────────── */

const BULL_WORDS = [
  "buy", "bullish", "long", "calls", "moon", "rocket", "great", "strong",
  "accumulate", "undervalued", "dip", "breakout", "target", "hold", "upside",
  "positive", "rally", "surge", "beat", "outperform", "multibagger", "gem",
];

const BEAR_WORDS = [
  "sell", "bearish", "short", "puts", "crash", "dump", "overvalued", "avoid",
  "risk", "caution", "fraud", "scam", "manipulation", "downside", "breakdown",
  "negative", "fall", "loss", "miss", "disappoint", "exit", "trap",
];

function classifySentiment(text: string): "bullish" | "bearish" | "neutral" {
  const lower = text.toLowerCase();
  const bull  = BULL_WORDS.filter(w => lower.includes(w)).length;
  const bear  = BEAR_WORDS.filter(w => lower.includes(w)).length;
  if (bull > bear + 1) return "bullish";
  if (bear > bull + 1) return "bearish";
  return "neutral";
}

function ageLabel(createdUtc: number): { label: string; hours: number } {
  const hours = (Date.now() / 1000 - createdUtc) / 3600;
  if (hours < 1)  return { label: `${Math.round(hours * 60)}m ago`, hours };
  if (hours < 24) return { label: `${Math.round(hours)}h ago`,      hours };
  return { label: `${Math.round(hours / 24)}d ago`,                  hours };
}

/* ── REDDIT PUBLIC API ──────────────────────────────────── */

const INDIAN_SUBS = [
  "IndiaInvestments",
  "IndianStockMarket",
  "IndiaStock",
  "NSEIndia",
  "dalal_street_investments",
];

async function fetchRedditSubreddit(sub: string, ticker: string): Promise<any[]> {
  try {
    const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(ticker)}&sort=new&limit=25&t=month&restrict_sr=true`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "EquityLens/1.0 (stock research)",
        "Accept":     "application/json",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data?.children ?? [];
  } catch {
    return [];
  }
}

async function fetchRedditGlobal(ticker: string): Promise<any[]> {
  try {
    const query = `${ticker} NSE India stock`;
    const url   = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=20&t=month&type=link`;
    const res   = await fetch(url, {
      headers: {
        "User-Agent": "EquityLens/1.0",
        "Accept":     "application/json",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data?.children ?? [];
  } catch {
    return [];
  }
}

async function getRedditPosts(ticker: string): Promise<RedditPost[]> {
  const allChildren = await Promise.all([
    ...INDIAN_SUBS.map(s => fetchRedditSubreddit(s, ticker)),
    fetchRedditGlobal(ticker),
  ]);

  const seen  = new Set<string>();
  const posts: RedditPost[] = [];

  for (const children of allChildren) {
    for (const child of children) {
      const p   = child?.data;
      if (!p?.title || seen.has(p.id)) continue;
      seen.add(p.id);

      const { label, hours } = ageLabel(p.created_utc ?? 0);
      if (hours > 24 * 30) continue; // skip > 30 days

      const text = `${p.title} ${p.selftext ?? ""}`;
      posts.push({
        title:     p.title,
        body:      (p.selftext ?? "").slice(0, 400),
        subreddit: p.subreddit,
        score:     p.score ?? 0,
        comments:  p.num_comments ?? 0,
        url:       `https://reddit.com${p.permalink}`,
        age:       label,
        ageHours:  hours,
        sentiment: classifySentiment(text),
      });
    }
  }

  // Sort by score + recency
  return posts
    .sort((a, b) => (b.score + 100) / (b.ageHours + 1) - (a.score + 100) / (a.ageHours + 1))
    .slice(0, 30);
}

/* ── STOCKTWITS ─────────────────────────────────────────── */

async function getStockTwits(ticker: string): Promise<StockTwit[]> {
  try {
    const token   = process.env.STOCKTWITS_TOKEN;
    const url     = token
      ? `https://api.stocktwits.com/api/2/streams/ticker/${ticker}.json?access_token=${token}`
      : `https://api.stocktwits.com/api/2/streams/ticker/${ticker}.json`;

    const res = await fetch(url, {
      headers: { "User-Agent": "EquityLens/1.0" },
      signal:  AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    return (data?.messages ?? []).slice(0, 30).map((m: any) => ({
      body:      m.body ?? "",
      sentiment: m.entities?.sentiment?.basic ?? null,
      createdAt: m.created_at ?? "",
      likes:     m.likes?.total ?? 0,
    }));
  } catch {
    return [];
  }
}

/* ── THEME EXTRACTOR ────────────────────────────────────── */

const THEME_PATTERNS: [RegExp, string][] = [
  [/\b(earnings|results|profit|revenue)\b/i,         "Earnings Discussion"],
  [/\b(buy|accumulate|invest|long)\b/i,               "Buy Interest"],
  [/\b(sell|exit|short|dump)\b/i,                     "Sell Pressure"],
  [/\b(ipo|fpo|listing|unlisted)\b/i,                 "IPO Activity"],
  [/\b(promoter|insider|stake)\b/i,                   "Insider Activity"],
  [/\b(fii|dii|institutional|foreign)\b/i,            "Institutional Flows"],
  [/\b(technical|chart|breakout|support|resistance)\b/i,"Technical Analysis"],
  [/\b(dividend|buyback|bonus)\b/i,                   "Corporate Actions"],
  [/\b(debt|leverage|credit)\b/i,                     "Debt / Credit"],
  [/\b(macro|rbi|rate|inflation|economy)\b/i,         "Macro Impact"],
  [/\b(scam|fraud|manipulation|operator)\b/i,         "Risk / Controversy"],
  [/\b(multibagger|target|return)\b/i,                "Return Expectations"],
];

function extractThemes(posts: RedditPost[], twits: StockTwit[]): string[] {
  const allText = [
    ...posts.map(p => `${p.title} ${p.body}`),
    ...twits.map(t => t.body),
  ].join(" ");

  const themes = new Set<string>();
  for (const [pattern, label] of THEME_PATTERNS) {
    if (pattern.test(allText)) themes.add(label);
  }
  return [...themes].slice(0, 6);
}

/* ── SENTIMENT AGGREGATOR ───────────────────────────────── */

export async function getSocialSentiment(ticker: string): Promise<SentimentReport> {
  return sharedWrap("sentiment", ticker, TTL.SENTIMENT, async () => {
    const [redditPosts, stockTwits] = await Promise.all([
      getRedditPosts(ticker),
      getStockTwits(ticker),
    ]);

    // Count sentiments across both sources
    const bull = [
      ...redditPosts.filter(p => p.sentiment === "bullish"),
      ...stockTwits.filter(t => t.sentiment === "Bullish"),
    ].length;

    const bear = [
      ...redditPosts.filter(p => p.sentiment === "bearish"),
      ...stockTwits.filter(t => t.sentiment === "Bearish"),
    ].length;

    const total = redditPosts.length + stockTwits.length;
    const neutral = total - bull - bear;

    // Score: weighted 0-100
    const raw = total > 0 ? ((bull - bear * 0.8) / total) * 100 : 0;
    const overallScore = Math.round(Math.max(0, Math.min(100, 50 + raw * 0.5)));

    const overallSentiment =
      overallScore >= 68 ? "BULLISH"  :
      overallScore <= 32 ? "BEARISH"  :
      Math.abs(bull - bear) < 3 ? "NEUTRAL" : "MIXED";

    // Velocity: how many mentions relative to typical
    const velocity: SentimentReport["mentionVelocity"] =
      total > 60 ? "EXTREME" :
      total > 30 ? "HIGH"    :
      total > 10 ? "MODERATE": "LOW";

    // FOMO / Fear signals
    const recentBull = redditPosts.filter(p => p.ageHours < 24 && p.sentiment === "bullish").length;
    const recentBear = redditPosts.filter(p => p.ageHours < 24 && p.sentiment === "bearish").length;
    const fomoSignal = recentBull > 10 && overallScore > 70;
    const fearSignal = recentBear > 8  && overallScore < 35;

    const topThemes = extractThemes(redditPosts, stockTwits);

    const sentimentSummary = buildSentimentSummary(ticker, {
      overallScore, overallSentiment,
      bullishCount: bull, bearishCount: bear, neutralCount: neutral,
      mentionVelocity: velocity, total, fomoSignal, fearSignal, topThemes,
    });

    return {
      ticker,
      overallScore,
      overallSentiment,
      bullishCount:    bull,
      bearishCount:    bear,
      neutralCount:    neutral,
      mentionVelocity: velocity,
      totalMentions:   total,
      fomoSignal,
      fearSignal,
      redditPosts:     redditPosts.slice(0, 15),
      stockTwits:      stockTwits.slice(0, 15),
      topThemes,
      sentimentSummary,
    } satisfies SentimentReport;
  }, isUsable);
}

function buildSentimentSummary(
  ticker: string,
  data: { overallScore:number; overallSentiment:string; bullishCount:number; bearishCount:number; neutralCount:number; mentionVelocity:string; total:number; fomoSignal:boolean; fearSignal:boolean; topThemes:string[] },
): string {
  const { overallSentiment, bullishCount, bearishCount, mentionVelocity, fomoSignal, fearSignal, topThemes, total } = data;

  if (total < 5) {
    return `${ticker} has minimal social media activity. Retail interest is low — typical for this ticker in current market conditions.`;
  }

  const tone = overallSentiment === "BULLISH"  ? "predominantly bullish"  :
               overallSentiment === "BEARISH"  ? "predominantly bearish"  :
               overallSentiment === "NEUTRAL"  ? "neutral to mixed"       : "split between bulls and bears";

  let summary = `Social media sentiment for ${ticker} is ${tone} with ${total} active discussions tracked. `;
  summary    += `${bullishCount} bullish vs ${bearishCount} bearish mentions. `;
  summary    += `Mention velocity is ${mentionVelocity.toLowerCase()}. `;

  if (fomoSignal) summary += `WARNING: Unusual bullish spike detected in the last 24 hours — potential FOMO/retail chase behavior. Contrarian caution warranted. `;
  if (fearSignal) summary += `NOTE: Fear spike detected — elevated panic selling discussion, which can signal forced selling bottoms for fundamentally sound stocks. `;

  if (topThemes.length > 0) {
    summary += `Main discussion themes: ${topThemes.join(", ")}.`;
  }

  return summary.trim();
}
