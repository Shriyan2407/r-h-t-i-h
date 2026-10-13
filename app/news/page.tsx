"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { MarketTicker } from "@/components/MarketTicker";
import type { NewsItem } from "@/lib/services/newsAggregator";
import { detectCategory, extractTickers, feedStats, timeAgo } from "@/lib/news/format";

const SENT: Record<NewsItem["sentiment"], { label: string; color: string }> = {
  positive: { label: "Positive wording", color: "var(--positive)" },
  negative: { label: "Negative wording", color: "var(--negative)" },
  neutral: { label: "Neutral wording", color: "var(--th-text-muted)" },
};

const card: React.CSSProperties = { background: "var(--th-bg-card)", border: "1px solid var(--th-border-card)", borderRadius: 12 };
const label: React.CSSProperties = { fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--th-text-muted)" };

function Article({ item }: { item: NewsItem }) {
  const s = SENT[item.sentiment] ?? SENT.neutral;
  const tickers = extractTickers(item.title);
  return (
    <article style={{ ...card, padding: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 11, color: "var(--th-text-muted)" }}>
        <span>{detectCategory(item.title)}</span>
        <span aria-hidden>·</span>
        <span style={{ color: s.color }}>{s.label}</span>
        <span aria-hidden>·</span>
        <time dateTime={item.publishedAt}>{timeAgo(item.ageHours)}</time>
        <span style={{ marginLeft: "auto" }}>{item.source.split(" / ")[0]}</span>
      </div>
      <h2 style={{ fontSize: 15, fontWeight: 600, margin: "6px 0 0", lineHeight: 1.4 }}>
        {item.url ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }} className="hover:underline">
            {item.title} <ExternalLink size={11} className="inline opacity-50" aria-label="(opens in a new tab)" />
          </a>
        ) : item.title}
      </h2>
      {item.summary?.trim() && item.summary.trim() !== item.title && (
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--th-text-dim)", lineHeight: 1.5 }}>{item.summary.trim().slice(0, 280)}</p>
      )}
      {tickers.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {tickers.map((t) => (
            <Link key={t} href={`/stock/${t}`} style={{ fontSize: 11, fontFamily: "monospace", padding: "2px 7px", borderRadius: 6, border: "1px solid var(--th-border-normal)", color: "var(--gold)" }}>
              {t}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}

function Skeleton() {
  return <div aria-hidden className="animate-pulse motion-reduce:animate-none" style={{ ...card, height: 110, opacity: 0.6 }} />;
}

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string>("");

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch("/api/news/market", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems((data.items ?? []) as NewsItem[]);
      setError(null);
      setFetchedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch news");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; state is set after the await
    void load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 5 * 60_000);
    return () => clearInterval(id);
  }, [load]);

  const stats = useMemo(() => feedStats(items), [items]);

  return (
    <div className="min-h-screen" style={{ background: "var(--th-bg-page)" }}>
      <Navbar />
      <MarketTicker />
      <main className="max-w-[1300px] mx-auto px-4 sm:px-6 py-6">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Market news</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--th-text-muted)" }}>
              Headlines from public RSS feeds. Topic and tone are keyword-based labels, not analysis.
              {fetchedAt && ` Fetched ${fetchedAt}.`}
            </p>
          </div>
          <button onClick={() => load(true)} disabled={refreshing} aria-busy={refreshing}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, padding: "7px 12px", borderRadius: 8, border: "1px solid var(--th-border-normal)", background: "transparent", color: "var(--gold)", cursor: refreshing ? "wait" : "pointer" }}>
            <RefreshCw size={13} className={refreshing ? "animate-spin motion-reduce:animate-none" : ""} /> {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
          <section aria-label="Articles" aria-busy={loading} style={{ display: "grid", gap: 10, alignContent: "start" }}>
            {loading ? (
              Array.from({ length: 5 }, (_, i) => <Skeleton key={i} />)
            ) : error ? (
              <div role="alert" style={{ ...card, padding: 20 }}>
                <p style={{ margin: 0 }}>The news feed could not be loaded ({error}).</p>
                <button onClick={() => load(true)} style={{ marginTop: 10, color: "var(--gold)", background: "none", border: 0, cursor: "pointer", padding: 0 }}>Retry</button>
              </div>
            ) : items.length === 0 ? (
              <div style={{ ...card, padding: 20 }}>No articles right now. The RSS sources may be temporarily unavailable.</div>
            ) : (
              items.map((it, i) => <Article key={`${it.url}-${i}`} item={it} />)
            )}
          </section>

          <aside style={{ display: "grid", gap: 12, alignContent: "start" }} aria-label="Feed summary">
            <section style={{ ...card, padding: 16 }}>
              <h2 style={{ ...label, margin: "0 0 8px" }}>This feed ({stats.total} articles)</h2>
              {(["positive", "neutral", "negative"] as const).map((k) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "2px 0" }}>
                  <span style={{ color: SENT[k].color }}>{SENT[k].label}</span>
                  <span style={{ fontFamily: "monospace" }}>{stats.sentiment[k]}</span>
                </div>
              ))}
              <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--th-text-muted)" }}>Counts of headline wording, not a market sentiment index.</p>
            </section>
            {stats.categories.length > 0 && (
              <section style={{ ...card, padding: 16 }}>
                <h2 style={{ ...label, margin: "0 0 8px" }}>Topics</h2>
                {stats.categories.map((c) => (
                  <div key={c.category} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "2px 0" }}>
                    <span>{c.category}</span><span style={{ fontFamily: "monospace" }}>{c.count}</span>
                  </div>
                ))}
              </section>
            )}
            {stats.tickers.length > 0 && (
              <section style={{ ...card, padding: 16 }}>
                <h2 style={{ ...label, margin: "0 0 8px" }}>Most mentioned</h2>
                {stats.tickers.map((t) => (
                  <div key={t.ticker} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "2px 0" }}>
                    <Link href={`/stock/${t.ticker}`} style={{ color: "var(--gold)", fontFamily: "monospace" }}>{t.ticker}</Link>
                    <span style={{ fontFamily: "monospace" }}>{t.count}</span>
                  </div>
                ))}
              </section>
            )}
            <p style={{ fontSize: 11, color: "var(--th-text-muted)", margin: 0 }}>
              For a stock&apos;s expected volatility and market regime, open the stock and choose <em>Risk Model</em>.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}
