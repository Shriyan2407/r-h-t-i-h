"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Clock, RefreshCw, X, Zap, TrendingUp } from "lucide-react";
import type { SearchResult } from "@/lib/types";

/* ─── Static data ────────────────────────────────────────────────────────── */

const POPULAR: SearchResult[] = [
  { ticker: "RELIANCE",   company_name: "Reliance Industries Ltd",         exchange: "NSE", sector: "Energy",            market_cap_category: "Large Cap" },
  { ticker: "TCS",        company_name: "Tata Consultancy Services Ltd",    exchange: "NSE", sector: "IT",                market_cap_category: "Large Cap" },
  { ticker: "HDFCBANK",   company_name: "HDFC Bank Ltd",                    exchange: "NSE", sector: "Banking",           market_cap_category: "Large Cap" },
  { ticker: "INFY",       company_name: "Infosys Ltd",                      exchange: "NSE", sector: "IT",                market_cap_category: "Large Cap" },
  { ticker: "TATAMOTORS", company_name: "Tata Motors Ltd",                  exchange: "NSE", sector: "Auto",              market_cap_category: "Large Cap" },
  { ticker: "HAL",        company_name: "Hindustan Aeronautics Ltd",        exchange: "NSE", sector: "Defense",           market_cap_category: "Large Cap" },
  { ticker: "BEL",        company_name: "Bharat Electronics Ltd",           exchange: "NSE", sector: "Defense",           market_cap_category: "Mid Cap"   },
  { ticker: "ICICIBANK",  company_name: "ICICI Bank Ltd",                   exchange: "NSE", sector: "Banking",           market_cap_category: "Large Cap" },
];

const RECENT_KEY = "rhtih_recent_tickers";

/* ─── Helpers ────────────────────────────────────────────────────────────── */

export const SEARCH_SECTOR_COLORS: Record<string, string> = {
  "IT": "#00AAFF", "Technology": "#00AAFF",
  "Banking": "#FFD700", "Financial Services": "#F59E0B", "Finance": "#F59E0B",
  "Energy": "#FF6B35", "Oil & Gas": "#FF6B35",
  "Defense": "#00FF9C", "Aerospace": "#00FF9C",
  "FMCG": "#34D399", "Consumer": "#34D399",
  "Auto": "#FB923C", "Automobiles": "#FB923C",
  "Pharma": "#A78BFA", "Healthcare": "#A78BFA",
  "Metals": "#94A3B8", "Mining": "#94A3B8",
  "Telecom": "#60A5FA",
  "Infra": "#F472B6", "Infrastructure": "#F472B6",
  "Real Estate": "#C084FC",
  "Chemicals": "#4ADE80",
  "Other": "#6B7280", "Unknown": "#6B7280",
};

const CAP_COLORS: Record<string, string> = {
  "Large Cap": "#FFD700",
  "Mid Cap":   "#60A5FA",
  "Small Cap": "#FB923C",
  "Micro Cap": "#94A3B8",
};

function sCol(s?: string) {
  return SEARCH_SECTOR_COLORS[s ?? "Other"] ?? "#6B7280";
}

function loadRecent(): SearchResult[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); }
  catch { return []; }
}

export function saveRecentTicker(r: SearchResult) {
  const slim = {
    ticker: r.ticker, company_name: r.company_name, exchange: r.exchange,
    sector: r.sector, market_cap_category: r.market_cap_category,
    current_price: r.current_price, change_pct: r.change_pct,
  };
  const list = loadRecent().filter(x => x.ticker !== r.ticker);
  list.unshift(slim);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 5)));
}

/* ─── Shimmer ────────────────────────────────────────────────────────────── */

function ShimmerRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3">
      <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "var(--border-muted)" }} />
      <div className="flex-1 space-y-2">
        <div className="h-2 w-10 rounded overflow-hidden" style={{ background: "var(--border-muted)" }}>
          <motion.div className="h-full w-full"
            style={{ background: "var(--border)" }}
            animate={{ x: ["-100%", "100%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Section header ─────────────────────────────────────────────────────── */

function SectionHeader({ icon, label, right }: {
  icon: React.ReactNode; label: string; right?: string;
}) {
  return (
    <div className="px-5 py-2.5 flex items-center justify-between"
      style={{
        background:   "var(--border-muted)",
        borderBottom: "1px solid var(--border)",
      }}>
      {icon}
      <span className="text-[8.5px] font-mono uppercase tracking-widest"
        style={{ color: "var(--th-text-faint)" }}>{label}</span>
      {right && (
        <span className="text-[8px] font-mono ml-auto" style={{ color: "var(--th-text-faint)" }}>{right}</span>
      )}
    </div>
  );
}

/* ─── Stock card ─────────────────────────────────────────────────────────── */

function StockCard({ r, active, onPick }: {
  r: SearchResult; active: boolean; onPick: () => void;
}) {
  const col  = sCol(r.sector);
  const isUp = (r.change_pct ?? 0) >= 0;

  return (
    <button
      onMouseDown={e => { e.preventDefault(); onPick(); }}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150"
      style={{
        background: active ? "var(--bg-hover)" : "transparent",
        boxShadow: active
          ? "0 0 0 1px var(--border-accent) inset"
          : "none",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--border-muted)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-[8px] font-black flex-shrink-0"
        style={{
          background: `${col}18`,
          border:     `1px solid ${col}30`,
          color:      col,
          boxShadow:  active ? `0 0 14px ${col}30` : "none",
        }}
      >
        {r.ticker.slice(0, 3)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[12px] font-mono font-bold"
            style={{ color: active ? "var(--gold)" : "var(--th-text-primary)" }}>
            {r.ticker}
          </span>
          {r.market_cap_category && (
            <span className="text-[7.5px] font-mono px-1.5 py-px rounded-full"
              style={{
                background: `${CAP_COLORS[r.market_cap_category] ?? "#FFD700"}18`,
                color:      CAP_COLORS[r.market_cap_category] ?? "#FFD700",
              }}>
              {r.market_cap_category}
            </span>
          )}
        </div>
        <div className="text-[10px] truncate" style={{ color: "var(--th-text-muted)" }}>
          {r.company_name}
        </div>
        <div className="flex items-center gap-1.5 mt-px">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md"
            style={{ background: "var(--border-muted)" }}>
            <span className="text-[8px] font-mono" style={{ color: "var(--th-text-faint)" }}>{r.exchange}</span>
          </div>
          {r.sector && r.sector !== "Unknown" && (
            <span className="text-[8.5px] font-semibold" style={{ color: col }}>
              {r.sector}
            </span>
          )}
        </div>
      </div>

      {/* Price */}
      {r.current_price != null && (
        <div className="text-right flex-shrink-0">
          <div className="text-[12px] font-mono font-semibold" style={{ color: "var(--th-text-primary)" }}>
            ₹{r.current_price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
          {r.change_pct != null && (
            <div className="text-[9.5px] font-mono"
              style={{ color: isUp ? "var(--positive)" : "var(--negative)" }}>
              {isUp ? "▲" : "▼"} {Math.abs(r.change_pct).toFixed(2)}%
            </div>
          )}
        </div>
      )}
    </button>
  );
}

/* ─── TickerSearchInput ──────────────────────────────────────────────────── */

export function TickerSearchInput({
  onSelect,
}: {
  onSelect: (r: SearchResult) => void;
}) {
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState<SearchResult[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [open,      setOpen]      = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [recent,    setRecent]    = useState<SearchResult[]>([]);

  const debRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);

  useEffect(() => { setRecent(loadRecent()); }, []);

  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    if (query.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    debRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = res.ok ? await res.json() : [];
        setResults((Array.isArray(data) ? data : (data.results ?? [])).slice(0, 8));
      } catch { setResults([]); }
      finally  { setLoading(false); setActiveIdx(-1); }
    }, 260);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [query]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const showEmpty   = !query || query.length < 2;
  const totalLen    = showEmpty ? (recent.length + POPULAR.length) : results.length;

  const pick = useCallback((r: SearchResult) => {
    saveRecentTicker(r);
    setRecent(loadRecent());
    onSelect(r);
    setOpen(false);
    setQuery("");
  }, [onSelect]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); }
      return;
    }
    if      (e.key === "ArrowDown")  { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, totalLen - 1)); }
    else if (e.key === "ArrowUp")    { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      const list = showEmpty ? [...recent, ...POPULAR] : results;
      pick(list[activeIdx]);
    }
    else if (e.key === "Escape") { setOpen(false); setActiveIdx(-1); }
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value.toUpperCase()); setOpen(true); setActiveIdx(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search ticker or company name..."
          className="w-full text-[12px] font-mono outline-none transition-all duration-200"
          style={{
            background:   "transparent",
            border:       `1px solid ${open ? "var(--border-accent)" : "var(--border)"}`,
            borderRadius: "10px",
            padding:      "10px 36px",
            color:        "var(--th-text-primary)",
          }}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <RefreshCw size={11} className="animate-spin" style={{ color: "var(--gold)" }} />
          ) : query ? (
            <button
              onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
              className="w-5 h-5 flex items-center justify-center rounded transition-colors"
              style={{ background: "var(--border-muted)", color: "var(--th-text-faint)" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--th-text-secondary)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--th-text-faint)"}>
              <X size={11} />
            </button>
          ) : null}
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-16 left-0 right-0 overflow-hidden rounded-xl z-50 flex flex-col"
            style={{
              background:     "var(--th-bg-card)",
              border:         "1px solid var(--border-accent)",
              boxShadow:      "var(--th-shadow-elevated)",
              maxHeight:      "70vh",
            }}
          >
            <div className="overflow-y-auto flex-1">
              {loading && query.length >= 2 ? (
                [0, 1, 2].map(i => <ShimmerRow key={i} />)
              ) : !showEmpty && results.length > 0 ? (
                <>
                  <SectionHeader icon={<TrendingUp size={12}/>} label="Search Results" />
                  {results.map((r, i) => (
                    <StockCard key={r.ticker} r={r} active={i === activeIdx} onPick={() => pick(r)} />
                  ))}
                </>
              ) : showEmpty ? (
                <>
                  {recent.length > 0 && (
                    <>
                      <SectionHeader icon={<Clock size={9} />} label="Recent" />
                      {recent.map((r, i) => (
                        <StockCard key={r.ticker} r={r} active={i === activeIdx} onPick={() => pick(r)} />
                      ))}
                    </>
                  )}
                  <SectionHeader icon={<Zap size={9} />} label="Popular Stocks" />
                  {POPULAR.map((r, i) => (
                    <StockCard key={r.ticker} r={r} active={(i + recent.length) === activeIdx} onPick={() => pick(r)} />
                  ))}
                </>
              ) : (
                <div className="p-8 text-center text-[11px] text-gray-500">No results found.</div>
              )}
            </div>

            <div className="p-3 border-t flex items-center justify-between flex-shrink-0"
              style={{
                background: "var(--th-bg-card)",
                borderColor: "var(--border)",
              }}>
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded text-[9px] font-mono"
                    style={{ color: "var(--th-text-faint)", background: "var(--border-muted)", border: "1px solid var(--border)" }}>↑↓</kbd>
                  <span className="text-[9px] font-mono" style={{ color: "var(--th-text-dim)" }}>to navigate</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── SelectedStockChip ──────────────────────────────────────────────────── */

export function SelectedStockChip({
  stock, onClear,
}: {
  stock:   SearchResult;
  onClear: () => void;
}) {
  const col  = sCol(stock.sector);
  const isUp = (stock.change_pct ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1     }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="rounded-xl p-3 flex items-center gap-3"
      style={{
        background: "var(--th-bg-card)",
        border:    "1px solid var(--border-accent)",
        boxShadow: "0 0 24px var(--shadow-sm)",
      }}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-[9px] font-black flex-shrink-0"
        style={{ background: `${col}20`, border: `1px solid ${col}40`, color: col, boxShadow: `0 0 20px ${col}25` }}
      >
        {stock.ticker.slice(0, 3)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-mono font-bold" style={{ color: "var(--gold)" }}>
            {stock.ticker}
          </span>
          <span
            className="text-[8px] font-mono px-1.5 py-px rounded"
            style={{ background: "var(--border-muted)", color: "var(--th-text-faint)" }}
          >
            {stock.exchange}
          </span>
          {stock.market_cap_category && (
            <span
              className="text-[7.5px] font-mono px-1.5 py-px rounded-full"
              style={{
                background: `${CAP_COLORS[stock.market_cap_category] ?? "#FFD700"}18`,
                color:      CAP_COLORS[stock.market_cap_category] ?? "#FFD700",
              }}
            >
              {stock.market_cap_category}
            </span>
          )}
        </div>
        <div className="text-[10px] truncate mt-0.5" style={{ color: "var(--th-text-muted)" }}>
          {stock.company_name}
        </div>
        {stock.sector && stock.sector !== "Unknown" && (
          <div className="text-[8.5px] mt-0.5 font-semibold" style={{ color: col }}>
            {stock.sector}
          </div>
        )}
      </div>

      {/* Price */}
      {stock.current_price != null && (
        <div className="text-right flex-shrink-0 mr-1">
          <div className="text-[13px] font-mono font-bold" style={{ color: "var(--th-text-primary)" }}>
            ₹{stock.current_price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
          {stock.change_pct != null && (
            <div className="text-[10px] font-mono"
              style={{ color: isUp ? "var(--positive)" : "var(--negative)" }}>
              {isUp ? "▲" : "▼"} {Math.abs(stock.change_pct).toFixed(2)}%
            </div>
          )}
        </div>
      )}

      {/* Clear */}
      <button
        onClick={onClear}
        className="p-1.5 rounded-lg transition-all flex-shrink-0"
        style={{ color: "var(--th-text-faint)" }}
        onMouseEnter={e => {
          e.currentTarget.style.color      = "var(--negative)";
          e.currentTarget.style.background = "var(--danger-muted)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color      = "var(--th-text-faint)";
          e.currentTarget.style.background = "transparent";
        }}
      >
        <X size={13} />
      </button>
    </motion.div>
  );
}
