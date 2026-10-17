"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, TrendingUp, TrendingDown, Minus, Activity,
  AlertTriangle, Zap, RefreshCw, ChevronUp, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────── */
interface IndexData {
  symbol:      string;
  label:       string;
  price:       number;
  change_pct:  number;
  change_1w:   number;
  change_1m:   number;
}

interface MacroData {
  fetched_at:    string;
  regime: {
    type:        "RISK_ON" | "RISK_OFF" | "NEUTRAL";
    label:       string;
    description: string;
    signalStrength: number;
    inputs:      number;
  };
  pressure_score: number;
  rbi_stance:    "HAWKISH" | "NEUTRAL" | "DOVISH" | "UNKNOWN";
  indices: {
    nifty50?:   IndexData;
    nifty_bank?: IndexData;
    india_vix?: IndexData;
  };
  currency: { usd_inr?: IndexData };
  commodities: { crude_brent?: IndexData; gold?: IndexData };
  global: { sp500?: IndexData; us_10y?: IndexData };
  sector_rotation: Array<{ sector: string; performance_1w: number; signal: "ACCUMULATE"|"NEUTRAL"|"AVOID" }>;
  macro_signals:  string[];
  risk_factors:   string[];
}

/* ── Subcomponents ─────────────────────────────────────── */

function RegimeBadge({ type, label, signalStrength, inputs }: { type: string; label: string; signalStrength: number; inputs: number }) {
  const cfg = {
    RISK_ON:  { color: "#00ff88", bg: "rgba(0,255,136,0.08)", border: "rgba(0,255,136,0.3)", icon: TrendingUp  },
    RISK_OFF: { color: "#ff4466", bg: "rgba(255,68,102,0.08)",  border: "rgba(255,68,102,0.3)",  icon: TrendingDown },
    NEUTRAL:  { color: "#ffcc00", bg: "rgba(255,204,0,0.08)",  border: "rgba(255,204,0,0.3)",  icon: Minus       },
  }[type] ?? { color: "#8b949e", bg: "rgba(139,148,158,0.08)", border: "rgba(139,148,158,0.3)", icon: Minus };

  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ background: cfg.bg, borderColor: cfg.border }}>
      <Icon size={13} style={{ color: cfg.color }} />
      <span className="text-xs font-mono font-bold" style={{ color: cfg.color }}>{label}</span>
      <span className="text-[10px] font-mono text-[#484f58] ml-1" title="How one-sided the rule inputs are (0-100). Not a probability.">signal strength {signalStrength}/100 · {inputs} inputs</span>
    </div>
  );
}

function PressureBar({ score }: { score: number }) {
  const color = score >= 65 ? "#ff4466" : score >= 45 ? "#ffcc00" : "#00ff88";
  const label = score >= 65 ? "HIGH PRESSURE" : score >= 45 ? "MODERATE" : "LOW PRESSURE";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono uppercase tracking-widest text-[#484f58]">Macro Pressure</span>
        <span className="text-[10px] font-mono font-bold" style={{ color }}>{label}</span>
      </div>
      <div className="relative h-2 bg-[#21262d] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute h-full rounded-full"
          style={{ background: `linear-gradient(90deg, #00ff88, ${color})` }}
        />
      </div>
      <div className="flex justify-between text-[9px] font-mono text-[#484f58]">
        <span>Calm</span><span>Score: {score}/100</span><span>Stress</span>
      </div>
    </div>
  );
}

function IndexCard({ data, label }: { data?: IndexData; label: string }) {
  if (!data) return (
    <div className="p-2.5 bg-[#161b22] border border-[#30363d] rounded-xl flex flex-col gap-1 opacity-40">
      <div className="text-[9px] font-mono text-[#484f58]">{label}</div>
      <div className="text-sm font-mono text-[#484f58]">--</div>
    </div>
  );
  const pos = data.change_pct >= 0;
  const color = pos ? "#00ff88" : "#ff4466";
  return (
    <div className="p-2.5 bg-[#161b22] border border-[#30363d] rounded-xl flex flex-col gap-1 hover:border-[#484f58] transition-colors">
      <div className="text-[9px] font-mono text-[#484f58]">{data.label}</div>
      <div className="text-sm font-mono font-bold text-[#e6edf3]">
        {data.price >= 1000 ? data.price.toLocaleString("en-IN", { maximumFractionDigits: 0 })
          : data.price >= 100 ? data.price.toFixed(1)
          : data.price.toFixed(2)}
      </div>
      <div className="flex items-center gap-1">
        {pos ? <ChevronUp size={9} style={{ color }} /> : <ChevronDown size={9} style={{ color }} />}
        <span className="text-[10px] font-mono font-bold" style={{ color }}>
          {pos ? "+" : ""}{data.change_pct.toFixed(2)}%
        </span>
        {data.change_1w !== 0 && (
          <span className="text-[9px] font-mono text-[#484f58] ml-1">
            1W: {data.change_1w >= 0 ? "+" : ""}{data.change_1w.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

function RbiStanceBadge({ stance }: { stance: string }) {
  const cfg = {
    HAWKISH: { color: "#ff4466", label: "Tightening pressure" },
    DOVISH:  { color: "#00ff88", label: "Easing pressure" },
    NEUTRAL: { color: "#ffcc00", label: "Neutral" },
  }[stance] ?? { color: "#8b949e", label: "Unknown" };
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: cfg.color }} />
      <span className="text-xs font-mono" style={{ color: cfg.color }}>{cfg.label}</span>
    </div>
  );
}

function SectorRotationBar({ item }: { item: { sector: string; performance_1w: number; signal: string } }) {
  const isPos = item.performance_1w >= 0;
  const signalColor = item.signal === "ACCUMULATE" ? "#00ff88" : item.signal === "AVOID" ? "#ff4466" : "#8b949e";
  const barWidth = Math.min(100, Math.abs(item.performance_1w) * 12);
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="w-20 text-[10px] font-mono text-[#8b949e] flex-shrink-0">{item.sector}</div>
      <div className="flex-1 relative h-1.5 bg-[#21262d] rounded-full overflow-hidden">
        <div
          className="absolute top-0 h-full rounded-full transition-all duration-700"
          style={{
            width:      `${barWidth}%`,
            background: isPos ? "#00ff88" : "#ff4466",
            left:       isPos ? "50%" : undefined,
            right:      !isPos ? "50%" : undefined,
          }}
        />
        <div className="absolute left-1/2 top-0 h-full w-px bg-[#30363d]" />
      </div>
      <div className="w-14 text-right text-[10px] font-mono" style={{ color: isPos ? "#00ff88" : "#ff4466" }}>
        {isPos ? "+" : ""}{item.performance_1w.toFixed(1)}%
      </div>
      <div className="w-16 text-[9px] font-mono text-right" style={{ color: signalColor }}>
        {item.signal}
      </div>
    </div>
  );
}

/* ── Main MacroPanel ─────────────────────────────────────── */

export function MacroPanel({ ticker }: { ticker?: string }) {
  const [data,    setData]    = useState<MacroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetch_ = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/macro", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastFetch(new Date());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch_(); }, []);

  if (loading) return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Globe size={13} className="text-[#00aaff] animate-pulse" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#484f58]">Fetching macro data...</span>
      </div>
      {[1,2,3,4].map(i => (
        <div key={i} className="h-12 bg-[#161b22] rounded-xl animate-pulse border border-[#21262d]" />
      ))}
    </div>
  );

  if (error || !data) return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[#ff4466]">
        <AlertTriangle size={13} />
        <span className="text-[10px] font-mono">Macro data unavailable — {error ?? "no data"}</span>
      </div>
      <button onClick={fetch_} className="text-[10px] font-mono text-[#00aaff] hover:underline flex items-center gap-1">
        <RefreshCw size={10} /> Retry
      </button>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-4 p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe size={13} className="text-[#00aaff]" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#e6edf3] font-semibold">
            Macro Intelligence
          </span>
        </div>
        <div className="flex items-center gap-2">
          {lastFetch && (
            <span className="text-[9px] font-mono text-[#484f58]">
              {lastFetch.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button onClick={fetch_} className="text-[#484f58] hover:text-[#8b949e] transition-colors">
            <RefreshCw size={10} />
          </button>
        </div>
      </div>

      {/* Regime */}
      <div className="flex flex-col gap-2">
        <RegimeBadge type={data.regime.type} label={data.regime.label} signalStrength={data.regime.signalStrength} inputs={data.regime.inputs} />
        <p className="text-[11px] text-[#8b949e] leading-relaxed px-1">{data.regime.description}</p>
      </div>

      {/* Pressure */}
      <PressureBar score={data.pressure_score} />

      {/* Key Indices */}
      <div>
        <div className="text-[9px] font-mono uppercase tracking-widest text-[#484f58] mb-2">Indian Markets</div>
        <div className="grid grid-cols-3 gap-2">
          <IndexCard data={data.indices.nifty50}    label="NIFTY 50" />
          <IndexCard data={data.indices.nifty_bank} label="NIFTY Bank" />
          <IndexCard data={data.indices.india_vix}  label="India VIX" />
        </div>
      </div>

      {/* Currency + Commodities */}
      <div>
        <div className="text-[9px] font-mono uppercase tracking-widest text-[#484f58] mb-2">Currency & Commodities</div>
        <div className="grid grid-cols-3 gap-2">
          <IndexCard data={data.currency.usd_inr}          label="USD/INR" />
          <IndexCard data={data.commodities.crude_brent}   label="Brent Crude" />
          <IndexCard data={data.commodities.gold}          label="Gold" />
        </div>
      </div>

      {/* Global */}
      <div>
        <div className="text-[9px] font-mono uppercase tracking-widest text-[#484f58] mb-2">Global Pulse</div>
        <div className="grid grid-cols-2 gap-2">
          <IndexCard data={data.global.sp500}  label="S&P 500" />
          <IndexCard data={data.global.us_10y} label="US 10Y Yield" />
        </div>
      </div>

      {/* RBI Stance */}
      <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col gap-2">
        <div className="text-[9px] font-mono uppercase tracking-widest text-[#484f58]">Rate pressure (market-implied)</div>
        <RbiStanceBadge stance={data.rbi_stance} />
        <div className="text-[10px] text-[#8b949e]">Inferred from USD/INR, US 10Y and India VIX. Not the RBI&apos;s announced policy stance.</div>
      </div>

      {/* Sector Rotation */}
      {data.sector_rotation.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-[9px] font-mono uppercase tracking-widest text-[#484f58]">Sector Rotation (1W)</div>
          <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl">
            {data.sector_rotation.map(s => (
              <SectorRotationBar key={s.sector} item={s} />
            ))}
          </div>
        </div>
      )}

      {/* Macro Signals */}
      {data.macro_signals.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-[9px] font-mono uppercase tracking-widest text-[#484f58] flex items-center gap-1">
            <Zap size={9} className="text-[#ffcc00]" /> Live Signals
          </div>
          <div className="flex flex-col gap-1.5">
            {data.macro_signals.map((s, i) => (
              <div key={i} className="flex gap-2 text-[11px] text-[#8b949e]">
                <span className="text-[#00aaff] flex-shrink-0 mt-0.5">›</span>
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Factors */}
      {data.risk_factors.length > 0 && (
        <div className="p-3 bg-[rgba(255,68,102,0.04)] border border-[rgba(255,68,102,0.2)] rounded-xl flex flex-col gap-2">
          <div className="text-[9px] font-mono uppercase tracking-widest text-[#ff4466] flex items-center gap-1">
            <AlertTriangle size={9} /> Risk Factors
          </div>
          {data.risk_factors.map((r, i) => (
            <div key={i} className="flex gap-2 text-[11px] text-[#8b949e]">
              <span className="text-[#ff4466] flex-shrink-0">·</span>{r}
            </div>
          ))}
        </div>
      )}

      <div className="text-[9px] text-[#484f58] font-mono text-center border-t border-[#21262d] pt-2">
        Data: Yahoo Finance · Updated {lastFetch ? lastFetch.toLocaleTimeString("en-IN") : "—"} · No paid APIs
      </div>
    </motion.div>
  );
}
