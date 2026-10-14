"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, RefreshCw, Trash2, BarChart2,
  ArrowRight, Clock, X, Activity,
} from "lucide-react";
import { Navbar }        from "@/components/Navbar";
import { MarketTicker }  from "@/components/MarketTicker";
import { SearchBar }     from "@/components/SearchBar";
import { useWatchlistStore, type WatchlistItem } from "@/store/watchlistStore";
import { useLiveQuotes } from "@/lib/hooks/useLiveQuotes";
import type { LiveQuote as StreamQuote } from "@/lib/live/quotes";
import { cn }            from "@/lib/utils";

/* ── Live quote hook ─────────────────────────── */

interface LiveQuote {
  price: number; change: number; changePct: number;
  volume: number; high: number; low: number;
  loading: boolean; error: boolean;
}

function useLiveQuote(ticker: string) {
  const [q, setQ] = useState<LiveQuote>({
    price: 0, change: 0, changePct: 0,
    volume: 0, high: 0, low: 0,
    loading: true, error: false,
  });

  const fetch_ = useCallback(async () => {
    setQ(p => ({ ...p, loading: true, error: false }));
    try {
      const res  = await fetch(`/api/stocks/${ticker}/quote`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error();
      setQ({ price: data.current_price, change: data.change, changePct: data.change_pct,
             volume: data.volume, high: data.high, low: data.low, loading: false, error: false });
    } catch {
      setQ(p => ({ ...p, loading: false, error: true }));
    }
  }, [ticker]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { quote: q, refresh: fetch_ };
}

/* ── Single watchlist card ───────────────────── */

function WatchCard({ item, onRemove, live }: { item: WatchlistItem; onRemove: () => void; live?: StreamQuote }) {
  const { quote: snapshot, refresh } = useLiveQuote(item.ticker);
  // Streamed (delayed) price/change overlays the snapshot; high/low/volume stay from the snapshot.
  const quote = live ? { ...snapshot, price: live.price, change: live.change, changePct: live.changePct, loading: false, error: false } : snapshot;
  const isUp  = quote.changePct >= 0;
  const added = new Date(item.addedAt);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ duration: 0.22 }}
      className="group relative rounded-xl overflow-hidden transition-all duration-300"
      style={{
        background: "var(--th-bg-card)",
        border: "1px solid var(--th-border-subtle)",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "var(--th-border-accent)";
        el.style.boxShadow   = "0 12px 40px rgba(0,0,0,0.5)";
        el.style.transform   = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "var(--th-border-subtle)";
        el.style.boxShadow   = "none";
        el.style.transform   = "translateY(0)";
      }}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[1.5px] transition-all duration-500"
        style={{
          background: quote.loading
            ? "var(--th-border-normal)"
            : isUp
            ? "var(--positive)"
            : "var(--negative)",
          opacity: quote.loading ? 0.4 : 0.7,
        }}
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <Link href={`/stock/${item.ticker}`} className="flex items-center gap-2.5 group/lnk">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-mono font-bold text-[10px]"
              style={{
                background: "var(--th-border-subtle)",
                border: "1px solid var(--th-border-normal)",
                color: "var(--gold)",
              }}
            >
              {item.ticker.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[13px] font-mono font-bold transition-colors duration-200 group-hover/lnk:text-[#FFD700]"
                  style={{ color: "var(--th-text-primary)" }}
                >
                  {item.ticker}
                </span>
                <span
                  className="text-[8.5px] font-mono px-1.5 py-0.5 rounded"
                  style={{
                    color: "var(--th-text-muted)",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {item.exchange}
                </span>
              </div>
              <div className="text-[11px] truncate max-w-[160px]" style={{ color: "var(--th-text-muted)" }}>
                {item.name}
              </div>
            </div>
          </Link>

          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all duration-200"
            style={{ color: "var(--th-text-faint)" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color      = "var(--negative)";
              (e.currentTarget as HTMLButtonElement).style.background = "var(--th-red-bg)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color      = "var(--th-text-faint)";
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Price */}
        <div className="flex items-end justify-between">
          <div>
            {quote.loading ? (
              <div className="flex flex-col gap-1.5">
                <div className="w-24 h-5 skeleton rounded" />
                <div className="w-16 h-3.5 skeleton rounded" />
              </div>
            ) : quote.error ? (
              <div className="text-[11px] font-mono" style={{ color: "var(--th-text-faint)" }}>
                Price unavailable
              </div>
            ) : (
              <>
                <div className="text-[20px] font-mono font-bold" style={{ color: "var(--th-text-primary)" }}>
                  ₹{quote.price.toFixed(2)}
                </div>
                <div
                  className="text-[11px] font-mono font-semibold"
                  style={{ color: isUp ? "var(--positive)" : "var(--negative)" }}
                >
                  {isUp ? "▲" : "▼"} {Math.abs(quote.change).toFixed(2)} ({Math.abs(quote.changePct).toFixed(2)}%)
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {!quote.loading && !quote.error && (
              <div className="flex items-center gap-2.5 text-[9.5px] font-mono" style={{ color: "var(--th-text-faint)" }}>
                <span>H ₹{quote.high.toFixed(0)}</span>
                <span>L ₹{quote.low.toFixed(0)}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <button
                onClick={refresh}
                className="p-1 rounded transition-colors"
                style={{ color: "var(--th-text-faint)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-muted)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-faint)"; }}
              >
                <RefreshCw size={10} />
              </button>
              <Link
                href={`/stock/${item.ticker}`}
                className="flex items-center gap-1 px-2 py-1 rounded text-[9.5px] font-mono transition-all duration-200"
                style={{
                  color: "var(--th-text-muted)",
                  background: "var(--th-border-subtle)",
                  border: "1px solid var(--th-border-normal)",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.color       = "var(--gold)";
                  el.style.borderColor = "var(--th-border-strong)";
                  el.style.background  = "var(--th-border-subtle)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.color       = "var(--th-text-muted)";
                  el.style.borderColor = "var(--th-border-normal)";
                  el.style.background  = "var(--th-border-subtle)";
                }}
              >
                Analyze <ArrowRight size={9} />
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="mt-3 pt-2.5 flex items-center justify-between"
          style={{ borderTop: "1px solid var(--th-border-subtle)" }}
        >
          <span className="text-[9.5px] font-mono" style={{ color: "var(--th-text-faint)" }}>{item.sector}</span>
          <span className="text-[9px] font-mono flex items-center gap-1" style={{ color: "var(--th-text-ultra-faint)" }}>
            <Clock size={8} />
            Added {added.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Empty state ────────────────────────────── */

function EmptyWatchlist() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-6 py-28"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background: "var(--th-bg-elevated)",
          border: "1px solid var(--th-border-normal)",
        }}
      >
        <Star size={22} style={{ color: "var(--th-text-ultra-faint)" }} />
      </div>
      <div className="text-center">
        <h3
          className="font-semibold mb-2"
          style={{
            fontFamily: "var(--font-space-grotesk, sans-serif)",
            fontSize: "16px",
            color: "var(--th-text-primary)",
          }}
        >
          No stocks in watchlist
        </h3>
        <p className="text-[13px] max-w-xs" style={{ color: "var(--th-text-muted)" }}>
          Search for a stock and click{" "}
          <strong style={{ color: "var(--gold)" }}>Watch</strong> to track it here.
        </p>
      </div>
      <div className="w-full max-w-sm">
        <SearchBar size="compact" placeholder="Search stocks to add..." />
      </div>
    </motion.div>
  );
}

/* ── Page ───────────────────────────────────── */

export default function WatchlistPage() {
  const { items, remove, clear } = useWatchlistStore();
  // One SSE connection for the whole list (max 20 tickers per stream).
  const { quotes: liveQuotes } = useLiveQuotes(items.slice(0, 20).map((i) => i.ticker));
  const [mounted,      setMounted]      = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleClear = () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    clear();
    setConfirmClear(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--th-bg-page)" }}>
      <Navbar />
      <MarketTicker />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-10">

        {/* ── Page Header ── */}
        <div className="flex items-start sm:items-center justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "var(--th-border-card)", border: "1px solid var(--th-border-accent)" }}
              >
                <Star size={13} style={{ color: "var(--gold)" }} />
              </div>
              <h1
                className="font-bold"
                style={{
                  fontFamily: "var(--font-space-grotesk, sans-serif)",
                  fontSize: "22px",
                  color: "var(--th-text-primary)",
                }}
              >
                Watchlist
              </h1>
              {mounted && items.length > 0 && (
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                  style={{
                    color: "var(--gold)",
                    background: "var(--th-border-card)",
                    border: "1px solid var(--th-border-accent)",
                  }}
                >
                  {items.length} {items.length === 1 ? "stock" : "stocks"}
                </span>
              )}
            </div>
            <p className="text-[12px] font-mono" style={{ color: "var(--th-text-muted)" }}>
              Stocks you&apos;re tracking — live prices · click any to analyze
            </p>
          </div>

          {mounted && items.length > 0 && (
            <button
              onClick={handleClear}
              onBlur={() => setConfirmClear(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all duration-200 flex-shrink-0"
              style={confirmClear ? {
                color: "var(--negative)",
                background: "var(--th-red-bg)",
                border: "1px solid rgba(255,77,77,0.28)",
              } : {
                color: "var(--th-text-muted)",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--th-border-card)",
              }}
            >
              <Trash2 size={11} />
              {confirmClear ? "Confirm clear?" : "Clear all"}
            </button>
          )}
        </div>

        {/* ── Content ── */}
        {!mounted ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-[180px] skeleton rounded-xl"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyWatchlist />
        ) : (
          <>
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              <AnimatePresence mode="popLayout">
                {items.map(item => (
                  <WatchCard key={item.ticker} item={item} live={liveQuotes[item.ticker]} onRemove={() => remove(item.ticker)} />
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Add more strip */}
            <div
              className="mt-10 pt-8"
              style={{ borderTop: "1px solid var(--th-border-subtle)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 size={12} style={{ color: "var(--gold)" }} />
                <span
                  className="text-[9.5px] font-mono uppercase tracking-[0.18em]"
                  style={{ color: "var(--th-text-muted)" }}
                >
                  Add more stocks
                </span>
              </div>
              <div className="max-w-md">
                <SearchBar size="compact" placeholder="Search NSE/BSE stocks..." />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
