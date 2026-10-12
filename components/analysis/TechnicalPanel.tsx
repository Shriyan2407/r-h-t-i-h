"use client";
import { TrendingUp, TrendingDown, Minus, Activity, BarChart2 } from "lucide-react";
import type { TechnicalIndicators, TechnicalSignal } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { MetricRow } from "@/components/ui/MetricCard";

interface TechnicalPanelProps {
  indicators: TechnicalIndicators;
  currentPrice: number;
}

function SignalIcon({ signal }: { signal: TechnicalSignal["signal"] }) {
  if (signal === "BUY") return <TrendingUp size={12} className="text-[#00ff88]" />;
  if (signal === "SELL") return <TrendingDown size={12} className="text-[#ff4466]" />;
  return <Minus size={12} className="text-[#ffcc00]" />;
}

function RsiGauge({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  let color = "#ffcc00";
  if (pct <= 30) color = "#ff4466";
  else if (pct >= 70) color = "#00ff88";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center" style={{ fontFamily: "monospace", fontSize: "11px" }}>
        <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 400 }}>Oversold 30</span>
        <span style={{ color, fontWeight: 700, fontSize: "16px", letterSpacing: "-0.02em" }}>{value.toFixed(1)}</span>
        <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 400 }}>Overbought 70</span>
      </div>
      <div className="relative h-2 bg-[#21262d] rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
        <div className="absolute top-0 left-[30%] w-px h-full bg-[#30363d]" />
        <div className="absolute top-0 left-[70%] w-px h-full bg-[#30363d]" />
      </div>
      <div className="text-[10px] font-mono text-center" style={{ color }}>
        {pct <= 30 ? "OVERSOLD — potential reversal zone" : pct >= 70 ? "OVERBOUGHT — watch for exhaustion" : "NEUTRAL — no extreme reading"}
      </div>
    </div>
  );
}

function PriceVsMA({
  current,
  ema20,
  ema50,
  ema200,
}: {
  current: number;
  ema20: number;
  ema50: number;
  ema200: number;
}) {
  const diff = (val: number) => ((current - val) / val) * 100;

  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: "EMA 20", value: ema20 },
        { label: "EMA 50", value: ema50 },
        { label: "200 DMA", value: ema200 },
      ].map(({ label, value }) => {
        const d = diff(value);
        const above = d >= 0;
        return (
          <div
            key={label}
            className={cn(
              "flex flex-col gap-1.5 p-3 rounded-xl border text-center",
              above
                ? "bg-[rgba(0,255,136,0.05)] border-[rgba(0,255,136,0.2)]"
                : "bg-[rgba(255,68,102,0.05)] border-[rgba(255,68,102,0.2)]"
            )}
          >
            <span style={{ fontFamily: "monospace", fontSize: "10px", fontWeight: 400, color: "#8b949e", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>{label}</span>
            <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 700, color: "#e6edf3", letterSpacing: "-0.01em" }}>₹{value.toFixed(0)}</span>
            <span className={cn("font-mono font-bold", above ? "text-[#00ff88]" : "text-[#ff4466]")} style={{ fontSize: "12px" }}>
              {above ? "▲" : "▼"} {Math.abs(d).toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SupportResistance({
  supports,
  resistances,
  current,
}: {
  supports: number[];
  resistances: number[];
  current: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      {resistances.slice(0, 2).reverse().map((level, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#ff4466] w-20">R{resistances.length - i}</span>
          <div className="flex-1 relative h-5">
            <div className="absolute inset-y-0 left-0 right-0 bg-[#21262d] rounded" />
            <div
              className="absolute top-0 bottom-0 left-0 bg-[rgba(255,68,102,0.2)] rounded"
              style={{ width: `${Math.min(100, (current / level) * 100)}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-mono text-[#ff4466]">
              ₹{level.toFixed(0)}
            </span>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-[#00aaff] w-20">Current</span>
        <div className="flex-1 h-5 bg-[rgba(0,170,255,0.15)] border border-[rgba(0,170,255,0.3)] rounded flex items-center justify-end pr-2">
          <span className="text-[10px] font-mono text-[#00aaff]">₹{current.toFixed(0)}</span>
        </div>
      </div>
      {supports.slice(0, 2).map((level, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#00ff88] w-20">S{i + 1}</span>
          <div className="flex-1 relative h-5">
            <div className="absolute inset-0 bg-[#21262d] rounded" />
            <div
              className="absolute top-0 bottom-0 left-0 bg-[rgba(0,255,136,0.2)] rounded"
              style={{ width: `${Math.min(100, (level / current) * 100)}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-mono text-[#00ff88]">
              ₹{level.toFixed(0)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TechnicalPanel({ indicators, currentPrice }: TechnicalPanelProps) {
  const macdBull = indicators.macd_histogram >= 0;

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Trend Banner */}
      <div
        className={cn(
          "flex items-center justify-between px-5 py-3.5 rounded-xl border",
          indicators.trend === "UPTREND"
            ? "bg-[rgba(0,255,136,0.06)] border-[rgba(0,255,136,0.2)]"
            : indicators.trend === "DOWNTREND"
            ? "bg-[rgba(255,68,102,0.06)] border-[rgba(255,68,102,0.2)]"
            : "bg-[rgba(255,204,0,0.06)] border-[rgba(255,204,0,0.2)]"
        )}
      >
        <div className="flex items-center gap-2.5">
          {indicators.trend === "UPTREND" ? (
            <TrendingUp size={18} className="text-[#00ff88]" />
          ) : indicators.trend === "DOWNTREND" ? (
            <TrendingDown size={18} className="text-[#ff4466]" />
          ) : (
            <Activity size={18} className="text-[#ffcc00]" />
          )}
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "16px",
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}
            className={cn(
              indicators.trend === "UPTREND"
                ? "text-[#00ff88]"
                : indicators.trend === "DOWNTREND"
                ? "text-[#ff4466]"
                : "text-[#ffcc00]"
            )}
          >
            {indicators.trend}
          </span>
        </div>
        <Badge
          variant={
            indicators.trend_strength === "STRONG"
              ? "bull"
              : indicators.trend_strength === "MODERATE"
              ? "neutral"
              : "dim"
          }
        >
          {indicators.trend_strength} MOMENTUM
        </Badge>
      </div>

      {/* RSI */}
      <div className="flex flex-col gap-2">
        <span style={{ fontFamily: "monospace", fontSize: "11px", fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.4)" }} className="flex items-center gap-1.5">
          <Activity size={10} /> RSI (14)
        </span>
        <RsiGauge value={indicators.rsi_14} />
      </div>

      {/* MACD */}
      <div className="flex flex-col gap-2">
        <span style={{ fontFamily: "monospace", fontSize: "11px", fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.4)" }}>MACD</span>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1 p-3 bg-[#161b22] border border-[#30363d] rounded-xl">
            <span style={{ fontFamily: "monospace", fontSize: "10px", fontWeight: 400, color: "rgba(255,255,255,0.3)" }}>MACD Line</span>
            <span className={cn("font-mono font-bold", indicators.macd >= 0 ? "text-[#00ff88]" : "text-[#ff4466]")} style={{ fontSize: "14px", letterSpacing: "-0.01em" }}>
              {indicators.macd.toFixed(3)}
            </span>
          </div>
          <div className="flex flex-col gap-1 p-3 bg-[#161b22] border border-[#30363d] rounded-xl">
            <span style={{ fontFamily: "monospace", fontSize: "10px", fontWeight: 400, color: "rgba(255,255,255,0.3)" }}>Signal</span>
            <span className="font-mono font-bold" style={{ fontSize: "14px", color: "#8b949e", letterSpacing: "-0.01em" }}>
              {indicators.macd_signal.toFixed(3)}
            </span>
          </div>
          <div className="flex flex-col gap-1 p-3 bg-[#161b22] border border-[#30363d] rounded-xl">
            <span style={{ fontFamily: "monospace", fontSize: "10px", fontWeight: 400, color: "rgba(255,255,255,0.3)" }}>Histogram</span>
            <span className={cn("font-mono font-bold", macdBull ? "text-[#00ff88]" : "text-[#ff4466]")} style={{ fontSize: "14px", letterSpacing: "-0.01em" }}>
              {indicators.macd_histogram.toFixed(3)}
            </span>
          </div>
        </div>
        <div className={cn("text-[10px] font-mono px-2 py-1 rounded bg-[#161b22]", macdBull ? "text-[#00ff88]" : "text-[#ff4466]")}>
          {macdBull ? "▲ MACD above signal — bullish momentum" : "▼ MACD below signal — bearish momentum"}
        </div>
      </div>

      {/* Moving Averages */}
      <div className="flex flex-col gap-2">
        <span style={{ fontFamily: "monospace", fontSize: "11px", fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.4)" }}>Moving Averages vs Current</span>
        <PriceVsMA
          current={currentPrice}
          ema20={indicators.ema_20}
          ema50={indicators.ema_50}
          ema200={indicators.ema_200}
        />
      </div>

      {/* Bollinger Bands */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#8b949e]">Bollinger Bands</span>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-[#161b22] border border-[#30363d] rounded-lg">
            <div className="text-[9px] font-mono text-[#484f58] mb-0.5">Upper</div>
            <div className="text-[11px] font-mono text-[#ff4466]">₹{indicators.bb_upper.toFixed(0)}</div>
          </div>
          <div className="text-center p-2 bg-[rgba(0,170,255,0.05)] border border-[rgba(0,170,255,0.2)] rounded-lg">
            <div className="text-[9px] font-mono text-[#484f58] mb-0.5">Middle (20MA)</div>
            <div className="text-[11px] font-mono text-[#00aaff]">₹{indicators.bb_middle.toFixed(0)}</div>
          </div>
          <div className="text-center p-2 bg-[#161b22] border border-[#30363d] rounded-lg">
            <div className="text-[9px] font-mono text-[#484f58] mb-0.5">Lower</div>
            <div className="text-[11px] font-mono text-[#00ff88]">₹{indicators.bb_lower.toFixed(0)}</div>
          </div>
        </div>
      </div>

      {/* Support/Resistance */}
      <div className="flex flex-col gap-2">
        <span style={{ fontFamily: "monospace", fontSize: "11px", fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.4)" }}>Support & Resistance</span>
        <SupportResistance
          supports={indicators.support_levels}
          resistances={indicators.resistance_levels}
          current={currentPrice}
        />
      </div>

      {/* Other Indicators */}
      <div className="flex flex-col gap-1 bg-[#161b22] border border-[#30363d] rounded-xl p-3">
        <MetricRow label="ADX (Trend Strength)" value={`${indicators.adx.toFixed(1)} — ${indicators.adx > 25 ? "Strong trend" : "Weak trend"}`} />
        <MetricRow label="ATR 14" value={`₹${indicators.atr_14.toFixed(2)}`} />
        <MetricRow label="VWAP" value={`₹${indicators.vwap.toFixed(2)}`} valueClass={currentPrice >= indicators.vwap ? "text-[#00ff88]" : "text-[#ff4466]"} />
        <MetricRow
          label="Stochastic %K / %D"
          value={`${indicators.stoch_k.toFixed(1)} / ${indicators.stoch_d.toFixed(1)}`}
          valueClass={indicators.stoch_k > 80 ? "text-[#ff4466]" : indicators.stoch_k < 20 ? "text-[#00ff88]" : "text-[#e6edf3]"}
        />
      </div>
    </div>
  );
}
