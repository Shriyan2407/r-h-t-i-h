import type { NewsItem } from "@/lib/services/newsAggregator";

export function timeAgo(ageHours: number): string {
  if (ageHours < 0.02) return "just now";
  if (ageHours < 1) return `${Math.round(ageHours * 60)} min ago`;
  if (ageHours < 24) return `${ageHours.toFixed(1)} hr ago`;
  return `${Math.floor(ageHours / 24)}d ago`;
}

/** Keyword-based topic for a headline. A heuristic, labelled as such in the UI. */
export function detectCategory(title: string): string {
  const t = title.toLowerCase();
  if (/q[1-4]\s*(fy)?\d*|results|earnings|profit|revenue|ebitda|pat\b|eps\b/.test(t)) return "Earnings";
  if (/rbi|fed|gdp|inflation|rate cut|rate hike|cpi|wpi|monetary|fiscal|budget/.test(t)) return "Macro";
  if (/sebi|nse|bse|regulatory|penalty|fine|investigation|probe|ban|compliance/.test(t)) return "Regulatory";
  if (/merger|acquisition|ipo|stake|buyback|dividend|fundrais|rights issue/.test(t)) return "Corporate";
  if (/nifty|sensex|fii|dii|index|market|broader market/.test(t)) return "Markets";
  return "General";
}

const KNOWN_TICKER_MAP: Record<string, string> = {
  reliance: "RELIANCE", jio: "RELIANCE", "tata consultancy": "TCS", " tcs ": "TCS",
  "hdfc bank": "HDFCBANK", hdfcbank: "HDFCBANK", infosys: "INFY", "icici bank": "ICICIBANK", airtel: "BHARTIARTL",
  bhartiartl: "BHARTIARTL", irfc: "IRFC", adani: "ADANIENT", sbi: "SBIN", "state bank": "SBIN", wipro: "WIPRO",
  "hcl tech": "HCLTECH", "tech mahindra": "TECHM", kotak: "KOTAKBANK", maruti: "MARUTI", "bajaj finance": "BAJFINANCE",
  nestle: "NESTLEIND", "hindustan unilever": "HINDUNILVR", larsen: "LT", "l&t": "LT", ntpc: "NTPC", ongc: "ONGC",
};

/** Tickers named in a headline (word-boundary match, so "hal" does not match "half"). */
export function extractTickers(title: string): string[] {
  const t = ` ${title.toLowerCase()} `;
  const found = new Set<string>();
  for (const [pattern, ticker] of Object.entries(KNOWN_TICKER_MAP)) {
    const p = pattern.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|[^a-z0-9])${p}([^a-z0-9]|$)`).test(t)) found.add(ticker);
  }
  return [...found].slice(0, 4);
}

export interface FeedStats {
  total: number;
  sentiment: Record<NewsItem["sentiment"], number>;
  categories: Array<{ category: string; count: number }>;
  tickers: Array<{ ticker: string; count: number }>;
  newestAgeHours: number | null;
}

/** Counts computed from the articles actually in the feed. */
export function feedStats(items: readonly NewsItem[]): FeedStats {
  const sentiment = { positive: 0, negative: 0, neutral: 0 } as Record<NewsItem["sentiment"], number>;
  const cats = new Map<string, number>();
  const tick = new Map<string, number>();
  for (const it of items) {
    sentiment[it.sentiment] = (sentiment[it.sentiment] ?? 0) + 1;
    const c = detectCategory(it.title);
    cats.set(c, (cats.get(c) ?? 0) + 1);
    for (const t of extractTickers(it.title)) tick.set(t, (tick.get(t) ?? 0) + 1);
  }
  const sorted = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]);
  return {
    total: items.length,
    sentiment,
    categories: sorted(cats).map(([category, count]) => ({ category, count })),
    tickers: sorted(tick).slice(0, 10).map(([ticker, count]) => ({ ticker, count })),
    newestAgeHours: items.length ? Math.min(...items.map((i) => i.ageHours)) : null,
  };
}
