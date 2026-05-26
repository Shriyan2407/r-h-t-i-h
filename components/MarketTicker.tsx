"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

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
  label: string;
  value: number;
  change: number;
  changePct: number;
  isSpecial: boolean;
}

export function MarketTicker() {
  const [indices, setIndices] = useState<IndexData[]>(
    INDICES.map(i => ({ label: i.label, value: i.base, change: 0, changePct: 0, isSpecial: i.isSpecial }))
  );

  useEffect(() => {
    const bases = INDICES.map(i => i.base);

    // Set realistic initial movements
    setIndices(
      INDICES.map((item, idx) => {
        const delta = (Math.random() - 0.45) * bases[idx] * 0.014;
        return {
          label: item.label,
          value: bases[idx] + delta,
          change: delta,
          changePct: (delta / bases[idx]) * 100,
          isSpecial: item.isSpecial,
        };
      })
    );

    const interval = setInterval(() => {
      setIndices(prev =>
        prev.map((item, idx) => {
          const delta   = randomDelta(bases[idx]);
          const newVal  = item.value + delta;
          const total   = newVal - bases[idx];
          return { ...item, value: newVal, change: total, changePct: (total / bases[idx]) * 100 };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const items = [...indices, ...indices]; // duplicate for seamless loop

  return (
    <div
      className="relative overflow-hidden"
      style={{
        height: "36px",
        background: "rgba(8,8,8,0.95)",
        borderBottom: "1px solid rgba(255,215,0,0.07)",
      }}
    >
      {/* Left fade */}
      <div
        className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to right, #080808, transparent)" }}
      />
      {/* Right fade */}
      <div
        className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, #080808, transparent)" }}
      />

      {/* Live badge */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[#00FF9C] animate-live-dot" />
        <span
          className="text-[8px] font-mono uppercase tracking-[0.18em]"
          style={{ color: "#00FF9C" }}
        >
          LIVE
        </span>
      </div>

      {/* Scrolling ticker */}
      <div
        className="flex items-center h-full animate-ticker whitespace-nowrap"
        style={{ paddingLeft: "88px" }}
      >
        {items.map((item, idx) => (
          <div
            key={idx}
            className="inline-flex items-center gap-2.5 px-5 h-full"
            style={{ borderRight: "1px solid rgba(255,215,0,0.04)" }}
          >
            <span
              className="text-[9.5px] font-mono font-medium uppercase tracking-[0.1em]"
              style={{ color: "#4A4A4A" }}
            >
              {item.label}
            </span>

            <span className="text-[11px] font-mono font-semibold" style={{ color: "#E0E0E0" }}>
              {item.isSpecial
                ? item.value.toFixed(2)
                : item.value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>

            <span
              className={cn(
                "text-[9.5px] font-mono font-medium",
                item.changePct >= 0 ? "text-[#00FF9C]" : "text-[#FF4D4D]"
              )}
            >
              {item.changePct >= 0 ? "▲" : "▼"}{" "}
              {Math.abs(item.changePct).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
