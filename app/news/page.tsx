"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Activity, Globe, Brain, Zap,
  AlertTriangle, Radio, Eye, Layers, BarChart2, Flame,
  ArrowUpRight, ArrowDownRight, RefreshCw, Newspaper, Rss,
  MessageCircle, Signal,
} from "lucide-react";
import { Navbar }          from "@/components/Navbar";
import { MarketTicker }   from "@/components/MarketTicker";
import { FearGreedMeter } from "@/components/ui/FearGreedMeter";

/* ═══════════════════════════════════════════════════════
   STATIC INTELLIGENCE DATA
═══════════════════════════════════════════════════════ */

const NEWS_FEED = [
  {
    id:1, category:"MACRO", sentiment:"NEUTRAL",
    headline:"RBI Holds Repo Rate at 6.5% — Stance Language Softens",
    aiRead:"The rate pause is fully priced in. The real signal: 'withdrawal of accommodation' language has been quietly dropped, signaling rate cuts are closer than consensus expects. Banking sector re-rating is the likely follow-through trade. Smart money is already positioned.",
    tickers:["HDFCBANK","SBIN","ICICIBANK","KOTAKBANK"],
    impact:64, source:"RBI Policy Statement", timeAgo:"8 min ago", isBreaking:true,
  },
  {
    id:2, category:"EARNINGS", sentiment:"BULLISH",
    headline:"Reliance Q3 PAT Beats Estimates by 4.2% — Jio ARPU Expansion Accelerates",
    aiRead:"Jio ARPU hitting ₹193 vs consensus of ₹188 is the key beat. This validates the entire ARPU expansion thesis. Retail segment EBITDA showed first meaningful inflection. The institutional smart money was pre-positioned — delivery volumes for RIL were 67% above average in the 3 days before results.",
    tickers:["RELIANCE"],
    impact:88, source:"NSE Filing", timeAgo:"22 min ago", isBreaking:true,
  },
  {
    id:3, category:"MACRO", sentiment:"RISK-OFF",
    headline:"US Fed Signals 'Higher for Longer' — Two Rate Cuts in 2026 Now Base Case",
    aiRead:"Markets had priced 3 cuts. The revision to 2 cuts is a negative surprise. USDINR will face pressure — watch ₹84.50 as the key level. IT sector will face near-term multiple compression since US spending deferral risk rises. FII selling into Indian equities likely to continue for 2–3 sessions.",
    tickers:["TCS","INFY","HCLTECH","WIPRO"],
    impact:71, source:"Federal Reserve", timeAgo:"34 min ago", isBreaking:false,
  },
  {
    id:4, category:"TECHNICAL", sentiment:"BULLISH",
    headline:"NIFTY Breaks Above 25,000 — Volume Expansion Confirms Participation",
    aiRead:"Not a fake breakout. Volume on the breakout day was 2.1x the 20-day average — this is the kind of volume that signals institutional hand. The breakout is occurring above the 200-day EMA for the first time in 14 weeks. Technically, measured move target is 26,400. Breadth is strong: 78% of NIFTY50 constituents above their 50-day EMA.",
    tickers:["NIFTYBEES","JUNIORBEES"],
    impact:79, source:"NSE Market Data", timeAgo:"41 min ago", isBreaking:false,
  },
  {
    id:5, category:"SOCIAL", sentiment:"WARNING",
    headline:"Reddit r/IndiaInvestments: Massive Spike in Smallcap 'Multi-bagger' Threads",
    aiRead:"Dangerous signal. A 340% spike in threads discussing 'guaranteed multi-baggers' and 'operator-backed' smallcaps over 72 hours. Retail euphoria of this magnitude historically precedes a sharp smallcap correction within 4–6 weeks. This is textbook exit liquidity behavior — operators distribute to retail FOMO buyers. Avoid illiquid smallcaps with >200% 3-month returns.",
    tickers:["SMALLCAP","MIDCAP"],
    impact:52, source:"Reddit Intelligence", timeAgo:"55 min ago", isBreaking:false,
  },
  {
    id:6, category:"SECTOR", sentiment:"BULLISH",
    headline:"Defense Sector FII Inflows: ₹2,840 Cr Net Buying in 5 Sessions",
    aiRead:"This is not retail-driven. The systematic FII buying in defense stocks (HAL, BEL, MTAR, Cochin Shipyard) over 5 sessions represents institutional thesis building on India's defense capex story. The ₹1.72 lakh cr defense budget allocation is being repriced. Delivery percentages in HAL above 74% — genuine ownership accumulation, not speculative positioning.",
    tickers:["HAL","BEL","MTAR","COCHINSHIP"],
    impact:82, source:"NSE Delivery Data", timeAgo:"1.1 hr ago", isBreaking:false,
  },
  {
    id:7, category:"MACRO", sentiment:"BEARISH",
    headline:"WPI Inflation Rises to 3.4% — Input Cost Pressure on Margins",
    aiRead:"WPI uptick is specifically driven by manufactured products (+4.1%) and fuel (+6.8%). This directly compresses margins for auto, FMCG, and cement companies. The market hasn't fully repriced this — expect earnings cut warnings from FMCG and mid-tier auto companies in the coming 4–6 weeks. Rate cut probability for April MPC reduced from 68% to 51%.",
    tickers:["HINDUNILVR","NESTLEIND","MARUTI","ULTRATECH"],
    impact:66, source:"Ministry of Commerce", timeAgo:"1.4 hr ago", isBreaking:false,
  },
  {
    id:8, category:"EARNINGS", sentiment:"BEARISH",
    headline:"HDFC Bank NIM Misses — 4.05% vs Estimate of 4.18%",
    aiRead:"The NIM miss was expected by anyone tracking deposit rates, but the magnitude (13 bps miss) is worse than feared. The stock will face institutional selling on open — expect 3–5% decline. However, this is likely the low point. Asset quality remained pristine. This is a 'sell the fact' event for momentum traders, 'buy the dip' event for 18-month holders. Watch ₹1,380 as critical support.",
    tickers:["HDFCBANK"],
    impact:73, source:"NSE Filing", timeAgo:"2.1 hr ago", isBreaking:false,
  },
  {
    id:9, category:"SECTOR", sentiment:"BULLISH",
    headline:"Government Capex at 78% of Full-Year Target with 3 Months Remaining",
    aiRead:"The government has spent ₹7.5 lakh cr of the ₹9.5 lakh cr capex budget. Q4 front-loading is expected — this is bullish for infrastructure, road building, and PSU capital goods. L&T, NTPC, RVNL, and IRCON are the primary beneficiaries. The acceleration in government spending is also RBI's comfort signal for rate cuts — fiscal consolidation is on track.",
    tickers:["LT","NTPC","RVNL","IRCON","BHEL"],
    impact:77, source:"Ministry of Finance", timeAgo:"2.8 hr ago", isBreaking:false,
  },
  {
    id:10, category:"SOCIAL", sentiment:"NEUTRAL",
    headline:"Twitter/X: Unusual Spike in ADANIPORTS Mentions — 580% Above 30-Day Average",
    aiRead:"Social mention spike in ADANIPORTS is being driven by a combination of retail interest and two influential finance accounts with 200k+ followers posting 'technical breakout' narratives. However, delivery percentage data doesn't confirm institutional participation — this looks retail-driven. Potential for pump-and-dump dynamics. High risk for FOMO buyers entering now.",
    tickers:["ADANIPORTS"],
    impact:45, source:"X Intelligence Monitor", timeAgo:"3.2 hr ago", isBreaking:false,
  },
  {
    id:11, category:"MACRO", sentiment:"BULLISH",
    headline:"India FDI Inflows Hit $84 Billion in FY25 — Record High",
    aiRead:"FDI at $84B vs $71B in FY24 is a 18% YoY increase. Manufacturing sector received the largest share (32%), driven by PLI scheme benefits. This is a structural positive for INR stability and signals sustained global confidence in India's growth story. Medium-term positive for manufacturing stocks (Dixon, Kaynes, Syrma) and the broader capex theme.",
    tickers:["DIXON","KAYNES","SYRMA","BHARTIARTL"],
    impact:72, source:"DPIIT / Ministry of Commerce", timeAgo:"4.1 hr ago", isBreaking:false,
  },
  {
    id:12, category:"TECHNICAL", sentiment:"BEARISH",
    headline:"IT Sector Index Breaks 200-DMA — Institutional Selling Dominates",
    aiRead:"The NIFTY IT index breaking its 200-day moving average with 1.8x average volume is a technically significant event. It signals the sector has transitioned from 'weak' to 'distribution'. The combination of US 'higher for longer', H-1B cost pressure, and weakening deal TCV data creates a fundamental backdrop that supports the technical breakdown. Short-side trades make sense with stops above 200-DMA.",
    tickers:["TCS","INFY","WIPRO","HCLTECH","TECHM"],
    impact:69, source:"NSE Technical Analysis", timeAgo:"4.8 hr ago", isBreaking:false,
  },
];

const TRENDING_TICKERS = [
  { ticker:"RELIANCE",   mentions:4820, change:"+2.8%", trend:"up",   buzz:"Extreme",    sentiment:"BULLISH" },
  { ticker:"HDFCBANK",   mentions:3940, change:"-3.1%", trend:"down", buzz:"High",       sentiment:"BEARISH" },
  { ticker:"HAL",        mentions:2870, change:"+4.2%", trend:"up",   buzz:"Surging",    sentiment:"BULLISH" },
  { ticker:"ADANIPORTS", mentions:2640, change:"+1.9%", trend:"up",   buzz:"Suspicious", sentiment:"CAUTION" },
  { ticker:"TCS",        mentions:2210, change:"-1.4%", trend:"down", buzz:"Moderate",   sentiment:"BEARISH" },
  { ticker:"NIFTY50",    mentions:1980, change:"+0.8%", trend:"up",   buzz:"High",       sentiment:"BULLISH" },
  { ticker:"NTPC",       mentions:1640, change:"+2.1%", trend:"up",   buzz:"Growing",    sentiment:"BULLISH" },
  { ticker:"BHARTIARTL", mentions:1420, change:"+1.3%", trend:"up",   buzz:"Moderate",   sentiment:"BULLISH" },
];

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
  { theme:"Defense Supercycle",      heat:92, dir:"up",   status:"EARLY",       color:"#00FF9C" },
  { theme:"PSU Bank Re-rating",      heat:74, dir:"up",   status:"BUILDING",    color:"#FFD700" },
  { theme:"India Capex Machine",     heat:81, dir:"up",   status:"BUILDING",    color:"#00FF9C" },
  { theme:"IT Sector Weakness",      heat:76, dir:"down", status:"ACCELERATING",color:"#FF4D4D" },
  { theme:"ARPU Expansion (Telecom)",heat:71, dir:"up",   status:"BUILDING",    color:"#FFD700" },
  { theme:"Midcap Mania / FOMO",     heat:88, dir:"down", status:"DANGEROUS",   color:"#FF4D4D" },
  { theme:"Rate Cut Pre-Trade",      heat:67, dir:"up",   status:"EMERGING",    color:"#FFD700" },
  { theme:"Smallcap Exit Liquidity", heat:82, dir:"down", status:"CRITICAL",    color:"#FF4D4D" },
  { theme:"FII Re-entry Play",       heat:58, dir:"up",   status:"EARLY",       color:"#38BDF8" },
  { theme:"Green Energy Capex",      heat:64, dir:"up",   status:"EMERGING",    color:"#00FF9C" },
  { theme:"US Macro Headwinds",      heat:70, dir:"down", status:"ELEVATED",    color:"#FF4D4D" },
  { theme:"Gold / Safe Haven Bid",   heat:55, dir:"up",   status:"FORMING",     color:"#FFB800" },
];

const SOCIAL_PLATFORMS = [
  { name:"Twitter/X",   icon:"𝕏",  bullish:64, bearish:24, volume:"HIGH",    note:"Finance influencer consensus: neutral-bullish. Unusual RIL mention spike post-earnings." },
  { name:"Reddit",      icon:"𝕽",  bullish:58, bearish:31, volume:"EXTREME", note:"r/IndiaInvestments: high smallcap FOMO threads. Red flag for contrarians." },
  { name:"StockTwits",  icon:"𝕊",  bullish:71, bearish:18, volume:"MODERATE",note:"Retail bias strongly bullish. Confirmation bias at elevated levels — caution warranted." },
  { name:"Telegram",    icon:"✈",  bullish:78, bearish:14, volume:"EXTREME", note:"Multiple 'operator-backed' tip channels showing unusual activity. Distribution risk elevated." },
];

/* ── COLOUR HELPERS ─────────────────────────────────── */

function scoreColor(s: number) {
  if (s >= 70) return "#00FF9C";
  if (s >= 55) return "#FFD700";
  if (s >= 40) return "#FFB800";
  return "#FF4D4D";
}

const CAT_COL: Record<string,string> = {
  MACRO:"#38BDF8", EARNINGS:"#FFD700", TECHNICAL:"#C084FC",
  SOCIAL:"#FB923C", SECTOR:"#00FF9C", REGULATORY:"#FF4D4D",
};

const SENT_COL: Record<string,{ color:string; bg:string }> = {
  BULLISH:  { color:"#00FF9C", bg:"rgba(0,255,156,0.09)"  },
  BEARISH:  { color:"#FF4D4D", bg:"rgba(255,77,77,0.09)"  },
  NEUTRAL:  { color:"#FFB800", bg:"rgba(255,184,0,0.09)"  },
  "RISK-OFF":{ color:"#FB923C", bg:"rgba(251,146,60,0.09)"},
  WARNING:  { color:"#FF4D4D", bg:"rgba(255,77,77,0.09)"  },
  CAUTION:  { color:"#FFB800", bg:"rgba(255,184,0,0.09)"  },
};

/* ═══════════════════════════════════════════════════════
   FEAR / GREED GAUGE (SVG semicircle)
═══════════════════════════════════════════════════════ */

/* FearGreedGauge replaced by FearGreedMeter from components/ui/FearGreedMeter.tsx */

/* ═══════════════════════════════════════════════════════
   REGIME HEADER
═══════════════════════════════════════════════════════ */

function RegimeHeader({ fgValue, aiConf }: { fgValue:number; aiConf:number }) {
  return (
    <div className="px-4 sm:px-6 py-3"
      style={{ background:"rgba(8,8,8,0.97)", borderBottom:"1px solid rgba(255,215,0,0.1)" }}>
      <div className="max-w-[1600px] mx-auto flex flex-wrap items-center gap-4 justify-between">
        {/* Left: identity */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00FF9C] animate-live-dot" />
            <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color:"#3A3A3A" }}>
              R.H.T.I.H News Intelligence Core
            </span>
          </div>
        </div>

        {/* Center: key metrics */}
        <div className="flex items-center gap-4 flex-wrap">
          {[
            { label:"Market Regime",  value:"RISK-ON",     color:"#00FF9C"  },
            { label:"Sentiment",      value:"BULLISH",     color:"#00FF9C"  },
            { label:"Fear/Greed",     value:`${fgValue}`,  color:scoreColor(fgValue) },
            { label:"AI Confidence",  value:`${aiConf}%`,  color:"#FFD700"  },
            { label:"Active Alerts",  value:"3",           color:"#FF4D4D"  },
          ].map(m => (
            <div key={m.label} className="flex items-center gap-1.5">
              <span className="text-[8.5px] font-mono uppercase tracking-wider" style={{ color:"#2A2A2A" }}>
                {m.label}:
              </span>
              <span className="text-[10px] font-mono font-bold" style={{ color:m.color }}>
                {m.value}
              </span>
            </div>
          ))}
        </div>

        {/* Right: last update */}
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700] animate-live-dot" />
          <span className="text-[8.5px] font-mono" style={{ color:"#2A2A2A" }}>
            Feed updating live
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   NEWS CARD
═══════════════════════════════════════════════════════ */

function NewsCard({ item, isNew = false }: { item: typeof NEWS_FEED[0]; isNew?:boolean }) {
  const sc = SENT_COL[item.sentiment] ?? SENT_COL["NEUTRAL"];
  const cc = CAT_COL[item.category] ?? "#8A8A8A";
  const impCol = scoreColor(item.impact);

  return (
    <motion.div
      initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
      transition={{ duration:0.35 }}
      className="p-4 rounded-xl transition-all duration-300 cursor-default"
      style={{ background:"rgba(9,9,9,0.95)", border:"1px solid rgba(255,215,0,0.07)" }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "rgba(255,215,0,0.22)";
        el.style.boxShadow   = "0 8px 30px rgba(0,0,0,0.5)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "rgba(255,215,0,0.07)";
        el.style.boxShadow   = "none";
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {isNew && (
            <span className="text-[7.5px] font-mono font-bold px-2 py-0.5 rounded animate-gold-pulse"
              style={{ color:"#FF4D4D", background:"rgba(255,77,77,0.12)", border:"1px solid rgba(255,77,77,0.3)" }}>
              BREAKING
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
          <span className="text-[8px] font-mono" style={{ color:"#2A2A2A" }}>{item.timeAgo}</span>
        </div>
      </div>

      {/* Headline */}
      <h3 className="text-[13px] font-semibold mb-2 leading-snug"
        style={{ fontFamily:"var(--font-space-grotesk, sans-serif)", color:"#ECECEC" }}>
        {item.headline}
      </h3>

      {/* AI Read */}
      <div className="p-3 rounded-lg mb-3"
        style={{ background:"rgba(255,215,0,0.02)", borderLeft:"2px solid rgba(255,215,0,0.2)" }}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Brain size={9} style={{ color:"#FFD700" }} />
          <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color:"rgba(255,215,0,0.5)" }}>
            AI Intelligence Read
          </span>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color:"#5A5A5A" }}>
          {item.aiRead}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {item.tickers.slice(0,4).map(t => (
            <span key={t} className="text-[8.5px] font-mono px-1.5 py-0.5 rounded"
              style={{ color:"#FFD700", background:"rgba(255,215,0,0.06)", border:"1px solid rgba(255,215,0,0.14)" }}>
              {t}
            </span>
          ))}
          {item.tickers.length > 4 && (
            <span className="text-[8px] font-mono" style={{ color:"#3A3A3A" }}>
              +{item.tickers.length - 4}
            </span>
          )}
        </div>
        <span className="text-[8.5px] font-mono" style={{ color:"#2A2A2A" }}>{item.source}</span>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   TRENDING TICKERS PANEL
═══════════════════════════════════════════════════════ */

function TrendingPanel() {
  return (
    <div className="rounded-xl p-4" style={{ background:"rgba(9,9,9,0.95)", border:"1px solid rgba(255,215,0,0.08)" }}>
      <div className="flex items-center gap-2 mb-4">
        <Flame size={11} style={{ color:"#FFD700" }} />
        <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color:"#3A3A3A" }}>
          Trending Tickers
        </span>
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FF4D4D] animate-live-dot" />
      </div>
      <div className="space-y-2">
        {TRENDING_TICKERS.map((t, i) => {
          const sc = SENT_COL[t.sentiment] ?? SENT_COL["NEUTRAL"];
          const isUp = t.trend === "up";
          return (
            <motion.div key={t.ticker}
              initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-2.5 p-2 rounded-lg transition-all duration-200 cursor-default"
              style={{ border:"1px solid transparent" }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background   = "rgba(255,215,0,0.03)";
                el.style.borderColor  = "rgba(255,215,0,0.12)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background  = "transparent";
                el.style.borderColor = "transparent";
              }}
            >
              <span className="text-[9px] font-mono" style={{ color:"#2A2A2A", width:"14px", textAlign:"right" }}>
                {i+1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-mono font-bold" style={{ color:"#F0F0F0" }}>
                    {t.ticker}
                  </span>
                  <span className="text-[10px] font-mono font-semibold"
                    style={{ color: isUp ? "#00FF9C" : "#FF4D4D" }}>
                    {isUp ? "▲" : "▼"} {t.change.replace("+","").replace("-","")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-mono px-1 py-0.5 rounded"
                    style={{ color:sc.color, background:sc.bg, fontSize:"7.5px" }}>
                    {t.sentiment}
                  </span>
                  <span className="text-[7.5px] font-mono" style={{ color:"#2A2A2A" }}>
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
    <div className="rounded-xl p-4" style={{ background:"rgba(9,9,9,0.95)", border:"1px solid rgba(255,215,0,0.08)" }}>
      <div className="flex items-center gap-2 mb-4">
        <Layers size={11} style={{ color:"#FFD700" }} />
        <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color:"#3A3A3A" }}>
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
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = `${col}40`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = `${col}18`;
              }}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] font-mono font-semibold truncate" style={{ color:"#D0D0D0" }}>
                  {s.name}
                </span>
                <span className="text-[9px] font-mono font-bold" style={{ color:col }}>
                  {s.score}
                </span>
              </div>
              <div className="h-0.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.04)" }}>
                <motion.div className="h-full rounded-full"
                  initial={{ width:0 }} animate={{ width:`${s.score}%` }}
                  transition={{ duration:0.8, delay: i*0.04 + 0.2 }}
                  style={{ background:col }} />
              </div>
              <div className="text-[7.5px] font-mono mt-0.5" style={{ color:"#2A2A2A" }}>
                {s.note}
              </div>
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

function NarrativeGrid() {
  return (
    <div className="rounded-xl p-5" style={{ background:"rgba(9,9,9,0.95)", border:"1px solid rgba(255,215,0,0.08)" }}>
      <div className="flex items-center gap-2 mb-4">
        <Activity size={11} style={{ color:"#FFD700" }} />
        <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color:"#3A3A3A" }}>
          Narrative Heatmap
        </span>
        <div className="ml-auto text-[8px] font-mono" style={{ color:"#2A2A2A" }}>
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
              style={{
                color:n.color,
                background:`${n.color}10`,
                border:`1px solid ${n.color}22`,
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = `${n.color}18`;
                el.style.borderColor = `${n.color}45`;
                el.style.boxShadow   = `0 0 12px ${n.color}15`;
                el.style.transform   = "translateY(-1px)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = `${n.color}10`;
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
    <div className="rounded-xl p-4" style={{ background:"rgba(9,9,9,0.95)", border:"1px solid rgba(255,215,0,0.08)" }}>
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle size={11} style={{ color:"#FFD700" }} />
        <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color:"#3A3A3A" }}>
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
                <span className="text-[11px]" style={{ color:"#FFD700" }}>{p.icon}</span>
                <span className="text-[10px] font-mono font-semibold" style={{ color:"#D0D0D0" }}>
                  {p.name}
                </span>
              </div>
              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                style={{ color:"#FFD700", background:"rgba(255,215,0,0.07)", border:"1px solid rgba(255,215,0,0.15)" }}>
                {p.volume}
              </span>
            </div>
            {/* Bull/Bear bar */}
            <div className="h-1.5 rounded-full overflow-hidden flex mb-1" style={{ background:"rgba(255,77,77,0.2)" }}>
              <motion.div className="h-full rounded-full"
                initial={{ width:0 }} animate={{ width:`${p.bullish}%` }}
                transition={{ duration:0.9, delay: i*0.08+0.2 }}
                style={{ background:"linear-gradient(90deg, #00CC7E, #00FF9C)", flexShrink:0 }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono" style={{ color:"rgba(0,255,156,0.6)" }}>
                {p.bullish}% Bullish
              </span>
              <span className="text-[8px] font-mono" style={{ color:"rgba(255,77,77,0.6)" }}>
                {p.bearish}% Bearish
              </span>
            </div>
            <p className="text-[9.5px] mt-1.5 leading-relaxed" style={{ color:"#2A2A2A" }}>
              {p.note}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   INSTITUTIONAL FLOW INDICATOR
═══════════════════════════════════════════════════════ */

function InstitutionalFlow() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1200);
    return () => clearInterval(id);
  }, []);

  const flows = [
    { label:"FII Net",    value:"+₹2,840 Cr", color:"#00FF9C", dir:"buy"  },
    { label:"DII Net",    value:"+₹1,120 Cr", color:"#00FF9C", dir:"buy"  },
    { label:"Retail Net", value:"-₹890 Cr",   color:"#FF4D4D", dir:"sell" },
    { label:"Prop Desk",  value:"+₹340 Cr",   color:"#FFD700", dir:"buy"  },
  ];

  return (
    <div className="rounded-xl p-4" style={{ background:"rgba(9,9,9,0.95)", border:"1px solid rgba(255,215,0,0.08)" }}>
      <div className="flex items-center gap-2 mb-4">
        <Eye size={11} style={{ color:"#FFD700" }} />
        <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color:"#3A3A3A" }}>
          Institutional Flow
        </span>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-1 h-1 rounded-full bg-[#00FF9C] animate-live-dot" />
          <span className="text-[7.5px] font-mono" style={{ color:"#00FF9C" }}>TODAY</span>
        </div>
      </div>
      <div className="space-y-2 mb-3">
        {flows.map((f, i) => (
          <div key={f.label} className="flex items-center justify-between p-2 rounded-lg"
            style={{ background:`${f.color}06`, border:`1px solid ${f.color}14` }}>
            <span className="text-[9.5px] font-mono" style={{ color:"#5A5A5A" }}>{f.label}</span>
            <span className="text-[10.5px] font-mono font-bold" style={{ color:f.color }}>
              {f.value}
            </span>
          </div>
        ))}
      </div>
      <div className="p-2.5 rounded-lg text-center"
        style={{ background:"rgba(0,255,156,0.05)", border:"1px solid rgba(0,255,156,0.15)" }}>
        <div className="text-[8px] font-mono uppercase tracking-wider mb-0.5" style={{ color:"rgba(0,255,156,0.5)" }}>
          Net Smart Money
        </div>
        <div className="text-[15px] font-mono font-bold" style={{ color:"#00FF9C" }}>
          +₹3,410 Cr
        </div>
        <div className="text-[8px] font-mono" style={{ color:"rgba(0,255,156,0.4)" }}>ACCUMULATION</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   AI CONFIDENCE RING
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
          strokeDasharray={`0 ${circ}`} strokeLinecap="round" transform="rotate(-225 35 35)"
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

function AIScoresPanel({ fg }: { fg:number }) {
  return (
    <div className="rounded-xl p-4" style={{ background:"rgba(9,9,9,0.95)", border:"1px solid rgba(255,215,0,0.08)" }}>
      <div className="flex items-center gap-2 mb-4">
        <Brain size={11} style={{ color:"#FFD700" }} />
        <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color:"#3A3A3A" }}>
          AI Score System
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <AIScoreRing label="News Impact"    value={74} color="#FFD700"  />
        <AIScoreRing label="Sentiment"      value={68} color="#00FF9C"  />
        <AIScoreRing label="Fear/Greed"     value={fg} color={scoreColor(fg)} />
        <AIScoreRing label="Inst. Interest" value={81} color="#38BDF8"  />
        <AIScoreRing label="Retail Euphoria"value={72} color="#FB923C"  />
        <AIScoreRing label="Risk Level"     value={44} color="#FF4D4D"  />
      </div>
      <div className="mt-3 p-2.5 rounded-lg text-center"
        style={{ background:"rgba(255,215,0,0.04)", border:"1px solid rgba(255,215,0,0.12)" }}>
        <div className="text-[8px] font-mono uppercase tracking-wider mb-0.5" style={{ color:"rgba(255,215,0,0.4)" }}>
          Market Sentiment Regime
        </div>
        <div className="text-[13px] font-mono font-bold" style={{ color:"#FFD700" }}>BULLISH</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */

export default function NewsIntelligencePage() {
  const [fgValue,  setFgValue]  = useState(62);
  const [aiConf,   setAiConf]   = useState(78);
  const [newItemId, setNewItemId] = useState<number | null>(1);

  /* Simulated live updates */
  useEffect(() => {
    // Fear/Greed fluctuation
    const fg = setInterval(() => {
      setFgValue(v => Math.max(40, Math.min(88, v + (Math.random()-0.5)*3)));
    }, 4500);
    // AI conf fluctuation
    const ai = setInterval(() => {
      setAiConf(v => Math.max(68, Math.min(92, v + (Math.random()-0.5)*2)));
    }, 5200);
    // Rotate "new" badge
    const news = setInterval(() => {
      setNewItemId(id => {
        const next = ((id ?? 0) % NEWS_FEED.length) + 1;
        return next;
      });
    }, 12000);
    return () => { clearInterval(fg); clearInterval(ai); clearInterval(news); };
  }, []);

  return (
    <div className="min-h-screen" style={{ background:"#050505" }}>
      <Navbar />
      <MarketTicker />
      <RegimeHeader fgValue={Math.round(fgValue)} aiConf={Math.round(aiConf)} />

      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-5">
        {/* Page header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-bold" style={{
              fontFamily:"var(--font-space-grotesk, sans-serif)",
              fontSize:"clamp(18px,3vw,26px)", color:"#F5F5F5",
            }}>
              News{" "}
              <span style={{
                background:"linear-gradient(135deg, #FFD700, #C9A227)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
              }}>
                Intelligence Engine
              </span>
            </h1>
            <p className="text-[11px] font-mono mt-0.5" style={{ color:"#2A2A2A" }}>
              Real-time sentiment · Smart money tracking · Narrative detection
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{ background:"rgba(0,255,156,0.05)", border:"1px solid rgba(0,255,156,0.15)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#00FF9C] animate-live-dot" />
              <span className="text-[9px] font-mono" style={{ color:"#00FF9C" }}>LIVE FEED</span>
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
              style={{ background:"rgba(9,9,9,0.95)", border:"1px solid rgba(255,215,0,0.08)" }}>
              <div className="flex items-center gap-2 p-4"
                style={{ borderBottom:"1px solid rgba(255,215,0,0.06)" }}>
                <Newspaper size={11} style={{ color:"#FFD700" }} />
                <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color:"#3A3A3A" }}>
                  Intelligence Feed
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[8.5px] font-mono px-2 py-0.5 rounded"
                    style={{ color:"#FF4D4D", background:"rgba(255,77,77,0.08)", border:"1px solid rgba(255,77,77,0.2)" }}>
                    {NEWS_FEED.filter(n=>n.isBreaking).length} BREAKING
                  </span>
                  <span className="text-[8.5px] font-mono" style={{ color:"#2A2A2A" }}>
                    {NEWS_FEED.length} items
                  </span>
                </div>
              </div>
              <div className="p-3 space-y-3 max-h-[820px] overflow-y-auto">
                {NEWS_FEED.map((item) => (
                  <NewsCard
                    key={item.id}
                    item={item}
                    isNew={item.id === newItemId || item.isBreaking}
                  />
                ))}
              </div>
            </div>

            {/* Narrative heatmap */}
            <NarrativeGrid />
          </div>

          {/* ─ RIGHT COLUMN ─ */}
          <div className="space-y-4">
            {/* Fear/Greed */}
            <div className="rounded-xl p-4"
              style={{ background:"rgba(9,9,9,0.95)", border:"1px solid rgba(255,215,0,0.08)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Signal size={11} style={{ color:"#FFD700" }} />
                <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color:"#3A3A3A" }}>
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
            <div className="rounded-xl p-4" style={{ background:"rgba(9,9,9,0.95)", border:"1px solid rgba(255,77,77,0.12)" }}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={11} style={{ color:"#FF4D4D" }} />
                <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color:"rgba(255,77,77,0.5)" }}>
                  Active Risk Alerts
                </span>
              </div>
              <div className="space-y-2">
                {[
                  { level:"HIGH",   msg:"Smallcap Reddit euphoria — exit liquidity risk" },
                  { level:"MEDIUM", msg:"IT sector technical breakdown confirmed"        },
                  { level:"LOW",    msg:"US Fed hawkishness — watch USDINR ₹84.50"      },
                ].map(a => {
                  const col = a.level==="HIGH" ? "#FF4D4D" : a.level==="MEDIUM" ? "#FFB800" : "#FFD700";
                  return (
                    <div key={a.msg} className="flex items-start gap-2 p-2 rounded-lg"
                      style={{ background:`${col}06`, border:`1px solid ${col}18` }}>
                      <span className="text-[7.5px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{ color:col, background:`${col}12` }}>
                        {a.level}
                      </span>
                      <span className="text-[10px] leading-relaxed" style={{ color:"#5A5A5A" }}>
                        {a.msg}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 py-6 mt-6" style={{ borderTop:"1px solid rgba(255,215,0,0.05)" }}>
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[8.5px] font-mono uppercase tracking-wider"
            style={{ color:"#1E1E1E" }}>
            R.H.T.I.H News Intelligence · Simulated Live Data · v2.1
          </span>
          <span className="text-[8.5px] font-mono uppercase tracking-wider" style={{ color:"#1E1E1E" }}>
            Not investment advice · For institutional research only
          </span>
        </div>
      </footer>
    </div>
  );
}
