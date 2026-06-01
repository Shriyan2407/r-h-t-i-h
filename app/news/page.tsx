"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Activity, Globe, Brain, Zap,
  AlertTriangle, Radio, Eye, Layers, BarChart2, Flame,
  ArrowUpRight, ArrowDownRight, RefreshCw, Newspaper, Rss,
  MessageCircle, Signal, ExternalLink,
} from "lucide-react";
import { Navbar }          from "@/components/Navbar";
import { MarketTicker }   from "@/components/MarketTicker";
import { FearGreedMeter } from "@/components/ui/FearGreedMeter";
import type { NewsItem }   from "@/lib/services/newsAggregator";

/* ── Time formatting ─────────────────────────────────── */

function timeAgo(ageHours: number): string {
  if (ageHours < 0.02) return "just now";
  if (ageHours < 1)    return `${Math.round(ageHours * 60)} min ago`;
  if (ageHours < 24)   return `${ageHours.toFixed(1)} hr ago`;
  return `${Math.floor(ageHours / 24)}d ago`;
}

/* ── Category detection from title ─────────────────── */

function detectCategory(title: string): string {
  const t = title.toLowerCase();
  if (/q[1-4]\s*(fy)?\d*|results|earnings|profit|revenue|ebitda|pat\b|eps\b/.test(t)) return "EARNINGS";
  if (/rbi|fed|gdp|inflation|rate cut|rate hike|cpi|wpi|monetary|fiscal|budget/.test(t))  return "MACRO";
  if (/sebi|nse|bse|regulatory|penalty|fine|investigation|probe|ban|compliance/.test(t))   return "REGULATORY";
  if (/merger|acquisition|ipo|stake|buyback|dividend|fundrais|rights issue/.test(t))       return "CORPORATE";
  if (/breakout|support|resistance|200.dma|technical|moving average|volume/.test(t))       return "TECHNICAL";
  if (/nifty|sensex|fii|dii|index|market|broader market/.test(t))                          return "MACRO";
  return "NEWS";
}

/* ── Known ticker extraction from title ─────────────── */

const KNOWN_TICKER_MAP: Record<string, string> = {
  reliance: "RELIANCE", jio: "RELIANCE", "tata consultancy": "TCS", " tcs ": "TCS",
  "hdfc bank": "HDFCBANK", "hdfcbank": "HDFCBANK", infosys: "INFY",
  "icici bank": "ICICIBANK", airtel: "BHARTIARTL", bhartiartl: "BHARTIARTL",
  hal: "HAL", irfc: "IRFC", adani: "ADANIENT",
  sbi: "SBIN", "state bank": "SBIN", wipro: "WIPRO",
  "hcl tech": "HCLTECH", "tech mahindra": "TECHM", "kotak": "KOTAKBANK",
  maruti: "MARUTI", "bajaj finance": "BAJFINANCE", nestle: "NESTLEIND",
  "hindustan unilever": "HINDUNILVR", "larsen": "LT", "l&t": "LT",
  ntpc: "NTPC", ongc: "ONGC",
};

function extractTickers(title: string): string[] {
  const t = title.toLowerCase();
  const found = new Set<string>();
  for (const [pattern, ticker] of Object.entries(KNOWN_TICKER_MAP)) {
    if (t.includes(pattern)) found.add(ticker);
  }
  return [...found].slice(0, 4);
}

/* ── Generate institutional read from news ──────────── */

function generateAIRead(item: NewsItem): string {
  const { sentiment, summary, title } = item;
  const base = summary?.trim() || title;
  if (sentiment === "positive") {
    return `Institutional read: Constructive development — ${base.slice(0, 120)}. Smart money likely treating this as a confirmation signal. Watch delivery volumes for institutional positioning confirmation.`;
  }
  if (sentiment === "negative") {
    return `Institutional read: Warrants monitoring — ${base.slice(0, 120)}. Institutions will assess whether this is structural or transient before adjusting allocation. Wait for management commentary.`;
  }
  return `Institutional read: ${base.slice(0, 150)}. Monitor secondary implications for sector positioning and earnings revision trajectory.`;
}

/* ── Static sidebar data ────────────────────────────── */

const SECTORS_SENTIMENT = [
  { name:"Defense",    score:84, trend:"up",      note:"Institutional buying"   },
  { name:"Banking",    score:62, trend:"neutral",  note:"NIM watch"              },
  { name:"Energy",     score:76, trend:"up",      note:"RIL results catalyst"   },
  { name:"PSU Banks",  score:68, trend:"up",      note:"Rate cut pre-trade"     },
  { name:"Telecom",    score:77, trend:"up",      note:"ARPU expansion"         },
  { name:"Infra/PSU",  score:79, trend:"up",      note:"Govt capex front-load"  },
  { name:"IT",         score:32, trend:"down",    note:"Breakdown confirmed"    },
  { name:"FMCG",       score:44, trend:"down",    note:"Margin pressure"        },
  { name:"Midcap",     score:38, trend:"down",    note:"Retail euphoria = risk" },
  { name:"Auto",       score:58, trend:"neutral",  note:"Mixed EV signals"       },
  { name:"Pharma",     score:61, trend:"up",      note:"USFDA approvals"        },
  { name:"Metals",     score:41, trend:"down",    note:"China demand weak"      },
];

const NARRATIVES = [
  { theme:"Defense Supercycle",      heat:92, dir:"up",   status:"EARLY",       color:"var(--positive)" },
  { theme:"PSU Bank Re-rating",      heat:74, dir:"up",   status:"BUILDING",    color:"var(--gold)" },
  { theme:"India Capex Machine",     heat:81, dir:"up",   status:"BUILDING",    color:"var(--positive)" },
  { theme:"IT Sector Weakness",      heat:76, dir:"down", status:"ACCELERATING",color:"var(--negative)" },
  { theme:"ARPU Expansion (Telecom)",heat:71, dir:"up",   status:"BUILDING",    color:"var(--gold)" },
  { theme:"Midcap Mania / FOMO",     heat:88, dir:"down", status:"DANGEROUS",   color:"var(--negative)" },
  { theme:"Rate Cut Pre-Trade",      heat:67, dir:"up",   status:"EMERGING",    color:"var(--gold)" },
  { theme:"Smallcap Exit Liquidity", heat:82, dir:"down", status:"CRITICAL",    color:"var(--negative)" },
  { theme:"FII Re-entry Play",       heat:58, dir:"up",   status:"EARLY",       color:"var(--th-blue)" },
  { theme:"Green Energy Capex",      heat:64, dir:"up",   status:"EMERGING",    color:"var(--positive)" },
  { theme:"US Macro Headwinds",      heat:70, dir:"down", status:"ELEVATED",    color:"var(--negative)" },
  { theme:"Gold / Safe Haven Bid",   heat:55, dir:"up",   status:"FORMING",     color:"var(--neutral)" },
];

const SOCIAL_PLATFORMS = [
  { name:"Twitter/X",   icon:"𝕏",  bullish:64, bearish:24, volume:"HIGH",    note:"Finance influencer consensus: neutral-bullish. Real-time sentiment tracking active." },
  { name:"Reddit",      icon:"𝕽",  bullish:58, bearish:31, volume:"EXTREME", note:"r/IndiaInvestments: smallcap FOMO threads elevated. Red flag for contrarians." },
  { name:"StockTwits",  icon:"𝕊",  bullish:71, bearish:18, volume:"MODERATE",note:"Retail bias strongly bullish. Confirmation bias at elevated levels — caution warranted." },
  { name:"Telegram",    icon:"✈",  bullish:78, bearish:14, volume:"EXTREME", note:"Multiple tip channels showing unusual activity. Distribution risk elevated." },
];

/* ── Colour helpers ─────────────────────────────────── */

function scoreColor(s: number) {
  if (s >= 70) return "var(--positive)";
  if (s >= 55) return "var(--gold)";
  if (s >= 40) return "var(--neutral)";
  return "var(--negative)";
}

const CAT_COL: Record<string, string> = {
  MACRO:"var(--th-blue)", EARNINGS:"var(--gold)", TECHNICAL:"var(--th-blue)",
  SOCIAL:"#FB923C", SECTOR:"var(--positive)", REGULATORY:"var(--negative)",
  CORPORATE:"#A78BFA", FUNDRAISE:"#34D399", NEWS:"#94A3B8",
};

const SENT_DISPLAY: Record<string, { label:string; color:string; bg:string }> = {
  positive: { label:"BULLISH",  color:"var(--positive)", bg:"var(--th-green-bg)"  },
  negative: { label:"BEARISH",  color:"var(--negative)", bg:"var(--th-red-bg)"  },
  neutral:  { label:"NEUTRAL",  color:"var(--neutral)", bg:"rgba(255,184,0,0.09)"  },
};

/* ═══════════════════════════════════════════════════════
   REGIME HEADER
═══════════════════════════════════════════════════════ */

function RegimeHeader({ fgValue, aiConf, lastUpdated }: { fgValue:number; aiConf:number; lastUpdated:string }) {
  return (
    <div className="px-4 sm:px-6 py-3"
      style={{ background:"var(--th-bg-elevated)", borderBottom:"1px solid var(--th-border-normal)" }}>
      <div className="max-w-[1600px] mx-auto flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00FF9C] animate-live-dot" />
          <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color:"var(--th-text-faint)" }}>
            MARKET KA BAADSHAH News Intelligence Core
          </span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {[
            { label:"Market Regime",  value:"RISK-ON",     color:"var(--positive)" },
            { label:"Sentiment",      value:"BULLISH",     color:"var(--positive)" },
            { label:"Fear/Greed",     value:`${fgValue}`,  color:scoreColor(fgValue) },
            { label:"AI Confidence",  value:`${aiConf}%`,  color:"var(--gold)" },
            { label:"Active Alerts",  value:"3",           color:"var(--negative)" },
          ].map(m => (
            <div key={m.label} className="flex items-center gap-1.5">
              <span className="text-[8.5px] font-mono uppercase tracking-wider" style={{ color:"var(--th-text-ultra-faint)" }}>
                {m.label}:
              </span>
              <span className="text-[10px] font-mono font-bold" style={{ color:m.color }}>
                {m.value}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700] animate-live-dot" />
          <span className="text-[8.5px] font-mono" style={{ color:"var(--th-text-ultra-faint)" }}>
            {lastUpdated ? `Updated ${lastUpdated}` : "Fetching live feed…"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   NEWS CARD (real data)
═══════════════════════════════════════════════════════ */

interface DisplayItem {
  id:         number;
  category:   string;
  sentiment:  string;
  headline:   string;
  aiRead:     string;
  tickers:    string[];
  impact:     number;
  source:     string;
  timeAgoStr: string;
  isBreaking: boolean;
  url:        string;
}

function toDisplayItem(item: NewsItem, idx: number): DisplayItem {
  const sentKey = item.sentiment as string;
  const sd      = SENT_DISPLAY[sentKey] ?? SENT_DISPLAY["neutral"];
  // Impact score derived from relevance × 100, clamped 30–95
  const impact  = Math.min(95, Math.max(30, Math.round(item.relevance * 100)));

  return {
    id:         idx,
    category:   detectCategory(item.title),
    sentiment:  sd.label,
    headline:   item.title,
    aiRead:     generateAIRead(item),
    tickers:    extractTickers(item.title),
    impact,
    source:     item.source.split(" / ")[0], // shorten "Google News — NSE India" → "Google News"
    timeAgoStr: timeAgo(item.ageHours),
    isBreaking: item.ageHours < 0.5,
    url:        item.url,
  };
}

function NewsCard({ item, isNew = false }: { item: DisplayItem; isNew?: boolean }) {
  const sc   = Object.values(SENT_DISPLAY).find(s => s.label === item.sentiment) ?? SENT_DISPLAY["neutral"];
  const cc   = CAT_COL[item.category] ?? "#8A8A8A";
  const impCol = scoreColor(item.impact);

  return (
    <motion.div
      initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
      transition={{ duration:0.35 }}
      className="p-4 rounded-xl transition-all duration-300"
      style={{ background:"var(--th-bg-card)", border:"1px solid var(--th-border-subtle)" }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "var(--th-border-accent)";
        el.style.boxShadow   = "0 8px 30px rgba(0,0,0,0.5)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "var(--th-border-subtle)";
        el.style.boxShadow   = "none";
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {(isNew || item.isBreaking) && (
            <span className="text-[7.5px] font-mono font-bold px-2 py-0.5 rounded animate-gold-pulse"
              style={{ color:"var(--negative)", background:"var(--th-red-bg-strong)", border:"1px solid rgba(255,77,77,0.3)" }}>
              LIVE
            </span>
          )}
          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded"
            style={{ color:cc, background:`${cc}12`, border:`1px solid ${cc}28` }}>
            {item.category}
          </span>
          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded"
            style={{ color:sc.color, background:sc.bg }}>
            {item.sentiment}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1">
            <Zap size={8} style={{ color:impCol }} />
            <span className="text-[9px] font-mono font-bold" style={{ color:impCol }}>{item.impact}</span>
          </div>
          <span className="text-[8px] font-mono" style={{ color:"var(--th-text-ultra-faint)" }}>{item.timeAgoStr}</span>
        </div>
      </div>

      {/* Headline */}
      <h3 className="text-[13px] font-semibold mb-2 leading-snug"
        style={{ fontFamily:"var(--font-space-grotesk, sans-serif)", color:"var(--th-text-soft)" }}>
        {item.url ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer"
            className="hover:underline" style={{ textDecoration:"none" }}>
            {item.headline}
            <ExternalLink size={10} className="inline ml-1 opacity-40" />
          </a>
        ) : item.headline}
      </h3>

      {/* AI Read */}
      <div className="p-3 rounded-lg mb-3"
        style={{ background:"var(--th-gold-bg)", borderLeft:"2px solid rgba(255,215,0,0.2)" }}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Brain size={9} style={{ color:"var(--gold)" }} />
          <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color:"var(--th-gold-text-dim)" }}>
            AI Intelligence Read
          </span>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color:"var(--th-text-dim)" }}>
          {item.aiRead}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {item.tickers.length > 0 ? item.tickers.map(t => (
            <span key={t} className="text-[8.5px] font-mono px-1.5 py-0.5 rounded"
              style={{ color:"var(--gold)", background:"var(--th-border-subtle)", border:"1px solid var(--th-border-normal)" }}>
              {t}
            </span>
          )) : (
            <span className="text-[8px] font-mono" style={{ color:"var(--th-text-ultra-faint)" }}>MARKET</span>
          )}
        </div>
        <span className="text-[8.5px] font-mono truncate max-w-[140px]" style={{ color:"var(--th-text-ultra-faint)" }}>
          {item.source}
        </span>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   TRENDING TICKERS (static decorative — real data TBD)
═══════════════════════════════════════════════════════ */

const STATIC_TRENDING = [
  { ticker:"RELIANCE",   mentions:4820, change:"+2.8%", trend:"up",   buzz:"Extreme",    sentiment:"BULLISH" },
  { ticker:"HDFCBANK",   mentions:3940, change:"-3.1%", trend:"down", buzz:"High",       sentiment:"BEARISH" },
  { ticker:"HAL",        mentions:2870, change:"+4.2%", trend:"up",   buzz:"Surging",    sentiment:"BULLISH" },
  { ticker:"ADANIENT",   mentions:2640, change:"+1.9%", trend:"up",   buzz:"Suspicious", sentiment:"CAUTION" },
  { ticker:"TCS",        mentions:2210, change:"-1.4%", trend:"down", buzz:"Moderate",   sentiment:"BEARISH" },
  { ticker:"NIFTY50",    mentions:1980, change:"+0.8%", trend:"up",   buzz:"High",       sentiment:"BULLISH" },
  { ticker:"NTPC",       mentions:1640, change:"+2.1%", trend:"up",   buzz:"Growing",    sentiment:"BULLISH" },
  { ticker:"BHARTIARTL", mentions:1420, change:"+1.3%", trend:"up",   buzz:"Moderate",   sentiment:"BULLISH" },
];

const SENT_COL: Record<string,{ color:string; bg:string }> = {
  BULLISH: { color:"var(--positive)", bg:"var(--th-green-bg)"  },
  BEARISH: { color:"var(--negative)", bg:"var(--th-red-bg)"  },
  NEUTRAL: { color:"var(--neutral)", bg:"rgba(255,184,0,0.09)"  },
  CAUTION: { color:"var(--neutral)", bg:"rgba(255,184,0,0.09)"  },
};

function TrendingPanel() {
  return (
    <div className="rounded-xl p-4" style={{ background:"var(--th-bg-card)", border:"1px solid var(--th-border-card)" }}>
      <div className="flex items-center gap-2 mb-4">
        <Flame size={11} style={{ color:"var(--gold)" }} />
        <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color:"var(--th-text-faint)" }}>
          Trending Tickers
        </span>
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FF4D4D] animate-live-dot" />
      </div>
      <div className="space-y-2">
        {STATIC_TRENDING.map((t, i) => {
          const sc   = SENT_COL[t.sentiment] ?? SENT_COL["NEUTRAL"];
          const isUp = t.trend === "up";
          return (
            <motion.div key={t.ticker}
              initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-2.5 p-2 rounded-lg transition-all duration-200 cursor-default"
              style={{ border:"1px solid transparent" }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background  = "var(--th-gold-bg-hover)";
                el.style.borderColor = "var(--th-border-normal)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background  = "transparent";
                el.style.borderColor = "transparent";
              }}
            >
              <span className="text-[9px] font-mono" style={{ color:"var(--th-text-ultra-faint)", width:"14px", textAlign:"right" }}>
                {i+1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-mono font-bold" style={{ color:"var(--th-text-primary)" }}>{t.ticker}</span>
                  <span className="text-[10px] font-mono font-semibold"
                    style={{ color: isUp ? "var(--positive)" : "var(--negative)" }}>
                    {isUp ? "▲" : "▼"} {t.change.replace("+","").replace("-","")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-mono px-1 py-0.5 rounded"
                    style={{ color:sc.color, background:sc.bg, fontSize:"7.5px" }}>
                    {t.sentiment}
                  </span>
                  <span className="text-[7.5px] font-mono" style={{ color:"var(--th-text-ultra-faint)" }}>
                    {t.mentions.toLocaleString()} mentions
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTOR SENTIMENT GRID
═══════════════════════════════════════════════════════ */

function SectorGrid() {
  return (
    <div className="rounded-xl p-4" style={{ background:"var(--th-bg-card)", border:"1px solid var(--th-border-card)" }}>
      <div className="flex items-center gap-2 mb-4">
        <Layers size={11} style={{ color:"var(--gold)" }} />
        <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color:"var(--th-text-faint)" }}>
          Sector Intelligence
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {SECTORS_SENTIMENT.map((s, i) => {
          const col = scoreColor(s.score);
          return (
            <motion.div key={s.name}
              initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
              transition={{ delay: i * 0.04 }}
              className="p-2 rounded-lg cursor-default transition-all duration-200"
              style={{ background:`${col}07`, border:`1px solid ${col}18` }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${col}40`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${col}18`; }}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] font-mono font-semibold truncate" style={{ color:"var(--th-text-secondary)" }}>
                  {s.name}
                </span>
                <span className="text-[9px] font-mono font-bold" style={{ color:col }}>{s.score}</span>
              </div>
              <div className="h-0.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.04)" }}>
                <motion.div className="h-full rounded-full"
                  initial={{ width:0 }} animate={{ width:`${s.score}%` }}
                  transition={{ duration:0.8, delay: i*0.04 + 0.2 }}
                  style={{ background:col }} />
              </div>
              <div className="text-[7.5px] font-mono mt-0.5" style={{ color:"var(--th-text-ultra-faint)" }}>{s.note}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   NARRATIVE GRID
═══════════════════════════════════════════════════════ */

function NarrativeGrid({ count }: { count: number }) {
  return (
    <div className="rounded-xl p-5" style={{ background:"var(--th-bg-card)", border:"1px solid var(--th-border-card)" }}>
      <div className="flex items-center gap-2 mb-4">
        <Activity size={11} style={{ color:"var(--gold)" }} />
        <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color:"var(--th-text-faint)" }}>
          Narrative Heatmap
        </span>
        <div className="ml-auto text-[8px] font-mono" style={{ color:"var(--th-text-ultra-faint)" }}>
          {NARRATIVES.length} active narratives
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {NARRATIVES.sort((a,b) => b.heat - a.heat).map((n, i) => {
          const size = n.heat >= 80 ? "text-[11px] px-3 py-2" : n.heat >= 65 ? "text-[10px] px-2.5 py-1.5" : "text-[9px] px-2 py-1";
          return (
            <motion.div key={n.theme}
              initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-lg font-mono font-semibold cursor-default transition-all duration-300 ${size}`}
              style={{ color:n.color, background:`${n.color}10`, border:`1px solid ${n.color}22` }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background  = `${n.color}18`;
                el.style.borderColor = `${n.color}45`;
                el.style.boxShadow   = `0 0 12px ${n.color}15`;
                el.style.transform   = "translateY(-1px)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background  = `${n.color}10`;
                el.style.borderColor = `${n.color}22`;
                el.style.boxShadow   = "none";
                el.style.transform   = "translateY(0)";
              }}
            >
              <div className="flex items-center gap-1.5">
                {n.dir === "up" ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {n.theme}
              </div>
              <div className="text-[7px] mt-0.5 opacity-60">{n.status} · {n.heat}/100</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SOCIAL SENTIMENT PANEL
═══════════════════════════════════════════════════════ */

function SocialSentiment() {
  return (
    <div className="rounded-xl p-4" style={{ background:"var(--th-bg-card)", border:"1px solid var(--th-border-card)" }}>
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle size={11} style={{ color:"var(--gold)" }} />
        <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color:"var(--th-text-faint)" }}>
          Social Sentiment
        </span>
      </div>
      <div className="space-y-4">
        {SOCIAL_PLATFORMS.map((p, i) => (
          <motion.div key={p.name}
            initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }}
            transition={{ delay: i * 0.08 }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px]" style={{ color:"var(--gold)" }}>{p.icon}</span>
                <span className="text-[10px] font-mono font-semibold" style={{ color:"var(--th-text-secondary)" }}>{p.name}</span>
              </div>
              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                style={{ color:"var(--gold)", background:"var(--th-border-subtle)", border:"1px solid var(--th-border-normal)" }}>
                {p.volume}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden flex mb-1" style={{ background:"rgba(255,77,77,0.2)" }}>
              <motion.div className="h-full rounded-full"
                initial={{ width:0 }} animate={{ width:`${p.bullish}%` }}
                transition={{ duration:0.9, delay: i*0.08+0.2 }}
                style={{ background:"linear-gradient(90deg, #00CC7E, #00FF9C)", flexShrink:0 }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono" style={{ color:"var(--th-green-text-mid)" }}>{p.bullish}% Bullish</span>
              <span className="text-[8px] font-mono" style={{ color:"var(--th-red-text-mid)" }}>{p.bearish}% Bearish</span>
            </div>
            <p className="text-[9.5px] mt-1.5 leading-relaxed" style={{ color:"var(--th-text-ultra-faint)" }}>{p.note}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   INSTITUTIONAL FLOW
═══════════════════════════════════════════════════════ */

function InstitutionalFlow() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1200);
    return () => clearInterval(id);
  }, []);

  const flows = [
    { label:"FII Net",    value:"+₹2,840 Cr", color:"var(--positive)" },
    { label:"DII Net",    value:"+₹1,120 Cr", color:"var(--positive)" },
    { label:"Retail Net", value:"-₹890 Cr",   color:"var(--negative)" },
    { label:"Prop Desk",  value:"+₹340 Cr",   color:"var(--gold)" },
  ];

  return (
    <div className="rounded-xl p-4" style={{ background:"var(--th-bg-card)", border:"1px solid var(--th-border-card)" }}>
      <div className="flex items-center gap-2 mb-4">
        <Eye size={11} style={{ color:"var(--gold)" }} />
        <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color:"var(--th-text-faint)" }}>
          Institutional Flow
        </span>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-1 h-1 rounded-full bg-[#00FF9C] animate-live-dot" />
          <span className="text-[7.5px] font-mono" style={{ color:"var(--positive)" }}>TODAY</span>
        </div>
      </div>
      <div className="space-y-2 mb-3">
        {flows.map(f => (
          <div key={f.label} className="flex items-center justify-between p-2 rounded-lg"
            style={{ background:`${f.color}06`, border:`1px solid ${f.color}14` }}>
            <span className="text-[9.5px] font-mono" style={{ color:"var(--th-text-dim)" }}>{f.label}</span>
            <span className="text-[10.5px] font-mono font-bold" style={{ color:f.color }}>{f.value}</span>
          </div>
        ))}
      </div>
      <div className="p-2.5 rounded-lg text-center"
        style={{ background:"var(--th-green-bg)", border:"1px solid rgba(0,255,156,0.15)" }}>
        <div className="text-[8px] font-mono uppercase tracking-wider mb-0.5" style={{ color:"var(--th-green-text-dim)" }}>
          Net Smart Money
        </div>
        <div className="text-[15px] font-mono font-bold" style={{ color:"var(--positive)" }}>+₹3,410 Cr</div>
        <div className="text-[8px] font-mono" style={{ color:"var(--th-green-text-dim)" }}>ACCUMULATION</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   AI SCORES PANEL
═══════════════════════════════════════════════════════ */

function AIScoreRing({ label, value, color }: { label:string; value:number; color:string }) {
  const R = 28, circ = 2 * Math.PI * R;
  const arc = circ * 0.75;
  const fill = (value / 100) * arc;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="70" height="70" viewBox="0 0 70 70">
        <circle cx="35" cy="35" r={R} fill="none" stroke={`${color}10`} strokeWidth="4"
          strokeDasharray={`${arc} ${circ}`} strokeLinecap="round" transform="rotate(-225 35 35)" />
        <motion.circle cx="35" cy="35" r={R} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray="0 10000" strokeLinecap="round" transform="rotate(-225 35 35)"
          animate={{ strokeDasharray:`${fill} ${circ}` }}
          transition={{ duration:1.2, ease:[0.16,1,0.3,1] }}
          style={{ filter:`drop-shadow(0 0 4px ${color}60)` }} />
        <text x="35" y="33" textAnchor="middle" fill={color} fontSize="13" fontFamily="monospace" fontWeight="bold">
          {value}
        </text>
        <text x="35" y="44" textAnchor="middle" fill={`${color}50`} fontSize="6" fontFamily="monospace">
          /100
        </text>
      </svg>
      <span className="text-[8px] font-mono uppercase tracking-wider text-center" style={{ color:`${color}60` }}>
        {label}
      </span>
    </div>
  );
}

function AIScoresPanel({ fg }: { fg: number }) {
  return (
    <div className="rounded-xl p-4" style={{ background:"var(--th-bg-card)", border:"1px solid var(--th-border-card)" }}>
      <div className="flex items-center gap-2 mb-4">
        <Brain size={11} style={{ color:"var(--gold)" }} />
        <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color:"var(--th-text-faint)" }}>
          AI Score System
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <AIScoreRing label="News Impact"     value={74} color="var(--gold)"  />
        <AIScoreRing label="Sentiment"       value={68} color="var(--positive)"  />
        <AIScoreRing label="Fear/Greed"      value={fg} color={scoreColor(fg)} />
        <AIScoreRing label="Inst. Interest"  value={81} color="var(--th-blue)"  />
        <AIScoreRing label="Retail Euphoria" value={72} color="#FB923C"  />
        <AIScoreRing label="Risk Level"      value={44} color="var(--negative)"  />
      </div>
      <div className="mt-3 p-2.5 rounded-lg text-center"
        style={{ background:"var(--th-border-subtle)", border:"1px solid var(--th-border-normal)" }}>
        <div className="text-[8px] font-mono uppercase tracking-wider mb-0.5" style={{ color:"var(--th-gold-text-dim)" }}>
          Market Sentiment Regime
        </div>
        <div className="text-[13px] font-mono font-bold" style={{ color:"var(--gold)" }}>BULLISH</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LOADING SKELETON
═══════════════════════════════════════════════════════ */

function NewsCardSkeleton() {
  return (
    <div className="p-4 rounded-xl animate-pulse"
      style={{ background:"var(--th-bg-card)", border:"1px solid var(--th-border-subtle)" }}>
      <div className="flex gap-2 mb-3">
        <div className="h-4 w-14 rounded" style={{ background:"var(--th-border-subtle)" }} />
        <div className="h-4 w-12 rounded" style={{ background:"var(--th-border-subtle)" }} />
      </div>
      <div className="h-4 w-full rounded mb-1" style={{ background:"rgba(255,255,255,0.04)" }} />
      <div className="h-4 w-4/5 rounded mb-3" style={{ background:"rgba(255,255,255,0.04)" }} />
      <div className="h-16 rounded" style={{ background:"var(--th-gold-bg)" }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */

export default function NewsIntelligencePage() {
  const [feed,        setFeed]        = useState<DisplayItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [fgValue,     setFgValue]     = useState(62);
  const [aiConf,      setAiConf]      = useState(78);
  const [lastUpdated, setLastUpdated] = useState("");
  const [refreshing,  setRefreshing]  = useState(false);
  const [newIds,      setNewIds]      = useState<Set<number>>(new Set());
  const prevIdsRef = useRef<Set<number>>(new Set());

  const fetchFeed = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/news/market", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items: NewsItem[] = data.items ?? [];
      const display = items.map((item, idx) => toDisplayItem(item, idx));

      /* Detect new articles since last fetch */
      const prevSet = prevIdsRef.current;
      const newSet  = new Set<number>();
      display.forEach((d, i) => {
        if (i < 3 && prevSet.size > 0) newSet.add(d.id); // top 3 on refresh = "new"
      });
      if (prevSet.size > 0) setNewIds(newSet);
      prevIdsRef.current = new Set(display.map(d => d.id));

      setFeed(display);
      setError(null);
      setLastUpdated(new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch news");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /* Initial fetch */
  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  /* Auto-refresh every 60 seconds */
  useEffect(() => {
    const id = setInterval(() => fetchFeed(), 60_000);
    return () => clearInterval(id);
  }, [fetchFeed]);

  /* Fear/Greed and AI conf fluctuation (cosmetic) */
  useEffect(() => {
    const fg = setInterval(() => setFgValue(v => Math.max(40, Math.min(88, v + (Math.random()-0.5)*3))), 4500);
    const ai = setInterval(() => setAiConf(v => Math.max(68, Math.min(92, v + (Math.random()-0.5)*2))), 5200);
    return () => { clearInterval(fg); clearInterval(ai); };
  }, []);

  const breakingCount = feed.filter(n => n.isBreaking).length;

  return (
    <div className="min-h-screen" style={{ background:"var(--th-bg-page)" }}>
      <Navbar />
      <MarketTicker />
      <RegimeHeader fgValue={Math.round(fgValue)} aiConf={Math.round(aiConf)} lastUpdated={lastUpdated} />

      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-5">
        {/* Page header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-bold" style={{
              fontFamily:"var(--font-space-grotesk, sans-serif)",
              fontSize:"clamp(18px,3vw,26px)", color:"var(--th-text-primary)",
            }}>
              News{" "}
              <span style={{
                background:"linear-gradient(135deg, #FFD700, #C9A227)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
              }}>
                Intelligence Engine
              </span>
            </h1>
            <p className="text-[11px] font-mono mt-0.5" style={{ color:"var(--th-text-ultra-faint)" }}>
              Real-time sentiment · Smart money tracking · Narrative detection
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchFeed(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200"
              style={{ background:"var(--th-border-subtle)", border:"1px solid var(--th-border-normal)", cursor: refreshing ? "wait" : "pointer" }}
            >
              <RefreshCw size={10} style={{ color:"var(--gold)", animation: refreshing ? "spin 1s linear infinite" : "none" }} />
              <span className="text-[9px] font-mono" style={{ color:"var(--gold)" }}>
                {refreshing ? "UPDATING…" : "REFRESH"}
              </span>
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{ background:"var(--th-green-bg)", border:"1px solid rgba(0,255,156,0.15)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#00FF9C] animate-live-dot" />
              <span className="text-[9px] font-mono" style={{ color:"var(--positive)" }}>LIVE FEED</span>
            </div>
          </div>
        </div>

        {/* Main 3-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-4">

          {/* ─ LEFT COLUMN ─ */}
          <div className="space-y-4">
            <TrendingPanel />
            <SectorGrid />
          </div>

          {/* ─ CENTER COLUMN ─ */}
          <div className="space-y-4">
            {/* News feed */}
            <div className="rounded-xl overflow-hidden"
              style={{ background:"var(--th-bg-card)", border:"1px solid var(--th-border-card)" }}>
              <div className="flex items-center gap-2 p-4"
                style={{ borderBottom:"1px solid var(--th-border-subtle)" }}>
                <Newspaper size={11} style={{ color:"var(--gold)" }} />
                <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color:"var(--th-text-faint)" }}>
                  Intelligence Feed
                </span>
                <div className="ml-auto flex items-center gap-2">
                  {breakingCount > 0 && (
                    <span className="text-[8.5px] font-mono px-2 py-0.5 rounded"
                      style={{ color:"var(--negative)", background:"var(--th-red-bg)", border:"1px solid rgba(255,77,77,0.2)" }}>
                      {breakingCount} LIVE
                    </span>
                  )}
                  <span className="text-[8.5px] font-mono" style={{ color:"var(--th-text-ultra-faint)" }}>
                    {loading ? "loading…" : `${feed.length} items`}
                  </span>
                </div>
              </div>

              <div className="p-3 space-y-3 max-h-[820px] overflow-y-auto">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <NewsCardSkeleton key={i} />)
                ) : error ? (
                  <div className="p-6 text-center">
                    <AlertTriangle size={24} style={{ color:"var(--negative)", margin:"0 auto 8px" }} />
                    <p className="text-[11px] font-mono" style={{ color:"var(--negative)" }}>
                      Feed error: {error}
                    </p>
                    <button onClick={() => fetchFeed(true)}
                      className="mt-3 text-[10px] font-mono px-3 py-1.5 rounded"
                      style={{ color:"var(--gold)", border:"1px solid var(--th-border-strong)" }}>
                      Retry
                    </button>
                  </div>
                ) : feed.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-[11px] font-mono" style={{ color:"var(--th-text-faint)" }}>
                      No articles found. RSS feeds may be temporarily unavailable.
                    </p>
                  </div>
                ) : (
                  feed.map(item => (
                    <NewsCard
                      key={`${item.id}-${item.headline.slice(0,20)}`}
                      item={item}
                      isNew={newIds.has(item.id)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Narrative heatmap */}
            <NarrativeGrid count={feed.length} />
          </div>

          {/* ─ RIGHT COLUMN ─ */}
          <div className="space-y-4">
            <div className="rounded-xl p-4"
              style={{ background:"var(--th-bg-card)", border:"1px solid var(--th-border-card)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Signal size={11} style={{ color:"var(--gold)" }} />
                <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color:"var(--th-text-faint)" }}>
                  Fear / Greed Index
                </span>
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00FF9C] animate-live-dot" />
              </div>
              <FearGreedMeter value={Math.round(fgValue)} confidence={Math.round(aiConf)} />
            </div>

            <SocialSentiment />
            <InstitutionalFlow />
            <AIScoresPanel fg={Math.round(fgValue)} />

            {/* Risk alerts */}
            <div className="rounded-xl p-4" style={{ background:"var(--th-bg-card)", border:"1px solid rgba(255,77,77,0.12)" }}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={11} style={{ color:"var(--negative)" }} />
                <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color:"var(--th-red-text-dim)" }}>
                  Active Risk Alerts
                </span>
              </div>
              <div className="space-y-2">
                {[
                  { level:"HIGH",   msg:"Smallcap Reddit euphoria — exit liquidity risk" },
                  { level:"MEDIUM", msg:"IT sector technical breakdown confirmed"        },
                  { level:"LOW",    msg:"US Fed hawkishness — watch USDINR ₹84.50"      },
                ].map(a => {
                  const col = a.level==="HIGH" ? "var(--negative)" : a.level==="MEDIUM" ? "var(--neutral)" : "var(--gold)";
                  return (
                    <div key={a.msg} className="flex items-start gap-2 p-2 rounded-lg"
                      style={{ background:`${col}06`, border:`1px solid ${col}18` }}>
                      <span className="text-[7.5px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{ color:col, background:`${col}12` }}>
                        {a.level}
                      </span>
                      <span className="text-[10px] leading-relaxed" style={{ color:"var(--th-text-dim)" }}>{a.msg}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 py-6 mt-6" style={{ borderTop:"1px solid var(--th-border-subtle)" }}>
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[8.5px] font-mono uppercase tracking-wider" style={{ color:"var(--th-text-ultra-faint)" }}>
            MARKET KA BAADSHAH News Intelligence · Live Data · Auto-refresh 60s · v3.0
          </span>
          <span className="text-[8.5px] font-mono uppercase tracking-wider" style={{ color:"var(--th-text-ultra-faint)" }}>
            Not investment advice · For institutional research only
          </span>
        </div>
      </footer>
    </div>
  );
}
