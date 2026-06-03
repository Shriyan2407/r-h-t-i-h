"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Zap, AlertTriangle, MessageSquare, Send, X, Activity } from "lucide-react";
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
          stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
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
          stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
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
          fill="rgba(255,255,255,0.3)" fontSize="7.5" fontFamily="monospace" letterSpacing="2">
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
          stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      {/* Axis lines */}
      {RADAR_AXES.map(({ angle }, i) => {
        const p = pt(angle, 1);
        return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y}
          stroke="rgba(255,255,255,0.07)" strokeWidth="1" />;
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
            fill="rgba(255,255,255,0.45)" fontSize="8" fontFamily="monospace">
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
        const textCol = isPos ? "#00FF9C" : "#FF6B6B";

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
            <div style={{ fontSize: "9.5px", fontFamily: "monospace", fontWeight: 700, color: "rgba(255,255,255,0.88)", letterSpacing: "0.04em" }}>
              {h.ticker}
            </div>
            <div>
              <div style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 700, color: textCol }}>
                {h.pnlPct >= 0 ? "+" : ""}{h.pnlPct.toFixed(1)}%
              </div>
              <div style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.35)" }}>
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
        stroke="rgba(255,255,255,0.07)" strokeWidth="12" strokeLinecap="round" />
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
        fill="rgba(255,255,255,0.22)" fontSize="7" fontFamily="monospace">CALM</text>
      <text x={CX + R - 2} y={CY + 18} textAnchor="middle"
        fill="rgba(255,255,255,0.22)" fontSize="7" fontFamily="monospace">PANIC</text>
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
            style={{ color: "rgba(255,255,255,0.35)" }}>Portfolio DNA</div>
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
        style={{ color: "rgba(255,255,255,0.55)" }}>
        {dna.description}
      </p>
      <div className="space-y-1">
        {dna.behaviors.map((b, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className="mt-0.5 text-[8px]" style={{ color: dna.color }}>▸</span>
            <span className="text-[9px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{b}</span>
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
    convictionLabel === "BULLISH" ? "#00FF9C" :
    convictionLabel === "NEUTRAL" ? "#FFD700" :
    convictionLabel === "CAUTIOUS" ? "#FF8C42" : "#FF4D4D";

  const survivalTest = stressTests.find(s => s.scenario.includes("20%"));
  const survivalPct  = survivalTest ? 100 + survivalTest.portfolioImpactPct : 85;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden mb-4"
      style={{
        background: "var(--th-bg-card)",
        border:     "1px solid rgba(255,215,0,0.18)",
        boxShadow:  "0 0 40px rgba(255,215,0,0.05), 0 8px 32px rgba(0,0,0,0.4)",
      }}>

      {/* Header bar */}
      <div className="flex items-center gap-2.5 px-5 py-2.5"
        style={{ borderBottom: "1px solid rgba(255,215,0,0.10)", background: "rgba(255,215,0,0.03)" }}>
        <Brain size={12} style={{ color: "#FFD700" }} />
        <span className="text-[9px] font-mono uppercase tracking-[0.22em]"
          style={{ color: "rgba(255,215,0,0.7)" }}>
          AI Intelligence Command Center
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0">

        {/* AI Verdict */}
        <div className="p-5" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.25)" }}>
              <Brain size={10} style={{ color: "#FFD700" }} />
            </div>
            <span className="text-[8.5px] font-mono uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.35)" }}>AI Portfolio Verdict</span>
            <div className="ml-auto px-2 py-0.5 rounded text-[8px] font-mono font-bold"
              style={{ background: `${convictionColor}18`, border: `1px solid ${convictionColor}30`, color: convictionColor }}>
              {convictionLabel}
            </div>
          </div>
          <p className="text-[11px] leading-relaxed"
            style={{ color: "rgba(255,255,255,0.72)", fontFamily: "monospace" }}>
            {narrative}
          </p>
          {holdings.length > 0 && (
            <div className="mt-3 flex items-center gap-3 text-[9px] font-mono"
              style={{ color: "rgba(255,255,255,0.3)" }}>
              <span>β {metrics.beta.toFixed(2)}</span>
              <span>·</span>
              <span>Sharpe {metrics.sharpe.toFixed(2)}</span>
              <span>·</span>
              <span>{metrics.gainers}W / {metrics.losers}L</span>
            </div>
          )}
        </div>

        {/* Portfolio DNA */}
        <div className="p-5" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[14px]">{dna.emoji}</span>
            <div>
              <div className="text-[8.5px] font-mono uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.35)" }}>Portfolio DNA</div>
              <div className="text-[13px] font-bold font-mono" style={{ color: dna.color }}>
                {dna.label}
              </div>
            </div>
            <div className="ml-auto px-2 py-0.5 rounded text-[7.5px] font-mono font-bold"
              style={{ background: `${dna.color}18`, border: `1px solid ${dna.color}30`, color: dna.color }}>
              {dna.riskTemperament}
            </div>
          </div>
          <p className="text-[10px] leading-relaxed mb-2.5"
            style={{ color: "rgba(255,255,255,0.55)", fontFamily: "monospace" }}>
            {dna.description}
          </p>
          <div className="space-y-1">
            {dna.behaviors.map((b, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-[8px] mt-0.5" style={{ color: dna.color }}>▸</span>
                <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.42)" }}>{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Survival Meter */}
        <div className="p-5">
          <div className="text-[8.5px] font-mono uppercase tracking-widest mb-3"
            style={{ color: "rgba(255,255,255,0.35)" }}>Portfolio Survival</div>

          {/* Fear gauge */}
          <div className="flex justify-center mb-1">
            <FearGauge score={fearScore} />
          </div>
          <div className="text-[8.5px] font-mono text-center mb-3"
            style={{ color: "rgba(255,255,255,0.28)" }}>Fear Exposure Score</div>

          {/* Survival in crash */}
          {survivalTest && (
            <div className="p-2.5 rounded-lg"
              style={{
                background: survivalPct < 75 ? "rgba(255,77,77,0.08)" : "rgba(0,255,156,0.06)",
                border: `1px solid ${survivalPct < 75 ? "rgba(255,77,77,0.18)" : "rgba(0,255,156,0.15)"}`,
              }}>
              <div className="text-[8px] font-mono uppercase mb-1"
                style={{ color: "rgba(255,255,255,0.3)" }}>If NIFTY −20% crash</div>
              <div className="text-[14px] font-bold font-mono"
                style={{ color: survivalPct < 75 ? "#FF4D4D" : "#00FF9C" }}>
                {survivalTest.portfolioImpactPct.toFixed(1)}% estimated damage
              </div>
              <div className="text-[8.5px] font-mono mt-0.5"
                style={{ color: "rgba(255,255,255,0.35)" }}>
                Severity: <span style={{ color: survivalTest.severity === "CRITICAL" ? "#FF4D4D" : "#FFD700" }}>
                  {survivalTest.severity}
                </span>
              </div>
            </div>
          )}
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
    SAFE: "#00FF9C", CAUTION: "#FFD700", WARNING: "#FF8C42", CRITICAL: "#FF4D4D",
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
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.55)" }}>
                {t.icon} {t.scenario}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold" style={{ color: col }}>
                  {t.portfolioImpactPct.toFixed(1)}%
                </span>
                <span className="text-[7.5px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {fmtAbs(t.portfolioImpactAbs)}
                </span>
              </div>
            </div>
            <div className="h-1 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.05)" }}>
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
      style={{ color: "rgba(255,255,255,0.2)" }}>No holdings yet</div>;
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
            className="flex items-center gap-2 py-1.5 border-b last:border-0"
            style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {/* Action badge */}
            <div className="px-1.5 py-0.5 rounded text-[7.5px] font-mono font-bold w-12 text-center flex-shrink-0"
              style={{ background: act.bg, border: `1px solid ${act.color}30`, color: act.color }}>
              {act.action}
            </div>
            {/* Ticker */}
            <span className="text-[10px] font-mono font-bold flex-1"
              style={{ color: "rgba(255,255,255,0.82)" }}>
              {h.ticker}
            </span>
            {/* P&L */}
            <span className="text-[9px] font-mono font-semibold"
              style={{ color: isPos ? "#00FF9C" : "#FF4D4D" }}>
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
        border:      "1px solid rgba(255,215,0,0.16)",
        boxShadow:   "0 0 40px rgba(255,215,0,0.04)",
      }}>

      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3"
        style={{ borderBottom: "1px solid rgba(255,215,0,0.08)", background: "rgba(255,215,0,0.02)" }}>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.25)" }}>
          <MessageSquare size={11} style={{ color: "#FFD700" }} />
        </div>
        <span className="text-[9px] font-mono uppercase tracking-[0.2em]"
          style={{ color: "rgba(255,215,0,0.65)" }}>AI Portfolio Advisor</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>ONLINE</span>
          <button onClick={onClose} className="ml-2 p-1 rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.3)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
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
                style={{ background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.25)" }}>
                <Brain size={9} style={{ color: "#FFD700" }} />
              </div>
            )}
            <div className="max-w-[82%] px-3 py-2 rounded-xl"
              style={{
                background: m.role === "user"
                  ? "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(201,162,39,0.10))"
                  : "rgba(255,255,255,0.04)",
                border: m.role === "user"
                  ? "1px solid rgba(255,215,0,0.25)"
                  : "1px solid rgba(255,255,255,0.07)",
              }}>
              <p className="text-[10.5px] leading-relaxed"
                style={{
                  color: m.role === "user" ? "rgba(255,215,0,0.9)" : "rgba(255,255,255,0.75)",
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
              style={{ background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.25)" }}>
              <Brain size={9} style={{ color: "#FFD700" }} />
            </div>
            <div className="px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div key={i}
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "rgba(255,215,0,0.5)" }} />
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
                background: "rgba(255,215,0,0.06)",
                border: "1px solid rgba(255,215,0,0.18)",
                color: "rgba(255,215,0,0.65)",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,215,0,0.12)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,215,0,0.06)")}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about your portfolio..."
            className="flex-1 bg-transparent outline-none text-[11px] font-mono"
            style={{ color: "rgba(255,255,255,0.8)", caretColor: "#FFD700" }}
          />
          <button onClick={send}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
            style={{
              background: input.trim() ? "rgba(255,215,0,0.18)" : "transparent",
              border: `1px solid ${input.trim() ? "rgba(255,215,0,0.35)" : "transparent"}`,
              color: input.trim() ? "#FFD700" : "rgba(255,255,255,0.2)",
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
        const barColor = val >= 70 ? "#00FF9C" : val >= 45 ? "#FFD700" : val >= 25 ? "#FF8C42" : "#FF4D4D";
        return (
          <div key={label}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</span>
              <span className="text-[9px] font-mono font-bold" style={{ color: barColor }}>{val}</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.05)" }}>
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
