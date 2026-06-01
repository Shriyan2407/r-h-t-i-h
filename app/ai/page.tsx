"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Brain, Activity, TrendingUp, Shield, Globe, Zap,
  BarChart2, Target, Eye, Cpu, Radio, Layers,
  ArrowRight,
} from "lucide-react";
import { Navbar }       from "@/components/Navbar";
import { MarketTicker } from "@/components/MarketTicker";
import { SearchBar }    from "@/components/SearchBar";

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STATIC DATA
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const QUERIES = [
  "Analyze RELIANCE accumulation structure",
  "Compare HDFCBANK vs ICICIBANK institutional strength",
  "Detect smart money behavior in PSU banks",
  "Identify weak momentum sectors across Nifty 50",
  "NIFTY market regime â€” risk-on or risk-off?",
  "Institutional positioning in IT sector this quarter",
  "BHARTIARTL swing setup â€” risk/reward analysis",
  "Macro risk for banking sector â€” Q3 outlook",
  "FII/DII divergence â€” who is accumulating right now?",
  "ADANIENT â€” operator move or genuine breakout?",
];

const MODULES = [
  {
    icon: Activity,
    title: "Technical Structure",
    desc: "Multi-timeframe trend analysis, support/resistance mapping, breakout detection, and volume confirmation across the NSE/BSE universe.",
    color: "var(--gold)",
    tag: "CORE",
  },
  {
    icon: Eye,
    title: "Smart Money Signals",
    desc: "Institutional accumulation detection, distribution phases, stop-hunt identification, and operator behavior â€” decoded in real time.",
    color: "var(--positive)",
    tag: "ALPHA",
  },
  {
    icon: Globe,
    title: "Macro Pulse",
    desc: "RBI policy transmission, inflation trajectory, crude oil sensitivity, USD/INR impact, and FII/DII flow dynamics â€” integrated.",
    color: "var(--th-blue)",
    tag: "MACRO",
  },
  {
    icon: TrendingUp,
    title: "Sector Rotation Engine",
    desc: "Capital flow detection across 11 NSE sectors. Identifies rotation timing, leadership shifts, and laggard deterioration.",
    color: "var(--th-blue)",
    tag: "FLOW",
  },
  {
    icon: Shield,
    title: "Risk Intelligence",
    desc: "Downside quantification, invalidation level mapping, event risk assessment, and volatility-weighted position analysis.",
    color: "var(--negative)",
    tag: "RISK",
  },
  {
    icon: BarChart2,
    title: "Institutional Flow",
    desc: "FII/DII disaggregated positioning, block deal analysis, delivery volume patterns, and institutional conviction mapping.",
    color: "var(--neutral)",
    tag: "INST",
  },
  {
    icon: Layers,
    title: "F&O Intelligence",
    desc: "OI buildup/unwinding, PCR analysis, Max Pain levels, options premium behavior, and expiry positioning dynamics.",
    color: "#FB923C",
    tag: "F&O",
  },
  {
    icon: Zap,
    title: "Volatility Monitor",
    desc: "India VIX regime classification, ATR-based position sizing, options skew assessment, and volatility cycle positioning.",
    color: "#A78BFA",
    tag: "VIX",
  },
];

const DOCTRINE = [
  { roman: "I",   title: "EVERY STOCK IS DIFFERENT",    body: "Analysis adapts to sector context, market cap, cycle stage, and current momentum. No templates. No copy-paste." },
  { roman: "II",  title: "PROBABILITY OVER PREDICTION", body: "No false certainty. Every thesis carries weighted scenarios â€” bull, base, bear â€” with explicit probability bias." },
  { roman: "III", title: "SMART MONEY FIRST",           body: "What institutions are building or liquidating matters more than retail sentiment or financial media narrative." },
  { roman: "IV",  title: "MACRO CONTEXT ALWAYS",        body: "No stock exists in isolation. RBI, FII flows, crude oil, and global liquidity are always part of the equation." },
  { roman: "V",   title: "RISK BEFORE REWARD",          body: "Every opportunity is presented with its invalidation level, downside scenario, and maximum acceptable loss." },
  { roman: "VI",  title: "STRUCTURED HONESTY",          body: "Red flags are called out. Fake breakouts are named. Overvaluation is stated plainly. No cheerleading. No hype." },
];

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   BACKGROUND LAYER
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function GoldParticles({ count = 32 }: { count?: number }) {
  const ps = Array.from({ length: count }, (_, i) => ({
    id: i,
    left:     `${(i * 3.1) % 100}%`,
    delay:    `${(i * 0.37) % 11}s`,
    duration: `${7 + (i * 0.61) % 8}s`,
    size:     i % 5 === 0 ? 2.5 : i % 8 === 0 ? 1.8 : 1.1,
    gold:     i % 6 !== 0,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {ps.map(p => (
        <div key={p.id} className="absolute bottom-0 rounded-full"
          style={{
            left: p.left, width: p.size, height: p.size, opacity: 0,
            background: p.gold ? "var(--gold)" : "var(--positive)",
            animation: `particleFloat ${p.duration} ${p.delay} ease-in infinite`,
          }}
        />
      ))}
    </div>
  );
}

function NeuralGrid() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{
      opacity: 0.022,
      backgroundImage: `
        linear-gradient(rgba(255,215,0,1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,215,0,1) 1px, transparent 1px)
      `,
      backgroundSize: "60px 60px",
      maskImage: "radial-gradient(ellipse 100% 100% at 50% 50%, black 10%, transparent 70%)",
      WebkitMaskImage: "radial-gradient(ellipse 100% 100% at 50% 50%, black 10%, transparent 70%)",
    }} />
  );
}

function GlowOrbs() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div style={{ position:"absolute", width:"800px", height:"400px", top:"-180px", left:"50%", transform:"translateX(-50%)", background:"radial-gradient(ellipse, rgba(255,215,0,0.055) 0%, transparent 65%)", filter:"blur(55px)", animation:"orb1 24s ease-in-out infinite" }} />
      <div style={{ position:"absolute", width:"400px", height:"400px", top:"20%", left:"0%", background:"radial-gradient(circle, rgba(0,255,156,0.025) 0%, transparent 60%)", filter:"blur(65px)", animation:"orb2 32s ease-in-out infinite" }} />
      <div style={{ position:"absolute", width:"300px", height:"300px", top:"30%", right:"5%", background:"radial-gradient(circle, rgba(56,189,248,0.025) 0%, transparent 60%)", filter:"blur(55px)", animation:"orb1 21s ease-in-out infinite reverse" }} />
    </div>
  );
}

function ScanLines() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{
      background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,215,0,0.005) 3px, rgba(255,215,0,0.005) 4px)",
      zIndex: 1,
    }} />
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TYPEWRITER TERMINAL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function TypewriterTerminal() {
  const [display,  setDisplay]  = useState("");
  const [qIdx,     setQIdx]     = useState(0);
  const [phase,    setPhase]    = useState<"typing"|"pause"|"deleting">("typing");
  const charPos = useRef(0);

  useEffect(() => {
    const current = QUERIES[qIdx];
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (phase === "typing") {
        if (charPos.current < current.length) {
          charPos.current++;
          setDisplay(current.slice(0, charPos.current));
          timer = setTimeout(tick, 38 + Math.random() * 28);
        } else {
          timer = setTimeout(() => setPhase("pause"), 2600);
        }
      } else if (phase === "pause") {
        timer = setTimeout(() => setPhase("deleting"), 350);
      } else {
        if (charPos.current > 0) {
          charPos.current--;
          setDisplay(current.slice(0, charPos.current));
          timer = setTimeout(tick, 16);
        } else {
          charPos.current = 0;
          setQIdx(i => (i + 1) % QUERIES.length);
          setPhase("typing");
        }
      }
    };

    timer = setTimeout(tick, 60);
    return () => clearTimeout(timer);
  }, [phase, qIdx]);

  const PREV_LINES = [
    { text: "NIFTY regime analysis complete â€” Risk-Off confirmed",    type: "ok"   },
    { text: "Institutional flow: PSU banks â€” 3 distribution signals", type: "warn" },
    { text: "Smart money divergence detected in IT sector",           type: "sig"  },
  ];

  return (
    <div className="rounded-2xl p-5 relative overflow-hidden h-full"
      style={{ background:"rgba(7,7,7,0.97)", border:"1px solid rgba(255,215,0,0.11)" }}>

      {/* Terminal chrome */}
      <div className="flex items-center gap-2 mb-4 pb-3"
        style={{ borderBottom:"1px solid var(--th-border-subtle)" }}>
        <div className="flex gap-1.5">
          {["var(--negative)","var(--neutral)","var(--positive)"].map(c => (
            <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background:c, opacity:0.8 }} />
          ))}
        </div>
        <span className="text-[8.5px] font-mono uppercase tracking-[0.18em] ml-2" style={{ color:"var(--th-text-ultra-faint)" }}>
          MARKET KA BAADSHAH Query Engine â€” v2.1
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00FF9C] animate-live-dot" />
          <span className="text-[8px] font-mono" style={{ color:"var(--positive)" }}>ONLINE</span>
        </div>
      </div>

      {/* Previous output lines */}
      <div className="space-y-1 mb-4">
        {PREV_LINES.map((ln, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-[8px] font-mono mt-0.5 flex-shrink-0" style={{ color:"var(--th-text-ultra-faint)" }}>
              {String(i + 1).padStart(3, "0")}
            </span>
            <span className="text-[9.5px] font-mono leading-relaxed" style={{
              color: ln.type === "sig" ? "var(--positive)" : ln.type === "warn" ? "var(--neutral)" : "var(--th-text-muted)"
            }}>
              {ln.type === "sig" ? "â–²" : ln.type === "warn" ? "âš¡" : "â—ˆ"} {ln.text}
            </span>
          </div>
        ))}
      </div>

      {/* Active query */}
      <div className="flex items-center gap-3 p-3 rounded-xl mb-4"
        style={{ background:"var(--th-gold-bg-hover)", border:"1px solid var(--th-border-card)" }}>
        <span className="text-[13px] font-mono font-bold flex-shrink-0" style={{ color:"var(--gold)" }}>â€º</span>
        <span className="text-[12.5px] font-mono flex-1" style={{ color:"var(--th-text-secondary)" }}>
          {display}
          <span className="animate-blink" style={{ color:"var(--gold)" }}>â–ˆ</span>
        </span>
      </div>

      {/* Query progress dots */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {QUERIES.map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-400"
              style={{
                width:  i === qIdx ? 16 : 4,
                height: 4,
                background: i === qIdx ? "var(--gold)" : "var(--th-border-normal)",
              }} />
          ))}
        </div>
        <span className="text-[8px] font-mono" style={{ color:"var(--th-text-ultra-faint)" }}>
          {qIdx + 1}/{QUERIES.length}
        </span>
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   NEURAL WAVE (animated SVG sine)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function NeuralWave() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 40);
    return () => clearInterval(id);
  }, []);

  const pts = Array.from({ length: 80 }, (_, i) => {
    const x = (i / 79) * 240;
    const y = 28
      + Math.sin((i / 79) * Math.PI * 3.5 + tick * 0.06) * 12
      + Math.sin((i / 79) * Math.PI * 7   + tick * 0.09) *  5
      + Math.sin((i / 79) * Math.PI * 1.8 + tick * 0.04) *  8;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <div className="rounded-xl p-3.5 relative overflow-hidden"
      style={{ background:"var(--th-bg-card)", border:"1px solid var(--th-border-card)" }}>
      <div className="flex items-center gap-1.5 mb-2">
        <Activity size={10} style={{ color:"var(--gold)" }} />
        <span className="text-[8.5px] font-mono uppercase tracking-wider" style={{ color:"var(--th-text-faint)" }}>Neural Activity</span>
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00FF9C] animate-live-dot" />
      </div>
      <svg width="100%" height="56" viewBox="0 0 240 56" preserveAspectRatio="none">
        <defs>
          <linearGradient id="wg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="rgba(255,215,0,0)" />
            <stop offset="15%"  stopColor="var(--gold)" />
            <stop offset="85%"  stopColor="var(--gold)" />
            <stop offset="100%" stopColor="rgba(255,215,0,0)" />
          </linearGradient>
        </defs>
        <polyline points={pts} fill="none" stroke="url(#wg)" strokeWidth="1.5"
          style={{ filter:"drop-shadow(0 0 4px rgba(255,215,0,0.45))" }} />
      </svg>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CONFIDENCE ARC
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function ConfidenceArc() {
  const [live, setLive] = useState(78);

  useEffect(() => {
    const id = setInterval(() => {
      setLive(v => Math.max(62, Math.min(94, v + (Math.random() - 0.5) * 2.4)));
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const R    = 36;
  const circ = 2 * Math.PI * R;
  const arc  = circ * 0.75;
  const fill = (live / 100) * arc;

  return (
    <div className="rounded-xl p-3.5 flex flex-col relative overflow-hidden"
      style={{ background:"var(--th-bg-card)", border:"1px solid var(--th-border-card)" }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Target size={10} style={{ color:"var(--gold)" }} />
        <span className="text-[8.5px] font-mono uppercase tracking-wider" style={{ color:"var(--th-text-faint)" }}>Confidence</span>
      </div>
      <div className="flex justify-center items-center flex-1 py-1">
        <svg width="86" height="86" viewBox="0 0 86 86">
          {/* Track */}
          <circle cx="43" cy="43" r={R} fill="none" stroke="var(--th-border-subtle)" strokeWidth="5"
            strokeDasharray={`${arc} ${circ}`} strokeLinecap="round"
            transform="rotate(-225 43 43)" />
          {/* Fill */}
          <motion.circle cx="43" cy="43" r={R} fill="none" stroke="var(--gold)" strokeWidth="5"
            strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
            transform="rotate(-225 43 43)"
            animate={{ strokeDasharray:`${fill} ${circ}` }}
            transition={{ duration:1.2, ease:"easeInOut" }}
            style={{ filter:"drop-shadow(0 0 5px rgba(255,215,0,0.55))" }} />
          <text x="43" y="40" textAnchor="middle" fill="var(--gold)" fontSize="15" fontFamily="monospace" fontWeight="bold">
            {Math.round(live)}%
          </text>
          <text x="43" y="54" textAnchor="middle" fill="var(--th-text-ultra-faint)" fontSize="6.5" fontFamily="monospace" letterSpacing="1">
            AI CONF
          </text>
        </svg>
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   RADAR SCANNER
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function RadarScanner() {
  const SIG = [
    { a:  40, r: 0.45, c:"var(--positive)", label:"HDFC"  },
    { a: 125, r: 0.70, c:"var(--gold)", label:"REL"   },
    { a: 200, r: 0.38, c:"var(--negative)", label:"INFY"  },
    { a: 270, r: 0.62, c:"var(--th-blue)", label:"TCS"   },
    { a: 320, r: 0.80, c:"var(--neutral)", label:"ICICI" },
  ];
  const S = 96, cx = 48, cy = 48, MR = 40;

  return (
    <div className="rounded-xl p-3.5 relative overflow-hidden"
      style={{ background:"var(--th-bg-card)", border:"1px solid var(--th-border-card)" }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Radio size={10} style={{ color:"var(--gold)" }} />
        <span className="text-[8.5px] font-mono uppercase tracking-wider" style={{ color:"var(--th-text-faint)" }}>Signal Scanner</span>
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FFD700] animate-live-dot" />
      </div>
      <div className="flex justify-center">
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
          <defs>
            <radialGradient id="rsw" cx="0%" cy="50%" r="100%">
              <stop offset="0%" stopColor="var(--th-border-strong)" />
              <stop offset="100%" stopColor="rgba(255,215,0,0)" />
            </radialGradient>
          </defs>
          {/* Rings */}
          {[0.33, 0.66, 1].map(r => (
            <circle key={r} cx={cx} cy={cy} r={MR * r} fill="none"
              stroke="rgba(255,215,0,0.055)" strokeWidth="0.5" />
          ))}
          {/* Cross hairs */}
          <line x1={cx} y1={cy-MR} x2={cx} y2={cy+MR} stroke="var(--th-border-subtle)" strokeWidth="0.5" />
          <line x1={cx-MR} y1={cy} x2={cx+MR} y2={cy} stroke="var(--th-border-subtle)" strokeWidth="0.5" />
          {/* Sweep */}
          <g style={{ transformOrigin:`${cx}px ${cy}px`, animation:"rotateGlow 3s linear infinite" }}>
            <path
              d={`M${cx} ${cy} L${cx+MR} ${cy} A${MR} ${MR} 0 0 0 ${cx + MR * Math.cos(-Math.PI/2.5)} ${cy + MR * Math.sin(-Math.PI/2.5)} Z`}
              fill="url(#rsw)"
            />
          </g>
          {/* Signals */}
          {SIG.map(s => {
            const rad = (s.a * Math.PI) / 180;
            const x = cx + Math.cos(rad) * MR * s.r;
            const y = cy + Math.sin(rad) * MR * s.r;
            return (
              <g key={s.label}>
                <circle cx={x} cy={y} r="2.5" fill={s.c}
                  style={{ filter:`drop-shadow(0 0 3px ${s.c})` }} />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MARKET PULSE (live heartbeat)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function MarketPulse() {
  const [data, setData] = useState(() => Array.from({ length: 32 }, () => 48 + Math.random() * 14 - 7));

  useEffect(() => {
    const id = setInterval(() => {
      setData(prev => [...prev.slice(1), 50 + (Math.random() - 0.48) * 28]);
    }, 420);
    return () => clearInterval(id);
  }, []);

  const W = 200, H = 48;
  const pts = data.map((v, i) => `${(i/(data.length-1))*W},${H-(v/100)*H}`).join(" ");
  const last = data[data.length-1];
  const trend = last > data[data.length-7];
  const lx = W, ly = H-(last/100)*H;
  const col = trend ? "var(--positive)" : "var(--negative)";

  return (
    <div className="rounded-xl p-3.5 relative overflow-hidden"
      style={{ background:"var(--th-bg-card)", border:"1px solid var(--th-border-card)" }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Brain size={10} style={{ color: col }} />
        <span className="text-[8.5px] font-mono uppercase tracking-wider" style={{ color:"var(--th-text-faint)" }}>Market Pulse</span>
        <span className="ml-auto text-[8.5px] font-mono" style={{ color: col }}>
          {trend ? "â–²" : "â–¼"} {Math.abs(last - data[data.length-7]).toFixed(1)}
        </span>
      </div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="pfg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`${col}18`} />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>
        <polyline points={`0,${H} ${pts} ${W},${H}`} fill="url(#pfg)" stroke="none" />
        <polyline points={pts} fill="none" stroke={col} strokeWidth="1.5"
          style={{ filter:`drop-shadow(0 0 3px ${col}80)` }} />
        <circle cx={lx} cy={ly} r="2.5" fill={col}
          style={{ filter:`drop-shadow(0 0 4px ${col})`, animation:"liveDot 1.5s ease-in-out infinite" }} />
      </svg>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   LIVE STATUS CARDS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const SCOLS = {
  positive: { c:"var(--positive)", bg:"var(--th-green-bg)",  br:"rgba(0,255,156,0.18)"  },
  warning:  { c:"var(--neutral)", bg:"rgba(255,184,0,0.07)",   br:"rgba(255,184,0,0.18)"  },
  info:     { c:"var(--th-blue)", bg:"var(--th-blue-bg)",  br:"rgba(56,189,248,0.18)" },
  gold:     { c:"var(--gold)", bg:"var(--th-border-subtle)",   br:"var(--th-border-accent)"  },
} as const;

function StatusPanel() {
  const [conf, setConf] = useState(78);
  useEffect(() => {
    const id = setInterval(() => setConf(v => Math.max(64, Math.min(93, v + (Math.random()-0.5)*2))), 3800);
    return () => clearInterval(id);
  }, []);

  const ITEMS: { label:string; value:string; type: keyof typeof SCOLS; bar:number }[] = [
    { label:"Market Regime",    value:"RISK-OFF",                  type:"warning",  bar:35  },
    { label:"AI Confidence",    value:`${Math.round(conf)}%`,      type:"gold",     bar:conf },
    { label:"Sector Rotation",  value:"PSU â†’ IT",                  type:"info",     bar:60  },
    { label:"Smart Money",      value:"BULLISH",                   type:"positive", bar:75  },
    { label:"Inst. Bias",       value:"ACCUMULATING",              type:"gold",     bar:68  },
    { label:"Volatility",       value:"ELEVATED",                  type:"warning",  bar:72  },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {ITEMS.map((item, i) => {
        const col = SCOLS[item.type];
        return (
          <motion.div key={item.label}
            initial={{ opacity:0, y:12 }}
            whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }}
            transition={{ delay: i * 0.07 }}
            className="p-3 rounded-xl cursor-default transition-all duration-300"
            style={{ background:col.bg, border:`1px solid ${col.br}` }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.boxShadow = `0 0 22px ${col.c}20`;
              el.style.transform = "translateY(-3px)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.boxShadow = "none";
              el.style.transform = "translateY(0)";
            }}
          >
            <div className="text-[8px] font-mono uppercase tracking-[0.1em] mb-1.5" style={{ color:`${col.c}70` }}>
              {item.label}
            </div>
            <div className="text-[11.5px] font-mono font-bold mb-2" style={{ color:col.c }}>
              {item.value}
            </div>
            <div className="h-0.5 rounded-full overflow-hidden" style={{ background:`${col.c}15` }}>
              <motion.div
                className="h-full rounded-full"
                initial={{ width:0 }}
                whileInView={{ width:`${item.bar}%` }}
                viewport={{ once:true }}
                transition={{ duration:1.2, ease:[0.16,1,0.3,1], delay: i*0.07+0.3 }}
                style={{ background:col.c, boxShadow:`0 0 4px ${col.c}60` }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   AI DOCTRINE PANEL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function DoctrinePanel() {
  return (
    <div className="rounded-2xl p-6 sm:p-8 relative overflow-hidden"
      style={{ background:"var(--th-bg-card)", border:"1px solid var(--th-border-normal)" }}>
      {/* Dim grid bg */}
      <div className="absolute inset-0 pointer-events-none" style={{
        opacity: 0.012,
        backgroundImage:"linear-gradient(rgba(255,215,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,215,0,1) 1px, transparent 1px)",
        backgroundSize:"40px 40px",
      }} />

      {/* Header */}
      <div className="relative mb-7 text-center">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px flex-1" style={{ background:"var(--th-border-normal)" }} />
          <span className="text-[9px] font-mono uppercase tracking-[0.3em]" style={{ color:"var(--gold)" }}>
            â—ˆ AI Operating Doctrine â—ˆ
          </span>
          <div className="h-px flex-1" style={{ background:"var(--th-border-normal)" }} />
        </div>
        <span className="text-[7.5px] font-mono uppercase tracking-[0.15em]" style={{ color:"var(--th-text-faint)" }}>
          Classification: Institutional Â· Version 2.1 Â· Immutable
        </span>
      </div>

      {/* Principles grid */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3">
        {DOCTRINE.map((d, i) => (
          <motion.div key={d.roman}
            initial={{ opacity:0, x: i%2===0 ? -14 : 14 }}
            whileInView={{ opacity:1, x:0 }}
            viewport={{ once:true }}
            transition={{ delay: i*0.09 }}
            className="flex gap-3.5 p-4 rounded-xl transition-all duration-300"
            style={{ background:"rgba(255,255,255,0.013)", border:"1px solid var(--th-border-subtle)" }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.borderColor = "var(--th-border-accent)";
              el.style.background  = "var(--th-gold-bg)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.borderColor = "var(--th-border-subtle)";
              el.style.background  = "rgba(255,255,255,0.013)";
            }}
          >
            <div className="text-[10px] font-mono font-bold flex-shrink-0 w-7 h-7 rounded flex items-center justify-center mt-0.5"
              style={{ color:"var(--gold)", background:"var(--th-border-subtle)", border:"1px solid var(--th-border-accent)" }}>
              {d.roman}
            </div>
            <div>
              <div className="text-[10.5px] font-mono font-bold mb-1.5 tracking-wider" style={{ color:"var(--th-text-secondary)" }}>
                {d.title}
              </div>
              <div className="text-[10.5px] leading-relaxed" style={{ color:"var(--th-text-muted)" }}>
                {d.body}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer divider */}
      <div className="relative mt-7 flex items-center gap-3">
        <div className="h-px flex-1" style={{ background:"var(--th-border-subtle)" }} />
        <span className="text-[7.5px] font-mono" style={{ color:"var(--th-text-faint)" }}>
          ALL AGENTS ONLINE Â· NSE/BSE MONITORED Â· REAL-TIME INTELLIGENCE
        </span>
        <div className="h-px flex-1" style={{ background:"var(--th-border-subtle)" }} />
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SECTION DIVIDER
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function SectionDivider({ label, icon: Icon }: { label:string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1" style={{ background:"var(--th-border-subtle)" }} />
      <div className="flex items-center gap-2 px-3 py-1 rounded-full"
        style={{ background:"var(--th-bg-elevated)", border:"1px solid var(--th-border-normal)" }}>
        <Icon size={9} style={{ color:"var(--gold)" }} />
        <span className="text-[8.5px] font-mono uppercase tracking-[0.2em]" style={{ color:"var(--th-text-muted)" }}>
          {label}
        </span>
      </div>
      <div className="h-px flex-1" style={{ background:"var(--th-border-subtle)" }} />
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PAGE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export default function AIIntelligencePage() {
  return (
    <div className="min-h-screen" style={{ background:"var(--th-bg-page)" }}>
      <Navbar />
      <MarketTicker />

      {/* â”€â”€â”€ CINEMATIC HERO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="relative min-h-[88vh] flex flex-col items-center justify-center px-4 pt-14 pb-20 overflow-hidden">
        <GlowOrbs />
        <NeuralGrid />
        <GoldParticles count={36} />
        <ScanLines />

        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background:`radial-gradient(ellipse 130% 110% at 50% 50%, transparent 25%, var(--th-vignette) 100%)`,
        }} />

        <div className="relative z-10 max-w-4xl mx-auto text-center">

          {/* Status badge */}
          <motion.div
            initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6 }}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-8"
            style={{ background:"var(--th-bg-card)", border:"1px solid var(--th-border-accent)" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#00FF9C] animate-live-dot" />
            <span className="text-[9.5px] font-mono uppercase tracking-[0.22em]" style={{ color:"var(--th-text-dim)" }}>
              7 Agents Active Â· NSE/BSE Â· Multi-Layer Intelligence
            </span>
            <div className="px-2 py-0.5 rounded-full text-[8.5px] font-mono font-bold"
              style={{ background:"var(--th-border-normal)", border:"1px solid var(--th-border-accent)", color:"var(--gold)" }}>
              ONLINE
            </div>
          </motion.div>

          {/* R.H.T.I.H logotype */}
          <motion.div
            initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.8, delay:0.1 }}
            className="mb-5"
          >
            <div className="text-[9.5px] font-mono uppercase tracking-[0.45em] mb-2" style={{ color:"var(--th-text-ultra-faint)" }}>
              â—ˆ Intelligence System Core â—ˆ
            </div>
            <h1 className="font-bold leading-none tracking-tight select-none"
              style={{
                fontFamily:"var(--font-space-grotesk, sans-serif)",
                fontSize:"clamp(44px, 10vw, 104px)",
                background:"linear-gradient(135deg, #FFD700 0%, #C9A227 28%, #FFE55C 52%, #C9A227 72%, #FFD700 100%)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
                backgroundSize:"200% auto", animation:"shimmer 6s linear infinite",
                filter:"drop-shadow(0 0 45px rgba(255,215,0,0.22))",
              }}>
              MARKET KA BAADSHAH
            </h1>
            <div className="font-semibold tracking-[0.28em] mt-1"
              style={{
                fontFamily:"var(--font-space-grotesk, sans-serif)",
                fontSize:"clamp(11px, 2.2vw, 20px)",
                color:"var(--th-text-muted)",
              }}>
              INTELLIGENCE CORE
            </div>
          </motion.div>

          {/* Taglines */}
          <motion.p initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6, delay:0.25 }}
            className="max-w-xl mx-auto mb-2 leading-relaxed"
            style={{ fontSize:"clamp(13px, 2vw, 16px)", color:"#525252" }}>
            Multi-agent institutional AI for Indian equity intelligence.
          </motion.p>

          <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.5, delay:0.4 }}
            className="text-[13px] font-mono mb-10" style={{ color:"#C9A227", letterSpacing:"0.04em" }}>
            Not a chatbot. A market intelligence operating system.
          </motion.p>

          {/* Search */}
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.7, delay:0.45 }}
            className="max-w-2xl mx-auto mb-10">
            <SearchBar size="hero" placeholder="Enter any NSE/BSE ticker for AI intelligence..." />
          </motion.div>

          {/* System metrics strip */}
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.6, delay:0.75 }}
            className="flex flex-wrap items-center justify-center gap-6">
            {[
              { label:"AI Agents",       value:"7",              color:"var(--gold)" },
              { label:"Analysis Layers", value:"8",              color:"var(--gold)" },
              { label:"Mode",            value:"INSTITUTIONAL",  color:"var(--positive)" },
              { label:"Markets",         value:"NSE / BSE",      color:"var(--th-blue)" },
            ].map(m => (
              <div key={m.label} className="flex items-center gap-2">
                <span className="text-[8.5px] font-mono uppercase tracking-wider" style={{ color:"var(--th-text-faint)" }}>{m.label}</span>
                <span className="text-[10px] font-mono font-bold" style={{ color:m.color }}>{m.value}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* â”€â”€â”€ BODY SECTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10 pb-24">

        {/* STATUS PANEL */}
        <motion.section initial={{ opacity:0, y:18 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}>
          <SectionDivider label="Live System Status" icon={Radio} />
          <div className="mt-4">
            <StatusPanel />
          </div>
        </motion.section>

        {/* TERMINAL + VISUALIZATIONS */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity:0, x:-18 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true }}>
            <div className="flex items-center gap-2 mb-3">
              <Cpu size={10} style={{ color:"var(--gold)" }} />
              <span className="text-[9px] font-mono uppercase tracking-[0.2em]" style={{ color:"var(--th-text-faint)" }}>Query Engine</span>
            </div>
            <TypewriterTerminal />
          </motion.div>

          <motion.div initial={{ opacity:0, x:18 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true }}>
            <div className="flex items-center gap-2 mb-3">
              <Brain size={10} style={{ color:"var(--gold)" }} />
              <span className="text-[9px] font-mono uppercase tracking-[0.2em]" style={{ color:"var(--th-text-faint)" }}>AI Processing Modules</span>
            </div>
            <div className="grid grid-cols-2 gap-3 h-[calc(100%-28px)]">
              <NeuralWave />
              <ConfidenceArc />
              <RadarScanner />
              <MarketPulse />
            </div>
          </motion.div>
        </section>

        {/* INTELLIGENCE MODULES */}
        <section>
          <SectionDivider label="Intelligence Modules" icon={Layers} />
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {MODULES.map((mod, i) => {
              const rgb = {
                r: parseInt(mod.color.slice(1,3),16),
                g: parseInt(mod.color.slice(3,5),16),
                b: parseInt(mod.color.slice(5,7),16),
              };
              return (
                <motion.div key={mod.title}
                  initial={{ opacity:0, y:16 }}
                  whileInView={{ opacity:1, y:0 }}
                  viewport={{ once:true }}
                  transition={{ delay: i*0.055 }}
                  className="p-4 rounded-xl cursor-default transition-all duration-300"
                  style={{ background:"var(--th-bg-card)", border:"1px solid var(--th-border-subtle)" }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.borderColor = `rgba(${rgb.r},${rgb.g},${rgb.b},0.28)`;
                    el.style.boxShadow   = `var(--th-shadow-elevated)`;
                    el.style.transform   = "translateY(-4px)";
                    el.style.background  = "var(--th-bg-card-hover)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.borderColor = "var(--th-border-subtle)";
                    el.style.boxShadow   = "none";
                    el.style.transform   = "translateY(0)";
                    el.style.background  = "var(--th-bg-card)";
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background:`rgba(${rgb.r},${rgb.g},${rgb.b},0.08)`, border:`1px solid rgba(${rgb.r},${rgb.g},${rgb.b},0.18)` }}>
                      <mod.icon size={14} style={{ color:mod.color }} />
                    </div>
                    <span className="text-[7.5px] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-sm"
                      style={{ color:mod.color, background:`rgba(${rgb.r},${rgb.g},${rgb.b},0.08)`, border:`1px solid rgba(${rgb.r},${rgb.g},${rgb.b},0.15)` }}>
                      {mod.tag}
                    </span>
                  </div>
                  <h3 className="text-[12px] font-semibold mb-1.5"
                    style={{ fontFamily:"var(--font-space-grotesk, sans-serif)", color:"var(--th-text-primary)" }}>
                    {mod.title}
                  </h3>
                  <p className="text-[10.5px] leading-relaxed" style={{ color:"var(--th-text-muted)" }}>
                    {mod.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* DOCTRINE */}
        <motion.section initial={{ opacity:0, y:18 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}>
          <DoctrinePanel />
        </motion.section>

        {/* CTA */}
        <motion.section initial={{ opacity:0, y:18 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
          className="text-center py-10 relative overflow-hidden">
          {/* Bg glow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background:"radial-gradient(ellipse 60% 80% at 50% 50%, rgba(255,215,0,0.025) 0%, transparent 65%)" }} />
          <GoldParticles count={18} />

          <div className="relative">
            <div className="text-[9px] font-mono uppercase tracking-[0.3em] mb-4" style={{ color:"var(--gold)" }}>
              â—ˆ Deploy Intelligence
            </div>
            <h2 className="font-bold mb-3"
              style={{
                fontFamily:"var(--font-space-grotesk, sans-serif)",
                fontSize:"clamp(22px, 4vw, 40px)",
                color:"var(--th-text-primary)", letterSpacing:"-0.025em",
              }}>
              Query the{" "}
              <span style={{
                background:"linear-gradient(135deg, #FFD700, #C9A227)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
              }}>
                Intelligence Core.
              </span>
            </h2>
            <p className="text-[13px] mb-8" style={{ color:"#424242" }}>
              Enter any NSE or BSE ticker. Receive institutional-grade multi-agent analysis in seconds.
            </p>
            <div className="max-w-xl mx-auto mb-6">
              <SearchBar size="hero" placeholder="RELIANCE, HDFCBANK, TCS, NIFTY..." />
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {["RELIANCE","TCS","HDFCBANK","INFY","ICICIBANK","BHARTIARTL"].map(t => (
                <Link key={t} href={`/stock/${t}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10.5px] font-mono transition-all duration-200"
                  style={{ color:"var(--th-text-faint)", background:"rgba(255,255,255,0.018)", border:"1px solid var(--th-border-subtle)" }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.color       = "var(--gold)";
                    el.style.borderColor = "var(--th-border-accent)";
                    el.style.background  = "var(--th-border-subtle)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.color       = "var(--th-text-faint)";
                    el.style.borderColor = "var(--th-border-subtle)";
                    el.style.background  = "rgba(255,255,255,0.018)";
                  }}
                >
                  {t} <ArrowRight size={9} />
                </Link>
              ))}
            </div>
          </div>
        </motion.section>
      </div>

      {/* Footer */}
      <footer className="px-4 py-8" style={{ borderTop:"1px solid var(--th-border-subtle)" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-[14px] tracking-wider"
              style={{
                fontFamily:"var(--font-space-grotesk, sans-serif)",
                background:"linear-gradient(135deg, #FFD700, #C9A227)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
              }}>
              MARKET KA BAADSHAH
            </span>
            <span className="text-[8.5px] font-mono uppercase tracking-wider" style={{ color:"var(--th-text-faint)" }}>
              Intelligence Core Â· All Agents Online
            </span>
          </div>
          <div className="text-[8.5px] font-mono uppercase tracking-wider" style={{ color:"var(--th-text-faint)" }}>
            Not investment advice Â· Institutional research only
          </div>
        </div>
      </footer>
    </div>
  );
}
