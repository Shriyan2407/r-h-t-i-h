"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Edit3, X, Check, ChevronUp, ChevronDown,
  Brain, Shield, AlertTriangle, Zap, RefreshCw, TrendingUp,
  TrendingDown, Activity, Globe, Search, Wallet, PieChart,
  BarChart2, SlidersHorizontal, Star, Info, ArrowUpRight,
  ArrowDownRight, Target, Cpu, Droplets, DollarSign,
  Building2, Flame, Eye, ChevronRight, Package, Scan,
} from "lucide-react";
import { Navbar }              from "@/components/Navbar";
import { MarketTicker }        from "@/components/MarketTicker";
import { TickerSearchInput, SelectedStockChip } from "@/components/TickerSearch";
import { PortfolioScanner, type ImportedHolding } from "@/components/PortfolioScanner";
import { usePortfolioStore, type PortfolioHolding } from "@/store/portfolioStore";
import { useTheme }            from "@/lib/context/ThemeContext";
import { cn }                  from "@/lib/utils";
import type { SearchResult as ApiSearchResult } from "@/lib/types";
import {
  classifyPortfolioDNA, generateNarrativeVerdict, runStressTests,
  computePortfolioDimensions, computeFearScore, getStockAction,
  type DNAResult, type StressTest, type StockActionResult,
} from "@/lib/portfolioIntelligence";
import {
  AIScoreRing, RadarChart, HoldingHeatmap, StressTestPanel,
  AICommandCenter, OpportunitiesPanel, AIChatPanel, DimensionBars,
  SectorIntelligencePanel,
} from "@/components/PortfolioIntelligence";
import type { EnrichedSectorData } from "@/components/PortfolioIntelligence";
import { classifyTicker, getSectorRiskLevel } from "@/lib/sectorMap";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface LiveData {
  price:     number;
  change:    number;
  changePct: number;
  high:      number;
  low:       number;
  volume:    number;
  loading:   boolean;
  error:     boolean;
}

interface HoldingWithLive extends PortfolioHolding {
  livePrice:     number;
  liveChange:    number;
  liveChangePct: number;
  currentValue:  number;
  investedValue: number;
  pnl:           number;
  pnlPct:        number;
  dayPnl:        number;
  allocationPct: number;
  loading:       boolean;
}

interface Metrics {
  totalValue:    number;
  investedValue: number;
  totalPnl:      number;
  totalPnlPct:   number;
  dayPnl:        number;
  dayPnlPct:     number;
  healthScore:   number;
  verdict:       string;
  verdictColor:  string;
  riskLevel:     string;
  riskColor:     string;
  beta:          number;
  sharpe:        number;
  volatility:    number;
  maxDrawdown:   number;
  hhi:           number;
  concentration: number;
  sectorCount:   number;
  gainers:       number;
  losers:        number;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

const SECTOR_COLORS: Record<string, string> = {
  "IT":                "#00AAFF",
  "Technology":        "#00AAFF",
  "Banking":           "#FFD700",
  "Financial Services":"#F59E0B",
  "Finance":           "#F59E0B",
  "Energy":            "#FF6B35",
  "Oil & Gas":         "#FF6B35",
  "Defense":           "#00FF9C",
  "Aerospace":         "#00FF9C",
  "FMCG":              "#34D399",
  "Consumer":          "#34D399",
  "Auto":              "#FB923C",
  "Automobiles":       "#FB923C",
  "Pharma":            "#A78BFA",
  "Healthcare":        "#A78BFA",
  "Metals":            "#94A3B8",
  "Mining":            "#94A3B8",
  "Telecom":           "#60A5FA",
  "Infra":             "#F472B6",
  "Infrastructure":    "#F472B6",
  "Real Estate":       "#C084FC",
  "Chemicals":         "#4ADE80",
  "Other":             "#6B7280",
};

const SECTOR_MACRO: Record<string, Record<string, number>> = {
  "IT":         { crude:15, rbi:20, usdinr:75, inflation:20, china:10, usRecession:80, ai:90, defense:10, capex:45 },
  "Banking":    { crude:40, rbi:90, usdinr:45, inflation:70, china:20, usRecession:50, ai:40, defense:10, capex:55 },
  "Energy":     { crude:95, rbi:40, usdinr:70, inflation:75, china:65, usRecession:65, ai:15, defense:20, capex:70 },
  "Defense":    { crude:40, rbi:20, usdinr:25, inflation:40, china:50, usRecession:15, ai:45, defense:95, capex:80 },
  "FMCG":       { crude:50, rbi:45, usdinr:25, inflation:90, china:15, usRecession:20, ai:10, defense:5,  capex:20 },
  "Auto":       { crude:75, rbi:65, usdinr:50, inflation:70, china:45, usRecession:40, ai:45, defense:10, capex:65 },
  "Pharma":     { crude:20, rbi:20, usdinr:70, inflation:25, china:25, usRecession:20, ai:40, defense:10, capex:30 },
  "Metals":     { crude:70, rbi:40, usdinr:50, inflation:65, china:90, usRecession:70, ai:15, defense:20, capex:75 },
  "Telecom":    { crude:20, rbi:45, usdinr:25, inflation:40, china:20, usRecession:25, ai:65, defense:10, capex:70 },
  "Infra":      { crude:50, rbi:70, usdinr:20, inflation:45, china:40, usRecession:25, ai:20, defense:65, capex:95 },
  "Real Estate":{ crude:45, rbi:80, usdinr:30, inflation:55, china:30, usRecession:40, ai:15, defense:10, capex:70 },
  "Other":      { crude:40, rbi:40, usdinr:40, inflation:40, china:30, usRecession:40, ai:30, defense:20, capex:40 },
};

const SECTORS_LIST = [
  "IT","Banking","Financial Services","Energy","Defense","FMCG",
  "Auto","Pharma","Metals","Telecom","Infra","Real Estate","Chemicals","Other",
];

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

function sectorColor(s: string): string {
  return SECTOR_COLORS[s] ?? SECTOR_COLORS["Other"];
}

function getSectorMacro(s: string): Record<string, number> {
  return SECTOR_MACRO[s] ?? SECTOR_MACRO["Other"];
}

function computeHealthScore(holdings: HoldingWithLive[], totalPnl: number): number {
  if (holdings.length === 0) return 0;
  let score = 100;
  if (holdings.length < 3)      score -= 40;
  else if (holdings.length < 5) score -= 20;
  else if (holdings.length < 8) score -= 10;

  const maxAlloc = Math.max(...holdings.map(h => h.allocationPct));
  if (maxAlloc > 40)      score -= 25;
  else if (maxAlloc > 30) score -= 15;
  else if (maxAlloc > 20) score -= 5;

  const sectors = new Map<string, number>();
  holdings.forEach(h => sectors.set(h.sector || "Other", (sectors.get(h.sector || "Other") ?? 0) + h.allocationPct));
  const maxSector = Math.max(...sectors.values());
  if (maxSector > 70)      score -= 20;
  else if (maxSector > 50) score -= 10;
  else if (maxSector > 40) score -= 5;

  const hhi = holdings.reduce((s, h) => s + Math.pow(h.allocationPct / 100, 2), 0);
  if (hhi > 0.4)      score -= 15;
  else if (hhi > 0.25) score -= 7;

  const gainers = holdings.filter(h => h.pnl > 0).length;
  if (gainers === 0)                             score -= 10;
  else if (gainers < holdings.length * 0.4)     score -= 5;

  if (holdings.length >= 10)  score += 5;
  if (sectors.size >= 5)      score += 5;
  if (totalPnl > 0)           score += 5;
  if (maxAlloc < 15)          score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getVerdict(score: number): { verdict: string; color: string } {
  if (score >= 85) return { verdict: "EXCELLENT", color: "var(--positive)" };
  if (score >= 70) return { verdict: "GOOD",      color: "#00CC88" };
  if (score >= 50) return { verdict: "MODERATE",  color: "var(--gold)" };
  if (score >= 30) return { verdict: "RISKY",     color: "#FF8C42" };
  return              { verdict: "CRITICAL",  color: "var(--negative)" };
}

function getRiskLevel(hhi: number, maxAlloc: number): { level: string; color: string } {
  const risk = hhi * 0.5 + (maxAlloc / 100) * 0.5;
  if (risk > 0.45) return { level: "EXTREME",  color: "var(--negative)" };
  if (risk > 0.30) return { level: "HIGH",     color: "#FF8C42" };
  if (risk > 0.20) return { level: "MODERATE", color: "var(--gold)" };
  return              { level: "LOW",      color: "var(--positive)" };
}

function computeMacroExposure(holdings: HoldingWithLive[]): Record<string, number> {
  const defaults = { crude:40, rbi:40, usdinr:40, inflation:40, china:30, usRecession:40, ai:30, defense:20, capex:40 };
  if (holdings.length === 0) return defaults;
  const result: Record<string, number> = { ...defaults };
  Object.keys(result).forEach(k => result[k] = 0);
  let totalWeight = 0;
  holdings.forEach(h => {
    const w = h.allocationPct / 100;
    const macro = getSectorMacro(h.sector || "Other");
    totalWeight += w;
    Object.keys(result).forEach(k => { result[k] += (macro[k] ?? 40) * w; });
  });
  if (totalWeight > 0) {
    Object.keys(result).forEach(k => { result[k] = Math.round(result[k] / totalWeight); });
  }
  return result;
}

function seededRand(seed: number) {
  let s = Math.abs(seed) || 1;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function genPerformanceCurve(holdings: PortfolioHolding[], currentPnlPct: number, days = 31): number[] {
  const seed = holdings.reduce((a, h) => a + h.ticker.charCodeAt(0) * 7 + h.quantity, 1);
  const rand = seededRand(seed);
  const pts: number[] = [0];
  for (let i = 1; i < days; i++) {
    const prev   = pts[i - 1];
    const target = (currentPnlPct * i) / days;
    const noise  = (rand() - 0.45) * 1.8;
    pts.push(prev * 0.65 + target * 0.35 + noise);
  }
  pts.push(currentPnlPct);
  return pts;
}

function genBenchmarkCurve(seed: number, days = 32): number[] {
  const rand = seededRand(seed + 999);
  const pts: number[] = [0];
  for (let i = 1; i <= days; i++) {
    pts.push(pts[i - 1] + (rand() - 0.47) * 0.7 + 0.04);
  }
  return pts;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DONUT CHART
═══════════════════════════════════════════════════════════════════════════ */

function DonutChart({ sectors }: { sectors: { label: string; value: number; color: string }[] }) {
  const total = sectors.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const R = 52, CX = 70, CY = 70, circ = 2 * Math.PI * R;
  let cumulative = 0;

  const segs = sectors.map(seg => {
    const pct    = seg.value / total;
    const start  = cumulative;
    cumulative  += pct;
    const dash   = pct * circ;
    const gap    = circ - dash;
    const offset = circ * (1 - start) - circ * 0.25;
    return { ...seg, pct, dash, gap, offset };
  });

  return (
    <svg width="140" height="140">
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="16" />
      {segs.map((seg, i) => (
        <motion.circle key={i} cx={CX} cy={CY} r={R} fill="none"
          stroke={seg.color} strokeWidth="14" strokeLinecap="butt"
          strokeDasharray={`${seg.dash} ${seg.gap}`}
          strokeDashoffset={seg.offset}
          initial={{ strokeDasharray: "0 10000" }}
          animate={{ strokeDasharray: `${seg.dash} ${seg.gap}` }}
          transition={{ duration: 1, delay: i * 0.1, ease: [0.16,1,0.3,1] }}
          style={{ filter: `drop-shadow(0 0 5px ${seg.color}60)` }}
        />
      ))}
      <text x={CX} y={CY - 5} textAnchor="middle" fill="var(--th-text-primary)"
        fontSize="15" fontWeight="bold" fontFamily="monospace">
        {sectors.length}
      </text>
      <text x={CX} y={CY + 11} textAnchor="middle" fill="var(--th-text-faint)"
        fontSize="7.5" fontFamily="monospace" letterSpacing="1.5">
        SECTORS
      </text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PERFORMANCE CHART
═══════════════════════════════════════════════════════════════════════════ */

function PerformanceChart({ portfolio, benchmark, pnlPct }: {
  portfolio: number[]; benchmark: number[]; pnlPct: number;
}) {
  const W = 560, H = 130, P = { t: 14, b: 26, l: 38, r: 12 };
  const cW = W - P.l - P.r, cH = H - P.t - P.b;
  const allVals = [...portfolio, ...benchmark];
  const minV = Math.min(...allVals) - 0.3;
  const maxV = Math.max(...allVals) + 0.3;
  const range = maxV - minV || 1;

  const toX = (i: number) => P.l + (i / (portfolio.length - 1)) * cW;
  const toY = (v: number) => P.t + (1 - (v - minV) / range) * cH;

  const path = (data: number[]) =>
    data.map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(" ");

  const area = (data: number[], dir: number) => {
    const line = path(data);
    const bot  = P.t + cH;
    return `${line} L ${toX(data.length - 1)} ${bot} L ${toX(0)} ${bot} Z`;
  };

  const zeroY = toY(0);
  const col   = pnlPct >= 0 ? "#00FF9C" : "#FF4D4D";
  const colV  = pnlPct >= 0 ? "var(--positive)" : "var(--negative)";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "130px" }}>
      <defs>
        <linearGradient id="pGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity="0.22" />
          <stop offset="100%" stopColor={col} stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="bGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD700" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 0.33, 0.66, 1].map((t, i) => {
        const y = P.t + t * cH;
        const v = minV + (1 - t) * range;
        return (
          <g key={i}>
            <line x1={P.l} y1={y} x2={W - P.r} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <text x={P.l - 3} y={y + 3} textAnchor="end"
              fill="rgba(255,255,255,0.20)" fontSize="7.5" fontFamily="monospace">
              {v.toFixed(1)}%
            </text>
          </g>
        );
      })}

      {zeroY > P.t && zeroY < P.t + cH && (
        <line x1={P.l} y1={zeroY} x2={W - P.r} y2={zeroY}
          stroke="rgba(255,215,0,0.18)" strokeWidth="1" strokeDasharray="4 3" />
      )}

      <path d={area(benchmark, 1)} fill="url(#bGrad)" />
      <path d={path(benchmark)} fill="none"
        stroke="rgba(255,215,0,0.30)" strokeWidth="1.5" strokeDasharray="5 3" />

      <path d={area(portfolio, 1)} fill="url(#pGrad)" />
      <path d={path(portfolio)} fill="none" stroke={colV} strokeWidth="2"
        style={{ filter: `drop-shadow(0 0 5px ${col}80)` }} />

      <circle cx={toX(portfolio.length - 1)} cy={toY(portfolio[portfolio.length - 1])}
        r="4" fill={colV}
        style={{ filter: `drop-shadow(0 0 8px ${col})` }} />

      {["30D AGO", "20D", "10D", "TODAY"].map((label, i) => {
        const idx = i === 3 ? portfolio.length - 1 : Math.round(i * (portfolio.length - 1) / 3);
        return (
          <text key={i} x={toX(idx)} y={H - 4} textAnchor="middle"
            fill="rgba(255,255,255,0.18)" fontSize="7" fontFamily="monospace">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADD / EDIT HOLDING MODAL
═══════════════════════════════════════════════════════════════════════════ */

function HoldingModal({
  onClose, onSubmit, initial,
}: {
  onClose:  () => void;
  onSubmit: (h: Omit<PortfolioHolding, "id" | "addedAt">) => void;
  initial?: PortfolioHolding;
}) {
  const [selected, setSelected] = useState<ApiSearchResult | null>(null);
  const [form, setForm] = useState({
    ticker:   initial?.ticker   ?? "",
    name:     initial?.name     ?? "",
    exchange: initial?.exchange ?? "NSE",
    sector:   initial?.sector   ?? "",
    quantity: initial?.quantity?.toString() ?? "",
    avgPrice: initial?.avgPrice?.toString() ?? "",
    notes:    initial?.notes    ?? "",
  });

  const handleSelect = (r: ApiSearchResult) => {
    setSelected(r);
    setForm(f => ({
      ...f,
      ticker:   r.ticker,
      name:     r.company_name,
      exchange: r.exchange ?? "NSE",
      sector:   (r.sector && r.sector !== "Unknown") ? r.sector : f.sector,
      avgPrice: r.current_price != null ? r.current_price.toFixed(2) : f.avgPrice,
    }));
  };

  const handleClear = () => {
    setSelected(null);
    setForm(f => ({ ...f, ticker: "", name: "", sector: "", avgPrice: "" }));
  };

  const handleSubmit = () => {
    const qty = parseFloat(form.quantity);
    const avg = parseFloat(form.avgPrice);
    if (!form.ticker || !form.name || isNaN(qty) || isNaN(avg) || qty <= 0 || avg <= 0) return;
    onSubmit({
      ticker:   form.ticker,
      name:     form.name,
      exchange: form.exchange,
      sector:   form.sector || "Other",
      quantity: qty,
      avgPrice: avg,
      notes:    form.notes || undefined,
    });
    onClose();
  };

  const isReady = !!initial || selected !== null;

  const inputStyle: React.CSSProperties = {
    background:   "var(--th-bg-secondary)",
    border:       `1px solid var(--th-border-card)`,
    borderRadius: "8px",
    padding:      "8px 12px",
    fontSize:     "12px",
    fontFamily:   "var(--font-mono, monospace)",
    color:        "var(--th-text-primary)",
    width:        "100%",
    outline:      "none",
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <motion.div
        initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 12 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="w-full max-w-md rounded-2xl p-6 overflow-y-auto"
        style={{
          background:  "var(--th-bg-card)",
          border:      "1px solid var(--th-border-accent)",
          boxShadow:   "0 24px 80px rgba(0,0,0,0.8)",
          maxHeight:   "92vh",
        }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "var(--th-gold-bg-mid)", border: "1px solid var(--th-border-accent)" }}>
              <Wallet size={12} style={{ color: "var(--gold)" }} />
            </div>
            <span className="text-[13px] font-semibold" style={{ color: "var(--th-text-primary)" }}>
              {initial ? "Edit Position" : "Add Holding"}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--th-text-faint)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--th-text-primary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--th-text-faint)")}>
            <X size={14} />
          </button>
        </div>

        {/* Stock selection area */}
        <div className="mb-4">
          <label className="block text-[9px] font-mono uppercase tracking-widest mb-1.5"
            style={{ color: "var(--th-text-faint)" }}>
            {initial ? "Position" : selected ? "Selected Stock" : "Search Stock"}
          </label>

          {initial ? (
            /* Edit mode: static read-only chip */
            <div className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "var(--th-bg-secondary)", border: "1px solid var(--th-border-card)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[9px] font-bold"
                style={{ background: "var(--th-gold-bg-mid)", border: "1px solid var(--th-border-accent)", color: "var(--gold)" }}>
                {initial.ticker.slice(0, 3)}
              </div>
              <div>
                <div className="text-[12px] font-mono font-bold" style={{ color: "var(--gold)" }}>{initial.ticker}</div>
                <div className="text-[10px]" style={{ color: "var(--th-text-muted)" }}>{initial.name}</div>
                <div className="text-[9px]" style={{ color: "var(--th-text-faint)" }}>{initial.exchange}</div>
              </div>
            </div>
          ) : selected ? (
            <SelectedStockChip stock={selected} onClear={handleClear} />
          ) : (
            <>
              <TickerSearchInput onSelect={handleSelect} />
              <p className="text-[9px] mt-2" style={{ color: "var(--th-text-faint)" }}>
                Type a ticker (REL, TCS) or company name · Arrow keys to navigate · Enter to select
              </p>
            </>
          )}
        </div>

        {/* Rest of form — shown only after selection (or always in edit mode) */}
        {isReady && (
          <>
            {/* Sector */}
            <div className="mb-3">
              <label className="block text-[9px] font-mono uppercase tracking-widest mb-1.5"
                style={{ color: "var(--th-text-faint)" }}>Sector</label>
              <select style={inputStyle}
                value={form.sector}
                onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}>
                <option value="">Select...</option>
                {SECTORS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Qty + Avg Price */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[9px] font-mono uppercase tracking-widest mb-1.5"
                  style={{ color: "var(--th-text-faint)" }}>Qty (Shares)</label>
                <input style={inputStyle} type="number" min="0" placeholder="e.g. 50"
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[9px] font-mono uppercase tracking-widest mb-1.5"
                  style={{ color: "var(--th-text-faint)" }}>
                  Avg Price (₹)
                  {selected?.current_price && (
                    <span className="ml-1" style={{ color: "var(--gold)", fontSize: "7px" }}>● CMP auto-filled</span>
                  )}
                </label>
                <input style={inputStyle} type="number" min="0" placeholder="e.g. 2450.00"
                  value={form.avgPrice}
                  onChange={e => setForm(f => ({ ...f, avgPrice: e.target.value }))} />
              </div>
            </div>

            {/* Notes */}
            <div className="mb-5">
              <label className="block text-[9px] font-mono uppercase tracking-widest mb-1.5"
                style={{ color: "var(--th-text-faint)" }}>Notes (optional)</label>
              <textarea style={{ ...inputStyle, resize: "none", height: "56px" }}
                placeholder="Investment thesis, target price, alerts..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 py-2 rounded-xl text-[12px] font-mono transition-all"
                style={{ background: "var(--th-border-subtle)", border: "1px solid var(--th-border-card)", color: "var(--th-text-muted)" }}>
                Cancel
              </button>
              <button onClick={handleSubmit}
                className="flex-1 py-2 rounded-xl text-[12px] font-mono font-bold transition-all"
                style={{
                  background: "linear-gradient(135deg, #FFD700, #C9A227)",
                  color:      "#050505",
                  boxShadow:  "0 4px 20px rgba(255,215,0,0.3)",
                }}>
                {initial ? "Update Position" : "Add to Portfolio"}
              </button>
            </div>
          </>
        )}

        {/* Cancel only — shown before stock is selected in add mode */}
        {!isReady && (
          <div className="mt-2">
            <button onClick={onClose}
              className="w-full py-2 rounded-xl text-[12px] font-mono transition-all"
              style={{ background: "var(--th-border-subtle)", border: "1px solid var(--th-border-card)", color: "var(--th-text-muted)" }}>
              Cancel
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOLDING ROW
═══════════════════════════════════════════════════════════════════════════ */

function HoldingRow({
  holding, onEdit, onRemove, action,
}: {
  holding:  HoldingWithLive;
  onEdit:   () => void;
  onRemove: () => void;
  action?:  StockActionResult;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPos  = holding.pnl >= 0;
  const isDayP = holding.liveChangePct >= 0;
  const col    = sectorColor(holding.sector || "Other");

  return (
    <>
      <motion.tr
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className="border-b transition-colors duration-200 cursor-pointer"
        style={{ borderColor: "var(--th-border-subtle)" }}
        onClick={() => setExpanded(e => !e)}
        onMouseEnter={e => (e.currentTarget.style.background = "var(--th-row)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>

        {/* Ticker */}
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[8px] font-bold flex-shrink-0"
              style={{ background: `${col}18`, border: `1px solid ${col}30`, color: col }}>
              {holding.ticker.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <div className="text-[11px] font-mono font-bold" style={{ color: "var(--th-text-primary)" }}>
                  {holding.ticker}
                </div>
                {action && (
                  <span className="px-1 py-0.5 rounded text-[7px] font-mono font-bold"
                    style={{ background: action.bg, border: `1px solid ${action.color}30`, color: action.color, lineHeight: 1 }}>
                    {action.action}
                  </span>
                )}
              </div>
              <div className="text-[9px] truncate max-w-[100px]" style={{ color: "var(--th-text-faint)" }}>
                {holding.name.split(" ").slice(0, 3).join(" ")}
              </div>
            </div>
          </div>
        </td>

        {/* Qty */}
        <td className="px-3 py-2.5 text-right">
          <span className="text-[11px] font-mono" style={{ color: "var(--th-text-secondary)" }}>
            {holding.quantity.toLocaleString("en-IN")}
          </span>
        </td>

        {/* Avg Price */}
        <td className="px-3 py-2.5 text-right">
          <span className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
            ₹{holding.avgPrice.toFixed(2)}
          </span>
        </td>

        {/* CMP */}
        <td className="px-3 py-2.5 text-right">
          {holding.loading ? (
            <div className="h-3 w-16 rounded skeleton ml-auto" />
          ) : (
            <span className="text-[11px] font-mono font-semibold" style={{ color: "var(--th-text-primary)" }}>
              ₹{holding.livePrice.toFixed(2)}
            </span>
          )}
        </td>

        {/* Day Change */}
        <td className="px-3 py-2.5 text-right">
          <span className="text-[10px] font-mono"
            style={{ color: isDayP ? "var(--positive)" : "var(--negative)" }}>
            {isDayP ? "▲" : "▼"} {Math.abs(holding.liveChangePct).toFixed(2)}%
          </span>
        </td>

        {/* P&L */}
        <td className="px-3 py-2.5 text-right">
          <div>
            <div className="text-[11px] font-mono font-semibold"
              style={{ color: isPos ? "var(--positive)" : "var(--negative)" }}>
              {isPos ? "+" : ""}₹{Math.abs(holding.pnl).toFixed(0)}
            </div>
            <div className="text-[9px] font-mono"
              style={{ color: isPos ? "var(--positive)" : "var(--negative)" }}>
              {isPos ? "+" : ""}{holding.pnlPct.toFixed(2)}%
            </div>
          </div>
        </td>

        {/* Allocation */}
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", minWidth: 32 }}>
              <div className="h-full rounded-full" style={{ width: `${holding.allocationPct}%`, background: col }} />
            </div>
            <span className="text-[9px] font-mono w-8 text-right" style={{ color: "var(--th-text-muted)" }}>
              {holding.allocationPct.toFixed(1)}%
            </span>
          </div>
        </td>

        {/* Actions */}
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <button onClick={onEdit}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--th-text-faint)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--gold)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--th-text-faint)")}>
              <Edit3 size={11} />
            </button>
            <button onClick={onRemove}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--th-text-faint)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--negative)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--th-text-faint)")}>
              <Trash2 size={11} />
            </button>
          </div>
        </td>
      </motion.tr>

      {/* Expanded detail row */}
      <AnimatePresence>
        {expanded && (
          <tr style={{ background: "var(--th-gold-bg)" }}>
            <td colSpan={8} className="px-4 py-3">
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="grid grid-cols-4 gap-3">
                {[
                  { label: "Invested",      value: `₹${holding.investedValue.toFixed(0)}` },
                  { label: "Current Value", value: `₹${holding.currentValue.toFixed(0)}` },
                  { label: "Day P&L",       value: `${holding.dayPnl >= 0 ? "+" : ""}₹${holding.dayPnl.toFixed(0)}` },
                  { label: "Sector",        value: holding.sector || "Unknown" },
                ].map(m => (
                  <div key={m.label} className="p-2 rounded-lg"
                    style={{ background: "var(--th-border-subtle)", border: "1px solid var(--th-border-card)" }}>
                    <div className="text-[8.5px] font-mono uppercase tracking-wider mb-0.5" style={{ color: "var(--th-text-faint)" }}>
                      {m.label}
                    </div>
                    <div className="text-[11px] font-mono font-semibold" style={{ color: "var(--th-text-primary)" }}>
                      {m.value}
                    </div>
                  </div>
                ))}
                {holding.notes && (
                  <div className="col-span-4 p-2 rounded-lg"
                    style={{ background: "var(--th-gold-bg)", border: "1px solid rgba(255,215,0,0.12)" }}>
                    <div className="text-[8.5px] font-mono uppercase tracking-wider mb-0.5" style={{ color: "var(--th-text-faint)" }}>
                      Notes
                    </div>
                    <p className="text-[10.5px]" style={{ color: "var(--th-text-dim)" }}>{holding.notes}</p>
                  </div>
                )}
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */

export default function PortfolioPage() {
  const { holdings, add, update, remove, sync } = usePortfolioStore();
  const { theme } = useTheme();

  const [liveData,     setLiveData]     = useState<Record<string, LiveData>>({});
  const [refreshing,   setRefreshing]   = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [showScanner,  setShowScanner]  = useState(false);
  const [editHolding,  setEditHolding]  = useState<PortfolioHolding | null>(null);
  const [sortBy,       setSortBy]       = useState<"pnl"|"value"|"alloc"|"change">("value");
  const [sortDir,      setSortDir]      = useState<"asc"|"desc">("desc");
  const [filter,       setFilter]       = useState<"all"|"gainers"|"losers">("all");
  const [activePanel,  setActivePanel]  = useState<"performance"|"ai"|"radar"|"sectors">("performance");
  const [viewMode,     setViewMode]     = useState<"table"|"heatmap">("table");
  const [chatOpen,     setChatOpen]     = useState(false);
  const [mounted,      setMounted]      = useState(false);

  useEffect(() => { setMounted(true); sync(); }, [sync]);

  const fetchLiveData = useCallback(async (silent = false) => {
    if (holdings.length === 0) return;
    if (!silent) setRefreshing(true);
    const results = await Promise.allSettled(
      holdings.map(h => fetch(`/api/stocks/${h.ticker}/quote`).then(r => r.ok ? r.json() : Promise.reject()))
    );
    const next: Record<string, LiveData> = {};
    holdings.forEach((h, i) => {
      const r = results[i];
      if (r.status === "fulfilled") {
        const q = r.value;
        next[h.ticker] = {
          price: q.current_price ?? h.avgPrice, change: q.change ?? 0,
          changePct: q.change_pct ?? 0, high: q.high ?? 0,
          low: q.low ?? 0, volume: q.volume ?? 0, loading: false, error: false,
        };
      } else {
        next[h.ticker] = { price: h.avgPrice, change: 0, changePct: 0, high: 0, low: 0, volume: 0, loading: false, error: true };
      }
    });
    setLiveData(next);
    if (!silent) setRefreshing(false);
  }, [holdings]);

  useEffect(() => {
    const init: Record<string, LiveData> = {};
    holdings.forEach(h => {
      if (!liveData[h.ticker]) {
        init[h.ticker] = { price: 0, change: 0, changePct: 0, high: 0, low: 0, volume: 0, loading: true, error: false };
      }
    });
    if (Object.keys(init).length > 0) setLiveData(p => ({ ...p, ...init }));
    fetchLiveData(true);
    const id = setInterval(() => fetchLiveData(true), 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings.length]);

  /* ── Derived holdings with live data ─────────────────────────── */

  const holdingsWithLive = useMemo((): HoldingWithLive[] => {
    const total = holdings.reduce((s, h) => {
      const p = liveData[h.ticker]?.price || h.avgPrice;
      return s + h.quantity * p;
    }, 0);

    return holdings.map(h => {
      const live        = liveData[h.ticker];
      const livePrice   = live?.price     || h.avgPrice;
      const liveChange  = live?.change    || 0;
      const liveChangePct = live?.changePct || 0;
      const currentValue  = h.quantity * livePrice;
      const investedValue = h.quantity * h.avgPrice;
      const pnl           = currentValue - investedValue;
      const pnlPct        = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
      const dayPnl        = h.quantity * liveChange;
      const allocationPct = total > 0 ? (currentValue / total) * 100 : 0;
      // Auto-classify sector from map when missing or "Other"
      const rawSector = h.sector?.trim() ?? "";
      const needsClassification = !rawSector || rawSector === "Other" || rawSector === "Unknown" || rawSector === "other";
      const classified = needsClassification ? classifyTicker(h.ticker, h.name) : rawSector;
      const sector = classified;
      // DEBUG — remove after confirming fix
      console.log(`[SectorDebug] ${h.ticker} | stored="${rawSector}" | needsClassify=${needsClassification} | classified="${classified}"`);
      return { ...h, sector, livePrice, liveChange, liveChangePct, currentValue, investedValue, pnl, pnlPct, dayPnl, allocationPct, loading: live?.loading ?? false };
    });
  }, [holdings, liveData]);

  /* ── Portfolio metrics ────────────────────────────────────────── */

  const metrics = useMemo((): Metrics => {
    const totalValue    = holdingsWithLive.reduce((s, h) => s + h.currentValue, 0);
    const investedValue = holdingsWithLive.reduce((s, h) => s + h.investedValue, 0);
    const totalPnl      = totalValue - investedValue;
    const totalPnlPct   = investedValue > 0 ? (totalPnl / investedValue) * 100 : 0;
    const dayPnl        = holdingsWithLive.reduce((s, h) => s + h.dayPnl, 0);
    const dayPnlPct     = investedValue > 0 ? (dayPnl / investedValue) * 100 : 0;
    const hhi           = holdingsWithLive.reduce((s, h) => s + Math.pow(h.allocationPct / 100, 2), 0);
    const maxAlloc      = Math.max(0, ...holdingsWithLive.map(h => h.allocationPct));
    const sectorSet     = new Set(holdingsWithLive.map(h => h.sector || "Other"));
    const gainers       = holdingsWithLive.filter(h => h.pnl > 0).length;
    const losers        = holdingsWithLive.filter(h => h.pnl < 0).length;

    const healthScore  = computeHealthScore(holdingsWithLive, totalPnl);
    const { verdict, color: verdictColor } = getVerdict(healthScore);
    const { level: riskLevel, color: riskColor } = getRiskLevel(hhi, maxAlloc);

    const sectors   = sectorSet.size;
    const volatility = Math.max(8, 30 - sectors * 2.5 + hhi * 18);
    const beta       = parseFloat(Math.min(2, 0.7 + hhi * 0.55).toFixed(2));
    const sharpe     = totalPnlPct > 0 ? parseFloat(Math.min(3, (totalPnlPct / 10) / (volatility / 100)).toFixed(2)) : parseFloat((totalPnlPct / 100).toFixed(2));
    const maxDrawdown = parseFloat((-(volatility * 0.75 + hhi * 8)).toFixed(1));

    return {
      totalValue, investedValue, totalPnl, totalPnlPct, dayPnl, dayPnlPct,
      healthScore, verdict, verdictColor, riskLevel, riskColor,
      beta, sharpe, volatility: parseFloat(volatility.toFixed(1)),
      maxDrawdown, hhi: parseFloat(hhi.toFixed(3)), concentration: parseFloat(maxAlloc.toFixed(1)),
      sectorCount: sectors, gainers, losers,
    };
  }, [holdingsWithLive]);

  /* ── Sort / filter holdings ───────────────────────────────────── */

  const displayHoldings = useMemo(() => {
    let arr = [...holdingsWithLive];
    if (filter === "gainers") arr = arr.filter(h => h.pnl > 0);
    if (filter === "losers")  arr = arr.filter(h => h.pnl < 0);
    return arr.sort((a, b) => {
      const d = sortDir === "desc" ? -1 : 1;
      if (sortBy === "pnl")    return (a.pnlPct       - b.pnlPct)       * d;
      if (sortBy === "value")  return (a.currentValue  - b.currentValue) * d;
      if (sortBy === "alloc")  return (a.allocationPct - b.allocationPct) * d;
      if (sortBy === "change") return (a.liveChangePct - b.liveChangePct) * d;
      return 0;
    });
  }, [holdingsWithLive, sortBy, sortDir, filter]);

  /* ── Sector data (enriched) ───────────────────────────────────── */

  const sectorData = useMemo((): EnrichedSectorData[] => {
    interface Acc {
      alloc:    number;
      invested: number;
      current:  number;
      pnl:      number;
      holdings: { ticker: string; alloc: number }[];
    }
    const map = new Map<string, Acc>();
    holdingsWithLive.forEach(h => {
      const s   = h.sector || "Other";
      const acc = map.get(s) ?? { alloc: 0, invested: 0, current: 0, pnl: 0, holdings: [] };
      acc.alloc    += h.allocationPct;
      acc.invested += h.investedValue;
      acc.current  += h.currentValue;
      acc.pnl      += h.pnl;
      acc.holdings.push({ ticker: h.ticker, alloc: h.allocationPct });
      map.set(s, acc);
    });
    // DEBUG — remove after confirming fix
    console.log("[SectorDebug] sectorData map:", Object.fromEntries(map.entries()));
    return [...map.entries()]
      .sort((a, b) => b[1].alloc - a[1].alloc)
      .map(([label, acc]) => {
        const topH   = acc.holdings.sort((a, b) => b.alloc - a.alloc)[0]?.ticker ?? "";
        const pnlPct = acc.invested > 0 ? (acc.pnl / acc.invested) * 100 : 0;
        return {
          label,
          value:        acc.alloc,
          color:        sectorColor(label),
          holdingCount: acc.holdings.length,
          investedValue: acc.invested,
          currentValue:  acc.current,
          pnlPct,
          topHolding:   topH,
          riskLevel:    getSectorRiskLevel(label, acc.alloc),
        };
      });
  }, [holdingsWithLive]);

  /* ── Macro exposure ───────────────────────────────────────────── */
  const macroExposure = useMemo(() => computeMacroExposure(holdingsWithLive), [holdingsWithLive]);

  /* ── Performance chart data ───────────────────────────────────── */
  const perfData  = useMemo(() => genPerformanceCurve(holdings, metrics.totalPnlPct), [holdings, metrics.totalPnlPct]);
  const benchData = useMemo(() => genBenchmarkCurve(holdings.length + 1), [holdings.length]);

  /* ── AI warnings & suggestions ────────────────────────────────── */
  const aiInsights = useMemo(() => {
    const warnings:    string[] = [];
    const suggestions: string[] = [];
    if (holdingsWithLive.length === 0) return { warnings, suggestions };

    const maxAlloc = Math.max(...holdingsWithLive.map(h => h.allocationPct));
    const topH     = holdingsWithLive.find(h => h.allocationPct === maxAlloc);
    if (maxAlloc > 30) warnings.push(`Concentration risk: ${topH?.ticker} is ${maxAlloc.toFixed(1)}% of portfolio`);

    const sMap = new Map<string, number>();
    holdingsWithLive.forEach(h => sMap.set(h.sector || "Other", (sMap.get(h.sector || "Other") ?? 0) + h.allocationPct));
    const topSec = [...sMap.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topSec?.[1] > 50) warnings.push(`Sector dominance: ${topSec[0]} at ${topSec[1].toFixed(0)}%`);

    if (holdingsWithLive.length < 5) warnings.push("Under-diversified — fewer than 5 holdings increases idiosyncratic risk");
    if (holdingsWithLive.filter(h => h.pnl < 0).length > holdingsWithLive.length * 0.65)
      warnings.push("Majority of positions in loss — re-evaluate investment thesis");
    if (macroExposure.usRecession > 65) warnings.push("High US recession sensitivity — consider defensive sector allocation");
    if (macroExposure.crude > 70) warnings.push("Elevated crude oil sensitivity — portfolio vulnerable to energy shocks");

    if (sMap.size < 4 && holdingsWithLive.length > 2) suggestions.push("Add 2–3 more sectors to improve diversification");
    if (macroExposure.defense < 25 && holdingsWithLive.length > 3) suggestions.push("Consider Defense/PSU allocation as portfolio hedge");
    if (macroExposure.ai < 30 && holdingsWithLive.length > 3) suggestions.push("AI/Tech sector underweight — consider IT allocation");
    if (holdingsWithLive.length > 3 && maxAlloc < 20) suggestions.push("Excellent position sizing — institutional quality diversification");
    if (metrics.sharpe > 1.5) suggestions.push("Strong risk-adjusted returns — maintain current allocation strategy");

    return { warnings, suggestions };
  }, [holdingsWithLive, macroExposure, metrics.sharpe]);

  /* ── AI Intelligence Layer ───────────────────────────────────── */

  const dna = useMemo(
    () => classifyPortfolioDNA(holdingsWithLive, metrics),
    [holdingsWithLive, metrics],
  );
  const narrative = useMemo(
    () => generateNarrativeVerdict(holdingsWithLive, metrics, sectorData),
    [holdingsWithLive, metrics, sectorData],
  );
  const stressTests = useMemo(
    () => runStressTests(macroExposure, metrics),
    [macroExposure, metrics],
  );
  const dimensions = useMemo(
    () => computePortfolioDimensions(holdingsWithLive, metrics, macroExposure),
    [holdingsWithLive, metrics, macroExposure],
  );
  const fearScore = useMemo(
    () => computeFearScore(holdingsWithLive, metrics),
    [holdingsWithLive, metrics],
  );
  const stockActions = useMemo(() => {
    const m = new Map<string, StockActionResult>();
    holdingsWithLive.forEach(h => m.set(h.ticker, getStockAction(h)));
    return m;
  }, [holdingsWithLive]);

  /* ── Formatters ───────────────────────────────────────────────── */

  const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtShort = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
    if (abs >= 100_000)    return `₹${(n / 100_000).toFixed(2)}L`;
    return `₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  };

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const thStyle: React.CSSProperties = {
    padding:         "8px 12px",
    fontSize:        "8.5px",
    fontFamily:      "monospace",
    textTransform:   "uppercase",
    letterSpacing:   "0.12em",
    color:           "var(--th-text-faint)",
    fontWeight:      600,
    whiteSpace:      "nowrap",
    cursor:          "pointer",
    userSelect:      "none",
  };

  /* ── Empty state ──────────────────────────────────────────────── */
  const isEmpty = !mounted || holdings.length === 0;

  return (
    <div className="min-h-screen" style={{ background: "var(--th-bg-page)" }}>
      <Navbar />
      <MarketTicker />

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-3"
        style={{ background: "var(--th-bg-elevated)", borderBottom: "1px solid var(--th-border-subtle)" }}>
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-bold" style={{
              fontFamily: "var(--font-space-grotesk, sans-serif)",
              fontSize: "clamp(16px,2.5vw,22px)",
              color: "var(--th-text-primary)",
            }}>
              Portfolio{" "}
              <span style={{
                background: "linear-gradient(135deg, #FFD700, #C9A227)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>
                Intelligence
              </span>
            </h1>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--th-text-ultra-faint)" }}>
              AI-powered portfolio operating system · {holdings.length} holdings tracked
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLiveData(false)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all"
              style={{ background: "var(--th-border-subtle)", border: "1px solid var(--th-border-card)", color: "var(--th-text-muted)" }}>
              <RefreshCw size={10} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
              Refresh
            </button>
            {holdings.length > 0 && (
              <button
                onClick={() => setChatOpen(c => !c)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all"
                style={{
                  color:      chatOpen ? "#050505" : "#A78BFA",
                  background: chatOpen ? "#A78BFA" : "rgba(167,139,250,0.10)",
                  border:     "1px solid rgba(167,139,250,0.35)",
                }}>
                <Brain size={11} /> AI Advisor
              </button>
            )}
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all"
              style={{
                color:      "#FFD700",
                background: "rgba(255,215,0,0.08)",
                border:     "1px solid rgba(255,215,0,0.28)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,215,0,0.14)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow  = "0 0 16px rgba(255,215,0,0.12)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,215,0,0.08)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow  = "none";
              }}
            >
              <Scan size={11} /> Scan Portfolio
            </button>
            <button
              onClick={() => { setEditHolding(null); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all"
              style={{
                background: "linear-gradient(135deg, #FFD700, #C9A227)",
                color: "#050505",
                boxShadow: "0 4px 16px rgba(255,215,0,0.25)",
              }}>
              <Plus size={11} /> Add Holding
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Strip ───────────────────────────────────────────────── */}
      {!isEmpty && (
        <div style={{ background: "var(--th-bg-elevated)", borderBottom: "1px solid var(--th-border-subtle)" }}>
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {[
              {
                label: "Portfolio Value", value: fmtShort(metrics.totalValue),
                sub: `Invested: ${fmtShort(metrics.investedValue)}`,
                color: "var(--th-text-primary)", big: true,
              },
              {
                label: "Total P&L", value: `${metrics.totalPnl >= 0 ? "+" : ""}${fmtShort(metrics.totalPnl)}`,
                sub: `${metrics.totalPnlPct >= 0 ? "+" : ""}${metrics.totalPnlPct.toFixed(2)}%`,
                color: metrics.totalPnl >= 0 ? "var(--positive)" : "var(--negative)",
              },
              {
                label: "Day P&L", value: `${metrics.dayPnl >= 0 ? "+" : ""}${fmtShort(metrics.dayPnl)}`,
                sub: `${metrics.dayPnlPct >= 0 ? "+" : ""}${metrics.dayPnlPct.toFixed(2)}%`,
                color: metrics.dayPnl >= 0 ? "var(--positive)" : "var(--negative)",
              },
              { label: "Health Score", value: `${metrics.healthScore}`, sub: metrics.verdict, color: metrics.verdictColor },
              { label: "Risk Level",   value: metrics.riskLevel, sub: `β ${metrics.beta}`, color: metrics.riskColor },
              { label: "Sectors",      value: `${metrics.sectorCount}`, sub: `${holdings.length} holdings`, color: "var(--gold)" },
              { label: "Win Rate",     value: `${metrics.gainers + metrics.losers > 0 ? Math.round((metrics.gainers / (metrics.gainers + metrics.losers)) * 100) : 0}%`, sub: `${metrics.gainers}W / ${metrics.losers}L`, color: metrics.gainers > metrics.losers ? "var(--positive)" : "var(--negative)" },
            ].map((stat, i) => (
              <motion.div key={stat.label}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="flex flex-col p-2.5 rounded-xl"
                style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-subtle)" }}>
                <span className="text-[8px] font-mono uppercase tracking-widest mb-1" style={{ color: "var(--th-text-faint)" }}>
                  {stat.label}
                </span>
                <span className="text-[15px] font-mono font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </span>
                <span className="text-[9px] font-mono mt-0.5" style={{ color: "var(--th-text-ultra-faint)" }}>
                  {stat.sub}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Layout ───────────────────────────────────────────────── */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">

        {isEmpty ? (
          /* ── Empty state ── */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--th-gold-bg-mid)", border: "1px solid var(--th-border-accent)" }}>
              <PieChart size={36} style={{ color: "var(--gold)", opacity: 0.7 }} />
            </div>
            <div className="text-center">
              <h2 className="text-[18px] font-bold mb-2"
                style={{ fontFamily: "var(--font-space-grotesk, sans-serif)", color: "var(--th-text-primary)" }}>
                Your portfolio is empty
              </h2>
              <p className="text-[12px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                Add your first holding to unlock AI-powered portfolio intelligence
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <button
                onClick={() => setShowScanner(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-[12px] font-mono font-bold transition-all"
                style={{
                  color:      "#FFD700",
                  background: "rgba(255,215,0,0.09)",
                  border:     "1px solid rgba(255,215,0,0.30)",
                  boxShadow:  "0 4px 24px rgba(255,215,0,0.10)",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,215,0,0.15)"}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,215,0,0.09)"}
              >
                <Scan size={14} /> Scan Portfolio Image
              </button>
              <button
                onClick={() => { setEditHolding(null); setShowModal(true); }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-[12px] font-mono font-bold transition-all"
                style={{
                  background: "linear-gradient(135deg, #FFD700, #C9A227)",
                  color: "#050505",
                  boxShadow: "0 8px 32px rgba(255,215,0,0.3)",
                }}>
                <Plus size={14} /> Add Manually
              </button>
            </div>
          </motion.div>
        ) : (
          <>
          {/* AI Command Center */}
          <AICommandCenter
            narrative={narrative}
            dna={dna}
            fearScore={fearScore}
            stressTests={stressTests}
            holdings={holdingsWithLive}
            metrics={metrics}
          />

          <div className="grid grid-cols-1 xl:grid-cols-[220px_1fr_280px] gap-4">

            {/* ════════════════════════════════════════════════════════
                LEFT SIDEBAR
            ════════════════════════════════════════════════════════ */}
            <div className="flex flex-col gap-4">

              {/* AI Health Score Ring */}
              <div className="rounded-xl p-4 flex flex-col items-center"
                style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-card)" }}>
                <div className="text-[8.5px] font-mono uppercase tracking-[0.18em] mb-2"
                  style={{ color: "var(--th-text-faint)" }}>AI Health Score</div>
                <AIScoreRing
                  score={metrics.healthScore}
                  color={metrics.verdictColor}
                  label={metrics.verdict}
                />
                <div className="mt-2 text-center">
                  <div className="text-[9px] font-mono" style={{ color: "var(--th-text-faint)" }}>
                    Risk: <span style={{ color: metrics.riskColor }}>{metrics.riskLevel}</span>
                    &nbsp;·&nbsp;β {metrics.beta.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Sector Allocation */}
              <div className="rounded-xl p-4"
                style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-card)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <PieChart size={11} style={{ color: "var(--gold)" }} />
                  <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--th-text-faint)" }}>
                    Sectors
                  </span>
                  <button
                    onClick={() => setActivePanel("sectors")}
                    className="ml-auto text-[7.5px] font-mono px-1.5 py-0.5 rounded transition-all"
                    style={{ background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.20)", color: "rgba(255,215,0,0.65)" }}>
                    AI View →
                  </button>
                </div>
                <div className="flex justify-center mb-3">
                  <DonutChart sectors={sectorData} />
                </div>
                <div className="space-y-1.5">
                  {sectorData.map((s, i) => (
                    <motion.div key={s.label}
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                      <span className="text-[9px] font-mono flex-1 truncate" style={{ color: "var(--th-text-secondary)" }}>
                        {s.label}
                      </span>
                      <span className="text-[8px] font-mono"
                        style={{ color: s.pnlPct >= 0 ? "var(--positive)" : "var(--negative)" }}>
                        {s.pnlPct >= 0 ? "+" : ""}{s.pnlPct.toFixed(0)}%
                      </span>
                      <div className="w-12 mx-1 h-0.5 rounded-full overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.05)" }}>
                        <motion.div className="h-full rounded-full"
                          initial={{ width: 0 }} animate={{ width: `${Math.min(s.value, 100)}%` }}
                          transition={{ duration: 0.8, delay: 0.2 + i * 0.04 }}
                          style={{ background: s.color, boxShadow: `0 0 4px ${s.color}60` }} />
                      </div>
                      <span className="text-[9px] font-mono w-7 text-right" style={{ color: s.color }}>
                        {s.value.toFixed(0)}%
                      </span>
                    </motion.div>
                  ))}
                </div>
                {/* AI sector insight teaser */}
                {sectorData.length > 0 && (
                  <div className="mt-3 pt-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-[8.5px] font-mono leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.38)" }}>
                      {sectorData[0].value > 50
                        ? `⚠ ${sectorData[0].label} dominates at ${sectorData[0].value.toFixed(0)}% — sector concentration risk`
                        : sectorData.length >= 4
                          ? `✓ ${sectorData.length} sectors — diversification healthy`
                          : `Add more sector diversity for lower risk`}
                    </p>
                  </div>
                )}
              </div>

              {/* Portfolio Summary */}
              <div className="rounded-xl p-4"
                style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-card)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Wallet size={11} style={{ color: "var(--gold)" }} />
                  <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--th-text-faint)" }}>
                    Summary
                  </span>
                </div>
                {[
                  { k: "Invested",     v: fmtShort(metrics.investedValue), c: "var(--th-text-secondary)" },
                  { k: "Current Val",  v: fmtShort(metrics.totalValue),    c: "var(--th-text-primary)" },
                  { k: "Abs. Return",  v: `${metrics.totalPnl >= 0 ? "+" : ""}${fmtShort(metrics.totalPnl)}`,  c: metrics.totalPnl >= 0 ? "var(--positive)" : "var(--negative)" },
                  { k: "% Return",     v: `${metrics.totalPnlPct >= 0 ? "+" : ""}${metrics.totalPnlPct.toFixed(2)}%`, c: metrics.totalPnlPct >= 0 ? "var(--positive)" : "var(--negative)" },
                ].map(m => (
                  <div key={m.k} className="flex justify-between items-center py-1.5 border-b"
                    style={{ borderColor: "var(--th-border-subtle)" }}>
                    <span className="text-[10px] font-mono" style={{ color: "var(--th-text-faint)" }}>{m.k}</span>
                    <span className="text-[10.5px] font-mono font-semibold" style={{ color: m.c }}>{m.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════
                CENTER — HOLDINGS TABLE + CHARTS + AI
            ════════════════════════════════════════════════════════ */}
            <div className="flex flex-col gap-4 min-w-0">

              {/* Holdings table */}
              <div className="rounded-xl overflow-hidden"
                style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-card)" }}>

                {/* Table toolbar */}
                <div className="flex flex-wrap items-center gap-2 px-4 py-3"
                  style={{ borderBottom: "1px solid var(--th-border-subtle)" }}>
                  <BarChart2 size={11} style={{ color: "var(--gold)" }} />
                  <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--th-text-faint)" }}>
                    Holdings ({displayHoldings.length})
                  </span>

                  {/* View mode toggle */}
                  <div className="flex items-center gap-0.5 ml-2">
                    {(["table", "heatmap"] as const).map(v => (
                      <button key={v} onClick={() => setViewMode(v)}
                        className="px-2 py-0.5 rounded text-[8px] font-mono uppercase transition-all"
                        style={{
                          background: viewMode === v ? "var(--th-gold-bg-mid)" : "transparent",
                          border: `1px solid ${viewMode === v ? "var(--th-border-accent)" : "transparent"}`,
                          color: viewMode === v ? "var(--gold)" : "var(--th-text-faint)",
                        }}>
                        {v === "table" ? "≡ Table" : "⬛ Map"}
                      </button>
                    ))}
                  </div>

                  {/* Filter chips */}
                  <div className="flex items-center gap-1 ml-1">
                    {(["all","gainers","losers"] as const).map(f => (
                      <button key={f} onClick={() => setFilter(f)}
                        className="px-2 py-0.5 rounded text-[8.5px] font-mono uppercase transition-all"
                        style={{
                          background: filter === f ? "var(--th-gold-bg-mid)" : "transparent",
                          border:     `1px solid ${filter === f ? "var(--th-border-accent)" : "transparent"}`,
                          color:      filter === f ? "var(--gold)" : "var(--th-text-faint)",
                        }}>
                        {f}
                      </button>
                    ))}
                  </div>

                  <button onClick={() => { setEditHolding(null); setShowModal(true); }}
                    className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-mono transition-all"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,215,0,0.18), rgba(201,162,39,0.10))",
                      border: "1px solid var(--th-border-accent)",
                      color: "var(--gold)",
                    }}>
                    <Plus size={9} /> Add
                  </button>
                </div>

                {/* Table or Heatmap */}
                {viewMode === "heatmap" ? (
                  <div className="p-3">
                    <HoldingHeatmap holdings={displayHoldings} />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" style={{ borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--th-border-subtle)" }}>
                          {[
                            { key: null,     label: "STOCK",      align: "left"  },
                            { key: null,     label: "QTY",        align: "right" },
                            { key: null,     label: "AVG COST",   align: "right" },
                            { key: null,     label: "CMP",        align: "right" },
                            { key: "change", label: "DAY%",       align: "right" },
                            { key: "pnl",    label: "P&L",        align: "right" },
                            { key: "alloc",  label: "ALLOC",      align: "left"  },
                            { key: null,     label: "",           align: "left"  },
                          ].map((col, i) => (
                            <th key={i} style={{ ...thStyle, textAlign: col.align as "left"|"right" }}
                              onClick={() => col.key && handleSort(col.key as typeof sortBy)}>
                              <span className="flex items-center gap-1 justify-end" style={{ justifyContent: col.align === "left" ? "flex-start" : "flex-end" }}>
                                {col.label}
                                {col.key && sortBy === col.key && (
                                  sortDir === "desc"
                                    ? <ChevronDown size={8} style={{ color: "var(--gold)" }} />
                                    : <ChevronUp size={8} style={{ color: "var(--gold)" }} />
                                )}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence>
                          {displayHoldings.map(h => (
                            <HoldingRow
                              key={h.id}
                              holding={h}
                              action={stockActions.get(h.ticker)}
                              onEdit={() => { setEditHolding(h); setShowModal(true); }}
                              onRemove={() => remove(h.id)}
                            />
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Panel tabs: Allocation | Performance | AI */}
              <div className="rounded-xl overflow-hidden"
                style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-card)" }}>
                <div className="flex" style={{ borderBottom: "1px solid var(--th-border-subtle)" }}>
                  {([
                    { key: "performance", label: "Performance",     icon: Activity  },
                    { key: "sectors",     label: "Sectors",         icon: PieChart  },
                    { key: "radar",       label: "Dimensions",      icon: Target    },
                    { key: "ai",          label: "AI Intelligence", icon: Brain     },
                  ] as const).map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setActivePanel(key as typeof activePanel)}
                      className="flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-mono transition-all relative"
                      style={{
                        color:       activePanel === key ? "var(--gold)" : "var(--th-text-faint)",
                        borderBottom: activePanel === key ? "2px solid var(--gold)" : "2px solid transparent",
                      }}>
                      <Icon size={10} />
                      {label}
                    </button>
                  ))}
                </div>

                <div className="p-4">
                  {activePanel === "performance" && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 text-[8.5px] font-mono">
                          <span className="flex items-center gap-1.5">
                            <span className="w-4 h-0.5 rounded-full inline-block" style={{ background: metrics.totalPnlPct >= 0 ? "var(--positive)" : "var(--negative)" }} />
                            <span style={{ color: "var(--th-text-faint)" }}>My Portfolio</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-4 h-px rounded-full inline-block" style={{ background: "rgba(255,215,0,0.6)", borderTop: "1px dashed rgba(255,215,0,0.6)" }} />
                            <span style={{ color: "var(--th-text-faint)" }}>NIFTY50 Benchmark</span>
                          </span>
                        </div>
                        <span className="text-[8px] font-mono" style={{ color: "var(--th-text-ultra-faint)" }}>
                          Estimated 30-day trend
                        </span>
                      </div>
                      <PerformanceChart portfolio={perfData} benchmark={benchData} pnlPct={metrics.totalPnlPct} />
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {[
                          { label: "Total Return", value: `${metrics.totalPnlPct >= 0 ? "+" : ""}${metrics.totalPnlPct.toFixed(2)}%`, color: metrics.totalPnlPct >= 0 ? "var(--positive)" : "var(--negative)" },
                          { label: "Sharpe Ratio", value: metrics.sharpe.toFixed(2), color: metrics.sharpe > 1 ? "var(--positive)" : metrics.sharpe > 0 ? "var(--gold)" : "var(--negative)" },
                          { label: "Volatility",   value: `${metrics.volatility}%`,  color: "var(--th-text-secondary)" },
                          { label: "Max Drawdown", value: `${metrics.maxDrawdown}%`, color: "var(--negative)" },
                        ].map(m => (
                          <div key={m.label} className="p-2 rounded-lg text-center"
                            style={{ background: "var(--th-border-subtle)", border: "1px solid var(--th-border-card)" }}>
                            <div className="text-[8px] font-mono uppercase mb-0.5" style={{ color: "var(--th-text-ultra-faint)" }}>{m.label}</div>
                            <div className="text-[12px] font-mono font-bold" style={{ color: m.color }}>{m.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activePanel === "sectors" && (
                    <SectorIntelligencePanel
                      sectorData={sectorData}
                      totalValue={metrics.totalValue}
                    />
                  )}

                  {activePanel === "radar" && (
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="flex-shrink-0">
                        <div className="text-[8.5px] font-mono uppercase tracking-widest mb-2 text-center"
                          style={{ color: "var(--th-text-faint)" }}>Portfolio Dimensions</div>
                        <RadarChart dims={dimensions} color={metrics.verdictColor} />
                      </div>
                      <div className="flex-1 w-full">
                        <div className="text-[8.5px] font-mono uppercase tracking-widest mb-3"
                          style={{ color: "var(--th-text-faint)" }}>Dimension Scores</div>
                        <DimensionBars dims={dimensions} color={metrics.verdictColor} />
                        <div className="mt-4 p-3 rounded-xl"
                          style={{ background: `${metrics.verdictColor}08`, border: `1px solid ${metrics.verdictColor}18` }}>
                          <div className="text-[8.5px] font-mono uppercase mb-1.5" style={{ color: "var(--th-text-faint)" }}>
                            Weakest Dimension
                          </div>
                          {(() => {
                            const entries: [string, number][] = [
                              ["Quality", dimensions.quality], ["Momentum", dimensions.momentum],
                              ["Stability", dimensions.stability], ["Diversification", dimensions.diversification],
                              ["Growth", dimensions.growth], ["Defense", dimensions.defense],
                            ];
                            const worst = entries.reduce((a, b) => a[1] < b[1] ? a : b);
                            return (
                              <div className="text-[11px] font-mono font-bold" style={{ color: "#FF8C42" }}>
                                {worst[0]}: {worst[1]}/100 — focus area for improvement
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {activePanel === "ai" && (
                    <div>
                      {/* Narrative */}
                      <div className="p-3 rounded-xl mb-4"
                        style={{ background: `${metrics.verdictColor}08`, border: `1px solid ${metrics.verdictColor}22` }}>
                        <div className="flex items-center gap-2 mb-2">
                          <Brain size={10} style={{ color: metrics.verdictColor }} />
                          <div className="text-[8.5px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-faint)" }}>
                            AI Portfolio Analysis
                          </div>
                          <div className="ml-auto text-[8.5px] font-mono font-bold" style={{ color: metrics.verdictColor }}>
                            Score: {metrics.healthScore}
                          </div>
                        </div>
                        <p className="text-[10.5px] leading-relaxed font-mono" style={{ color: "rgba(255,255,255,0.72)" }}>
                          {narrative}
                        </p>
                      </div>

                      <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${metrics.healthScore}%` }}
                          transition={{ duration: 1.2, ease: [0.16,1,0.3,1] }}
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${metrics.verdictColor}80, ${metrics.verdictColor})` }} />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {aiInsights.warnings.length > 0 && (
                          <div>
                            <div className="text-[8.5px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--negative)" }}>
                              Risk Signals ({aiInsights.warnings.length})
                            </div>
                            <div className="space-y-1.5">
                              {aiInsights.warnings.map((w, i) => (
                                <div key={i} className="flex items-start gap-2 p-2 rounded-lg"
                                  style={{ background: "rgba(255,77,77,0.06)", border: "1px solid rgba(255,77,77,0.14)" }}>
                                  <AlertTriangle size={9} style={{ color: "var(--negative)", flexShrink: 0, marginTop: 1 }} />
                                  <span className="text-[10px] leading-relaxed" style={{ color: "var(--th-text-dim)" }}>{w}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {aiInsights.suggestions.length > 0 && (
                          <div>
                            <div className="text-[8.5px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--gold)" }}>
                              AI Suggestions ({aiInsights.suggestions.length})
                            </div>
                            <div className="space-y-1.5">
                              {aiInsights.suggestions.map((s, i) => (
                                <div key={i} className="flex items-start gap-2 p-2 rounded-lg"
                                  style={{ background: "var(--th-gold-bg)", border: "1px solid rgba(255,215,0,0.12)" }}>
                                  <Zap size={9} style={{ color: "var(--gold)", flexShrink: 0, marginTop: 1 }} />
                                  <span className="text-[10px] leading-relaxed" style={{ color: "var(--th-text-dim)" }}>{s}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {aiInsights.warnings.length === 0 && aiInsights.suggestions.length === 0 && (
                        <div className="text-center py-4 text-[11px] font-mono" style={{ color: "var(--th-text-faint)" }}>
                          Add more holdings to unlock AI portfolio insights
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════
                RIGHT SIDEBAR
            ════════════════════════════════════════════════════════ */}
            <div className="flex flex-col gap-4">

              {/* AI Opportunities */}
              <div className="rounded-xl p-4"
                style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-card)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={11} style={{ color: "var(--gold)" }} />
                  <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--th-text-faint)" }}>
                    AI Opportunities
                  </span>
                </div>
                <OpportunitiesPanel holdings={holdingsWithLive} actions={stockActions} />
              </div>

              {/* Risk Metrics */}
              <div className="rounded-xl p-4"
                style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-card)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={11} style={{ color: "var(--gold)" }} />
                  <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--th-text-faint)" }}>
                    Risk Metrics
                  </span>
                </div>
                {[
                  { k: "Portfolio Beta",    v: metrics.beta.toFixed(2),      c: metrics.beta > 1.2 ? "var(--negative)" : metrics.beta > 0.8 ? "var(--gold)" : "var(--positive)" },
                  { k: "Sharpe Ratio",      v: metrics.sharpe.toFixed(2),    c: metrics.sharpe > 1.5 ? "var(--positive)" : metrics.sharpe > 0.5 ? "var(--gold)" : "var(--negative)" },
                  { k: "Annl. Volatility",  v: `${metrics.volatility}%`,     c: metrics.volatility > 25 ? "var(--negative)" : "var(--gold)" },
                  { k: "Max Drawdown",      v: `${metrics.maxDrawdown}%`,    c: "var(--negative)" },
                  { k: "Concentration",     v: `${metrics.concentration.toFixed(1)}%`, c: metrics.concentration > 35 ? "var(--negative)" : "var(--gold)" },
                  { k: "HHI Index",         v: metrics.hhi.toFixed(3),       c: metrics.hhi > 0.3 ? "var(--negative)" : metrics.hhi > 0.15 ? "var(--gold)" : "var(--positive)" },
                ].map(m => (
                  <div key={m.k} className="flex justify-between items-center py-1.5 border-b last:border-0"
                    style={{ borderColor: "var(--th-border-subtle)" }}>
                    <span className="text-[9.5px] font-mono" style={{ color: "var(--th-text-muted)" }}>{m.k}</span>
                    <span className="text-[10px] font-mono font-semibold" style={{ color: m.c }}>{m.v}</span>
                  </div>
                ))}
              </div>

              {/* Stress Tests */}
              <div className="rounded-xl p-4"
                style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-card)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={11} style={{ color: "var(--gold)" }} />
                  <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--th-text-faint)" }}>
                    Stress Tests
                  </span>
                </div>
                <StressTestPanel tests={stressTests} totalValue={metrics.totalValue} />
              </div>

              {/* Macro Exposure Engine */}
              <div className="rounded-xl p-4"
                style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-card)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Globe size={11} style={{ color: "var(--gold)" }} />
                  <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--th-text-faint)" }}>
                    Macro Exposure
                  </span>
                </div>
                {[
                  { key: "crude",       label: "Crude Oil",      icon: Droplets  },
                  { key: "rbi",         label: "RBI Rates",      icon: Building2 },
                  { key: "usdinr",      label: "USD/INR",        icon: DollarSign},
                  { key: "inflation",   label: "Inflation",      icon: Flame     },
                  { key: "china",       label: "China Risk",     icon: Globe     },
                  { key: "usRecession", label: "US Recession",   icon: TrendingDown },
                  { key: "ai",          label: "AI / Tech Boom", icon: Cpu       },
                  { key: "defense",     label: "Defense Spend",  icon: Shield    },
                  { key: "capex",       label: "Capex Cycle",    icon: Activity  },
                ].map(({ key, label, icon: Icon }) => {
                  const val = macroExposure[key] ?? 40;
                  const col = val >= 70 ? "var(--negative)" : val >= 50 ? "var(--gold)" : "var(--positive)";
                  return (
                    <div key={key} className="mb-2 last:mb-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <Icon size={8} style={{ color: "var(--th-text-faint)" }} />
                          <span className="text-[9px] font-mono" style={{ color: "var(--th-text-muted)" }}>{label}</span>
                        </div>
                        <span className="text-[8.5px] font-mono font-bold" style={{ color: col }}>{val}</span>
                      </div>
                      <div className="h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <motion.div className="h-full rounded-full"
                          initial={{ width: 0 }} animate={{ width: `${val}%` }}
                          transition={{ duration: 0.8 }}
                          style={{ background: col }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Smart Money Tracker */}
              <div className="rounded-xl p-4"
                style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-card)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Eye size={11} style={{ color: "var(--gold)" }} />
                  <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--th-text-faint)" }}>
                    Smart Money
                  </span>
                  <div className="ml-auto w-1.5 h-1.5 rounded-full animate-live-dot" style={{ background: "var(--positive)" }} />
                </div>
                {[
                  { label: "FII Bias",        value: "ACCUMULATING", color: "var(--positive)"  },
                  { label: "DII Activity",     value: "SELECTIVE BUY", color: "var(--gold)"     },
                  { label: "Promoter Hold",    value: "STABLE",        color: "var(--positive)"  },
                  { label: "Operator Risk",    value: "LOW",           color: "var(--positive)"  },
                  { label: "Delivery %",       value: "68%",           color: "var(--gold)"     },
                  { label: "Inst. Interest",   value: "RISING",        color: "var(--positive)"  },
                ].map(m => (
                  <div key={m.label} className="flex justify-between items-center py-1.5 border-b last:border-0"
                    style={{ borderColor: "var(--th-border-subtle)" }}>
                    <span className="text-[9px] font-mono" style={{ color: "var(--th-text-faint)" }}>{m.label}</span>
                    <span className="text-[9px] font-mono font-bold" style={{ color: m.color }}>{m.value}</span>
                  </div>
                ))}
              </div>

              {/* Top Holdings Quick View */}
              <div className="rounded-xl p-4"
                style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-card)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Star size={11} style={{ color: "var(--gold)" }} />
                  <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--th-text-faint)" }}>
                    Top Positions
                  </span>
                </div>
                {holdingsWithLive
                  .sort((a, b) => b.allocationPct - a.allocationPct)
                  .slice(0, 5)
                  .map((h, i) => {
                    const col = sectorColor(h.sector || "Other");
                    return (
                      <Link key={h.ticker} href={`/stock/${h.ticker}`}
                        className="flex items-center gap-2 py-1.5 border-b last:border-0 transition-opacity hover:opacity-80"
                        style={{ borderColor: "var(--th-border-subtle)" }}>
                        <span className="text-[8px] font-mono" style={{ color: "var(--th-text-ultra-faint)", width: 12 }}>
                          {i + 1}
                        </span>
                        <div className="w-5 h-5 rounded-md flex items-center justify-center text-[6px] font-bold flex-shrink-0"
                          style={{ background: `${col}18`, border: `1px solid ${col}30`, color: col }}>
                          {h.ticker.slice(0, 3)}
                        </div>
                        <span className="text-[10px] font-mono font-bold flex-1" style={{ color: "var(--th-text-primary)" }}>
                          {h.ticker}
                        </span>
                        <span className="text-[9px] font-mono" style={{ color: h.pnl >= 0 ? "var(--positive)" : "var(--negative)" }}>
                          {h.pnlPct >= 0 ? "+" : ""}{h.pnlPct.toFixed(1)}%
                        </span>
                        <ChevronRight size={8} style={{ color: "var(--th-text-ultra-faint)" }} />
                      </Link>
                    );
                  })}
              </div>
            </div>
          </div>
          </>
        )}
      </div>

      {/* AI Chat Panel */}
      <AnimatePresence>
        {chatOpen && holdings.length > 0 && (
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-4">
            <AIChatPanel
              holdings={holdingsWithLive}
              metrics={metrics}
              dna={dna}
              stressTests={stressTests}
              sectorData={sectorData}
              onClose={() => setChatOpen(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="px-4 sm:px-6 py-4 mt-4" style={{ borderTop: "1px solid var(--th-border-subtle)" }}>
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-[8.5px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-ultra-faint)" }}>
            MARKET KA BAADSHAH · Portfolio Intelligence v2.0 · AI-powered · Not investment advice
          </span>
          <span className="text-[8.5px] font-mono" style={{ color: "var(--th-text-ultra-faint)" }}>
            Live quotes update every 30s · Data from NSE via Yahoo Finance
          </span>
        </div>
      </footer>

      {/* ── Modal ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <HoldingModal
            initial={editHolding ?? undefined}
            onClose={() => { setShowModal(false); setEditHolding(null); }}
            onSubmit={h => {
              if (editHolding) {
                update(editHolding.id, { quantity: h.quantity, avgPrice: h.avgPrice, notes: h.notes });
              } else {
                add(h);
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScanner && (
          <PortfolioScanner
            onClose={() => setShowScanner(false)}
            onImport={async (imported: ImportedHolding[]) => {
              for (const h of imported) {
                await add(h);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
