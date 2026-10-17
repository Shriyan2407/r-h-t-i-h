"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Brain, Activity, Clock, TrendingUp, TrendingDown,
  AlertTriangle, ArrowRight, ChevronLeft, Globe, Eye,
  X, CheckCircle, Zap, BarChart2, RefreshCw, Search,
  Shield, Star, Calendar,
} from "lucide-react";
import { Navbar }       from "@/components/Navbar";
import { MarketTicker } from "@/components/MarketTicker";
import type { HistoryAPIResponse } from "@/app/api/history/[ticker]/route";
import { historyProvenance } from "@/lib/history/provenance";
import type { TimelineEvent, NarrativeEra } from "@/lib/stockHistory";

/* ─── Quick picks ───────────────────────────────── */
const QUICK_PICKS = ["RELIANCE","TCS","HDFCBANK","ICICIBANK","BHARTIARTL","HAL","IRFC","ADANIENT","INFY","SBIN"];

/* ─── Colour helpers ────────────────────────────── */
function scoreColor(s: number): string {
  if (s >= 75) return "var(--positive)";
  if (s >= 55) return "var(--gold)";
  if (s >= 40) return "var(--neutral)";
  return "var(--negative)";
}

const SENT_COL: Record<string, { color: string; bg: string; border: string }> = {
  BULLISH:  { color: "var(--positive)", bg: "var(--th-green-bg)",   border: "rgba(0,255,156,0.25)"  },
  BEARISH:  { color: "var(--negative)", bg: "var(--th-red-bg)",   border: "rgba(255,77,77,0.25)"  },
  NEUTRAL:  { color: "var(--neutral)", bg: "rgba(255,184,0,0.09)",   border: "rgba(255,184,0,0.25)"  },
  MIXED:    { color: "var(--th-blue)", bg: "rgba(192,132,252,0.09)", border: "rgba(192,132,252,0.25)" },
};

const CAT_COL: Record<string, string> = {
  EARNINGS: "var(--gold)", MACRO: "var(--th-blue)", CORPORATE: "var(--positive)",
  REGULATORY: "#FB923C", SOCIAL: "var(--th-blue)", TECHNICAL: "#A78BFA",
  FUNDRAISE: "#10B981", CONTROVERSY: "var(--negative)",
};

const CAT_LABEL: Record<string, string> = {
  EARNINGS: "EARNINGS", MACRO: "MACRO EVENT", CORPORATE: "CORPORATE",
  REGULATORY: "REGULATORY", SOCIAL: "MARKET SENTIMENT", TECHNICAL: "TECHNICAL",
  FUNDRAISE: "FUNDRAISE", CONTROVERSY: "CONTROVERSY",
};

/* ─── Format event date from year + month ──────── */
function formatEventDate(event: TimelineEvent): string {
  if (event.month) return `${event.month} ${event.year}`;
  return String(event.year);
}

/* ─── Sentiment chart ──────────────────────────── */
function SentimentChart({ data }: { data: { year: number; score: number; label: string }[] }) {
  if (!data?.length) return null;
  const W = 280, H = 90, PAD = 18;
  const minY = Math.min(...data.map(d => d.score));
  const maxY = Math.max(...data.map(d => d.score));
  const range = maxY - minY || 1;
  const toX = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const toY = (s: number) => H - PAD - ((s - minY) / range) * (H - PAD * 2);
  const pts = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.score).toFixed(1)}`).join(" ");
  const fill = `${toX(0)},${H - PAD} ${pts} ${toX(data.length - 1)},${H - PAD}`;
  const avg  = Math.round(data.reduce((s, d) => s + d.score, 0) / data.length);
  const col  = scoreColor(avg);
  return (
    <div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`${col}28`} /><stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>
        <polygon points={fill} fill="url(#sg)" />
        <polyline points={pts} fill="none" stroke={col} strokeWidth="1.5"
          style={{ filter: `drop-shadow(0 0 4px ${col}50)` }} />
        {data.map((d, i) => (
          <circle key={i} cx={toX(i)} cy={toY(d.score)} r="2.5" fill={scoreColor(d.score)}
            style={{ filter: `drop-shadow(0 0 3px ${scoreColor(d.score)})` }} />
        ))}
        {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1).map((d, idx, arr) => {
          const origIdx = data.indexOf(d);
          return (
            <text key={d.year} x={toX(origIdx)} y={H - 2} textAnchor="middle"
              fill="var(--th-text-ultra-faint)" fontSize="6.5" fontFamily="monospace">{d.year}</text>
          );
        })}
      </svg>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[8px] font-mono" style={{ color: "var(--th-text-faint)" }}>
          Low: {minY} · Avg: {avg} · High: {maxY}
        </span>
        <span className="text-[8px] font-mono font-bold" style={{ color: col }}>
          Current: {data[data.length - 1]?.score ?? avg}/100
        </span>
      </div>
    </div>
  );
}

/* ─── Narrative era dots ─────────────────────────── */
function NarrativeSection({ eras }: { eras: NarrativeEra[] }) {
  if (!eras?.length) return null;
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-card)" }}>
      <div className="flex items-center gap-2 mb-4">
        <Activity size={11} style={{ color: "var(--gold)" }} />
        <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--th-text-faint)" }}>Narrative Evolution</span>
      </div>
      <div className="space-y-3">
        {eras.map((era, i) => (
          <motion.div key={era.period} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                style={{ background: era.color, boxShadow: `0 0 6px ${era.color}60` }} />
              {i < eras.length - 1 && (
                <div className="w-px flex-1 mt-1 min-h-[12px]" style={{ background: `${era.color}28` }} />
              )}
            </div>
            <div className="flex-1 pb-3">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: `${era.color}70` }}>
                  {era.period}
                </span>
                <span className="text-[9px] font-mono font-bold" style={{ color: era.color }}>
                  {era.sentiment}/100
                </span>
              </div>
              <div className="text-[11.5px] font-semibold mb-1"
                style={{ fontFamily: "var(--font-space-grotesk,sans-serif)", color: "var(--th-text-secondary)" }}>
                {era.title}
              </div>
              <p className="text-[10.5px] leading-relaxed" style={{ color: "var(--th-text-faint)" }}>{era.description}</p>
              <div className="mt-1 text-[9px] font-mono" style={{ color: `${era.color}50` }}>â—ˆ {era.dominant}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Event card ────────────────────────────────── */
function EventCard({ event, index }: { event: TimelineEvent; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  const sc       = SENT_COL[event.sentiment] ?? SENT_COL["NEUTRAL"];
  const catColor = CAT_COL[event.category]  ?? "#8A8A8A";
  const catLabel = CAT_LABEL[event.category] ?? event.category;
  const impCol   = scoreColor(event.impactScore);
  const dateStr  = formatEventDate(event);

  return (
    <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}>
      <div className="flex items-start gap-4 mb-4">

        {/* Timeline marker */}
        <div className="flex flex-col items-center flex-shrink-0 pt-1" style={{ width: "68px" }}>
          <div className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg text-center w-full"
            style={{ color: "var(--gold)", background: "var(--th-border-subtle)", border: "1px solid rgba(255,215,0,0.16)" }}>
            {dateStr}
          </div>
          <div className="w-px flex-1 mt-1.5 min-h-[24px]"
            style={{ background: "linear-gradient(to bottom,rgba(255,215,0,0.18),rgba(255,215,0,0.02))" }} />
        </div>

        {/* Card */}
        <div className="flex-1 rounded-xl overflow-hidden transition-all duration-200"
          style={{ background: "var(--th-bg-card)", border: `1px solid ${catColor}16` }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${catColor}30`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${catColor}16`; }}>

          <button onClick={() => setExpanded(!expanded)} className="w-full p-4 text-left">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[7.5px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider"
                  style={{ color: catColor, background: `${catColor}10`, border: `1px solid ${catColor}20` }}>
                  {catLabel}
                </span>
                <span className="text-[7.5px] font-mono px-1.5 py-0.5 rounded"
                  style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}>
                  {event.sentiment}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1">
                  <Star size={8} style={{ color: impCol }} fill={impCol} />
                  <span className="text-[9px] font-mono font-bold" style={{ color: impCol }}>
                    {event.impactScore}
                  </span>
                </div>
                <span className="text-[9px] font-mono" style={{ color: expanded ? "var(--gold)" : "var(--th-text-ultra-faint)" }}>
                  {expanded ? "â–²" : "â–¼"}
                </span>
              </div>
            </div>
            <h3 className="text-[13px] font-semibold leading-snug"
              style={{ fontFamily: "var(--font-space-grotesk,sans-serif)", color: "var(--th-text-soft)" }}>
              {event.headline}
            </h3>
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: `${catColor}10` }}>
                  <p className="text-[11.5px] leading-relaxed pt-3" style={{ color: "#7A7A7A" }}>
                    {event.context}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg" style={{ background: "var(--th-gold-bg)", border: "1px solid var(--th-border-subtle)" }}>
                      <div className="text-[8px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--th-gold-text-dim)" }}>
                        Market Reaction
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: "var(--th-text-dim)" }}>{event.marketReaction}</p>
                    </div>

                    <div className="p-3 rounded-lg" style={{ background: "var(--th-gold-bg)", borderLeft: "2px solid rgba(255,215,0,0.2)" }}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Brain size={9} style={{ color: "var(--gold)" }} />
                        <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "var(--th-gold-text-dim)" }}>
                          AI Institutional Read
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: "var(--th-text-muted)" }}>
                        {event.institutionalRead}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.012)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="text-[8px] font-mono uppercase tracking-wider mb-1" style={{ color: "var(--th-text-ultra-faint)" }}>
                        Retail / Social
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: "var(--th-text-muted)" }}>{event.retailSentiment}</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.012)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="text-[8px] font-mono uppercase tracking-wider mb-1" style={{ color: "var(--th-text-ultra-faint)" }}>
                        Long-Term Impact
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: "var(--th-text-muted)" }}>{event.longTermImpact}</p>
                    </div>
                  </div>

                  {/* Conviction bars */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { label: "Institutional", score: event.institutionalConf, color: "var(--th-blue)"  },
                      { label: "Retail Heat",   score: event.retailExcitement,  color: "var(--th-blue)"  },
                      { label: "LT Importance", score: event.ltImportance,      color: "var(--positive)"  },
                    ].map(s => (
                      <div key={s.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                        style={{ background: `${s.color}07`, border: `1px solid ${s.color}16` }}>
                        <span className="text-[8px] font-mono" style={{ color: `${s.color}60` }}>{s.label}:</span>
                        <span className="text-[10px] font-mono font-bold" style={{ color: s.color }}>{s.score}/100</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Phase legend ──────────────────────────────── */
function PhaseLegend({ timeline }: { timeline: TimelineEvent[] }) {
  const phases: Record<string, number> = {};
  timeline.forEach(e => {
    const decade = Math.floor(e.year / 5) * 5;
    const key = `${decade}–${decade + 4}`;
    phases[key] = (phases[key] ?? 0) + 1;
  });
  const bullish  = timeline.filter(e => e.sentiment === "BULLISH").length;
  const bearish  = timeline.filter(e => e.sentiment === "BEARISH").length;
  const avgImpact = Math.round(timeline.reduce((s, e) => s + e.impactScore, 0) / (timeline.length || 1));
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-subtle)" }}>
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={10} style={{ color: "var(--gold)" }} />
        <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--th-text-faint)" }}>
          Timeline Stats
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Bullish Events",  val: bullish,    color: "var(--positive)" },
          { label: "Bearish Events",  val: bearish,    color: "var(--negative)" },
          { label: "Avg Impact",      val: `${avgImpact}/100`, color: scoreColor(avgImpact) },
        ].map(s => (
          <div key={s.label} className="text-center p-2 rounded-lg"
            style={{ background: `${s.color}06`, border: `1px solid ${s.color}14` }}>
            <div className="text-[13px] font-mono font-bold" style={{ color: s.color }}>{s.val}</div>
            <div className="text-[7.5px] font-mono uppercase" style={{ color: `${s.color}50` }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Loading ───────────────────────────────────── */
const ARCH_MSGS = [
  "Accessing institutional memory archive...",
  "Fetching Yahoo Finance financial data...",
  "Retrieving company news history...",
  "Mapping corporate milestone events...",
  "Building narrative evolution timeline...",
  "Modeling institutional behavior patterns...",
  "Correlating macro events to stock cycles...",
  "Generating historical intelligence dossier...",
  "Finalizing company evolution archive...",
];

function LoadingState({ ticker }: { ticker: string }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setMsgIdx(i => Math.min(i + 1, ARCH_MSGS.length - 1));
      setProgress(p => Math.min(p + 100 / ARCH_MSGS.length, 95));
    }, 1600);
    return () => clearInterval(id);
  }, []);
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto mt-16 px-4">
      <div className="rounded-2xl p-8" style={{ background: "rgba(7,7,7,0.97)", border: "1px solid var(--th-border-normal)" }}>
        <div className="flex items-center gap-3 mb-7">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--th-border-card)", border: "1px solid var(--th-border-accent)" }}>
            <BookOpen size={17} style={{ color: "var(--gold)" }} />
          </div>
          <div>
            <div className="text-[13px] font-mono font-bold" style={{ color: "var(--th-text-primary)" }}>
              Building {ticker} Evolution Archive
            </div>
            <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-faint)" }}>
              Institutional Memory · Real Company History
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700] animate-live-dot" />
            <span className="text-[8.5px] font-mono" style={{ color: "var(--gold)" }}>LIVE</span>
          </div>
        </div>
        <div className="space-y-2 mb-6 min-h-[150px]">
          {ARCH_MSGS.slice(0, msgIdx + 1).map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2.5">
              <CheckCircle size={10} style={{ color: i === msgIdx ? "var(--gold)" : "var(--positive)", flexShrink: 0 }} />
              <span className="text-[10px] font-mono" style={{ color: i === msgIdx ? "var(--th-text-primary)" : "var(--th-text-ultra-faint)" }}>{msg}</span>
              {i === msgIdx && <span className="text-[10px] font-mono animate-blink" style={{ color: "var(--gold)" }}>â–ˆ</span>}
            </motion.div>
          ))}
        </div>
        <div className="h-0.5 rounded-full overflow-hidden mb-1.5" style={{ background: "var(--th-border-subtle)" }}>
          <motion.div className="h-full rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }}
            style={{ background: "linear-gradient(90deg,#C9A227,#FFD700)", boxShadow: "0 0 8px rgba(255,215,0,0.4)" }} />
        </div>
        <div className="text-right text-[8.5px] font-mono" style={{ color: "var(--th-text-ultra-faint)" }}>
          Compiling institutional archive...
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Error state ───────────────────────────────── */
function ErrorState({ error, ticker, onReset, onRetry }: {
  error: string; ticker: string; onReset: () => void; onRetry: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto mt-16 px-4">
      <div className="rounded-2xl p-8" style={{ background: "rgba(7,7,7,0.97)", border: "1px solid rgba(255,77,77,0.2)" }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--th-red-bg)", border: "1px solid rgba(255,77,77,0.2)" }}>
            <AlertTriangle size={17} style={{ color: "var(--negative)" }} />
          </div>
          <div>
            <div className="text-[13px] font-mono font-bold" style={{ color: "var(--th-text-primary)" }}>
              Archive load failed — {ticker}
            </div>
            <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--th-red-text-dim)" }}>
              Network or data error
            </div>
          </div>
        </div>
        <p className="text-[11px] font-mono p-3 rounded-lg mb-5"
          style={{ color: "#FF6B6B", background: "rgba(255,77,77,0.04)", border: "1px solid rgba(255,77,77,0.12)" }}>
          {error}
        </p>
        <div className="flex gap-3">
          <button onClick={onRetry}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-mono"
            style={{ color: "var(--gold)", background: "var(--th-border-card)", border: "1px solid var(--th-border-accent)" }}>
            <RefreshCw size={10} /> Retry
          </button>
          <button onClick={onReset}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-mono"
            style={{ color: "var(--th-text-muted)", background: "rgba(255,255,255,0.02)", border: "1px solid var(--th-border-card)" }}>
            <X size={10} /> New Stock
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Full history view ─────────────────────────── */
function HistoryView({ report, onReset }: { report: HistoryAPIResponse; onReset: () => void }) {
  const timeline = report.timeline ?? [];
  const prov     = historyProvenance(report._meta?.source);
  const avgSent  = report.sentimentChart?.length
    ? Math.round(report.sentimentChart.reduce((s, d) => s + d.score, 0) / report.sentimentChart.length)
    : 50;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-5">

      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={onReset}
            className="flex items-center gap-1 text-[10px] font-mono transition-colors"
            style={{ color: "var(--th-text-faint)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--gold)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-faint)"; }}>
            <ChevronLeft size={10} /> Archive
          </button>
          <span style={{ color: "var(--th-text-faint)" }}>/</span>
          <span className="text-[10px] font-mono" style={{ color: "var(--th-text-dim)" }}>{report.ticker}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded ml-1" title={prov.detail}
            style={{ color: prov.level === "caution" ? "var(--warning)" : "var(--th-text-muted)", border: "1px solid var(--th-border-normal)" }}>
            {prov.label}
          </span>
        </div>
        <button onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono"
          style={{ color: "var(--th-text-muted)", background: "rgba(255,255,255,0.02)", border: "1px solid var(--th-border-card)" }}>
          <Search size={10} /> New Search
        </button>
      </div>

      {prov.level === "caution" && (
        <p role="note" className="text-[12px] rounded-lg px-3 py-2" style={{ margin: 0, color: "var(--th-text-dim)", border: "1px solid var(--warning)" }}>
          <strong>{prov.label}.</strong> {prov.detail} Prices and headlines on this page come from Yahoo Finance and news feeds.
        </p>
      )}

      {/* Stock header */}
      <div className="rounded-2xl p-5 relative overflow-hidden"
        style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-normal)" }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 100% at 0% 50%, rgba(255,215,0,0.022) 0%, transparent 60%)" }} />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[8.5px] font-mono px-2 py-0.5 rounded"
                style={{ color: "var(--gold)", background: "var(--th-border-card)", border: "1px solid var(--th-border-accent)" }}>
                {report.ticker}
              </span>
              <span className="text-[8.5px] font-mono px-2 py-0.5 rounded"
                style={{ color: "var(--th-text-muted)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                {report.sector}
              </span>
              {report.cap && (
                <span className="text-[8px] font-mono" style={{ color: "var(--th-text-ultra-faint)" }}>{report.cap}</span>
              )}
            </div>
            <h1 className="font-bold mb-1"
              style={{ fontFamily: "var(--font-space-grotesk,sans-serif)", fontSize: "clamp(18px,3vw,26px)", color: "var(--th-text-primary)" }}>
              {report.name}
            </h1>
            <p className="text-[11px] italic max-w-2xl" style={{ color: "var(--th-text-faint)" }}>
              &ldquo;{report.oneLiner}&rdquo;
            </p>
            {report._meta?.currentPrice && (
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[11px] font-mono font-bold" style={{ color: "var(--th-text-primary)" }}>
                  ₹{report._meta.currentPrice.toFixed(2)}
                </span>
                {report._meta.priceChange != null && (
                  <span className="text-[10px] font-mono"
                    style={{ color: report._meta.priceChange >= 0 ? "var(--positive)" : "var(--negative)" }}>
                    {report._meta.priceChange >= 0 ? "+" : ""}{report._meta.priceChange.toFixed(2)}% today
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background: `${(SENT_COL[report.currentSentiment ?? "NEUTRAL"] ?? SENT_COL["NEUTRAL"]).bg}`, border: `1px solid ${(SENT_COL[report.currentSentiment ?? "NEUTRAL"] ?? SENT_COL["NEUTRAL"]).border}` }}>
              <span className="w-1.5 h-1.5 rounded-full animate-live-dot"
                style={{ background: (SENT_COL[report.currentSentiment ?? "NEUTRAL"] ?? SENT_COL["NEUTRAL"]).color }} />
              <span className="text-[11px] font-mono font-bold uppercase"
                style={{ color: (SENT_COL[report.currentSentiment ?? "NEUTRAL"] ?? SENT_COL["NEUTRAL"]).color }}>
                {report.currentSentiment}
              </span>
            </div>
            <div className="text-[8.5px] font-mono text-right" style={{ color: "var(--th-text-ultra-faint)" }}>
              {timeline.length} timeline events · {report._meta?.newsCount ?? 0} articles
            </div>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">

        {/* LEFT: Timeline */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <Clock size={11} style={{ color: "var(--gold)" }} />
            <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--th-text-faint)" }}>
              Historical Intelligence Timeline
            </span>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[8px] font-mono" style={{ color: "var(--th-text-faint)" }}>
                {timeline[0] ? `${timeline[0].year} – ${timeline[timeline.length - 1]?.year ?? "Present"}` : ""}
              </span>
              <span className="text-[8px] font-mono" style={{ color: "var(--th-text-ultra-faint)" }}>Click to expand</span>
            </div>
          </div>
          {timeline.map((event, i) => (
            <EventCard key={`${event.year}-${i}`} event={event} index={i} />
          ))}
        </div>

        {/* RIGHT: Sidebar */}
        <div className="space-y-4">

          {/* Sentiment chart */}
          {(report.sentimentChart?.length ?? 0) > 0 && (
            <div className="rounded-xl p-4" style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-card)" }}>
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 size={10} style={{ color: "var(--gold)" }} />
                <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--th-text-faint)" }}>
                  Sentiment Evolution
                </span>
                <span className="ml-auto text-[8px] font-mono font-bold"
                  style={{ color: scoreColor(avgSent) }}>
                  Avg {avgSent}/100
                </span>
              </div>
              <SentimentChart data={report.sentimentChart ?? []} />
            </div>
          )}

          {/* Timeline stats */}
          {timeline.length > 0 && <PhaseLegend timeline={timeline} />}

          {/* Narrative evolution */}
          {(report.narrativeEvolution?.length ?? 0) > 0 && (
            <NarrativeSection eras={report.narrativeEvolution ?? []} />
          )}

          {/* Smart money */}
          {report.smartMoneyAnalysis && (
            <div className="rounded-xl p-4" style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-card)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Eye size={10} style={{ color: "var(--gold)" }} />
                <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--th-text-faint)" }}>
                  Smart Money History
                </span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--th-text-muted)" }}>
                {report.smartMoneyAnalysis}
              </p>
            </div>
          )}

          {/* Macro */}
          {report.macroConnections && (
            <div className="rounded-xl p-4" style={{ background: "var(--th-bg-card)", border: "1px solid rgba(38,189,248,0.08)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Globe size={10} style={{ color: "var(--th-blue)" }} />
                <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--th-text-faint)" }}>
                  Macro Connections
                </span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--th-text-muted)" }}>
                {report.macroConnections}
              </p>
            </div>
          )}

          {/* Key risks */}
          {(report.keyRisks?.length ?? 0) > 0 && (
            <div className="rounded-xl p-4" style={{ background: "var(--th-bg-card)", border: "1px solid rgba(255,77,77,0.09)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Shield size={10} style={{ color: "var(--negative)" }} />
                <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--th-red-text-dim)" }}>
                  Key Risks
                </span>
              </div>
              <div className="space-y-2">
                {(report.keyRisks ?? []).map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[8px] font-mono mt-0.5 flex-shrink-0" style={{ color: "var(--negative)" }}>â–¸</span>
                    <span className="text-[10.5px] leading-relaxed" style={{ color: "var(--th-text-muted)" }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Latest developments */}
      {(report.latestDevelopments?.length ?? 0) > 0 && (
        <div className="rounded-2xl p-5" style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-normal)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Zap size={11} style={{ color: "var(--gold)" }} />
            <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--th-text-faint)" }}>
              Latest Developments
            </span>
            <span className="ml-auto text-[8px] font-mono px-2 py-0.5 rounded"
              style={{ color: "var(--positive)", background: "rgba(0,255,156,0.06)", border: "1px solid rgba(0,255,156,0.15)" }}>
              LIVE DATA
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(report.latestDevelopments ?? []).map((d, i) => {
              const sc = SENT_COL[d.sentiment] ?? SENT_COL["NEUTRAL"];
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.013)", border: `1px solid ${sc.color}14` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                      style={{ color: sc.color, background: sc.bg }}>{d.sentiment}</span>
                    <span className="text-[8px] font-mono" style={{ color: "var(--th-text-ultra-faint)" }}>{d.date}</span>
                  </div>
                  <h4 className="text-[12px] font-semibold mb-2 leading-snug"
                    style={{ fontFamily: "var(--font-space-grotesk,sans-serif)", color: "#E0E0E0" }}>
                    {d.headline}
                  </h4>
                  <div className="p-2.5 rounded-lg"
                    style={{ background: "var(--th-gold-bg)", borderLeft: "2px solid rgba(255,215,0,0.14)" }}>
                    <p className="text-[10.5px] leading-relaxed" style={{ color: "var(--th-text-dim)" }}>{d.aiRead}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      <div className="py-4 text-center">
        <p className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-faint)" }}>
          EquityLens company history · {prov.label} · {report._meta?.newsCount ?? 0} recent headlines listed · Not investment advice
        </p>
      </div>
    </div>
  );
}

/* ─── Query input ───────────────────────────────── */
function QueryInput({ onSearch }: { onSearch: (t: string) => void }) {
  const [input, setInput] = useState("");
  const submit = () => { const t = input.trim().toUpperCase(); if (t) onSearch(t); };
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="text-[9.5px] font-mono uppercase tracking-[0.3em] mb-4" style={{ color: "var(--th-text-faint)" }}>
          ◈ Institutional Intelligence Archive · Company Evolution Engine
        </div>
        <h1 className="font-bold mb-3 leading-tight"
          style={{ fontFamily: "var(--font-space-grotesk,sans-serif)", fontSize: "clamp(26px,5vw,50px)", color: "var(--th-text-primary)", letterSpacing: "-0.025em" }}>
          The Complete Evolution of{" "}
          <span style={{ background: "linear-gradient(135deg,#FFD700,#C9A227)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Any Indian Stock.
          </span>
        </h1>
        <p className="text-[13px] mb-10" style={{ color: "var(--th-text-muted)" }}>
          Company milestones. Narrative evolution. Institutional cycles. Smart money history.
          Every report is company-specific — RELIANCE is not TCS is not HAL.
        </p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.7 }}
        className="relative max-w-xl mx-auto mb-8">
        <div className="relative flex items-center rounded-2xl overflow-hidden"
          style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-accent)", height: "56px" }}>
          <div className="absolute left-4"><BookOpen size={16} style={{ color: "var(--gold)" }} /></div>
          <input type="text" value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="RELIANCE, TCS, HAL, HDFCBANK, IRFC..."
            autoFocus
            className="w-full bg-transparent outline-none font-mono text-[13px] pl-12 pr-28 h-full"
            style={{ color: "var(--th-text-primary)" }} />
          {input && (
            <button onClick={() => setInput("")} className="absolute right-24" style={{ color: "var(--th-text-faint)" }}>
              <X size={13} />
            </button>
          )}
          <button onClick={submit}
            className="absolute right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold"
            style={{ color: input ? "var(--gold)" : "var(--th-text-faint)", background: input ? "var(--th-border-normal)" : "rgba(255,255,255,0.03)", border: input ? "1px solid var(--th-border-strong)" : "1px solid rgba(255,255,255,0.05)" }}>
            Search <ArrowRight size={10} />
          </button>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        <div className="text-[8.5px] font-mono uppercase tracking-[0.2em] mb-3" style={{ color: "var(--th-text-ultra-faint)" }}>
          Deep Archive Available
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {QUICK_PICKS.map((t, i) => (
            <motion.button key={t} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 + 0.55 }}
              onClick={() => onSearch(t)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10.5px] font-mono transition-all duration-200"
              style={{ color: "var(--th-text-muted)", background: "rgba(255,255,255,0.02)", border: "1px solid var(--th-border-subtle)" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.color = "var(--gold)"; el.style.borderColor = "var(--th-border-accent)"; el.style.background = "var(--th-border-subtle)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.color = "var(--th-text-muted)"; el.style.borderColor = "var(--th-border-subtle)"; el.style.background = "rgba(255,255,255,0.02)"; }}>
              {t} <ArrowRight size={9} />
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────── */
type State = "idle" | "loading" | "result" | "error";

export default function HistoryPage() {
  const [state,  setState]  = useState<State>("idle");
  const [ticker, setTicker] = useState("");
  const [report, setReport] = useState<HistoryAPIResponse | null>(null);
  const [errMsg, setErrMsg] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  const doFetch = async (t: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setTicker(t);
    setState("loading");
    setReport(null);
    setErrMsg("");

    try {
      const res  = await fetch(`/api/history/${t}`, { cache: "no-store", signal: ctrl.signal });
      const data = await res.json();
      if (data?.ticker) {
        setReport(data as HistoryAPIResponse);
        setState("result");
      } else {
        setErrMsg(data?.error ?? `Unexpected response for ${t}`);
        setState("error");
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setErrMsg(err instanceof Error ? err.message : "Network error");
      setState("error");
    }
  };

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleSearch = (t: string) => doFetch(t);
  const handleRetry  = () => doFetch(ticker);
  const handleReset  = () => {
    abortRef.current?.abort();
    setReport(null); setTicker(""); setState("idle"); setErrMsg("");
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--th-bg-page)" }}>
      <Navbar /><MarketTicker />
      <AnimatePresence mode="wait">
        {state === "idle"    && <motion.div key="idle"    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><QueryInput onSearch={handleSearch} /></motion.div>}
        {state === "loading" && <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><LoadingState ticker={ticker} /></motion.div>}
        {state === "error"   && <motion.div key="error"   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><ErrorState error={errMsg} ticker={ticker} onReset={handleReset} onRetry={handleRetry} /></motion.div>}
        {state === "result"  && report && <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><HistoryView report={report} onReset={handleReset} /></motion.div>}
      </AnimatePresence>
      <footer className="px-4 py-6 mt-8" style={{ borderTop: "1px solid var(--th-border-subtle)" }}>
        <div className="max-w-[1440px] mx-auto flex justify-between items-center">
          <span className="text-[8.5px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-faint)" }}>
            EQUITYLENS Company Intelligence Archive
          </span>
          <span className="text-[8.5px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-faint)" }}>
            Not investment advice
          </span>
        </div>
      </footer>
    </div>
  );
}
