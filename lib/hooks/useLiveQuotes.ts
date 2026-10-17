"use client";
import { useEffect, useState } from "react";
import type { LiveQuote } from "@/lib/live/quotes";

export type LiveStatus = "connecting" | "live" | "reconnecting" | "paused" | "unavailable";

/**
 * Subscribe to delayed quote updates over SSE. Closes while the tab is hidden (no wasted requests) and reopens on
 * return. EventSource reconnects by itself after the server's planned 50 s connection end.
 */
export function useLiveQuotes(tickers: readonly string[]) {
  const key = [...new Set(tickers)].sort().join(",");
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({});
  const [status, setStatus] = useState<LiveStatus>("connecting");

  useEffect(() => {
    if (!key) return;
    let es: EventSource | null = null;
    const open = () => {
      es?.close();
      setStatus("connecting");
      es = new EventSource(`/api/stream/quotes?tickers=${encodeURIComponent(key)}`);
      es.addEventListener("open", () => setStatus("live"));
      es.addEventListener("quote", (e) => {
        const q = JSON.parse((e as MessageEvent).data) as LiveQuote;
        setQuotes((prev) => ({ ...prev, [q.ticker]: q }));
        setStatus("live");
      });
      es.addEventListener("error", () => {
        // CLOSED means the server refused (401/400/429): stop. Otherwise the browser is retrying.
        setStatus(es?.readyState === EventSource.CLOSED ? "unavailable" : "reconnecting");
      });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        es?.close();
        es = null;
        setStatus("paused");
      } else if (!es) {
        open();
      }
    };
    open();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      es?.close();
    };
  }, [key]);

  return { quotes, status };
}
