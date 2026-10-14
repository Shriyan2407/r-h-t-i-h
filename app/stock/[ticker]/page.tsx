"use client";
import { use, useEffect, useState, useCallback, useMemo } from "react";
import {
  Brain,
  BarChart2,
  BookOpen,
  Newspaper,
  Activity,
  RefreshCw,
  ChevronLeft,
  Globe,
  AlertCircle,
  Gauge,
} from "lucide-react";
import Link from "next/link";
import { Navbar }           from "@/components/Navbar";
import { MarketTicker }     from "@/components/MarketTicker";
import { StockChart }       from "@/components/StockChart";
import { WatchButton }      from "@/components/WatchButton";
import { TechnicalPanel }   from "@/components/analysis/TechnicalPanel";
import { FundamentalsPanel} from "@/components/analysis/FundamentalsPanel";
import { AIResearchPanel }  from "@/components/analysis/AIResearchPanel";
import { MacroPanel }       from "@/components/analysis/MacroPanel";
import { NewsPanel }        from "@/components/analysis/NewsPanel";
import { RiskIntelligencePanel } from "@/components/analysis/RiskIntelligencePanel";
import { useMediaQuery, LG_QUERY } from "@/lib/hooks/useMediaQuery";
import { useLiveQuotes } from "@/lib/hooks/useLiveQuotes";
import { RelatedIntelligence } from "@/components/RelatedIntelligence";
import { VerdictBadge }     from "@/components/ui/VerdictBadge";
import { Badge }            from "@/components/ui/Badge";
import { LoadingBlock, SkeletonBox } from "@/components/ui/Spinner";
import { MetricCard }       from "@/components/ui/MetricCard";
import {
  getStockQuote,
  getTechnicalIndicators,
  getFundamentals,
  getAIAnalysis,
  getNews,
} from "@/lib/api";
import { formatVolume, formatMarketCap } from "@/lib/utils";
import type {
  StockQuote, TechnicalIndicators, FundamentalData,
  AIAnalysis, NewsItem, AnalysisTab,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS: { id: AnalysisTab; label: string; icon: React.ElementType }[] = [
  { id: "ai-report",     label: "AI Report",     icon: Brain      },
  { id: "risk",          label: "Risk Model",    icon: Gauge      },
  { id: "overview",      label: "Overview",      icon: BarChart2  },
  { id: "technical",     label: "Technical",     icon: Activity   },
  { id: "fundamentals",  label: "Fundamentals",  icon: BookOpen   },
  { id: "macro",         label: "Macro",         icon: Globe      },
  { id: "news",          label: "News",          icon: Newspaper  },
];

export default function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker }     = use(params);
  const upperTicker    = ticker.toUpperCase();

  const [activeTab,       setActiveTab]       = useState<AnalysisTab>("ai-report");
  // The desktop sidebar and the mobile panel are both in the DOM (one hidden by CSS). Data-fetching panels
  // must mount in only the visible one, or every view costs two API calls.
  const isDesktop = useMediaQuery(LG_QUERY);
  const [baseQuote,       setQuote]           = useState<StockQuote | null>(null);
  // Delayed quote updates over SSE are overlaid on the fetched snapshot, so every price on the page moves together.
  const { quotes: liveQuotes, status: liveStatus } = useLiveQuotes([upperTicker]);
  const liveQuote = liveQuotes[upperTicker];
  const quote = useMemo<StockQuote | null>(
    () => (baseQuote && liveQuote ? { ...baseQuote, current_price: liveQuote.price, change: liveQuote.change, change_pct: liveQuote.changePct } : baseQuote),
    [baseQuote, liveQuote],
  );
  const [technicals,      setTechnicals]      = useState<TechnicalIndicators | null>(null);
  const [fundamentals,    setFundamentals]    = useState<FundamentalData | null>(null);
  const [aiAnalysis,      setAIAnalysis]      = useState<AIAnalysis | null>(null);
  const [news,            setNews]            = useState<NewsItem[]>([]);
  const [loadingQuote,    setLoadingQuote]    = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [quoteError,      setQuoteError]      = useState<string | null>(null);

  // ─── Load real quote + fundamentals + news ───────────────────────────────
  const loadData = useCallback(async () => {
    setLoadingQuote(true);
    setQuoteError(null);

    console.log(`[StockPage] Fetching quote for ${upperTicker}`);

    try {
      // Quote is critical — fail fast if it doesn't come back
      const q = await getStockQuote(upperTicker);
      setQuote(q);
      console.log(`[StockPage] Quote: ${q.ticker} @ ₹${q.current_price} (${q.company_name})`);

      // Non-critical: load in parallel, ignore individual failures
      const [t, f, n] = await Promise.allSettled([
        getTechnicalIndicators(upperTicker),
        getFundamentals(upperTicker),
        getNews(upperTicker),
      ]);
      if (t.status === "fulfilled") setTechnicals(t.value);
      if (f.status === "fulfilled") setFundamentals(f.value);
      if (n.status === "fulfilled") setNews(n.value);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[StockPage] Quote fetch failed for ${upperTicker}:`, msg);
      setQuoteError(msg);
    } finally {
      setLoadingQuote(false);
    }
  }, [upperTicker]);

  // ─── Load AI analysis (separate slower call) ─────────────────────────────
  const loadAIAnalysis = useCallback(async () => {
    setAnalysisLoading(true);
    try {
      const analysis = await getAIAnalysis(upperTicker);
      setAIAnalysis(analysis);
    } catch {
      // AI backend not running — silently skip; chart + quote still work
    } finally {
      setAnalysisLoading(false);
    }
  }, [upperTicker]);

  useEffect(() => {
    // Reset state on ticker navigation
    setQuote(null);
    setTechnicals(null);
    setFundamentals(null);
    setAIAnalysis(null);
    setNews([]);
    setActiveTab("overview");
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!aiAnalysis) loadAIAnalysis();
  }, [loadAIAnalysis, aiAnalysis]);

  const isPositive = (quote?.change_pct ?? 0) >= 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--th-bg-page)" }}>
      <Navbar />
      <MarketTicker />

      {/* ── Stock Header ───────────────────────────────────────────────────── */}
      <div style={{ borderBottom: "1px solid var(--th-border-card)", background: "var(--th-bg-elevated)" }}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono mb-3" style={{ color: "var(--th-text-faint)" }}>
            <Link href="/" className="flex items-center gap-1 transition-colors hover:text-[#FFD700]">
              <ChevronLeft size={10} /> Home
            </Link>
            <span style={{ color: "var(--th-text-ultra-faint)" }}>/</span>
            <span style={{ color: "var(--th-text-muted)" }}>{upperTicker}</span>
          </div>

          {/* Loading skeleton */}
          {loadingQuote && (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 skeleton rounded-xl" />
              <div className="flex flex-col gap-2">
                <div className="w-64 h-5 skeleton rounded" />
                <div className="w-40 h-7 skeleton rounded" />
              </div>
            </div>
          )}

          {/* Error state */}
          {!loadingQuote && quoteError && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                background: "rgba(255,77,77,0.06)",
                border: "1px solid rgba(255,77,77,0.22)",
              }}
            >
              <AlertCircle size={14} style={{ color: "var(--negative)", flexShrink: 0 }} />
              <div>
                <div className="text-[11px] font-mono font-semibold mb-0.5" style={{ color: "var(--negative)" }}>
                  Could not load data for {upperTicker}
                </div>
                <div className="text-[11px]" style={{ color: "var(--th-text-muted)" }}>{quoteError}</div>
              </div>
              <button
                onClick={loadData}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all"
                style={{
                  color: "var(--th-text-muted)",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,215,0,0.1)",
                }}
              >
                <RefreshCw size={11} /> Retry
              </button>
            </div>
          )}

          {/* Live quote header */}
          {!loadingQuote && quote && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 font-mono font-bold text-[11px]"
                    style={{
                      background: "var(--th-border-card)",
                      border: "1px solid rgba(255,215,0,0.22)",
                      color: "var(--gold)",
                    }}
                  >
                    {upperTicker.slice(0, 3)}
                  </div>
                  <div>
                    {/* Company name — prominent (Layer 2) */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h1
                        style={{
                          fontFamily: "var(--font-space-grotesk, sans-serif)",
                          fontSize: "20px",
                          fontWeight: 600,
                          color: "var(--th-text-primary)",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {quote.company_name}
                      </h1>
                      {/* Ticker — smaller, secondary */}
                      <span
                        className="font-mono"
                        style={{
                          fontSize: "11px",
                          fontWeight: 500,
                          letterSpacing: "0.06em",
                          color: "var(--gold)",
                          background: "rgba(255,215,0,0.10)",
                          border: "1px solid rgba(255,215,0,0.22)",
                          padding: "2px 8px",
                          borderRadius: "6px",
                        }}
                      >
                        {upperTicker}
                      </span>
                      <Badge variant="dim">{quote.exchange}</Badge>
                      {quote.sector !== "Unknown" && (
                        <Badge variant="dim">{quote.sector}</Badge>
                      )}
                    </div>

                    {/* Price — hero number (Layer 1) */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "40px",
                          fontWeight: 700,
                          letterSpacing: "-0.04em",
                          lineHeight: 1,
                          color: "var(--th-text-primary)",
                        }}
                      >
                        ₹{quote.current_price.toFixed(2)}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "16px",
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                          color: isPositive ? "var(--positive)" : "var(--negative)",
                        }}
                      >
                        {isPositive ? "▲" : "▼"}{" "}
                        {Math.abs(quote.change).toFixed(2)}{" "}
                        ({Math.abs(quote.change_pct).toFixed(2)}%)
                      </span>
                      <span
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider"
                        style={{
                          color: "var(--positive)",
                          background: "var(--th-green-bg)",
                          border: "1px solid rgba(0,255,156,0.18)",
                        }}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${liveStatus === "live" ? "bg-[#00FF9C] animate-live-dot motion-reduce:animate-none" : "bg-[#888]"}`} />
                        <span role="status" aria-live="polite" title="Yahoo Finance quotes for NSE/BSE may be delayed">
                          {liveStatus === "live" ? `Updating · delayed${liveQuote?.time ? ` · ${new Date(liveQuote.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}`
                            : liveStatus === "paused" ? "Paused (tab hidden)"
                            : liveStatus === "reconnecting" || liveStatus === "connecting" ? "Connecting…"
                            : "Snapshot (no live updates)"}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {aiAnalysis && (
                    <VerdictBadge verdict={aiAnalysis.verdict.rating} size="md" />
                  )}
                  <button
                    onClick={loadData}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all"
                    style={{
                      color: "var(--th-text-muted)",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--th-border-card)",
                    }}
                  >
                    <RefreshCw size={11} /> Refresh
                  </button>
                  {quote && (
                    <WatchButton
                      ticker={upperTicker}
                      name={quote.company_name}
                      exchange={quote.exchange}
                      sector={quote.sector}
                    />
                  )}
                </div>
              </div>

              {/* Quick metrics strip */}
              <div className="flex flex-wrap gap-2 mt-4">
                {[
                  { label: "Mkt Cap",   value: formatMarketCap(quote.market_cap)                               },
                  { label: "52W High",  value: `₹${quote.week_52_high.toFixed(0)}`                            },
                  { label: "52W Low",   value: `₹${quote.week_52_low.toFixed(0)}`                             },
                  { label: "P/E",       value: quote.pe_ratio ? `${quote.pe_ratio.toFixed(1)}x` : "N/A"       },
                  { label: "Volume",    value: formatVolume(quote.volume)                                      },
                  { label: "Beta",      value: quote.beta ? quote.beta.toFixed(2) : "N/A"                     },
                  { label: "Div Yield", value: quote.dividend_yield ? `${quote.dividend_yield.toFixed(2)}%` : "N/A" },
                ].map(m => (
                  <div
                    key={m.label}
                    className="flex flex-col gap-1 px-3 py-2 rounded-lg"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--th-border-subtle)",
                    }}
                  >
                    {/* Label — subtle */}
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: "10px",
                        fontWeight: 400,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase" as const,
                        color: "var(--th-text-muted)",
                      }}
                    >
                      {m.label}
                    </span>
                    {/* Value — dominant */}
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: "13px",
                        fontWeight: 700,
                        letterSpacing: "-0.01em",
                        color: "var(--th-text-primary)",
                      }}
                    >
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Main 3-column layout ───────────────────────────────────────────── */}
      <div className="flex-1 flex max-w-[1600px] mx-auto w-full px-4 sm:px-6 py-4 gap-4">

        {/* LEFT: Analysis sidebar ─────────────────────────────────────────── */}
        <div className="hidden lg:flex flex-col w-80 xl:w-96 flex-shrink-0 gap-3">
          {/* Tab nav */}
          <div
            className="flex flex-col gap-0.5 rounded-xl p-2"
            style={{
              background: "var(--th-bg-elevated)",
              border: "1px solid var(--th-border-card)",
            }}
          >
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-mono transition-all duration-200 text-left"
                style={activeTab === tab.id ? {
                  background: "var(--th-border-card)",
                  border: "1px solid rgba(255,215,0,0.2)",
                  color: "var(--gold)",
                } : {
                  color: "var(--th-text-muted)",
                  border: "1px solid transparent",
                }}
                onMouseEnter={e => {
                  if (activeTab !== tab.id) {
                    (e.currentTarget as HTMLButtonElement).style.color      = "var(--th-text-primary)";
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)";
                  }
                }}
                onMouseLeave={e => {
                  if (activeTab !== tab.id) {
                    (e.currentTarget as HTMLButtonElement).style.color      = "var(--th-text-muted)";
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }
                }}
              >
                <tab.icon size={13} />
                {tab.label}
                {tab.id === "ai-report" && (
                  <span
                    className="ml-auto text-[9px] font-mono uppercase px-1.5 py-0.5 rounded"
                    style={{
                      color: "#FFD700",
                      background: "rgba(255,215,0,0.12)",
                      border: "1px solid rgba(255,215,0,0.30)",
                    }}
                  >
                    AI
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Panel body */}
          <div className="flex-1 rounded-xl overflow-auto" style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-card)" }}>
            {loadingQuote ? (
              <LoadingBlock message="Loading data..." />
            ) : quoteError ? (
              <div className="p-4 text-center text-xs font-mono" style={{ color: "var(--th-text-faint)" }}>Data unavailable</div>
            ) : (
              <>
                {activeTab === "overview" && quote && (
                  <div className="p-4 flex flex-col gap-3">
                    <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--th-text-muted)" }}>
                      Live Quote
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <MetricCard label="Open"       value={`₹${quote.open.toFixed(2)}`} />
                      <MetricCard label="Prev Close" value={`₹${quote.prev_close.toFixed(2)}`} />
                      <MetricCard label="Day High"   value={`₹${quote.high.toFixed(2)}`}  trend="up" />
                      <MetricCard label="Day Low"    value={`₹${quote.low.toFixed(2)}`}   trend="down" />
                      <MetricCard label="Volume"     value={formatVolume(quote.volume)}    subValue={`Avg: ${formatVolume(quote.avg_volume)}`} />
                      <MetricCard label="Market Cap" value={formatMarketCap(quote.market_cap)} />
                      <MetricCard label="EPS"        value={quote.eps ? `₹${quote.eps.toFixed(2)}` : "N/A"} />
                      <MetricCard label="Div Yield"  value={quote.dividend_yield ? `${quote.dividend_yield.toFixed(2)}%` : "N/A"} />
                    </div>
                    {aiAnalysis ? (
                      <div className="pt-3 flex flex-col gap-2" style={{ borderTop: "1px solid var(--th-border-subtle)" }}>
                        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--th-text-muted)" }}>AI Verdict</span>
                        <VerdictBadge verdict={aiAnalysis.verdict.rating} size="lg" className="w-full justify-center" />
                        <p className="text-[11px] leading-relaxed" style={{ color: "var(--th-text-muted)" }}>
                          {aiAnalysis.verdict.investment_thesis.slice(0, 160)}...
                        </p>
                        <button onClick={() => setActiveTab("ai-report")} className="text-[11px] font-mono hover:underline self-start" style={{ color: "var(--th-blue)" }}>
                          Read full AI report →
                        </button>
                      </div>
                    ) : (
                      <div className="pt-3 text-[10px] font-mono text-center py-3 animate-pulse" style={{ borderTop: "1px solid var(--th-border-subtle)", color: "var(--th-text-faint)" }}>
                        AI analysis generating...
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "technical" && technicals && (
                  <TechnicalPanel indicators={technicals} currentPrice={quote?.current_price ?? 0} />
                )}
                {activeTab === "technical" && !technicals && (
                  <LoadingBlock message="Calculating indicators..." />
                )}

                {activeTab === "fundamentals" && fundamentals && (
                  <FundamentalsPanel
                    data={fundamentals}
                    redFlags={aiAnalysis?.fundamentals.red_flags}
                    summary={aiAnalysis?.fundamentals.summary}
                    strengths={aiAnalysis?.fundamentals.strengths}
                    valuationAssessment={aiAnalysis?.fundamentals.valuation_assessment}
                  />
                )}
                {activeTab === "fundamentals" && !fundamentals && (
                  <LoadingBlock message="Loading fundamentals..." />
                )}

                {activeTab === "macro" && (
                  <MacroPanel ticker={upperTicker} />
                )}

                {activeTab === "risk" && isDesktop && (
                  <div className="p-4"><RiskIntelligencePanel ticker={upperTicker} liveChangePct={quote?.change_pct ?? null} /></div>
                )}

                {activeTab === "news" && (
                  <NewsPanel
                    news={news}
                    sentimentSummary={aiAnalysis?.sentiment.noise_filtered_summary}
                    overallSentiment={aiAnalysis?.sentiment.overall}
                  />
                )}

                {activeTab === "ai-report" && (
                  analysisLoading ? (
                    <div className="p-4 flex flex-col gap-4">
                      <div className="flex items-center gap-2 px-1">
                        <Brain size={13} className="animate-pulse" style={{ color: "var(--th-blue)" }} />
                        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--th-text-faint)" }}>
                          Intelligence engine computing...
                        </span>
                      </div>
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "var(--th-bg-page)", border: "1px solid var(--th-border-subtle)", opacity: 1 - i * 0.12 }} />
                      ))}
                      <div className="text-[9px] font-mono text-center" style={{ color: "var(--th-text-faint)" }}>
                        Using: Ollama local LLM → quant engine → deterministic fallback
                      </div>
                    </div>
                  ) : aiAnalysis ? (
                    <AIResearchPanel analysis={aiAnalysis} />
                  ) : (
                    <div className="p-4 flex flex-col items-center gap-3 py-10">
                      <Brain size={28} style={{ color: "var(--th-text-faint)" }} />
                      <span className="text-xs font-mono text-center max-w-[220px]" style={{ color: "var(--th-text-muted)" }}>
                        Analysis engine initializing
                      </span>
                      <span className="text-[10px] font-mono text-center max-w-[220px]" style={{ color: "var(--th-text-faint)" }}>
                        Works with Ollama local LLM or falls back to deterministic quant analysis
                      </span>
                      <button onClick={loadAIAnalysis} className="text-xs font-mono hover:underline flex items-center gap-1 mt-1" style={{ color: "var(--th-blue)" }}>
                        <RefreshCw size={11} /> Generate Report
                      </button>
                    </div>
                  )
                )}
              </>
            )}
          </div>
        </div>

        {/* CENTER: Chart ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <div
            className="rounded-xl overflow-hidden"
            style={{ height: "520px", background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-card)" }}
          >
            {/* Always mount StockChart with the real ticker.
                The chart fetches its own candles independently from the quote.
                This guarantees the displayed price and chart ALWAYS reference
                the same Yahoo Finance symbol. */}
            <StockChart
              ticker={upperTicker}
              currentPrice={quote?.current_price}
              changePct={quote?.change_pct}
            />
          </div>

          {/* Mobile tabs */}
          <div className="lg:hidden flex overflow-x-auto gap-1 rounded-xl p-1.5" style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-card)" }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono whitespace-nowrap transition-all flex-shrink-0",
                  activeTab === tab.id
                    ? "bg-[var(--th-blue)]/10 border border-[var(--th-blue)]/25"
                    : ""
                )}
                style={activeTab === tab.id ? { color: "var(--th-blue)" } : { color: "var(--th-text-muted)" }}
                onMouseEnter={e => { if (activeTab !== tab.id) { (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-primary)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; } }}
                onMouseLeave={e => { if (activeTab !== tab.id) { (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-muted)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; } }}
              >
                <tab.icon size={11} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Mobile panel */}
          <div className="lg:hidden rounded-xl overflow-auto" style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-card)" }}>
            {loadingQuote ? <LoadingBlock /> : (
              <>
                {activeTab === "technical" && technicals && <TechnicalPanel indicators={technicals} currentPrice={quote?.current_price ?? 0} />}
                {activeTab === "fundamentals" && fundamentals && <FundamentalsPanel data={fundamentals} redFlags={aiAnalysis?.fundamentals.red_flags} summary={aiAnalysis?.fundamentals.summary} strengths={aiAnalysis?.fundamentals.strengths} />}
                {activeTab === "news" && <NewsPanel news={news} sentimentSummary={aiAnalysis?.sentiment.noise_filtered_summary} overallSentiment={aiAnalysis?.sentiment.overall} />}
                {activeTab === "ai-report" && aiAnalysis && <AIResearchPanel analysis={aiAnalysis} />}
                {activeTab === "risk" && !isDesktop && <RiskIntelligencePanel ticker={upperTicker} liveChangePct={quote?.change_pct ?? null} />}
              </>
            )}
          </div>
        </div>

        {/* RIGHT: Intelligence sidebar ────────────────────────────────────── */}
        <div className="hidden xl:flex flex-col w-72 flex-shrink-0 gap-3">
          {/* Price card — always sourced from real quote */}
          {quote && (
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-card)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--th-text-muted)" }}>
                  {quote.ticker} · {quote.exchange}
                </span>
                <span className="text-[9px] font-mono" style={{ color: "var(--th-text-faint)" }}>
                  {new Date(quote.last_updated).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: "28px",
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                    color: "var(--th-text-primary)",
                  }}
                >
                  ₹{quote.current_price.toFixed(2)}
                </div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: "14px",
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    color: isPositive ? "var(--positive)" : "var(--negative)",
                    marginTop: "4px",
                  }}
                >
                  {isPositive ? "▲" : "▼"} {Math.abs(quote.change).toFixed(2)} ({Math.abs(quote.change_pct).toFixed(2)}%)
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { k: "Open",   v: `₹${quote.open.toFixed(2)}` },
                  { k: "High",   v: `₹${quote.high.toFixed(2)}` },
                  { k: "Low",    v: `₹${quote.low.toFixed(2)}`  },
                  { k: "Volume", v: formatVolume(quote.volume)  },
                ].map(({ k, v }) => (
                  <div key={k} className="flex flex-col p-1.5 rounded-lg" style={{ background: "var(--th-bg-page)", border: "1px solid var(--th-border-subtle)" }}>
                    <span className="text-[9px] font-mono" style={{ color: "var(--th-text-faint)" }}>{k}</span>
                    <span className="text-[11px] font-mono" style={{ color: "var(--th-text-primary)" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Verdict — only when available */}
          {aiAnalysis && (
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-card)" }}>
              <span className="text-[10px] font-mono uppercase tracking-widest flex items-center gap-1" style={{ color: "var(--th-text-muted)" }}>
                <Brain size={10} /> AI Verdict
              </span>
              <VerdictBadge verdict={aiAnalysis.verdict.rating} size="lg" className="w-full justify-center" />
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded-lg" style={{ background: "var(--th-bg-page)", border: "1px solid var(--th-border-card)" }}>
                  <div className="text-[9px] font-mono" style={{ color: "var(--th-text-faint)" }} title="Agreement between rule-based indicators. Not a probability of profit.">Signal strength</div>
                  <div className="text-sm font-mono font-bold" style={{ color: "var(--th-blue)" }}>{aiAnalysis.verdict.signal_strength}/100</div>
                </div>
                <div className="p-2 rounded-lg" style={{ background: "var(--th-bg-page)", border: "1px solid var(--th-border-card)" }}>
                  <div className="text-[9px] font-mono" style={{ color: "var(--th-text-faint)" }}>Risk/Reward</div>
                  <div className="text-sm font-mono font-bold" style={{ color: "var(--positive)" }}>{aiAnalysis.verdict.risk_reward}x</div>
                </div>
              </div>
              {aiAnalysis.verdict.stop_loss && (
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded-lg" style={{ background: "rgba(255,68,102,0.05)", border: "1px solid rgba(255,68,102,0.2)" }}>
                    <div className="text-[9px] font-mono" style={{ color: "var(--th-text-faint)" }}>Stop Loss</div>
                    <div className="text-xs font-mono" style={{ color: "var(--negative)" }}>₹{aiAnalysis.verdict.stop_loss.toFixed(0)}</div>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.2)" }}>
                    <div className="text-[9px] font-mono" style={{ color: "var(--th-text-faint)" }}>Target 1</div>
                    <div className="text-xs font-mono" style={{ color: "var(--positive)" }}>₹{aiAnalysis.verdict.target_1?.toFixed(0)}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scenarios */}
          {aiAnalysis && (
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-card)" }}>
              <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--th-text-muted)" }}>Scenarios</span>
              {aiAnalysis.scenarios.map(s => {
                const colors: Record<string, string> = { BULL: "var(--positive)", BASE: "var(--th-blue)", BEAR: "var(--negative)" };
                const c = colors[s.type] ?? "var(--th-text-muted)";
                return (
                  <div key={s.type} className="flex items-center justify-between">
                    <span className="text-[10px] font-mono w-8" style={{ color: c }}>{s.type}</span>
                    <div className="flex-1 mx-3 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--th-border-subtle)" }}>
                      <div className="h-full rounded-full" style={{ width: `${s.probability}%`, background: c }} />
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-mono" style={{ color: "var(--th-text-primary)" }}>₹{s.target_price.toFixed(0)}</div>
                      <div className="text-[9px] font-mono" style={{ color: c }}>{s.probability}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Technical snapshot */}
          {technicals && quote && (
            <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-card)" }}>
              <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--th-text-muted)" }}>Technical Snapshot</span>
              {[
                { label: "RSI 14",    value: technicals.rsi_14.toFixed(1),   color: technicals.rsi_14 > 70 ? "var(--negative)" : technicals.rsi_14 < 30 ? "var(--positive)" : "var(--neutral)" },
                { label: "MACD",      value: technicals.macd_histogram >= 0 ? "Bullish" : "Bearish", color: technicals.macd_histogram >= 0 ? "var(--positive)" : "var(--negative)" },
                { label: "Trend",     value: technicals.trend,               color: technicals.trend === "UPTREND" ? "var(--positive)" : technicals.trend === "DOWNTREND" ? "var(--negative)" : "var(--neutral)" },
                { label: "vs 200 DMA", value: `${(((quote.current_price / technicals.ema_200) - 1) * 100).toFixed(1)}%`, color: quote.current_price > technicals.ema_200 ? "var(--positive)" : "var(--negative)" },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-1 last:border-0" style={{ borderBottom: "1px solid var(--th-border-subtle)" }}>
                  <span className="text-[11px]" style={{ color: "var(--th-text-muted)" }}>{item.label}</span>
                  <span className="text-[11px] font-mono font-semibold" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Shareholding */}
          {fundamentals?.promoter_holding != null && (
            <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-card)" }}>
              <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--th-text-muted)" }}>Shareholding</span>
              {[
                { label: "Promoter", value: fundamentals.promoter_holding!, color: "var(--positive)" },
                { label: "FII",      value: fundamentals.fii_holding ?? 0,   color: "var(--th-blue)" },
                { label: "DII",      value: fundamentals.dii_holding ?? 0,   color: "#aa88ff" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono w-16" style={{ color: "var(--th-text-muted)" }}>{item.label}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--th-border-subtle)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(item.value, 100)}%`, background: item.color }} />
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: item.color }}>{item.value.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Related Intelligence ───────────────────────────────────────────── */}
      <RelatedIntelligence ticker={upperTicker} />
    </div>
  );
}
