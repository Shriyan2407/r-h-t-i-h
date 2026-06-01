"use client";
import { useEffect, useState } from "react";

const INDICES = [
  { label: "NIFTY 50",     base: 24800,  isSpecial: false },
  { label: "SENSEX",       base: 81400,  isSpecial: false },
  { label: "NIFTY BANK",   base: 52600,  isSpecial: false },
  { label: "NIFTY IT",     base: 38200,  isSpecial: false },
  { label: "INDIA VIX",    base: 14.2,   isSpecial: true  },
  { label: "USD/INR",      base: 83.4,   isSpecial: true  },
  { label: "NIFTY MIDCAP", base: 53100,  isSpecial: false },
  { label: "NIFTY PHARMA", base: 21800,  isSpecial: false },
];

function randomDelta(base: number) {
  return base * (Math.random() - 0.5) * 0.004;
}

interface IndexData {
  label:     string;
  value:     number;
  change:    number;
  changePct: number;
  isSpecial: boolean;
}

export function MarketTicker() {
  const [indices, setIndices] = useState<IndexData[]>(
    INDICES.map(i => ({ label: i.label, value: i.base, change: 0, changePct: 0, isSpecial: i.isSpecial }))
  );
  const [flash, setFlash] = useState<Record<number, "up" | "down">>({});

  useEffect(() => {
    const bases = INDICES.map(i => i.base);
    setIndices(
      INDICES.map((item, idx) => {
        const delta = (Math.random() - 0.45) * bases[idx] * 0.014;
        return { label: item.label, value: bases[idx] + delta, change: delta, changePct: (delta / bases[idx]) * 100, isSpecial: item.isSpecial };
      })
    );
    const interval = setInterval(() => {
      setIndices(prev => {
        const next = prev.map((item, idx) => {
          const delta  = randomDelta(bases[idx]);
          const newVal = item.value + delta;
          const total  = newVal - bases[idx];
          return { ...item, value: newVal, change: total, changePct: (total / bases[idx]) * 100 };
        });
        // Flash changed items
        const newFlash: Record<number, "up" | "down"> = {};
        next.forEach((item, idx) => {
          if (item.value !== prev[idx].value) {
            newFlash[idx] = item.value > prev[idx].value ? "up" : "down";
          }
        });
        setFlash(newFlash);
        setTimeout(() => setFlash({}), 600);
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const items = [...indices, ...indices];

  return (
    <div
      className="relative overflow-hidden"
      style={{
        height: "34px",
        background: "var(--th-bg-elevated)",
        borderBottom: "1px solid var(--th-border-subtle)",
      }}
    >
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to right, var(--th-bg-elevated) 40%, transparent)" }} />
      <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, var(--th-bg-elevated) 40%, transparent)" }} />

      {/* Live badge */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 pr-2"
        style={{ borderRight: "1px solid var(--th-border-subtle)" }}>
        <div className="w-1.5 h-1.5 rounded-full animate-live-dot" style={{ background: "var(--positive)" }} />
        <span className="text-[8px] font-mono font-bold uppercase tracking-[0.18em]"
          style={{ color: "var(--positive)" }}>
          LIVE
        </span>
      </div>

      {/* Scrolling ticker */}
      <div className="flex items-center h-full animate-ticker whitespace-nowrap" style={{ paddingLeft: "76px" }}>
        {items.map((item, idx) => {
          const isUp    = item.changePct >= 0;
          const origIdx = idx % indices.length;
          const isFlash = flash[origIdx];

          return (
            <div
              key={idx}
              className="inline-flex items-center gap-2 px-4 h-full transition-colors duration-300"
              style={{
                borderRight: "1px solid var(--th-border-subtle)",
                background: isFlash
                  ? isFlash === "up" ? "rgba(0,255,156,0.05)" : "rgba(255,77,77,0.05)"
                  : "transparent",
              }}
            >
              <span className="text-[9px] font-mono font-bold uppercase tracking-[0.10em]"
                style={{ color: "var(--th-text-muted)" }}>
                {item.label}
              </span>
              <span className="text-[10.5px] font-mono font-bold"
                style={{
                  color: isFlash
                    ? (isFlash === "up" ? "var(--positive)" : "var(--negative)")
                    : "var(--th-text-secondary)",
                  transition: "color 0.3s ease",
                }}>
                {item.isSpecial
                  ? item.value.toFixed(2)
                  : item.value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className="text-[9px] font-mono font-semibold"
                style={{ color: isUp ? "var(--positive)" : "var(--negative)" }}
              >
                {isUp ? "▲" : "▼"}{" "}{Math.abs(item.changePct).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
