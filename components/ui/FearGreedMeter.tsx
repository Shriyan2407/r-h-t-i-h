"use client";

/**
 * R.H.T.I.H — Institutional Fear & Greed Meter
 *
 * Geometry: perfect donut-arc semicircle
 *   • score 0   → angle 180° → left   endpoint (cx − R, cy)
 *   • score 50  → angle  90° → apex   point     (cx,     cy − R)
 *   • score 100 → angle   0° → right  endpoint  (cx + R, cy)
 *
 * Arc sweep convention (verified):
 *   outer arc: sweep=1 (CW in SVG) → travels left→top→right ✓
 *   inner arc: sweep=0 (CCW)       → returns  right→top→left ✓
 */

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence }       from "framer-motion";

/* ── Geometry constants ─────────────────────────────────── */
const W        = 280;     // SVG viewBox width
const H        = 164;     // SVG viewBox height
const CX       = W / 2;   // 140  – horizontal centre
const CY       = H - 16;  // 148  – arc baseline (bottom of the donut)
const R_OUTER  = 112;     // outer arc radius
const R_INNER  =  68;     // inner arc radius  → donut thickness = 44
const R_TRACK  = 117;     // faint background ring
const N_LEN    =  64;     // needle length (tip at CY − N_LEN from centre)
const HUB_R    =   9;     // pivot-hub radius
const SEG_GAP  =   1.8;   // score-unit gap on each side of every segment

/* ── Segment palette — muted, premium, not neon ─────────── */
type Seg = { from:number; to:number; label:string; col:string; dimCol:string; glow:string };

const SEGS: Seg[] = [
  { from:  0, to: 20, label:"Extreme Fear", col:"var(--danger)", dimCol:"var(--danger-muted)",  glow:"var(--danger)"  },
  { from: 20, to: 40, label:"Fear",          col:"#FF7A00", dimCol:"rgba(255,122,0,0.18)", glow:"#FF7A00" },
  { from: 40, to: 60, label:"Neutral",       col:"var(--warning)", dimCol:"var(--warning-muted)", glow:"var(--warning)" },
  { from: 60, to: 80, label:"Greed",         col:"#34D399", dimCol:"rgba(52,211,153,0.18)",  glow:"#34D399"  },
  { from: 80, to:100, label:"Extreme Greed", col:"var(--success)", dimCol:"var(--success-muted)",  glow:"var(--success)"  },
] as const;

/* ── Core geometry helpers ──────────────────────────────── */

/** SVG point on a circle at score s (0-100) and radius r */
function arcPt(s: number, r: number): [number, number] {
  const θ = Math.PI * (1 - s / 100);
  return [CX + r * Math.cos(θ), CY - r * Math.sin(θ)];
}

/** SVG path for a donut arc segment (verified: sweep=1 outer, sweep=0 inner) */
function donutArc(
  s1: number, s2: number,
  rOut: number, rIn: number,
  gap = SEG_GAP,
): string {
  const a = s1 + gap, b = s2 - gap;
  if (a >= b) return "";
  const f = (n: number) => n.toFixed(3);
  const [x1o, y1o] = arcPt(a, rOut), [x2o, y2o] = arcPt(b, rOut);
  const [x1i, y1i] = arcPt(a, rIn),  [x2i, y2i] = arcPt(b, rIn);
  const la = (b - a) > 50 ? 1 : 0;
  return [
    `M ${f(x1o)} ${f(y1o)}`,
    `A ${rOut} ${rOut} 0 ${la} 1 ${f(x2o)} ${f(y2o)}`,  // outer → sweep=1
    `L ${f(x2i)} ${f(y2i)}`,
    `A ${rIn}  ${rIn}  0 ${la} 0 ${f(x1i)} ${f(y1i)}`,  // inner ← sweep=0
    `Z`,
  ].join(" ");
}

/* ── Component ──────────────────────────────────────────── */

export interface FearGreedMeterProps {
  value:        number;   // 0-100
  confidence?:  number;   // optional AI confidence, 0-100
  label?:       string;   // override state label
  animate?:     boolean;  // default true
}

export function FearGreedMeter({
  value,
  confidence,
  label,
  animate = true,
}: FearGreedMeterProps) {
  const v   = Math.max(0, Math.min(100, Math.round(value)));
  const seg = SEGS.find(s => v >= s.from && (v < s.to || s.to === 100)) ?? SEGS[2];

  /* Needle rotation:
     v=0   → rotate=−90° → points LEFT
     v=50  → rotate=  0° → points UP
     v=100 → rotate= +90° → points RIGHT                */
  const nRot = v * 1.8 - 90;

  /* Stable tick-mark coordinates (never change) */
  const ticks = useMemo(() => [0, 25, 50, 75, 100].map(s => {
    const [xi, yi] = arcPt(s, R_OUTER + 3);
    const [xo, yo] = arcPt(s, R_OUTER + 9);
    return { xi, yi, xo, yo, major: s === 0 || s === 50 || s === 100 };
  }), []);

  /* Static paths computed once */
  const bgPath = useMemo(
    () => donutArc(0, 100, R_TRACK, R_INNER - 2, 0),
    [],
  );

  return (
    <div className="relative flex flex-col items-center w-full select-none" style={{ maxWidth:"272px", margin:"0 auto" }}>

      {/* ─── SVG Gauge ────────────────────────────────────── */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        aria-label={`Fear and Greed: ${v} — ${label ?? seg.label}`}
        style={{ overflow:"visible", display:"block" }}
      >
        <defs>
          {/* Metallic hub gradient */}
          <radialGradient id="fgm-hub" cx="36%" cy="28%" r="70%">
            <stop offset="0%"   stopColor="#FFF176"/>
            <stop offset="38%"  stopColor="var(--gold)"/>
            <stop offset="100%" stopColor="#5A3E00"/>
          </radialGradient>

          {/* Needle body gradient (tapered, white → grey) */}
          <linearGradient id="fgm-needle" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--th-text-primary)"/>
            <stop offset="65%"  stopColor="var(--th-text-muted)"/>
            <stop offset="100%" stopColor="var(--th-text-faint)"/>
          </linearGradient>

          {/* Active segment inner glow */}
          <filter id="fgm-seg-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* ① Faint full-range background ring */}
        <path d={bgPath} fill="var(--border-muted)"/>

        {/* ② All segment tracks — uniformly dimmed */}
        {SEGS.map(s => (
          <path key={s.from} d={donutArc(s.from, s.to, R_OUTER, R_INNER)} fill={s.dimCol}/>
        ))}

        {/* ③ Active segment — elevated, bright, double-glow */}
        <motion.path
          key={seg.from}
          d={donutArc(seg.from, seg.to, R_OUTER + 5, R_INNER - 5)}
          fill={seg.col}
          initial={{ opacity: 0.3 }}
          animate={{ opacity: 1  }}
          transition={{ duration: 0.4 }}
          style={{
            filter: [
              `drop-shadow(0 0  6px ${seg.glow})`,
              `drop-shadow(0 0 16px ${seg.glow})`,
            ].join(" "),
          }}
        />

        {/* ④ Hairline segment dividers (subtle depth) */}
        {[20, 40, 60, 80].map(s => {
          const [x1, y1] = arcPt(s, R_INNER - 1);
          const [x2, y2] = arcPt(s, R_OUTER + 1);
          return (
            <line key={s}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(0,0,0,0.55)" strokeWidth="0.6"
            />
          );
        })}

        {/* ⑤ Tick marks at 0 / 25 / 50 / 75 / 100 */}
        {ticks.map(t => (
          <line key={t.xi}
            x1={t.xi} y1={t.yi} x2={t.xo} y2={t.yo}
            stroke={t.major ? "var(--th-text-faint)" : "var(--border)"}
            strokeWidth={t.major ? 1.5 : 1}
            strokeLinecap="round"
          />
        ))}

        {/* ⑥ Needle — rotated around (CX, CY) via CSS transform-origin */}
        <motion.g
          style={{ transformOrigin: `${CX}px ${CY}px` }}
          initial={animate ? { rotate: 50 * 1.8 - 90 } : { rotate: nRot }}
          animate={{ rotate: nRot }}
          transition={{
            type:      "spring",
            stiffness: 44,
            damping:   13,
            restDelta: 0.005,
          }}
        >
          {/* Drop-shadow behind needle */}
          <line
            x1={CX} y1={CY + 3}
            x2={CX} y2={CY - N_LEN + 6}
            stroke="rgba(0,0,0,0.42)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Needle body — tapered triangle */}
          <polygon
            points={`
              ${(CX - 2.2).toFixed(2)},${(CY + 5).toFixed(2)}
              ${(CX + 2.2).toFixed(2)},${(CY + 5).toFixed(2)}
              ${CX.toFixed(2)},${(CY - N_LEN).toFixed(2)}
            `}
            fill="url(#fgm-needle)"
            style={{ filter: "drop-shadow(0 0 1.5px rgba(255,255,255,0.22))" }}
          />
          {/* Coloured tip — glows in the active-segment colour */}
          <line
            x1={CX} y1={CY - N_LEN + 16}
            x2={CX} y2={CY - N_LEN}
            stroke={seg.col}
            strokeWidth="2.2"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 5px ${seg.col})` }}
          />
        </motion.g>

        {/* ⑦ Hub pivot — layered for 3-D depth */}
        {/* Outer shadow disc */}
        <circle cx={CX} cy={CY} r={HUB_R + 5}
          fill="var(--th-bg-card)"
          style={{ filter: "drop-shadow(0 3px 6px var(--shadow-sm))" }}
        />
        {/* Metallic gold hub */}
        <circle cx={CX} cy={CY} r={HUB_R}
          fill="url(#fgm-hub)"
          style={{ filter: "drop-shadow(0 0 7px var(--primary-muted))" }}
        />
        {/* Specular shine highlight */}
        <ellipse cx={CX - 3} cy={CY - 3} rx={3} ry={2.2}
          fill="var(--th-text-dim)"
        />
        {/* Centre dot */}
        <circle cx={CX} cy={CY} r={1.8} fill="var(--th-text-secondary)"/>

        {/* ⑧ Score integer — dominant inside the donut */}
        <text
          x={CX}
          y={CY - 24}
          textAnchor="middle"
          fontFamily="'JetBrains Mono', 'Courier New', monospace"
          fontSize="30"
          fontWeight="800"
          fill={seg.col}
          style={{
            filter: `drop-shadow(0 0 10px ${seg.glow})`,
            letterSpacing: "-1px",
          }}
        >
          {v}
        </text>

        {/* ⑨ State label — compact, mono, tracking */}
        <text
          x={CX}
          y={CY - 7}
          textAnchor="middle"
          fontFamily="'JetBrains Mono', 'Courier New', monospace"
          fontSize="7.5"
          letterSpacing="2.2"
          fill={seg.col}
          opacity="0.60"
        >
          {(label ?? seg.label).toUpperCase()}
        </text>
      </svg>

      {/* ─── Scale labels (HTML — better typography) ──────── */}
      <div className="flex justify-between w-full" style={{ marginTop:"-3px" }}>
        <span className="text-[7px] font-mono tracking-wider"
          style={{ color:"var(--danger)" }}>
          FEAR
        </span>
        <span className="text-[7px] font-mono tracking-wider"
          style={{ color:"var(--warning)" }}>
          NEUTRAL
        </span>
        <span className="text-[7px] font-mono tracking-wider"
          style={{ color:"var(--success)" }}>
          GREED
        </span>
      </div>

      {/* ─── Optional AI confidence bar ───────────────────── */}
      {confidence !== undefined && (
        <div className="w-full mt-3.5">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[8px] font-mono uppercase tracking-wider"
              style={{ color:"var(--th-text-ultra-faint)" }}>
              AI Confidence
            </span>
            <span className="text-[10px] font-mono font-bold"
              style={{ color: seg.col }}>
              {confidence}%
            </span>
          </div>
          {/* Track */}
          <div className="h-[3px] rounded-full overflow-hidden"
            style={{ background:"var(--border-muted)" }}>
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${confidence}%` }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: seg.col,
                boxShadow:  `0 0 5px ${seg.glow}`,
              }}
            />
          </div>
          {/* Segment labels on bar */}
          <div className="flex justify-between mt-1">
            {["0", "25", "50", "75", "100"].map(n => (
              <span key={n} className="text-[6.5px] font-mono"
                style={{ color:"#1A1A1A" }}>
                {n}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Convenience re-export with live fluctuation built in ── */
export function LiveFearGreedMeter({
  initialValue = 62,
  confidence,
}: {
  initialValue?: number;
  confidence?:   number;
}) {
  const [val, setVal] = useState(initialValue);

  useEffect(() => {
    const id = setInterval(() => {
      setVal(v => Math.max(18, Math.min(88, v + (Math.random() - 0.5) * 2.8)));
    }, 4200);
    return () => clearInterval(id);
  }, []);

  return <FearGreedMeter value={Math.round(val)} confidence={confidence}/>;
}
