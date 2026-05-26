"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, ArrowRight, X, Zap } from "lucide-react";
import { searchStocks } from "@/lib/api";
import { formatPercent } from "@/lib/utils";
import type { SearchResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const POPULAR_STOCKS = [
  { ticker: "RELIANCE",   name: "Reliance Industries",       sector: "Energy"     },
  { ticker: "TCS",        name: "Tata Consultancy Services", sector: "Technology" },
  { ticker: "HDFCBANK",   name: "HDFC Bank",                 sector: "Banking"    },
  { ticker: "INFY",       name: "Infosys",                   sector: "Technology" },
  { ticker: "ICICIBANK",  name: "ICICI Bank",                sector: "Banking"    },
  { ticker: "BHARTIARTL", name: "Bharti Airtel",             sector: "Telecom"    },
  { ticker: "WIPRO",      name: "Wipro",                     sector: "Technology" },
  { ticker: "HCLTECH",    name: "HCL Technologies",          sector: "Technology" },
];

const SECTOR_COLORS: Record<string, string> = {
  Energy:     "#FFB800",
  Technology: "#38BDF8",
  Banking:    "#00FF9C",
  Telecom:    "#C084FC",
  Default:    "#6A6A6A",
};

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

interface SearchBarProps {
  size?:        "hero" | "compact";
  placeholder?: string;
  autoFocus?:   boolean;
}

export function SearchBar({
  size        = "hero",
  placeholder = "Search NSE/BSE — ticker or company name",
  autoFocus   = false,
}: SearchBarProps) {
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState<SearchResult[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [focused,     setFocused]     = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);

  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router       = useRouter();

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await searchStocks(q);
      setResults(res.slice(0, 8));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navigate = (ticker: string) => {
    router.push(`/stock/${ticker}`);
    setQuery("");
    setFocused(false);
    setResults([]);
  };

  const getItems = (): SearchResult[] =>
    query
      ? results
      : POPULAR_STOCKS.map(s => ({
          ticker: s.ticker,
          company_name: s.name,
          exchange: "NSE" as const,
          sector: s.sector,
          market_cap_category: "Large Cap" as const,
        }));

  const handleKey = (e: React.KeyboardEvent) => {
    const items = getItems();
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, items.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIdx >= 0 && items[selectedIdx]) navigate(items[selectedIdx].ticker);
      else if (query.trim()) navigate(query.trim().toUpperCase());
    }
    if (e.key === "Escape") { setFocused(false); inputRef.current?.blur(); }
  };

  const dropdownItems = getItems();
  const isHero = size === "hero";

  return (
    <div ref={containerRef} className="relative w-full">

      {/* ── Input ── */}
      <div
        className={cn(
          "relative flex items-center rounded-xl overflow-hidden transition-all duration-300",
          isHero ? "h-14" : "h-10"
        )}
        style={{
          background: "rgba(14,14,14,0.92)",
          backdropFilter: "blur(20px)",
          border: focused
            ? "1px solid rgba(255,215,0,0.4)"
            : "1px solid rgba(255,215,0,0.1)",
          boxShadow: focused
            ? "0 0 0 3px rgba(255,215,0,0.05), 0 0 30px rgba(255,215,0,0.08)"
            : "0 4px 24px rgba(0,0,0,0.4)",
        }}
      >
        {/* Shimmer overlay when focused */}
        {focused && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.03) 50%, transparent 100%)",
              backgroundSize: "200% auto",
              animation: "shimmer 3s linear infinite",
            }}
          />
        )}

        {/* Search icon */}
        <div
          className={cn(
            "absolute flex items-center justify-center transition-all duration-300",
            isHero ? "left-4" : "left-3"
          )}
          style={{ color: focused ? "#FFD700" : "#4A4A4A" }}
        >
          {loading ? (
            <div
              className="rounded-full animate-spin"
              style={{
                width: isHero ? 16 : 13,
                height: isHero ? 16 : 13,
                border: "1.5px solid rgba(255,215,0,0.2)",
                borderTopColor: "#FFD700",
              }}
            />
          ) : (
            <Search size={isHero ? 16 : 13} />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelectedIdx(-1); }}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className={cn(
            "w-full bg-transparent outline-none font-mono relative z-10",
            "placeholder:text-[#2A2A2A]",
            isHero ? "pl-12 pr-24 text-[13px]" : "pl-9 pr-16 text-[11px]",
            "h-full"
          )}
          style={{ color: "#F5F5F5" }}
        />

        <div className="absolute right-3 flex items-center gap-2 z-10">
          {query && (
            <button
              onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
              className="text-[#4A4A4A] hover:text-[#8A8A8A] transition-colors"
            >
              <X size={13} />
            </button>
          )}
          {!query && (
            <kbd
              className="hidden sm:flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono"
              style={{
                color: "#4A4A4A",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* ── Dropdown ── */}
      <AnimatePresence>
        {focused && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50"
            style={{
              background: "rgba(9,9,9,0.98)",
              border: "1px solid rgba(255,215,0,0.13)",
              backdropFilter: "blur(24px)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,215,0,0.04)",
            }}
          >
            {!query && (
              <div
                className="flex items-center gap-2 px-4 py-2.5"
                style={{ borderBottom: "1px solid rgba(255,215,0,0.05)" }}
              >
                <TrendingUp size={10} style={{ color: "#FFD700" }} />
                <span
                  className="text-[9px] font-mono uppercase tracking-[0.18em]"
                  style={{ color: "#4A4A4A" }}
                >
                  Popular Stocks
                </span>
              </div>
            )}

            {dropdownItems.length > 0 ? (
              <ul>
                {dropdownItems.map((item, idx) => {
                  const sectorColor = SECTOR_COLORS[item.sector || ""] || SECTOR_COLORS.Default;
                  const rgb = hexToRgb(sectorColor);
                  const active = idx === selectedIdx;

                  return (
                    <li key={item.ticker} style={{ borderBottom: "1px solid rgba(255,215,0,0.03)" }}>
                      <button
                        onMouseEnter={() => setSelectedIdx(idx)}
                        onClick={() => navigate(item.ticker)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-100"
                        style={{
                          background: active ? "rgba(255,215,0,0.04)" : "transparent",
                          borderLeft: active ? "2px solid #FFD700" : "2px solid transparent",
                        }}
                      >
                        {/* Sector badge */}
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-mono font-bold text-[10px]"
                          style={{
                            background: `rgba(${rgb.r},${rgb.g},${rgb.b},0.08)`,
                            border: `1px solid rgba(${rgb.r},${rgb.g},${rgb.b},0.2)`,
                            color: sectorColor,
                          }}
                        >
                          {item.ticker.slice(0, 3)}
                        </div>

                        {/* Stock info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[13px] font-mono font-semibold" style={{ color: "#F5F5F5" }}>
                              {item.ticker}
                            </span>
                            <span
                              className="text-[8.5px] font-mono px-1.5 py-0.5 rounded"
                              style={{
                                color: "#4A4A4A",
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.06)",
                              }}
                            >
                              {item.exchange}
                            </span>
                            {item.market_cap_category && (
                              <span className="text-[8.5px] font-mono" style={{ color: "#3A3A3A" }}>
                                {item.market_cap_category}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] truncate" style={{ color: "#6A6A6A" }}>
                              {item.company_name}
                            </span>
                            {item.sector && (
                              <span className="text-[9px] font-mono" style={{ color: sectorColor }}>
                                {item.sector}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="flex flex-col items-end flex-shrink-0">
                          {item.current_price && (
                            <span className="text-[12px] font-mono" style={{ color: "#F5F5F5" }}>
                              ₹{item.current_price.toFixed(2)}
                            </span>
                          )}
                          {item.change_pct !== undefined && (
                            <span
                              className="text-[10px] font-mono"
                              style={{ color: item.change_pct >= 0 ? "#00FF9C" : "#FF4D4D" }}
                            >
                              {formatPercent(item.change_pct)}
                            </span>
                          )}
                        </div>

                        <ArrowRight size={11} style={{ color: "#2A2A2A", flexShrink: 0 }} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : query && !loading ? (
              <div className="px-4 py-10 text-center">
                <Search size={20} className="mx-auto mb-3" style={{ color: "#2A2A2A" }} />
                <p className="text-[11px] font-mono" style={{ color: "#4A4A4A" }}>
                  No results for &ldquo;{query}&rdquo;
                </p>
              </div>
            ) : null}

            {/* Footer */}
            <div
              className="flex items-center justify-between px-4 py-2"
              style={{ borderTop: "1px solid rgba(255,215,0,0.05)" }}
            >
              <div className="flex items-center gap-3">
                {[
                  { key: "↑↓", label: "navigate" },
                  { key: "↵",  label: "open"     },
                  { key: "esc",label: "close"     },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-1">
                    <kbd
                      className="px-1.5 py-0.5 rounded text-[8px] font-mono"
                      style={{
                        color: "#FFD700",
                        background: "rgba(255,215,0,0.06)",
                        border: "1px solid rgba(255,215,0,0.15)",
                      }}
                    >
                      {key}
                    </kbd>
                    <span className="text-[8.5px] font-mono" style={{ color: "#3A3A3A" }}>{label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <Zap size={9} style={{ color: "#FFD700" }} />
                <span className="text-[8.5px] font-mono" style={{ color: "#3A3A3A" }}>AI-powered</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
