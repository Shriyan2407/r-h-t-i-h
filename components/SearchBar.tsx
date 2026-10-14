"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, X, Zap, ChevronRight, Flame, ArrowUpRight } from "lucide-react";
import { searchStocks } from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/lib/context/ThemeContext";
import {
  intelligentSearch,
  getTrending,
  resolveAliasesToTickers,
  type SearchResultGroup,
  type SearchResultItem,
} from "@/lib/search/searchEngine";
import type { SearchResult } from "@/lib/types";

/* ── Props ────────────────────────────────────────────────────────────── */

interface SearchBarProps {
  size?:        "hero" | "compact";
  placeholder?: string;
  autoFocus?:   boolean;
}

/* ── Category colours ─────────────────────────────────────────────────── */

const KIND_META = {
  stock:    { color: "var(--gold)",     bg: "var(--th-gold-bg-strong)",    label: "STOCK"    },
  sector:   { color: "var(--th-blue)",  bg: "var(--th-blue-bg)",           label: "SECTOR"   },
  theme:    { color: "var(--positive)", bg: "var(--th-green-bg)",          label: "THEME"    },
  person:   { color: "var(--neutral)",  bg: "rgba(255,184,0,0.08)",        label: "PERSON"   },
  trending: { color: "var(--gold)",     bg: "var(--th-gold-bg)",           label: "TRENDING" },
} as const;

const MOMENTUM_ICON = {
  hot:    <Flame size={9} />,
  rising: <ArrowUpRight size={9} />,
  steady: <TrendingUp size={9} />,
};

/* ══════════════════════════════════════════════════════════════════════════
   SEARCH BAR COMPONENT
══════════════════════════════════════════════════════════════════════════ */

export function SearchBar({
  size        = "hero",
  placeholder = "Search stocks, sectors, themes, CEOs…",
  autoFocus   = false,
}: SearchBarProps) {
  const router  = useRouter();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [query,        setQuery]        = useState("");
  const [focused,      setFocused]      = useState(false);
  const [apiResults,   setApiResults]   = useState<SearchResult[]>([]);
  const [intelGroups,  setIntelGroups]  = useState<SearchResultGroup[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [selectedIdx,  setSelectedIdx]  = useState(-1);

  const inputRef    = useRef<HTMLInputElement>(null);
  const dropRef     = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trending = getTrending();
  const isHero   = size === "hero";
  const showDrop = focused && (query.length > 0 || true);

  /* ── Auto-focus ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (autoFocus) setTimeout(() => inputRef.current?.focus(), 80);
  }, [autoFocus]);

  /* ── Escape closes the dropdown (Ctrl/⌘+K belongs to the global command palette) ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFocused(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* ── Click outside ──────────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Debounced search ───────────────────────────────────────────────── */
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setApiResults([]);
      setIntelGroups([]);
      return;
    }

    // 1. Instant client-side intelligence
    const intel = intelligentSearch(q);
    setIntelGroups(intel);

    // 2. Resolve aliases to extra tickers for API search
    const extraTickers = resolveAliasesToTickers(q);

    // 3. API search (actual quotes)
    setLoading(true);
    try {
      // Search original query + first alias-resolved ticker
      const searchQ = extraTickers.length > 0 && extraTickers[0] !== q.toUpperCase()
        ? `${q} ${extraTickers[0]}`
        : q;
      const results = await searchStocks(searchQ);
      setApiResults(results.slice(0, 6));
    } catch {
      setApiResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  /* ── Flat navigation list ────────────────────────────────────────────── */
  const flatItems: { href: string; ticker?: string }[] = [
    ...intelGroups.flatMap(g => g.items.map(i => ({ href: i.href }))),
    ...apiResults.map(r => ({ href: `/stock/${r.ticker}`, ticker: r.ticker })),
  ];

  /* ── Keyboard nav ───────────────────────────────────────────────────── */
  const handleKey = (e: React.KeyboardEvent) => {
    if (!focused) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIdx >= 0 && flatItems[selectedIdx]) {
        router.push(flatItems[selectedIdx].href);
        setFocused(false);
        setQuery("");
      } else if (query.trim()) {
        const ticker = query.trim().toUpperCase();
        router.push(`/stock/${ticker}`);
        setFocused(false);
        setQuery("");
      }
    }
  };

  const navigate = (href: string) => {
    router.push(href);
    setFocused(false);
    setQuery("");
    setApiResults([]);
    setIntelGroups([]);
  };

  /* ── Merge intel stocks with API results ─────────────────────────────── */
  const intelStockTickers = new Set(
    intelGroups.find(g => g.kind === "stock")?.items.map(i => i.id) ?? []
  );
  const apiOnly = apiResults.filter(r => !intelStockTickers.has(r.ticker));

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════ */

  return (
    <div className="relative w-full" style={{ isolation: "isolate" }}>

      {/* ── Input container ─────────────────────────────────────────────── */}
      <div
        className={cn(
          "relative flex items-center rounded-2xl overflow-hidden transition-all duration-300",
          isHero ? "h-14" : "h-10"
        )}
        style={{
          background: focused ? "var(--th-bg-card)" : "var(--muted)",
          border: "1px solid " + (focused ? "var(--border-accent)" : "var(--border-muted)"),
          boxShadow: focused ? "0 0 0 3px var(--primary-muted), var(--th-shadow-elevated)" : "none",
        }}
      >
        {/* Shimmer on focus */}
        {focused && (
          <div className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent 0%, var(--th-gold-bg) 50%, transparent 100%)",
              backgroundSize: "200% auto",
              animation: "shimmer 3s linear infinite",
            }}
          />
        )}

        {/* Search icon */}
        <div className={cn("absolute flex items-center justify-center transition-all duration-200", isHero ? "left-4" : "left-3")}>
          {loading
            ? <div className="rounded-full animate-spin"
                style={{
                  width: isHero ? 16 : 13, height: isHero ? 16 : 13,
                  border: "1.5px solid var(--th-border-normal)",
                  borderTopColor: "var(--gold)",
                }}
              />
            : <Search size={isHero ? 16 : 13} style={{ color: focused ? "var(--gold)" : "var(--th-text-muted)" }} />
          }
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelectedIdx(-1); }}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKey}
          placeholder={focused ? "RELIANCE · TCS · defense stocks · Mukesh Ambani · AI plays…" : placeholder}
          className={cn(
            "w-full bg-transparent outline-none font-mono relative z-10",
            isHero ? "pl-12 pr-24 text-[13px]" : "pl-9 pr-16 text-[11px]",
            "h-full"
          )}
          style={{
            color: "var(--th-text-primary)",
          }}
        />

        {/* Right slot */}
        <div className="absolute right-3 flex items-center gap-2 z-10">
          {query && (
            <button onClick={() => { setQuery(""); setApiResults([]); setIntelGroups([]); inputRef.current?.focus(); }}
              className="transition-opacity hover:opacity-80"
              style={{ color: "var(--th-text-muted)" }}>
              <X size={13} />
            </button>
          )}
          {!query && (
            <kbd className="hidden sm:flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono"
              style={{
                color: "var(--th-text-faint)",
                background: "var(--border-muted)",
                border: "1px solid var(--border)",
              }}>
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          DROPDOWN
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {focused && (
          <motion.div
            ref={dropRef}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50"
            style={{
              background: "var(--th-bg-card)",
              border: "1px solid var(--border-accent)",
              backdropFilter: "blur(32px)",
              boxShadow: "var(--th-shadow-elevated)",
              maxHeight: "72vh",
              overflowY: "auto",
            }}
          >
            {/* ── No query: Trending ─────────────────────────────────────── */}
            {!query && (
              <div>
                <SectionHeader icon={<Flame size={9} />} label="TRENDING SEARCHES" color="var(--gold)" />
                <div className="pb-2">
                  {trending.map((t, i) => (
                    <TrendingRow
                      key={t.query}
                      item={t}
                      selected={selectedIdx === i}
                      onSelect={() => {
                        if (t.ticker) navigate(`/stock/${t.ticker}`);
                        else { setQuery(t.query); inputRef.current?.focus(); }
                      }}
                    />
                  ))}
                </div>
                <DropFooter />
              </div>
            )}

            {/* ── Has query: Results ────────────────────────────────────── */}
            {query && (
              <div>
                {/* Intelligence groups */}
                {intelGroups.map((group, gi) => (
                  <div key={group.kind}>
                    <SectionHeader icon={<span>{group.icon}</span>} label={group.label} color={KIND_META[group.kind].color} />
                    {group.items.map((item, ii) => {
                      const flatIdx = intelGroups.slice(0, gi).reduce((acc, g) => acc + g.items.length, 0) + ii;
                      return (
                        <IntelResultRow
                          key={`${item.kind}-${item.id}`}
                          item={item}
                          selected={selectedIdx === flatIdx}
                          onSelect={() => navigate(item.href)}
                        />
                      );
                    })}
                  </div>
                ))}

                {/* API results (real quotes) not already shown */}
                {apiOnly.length > 0 && (
                  <div>
                    <SectionHeader icon={<Zap size={9} />} label="LIVE QUOTES" color="var(--th-blue)" />
                    {apiOnly.map((r, i) => {
                      const baseIdx = intelGroups.reduce((a, g) => a + g.items.length, 0) + i;
                      const isUp = (r.change_pct ?? 0) >= 0;
                      return (
                        <button
                          key={r.ticker}
                          onClick={() => navigate(`/stock/${r.ticker}`)}
                          className="w-full px-4 py-2.5 flex items-center gap-3 transition-all duration-150 text-left group"
                          style={{
                            background: selectedIdx === baseIdx ? "var(--th-gold-bg-mid)" : "transparent",
                          }}
                          onMouseEnter={() => setSelectedIdx(baseIdx)}
                        >
                          <TickerChip ticker={r.ticker} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-mono font-semibold truncate" style={{ color: "var(--th-text-primary)" }}>
                              {r.company_name || r.ticker}
                            </div>
                          </div>
                          {r.current_price && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-[11px] font-mono" style={{ color: "var(--th-text-secondary)" }}>
                                ₹{r.current_price.toFixed(2)}
                              </span>
                              <span className="text-[10px] font-mono font-bold"
                                style={{ color: isUp ? "var(--positive)" : "var(--negative)" }}>
                                {isUp ? "▲" : "▼"} {Math.abs(r.change_pct ?? 0).toFixed(2)}%
                              </span>
                            </div>
                          )}
                          <ChevronRight size={10} style={{ color: "var(--th-text-faint)" }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Empty state */}
                {intelGroups.length === 0 && apiOnly.length === 0 && !loading && (
                  <div className="px-5 py-8 text-center">
                    <div className="text-[11px] font-mono" style={{ color: "var(--th-text-faint)" }}>
                      No matches for "{query}"
                    </div>
                    <button
                      onClick={() => navigate(`/stock/${query.toUpperCase()}`)}
                      className="mt-3 text-[10px] font-mono px-3 py-1.5 rounded-lg transition-all"
                      style={{ color: "var(--gold)", background: "var(--th-gold-bg)", border: "1px solid var(--th-border-accent)" }}
                    >
                      Try {query.toUpperCase()} directly →
                    </button>
                  </div>
                )}

                <DropFooter />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════════════════════ */

function SectionHeader({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
      <span style={{ color }}>{icon}</span>
      <span className="text-[8.5px] font-mono uppercase tracking-[0.22em]" style={{ color }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: `${color}20` }} />
    </div>
  );
}

function TickerChip({ ticker }: { ticker: string }) {
  return (
    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md flex-shrink-0 min-w-[52px] text-center"
      style={{
        background: "var(--th-gold-bg-strong)",
        border: "1px solid var(--th-border-accent)",
        color: "var(--gold)",
      }}>
      {ticker.slice(0, 8)}
    </span>
  );
}

function IntelResultRow({ item, selected, onSelect }: {
  item: SearchResultItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = KIND_META[item.kind];
  return (
    <button
      onClick={onSelect}
      className="w-full px-4 py-2.5 flex items-center gap-3 transition-all duration-120 text-left group"
      style={{ background: selected ? "var(--th-gold-bg-mid)" : "transparent" }}
      onMouseEnter={() => {}}
    >
      {/* Left: ticker badge or kind icon */}
      {item.kind === "stock" ? (
        <TickerChip ticker={item.id} />
      ) : (
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md flex-shrink-0 min-w-[52px] text-center"
          style={{ background: meta.bg, border: `1px solid ${meta.color}28`, color: meta.color }}>
          {meta.label}
        </span>
      )}

      {/* Center */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[12.5px] font-mono font-semibold truncate" style={{ color: "var(--th-text-primary)" }}>
            {item.kind === "stock" ? item.subtitle : item.title}
          </span>
          {item.meta && (
            <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ color: meta.color, background: meta.bg }}>
              {item.meta}
            </span>
          )}
        </div>
        {item.kind !== "stock" && (
          <div className="text-[10px] font-mono truncate" style={{ color: "var(--th-text-muted)" }}>
            {item.subtitle}
          </div>
        )}
        {/* Chips */}
        {item.chips && item.chips.length > 0 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {item.chips.slice(0, 4).map(chip => (
              <span key={chip} className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                style={{ color: "var(--th-text-muted)", background: "var(--th-bg-row)", border: "1px solid var(--th-border-subtle)" }}>
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>

      <ChevronRight size={10} style={{ color: "var(--th-text-faint)" }} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </button>
  );
}

function TrendingRow({ item, selected, onSelect }: {
  item: ReturnType<typeof getTrending>[number];
  selected: boolean;
  onSelect: () => void;
}) {
  const col = item.momentum === "hot"    ? "var(--negative)"
            : item.momentum === "rising" ? "var(--positive)"
            : "var(--th-text-muted)";

  return (
    <button
      onClick={onSelect}
      className="w-full px-4 py-2 flex items-center gap-3 transition-all duration-120 text-left group"
      style={{ background: selected ? "var(--th-gold-bg)" : "transparent" }}
    >
      <span style={{ color: col }}>{MOMENTUM_ICON[item.momentum]}</span>
      <span className="flex-1 text-[12px] font-mono" style={{ color: "var(--th-text-secondary)" }}>
        {item.query}
      </span>
      <span className="text-[8.5px] font-mono uppercase px-1.5 py-0.5 rounded flex-shrink-0"
        style={{ color: col, background: `${col}12`, border: `1px solid ${col}28` }}>
        {item.category}
      </span>
      <ChevronRight size={9} style={{ color: "var(--th-text-faint)" }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function DropFooter() {
  return (
    <div className="px-4 py-2.5 flex items-center justify-between"
      style={{ borderTop: "1px solid var(--th-border-subtle)" }}>
      <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-ultra-faint)" }}>
        ↑↓ navigate · ↵ open · esc dismiss
      </span>
      <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-ultra-faint)" }}>
        EquityLens · Intelligence Engine
      </span>
    </div>
  );
}
