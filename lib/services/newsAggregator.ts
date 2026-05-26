/* ═══════════════════════════════════════════════════════════════
   R.H.T.I.H — Real News Aggregation Service
   Sources: Indian Finance RSS feeds + Finnhub + NewsAPI
   No scraping — all public RSS/API endpoints
═══════════════════════════════════════════════════════════════ */

import { cache, TTL } from "./cache";

export interface NewsItem {
  title:       string;
  summary:     string;
  url:         string;
  source:      string;
  publishedAt: string;      // ISO string
  ageHours:    number;      // hours since published
  relevance:   number;      // 0-1, how relevant to searched ticker
  sentiment:   "positive" | "negative" | "neutral";
}

/* ── RSS Feed Definitions ───────────────────────────────── */

const RSS_FEEDS = [
  {
    name:  "Economic Times Markets",
    url:   "https://economictimes.indiatimes.com/markets/stocks/rss/39457592.cms",
    weight: 1.0,
  },
  {
    name:  "Economic Times Companies",
    url:   "https://economictimes.indiatimes.com/markets/rss/39457594.cms",
    weight: 0.9,
  },
  {
    name:  "Business Standard Markets",
    url:   "https://www.business-standard.com/rss/markets-106.rss",
    weight: 0.9,
  },
  {
    name:  "Moneycontrol Business",
    url:   "https://www.moneycontrol.com/rss/business.xml",
    weight: 0.85,
  },
  {
    name:  "Livemint Markets",
    url:   "https://www.livemint.com/rss/markets/",
    weight: 0.85,
  },
  {
    name:  "NDTV Profit",
    url:   "https://feeds.feedburner.com/ndtv/TJbO",
    weight: 0.8,
  },
];

/* ── Simple RSS XML Parser ──────────────────────────────── */

interface RawRSSItem {
  title:   string;
  link:    string;
  pubDate: string;
  description: string;
  source:  string;
}

function extractTag(xml: string, tag: string): string {
  // Handle CDATA sections
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[(.*?)\\]\\]></${tag}>`, "is"));
  if (cdataMatch) return cdataMatch[1].trim();
  // Handle regular tags
  const match = xml.match(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "is"));
  return match ? match[1].replace(/<[^>]+>/g, "").trim() : "";
}

async function parseRSSFeed(feed: { name: string; url: string }): Promise<RawRSSItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; R.H.T.I.H-News-Bot/1.0; +https://rhtih.in)",
        "Accept":     "application/rss+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];
    const xml = await res.text();

    const items: RawRSSItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null) {
      const item = match[1];
      const title = extractTag(item, "title");
      const link  = extractTag(item, "link") || extractTag(item, "guid");
      const date  = extractTag(item, "pubDate") || extractTag(item, "dc:date");
      const desc  = extractTag(item, "description");

      if (title.length > 10) {
        items.push({ title, link, pubDate: date, description: desc.slice(0, 300), source: feed.name });
      }
    }

    return items.slice(0, 30);
  } catch {
    return [];
  }
}

/* ── Sentiment Detection ────────────────────────────────── */

const POSITIVE_KEYWORDS = [
  "surge", "rally", "gain", "rise", "up", "beat", "strong", "record", "high", "profit",
  "growth", "buyback", "dividend", "acquisition", "upgrade", "outperform", "breakthrough",
  "order", "win", "expansion", "milestone", "approve", "launch", "good", "best",
];

const NEGATIVE_KEYWORDS = [
  "fall", "drop", "decline", "down", "loss", "miss", "weak", "low", "probe", "fraud",
  "debt", "cut", "reduce", "downgrade", "underperform", "concern", "risk", "warn",
  "default", "penalty", "fine", "investigation", "ban", "reject", "fail", "crash",
];

function detectSentiment(text: string): "positive" | "negative" | "neutral" {
  const lower = text.toLowerCase();
  const pos = POSITIVE_KEYWORDS.filter(k => lower.includes(k)).length;
  const neg = NEGATIVE_KEYWORDS.filter(k => lower.includes(k)).length;
  if (pos > neg + 1) return "positive";
  if (neg > pos + 1) return "negative";
  return "neutral";
}

/* ── Relevance Scoring ──────────────────────────────────── */

function scoreRelevance(text: string, ticker: string): number {
  const lower = text.toLowerCase();
  const t     = ticker.toLowerCase();
  let score   = 0;

  // Direct ticker mention
  if (lower.includes(t))                score += 0.6;
  // Company name partial match
  if (lower.includes(t.slice(0, 5)))    score += 0.2;
  // Indian market keywords
  if (lower.includes("nse"))            score += 0.1;
  if (lower.includes("bse"))            score += 0.1;
  if (lower.includes("nifty"))          score += 0.05;
  if (lower.includes("sensex"))         score += 0.05;

  return Math.min(score, 1.0);
}

/* ── Finnhub News (with API key) ────────────────────────── */

async function fetchFinnhubNews(ticker: string): Promise<RawRSSItem[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];

  try {
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const to   = new Date().toISOString().split("T")[0];

    const url = `https://finnhub.io/api/v1/company-news?symbol=${ticker}.NS&from=${from}&to=${to}&token=${apiKey}`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];

    const data: Array<{ headline: string; url: string; datetime: number; summary: string; source: string }> = await res.json();

    return (data ?? []).slice(0, 25).map(d => ({
      title:       d.headline,
      link:        d.url,
      pubDate:     new Date(d.datetime * 1000).toUTCString(),
      description: d.summary?.slice(0, 300) ?? "",
      source:      `Finnhub / ${d.source}`,
    }));
  } catch {
    return [];
  }
}

/* ── NewsAPI (with API key) ─────────────────────────────── */

async function fetchNewsAPI(ticker: string, companyName?: string): Promise<RawRSSItem[]> {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) return [];

  try {
    const query = encodeURIComponent(`${ticker} NSE India stock`);
    const url = `https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&language=en&pageSize=20&apiKey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];

    const data = await res.json();
    return (data.articles ?? []).map((a: any) => ({
      title:       a.title,
      link:        a.url,
      pubDate:     a.publishedAt,
      description: a.description?.slice(0, 300) ?? "",
      source:      `NewsAPI / ${a.source?.name ?? "Unknown"}`,
    }));
  } catch {
    return [];
  }
}

/* ── Main Aggregator ────────────────────────────────────── */

export async function getStockNews(ticker: string, companyName?: string): Promise<NewsItem[]> {
  const cacheKey = `news:${ticker}`;
  return cache.wrap(cacheKey, TTL.NEWS, async () => {
    // Fetch in parallel — RSS feeds + premium APIs
    const [rssResults, finnhubResults, newsApiResults] = await Promise.all([
      Promise.all(RSS_FEEDS.map(f => parseRSSFeed(f))),
      fetchFinnhubNews(ticker),
      fetchNewsAPI(ticker, companyName),
    ]);

    // Flatten all raw items
    const allRaw: (RawRSSItem & { sourceFeedIdx?: number })[] = [
      ...rssResults.flatMap((items, idx) => items.map(i => ({ ...i, sourceFeedIdx: idx }))),
      ...finnhubResults,
      ...newsApiResults,
    ];

    // Deduplicate by title similarity
    const seen = new Set<string>();
    const deduplicated = allRaw.filter(item => {
      const key = item.title.slice(0, 60).toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Score relevance and filter
    const scored = deduplicated
      .map(item => {
        const relevance = Math.max(
          scoreRelevance(item.title,       ticker),
          scoreRelevance(item.description, ticker),
          // Give minimum relevance to all items (general market news)
          0.15,
        );

        const pubDate   = new Date(item.pubDate);
        const ageHours  = isNaN(pubDate.getTime())
          ? 48
          : (Date.now() - pubDate.getTime()) / 3_600_000;

        return {
          title:       item.title,
          summary:     item.description,
          url:         item.link,
          source:      item.source,
          publishedAt: isNaN(pubDate.getTime()) ? new Date().toISOString() : pubDate.toISOString(),
          ageHours:    Math.round(ageHours * 10) / 10,
          relevance,
          sentiment:   detectSentiment(item.title + " " + item.description),
        } satisfies NewsItem;
      })
      // Filter out very old news (> 60 days)
      .filter(item => item.ageHours < 24 * 60)
      // Sort: relevance first, then recency
      .sort((a, b) =>
        (b.relevance * 100 + (100 - Math.min(b.ageHours, 100))) -
        (a.relevance * 100 + (100 - Math.min(a.ageHours, 100)))
      );

    return scored.slice(0, 40);
  });
}

/** Get market-wide news (no ticker filter) */
export async function getMarketNews(): Promise<NewsItem[]> {
  return cache.wrap("news:market", TTL.NEWS, async () => {
    const rssResults = await Promise.all(RSS_FEEDS.slice(0, 4).map(f => parseRSSFeed(f)));
    const allRaw = rssResults.flat();

    const seen = new Set<string>();
    return allRaw
      .filter(item => {
        const key = item.title.slice(0, 60).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 50)
      .map(item => {
        const pubDate  = new Date(item.pubDate);
        const ageHours = isNaN(pubDate.getTime()) ? 24 : (Date.now() - pubDate.getTime()) / 3_600_000;
        return {
          title:       item.title,
          summary:     item.description,
          url:         item.link,
          source:      item.source,
          publishedAt: isNaN(pubDate.getTime()) ? new Date().toISOString() : pubDate.toISOString(),
          ageHours:    Math.round(ageHours * 10) / 10,
          relevance:   0.5,
          sentiment:   detectSentiment(item.title),
        } satisfies NewsItem;
      })
      .sort((a, b) => a.ageHours - b.ageHours);
  });
}
