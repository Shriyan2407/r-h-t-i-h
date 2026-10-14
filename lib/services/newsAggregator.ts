/* ═══════════════════════════════════════════════════════════════
   EquityLens — Real News Aggregation Service
   Sources: Google News RSS + Indian Finance RSS feeds + Finnhub + NewsAPI
   No scraping — all public RSS/API endpoints
═══════════════════════════════════════════════════════════════ */

import { TTL } from "./cache";
import { isUsable, sharedWrap } from "@/lib/cache/shared";

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

/* ── Company alias map for better relevance matching ──────── */

const COMPANY_ALIASES: Record<string, string[]> = {
  RELIANCE:   ["reliance industries", "ril", "jio", "mukesh ambani", "jio platforms", "reliance retail", "jamnagar"],
  TCS:        ["tata consultancy", "tcs", "n chandrasekaran", "rajesh gopinathan"],
  HDFCBANK:   ["hdfc bank", "aditya puri", "sashidhar jagdishan", "hdfc merger"],
  INFY:       ["infosys", "narayana murthy", "salil parekh", "nandan nilekani"],
  ICICIBANK:  ["icici bank", "sandeep bakhshi", "chanda kochhar"],
  BHARTIARTL: ["airtel", "bharti airtel", "sunil mittal", "airtel africa"],
  HAL:        ["hindustan aeronautics", "hal", "tejas", "lca", "hal helicopter"],
  IRFC:       ["indian railway finance", "irfc"],
  ADANIENT:   ["adani enterprises", "gautam adani", "adani group", "adani ports", "adani green"],
  SBIN:       ["state bank of india", "sbi", "dinesh khara"],
  WIPRO:      ["wipro", "thierry delaporte", "azim premji"],
  HCLTECH:    ["hcl technologies", "hcl tech", "c vijayakumar"],
  TECHM:      ["tech mahindra", "cp gurnani"],
  KOTAKBANK:  ["kotak mahindra bank", "kotak bank", "uday kotak", "ashok vaswani"],
  MARUTI:     ["maruti suzuki", "maruti", "suzuki india"],
  BAJFINANCE: ["bajaj finance", "bajaj finserv", "rajeev jain"],
  NESTLEIND:  ["nestle india", "nestle"],
  HINDUNILVR: ["hindustan unilever", "hul", "rohit jawa"],
  LT:         ["larsen & toubro", "l&t", "snl", "larsen toubro"],
  NTPC:       ["ntpc", "national thermal power"],
  ONGC:       ["ongc", "oil and natural gas corporation"],
  POWERGRID:  ["power grid corporation", "powergrid"],
  COALINDIA:  ["coal india", "cl"],
};

/* ── RSS Feed Definitions ───────────────────────────────── */

const RSS_FEEDS = [
  /* Google News — targeted Indian market searches */
  {
    name:   "Google News — NSE India",
    url:    "https://news.google.com/rss/search?q=NSE+BSE+India+stock+market&hl=en-IN&gl=IN&ceid=IN:en",
    weight: 1.0,
  },
  {
    name:   "Google News — Indian Stocks",
    url:    "https://news.google.com/rss/search?q=Nifty+Sensex+Indian+equity+market&hl=en-IN&gl=IN&ceid=IN:en",
    weight: 1.0,
  },
  {
    name:   "Google News — India Business",
    url:    "https://news.google.com/rss/search?q=India+stock+market+earnings+RBI+SEBI&hl=en-IN&gl=IN&ceid=IN:en",
    weight: 0.95,
  },
  /* Traditional Indian financial news RSS */
  {
    name:   "Economic Times Markets",
    url:    "https://economictimes.indiatimes.com/markets/stocks/rss/39457592.cms",
    weight: 1.0,
  },
  {
    name:   "Economic Times Companies",
    url:    "https://economictimes.indiatimes.com/markets/rss/39457594.cms",
    weight: 0.9,
  },
  {
    name:   "Business Standard Markets",
    url:    "https://www.business-standard.com/rss/markets-106.rss",
    weight: 0.9,
  },
  {
    name:   "Moneycontrol Business",
    url:    "https://www.moneycontrol.com/rss/business.xml",
    weight: 0.85,
  },
  {
    name:   "Livemint Markets",
    url:    "https://www.livemint.com/rss/markets/",
    weight: 0.85,
  },
  {
    name:   "NDTV Profit",
    url:    "https://feeds.feedburner.com/ndtv/TJbO",
    weight: 0.8,
  },
];

/* ── Simple RSS XML Parser ──────────────────────────────── */

interface RawRSSItem {
  title:       string;
  link:        string;
  pubDate:     string;
  description: string;
  source:      string;
}

function extractTag(xml: string, tag: string): string {
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[(.*?)\\]\\]></${tag}>`, "is"));
  if (cdataMatch) return cdataMatch[1].trim();
  const match = xml.match(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "is"));
  return match ? match[1].replace(/<[^>]+>/g, "").trim() : "";
}

async function parseRSSFeed(feed: { name: string; url: string }): Promise<RawRSSItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EquityLens-News/1.0)",
        "Accept":     "application/rss+xml, application/xml, text/xml, */*",
        "Accept-Language": "en-IN,en;q=0.9",
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
      const date  = extractTag(item, "pubDate") || extractTag(item, "dc:date") || extractTag(item, "updated");
      const desc  = extractTag(item, "description") || extractTag(item, "summary");

      if (title.length > 10) {
        items.push({ title, link, pubDate: date, description: desc.slice(0, 400), source: feed.name });
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
  "order", "win", "expansion", "milestone", "approve", "launch", "good", "best", "soar",
  "jump", "advance", "bull", "positive", "boost", "increase",
];

const NEGATIVE_KEYWORDS = [
  "fall", "drop", "decline", "down", "loss", "miss", "weak", "low", "probe", "fraud",
  "debt", "cut", "reduce", "downgrade", "underperform", "concern", "risk", "warn",
  "default", "penalty", "fine", "investigation", "ban", "reject", "fail", "crash",
  "slump", "tumble", "plunge", "bear", "sell-off", "selloff", "negative", "disappoint",
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
  const lower   = text.toLowerCase();
  const t       = ticker.toLowerCase();
  let score     = 0;

  // Direct ticker mention
  if (lower.includes(t)) score += 0.6;
  // Company aliases
  const aliases = COMPANY_ALIASES[ticker.toUpperCase()] ?? [];
  for (const alias of aliases) {
    if (lower.includes(alias)) { score += 0.5; break; }
  }
  // Partial ticker match
  if (t.length >= 4 && lower.includes(t.slice(0, 4))) score += 0.15;
  // Indian market keywords
  if (lower.includes("nse"))    score += 0.1;
  if (lower.includes("bse"))    score += 0.1;
  if (lower.includes("nifty"))  score += 0.05;
  if (lower.includes("sensex")) score += 0.05;

  return Math.min(score, 1.0);
}

/* ── Deduplication ──────────────────────────────────────── */

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/* ── Finnhub News (with API key) ────────────────────────── */

async function fetchFinnhubNews(ticker: string): Promise<RawRSSItem[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];

  try {
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const to   = new Date().toISOString().split("T")[0];
    const url  = `https://finnhub.io/api/v1/company-news?symbol=${ticker}.NS&from=${from}&to=${to}&token=${apiKey}`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];

    const data: Array<{ headline: string; url: string; datetime: number; summary: string; source: string }> = await res.json();
    return (data ?? []).slice(0, 20).map(d => ({
      title:       d.headline,
      link:        d.url,
      pubDate:     new Date(d.datetime * 1000).toUTCString(),
      description: d.summary?.slice(0, 400) ?? "",
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
    const aliases = COMPANY_ALIASES[ticker.toUpperCase()] ?? [];
    const primaryAlias = aliases[0] ?? ticker;
    const query = encodeURIComponent(`"${primaryAlias}" OR "${ticker} NSE" India stock`);
    const url   = `https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&language=en&pageSize=20&apiKey=${apiKey}`;
    const res   = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];

    const data = await res.json();
    return (data.articles ?? []).map((a: any) => ({
      title:       a.title,
      link:        a.url,
      pubDate:     a.publishedAt,
      description: a.description?.slice(0, 400) ?? "",
      source:      `NewsAPI / ${a.source?.name ?? "Unknown"}`,
    }));
  } catch {
    return [];
  }
}

/* ── Yahoo Finance news via yahoo-finance2 ──────────────── */

async function fetchYahooNews(ticker: string): Promise<RawRSSItem[]> {
  try {
    const { default: YFClass } = await import("yahoo-finance2");
    const yf = new (YFClass as any)();
    for (const sym of [`${ticker}.NS`, `${ticker}.BO`]) {
      try {
        const result = await yf.search(sym, { newsCount: 15, quotesCount: 0 });
        const news = result?.news ?? [];
        if (news.length > 0) {
          return news.map((n: any) => ({
            title:       n.title ?? "",
            link:        n.link  ?? "",
            pubDate:     n.providerPublishTime
              ? new Date(n.providerPublishTime * 1000).toUTCString()
              : "",
            description: n.summary ?? n.title ?? "",
            source:      `Yahoo Finance / ${n.publisher ?? "Unknown"}`,
          })).filter((n: RawRSSItem) => n.title.length > 10);
        }
      } catch { /**/ }
    }
  } catch { /**/ }
  return [];
}

/* ── Main Aggregator ────────────────────────────────────── */

export async function getStockNews(ticker: string, companyName?: string): Promise<NewsItem[]> {
  const NEWS_TTL = 120; // 2 minutes — much fresher than the old 600s

  return sharedWrap("news", ticker, NEWS_TTL, async () => {
    // Fetch in parallel — RSS feeds + Yahoo + premium APIs
    const [rssResults, yahooResults, finnhubResults, newsApiResults] = await Promise.all([
      Promise.all(RSS_FEEDS.map(f => parseRSSFeed(f))),
      fetchYahooNews(ticker),
      fetchFinnhubNews(ticker),
      fetchNewsAPI(ticker, companyName),
    ]);

    // Flatten all raw items
    const allRaw: RawRSSItem[] = [
      ...rssResults.flat(),
      ...yahooResults,
      ...finnhubResults,
      ...newsApiResults,
    ];

    // Deduplicate by normalized title
    const seen = new Set<string>();
    const deduplicated = allRaw.filter(item => {
      const key = normalizeTitle(item.title);
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
          0.15, // minimum for general market news
        );

        const pubDate  = new Date(item.pubDate);
        const ageHours = isNaN(pubDate.getTime())
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
      .filter(item => item.ageHours < 24 * 7) // keep last 7 days
      .sort((a, b) =>
        (b.relevance * 100 + (100 - Math.min(b.ageHours, 100))) -
        (a.relevance * 100 + (100 - Math.min(a.ageHours, 100)))
      );

    return scored.slice(0, 40);
  }, isUsable);
}

/** Get market-wide news (no ticker filter) */
export async function getMarketNews(): Promise<NewsItem[]> {
  const NEWS_TTL = 120; // 2 minutes

  return sharedWrap("news", "market", NEWS_TTL, async () => {
    // Use ALL feeds for market-wide news including Google News
    const rssResults = await Promise.all(RSS_FEEDS.map(f => parseRSSFeed(f)));
    const allRaw = rssResults.flat();

    const seen = new Set<string>();
    return allRaw
      .filter(item => {
        const key = normalizeTitle(item.title);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(item => {
        const pubDate  = new Date(item.pubDate);
        const ageHours = isNaN(pubDate.getTime())
          ? 24
          : (Date.now() - pubDate.getTime()) / 3_600_000;
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
      .filter(item => item.ageHours < 24 * 3) // last 3 days
      .sort((a, b) => a.ageHours - b.ageHours)
      .slice(0, 60);
  }, isUsable);
}
