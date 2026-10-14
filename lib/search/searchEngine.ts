/* ══════════════════════════════════════════════════════════════════════════
   EQUITYLENS — Intelligent Search Engine
   Multi-layer scoring: exact > prefix > word > alias > fuzzy
══════════════════════════════════════════════════════════════════════════ */

import {
  STOCKS, SECTORS, THEMES, PEOPLE, TRENDING,
  type StockEntry, type SectorEntry, type ThemeEntry, type PersonEntry,
} from "@/lib/data/searchUniverse";

/* ── Result Types ─────────────────────────────────────────────────────── */

export type ResultKind = "stock" | "sector" | "theme" | "person" | "trending";

export interface SearchResultItem {
  kind:      ResultKind;
  id:        string;       // ticker or entity ID
  title:     string;
  subtitle:  string;
  meta?:     string;       // sector for stocks, count for sectors, etc.
  chips?:    string[];     // small category tags shown inline
  href:      string;       // navigation target
  score:     number;
}

export interface SearchResultGroup {
  kind:  ResultKind;
  label: string;
  icon:  string;
  items: SearchResultItem[];
}

export interface RelatedData {
  peers:   string[];       // peer tickers
  themes:  { id: string; name: string }[];
  sector:  { id: string; name: string; icon: string } | null;
  alsoSearched: string[];
}

/* ── Scoring ──────────────────────────────────────────────────────────── */

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9&]/g, " ").trim();
}

function scoreText(q: string, target: string): number {
  if (!target) return 0;
  const t = norm(target);
  if (t === q) return 100;
  if (t.startsWith(q)) return 82 + Math.min(10, q.length);
  const words = t.split(" ");
  for (const w of words) {
    if (w === q) return 78;
    if (w.startsWith(q)) return 68;
  }
  if (t.includes(q)) return 55;
  // fuzzy: all chars of q appear in order in t
  let idx = 0;
  for (const ch of q) {
    idx = t.indexOf(ch, idx);
    if (idx === -1) return 0;
    idx++;
  }
  const coverage = q.length / Math.max(t.length, 1);
  return Math.floor(20 + coverage * 20);
}

function scoreStock(q: string, stock: StockEntry): number {
  let best = 0;
  best = Math.max(best, scoreText(q, stock.ticker));
  best = Math.max(best, scoreText(q, stock.name) * 0.95);
  if (stock.short) best = Math.max(best, scoreText(q, stock.short));
  for (const alias of stock.aliases) {
    best = Math.max(best, scoreText(q, alias) * 0.88);
  }
  // boost for exact ticker
  if (norm(stock.ticker) === q) best = Math.max(best, 105);
  return best;
}

function scoreSector(q: string, s: SectorEntry): number {
  let best = scoreText(q, s.name);
  best = Math.max(best, scoreText(q, s.id) * 0.8);
  best = Math.max(best, scoreText(q, s.desc) * 0.5);
  return best;
}

function scoreTheme(q: string, t: ThemeEntry): number {
  let best = scoreText(q, t.name);
  best = Math.max(best, scoreText(q, t.narrative) * 0.5);
  for (const a of t.aliases) {
    best = Math.max(best, scoreText(q, a) * 0.85);
  }
  return best;
}

function scorePerson(q: string, p: PersonEntry): number {
  let best = scoreText(q, p.name);
  best = Math.max(best, scoreText(q, p.role) * 0.5);
  for (const a of p.aliases) {
    best = Math.max(best, scoreText(q, a) * 0.88);
  }
  return best;
}

/* ── Alias Resolution ─────────────────────────────────────────────────── */

/** When user searches an alias, return extra tickers to also look up via API */
export function resolveAliasesToTickers(query: string): string[] {
  const q = norm(query);
  const tickers = new Set<string>();
  for (const [ticker, stock] of Object.entries(STOCKS)) {
    if (scoreStock(q, stock) >= 40) tickers.add(ticker);
  }
  return Array.from(tickers).slice(0, 8);
}

/* ── Main Search ──────────────────────────────────────────────────────── */

const THRESHOLDS: Record<ResultKind, number> = {
  stock:    35,
  sector:   30,
  theme:    28,
  person:   30,
  trending: 0,
};

export function intelligentSearch(query: string): SearchResultGroup[] {
  const q = norm(query);
  if (!q) return [];

  const groups: SearchResultGroup[] = [];

  // ── Stocks ──────────────────────────────────────────────────────────
  const stockResults: SearchResultItem[] = [];
  for (const [, stock] of Object.entries(STOCKS)) {
    const s = scoreStock(q, stock);
    if (s >= THRESHOLDS.stock) {
      const sector = SECTORS[stock.sector];
      stockResults.push({
        kind:     "stock",
        id:       stock.ticker,
        title:    stock.ticker,
        subtitle: stock.name,
        meta:     sector?.name ?? stock.sector,
        chips:    stock.themes.slice(0, 2).map(t => THEMES.find(x => x.id === t)?.name ?? t),
        href:     `/stock/${stock.ticker}`,
        score:    s,
      });
    }
  }
  stockResults.sort((a, b) => b.score - a.score);
  if (stockResults.length > 0) {
    groups.push({ kind: "stock", label: "STOCKS", icon: "▣", items: stockResults.slice(0, 5) });
  }

  // ── Sectors ─────────────────────────────────────────────────────────
  const sectorResults: SearchResultItem[] = [];
  for (const [, sec] of Object.entries(SECTORS)) {
    const s = scoreSector(q, sec);
    if (s >= THRESHOLDS.sector) {
      sectorResults.push({
        kind:     "sector",
        id:       sec.id,
        title:    sec.name,
        subtitle: sec.desc,
        meta:     `${sec.stocks.length} stocks`,
        chips:    sec.themes.slice(0, 2).map(t => THEMES.find(x => x.id === t)?.name ?? t),
        href:     `/stock/${sec.topStock}`,
        score:    s,
      });
    }
  }
  sectorResults.sort((a, b) => b.score - a.score);
  if (sectorResults.length > 0) {
    groups.push({ kind: "sector", label: "SECTORS", icon: "⬡", items: sectorResults.slice(0, 3) });
  }

  // ── Themes ──────────────────────────────────────────────────────────
  const themeResults: SearchResultItem[] = [];
  for (const theme of THEMES) {
    const s = scoreTheme(q, theme);
    if (s >= THRESHOLDS.theme) {
      themeResults.push({
        kind:     "theme",
        id:       theme.id,
        title:    theme.name,
        subtitle: theme.narrative,
        meta:     `${theme.stocks.length} stocks`,
        chips:    theme.stocks.slice(0, 4),
        href:     `/stock/${theme.stocks[0]}`,
        score:    s,
      });
    }
  }
  themeResults.sort((a, b) => b.score - a.score);
  if (themeResults.length > 0) {
    groups.push({ kind: "theme", label: "THEMES & NARRATIVES", icon: "◈", items: themeResults.slice(0, 3) });
  }

  // ── People ──────────────────────────────────────────────────────────
  const personResults: SearchResultItem[] = [];
  for (const person of PEOPLE) {
    const s = scorePerson(q, person);
    if (s >= THRESHOLDS.person) {
      personResults.push({
        kind:     "person",
        id:       person.name,
        title:    person.name,
        subtitle: person.role,
        chips:    person.stocks,
        href:     `/stock/${person.stocks[0]}`,
        score:    s,
      });
    }
  }
  personResults.sort((a, b) => b.score - a.score);
  if (personResults.length > 0) {
    groups.push({ kind: "person", label: "PEOPLE", icon: "○", items: personResults.slice(0, 2) });
  }

  return groups;
}

/* ── Related Intelligence ─────────────────────────────────────────────── */

export function getRelatedIntelligence(ticker: string): RelatedData {
  const stock = STOCKS[ticker.toUpperCase()];
  if (!stock) {
    return { peers: [], themes: [], sector: null, alsoSearched: [] };
  }

  const sector = SECTORS[stock.sector] ?? null;

  const themes = stock.themes
    .map(id => THEMES.find(t => t.id === id))
    .filter(Boolean)
    .map(t => ({ id: t!.id, name: t!.name }));

  const alsoSearched = [
    ...stock.aliases.slice(0, 2).map(a => `"${a}"`),
    stock.sector ? `${sector?.name ?? stock.sector} stocks` : "",
    stock.peers[0] ? `${stock.ticker} vs ${stock.peers[0]}` : "",
  ].filter(Boolean).slice(0, 4);

  return {
    peers: stock.peers.slice(0, 6),
    themes,
    sector: sector ? { id: sector.id, name: sector.name, icon: sector.icon } : null,
    alsoSearched,
  };
}

/* ── Trending ─────────────────────────────────────────────────────────── */

export function getTrending() {
  return TRENDING;
}

export { STOCKS, SECTORS, THEMES, PEOPLE };
