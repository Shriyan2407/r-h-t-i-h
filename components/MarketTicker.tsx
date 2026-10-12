"use client";
import { useEffect, useState } from "react";
import { useMarketIndices } from "@/lib/hooks/useMarketIndices";
import type { IndexRow } from "@/lib/services/indices";

/**
 * App-wide market bar. Shows REAL index and rate quotes from /api/market/indices
 * (Yahoo Finance, refreshed every minute). It never invents numbers: while loading it
 * shows a skeleton, and if data cannot be fetched it says so.
 */

function formatValue(row: IndexRow): string {
  return row.kind === "rate"
    ? row.value.toFixed(2)
    : row.value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatAsOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
}

const barStyle = {
  height: "34px",
  background: "var(--th-bg-elevated)",
  borderBottom: "1px solid var(--th-border-subtle)",
} as const;

function Badge({ label, tone, title }: { label: string; tone: "ok" | "warn" | "muted"; title?: string }) {
  const color = tone === "ok" ? "var(--positive)" : tone === "warn" ? "var(--neutral)" : "var(--th-text-faint)";
  return (
    <div
      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 pr-2"
      style={{ borderRight: "1px solid var(--th-border-subtle)" }}
      title={title}
    >
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="text-[8px] font-mono font-bold uppercase tracking-[0.18em]" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

export function MarketTicker() {
  const state = useMarketIndices();

  // Flash a cell when its value really changed since the previous refresh. The comparison
  // is done while rendering (React's "adjust state when a prop changes" pattern) so no
  // state is set synchronously inside an effect.
  const rows = state.status === "ready" ? state.data.indices : null;
  const [seen, setSeen] = useState<{ rows: IndexRow[] | null; values: Record<string, number> }>({ rows: null, values: {} });
  const [flash, setFlash] = useState<Record<string, "up" | "down">>({});

  if (rows && seen.rows !== rows) {
    const changed: Record<string, "up" | "down"> = {};
    const values: Record<string, number> = {};
    for (const row of rows) {
      const before = seen.values[row.symbol];
      if (before !== undefined && before !== row.value) changed[row.symbol] = row.value > before ? "up" : "down";
      values[row.symbol] = row.value;
    }
    setSeen({ rows, values });
    if (Object.keys(changed).length > 0) setFlash(changed);
  }

  useEffect(() => {
    if (Object.keys(flash).length === 0) return;
    const t = setTimeout(() => setFlash({}), 700);
    return () => clearTimeout(t);
  }, [flash]);

  if (state.status === "loading") {
    return (
      <div className="relative overflow-hidden" style={barStyle} role="status" aria-label="Loading market data">
        <Badge label="Market" tone="muted" />
        <div className="h-full flex items-center gap-8" style={{ paddingLeft: "92px" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-2.5 w-28 rounded animate-pulse" style={{ background: "var(--th-border-subtle)" }} />
          ))}
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="relative overflow-hidden" style={barStyle} role="status">
        <Badge label="Offline" tone="warn" />
        <div className="h-full flex items-center text-[10px] font-mono" style={{ paddingLeft: "92px", color: "var(--th-text-muted)" }}>
          Market data is temporarily unavailable. Retrying every minute.
        </div>
      </div>
    );
  }

  const { data, stale } = state;
  const items = [...data.indices, ...data.indices];
  const asOf = formatAsOf(data.asOf);

  return (
    <div className="relative overflow-hidden" style={barStyle} role="region" aria-label="Market indices">
      <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to right, var(--th-bg-elevated) 40%, transparent)" }} />
      <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, var(--th-bg-elevated) 40%, transparent)" }} />

      <Badge
        label={stale ? "Stale" : "Market"}
        tone={stale ? "warn" : "ok"}
        title={`Yahoo Finance quotes as of ${asOf} IST${stale ? " - last refresh failed" : ""}. Data may be delayed.`}
      />

      <div className="flex items-center h-full animate-ticker whitespace-nowrap" style={{ paddingLeft: "92px" }}>
        {items.map((item, idx) => {
          const isUp = item.changePct >= 0;
          const f = flash[item.symbol];
          return (
            <div
              key={`${item.symbol}-${idx}`}
              className="inline-flex items-center gap-2 px-4 h-full transition-colors duration-300"
              style={{
                borderRight: "1px solid var(--th-border-subtle)",
                background: f ? (f === "up" ? "rgba(0,255,156,0.05)" : "rgba(255,77,77,0.05)") : "transparent",
              }}
              aria-hidden={idx >= data.indices.length ? true : undefined}
            >
              <span className="text-[9px] font-mono font-bold uppercase tracking-[0.10em]" style={{ color: "var(--th-text-muted)" }}>
                {item.label}
              </span>
              <span className="text-[10.5px] font-mono font-bold" style={{ color: "var(--th-text-secondary)" }}>
                {formatValue(item)}
              </span>
              <span className="text-[9px] font-mono font-semibold" style={{ color: isUp ? "var(--positive)" : "var(--negative)" }}>
                {isUp ? "▲" : "▼"} {Math.abs(item.changePct).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
