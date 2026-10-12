"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Brain, Activity, Shield, TrendingUp, TrendingDown,
  AlertTriangle, ArrowRight, Target, Layers, Globe, BarChart2,
  Zap, Eye, Cpu, ChevronLeft, RefreshCw, X, CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { Navbar }       from "@/components/Navbar";
import { MarketTicker } from "@/components/MarketTicker";
import type { IntelligenceReport } from "@/app/api/intelligence/[ticker]/route";

/* ═══════════════════════════════════════════════════════
   COLOUR HELPERS
═══════════════════════════════════════════════════════ */

type Verdict = "BULLISH" | "BEARISH" | "NEUTRAL" | "MIXED";

const SENT_COL: Record<Verdict,{color:string;bg:string;border:string;glow:string}> = {
  BULLISH: {color:"var(--positive)",bg:"var(--th-green-bg)",border:"rgba(0,255,156,0.28)",glow:"0 0 24px rgba(0,255,156,0.25)"},
  BEARISH: {color:"var(--negative)",bg:"var(--th-red-bg)",border:"rgba(255,77,77,0.28)",glow:"0 0 24px rgba(255,77,77,0.25)"},
  NEUTRAL: {color:"var(--neutral)",bg:"rgba(255,184,0,0.08)",border:"rgba(255,184,0,0.24)",glow:"0 0 20px rgba(255,184,0,0.2)"},
  MIXED:   {color:"var(--th-blue)",bg:"rgba(192,132,252,0.08)",border:"rgba(192,132,252,0.24)",glow:"0 0 20px rgba(192,132,252,0.2)"},
};

function scoreColor(s:number):string {
  if(s>=75) return "var(--positive)"; if(s>=60) return "var(--gold)";
  if(s>=45) return "var(--neutral)"; return "var(--negative)";
}

const QUICK_PICKS = ["RELIANCE","TCS","HDFCBANK","ICICIBANK","BHARTIARTL","INFY","SBIN","HAL","IRFC","TATAMOTORS"];

/* ═══════════════════════════════════════════════════════
   VISUAL COMPONENTS
═══════════════════════════════════════════════════════ */

function ScoreArc({ score, size=110 }: { score:number; size?:number }) {
  const R=size*0.37, cx=size/2, cy=size/2;
  const circ=2*Math.PI*R, arc=circ*0.75, fill=(score/100)*arc;
  const col=scoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={`${col}12`} strokeWidth="6"
        strokeDasharray={`${arc} ${circ}`} strokeLinecap="round" transform={`rotate(-225 ${cx} ${cy})`}/>
      <motion.circle cx={cx} cy={cy} r={R} fill="none" stroke={col} strokeWidth="6"
        strokeDasharray={`0 ${circ}`} strokeLinecap="round" transform={`rotate(-225 ${cx} ${cy})`}
        animate={{strokeDasharray:`${fill} ${circ}`}}
        transition={{duration:1.4,ease:[0.16,1,0.3,1],delay:0.2}}
        style={{filter:`drop-shadow(0 0 6px ${col}70)`}}/>
      <text x={cx} y={cy-4} textAnchor="middle" fill={col} fontSize={size*0.2} fontFamily="monospace" fontWeight="bold">{score}</text>
      <text x={cx} y={cy+size*0.14} textAnchor="middle" fill={`${col}50`} fontSize={size*0.09} fontFamily="monospace">/100</text>
    </svg>
  );
}

function ScoreBar({ label, score, delay=0 }: { label:string; score:number; delay?:number }) {
  const col=scoreColor(score);
  return (
    <div className="flex items-center gap-3 py-1.5" style={{borderBottom:"1px solid var(--th-border-subtle)"}}>
      <span className="text-[10px] font-mono w-40 flex-shrink-0" style={{color:"var(--th-text-dim)"}}>{label}</span>
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{background:"rgba(255,255,255,0.04)"}}>
        <motion.div className="h-full rounded-full"
          initial={{width:0}} animate={{width:`${score}%`}}
          transition={{duration:1.1,ease:[0.16,1,0.3,1],delay}}
          style={{background:`linear-gradient(90deg,${col}80,${col})`,boxShadow:`0 0 6px ${col}40`}}/>
      </div>
      <motion.span initial={{opacity:0}} animate={{opacity:1}} transition={{delay:delay+0.5}}
        className="text-[11px] font-mono font-bold w-8 text-right flex-shrink-0" style={{color:col}}>
        {score}
      </motion.span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LOADING STATE (real API in progress)
═══════════════════════════════════════════════════════ */

const LOAD_MSGS = [
  "Fetching live Yahoo Finance data...",
  "Retrieving latest news headlines...",
  "Pulling financial metrics & ratios...",
  "Running technical structure analysis...",
  "Scanning institutional flow patterns...",
  "Analyzing smart money signals...",
  "Processing macro regime parameters...",
  "Synthesizing quant conviction framework...",
  "Generating institutional report...",
];

function LoadingState({ ticker }:{ ticker:string }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setMsgIdx(i => Math.min(i+1, LOAD_MSGS.length-1));
      setProgress(p => Math.min(p + 100/LOAD_MSGS.length, 95));
    }, 1800);
    return () => clearInterval(id);
  }, []);
  return (
    <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="max-w-2xl mx-auto mt-16 px-4">
      <div className="rounded-2xl p-8" style={{background:"var(--th-bg-card)",border:"1px solid var(--th-border-normal)"}}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{background:"var(--th-border-card)",border:"1px solid var(--th-border-accent)"}}>
            <Brain size={18} style={{color:"var(--gold)"}}/>
          </div>
          <div>
            <div className="text-[13px] font-mono font-bold" style={{color:"var(--th-text-primary)"}}>Analyzing {ticker}</div>
            <div className="text-[9px] font-mono uppercase tracking-wider" style={{color:"var(--th-text-faint)"}}>
              Live Data · AI Engine · Real Intelligence
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700] animate-live-dot"/>
            <span className="text-[8.5px] font-mono" style={{color:"var(--gold)"}}>LIVE</span>
          </div>
        </div>
        <div className="space-y-2 mb-6 min-h-[140px]">
          {LOAD_MSGS.slice(0,msgIdx+1).map((msg,i) => (
            <motion.div key={i} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} className="flex items-center gap-2.5">
              <CheckCircle size={10} style={{color:i===msgIdx?"var(--gold)":"var(--positive)",flexShrink:0}}/>
              <span className="text-[10px] font-mono" style={{color:i===msgIdx?"var(--th-text-primary)":"var(--th-text-ultra-faint)"}}>{msg}</span>
              {i===msgIdx && <span className="text-[10px] font-mono animate-blink" style={{color:"var(--gold)"}}>█</span>}
            </motion.div>
          ))}
        </div>
        <div className="h-0.5 rounded-full overflow-hidden mb-1.5" style={{background:"var(--th-border-subtle)"}}>
          <motion.div className="h-full rounded-full" animate={{width:`${progress}%`}} transition={{duration:0.5}}
            style={{background:"linear-gradient(90deg,#C9A227,#FFD700)",boxShadow:"0 0 8px rgba(255,215,0,0.4)"}}/>
        </div>
        <div className="text-right text-[8.5px] font-mono" style={{color:"var(--th-text-ultra-faint)"}}>Processing live data...</div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   ERROR STATE — network/timeout only, never API key
═══════════════════════════════════════════════════════ */

function ErrorState({ error, ticker, onReset, onRetry }: {
  error:string; ticker:string; onReset:()=>void; onRetry:()=>void;
}) {
  return (
    <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="max-w-2xl mx-auto mt-16 px-4">
      <div className="rounded-2xl p-8" style={{background:"var(--th-bg-card)",border:"1px solid rgba(255,77,77,0.2)"}}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{background:"var(--th-red-bg)",border:"1px solid rgba(255,77,77,0.2)"}}>
            <AlertTriangle size={17} style={{color:"var(--negative)"}}/>
          </div>
          <div>
            <div className="text-[13px] font-mono font-bold" style={{color:"var(--th-text-primary)"}}>
              Analysis timed out — {ticker}
            </div>
            <div className="text-[9px] font-mono uppercase tracking-wider" style={{color:"var(--th-red-text-dim)"}}>
              Network or data fetch error
            </div>
          </div>
        </div>
        <p className="text-[11px] font-mono p-3 rounded-lg mb-5"
          style={{color:"#FF6B6B",background:"rgba(255,77,77,0.04)",border:"1px solid rgba(255,77,77,0.12)"}}>
          {error}
        </p>
        <div className="flex gap-3">
          <button onClick={onRetry}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-mono"
            style={{color:"var(--gold)",background:"var(--th-border-card)",border:"1px solid var(--th-border-accent)"}}>
            <RefreshCw size={10}/> Retry Analysis
          </button>
          <button onClick={onReset}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-mono"
            style={{color:"var(--th-text-muted)",background:"rgba(255,255,255,0.02)",border:"1px solid var(--th-border-card)"}}>
            <X size={10}/> New Stock
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   ANALYSIS REPORT RENDERER
═══════════════════════════════════════════════════════ */

function AnalysisDisplay({ report, onReset }: { report:IntelligenceReport; onReset:()=>void }) {
  const vc  = SENT_COL[(report.currentSentiment as Verdict)] ?? SENT_COL["NEUTRAL"];
  const sc  = report.scores ?? { technical:50,fundamental:50,momentum:50,institutional:50,riskReward:50,smartMoney:50,volatility:50,ltInvestment:50,swingTrade:50 };
  const overall = Math.round((sc.technical+sc.fundamental+sc.momentum+sc.institutional+sc.riskReward+sc.smartMoney)/6);

  const SCORE_BARS = [
    {label:"Technical Structure",     score:sc.technical,     delay:0.05},
    {label:"Fundamental Strength",    score:sc.fundamental,   delay:0.10},
    {label:"Momentum Quality",        score:sc.momentum,      delay:0.15},
    {label:"Institutional Confidence",score:sc.institutional, delay:0.20},
    {label:"Risk / Reward",           score:sc.riskReward,    delay:0.25},
    {label:"Smart Money Activity",    score:sc.smartMoney,    delay:0.30},
    {label:"Volatility Profile",      score:sc.volatility,    delay:0.35},
    {label:"Long-Term Quality",       score:sc.ltInvestment,  delay:0.40},
    {label:"Swing Trade Quality",     score:sc.swingTrade,    delay:0.45},
  ];

  return (
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.5}}
      className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-5">

      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onReset} className="flex items-center gap-1 text-[10px] font-mono transition-colors"
            style={{color:"var(--th-text-faint)"}}
            onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.color="var(--gold)";}}
            onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.color="var(--th-text-faint)";}}>
            <ChevronLeft size={11}/> New Analysis
          </button>
          <span style={{color:"var(--th-text-faint)"}}>/</span>
          <span className="text-[10px] font-mono" style={{color:"var(--th-text-dim)"}}>{report.ticker}</span>
          {report._meta && (
            <>
              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded ml-1"
                style={{color:"var(--positive)",background:"rgba(0,255,156,0.06)",border:"1px solid rgba(0,255,156,0.15)"}}>
                LIVE · {new Date(report._meta.generatedAt).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
              </span>
              {report._meta.model && (
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded ml-1"
                  style={{color:"var(--th-blue)",background:"rgba(56,189,248,0.06)",border:"1px solid rgba(56,189,248,0.15)"}}>
                  {report._meta.model.includes("deterministic") ? "QUANT ENGINE" : report._meta.model.includes("ollama") ? "OLLAMA AI" : "CLAUDE AI"}
                </span>
              )}
            </>
          )}
        </div>
        <button onClick={onReset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono"
          style={{color:"var(--th-text-muted)",background:"rgba(255,255,255,0.02)",border:"1px solid var(--th-border-card)"}}>
          <RefreshCw size={10}/> New Query
        </button>
      </div>

      {/* Stock header */}
      <div className="rounded-2xl p-5 relative overflow-hidden"
        style={{background:"var(--th-bg-elevated)",border:`1px solid rgba(255,215,0,0.12)`}}>
        <div className="absolute inset-0 pointer-events-none"
          style={{background:`radial-gradient(ellipse 80% 80% at 0% 50%, ${vc.bg} 0%, transparent 60%)`}}/>
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[8.5px] font-mono px-2 py-0.5 rounded"
                style={{color:"var(--gold)",background:"var(--th-border-card)",border:"1px solid var(--th-border-accent)"}}>{report.ticker}</span>
              <span className="text-[8.5px] font-mono px-2 py-0.5 rounded"
                style={{color:"var(--th-text-dim)",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)"}}>{report.exchange}</span>
              {report._meta?.newsCount && (
                <span className="text-[8px] font-mono" style={{color:"var(--th-text-faint)"}}>
                  {report._meta.newsCount} articles analyzed
                </span>
              )}
            </div>
            <h1 className="font-bold mb-1" style={{fontFamily:"var(--font-space-grotesk,sans-serif)",fontSize:"clamp(18px,3vw,26px)",color:"var(--th-text-primary)"}}>
              {report.companyName}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[11px]" style={{color:"var(--th-text-dim)"}}>{report.sector}</span>
              <span className="text-[10px] font-mono" style={{color:scoreColor(overall)}}>◈ {report.trendState}</span>
            </div>
            <p className="text-[11px] mt-1.5 italic max-w-xl" style={{color:"var(--th-text-faint)"}}>&ldquo;{report.oneLiner}&rdquo;</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} transition={{delay:0.3,type:"spring",stiffness:300}}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-[13px] uppercase tracking-wider"
              style={{color:vc.color,background:vc.bg,border:`1px solid ${vc.border}`,boxShadow:vc.glow}}>
              <span className="w-2 h-2 rounded-full animate-live-dot" style={{background:vc.color}}/>
              {report.currentSentiment}
            </motion.div>
            <div className="text-[9px] font-mono uppercase tracking-wider" style={{color:"var(--th-text-faint)"}}>
              <span title="Scores are rule-based heuristics. No calibrated probability exists for this call.">Confidence: <span style={{color:"var(--th-text-muted)"}}>unavailable</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Score dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-2 rounded-2xl p-5 flex flex-col items-center justify-center"
          style={{background:"var(--th-bg-elevated)",border:"1px solid var(--th-border-normal)"}}>
          <div className="text-[9px] font-mono uppercase tracking-[0.2em] mb-3" style={{color:"var(--th-text-faint)"}}>Overall AI Score</div>
          <ScoreArc score={overall} size={130}/>
          <div className="mt-3 text-[11px] font-mono text-center" style={{color:`${scoreColor(overall)}80`}}>
            {overall>=75?"Institutional Grade":overall>=62?"Above Average":overall>=50?"Average Profile":"Below Average — Caution"}
          </div>
        </div>
        <div className="md:col-span-3 rounded-2xl p-5"
          style={{background:"var(--th-bg-elevated)",border:"1px solid var(--th-border-normal)"}}>
          <div className="flex items-center gap-2 mb-4">
            <Cpu size={10} style={{color:"var(--gold)"}}/>
            <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{color:"var(--th-text-faint)"}}>Score Breakdown</span>
          </div>
          {SCORE_BARS.map(b=><ScoreBar key={b.label} {...b}/>)}
        </div>
      </div>

      {/* Entry zones */}
      {report.entryZone && (
        <div className="rounded-2xl p-5" style={{background:"var(--th-bg-elevated)",border:"1px solid var(--th-border-normal)"}}>
          <div className="flex items-center gap-2 mb-4">
            <Target size={11} style={{color:"var(--gold)"}}/>
            <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{color:"var(--th-text-faint)"}}>Entry · Stop · Target Zones</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {label:"Entry Zone",    value:report.entryZone.entry,     color:"var(--gold)", icon:"→"},
              {label:"Stop Loss",     value:report.entryZone.stopLoss,  color:"var(--negative)", icon:"✕"},
              {label:"Target 1",      value:report.entryZone.target1,   color:"var(--positive)", icon:"↑"},
              {label:"Target 2",      value:report.entryZone.target2,   color:"var(--positive)", icon:"↑↑"},
            ].map((z,i)=>(
              <motion.div key={z.label} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.1+0.3}}
                className="p-3.5 rounded-xl" style={{background:`${z.color}07`,border:`1px solid ${z.color}20`}}>
                <div className="text-[8.5px] font-mono uppercase tracking-wider mb-2" style={{color:`${z.color}60`}}>{z.icon} {z.label}</div>
                <div className="text-[13px] font-mono font-bold" style={{color:z.color}}>{z.value}</div>
              </motion.div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[9px] font-mono" style={{color:"var(--th-text-faint)"}}>Risk / Reward:</span>
            <span className="text-[11px] font-mono font-bold" style={{color:"var(--gold)"}}>{report.entryZone.riskReward}</span>
          </div>
        </div>
      )}

      {/* Technical + Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{background:"var(--th-bg-elevated)",border:"1px solid var(--th-border-normal)"}}>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={11} style={{color:"var(--gold)"}}/>
            <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{color:"var(--th-text-faint)"}}>Technical Analysis</span>
            <div className="ml-auto px-2 py-0.5 rounded text-[8px] font-mono"
              style={{color:scoreColor(sc.technical),background:`${scoreColor(sc.technical)}10`,border:`1px solid ${scoreColor(sc.technical)}25`}}>
              {sc.technical}/100
            </div>
          </div>
          {(report.techAnalysis ?? "").split("\n\n").map((para,i)=>(
            <p key={i} className="text-[11.5px] leading-relaxed mb-3" style={{color:i===0?"#9A9A9A":"var(--th-text-dim)"}}>{para}</p>
          ))}
        </div>
        <div className="rounded-2xl p-5" style={{background:"var(--th-bg-elevated)",border:"1px solid var(--th-border-normal)"}}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={11} style={{color:"var(--gold)"}}/>
            <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{color:"var(--th-text-faint)"}}>Graph Intelligence</span>
            <div className="ml-auto px-2 py-0.5 rounded text-[8px] font-mono"
              style={{color:scoreColor(sc.momentum),background:`${scoreColor(sc.momentum)}10`,border:`1px solid ${scoreColor(sc.momentum)}25`}}>
              Momentum: {sc.momentum}/100
            </div>
          </div>
          {(report.graphAnalysis ?? "").split("\n\n").map((para,i)=>(
            <p key={i} className="text-[11.5px] leading-relaxed mb-3" style={{color:i===0?"#9A9A9A":"var(--th-text-dim)"}}>{para}</p>
          ))}
        </div>
      </div>

      {/* Multi-timeframe */}
      {report.timeframes && (
        <div className="rounded-2xl p-5" style={{background:"var(--th-bg-elevated)",border:"1px solid var(--th-border-normal)"}}>
          <div className="flex items-center gap-2 mb-4">
            <Layers size={11} style={{color:"var(--gold)"}}/>
            <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{color:"var(--th-text-faint)"}}>Multi-Timeframe</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(Object.entries(report.timeframes) as [string,{trend:string;strength:string;risk:string;note:string}][]).map(([key,tf],i)=>{
              const riskCol: Record<string,string> = {Low:"var(--positive)",Medium:"var(--neutral)",High:"var(--negative)"};
              const rc = riskCol[tf.risk]||"var(--th-text-muted)";
              return (
                <motion.div key={key} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.08+0.4}}
                  className="p-3.5 rounded-xl" style={{background:"rgba(255,255,255,0.015)",border:"1px solid var(--th-border-subtle)"}}>
                  <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{color:"var(--th-text-faint)"}}>
                    {key==="longTerm"?"Long-Term":key.charAt(0).toUpperCase()+key.slice(1)}
                  </div>
                  <div className="text-[11px] font-mono font-semibold mb-1.5" style={{color:"#E0E0E0"}}>{tf.trend}</div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded"
                      style={{color:tf.strength==="Strong"?"var(--positive)":tf.strength==="Moderate"?"var(--gold)":"var(--negative)",background:"rgba(255,255,255,0.03)"}}>
                      {tf.strength}
                    </span>
                    <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded"
                      style={{color:rc,background:`${rc}12`,border:`1px solid ${rc}28`}}>
                      {tf.risk} Risk
                    </span>
                  </div>
                  <p className="text-[10px] leading-relaxed" style={{color:"var(--th-text-faint)"}}>{tf.note}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Institutional flow + Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{background:"var(--th-bg-elevated)",border:"1px solid var(--th-border-normal)"}}>
          <div className="flex items-center gap-2 mb-4">
            <Eye size={11} style={{color:"var(--gold)"}}/>
            <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{color:"var(--th-text-faint)"}}>Institutional Flow</span>
          </div>
          <p className="text-[11.5px] leading-relaxed" style={{color:"var(--th-text-muted)"}}>{report.institutionalFlow}</p>
        </div>
        <div className="rounded-2xl p-5" style={{background:"var(--th-bg-elevated)",border:"1px solid rgba(255,77,77,0.1)"}}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={11} style={{color:"var(--negative)"}}/>
            <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{color:"var(--th-text-faint)"}}>Risk Analysis</span>
          </div>
          <p className="text-[11.5px] leading-relaxed mb-4" style={{color:"var(--th-text-muted)"}}>{report.riskAnalysis}</p>
          {report.invalidation && (
            <div className="p-3 rounded-xl" style={{background:"var(--th-red-bg)",border:"1px solid rgba(255,77,77,0.15)"}}>
              <div className="text-[8.5px] font-mono uppercase tracking-wider mb-1" style={{color:"var(--th-red-text-mid)"}}>✕ Invalidation</div>
              <div className="text-[11px] font-mono" style={{color:"var(--negative)"}}>{report.invalidation}</div>
            </div>
          )}
        </div>
      </div>

      {/* Macro + AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{background:"var(--th-bg-elevated)",border:"1px solid var(--th-border-normal)"}}>
          <div className="flex items-center gap-2 mb-4">
            <Globe size={11} style={{color:"var(--th-blue)"}}/>
            <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{color:"var(--th-text-faint)"}}>Macro Context</span>
          </div>
          <p className="text-[11.5px] leading-relaxed" style={{color:"var(--th-text-muted)"}}>{report.macroContext}</p>
        </div>
        <div className="rounded-2xl p-5 relative overflow-hidden"
          style={{background:"var(--th-bg-elevated)",border:"1px solid var(--th-border-normal)"}}>
          <div className="absolute inset-0 pointer-events-none"
            style={{background:"radial-gradient(ellipse 60% 60% at 100% 0%, rgba(255,215,0,0.03) 0%, transparent 60%)"}}/>
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={11} style={{color:"var(--gold)"}}/>
              <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{color:"var(--th-text-faint)"}}>AI Intelligence Core</span>
            </div>
            <p className="text-[11.5px] leading-relaxed" style={{color:"#7A7A7A"}}>{report.aiInsights}</p>
          </div>
        </div>
      </div>

      {/* Bull / Bear */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{background:"rgba(0,255,156,0.03)",border:"1px solid rgba(0,255,156,0.1)"}}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={11} style={{color:"var(--positive)"}}/>
            <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{color:"var(--th-green-text-dim)"}}>Bull Case</span>
          </div>
          <p className="text-[11.5px] leading-relaxed" style={{color:"var(--th-text-dim)"}}>{report.bullCase}</p>
        </div>
        <div className="rounded-2xl p-5" style={{background:"rgba(255,77,77,0.03)",border:"1px solid rgba(255,77,77,0.1)"}}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={11} style={{color:"var(--negative)"}}/>
            <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{color:"var(--th-red-text-dim)"}}>Bear Case</span>
          </div>
          <p className="text-[11.5px] leading-relaxed" style={{color:"var(--th-text-dim)"}}>{report.bearCase}</p>
        </div>
      </div>

      {/* Latest developments */}
      {(report.latestDevelopments?.length ?? 0) > 0 && (
        <div className="rounded-2xl p-5" style={{background:"var(--th-bg-elevated)",border:"1px solid var(--th-border-normal)"}}>
          <div className="flex items-center gap-2 mb-4">
            <Zap size={11} style={{color:"var(--gold)"}}/>
            <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{color:"var(--th-text-faint)"}}>Latest Developments</span>
            <span className="ml-auto text-[8px] font-mono px-2 py-0.5 rounded"
              style={{color:"var(--positive)",background:"rgba(0,255,156,0.06)",border:"1px solid rgba(0,255,156,0.15)"}}>
              LIVE DATA
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(report.latestDevelopments??[]).map((d:any,i:number)=>{
              const sc=SENT_COL[(d.sentiment as Verdict)]??SENT_COL["NEUTRAL"];
              return (
                <motion.div key={i} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.1}}
                  className="p-4 rounded-xl" style={{background:"rgba(255,255,255,0.015)",border:`1px solid ${sc.color}15`}}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{color:sc.color,background:sc.bg}}>{d.sentiment}</span>
                    <span className="text-[8px] font-mono" style={{color:"var(--th-text-ultra-faint)"}}>{d.date}</span>
                  </div>
                  <h4 className="text-[12px] font-semibold mb-2 leading-snug"
                    style={{fontFamily:"var(--font-space-grotesk,sans-serif)",color:"#E0E0E0"}}>{d.headline}</h4>
                  <div className="p-2.5 rounded-lg" style={{background:"var(--th-gold-bg)",borderLeft:"2px solid rgba(255,215,0,0.15)"}}>
                    <p className="text-[10.5px] leading-relaxed" style={{color:"var(--th-text-dim)"}}>{d.aiRead}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Key risks */}
      {(report.keyRisks?.length ?? 0) > 0 && (
        <div className="rounded-2xl p-5" style={{background:"var(--th-bg-elevated)",border:"1px solid rgba(255,77,77,0.1)"}}>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={11} style={{color:"var(--negative)"}}/>
            <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{color:"var(--th-red-text-dim)"}}>Key Risks</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(report.keyRisks??[]).map((r:any,i:number)=>(
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg"
                style={{background:"rgba(255,77,77,0.04)",border:"1px solid rgba(255,77,77,0.1)"}}>
                <span className="text-[8px] font-mono mt-0.5 flex-shrink-0" style={{color:"var(--negative)"}}>▸</span>
                <span className="text-[11px] leading-relaxed" style={{color:"var(--th-text-secondary)"}}>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="py-4 text-center">
        <p className="text-[9px] font-mono uppercase tracking-wider" style={{color:"var(--th-text-ultra-faint)"}}>
          MARKET KA BAADSHAH Real Intelligence · {report._meta?.newsCount ?? 0} News Articles · {report._meta?.model ? `Engine: ${report._meta.model}` : "AI Analysis"} · Not Investment Advice
        </p>

      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   QUERY INPUT
═══════════════════════════════════════════════════════ */

function QueryInput({ onAnalyze }:{ onAnalyze:(t:string)=>void }) {
  const [input, setInput] = useState("");
  return (
    <div className="max-w-5xl mx-auto px-4 py-20 text-center">
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.6}}>
        <div className="text-[9.5px] font-mono uppercase tracking-[0.3em] mb-4" style={{color:"var(--th-text-faint)"}}>
          ◈ Live Intelligence · Yahoo Finance + AI Engine
        </div>
        <h1 className="font-bold mb-4 leading-tight"
          style={{fontFamily:"var(--font-space-grotesk,sans-serif)",fontSize:"clamp(28px,5vw,54px)",color:"var(--th-text-primary)",letterSpacing:"-0.025em"}}>
          Enter a Ticker.{" "}
          <span style={{background:"linear-gradient(135deg,#FFD700,#C9A227)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
            Get Real Intelligence.
          </span>
        </h1>
        <p className="text-[13px] mb-10" style={{color:"var(--th-text-muted)"}}>
          Live Yahoo Finance data + AI-powered analysis. Every report is unique. No hardcoded content.
        </p>
      </motion.div>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.7,delay:0.15}}
        className="relative max-w-xl mx-auto mb-8">
        <div className="relative flex items-center rounded-2xl overflow-hidden"
          style={{background:"var(--th-bg-card)",border:"1px solid var(--th-border-accent)",height:"56px"}}>
          <div className="absolute left-4"><Search size={17} style={{color:"var(--gold)"}}/></div>
          <input type="text" value={input}
            onChange={e=>setInput(e.target.value.toUpperCase())}
            onKeyDown={e=>e.key==="Enter"&&input.trim()&&onAnalyze(input.trim())}
            placeholder="RELIANCE, TCS, HDFCBANK, HAL, IRFC..."
            autoFocus
            className="w-full bg-transparent outline-none font-mono text-[14px] h-full pl-12 pr-28"
            style={{color:"var(--th-text-primary)"}}/>
          {input && (
            <button onClick={()=>setInput("")} className="absolute right-24" style={{color:"var(--th-text-faint)"}}>
              <X size={13}/>
            </button>
          )}
          <button onClick={()=>input.trim()&&onAnalyze(input.trim())}
            className="absolute right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold"
            style={{color:input?"var(--gold)":"var(--th-text-faint)",background:input?"var(--th-border-normal)":"rgba(255,255,255,0.03)",border:input?"1px solid var(--th-border-strong)":"1px solid rgba(255,255,255,0.05)"}}>
            Analyze <ArrowRight size={11}/>
          </button>
        </div>
      </motion.div>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.4}}>
        <div className="text-[8.5px] font-mono uppercase tracking-[0.2em] mb-3" style={{color:"var(--th-text-ultra-faint)"}}>Quick Analysis</div>
        <div className="flex flex-wrap justify-center gap-2">
          {QUICK_PICKS.map((t,i)=>(
            <motion.button key={t} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.06+0.5}}
              onClick={()=>onAnalyze(t)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10.5px] font-mono transition-all duration-200"
              style={{color:"var(--th-text-muted)",background:"rgba(255,255,255,0.02)",border:"1px solid var(--th-border-subtle)"}}
              onMouseEnter={e=>{const el=e.currentTarget as HTMLButtonElement;el.style.color="var(--gold)";el.style.borderColor="var(--th-border-accent)";el.style.background="var(--th-border-subtle)";}}
              onMouseLeave={e=>{const el=e.currentTarget as HTMLButtonElement;el.style.color="var(--th-text-muted)";el.style.borderColor="var(--th-border-subtle)";el.style.background="rgba(255,255,255,0.02)";}}>
              {t} <ArrowRight size={9}/>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   AI STATUS BADGE
═══════════════════════════════════════════════════════ */

type AiStatus = "thinking" | "complete" | null;

function AiBadge({ status }: { status: AiStatus }) {
  if (!status) return null;
  return (
    <AnimatePresence mode="wait">
      {status === "thinking" && (
        <motion.div key="thinking"
          initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
          className="fixed bottom-6 right-6 flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-mono font-bold z-50"
          style={{background:"rgba(192,132,252,0.1)",border:"1px solid rgba(192,132,252,0.35)",color:"var(--th-blue)",backdropFilter:"blur(12px)"}}>
          <span className="w-1.5 h-1.5 rounded-full animate-live-dot" style={{background:"var(--th-blue)"}}/>
          ◈ AI ANALYZING…
        </motion.div>
      )}
      {status === "complete" && (
        <motion.div key="complete"
          initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
          transition={{delay:0.1}}
          className="fixed bottom-6 right-6 flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-mono font-bold z-50"
          style={{background:"var(--th-green-bg)",border:"1px solid rgba(0,255,156,0.28)",color:"var(--positive)",backdropFilter:"blur(12px)"}}>
          <CheckCircle size={10}/>
          ✓ AI ENHANCED
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════ */

type State = "idle"|"loading"|"result"|"error";

export default function AnalyzePage() {
  const [state,     setState]   = useState<State>("idle");
  const [ticker,    setTicker]  = useState("");
  const [report,    setReport]  = useState<IntelligenceReport|null>(null);
  const [errMsg,    setErrMsg]  = useState<string>("");
  const [aiStatus,  setAiStatus] = useState<AiStatus>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const cancelStream = () => {
    try { readerRef.current?.cancel(); } catch { /* */ }
    readerRef.current = null;
  };

  const doFetch = async (t: string) => {
    cancelStream();
    setTicker(t);
    setState("loading");
    setReport(null);
    setErrMsg("");
    setAiStatus(null);

    let hasReport = false;

    try {
      const res = await fetch(`/api/intelligence/stream/${t}`, { cache: "no-store" });
      if (!res.ok || !res.body) throw new Error(`Server error ${res.status}`);

      const reader = res.body.getReader();
      readerRef.current = reader;
      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });

        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";

        for (const part of parts) {
          if (part.startsWith(":")) continue; // heartbeat comment
          const eventLine = part.match(/^event: (\w+)/m)?.[1];
          const dataLine  = part.split("\n").find(l => l.startsWith("data: "))?.slice(5);
          if (!eventLine || !dataLine) continue;

          try {
            const payload = JSON.parse(dataLine);

            if (eventLine === "quant" && payload.report?.ticker) {
              hasReport = true;
              setReport(payload.report);
              setState("result");
              setAiStatus("thinking");
            } else if (eventLine === "ai" && payload.report?.ticker) {
              setReport(payload.report);
              setAiStatus("complete");
              setTimeout(() => setAiStatus(null), 4_000);
            } else if (eventLine === "done") {
              setAiStatus(s => s === "thinking" ? null : s);
            } else if (eventLine === "error" && !hasReport) {
              setErrMsg(payload.message ?? "Analysis failed");
              setState("error");
            }
          } catch { /* malformed SSE data */ }
        }
      }
    } catch (err) {
      if (!hasReport) {
        setErrMsg(err instanceof Error ? err.message : "Network error — check connection");
        setState("error");
      }
    } finally {
      readerRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => () => cancelStream(), []);

  const handleAnalyze = (t: string) => doFetch(t);
  const handleRetry   = () => doFetch(ticker);
  const handleReset   = () => {
    cancelStream();
    setReport(null); setTicker(""); setState("idle"); setErrMsg(""); setAiStatus(null);
  };

  return (
    <div className="min-h-screen" style={{background:"var(--th-bg-page)"}}>
      <Navbar/>
      <MarketTicker/>
      <AiBadge status={aiStatus}/>
      <AnimatePresence mode="wait">
        {state==="idle"    && <motion.div key="idle"    initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><QueryInput onAnalyze={handleAnalyze}/></motion.div>}
        {state==="loading" && <motion.div key="loading" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><LoadingState ticker={ticker}/></motion.div>}
        {state==="error"   && <motion.div key="error"   initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
          <ErrorState error={errMsg} ticker={ticker} onReset={handleReset} onRetry={handleRetry}/></motion.div>}
        {state==="result"  && report && <motion.div key="result" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
          <AnalysisDisplay report={report} onReset={handleReset}/></motion.div>}
      </AnimatePresence>
      <footer className="px-4 py-6 mt-8" style={{borderTop:"1px solid var(--th-border-subtle)"}}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/ai" className="text-[8.5px] font-mono uppercase tracking-wider transition-colors" style={{color:"var(--th-text-faint)"}}
            onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.color="var(--gold)";}}
            onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.color="var(--th-text-faint)";}}>
            ← Intelligence Core
          </Link>
          <div className="text-[8.5px] font-mono uppercase tracking-wider" style={{color:"var(--th-text-ultra-faint)"}}>
            Live Data · AI Analysis · Not Investment Advice
          </div>
        </div>
      </footer>
    </div>
  );
}
