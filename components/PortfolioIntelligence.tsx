"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Zap, AlertTriangle, MessageSquare, Send, X, Activity, PieChart } from "lucide-react";
import type { EnrichedSectorData } from "@/lib/sectorMap";
import { getSectorInsight, generateSectorNarrative } from "@/lib/sectorMap";
export type { EnrichedSectorData };
import type {
  HoldingData, PortfolioData, DNAResult, StressTest,
  PortfolioDimensions, ChatMessage,
  StockActionResult,
} from "@/lib/portfolioIntelligence";
import { processAIQuery, fearLabel, fearColor } from "@/lib/portfolioIntelligence";

/* ═══════════════════════════════════════════════════════════════════════════
   AI SCORE RING
═══════════════════════════════════════════════════════════════════════════ */

export function AIScoreRing({
  score, color, label,
}: {
  score: number; color: string; label: string;
}) {
  const R = 52, CX = 68, CY = 68;
  const circ = 2 * Math.PI * R;
  const filled = (score / 100) * circ;
  const grade = score >= 85 ? "A+" : score >= 70 ? "A" : score >= 50 ? "B" : score >= 30 ? "C" : "D";

  return (
    <div className="flex flex-col items-center">
      <svg width={136} height={136}>
        <defs>
          <radialGradient id="scoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor={color} stopOpacity="0.05" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Glow circle */}
        <circle cx={CX} cy={CY} r={R + 10} fill="url(#scoreGlow)" />
        {/* Track */}
        <circle cx={CX} cy={CY} r={R} fill="none"
          stroke="var(--border-muted)" strokeWidth="14" />
        {/* Fill arc */}
        <motion.circle cx={CX} cy={CY} r={R} fill="none"
          stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`0 ${circ}`}
          animate={{ strokeDasharray: `${filled} ${circ - filled}` }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          strokeDashoffset={circ * 0.25}
          style={{ filter: `drop-shadow(0 0 8px ${color}90)` }}
        />
        {/* Inner ring */}
        <circle cx={CX} cy={CY} r={R - 16} fill="none"
          stroke="var(--border-muted)" strokeWidth="1" />
        {/* Score */}
        <text x={CX} y={CY - 8} textAnchor="middle" fill={color}
          fontSize="28" fontWeight="bold" fontFamily="monospace">
          {score}
        </text>
        {/* Grade */}
        <text x={CX} y={CY + 11} textAnchor="middle" fill={color}
          fontSize="13" fontWeight="bold" fontFamily="monospace" opacity="0.8">
          {grade}
        </text>
        {/* Label */}
        <text x={CX} y={CY + 26} textAnchor="middle"
          fill="var(--th-text-faint)" fontSize="7.5" fontFamily="monospace" letterSpacing="2">
          {label}
        </text>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   RADAR CHART (6 dimensions)
═══════════════════════════════════════════════════════════════════════════ */

const RADAR_AXES = [
  { label: "Quality",       angle: 90  },
  { label: "Momentum",      angle: 30  },
  { label: "Growth",        angle: 330 },
  { label: "Defense",       angle: 270 },
  { label: "Stability",     angle: 210 },
  { label: "Diversif.",     angle: 150 },
];

export function RadarChart({ dims, color }: { dims: PortfolioDimensions; color: string }) {
  const W = 210, H = 210, CX = 105, CY = 105, R = 78;
  const values = [
    dims.quality, dims.momentum, dims.growth,
    dims.defense, dims.stability, dims.diversification,
  ];

  const pt = (angle: number, scale: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: CX + R * scale * Math.cos(rad), y: CY - R * scale * Math.sin(rad) };
  };

  const polyPath = (scale: number) =>
    RADAR_AXES.map(({ angle }, i) => {
      const p = pt(angle, scale);
      return `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(" ") + " Z";

  const dataPath = RADAR_AXES.map(({ angle }, i) => {
    const p = pt(angle, Math.max(0.04, values[i] / 100));
    return `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ") + " Z";

  return (
    <svg width={W} height={H}>
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </radialGradient>
      </defs>
      {/* Background grid rings */}
      {[0.25, 0.5, 0.75, 1].map((s, i) => (
        <path key={i} d={polyPath(s)} fill="none"
          stroke="var(--border-muted)" strokeWidth="1" />
      ))}
      {/* Axis lines */}
      {RADAR_AXES.map(({ angle }, i) => {
        const p = pt(angle, 1);
        return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y}
          stroke="var(--border-muted)" strokeWidth="1" />;
      })}
      {/* Data fill */}
      <motion.path d="M 105,105 Z" fill="url(#radarFill)"
        animate={{ d: dataPath }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />
      {/* Data stroke */}
      <motion.path d="M 105,105 Z" fill="none"
        stroke={color} strokeWidth="2"
        animate={{ d: dataPath }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
      />
      {/* Data dots */}
      {RADAR_AXES.map(({ angle }, i) => {
        const p = pt(angle, Math.max(0.04, values[i] / 100));
        return <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={color}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }} />;
      })}
      {/* Axis labels */}
      {RADAR_AXES.map(({ angle, label }, i) => {
        const p = pt(angle, 1.22);
        return (
          <text key={i} x={p.x} y={p.y + 3.5} textAnchor="middle"
            fill="var(--th-text-dim)" fontSize="8" fontFamily="monospace">
            {label}
          </text>
        );
      })}
      {/* Value labels on dots */}
      {RADAR_AXES.map(({ angle }, i) => {
        const p = pt(angle, Math.max(0.04, values[i] / 100));
        if (values[i] < 10) return null;
        return (
          <text key={i} x={p.x} y={p.y - 6} textAnchor="middle"
            fill={color} fontSize="7" fontFamily="monospace" fontWeight="bold">
            {values[i]}
          </text>
        );
      })}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOLDING HEATMAP
═══════════════════════════════════════════════════════════════════════════ */

export function HoldingHeatmap({ holdings }: { holdings: HoldingData[] }) {
  if (holdings.length === 0) return null;
  const sorted = [...holdings].sort((a, b) => b.allocationPct - a.allocationPct);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", minHeight: "120px" }}>
      {sorted.map(h => {
        const mag    = Math.min(Math.abs(h.pnlPct) / 30, 1);
        const isPos  = h.pnl >= 0;
        const bg     = isPos
          ? `hsla(155, ${35 + mag * 55}%, ${22 + mag * 18}%, 0.9)`
          : `hsla(5, ${40 + mag * 55}%, ${22 + mag * 12}%, 0.9)`;
        const border = isPos
          ? `rgba(0,255,156,${0.25 + mag * 0.4})`
          : `rgba(255,77,77,${0.25 + mag * 0.4})`;
        const textCol = isPos ? "var(--success)" : "#FF6B6B";

        return (
          <motion.div key={h.ticker}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            style={{
              flex:           `${Math.max(h.allocationPct, 5)} 0 ${Math.max(56, h.allocationPct * 3.2)}px`,
              background:     bg,
              border:         `1px solid ${border}`,
              borderRadius:   "7px",
              padding:        "7px 6px",
              minHeight:      "66px",
              display:        "flex",
              flexDirection:  "column",
              justifyContent: "space-between",
              cursor:         "default",
            }}>
            <div style={{ fontSize: "9.5px", fontFamily: "monospace", fontWeight: 700, color: "var(--th-text-primary)", letterSpacing: "0.04em" }}>
              {h.ticker}
            </div>
            <div>
              <div style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 700, color: textCol }}>
                {h.pnlPct >= 0 ? "+" : ""}{h.pnlPct.toFixed(1)}%
              </div>
              <div style={{ fontSize: "7.5px", fontFamily: "monospace", color: "var(--th-text-dim)" }}>
                {h.allocationPct.toFixed(0)}% alloc
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FEAR GAUGE (semicircle arc)
═══════════════════════════════════════════════════════════════════════════ */

export function FearGauge({ score }: { score: number }) {
  const R = 50, CX = 70, CY = 72;
  const circ = Math.PI * R;
  const filled = (score / 100) * circ;
  const color = fearColor(score);
  const label = fearLabel(score);

  // Counter-clockwise upper semicircle: left → top → right
  const pathD = `M ${CX - R},${CY} A ${R},${R} 0 0 0 ${CX + R},${CY}`;

  return (
    <svg width={140} height={90}>
      {/* Track */}
      <path d={pathD} fill="none"
        stroke="var(--border-muted)" strokeWidth="12" strokeLinecap="round" />
      {/* Color zones (faint) */}
      <path d={`M ${CX - R},${CY} A ${R},${R} 0 0 0 ${CX + R},${CY}`}
        fill="none" stroke="rgba(0,255,156,0.06)" strokeWidth="10" />
      {/* Fill */}
      <motion.path d={pathD} fill="none"
        stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`0 ${circ}`}
        animate={{ strokeDasharray: `${filled} ${circ - filled}` }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        strokeDashoffset={0}
        style={{ filter: `drop-shadow(0 0 7px ${color}70)` }}
      />
      {/* Center dot */}
      <circle cx={CX} cy={CY} r={5} fill={color}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      {/* Score */}
      <text x={CX} y={CY - 14} textAnchor="middle" fill={color}
        fontSize="22" fontWeight="bold" fontFamily="monospace">
        {score}
      </text>
      {/* Label */}
      <text x={CX} y={CY + 2} textAnchor="middle" fill={color}
        fontSize="8.5" fontFamily="monospace" letterSpacing="2">
        {label}
      </text>
      {/* Axis labels */}
      <text x={CX - R + 2} y={CY + 18} textAnchor="middle"
        fill="var(--th-text-ultra-faint)" fontSize="7" fontFamily="monospace">CALM</text>
      <text x={CX + R - 2} y={CY + 18} textAnchor="middle"
        fill="var(--th-text-ultra-faint)" fontSize="7" fontFamily="monospace">PANIC</text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PORTFOLIO DNA CARD
═══════════════════════════════════════════════════════════════════════════ */

export function PortfolioDNACard({ dna }: { dna: DNAResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4"
      style={{
        background: dna.bgColor,
        border: `1px solid ${dna.color}30`,
        boxShadow: `0 0 24px ${dna.color}10`,
      }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[18px]">{dna.emoji}</span>
        <div>
          <div className="text-[8px] font-mono uppercase tracking-[0.18em]"
            style={{ color: "var(--th-text-dim)" }}>Portfolio DNA</div>
          <div className="text-[13px] font-bold font-mono" style={{ color: dna.color }}>
            {dna.label}
          </div>
        </div>
        <div className="ml-auto px-2 py-0.5 rounded-full text-[8px] font-mono font-bold"
          style={{ background: `${dna.color}20`, border: `1px solid ${dna.color}40`, color: dna.color }}>
          {dna.riskTemperament}
        </div>
      </div>
      <p className="text-[9.5px] leading-relaxed mb-3"
        style={{ color: "var(--th-text-muted)" }}>
        {dna.description}
      </p>
      <div className="space-y-1">
        {dna.behaviors.map((b, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className="mt-0.5 text-[8px]" style={{ color: dna.color }}>▸</span>
            <span className="text-[9px] leading-relaxed" style={{ color: "var(--th-text-muted)" }}>{b}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AI COMMAND CENTER (hero band)
═══════════════════════════════════════════════════════════════════════════ */

export function AICommandCenter({
  narrative, dna, fearScore, stressTests, holdings, metrics,
}: {
  narrative:   string;
  dna:         DNAResult;
  fearScore:   number;
  stressTests: StressTest[];
  holdings:    HoldingData[];
  metrics:     PortfolioData;
}) {
  const convictionLabel =
    metrics.sharpe > 1.5 ? "BULLISH" :
    metrics.sharpe > 0.5 ? "NEUTRAL" :
    metrics.totalPnlPct > 0 ? "CAUTIOUS" : "BEARISH";
  const convictionColor =
    convictionLabel === "BULLISH" ? "var(--success)" :
    convictionLabel === "NEUTRAL" ? "var(--primary)" :
    convictionLabel === "CAUTIOUS" ? "#FF8C42" : "var(--danger)";

  const vulnerable = [...holdings].sort((a,b) => b.allocationPct - a.allocationPct).slice(0, 3);
  const topHolding = vulnerable[0]?.ticker || "Portfolio";
  const riskLevel = fearScore >= 70 ? "HIGH" : fearScore >= 40 ? "MEDIUM" : "LOW";
  const riskColor = fearScore >= 70 ? "var(--danger)" : fearScore >= 40 ? "var(--gold)" : "var(--success)";
  const protectionScore = Math.max(0, 100 - fearScore);
  const recommendation = fearScore >= 70 
    ? `Reduce ${topHolding} concentration by 15% to lower portfolio drawdown.`
    : fearScore >= 40 
    ? `Watch ${topHolding} concentration; it drives your downside risk.`
    : "Strong diversification. Maintain current sector balance.";

  const loss10 = metrics.beta * -10 * 1.08;
  const loss20 = metrics.beta * -20 * 1.15;
  const loss30 = metrics.beta * -30 * 1.25;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden mb-4"
      style={{
        background: "var(--th-bg-card)",
        border:     "1px solid var(--border-accent-faint)",
        boxShadow:  "0 0 40px var(--border-accent-faint), 0 8px 32px var(--shadow-deep)",
      }}>

      {/* Header bar */}
      <div className="flex items-center gap-2.5 px-5 py-3"
        style={{ borderBottom: "1px solid var(--border-accent-faint)", background: "var(--primary-muted)" }}>
        <Brain size={13} style={{ color: "var(--primary)" }} />
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--border-accent)",
          }}
        >
          AI Intelligence Command Center
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span style={{ fontFamily: "monospace", fontSize: "9px", fontWeight: 400, color: "var(--th-text-faint)" }}>LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0">

        {/* AI Verdict */}
        <div className="p-5" style={{ borderRight: "1px solid var(--border-muted)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-lg flex items-center justify-center"
              style={{ background: "var(--primary-muted)", border: "1px solid var(--border-accent-faint)" }}>
              <Brain size={10} style={{ color: "var(--primary)" }} />
            </div>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "11px",
                fontWeight: 400,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--th-text-dim)",
              }}
            >
              AI Portfolio Verdict
            </span>
            <div className="ml-auto px-2 py-0.5 rounded text-[8px] font-mono font-bold"
              style={{ background: `${convictionColor}18`, border: `1px solid ${convictionColor}30`, color: convictionColor }}>
              {convictionLabel}
            </div>
          </div>
          {/* AI narrative — body text (14px/400) */}
          <p
            style={{
              fontFamily: "sans-serif",
              fontSize: "14px",
              fontWeight: 400,
              lineHeight: 1.7,
              color: "var(--th-text-secondary)",
            }}
          >
            {narrative}
          </p>
          {holdings.length > 0 && (
            <div className="mt-3 flex items-center gap-3 text-[9px] font-mono"
              style={{ color: "var(--th-text-faint)" }}>
              <span>β {metrics.beta.toFixed(2)}</span>
              <span>·</span>
              <span>Sharpe {metrics.sharpe.toFixed(2)}</span>
              <span>·</span>
              <span>{metrics.gainers}W / {metrics.losers}L</span>
            </div>
          )}
        </div>

        {/* Portfolio DNA */}
        <div className="p-5" style={{ borderRight: "1px solid var(--border-muted)" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[16px]">{dna.emoji}</span>
            <div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "11px",
                  fontWeight: 400,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--th-text-dim)",
                }}
              >
                Portfolio DNA
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "16px",
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  color: dna.color,
                }}
              >
                {dna.label}
              </div>
            </div>
            <div className="ml-auto px-2 py-0.5 rounded text-[7.5px] font-mono font-bold"
              style={{ background: `${dna.color}18`, border: `1px solid ${dna.color}30`, color: dna.color }}>
              {dna.riskTemperament}
            </div>
          </div>
          <p className="text-[10px] leading-relaxed mb-2.5"
            style={{ color: "var(--th-text-muted)", fontFamily: "monospace" }}>
            {dna.description}
          </p>
          <div className="space-y-1">
            {dna.behaviors.map((b, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-[8px] mt-0.5" style={{ color: dna.color }}>▸</span>
                <span className="text-[9px]" style={{ color: "var(--th-text-dim)" }}>{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Meter */}
        <div className="p-5 flex flex-col justify-between" style={{ background: "var(--th-bg-elevated)", borderLeft: "1px solid var(--border-muted)" }}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--th-text-dim)" }}>Risk Meter</div>
              <div className="px-2 py-0.5 rounded text-[9px] font-mono font-bold" style={{ background: `${riskColor}18`, border: `1px solid ${riskColor}30`, color: riskColor }}>
                {riskLevel} RISK
              </div>
            </div>

            <div className="space-y-2.5 mb-5">
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span style={{ color: "var(--th-text-muted)" }}>If NIFTY falls 10%</span>
                <span style={{ color: "var(--danger)", fontWeight: 600 }}>{loss10.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span style={{ color: "var(--th-text-muted)" }}>If NIFTY falls 20%</span>
                <span style={{ color: "var(--danger)", fontWeight: 600 }}>{loss20.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span style={{ color: "var(--th-text-muted)" }}>If NIFTY falls 30%</span>
                <span style={{ color: "var(--danger)", fontWeight: 600 }}>{loss30.toFixed(1)}%</span>
              </div>
            </div>

            <div className="mb-5">
              <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: "var(--th-text-faint)" }}>Vulnerable Holdings</div>
              <div className="flex flex-col gap-1.5 text-[11px] font-mono">
                {vulnerable.map((h, i) => (
                  <div key={h.ticker} className="flex justify-between items-center">
                    <div className="flex gap-2 items-center">
                      <span style={{ color: "var(--th-text-faint)" }}>{i + 1}.</span>
                      <span style={{ color: "var(--th-text-secondary)" }}>{h.ticker}</span>
                    </div>
                    <span style={{ color: "var(--th-text-dim)" }}>{h.allocationPct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3" style={{ borderTop: "1px solid var(--border-muted)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--th-text-muted)" }}>Protection Score</span>
              <span className="text-[12px] font-bold font-mono" style={{ color: "var(--th-text-primary)" }}>{protectionScore}<span className="text-[9px]" style={{ color: "var(--th-text-faint)" }}>/100</span></span>
            </div>
            <div className="text-[10px] font-mono leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
              {recommendation}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STRESS TEST PANEL
═══════════════════════════════════════════════════════════════════════════ */

export function StressTestPanel({
  tests, totalValue,
}: {
  tests: StressTest[]; totalValue: number;
}) {
  const fmtAbs = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 10_000_000) return `₹${(abs / 10_000_000).toFixed(1)}Cr`;
    if (abs >= 100_000)    return `₹${(abs / 100_000).toFixed(1)}L`;
    return `₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  };

  const severityColor: Record<string, string> = {
    SAFE: "var(--success)", CAUTION: "var(--primary)", WARNING: "#FF8C42", CRITICAL: "var(--danger)",
  };

  return (
    <div className="space-y-2">
      {tests.map((t, i) => {
        const col = severityColor[t.severity];
        const barW = Math.min(100, Math.abs(t.portfolioImpactPct) * 2.5);
        return (
          <motion.div key={t.scenario}
            initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}>
            <div className="flex items-center justify-between mb-1">
              <span style={{ fontFamily: "monospace", fontSize: "11px", fontWeight: 400, color: "var(--th-text-muted)" }}>
                {t.icon} {t.scenario}
              </span>
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 700, letterSpacing: "-0.01em", color: col }}>
                  {t.portfolioImpactPct.toFixed(1)}%
                </span>
                <span style={{ fontFamily: "monospace", fontSize: "10px", fontWeight: 400, color: "var(--th-text-faint)" }}>
                  {fmtAbs(t.portfolioImpactAbs)}
                </span>
              </div>
            </div>
            <div className="h-1 rounded-full overflow-hidden"
              style={{ background: "var(--border-muted)" }}>
              <motion.div className="h-full rounded-full"
                initial={{ width: 0 }} animate={{ width: `${barW}%` }}
                transition={{ duration: 0.8, delay: i * 0.08 }}
                style={{ background: col, boxShadow: `0 0 6px ${col}60` }} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   OPPORTUNITIES PANEL
═══════════════════════════════════════════════════════════════════════════ */

export function OpportunitiesPanel({
  holdings, actions,
}: {
  holdings: HoldingData[];
  actions:  Map<string, StockActionResult>;
}) {
  if (holdings.length === 0) {
    return <div className="text-[10px] font-mono text-center py-3"
      style={{ color: "var(--th-text-ultra-faint)" }}>No holdings yet</div>;
  }

  const ORDER: Record<string, number> = { REDUCE: 0, WATCH: 1, STRONG: 2, HOLD: 3 };
  const sorted = [...holdings].sort((a, b) => {
    const aOrd = ORDER[actions.get(a.ticker)?.action ?? "HOLD"] ?? 3;
    const bOrd = ORDER[actions.get(b.ticker)?.action ?? "HOLD"] ?? 3;
    return aOrd !== bOrd ? aOrd - bOrd : b.allocationPct - a.allocationPct;
  });

  return (
    <div className="space-y-1">
      {sorted.map((h, i) => {
        const act = actions.get(h.ticker);
        if (!act) return null;
        const isPos = h.pnlPct >= 0;
        return (
          <motion.div key={h.ticker}
            initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-2 py-2.5 border-b last:border-0"
            style={{ borderColor: "var(--border-muted)" }}>
            {/* Action badge */}
            <div
              className="px-2 py-1 rounded font-mono font-bold w-14 text-center flex-shrink-0"
              style={{ fontSize: "9px", background: act.bg, border: `1px solid ${act.color}30`, color: act.color }}
            >
              {act.action}
            </div>
            {/* Ticker — name weight */}
            <span
              className="flex-1 font-mono"
              style={{ fontSize: "13px", fontWeight: 600, color: "var(--th-text-primary)" }}
            >
              {h.ticker}
            </span>
            {/* P&L — number dominant */}
            <span
              className="font-mono"
              style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "-0.01em", color: isPos ? "var(--success)" : "var(--danger)" }}
            >
              {isPos ? "+" : ""}{h.pnlPct.toFixed(1)}%
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AI CHAT PANEL
═══════════════════════════════════════════════════════════════════════════ */

export function AIChatPanel({
  holdings, metrics, dna, stressTests, sectorData, onClose,
}: {
  holdings:    HoldingData[];
  metrics:     PortfolioData;
  dna:         DNAResult;
  stressTests: StressTest[];
  sectorData:  { label: string; value: number }[];
  onClose:     () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: "ai",
    text: `Portfolio loaded — ${holdings.length} holding${holdings.length !== 1 ? "s" : ""} detected across ${new Set(holdings.map(h => h.sector || "Other")).size} sectors. Ask me anything.`,
    ts: Date.now(),
  }]);
  const [input, setInput]     = useState("");
  const [typing, setTyping]   = useState(false);
  const bottomRef             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(() => {
    const q = input.trim();
    if (!q) return;
    const userMsg: ChatMessage = { role: "user", text: q, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const response = processAIQuery(q, holdings, metrics, dna, stressTests, sectorData);
      setMessages(prev => [...prev, { role: "ai", text: response, ts: Date.now() }]);
      setTyping(false);
    }, 520 + Math.random() * 280);
  }, [input, holdings, metrics, dna, stressTests, sectorData]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const SUGGESTIONS = [
    "Which stock is my weakest?",
    "Can I survive a 20% crash?",
    "Where should I reduce exposure?",
    "What sectors am I missing?",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background:  "var(--th-bg-card)",
        border:      "1px solid var(--border-accent-faint)",
        boxShadow:   "0 0 40px var(--shadow-sm)",
      }}>

      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3"
        style={{ borderBottom: "1px solid var(--border-faint)", background: "var(--bg-accent-faint)" }}>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: "var(--primary-muted)", border: "1px solid var(--border-accent-faint)" }}>
          <MessageSquare size={11} style={{ color: "var(--primary)" }} />
        </div>
        <span className="text-[9px] font-mono uppercase tracking-[0.2em]"
          style={{ color: "var(--border-accent)" }}>AI Portfolio Advisor</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[8px] font-mono" style={{ color: "var(--th-text-ultra-faint)" }}>ONLINE</span>
          <button onClick={onClose} className="ml-2 p-1 rounded-lg transition-colors"
            style={{ color: "var(--th-text-faint)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--th-text-secondary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--th-text-faint)")}>
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="overflow-y-auto px-4 py-4 space-y-3" style={{ maxHeight: "280px" }}>
        {messages.map((m, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "ai" && (
              <div className="w-5 h-5 rounded-lg mr-2 mt-0.5 flex-shrink-0 flex items-center justify-center"
                style={{ background: "var(--primary-muted)", border: "1px solid var(--border-accent-faint)" }}>
                <Brain size={9} style={{ color: "var(--primary)" }} />
              </div>
            )}
            <div className="max-w-[82%] px-3 py-2 rounded-xl"
              style={{
                background: m.role === "user"
                  ? "var(--bg-accent-gradient)"
                  : "var(--border-muted)",
                border: m.role === "user"
                  ? "1px solid var(--border-accent-faint)"
                  : "1px solid var(--border-faint)",
              }}>
              <p className="text-[10.5px] leading-relaxed"
                style={{
                  color: m.role === "user" ? "var(--text-accent)" : "var(--th-text-secondary)",
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                }}>
                {m.text.replace(/\*\*(.*?)\*\*/g, (_, inner) => inner)}
              </p>
            </div>
          </motion.div>
        ))}

        {typing && (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg flex-shrink-0 flex items-center justify-center"
              style={{ background: "var(--primary-muted)", border: "1px solid var(--border-accent-faint)" }}>
              <Brain size={9} style={{ color: "var(--primary)" }} />
            </div>
            <div className="px-3 py-2 rounded-xl" style={{ background: "var(--border-muted)", border: "1px solid var(--border-faint)" }}>
              <div className="flex items-center gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div key={i}
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--border-accent)" }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => { setInput(s); }}
              className="px-2.5 py-1 rounded-lg text-[8.5px] font-mono transition-all"
              style={{
                background: "var(--bg-accent-faint)",
                border: "1px solid var(--border-accent-faint)",
                color: "var(--border-accent)",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--primary-muted)")}
              onMouseLeave={e => (e.currentTarget.style.background = "var(--bg-accent-faint)")}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: "var(--border-muted)", border: "1px solid var(--border)" }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about your portfolio..."
            className="flex-1 bg-transparent outline-none text-[11px] font-mono"
            style={{ color: "var(--th-text-soft)", caretColor: "var(--primary)" }}
          />
          <button onClick={send}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
            style={{
              background: input.trim() ? "var(--bg-accent-faint)" : "transparent",
              border: `1px solid ${input.trim() ? "var(--border-accent-faint)" : "transparent"}`,
              color: input.trim() ? "var(--primary)" : "var(--th-text-ultra-faint)",
            }}>
            <Send size={10} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AI DIMENSION BARS (for Intelligence tab)
═══════════════════════════════════════════════════════════════════════════ */

export function DimensionBars({ dims, color }: { dims: PortfolioDimensions; color: string }) {
  const entries: [string, number][] = [
    ["Quality",       dims.quality],
    ["Momentum",      dims.momentum],
    ["Stability",     dims.stability],
    ["Diversif.",     dims.diversification],
    ["Growth",        dims.growth],
    ["Defense",       dims.defense],
  ];

  return (
    <div className="space-y-2">
      {entries.map(([label, val]) => {
        const barColor = val >= 70 ? "var(--success)" : val >= 45 ? "var(--primary)" : val >= 25 ? "#FF8C42" : "var(--danger)";
        return (
          <div key={label}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] font-mono" style={{ color: "var(--th-text-dim)" }}>{label}</span>
              <span className="text-[9px] font-mono font-bold" style={{ color: barColor }}>{val}</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden"
              style={{ background: "var(--border-muted)" }}>
              <motion.div className="h-full rounded-full"
                initial={{ width: 0 }} animate={{ width: `${val}%` }}
                transition={{ duration: 0.9 }}
                style={{ background: barColor }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTOR INTELLIGENCE PANEL
═══════════════════════════════════════════════════════════════════════════ */

const RISK_COLOR: Record<string, string> = {
  LOW: "var(--success)", MODERATE: "var(--primary)", HIGH: "#FF8C42", EXTREME: "var(--danger)",
};
const SECTOR_EMOJI: Record<string, string> = {
  IT: "💻", Banking: "🏦", "Financial Services": "💰",
  Energy: "⚡", Power: "🔋", Defense: "🛡️",
  FMCG: "🛒", Auto: "🚗", Pharma: "💊",
  Healthcare: "🏥", Metals: "⛏️", Telecom: "📡",
  Infra: "🏗️", "Real Estate": "🏘️", Chemicals: "🧪",
  Consumer: "🛍️", ETF: "📊", Other: "📦",
};

function PremiumSectorDonut({
  sectors, hovered, onHover,
}: {
  sectors: EnrichedSectorData[];
  hovered: string | null;
  onHover: (label: string | null) => void;
}) {
  const total = sectors.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const R = 64, CX = 84, CY = 84, circ = 2 * Math.PI * R;
  let cumulative = 0;

  const segs = sectors.map(seg => {
    const pct   = seg.value / total;
    const start = cumulative;
    cumulative += pct;
    const dash   = pct * circ;
    const gap    = circ - dash;
    const offset = circ * (1 - start) - circ * 0.25;
    return { ...seg, pct, dash, gap, offset };
  });

  const hovSeg = hovered ? segs.find(s => s.label === hovered) : null;

  return (
    <svg width="168" height="168" style={{ overflow: "visible" }}>
      <defs>
        {segs.map(s => (
          <filter key={`glow-${s.label}`} id={`glow-${s.label.replace(/\s/g, "")}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={hovered === s.label ? "4" : "2"} result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        ))}
      </defs>

      {/* Track */}
      <circle cx={CX} cy={CY} r={R} fill="none"
        stroke="var(--border-muted)" strokeWidth="18" />

      {/* Segments */}
      {segs.map((seg, i) => {
        const isHov = hovered === seg.label;
        return (
          <motion.circle key={seg.label} cx={CX} cy={CY} r={R}
            fill="none" stroke={seg.color}
            strokeWidth={isHov ? 20 : 16}
            strokeLinecap="butt"
            strokeDasharray={`${seg.dash} ${seg.gap}`}
            strokeDashoffset={seg.offset}
            initial={{ strokeDasharray: "0 10000" }}
            animate={{ strokeDasharray: `${seg.dash} ${seg.gap}` }}
            transition={{ duration: 1, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            style={{
              filter: `drop-shadow(0 0 ${isHov ? 10 : 4}px ${seg.color}${isHov ? "cc" : "50"})`,
              cursor: "pointer",
              transition: "stroke-width 0.2s, filter 0.2s",
            }}
            onMouseEnter={() => onHover(seg.label)}
            onMouseLeave={() => onHover(null)}
          />
        );
      })}

      {/* Center content */}
      {hovSeg ? (
        <>
          <text x={CX} y={CY - 12} textAnchor="middle"
            fill={hovSeg.color} fontSize="18" fontWeight="bold" fontFamily="monospace">
            {hovSeg.value.toFixed(0)}%
          </text>
          <text x={CX} y={CY + 5} textAnchor="middle"
            fill={hovSeg.color} fontSize="8.5" fontFamily="monospace" opacity="0.85">
            {hovSeg.label}
          </text>
          <text x={CX} y={CY + 19} textAnchor="middle"
            fill="var(--th-text-faint)" fontSize="7.5" fontFamily="monospace">
            {hovSeg.holdingCount}h
          </text>
        </>
      ) : (
        <>
          <text x={CX} y={CY - 6} textAnchor="middle"
            fill="var(--th-text-primary)" fontSize="20" fontWeight="bold" fontFamily="monospace">
            {sectors.length}
          </text>
          <text x={CX} y={CY + 11} textAnchor="middle"
            fill="var(--th-text-faint)" fontSize="7.5" fontFamily="monospace" letterSpacing="1.5">
            SECTORS
          </text>
        </>
      )}
    </svg>
  );
}

function SectorHeatmap({ sectors }: { sectors: EnrichedSectorData[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", minHeight: "80px" }}>
      {sectors.map(s => {
        const isHov = hovered === s.label;
        return (
          <motion.div key={s.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              flex:           `${Math.max(s.value, 6)} 0 ${Math.max(60, s.value * 3.8)}px`,
              background:     `${s.color}18`,
              border:         `1px solid ${s.color}${isHov ? "70" : "30"}`,
              borderRadius:   "7px",
              padding:        "7px 6px",
              minHeight:      "58px",
              display:        "flex",
              flexDirection:  "column",
              justifyContent: "space-between",
              cursor:         "default",
              transition:     "box-shadow 0.2s",
              boxShadow:      isHov ? `0 0 16px ${s.color}30` : "none",
            }}
            onMouseEnter={() => setHovered(s.label)}
            onMouseLeave={() => setHovered(null)}>
            <div style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 700, color: s.color, letterSpacing: "0.05em" }}>
              {SECTOR_EMOJI[s.label] || "◆"} {s.label}
            </div>
            <div>
              <div style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: 700, color: s.color }}>
                {s.value.toFixed(0)}%
              </div>
              <div style={{ fontSize: "7px", fontFamily: "monospace", color: "var(--th-text-faint)" }}>
                {s.holdingCount} holding{s.holdingCount !== 1 ? "s" : ""}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function SectorIntelligencePanel({
  sectorData, totalValue,
}: {
  sectorData:  EnrichedSectorData[];
  totalValue:  number;
}) {
  const [hovered,  setHovered]  = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "heatmap">("cards");

  const narrative    = useMemo(() => generateSectorNarrative(sectorData), [sectorData]);
  const hoveredSector = sectorData.find(s => s.label === hovered) ?? null;

  if (sectorData.length === 0) {
    return (
      <div className="text-center py-8 text-[10px] font-mono"
        style={{ color: "var(--th-text-ultra-faint)" }}>
        Add holdings to unlock sector intelligence
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* AI Narrative */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="p-3 rounded-xl"
        style={{ background: "var(--primary-muted)", border: "1px solid var(--border-accent-faint)" }}>
        <div className="flex items-center gap-2 mb-1.5">
          <Brain size={9} style={{ color: "var(--primary)" }} />
          <span className="text-[8px] font-mono uppercase tracking-widest"
            style={{ color: "var(--border-accent)" }}>AI Sector Intelligence</span>
        </div>
        <p className="text-[10.5px] font-mono leading-relaxed"
          style={{ color: "var(--th-text-secondary)" }}>
          {narrative}
        </p>
      </motion.div>

      {/* Donut + active sector detail */}
      <div className="flex gap-4 items-center">
        <div className="flex-shrink-0">
          <PremiumSectorDonut
            sectors={sectorData}
            hovered={hovered}
            onHover={setHovered}
          />
        </div>
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {hoveredSector ? (
              <motion.div key={hoveredSector.label}
                initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[16px]">{SECTOR_EMOJI[hoveredSector.label] || "◆"}</span>
                  <div>
                    <div className="text-[12px] font-bold font-mono"
                      style={{ color: hoveredSector.color }}>{hoveredSector.label}</div>
                    <div className="text-[8px] font-mono" style={{ color: "var(--th-text-faint)" }}>
                      {hoveredSector.holdingCount} holding{hoveredSector.holdingCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="ml-auto px-1.5 py-0.5 rounded text-[7.5px] font-mono font-bold"
                    style={{ background: `${RISK_COLOR[hoveredSector.riskLevel]}15`,
                      border: `1px solid ${RISK_COLOR[hoveredSector.riskLevel]}35`,
                      color: RISK_COLOR[hoveredSector.riskLevel] }}>
                    {hoveredSector.riskLevel}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {[
                    { k: "Allocation",  v: `${hoveredSector.value.toFixed(1)}%`, c: hoveredSector.color },
                    { k: "P&L",         v: `${hoveredSector.pnlPct >= 0 ? "+" : ""}${hoveredSector.pnlPct.toFixed(1)}%`, c: hoveredSector.pnlPct >= 0 ? "var(--success)" : "var(--danger)" },
                    { k: "Invested",    v: fmtVal(hoveredSector.investedValue), c: "var(--border)" },
                    { k: "Current",     v: fmtVal(hoveredSector.currentValue),  c: "var(--th-text-soft)" },
                  ].map(m => (
                    <div key={m.k} className="p-1.5 rounded-lg"
                      style={{ background: "var(--border-muted)", border: "1px solid var(--border-faint)" }}>
                      <div className="text-[7.5px] font-mono uppercase mb-0.5"
                        style={{ color: "var(--th-text-faint)" }}>{m.k}</div>
                      <div className="text-[11px] font-mono font-bold" style={{ color: m.c }}>{m.v}</div>
                    </div>
                  ))}
                </div>
                <p className="text-[8.5px] font-mono leading-relaxed"
                  style={{ color: "var(--th-text-dim)" }}>
                  {getSectorInsight(hoveredSector.label, hoveredSector.value, hoveredSector.topHolding)}
                </p>
              </motion.div>
            ) : (
              <motion.div key="default"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-[8.5px] font-mono uppercase tracking-widest mb-2"
                  style={{ color: "rgba(255,255,255,0.25)" }}>Hover a segment for detail</div>
                <div className="space-y-1.5">
                  {sectorData.slice(0, 4).map(s => (
                    <div key={s.label} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                      <span className="text-[9px] font-mono flex-1 truncate"
                        style={{ color: "var(--th-text-muted)" }}>{s.label}</span>
                      <span className="text-[9px] font-mono font-bold"
                        style={{ color: s.color }}>{s.value.toFixed(1)}%</span>
                    </div>
                  ))}
                  {sectorData.length > 4 && (
                    <div className="text-[8px] font-mono"
                      style={{ color: "var(--th-text-ultra-faint)" }}>
                      +{sectorData.length - 4} more sectors
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* View toggle: Cards / Heatmap */}
      <div className="flex items-center gap-1 mb-2">
        {(["cards", "heatmap"] as const).map(v => (
          <button key={v} onClick={() => setViewMode(v)}
            className="px-2.5 py-1 rounded-lg text-[8.5px] font-mono uppercase transition-all"
            style={{
              background: viewMode === v ? "var(--primary-muted)" : "transparent",
              border: `1px solid ${viewMode === v ? "rgba(255,215,0,0.30)" : "var(--border-muted)"}`,
              color: viewMode === v ? "var(--primary)" : "var(--th-text-dim)",
            }}>
            {v === "cards" ? "▦ Cards" : "⬛ Heatmap"}
          </button>
        ))}
        <span className="ml-auto text-[8px] font-mono" style={{ color: "var(--th-text-ultra-faint)" }}>
          {sectorData.length} sector{sectorData.length !== 1 ? "s" : ""} detected
        </span>
      </div>

      {/* Sector cards or heatmap */}
      {viewMode === "heatmap" ? (
        <SectorHeatmap sectors={sectorData} />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {sectorData.map((s, i) => {
            const riskCol = RISK_COLOR[s.riskLevel];
            return (
              <motion.div key={s.label}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="p-3 rounded-xl cursor-default"
                style={{
                  background:  `${s.color}08`,
                  border:      `1px solid ${s.color}25`,
                  borderLeft:  `3px solid ${s.color}`,
                  transition:  "box-shadow 0.2s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 18px ${s.color}20`;
                  setHovered(s.label);
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  setHovered(null);
                }}>
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: "12px" }}>{SECTOR_EMOJI[s.label] || "◆"}</span>
                    <span className="text-[9.5px] font-mono font-bold truncate max-w-[70px]"
                      style={{ color: s.color }}>{s.label}</span>
                  </div>
                  <div className="px-1 py-0.5 rounded text-[6.5px] font-mono font-bold flex-shrink-0"
                    style={{ background: `${riskCol}15`, color: riskCol, border: `1px solid ${riskCol}25` }}>
                    {s.riskLevel}
                  </div>
                </div>

                {/* Animated bar */}
                <div className="h-1 rounded-full overflow-hidden mb-1.5"
                  style={{ background: "var(--border-muted)" }}>
                  <motion.div className="h-full rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${Math.min(s.value, 100)}%` }}
                    transition={{ duration: 0.9, delay: i * 0.05 }}
                    style={{ background: s.color, boxShadow: `0 0 6px ${s.color}60` }} />
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-mono font-bold" style={{ color: s.color }}>
                      {s.value.toFixed(1)}%
                    </div>
                    <div className="text-[7.5px] font-mono" style={{ color: "var(--th-text-faint)" }}>
                      {s.holdingCount}h · {fmtVal(s.currentValue)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono font-semibold"
                      style={{ color: s.pnlPct >= 0 ? "var(--success)" : "var(--danger)" }}>
                      {s.pnlPct >= 0 ? "+" : ""}{s.pnlPct.toFixed(1)}%
                    </div>
                    <div className="text-[7px] font-mono" style={{ color: "var(--th-text-ultra-faint)" }}>
                      sector P&L
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Sector impact analysis */}
      <div>
        <div className="text-[8.5px] font-mono uppercase tracking-widest mb-2"
          style={{ color: "var(--th-text-faint)" }}>
          Sector Impact Analysis — If sector falls 10%
        </div>
        <div className="space-y-1.5">
          {sectorData.map((s, i) => {
            const impact    = -(s.value / 100) * 10;
            const impactAbs = (totalValue * Math.abs(impact)) / 100;
            const col       = Math.abs(impact) >= 4 ? "var(--danger)" : Math.abs(impact) >= 2 ? "#FF8C42" : "var(--primary)";
            return (
              <motion.div key={s.label}
                initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}>
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-[9px] font-mono truncate" style={{ color: "var(--th-text-muted)" }}>
                      {s.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono font-bold" style={{ color: col }}>
                      {impact.toFixed(1)}%
                    </span>
                    <span className="text-[7.5px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
                      {impactAbs >= 100_000
                        ? `₹${(impactAbs / 100_000).toFixed(1)}L`
                        : `₹${impactAbs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
                    </span>
                  </div>
                </div>
                <div className="h-0.5 rounded-full overflow-hidden"
                  style={{ background: "var(--border-muted)" }}>
                  <motion.div className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.abs(impact) * 10)}%` }}
                    transition={{ duration: 0.7, delay: i * 0.05 }}
                    style={{ background: col }} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

    </div>
  );

  function fmtVal(n: number): string {
    if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
    if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
    return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  }
}
