"use client";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export const PAGES = [
  { href: "/dashboard", label: "Dashboard", keywords: "home overview" },
  { href: "/", label: "Markets", keywords: "indices nifty sensex landing" },
  { href: "/ai", label: "How the intelligence works", keywords: "ai models layers" },
  { href: "/ai/analyze", label: "Analyze a stock", keywords: "report" },
  { href: "/research", label: "Why is a stock moving?", keywords: "research explain move news today" },
  { href: "/models", label: "Model evidence", keywords: "ml validation rejected registry" },
  { href: "/backtest", label: "Backtest", keywords: "strategy simulate history" },
  { href: "/portfolio", label: "Portfolio and risk", keywords: "holdings stress beta" },
  { href: "/watchlist", label: "Watchlist", keywords: "favourites" },
  { href: "/alerts", label: "Alerts", keywords: "telegram push notifications" },
  { href: "/news", label: "Market news", keywords: "headlines" },
  { href: "/profile", label: "Profile and settings", keywords: "account password" },
] as const;

/** Case-insensitive match on label or keywords. Exported for tests. */
export function filterPages(q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return [...PAGES];
  return PAGES.filter((p) => `${p.label} ${p.keywords}`.toLowerCase().includes(s));
}

interface StockHit {
  ticker: string;
  company_name: string;
  exchange: string;
}

type SearchState = { status: "idle" | "loading" | "done" | "unauthenticated" | "error"; hits: StockHit[] };

/** Global command palette: Ctrl/Cmd+K, or "/" when not typing in a field. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ status: "idle", hits: [] });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName));
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !typing && !open) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, [open]);

  // Debounced stock search; only for 2+ characters so typing a page name does not hit the API.
  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearch((s) => ({ ...s, status: "loading" }));
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.status === 401) return setSearch({ status: "unauthenticated", hits: [] });
        if (!res.ok) return setSearch({ status: "error", hits: [] });
        setSearch({ status: "done", hits: ((await res.json()) as StockHit[]).slice(0, 6) });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setSearch({ status: "error", hits: [] });
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, open]);

  const pages = useMemo(() => filterPages(query), [query]);
  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };
  const showStocks = query.trim().length >= 2;

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette: go to a page or search stocks"
      shouldFilter={false}
      overlayClassName="cmdk-overlay"
      contentClassName="cmdk-content"
    >
      <Command.Input value={query} onValueChange={setQuery} placeholder="Go to a page or search a stock (e.g. RELIANCE)…" aria-label="Search pages and stocks" />
      <Command.List>
        {showStocks && (
          <Command.Group heading="Stocks">
            {search.status === "loading" && <Command.Loading>Searching…</Command.Loading>}
            {search.status === "unauthenticated" && <div className="cmdk-note">Sign in to search stocks.</div>}
            {search.status === "error" && <div className="cmdk-note">Stock search is unavailable right now.</div>}
            {search.status === "done" && search.hits.length === 0 && <div className="cmdk-note">No NSE/BSE match.</div>}
            {search.hits.map((h) => (
              <Command.Item key={`${h.ticker}-${h.exchange}`} value={`stock-${h.ticker}`} onSelect={() => go(`/stock/${h.ticker}`)}>
                <span className="cmdk-ticker">{h.ticker}</span>
                <span className="cmdk-sub">{h.company_name} · {h.exchange}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
        {pages.length > 0 && (
          <Command.Group heading="Pages">
            {pages.map((p) => (
              <Command.Item key={p.href} value={`page-${p.href}`} onSelect={() => go(p.href)}>
                {p.label}
              </Command.Item>
            ))}
          </Command.Group>
        )}
        {!showStocks && pages.length === 0 && <Command.Empty>No matching page. Type 2+ letters to search stocks.</Command.Empty>}
      </Command.List>
      <div className="cmdk-footer" aria-hidden>↑↓ to move · Enter to open · Esc to close</div>
    </Command.Dialog>
  );
}
