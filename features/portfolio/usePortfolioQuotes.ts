"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveQuotes } from "@/lib/hooks/useLiveQuotes";
import type { Quote } from "./compute";

/**
 * Quotes for the portfolio: one snapshot per holding (also covers >20 holdings), refreshed every 5 minutes while
 * visible, with the shared SSE stream (first 20 tickers) overlaid for delayed live updates. A failed quote stays
 * missing; callers must not substitute the purchase price.
 */
export function usePortfolioQuotes(tickers: readonly string[]) {
  const key = [...new Set(tickers)].sort().join(",");
  const [snapshot, setSnapshot] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);
  const { quotes: live, status } = useLiveQuotes(tickers.slice(0, 20));

  const refresh = useCallback(async () => {
    const list = key ? key.split(",") : [];
    if (list.length === 0) return;
    setLoading(true);
    const res = await Promise.allSettled(list.map((t) => fetch(`/api/stocks/${encodeURIComponent(t)}/quote`).then((r) => (r.ok ? r.json() : Promise.reject(r.status)))));
    const next: Record<string, Quote> = {};
    const bad: string[] = [];
    res.forEach((r, i) => {
      const v = r.status === "fulfilled" ? r.value : null;
      if (v && typeof v.current_price === "number" && v.current_price > 0) next[list[i]] = { price: v.current_price, change: v.change ?? 0, changePct: v.change_pct ?? 0 };
      else bad.push(list[i]);
    });
    setSnapshot(next);
    setFailed(bad);
    setLoading(false);
  }, [key]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; state is set after the awaits
    void refresh();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 5 * 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  const quotes = useMemo(() => {
    const merged: Record<string, Quote> = { ...snapshot };
    for (const [t, q] of Object.entries(live)) merged[t] = { price: q.price, change: q.change, changePct: q.changePct };
    return merged;
  }, [snapshot, live]);

  return { quotes, loading, failed, liveStatus: status, refresh };
}
