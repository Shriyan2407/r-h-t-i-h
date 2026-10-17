/**
 * The data side of a committee run. Agents never call providers directly: they ask the context for a dataset,
 * the first request starts the fetch, and every later request (from any agent) shares the same promise. Each
 * dataset records its status, source, data timestamp and latency so the memo can show exactly what was used.
 *
 * Loaders are injected, so tests run the full pipeline on fixed data with no network.
 */
import type { Bar } from "@/lib/backtest/types";
import type { FundamentalData } from "@/lib/types";
import type { NewsItem } from "@/lib/services/newsAggregator";
import type { buildMacroIntelligence } from "@/lib/services/macro";
import type { ExecutionPlan } from "./router";
import type { Intent } from "./schema";

export type MacroSnapshot = Awaited<ReturnType<typeof buildMacroIntelligence>>;

export interface Holding {
  ticker: string;
  quantity: number;
  sector: string;
  exchange?: string | null;
}

export interface SymbolBars {
  symbol: string;
  bars: Bar[];
}

export interface DataLoaders {
  /** Adjusted daily bars for an NSE/BSE ticker (tries .NS then .BO). */
  stockBars(ticker: string): Promise<SymbolBars | null>;
  marketBars(which: "index" | "vix"): Promise<Bar[] | null>;
  fundamentals(ticker: string): Promise<FundamentalData | null>;
  news(ticker: string): Promise<NewsItem[]>;
  macro(): Promise<MacroSnapshot | null>;
  /** The signed-in user's saved holdings; null when there is no user or no portfolio. */
  holdings(): Promise<Holding[] | null>;
}

export type DatasetStatus = "ok" | "empty" | "error" | "timeout";

export interface Dataset<T> {
  name: string;
  status: DatasetStatus;
  value: T | null;
  source: string;
  /** Timestamp of the data itself (last bar, newest headline), or null when the provider gives none. */
  asOf: string | null;
  latencyMs: number;
  /** Provider calls made: 2 means the first call threw and was retried once. */
  attempts: number;
  error?: string;
}

export type DatasetSummary = Omit<Dataset<unknown>, "value">;

export type Subject =
  | { kind: "asset"; ticker: string }
  | { kind: "portfolio"; source: "saved" | "query"; tickers: string[] }
  | { kind: "market" };

export interface ContextOptions {
  requestId: string;
  now?: Date;
  /** Per-dataset fetch timeout, covering retries. */
  timeoutMs?: number;
  /** Retries after a provider error (not after a timeout or an empty answer). Default 1. */
  retries?: number;
  retryDelayMs?: number;
}

const SOURCES = {
  bars: "Yahoo Finance daily bars (split/dividend adjusted)",
  fundamentals: "Yahoo Finance quoteSummary (financialData, defaultKeyStatistics, summaryDetail)",
  news: "News aggregator (RSS feeds, Finnhub/NewsAPI when configured)",
  macro: "Yahoo Finance quotes for indices, currency, commodities and yields",
  holdings: "Your saved EquityLens portfolio",
};

export class ResearchContext {
  readonly requestId: string;
  readonly now: Date;
  /** Set by the orchestrator so the CIO knows which agents were planned and whether the question was blocked. */
  plan: Pick<ExecutionPlan, "agents" | "blocked"> | null = null;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly retryDelayMs: number;
  private readonly cache = new Map<string, Promise<Dataset<unknown>>>();
  private readonly done: DatasetSummary[] = [];

  constructor(readonly intent: Intent, private readonly loaders: DataLoaders, opts: ContextOptions) {
    this.requestId = opts.requestId;
    this.now = opts.now ?? new Date();
    this.timeoutMs = opts.timeoutMs ?? 12_000;
    this.retries = opts.retries ?? 1;
    this.retryDelayMs = opts.retryDelayMs ?? 250;
  }

  private load<T>(name: string, source: string, fn: () => Promise<T | null>, asOf: (v: T) => string | null, isEmpty: (v: T) => boolean = () => false): Promise<Dataset<T>> {
    const hit = this.cache.get(name);
    if (hit) return hit as Promise<Dataset<T>>;
    const t0 = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const call = async (left: number): Promise<T | null> => {
      attempts++;
      try {
        return await fn();
      } catch (err) {
        if (left <= 0) throw err;
        await new Promise((r) => setTimeout(r, this.retryDelayMs));
        return call(left - 1);
      }
    };
    const timeout = new Promise<"timeout">((resolve) => { timer = setTimeout(() => resolve("timeout"), this.timeoutMs); });
    const p = Promise.race([call(this.retries), timeout])
      .then((v): Dataset<T> => {
        if (v === "timeout") return { name, status: "timeout", value: null, source, asOf: null, latencyMs: Date.now() - t0, attempts, error: `no response within ${this.timeoutMs} ms` };
        if (v === null || v === undefined || isEmpty(v)) return { name, status: "empty", value: null, source, asOf: null, latencyMs: Date.now() - t0, attempts };
        return { name, status: "ok", value: v, source, asOf: asOf(v), latencyMs: Date.now() - t0, attempts };
      })
      .catch((err: unknown): Dataset<T> => ({ name, status: "error", value: null, source, asOf: null, latencyMs: Date.now() - t0, attempts, error: err instanceof Error ? err.message : String(err) }))
      .then((d) => {
        clearTimeout(timer);
        this.done.push({ name: d.name, status: d.status, source: d.source, asOf: d.asOf, latencyMs: d.latencyMs, attempts: d.attempts, ...(d.error ? { error: d.error } : {}) });
        return d;
      });
    this.cache.set(name, p as Promise<Dataset<unknown>>);
    return p;
  }

  stock(ticker: string): Promise<Dataset<SymbolBars>> {
    return this.load(`bars:${ticker}`, SOURCES.bars, () => this.loaders.stockBars(ticker), (v) => v.bars.at(-1)?.date ?? null, (v) => v.bars.length === 0);
  }

  index(): Promise<Dataset<Bar[]>> {
    return this.load("bars:NIFTY50", SOURCES.bars, () => this.loaders.marketBars("index"), (v) => v.at(-1)?.date ?? null, (v) => v.length === 0);
  }

  vix(): Promise<Dataset<Bar[]>> {
    return this.load("bars:INDIAVIX", SOURCES.bars, () => this.loaders.marketBars("vix"), (v) => v.at(-1)?.date ?? null, (v) => v.length === 0);
  }

  fundamentals(ticker: string): Promise<Dataset<FundamentalData>> {
    // Yahoo returns no as-of date for these ratios; the memo labels them as "latest reported".
    return this.load(`fundamentals:${ticker}`, SOURCES.fundamentals, () => this.loaders.fundamentals(ticker), () => null);
  }

  news(ticker: string): Promise<Dataset<NewsItem[]>> {
    return this.load(
      `news:${ticker}`, SOURCES.news, () => this.loaders.news(ticker),
      (v) => v.map((n) => n.publishedAt).sort().at(-1) ?? null,
      (v) => v.length === 0,
    );
  }

  macro(): Promise<Dataset<MacroSnapshot>> {
    return this.load("macro", SOURCES.macro, () => this.loaders.macro(), (v) => v.fetched_at ?? null);
  }

  holdings(): Promise<Dataset<Holding[]>> {
    return this.load("holdings", SOURCES.holdings, () => this.loaders.holdings(), () => null, (v) => v.length === 0);
  }

  /** What the committee is analysing. Portfolio questions use saved holdings; construction uses the named tickers. */
  async subject(): Promise<Subject> {
    const i = this.intent;
    if (i.intent === "portfolio_construction") return { kind: "portfolio", source: "query", tickers: i.tickers };
    if (i.intent === "portfolio_review" || (i.intent === "risk_assessment" && !i.ticker)) {
      const h = await this.holdings();
      return { kind: "portfolio", source: "saved", tickers: (h.value ?? []).map((x) => x.ticker) };
    }
    if (i.ticker) return { kind: "asset", ticker: i.ticker };
    return { kind: "market" };
  }

  /** Every dataset fetched so far, for the trace and the memo's data-sources section. */
  datasets(): DatasetSummary[] {
    return [...this.done];
  }
}
