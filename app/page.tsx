"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  TrendingUp, BarChart2, Brain, Zap, Shield,
  Activity, Globe, Cpu, ArrowRight,
} from "lucide-react";
import { Navbar }      from "@/components/Navbar";
import { MarketTicker } from "@/components/MarketTicker";
import { SearchBar }   from "@/components/SearchBar";
import { cn }          from "@/lib/utils";

/* ═══════════════════════════════════════════
   STATIC DATA
═══════════════════════════════════════════ */

const FEATURES = [
  {
    icon: Brain,
    title: "Multi-Agent AI Research",
    description: "7 specialized AI agents — technical, fundamental, macro, news, lifecycle, sentiment, and trade opportunity — synthesized into a single institutional report.",
    color: "#FFD700",
    tag: "Core Engine",
  },
  {
    icon: BarChart2,
    title: "Interactive Charts",
    description: "Professional-grade candlestick charts with EMAs, Bollinger Bands, volume analysis, and support/resistance levels rendered at terminal quality.",
    color: "#38BDF8",
    tag: "Visualization",
  },
  {
    icon: Shield,
    title: "Brutally Honest Analysis",
    description: "No hype. No targets pulled from thin air. The AI calls out red flags in fundamentals, fake breakouts in technicals, and policy risks most analysts ignore.",
    color: "#00FF9C",
    tag: "Intelligence",
  },
  {
    icon: Globe,
    title: "Macro & Policy Intelligence",
    description: "RBI policy, Union Budget impact, sector regulations, FII/DII flow trends — with clear distinction between verified facts and AI interpretation.",
    color: "#FFB800",
    tag: "Macro",
  },
  {
    icon: Activity,
    title: "Full Business Lifecycle",
    description: "Understand how a company was built, survived crises, allocates capital, and where it stands in its growth cycle today. Deep historical context.",
    color: "#C084FC",
    tag: "Research",
  },
  {
    icon: Zap,
    title: "Trade Opportunity Engine",
    description: "Bull, base, and bear scenarios with probability weights, technical confirmation levels, risk/reward ratios, and invalidation triggers. Precise.",
    color: "#FF4D4D",
    tag: "Signals",
  },
];

const TRENDING_STOCKS = [
  { ticker: "RELIANCE",   name: "Reliance Industries",       change:  1.24, price: 2847.50, sector: "Energy"     },
  { ticker: "TCS",        name: "Tata Consultancy Services", change: -0.38, price: 4123.80, sector: "Technology" },
  { ticker: "HDFCBANK",   name: "HDFC Bank",                 change:  0.92, price: 1678.25, sector: "Banking"    },
  { ticker: "INFY",       name: "Infosys",                   change: -1.15, price: 1889.40, sector: "Technology" },
  { ticker: "ICICIBANK",  name: "ICICI Bank",                change:  1.87, price: 1234.60, sector: "Banking"    },
  { ticker: "BHARTIARTL", name: "Bharti Airtel",             change:  2.11, price: 1876.90, sector: "Telecom"    },
  { ticker: "WIPRO",      name: "Wipro",                     change: -0.65, price: 548.30,  sector: "Technology" },
  { ticker: "HCLTECH",    name: "HCL Technologies",          change:  0.44, price: 1632.75, sector: "Technology" },
];

const STATS = [
  { label: "NSE Listed",          value: "1,900+", sub: "equities"   },
  { label: "BSE Listed",          value: "5,500+", sub: "securities" },
  { label: "AI Agents",           value: "7",      sub: "specialized"},
  { label: "Analysis Dimensions", value: "8",      sub: "layers"     },
];

const SECTOR_COLORS: Record<string, string> = {
  Energy:     "#FFB800",
  Technology: "#38BDF8",
  Banking:    "#00FF9C",
  Telecom:    "#C084FC",
};

const AI_SIGNALS = [
  { label: "RELIANCE",  verdict: "BUY",        confidence: 78 },
  { label: "TCS",       verdict: "HOLD",       confidence: 62 },
  { label: "HDFCBANK",  verdict: "STRONG BUY", confidence: 84 },
  { label: "INFY",      verdict: "SELL",       confidence: 71 },
];

const VERDICT_COLORS: Record<string, { color: string; bg: string }> = {
  "STRONG BUY": { color: "#00FF9C", bg: "rgba(0,255,156,0.1)"  },
  "BUY":        { color: "#34D399", bg: "rgba(52,211,153,0.08)"},
  "HOLD":       { color: "#FFB800", bg: "rgba(255,184,0,0.08)" },
  "SELL":       { color: "#FF4D4D", bg: "rgba(255,77,77,0.08)" },
  "STRONG SELL":{ color: "#FF2222", bg: "rgba(255,34,34,0.1)"  },
};

/* ═══════════════════════════════════════════
   BACKGROUND COMPONENTS
═══════════════════════════════════════════ */

function GoldParticles() {
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: `${5 + (i * 4.1) % 90}%`,
    delay: `${(i * 0.37) % 9}s`,
    duration: `${7 + (i * 0.6) % 6}s`,
    size: i % 5 === 0 ? 2.5 : 1.2,
    opacity: 0.3 + (i % 4) * 0.15,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute bottom-0 rounded-full"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: "#FFD700",
            opacity: 0,
            animation: `particleFloat ${p.duration} ${p.delay} ease-in infinite`,
          }}
        />
      ))}
    </div>
  );
}

function HeroGrid() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        opacity: 0.025,
        backgroundImage: `
          linear-gradient(rgba(255,215,0,1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,215,0,1) 1px, transparent 1px)
        `,
        backgroundSize: "64px 64px",
        maskImage: "radial-gradient(ellipse 90% 90% at 50% 40%, black 20%, transparent 75%)",
        WebkitMaskImage: "radial-gradient(ellipse 90% 90% at 50% 40%, black 20%, transparent 75%)",
      }}
    />
  );
}

function GlowOrbs() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Top center mega-orb */}
      <div
        style={{
          position: "absolute",
          width: "800px",
          height: "500px",
          top: "-200px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "radial-gradient(ellipse, rgba(255,215,0,0.05) 0%, rgba(201,162,39,0.02) 40%, transparent 70%)",
          filter: "blur(50px)",
          animation: "orb1 22s ease-in-out infinite",
        }}
      />
      {/* Left accent */}
      <div
        style={{
          position: "absolute",
          width: "350px",
          height: "350px",
          top: "15%",
          left: "5%",
          background: "radial-gradient(circle, rgba(0,255,156,0.025) 0%, transparent 60%)",
          filter: "blur(60px)",
          animation: "orb2 28s ease-in-out infinite",
        }}
      />
      {/* Right accent */}
      <div
        style={{
          position: "absolute",
          width: "280px",
          height: "280px",
          top: "25%",
          right: "8%",
          background: "radial-gradient(circle, rgba(255,184,0,0.025) 0%, transparent 60%)",
          filter: "blur(50px)",
          animation: "orb1 19s ease-in-out infinite reverse",
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════
   HERO SECTION
═══════════════════════════════════════════ */

function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 pt-12 pb-20 overflow-hidden">
      <GlowOrbs />
      <HeroGrid />
      <GoldParticles />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 120% 100% at 50% 50%, transparent 30%, rgba(5,5,5,0.7) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-center">

        {/* Status pill */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-10"
          style={{
            background: "rgba(14,14,14,0.9)",
            border: "1px solid rgba(255,215,0,0.18)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#00FF9C] animate-live-dot" />
          <span className="text-[9.5px] font-mono uppercase tracking-[0.22em]" style={{ color: "#6A6A6A" }}>
            NSE · BSE · Multi-Agent AI · Live Intelligence
          </span>
          <div
            className="px-2 py-0.5 rounded-full text-[8.5px] font-mono font-bold uppercase tracking-wider"
            style={{
              background: "rgba(255,215,0,0.1)",
              border: "1px solid rgba(255,215,0,0.22)",
              color: "#FFD700",
            }}
          >
            BETA
          </div>
        </motion.div>

        {/* Massive logo */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mb-6 relative"
        >
          <h1
            className="font-bold tracking-[0.1em] leading-none select-none"
            style={{
              fontFamily: "var(--font-space-grotesk, sans-serif)",
              fontSize: "clamp(64px, 13vw, 128px)",
              background: "linear-gradient(135deg, #FFD700 0%, #C9A227 30%, #FFE55C 55%, #C9A227 75%, #FFD700 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              backgroundSize: "200% auto",
              animation: "shimmer 6s linear infinite",
              filter: "drop-shadow(0 0 40px rgba(255,215,0,0.25))",
            }}
          >
            R.H.T.I.H
          </h1>

          {/* Subtitle under logo */}
          <div
            className="text-[10px] font-mono uppercase tracking-[0.5em] mt-2"
            style={{ color: "#3A3A3A" }}
          >
            Equity Intelligence Terminal
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="font-bold leading-tight mb-4"
          style={{
            fontFamily: "var(--font-space-grotesk, sans-serif)",
            fontSize: "clamp(20px, 3.5vw, 40px)",
            color: "#F0F0F0",
            letterSpacing: "-0.025em",
          }}
        >
          AI-Powered Indian{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #FFD700 0%, #C9A227 50%, #FFB800 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Equity Intelligence
          </span>
        </motion.h2>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-2xl mx-auto mb-3 leading-relaxed"
          style={{ fontSize: "clamp(13px, 1.8vw, 16px)", color: "#5A5A5A" }}
        >
          Institutional-grade research, technical intelligence, macro analysis,
          and multi-agent AI systems built for serious investors.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="text-[13px] font-mono mb-10"
          style={{ color: "#C9A227", letterSpacing: "0.04em" }}
        >
          Not a chatbot. A research terminal.
        </motion.p>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="max-w-2xl mx-auto mb-5"
        >
          <SearchBar size="hero" autoFocus />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.65 }}
          className="text-[10px] font-mono tracking-widest"
          style={{ color: "#2A2A2A" }}
        >
          Try: RELIANCE · TCS · HDFCBANK · INFY · ICICIBANK · BHARTIARTL
        </motion.p>

        {/* Market pulse strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex items-center justify-center gap-6 mt-12"
        >
          {[
            { label: "NIFTY 50", value: "24,832", change: "+0.34%" },
            { label: "SENSEX",   value: "81,547", change: "+0.28%" },
            { label: "VIX",      value: "14.2",   change: "-2.1%"  },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "#3A3A3A" }}>
                {item.label}
              </span>
              <span className="text-[11px] font-mono" style={{ color: "#8A8A8A" }}>{item.value}</span>
              <span
                className="text-[9px] font-mono"
                style={{ color: item.change.startsWith("+") ? "#00FF9C" : "#FF4D4D" }}
              >
                {item.change}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   STATS SECTION
═══════════════════════════════════════════ */

function StatsSection() {
  return (
    <section className="px-4 pb-14">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col items-center gap-1.5 p-5 rounded-xl text-center group cursor-default transition-all duration-300"
              style={{
                background: "rgba(14,14,14,0.85)",
                border: "1px solid rgba(255,215,0,0.07)",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = "rgba(255,215,0,0.28)";
                el.style.boxShadow   = "0 8px 30px rgba(0,0,0,0.5), 0 0 20px rgba(255,215,0,0.04)";
                el.style.transform   = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = "rgba(255,215,0,0.07)";
                el.style.boxShadow   = "none";
                el.style.transform   = "translateY(0)";
              }}
            >
              <span
                className="font-bold leading-none"
                style={{
                  fontFamily: "var(--font-space-grotesk, sans-serif)",
                  fontSize: "clamp(24px, 4vw, 34px)",
                  background: "linear-gradient(135deg, #FFD700, #C9A227)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {stat.value}
              </span>
              <span className="text-[9.5px] font-mono uppercase tracking-wider" style={{ color: "#4A4A4A" }}>
                {stat.label}
              </span>
              <span className="text-[8.5px] font-mono" style={{ color: "#2A2A2A" }}>{stat.sub}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   MARKET MOVERS SECTION
═══════════════════════════════════════════ */

function MarketMovers() {
  return (
    <section className="px-4 pb-16">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "rgba(255,215,0,0.08)",
                border: "1px solid rgba(255,215,0,0.18)",
              }}
            >
              <TrendingUp size={13} style={{ color: "#FFD700" }} />
            </div>
            <div>
              <div
                className="text-[13px] font-semibold"
                style={{ fontFamily: "var(--font-space-grotesk, sans-serif)", color: "#F5F5F5" }}
              >
                Market Movers
              </div>
              <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "#4A4A4A" }}>
                Nifty 50 — Active Today
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00FF9C] animate-live-dot" />
            <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "#00FF9C" }}>
              Simulated
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {TRENDING_STOCKS.map((stock, i) => {
            const color  = SECTOR_COLORS[stock.sector] || "#6A6A6A";
            const isUp   = stock.change >= 0;
            const rgb    = { r: parseInt(color.slice(1,3),16), g: parseInt(color.slice(3,5),16), b: parseInt(color.slice(5,7),16) };

            return (
              <motion.div
                key={stock.ticker}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <Link
                  href={`/stock/${stock.ticker}`}
                  className="block p-4 rounded-xl transition-all duration-300"
                  style={{
                    background: "rgba(14,14,14,0.85)",
                    border: "1px solid rgba(255,215,0,0.06)",
                    textDecoration: "none",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.borderColor = "rgba(255,215,0,0.22)";
                    el.style.background  = "rgba(18,18,18,0.95)";
                    el.style.boxShadow   = "0 12px 40px rgba(0,0,0,0.5), 0 0 20px rgba(255,215,0,0.03)";
                    el.style.transform   = "translateY(-3px)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.borderColor = "rgba(255,215,0,0.06)";
                    el.style.background  = "rgba(14,14,14,0.85)";
                    el.style.boxShadow   = "none";
                    el.style.transform   = "translateY(0)";
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-[13px] font-mono font-bold mb-1" style={{ color: "#F5F5F5" }}>
                        {stock.ticker}
                      </div>
                      <div
                        className="text-[8.5px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-sm inline-block"
                        style={{
                          color,
                          background: `rgba(${rgb.r},${rgb.g},${rgb.b},0.1)`,
                          border: `1px solid rgba(${rgb.r},${rgb.g},${rgb.b},0.18)`,
                        }}
                      >
                        {stock.sector}
                      </div>
                    </div>
                    <div
                      className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg"
                      style={{
                        color: isUp ? "#00FF9C" : "#FF4D4D",
                        background: isUp ? "rgba(0,255,156,0.07)" : "rgba(255,77,77,0.07)",
                        border: `1px solid ${isUp ? "rgba(0,255,156,0.18)" : "rgba(255,77,77,0.18)"}`,
                      }}
                    >
                      {isUp ? "▲" : "▼"} {Math.abs(stock.change).toFixed(2)}%
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <div className="text-[15px] font-mono font-semibold" style={{ color: "#F5F5F5" }}>
                      ₹{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-1" style={{ color: "#3A3A3A" }}>
                      <span className="text-[9px] font-mono truncate max-w-[70px]">
                        {stock.name.split(" ").slice(0,2).join(" ")}
                      </span>
                      <ArrowRight size={10} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   AI SIGNALS PANEL
═══════════════════════════════════════════ */

function AISignalsPanel() {
  return (
    <section className="px-4 pb-16">
      <div className="max-w-5xl mx-auto">
        <div
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{
            background: "rgba(10,10,10,0.9)",
            border: "1px solid rgba(255,215,0,0.1)",
          }}
        >
          {/* Background glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 60% 60% at 50% 0%, rgba(255,215,0,0.03) 0%, transparent 60%)",
            }}
          />

          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left — AI signals */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Cpu size={12} style={{ color: "#FFD700" }} />
                <span className="text-[9.5px] font-mono uppercase tracking-[0.18em]" style={{ color: "#4A4A4A" }}>
                  Live AI Verdicts
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-[#00FF9C] animate-live-dot ml-1" />
              </div>

              <div className="space-y-2.5">
                {AI_SIGNALS.map((sig, i) => {
                  const vc = VERDICT_COLORS[sig.verdict] || VERDICT_COLORS["HOLD"];
                  return (
                    <motion.div
                      key={sig.label}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Link
                        href={`/stock/${sig.label}`}
                        className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group"
                        style={{
                          background: "rgba(255,255,255,0.015)",
                          border: "1px solid rgba(255,215,0,0.05)",
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,215,0,0.2)";
                          (e.currentTarget as HTMLAnchorElement).style.background   = "rgba(255,215,0,0.03)";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,215,0,0.05)";
                          (e.currentTarget as HTMLAnchorElement).style.background   = "rgba(255,255,255,0.015)";
                        }}
                      >
                        <span className="text-[12px] font-mono font-bold w-24" style={{ color: "#F5F5F5" }}>
                          {sig.label}
                        </span>
                        <span
                          className="text-[9px] font-mono font-bold px-2 py-0.5 rounded"
                          style={{ color: vc.color, background: vc.bg, border: `1px solid ${vc.color}30` }}
                        >
                          {sig.verdict}
                        </span>
                        <div className="flex-1 ml-2">
                          <div
                            className="h-1 rounded-full overflow-hidden"
                            style={{ background: "rgba(255,255,255,0.06)" }}
                          >
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: `${sig.confidence}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.8, delay: i * 0.1 + 0.2 }}
                              className="h-full rounded-full"
                              style={{ background: vc.color }}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] font-mono" style={{ color: "#4A4A4A" }}>
                          {sig.confidence}%
                        </span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Right — Platform stats */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Activity size={12} style={{ color: "#FFD700" }} />
                <span className="text-[9.5px] font-mono uppercase tracking-[0.18em]" style={{ color: "#4A4A4A" }}>
                  Platform Intelligence
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: "Analysis Depth",    value: "8 Layers",  sub: "per report"     },
                  { label: "AI Confidence",      value: "84%",       sub: "avg accuracy"   },
                  { label: "Data Sources",       value: "12+",       sub: "integrated"     },
                  { label: "Report Generation",  value: "< 30s",     sub: "per ticker"     },
                ].map(item => (
                  <div
                    key={item.label}
                    className="p-3 rounded-xl"
                    style={{
                      background: "rgba(255,255,255,0.015)",
                      border: "1px solid rgba(255,215,0,0.05)",
                    }}
                  >
                    <div
                      className="font-bold text-[18px] mb-0.5"
                      style={{
                        fontFamily: "var(--font-space-grotesk, sans-serif)",
                        background: "linear-gradient(135deg, #FFD700, #C9A227)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      {item.value}
                    </div>
                    <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "#4A4A4A" }}>
                      {item.label}
                    </div>
                    <div className="text-[8.5px] font-mono" style={{ color: "#2A2A2A" }}>{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   FEATURES SECTION
═══════════════════════════════════════════ */

function FeaturesSection() {
  return (
    <section
      className="px-4 py-20 relative overflow-hidden"
      style={{ borderTop: "1px solid rgba(255,215,0,0.06)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,215,0,0.015) 0%, transparent 65%)",
        }}
      />

      <div className="max-w-5xl mx-auto relative">
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
            style={{
              background: "rgba(14,14,14,0.9)",
              border: "1px solid rgba(255,215,0,0.14)",
            }}
          >
            <Cpu size={10} style={{ color: "#FFD700" }} />
            <span className="text-[9px] font-mono uppercase tracking-[0.22em]" style={{ color: "#6A6A6A" }}>
              Intelligence Architecture
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-bold mb-3"
            style={{
              fontFamily: "var(--font-space-grotesk, sans-serif)",
              fontSize: "clamp(24px, 4vw, 40px)",
              color: "#F5F5F5",
              letterSpacing: "-0.025em",
            }}
          >
            Built Different.{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #FFD700, #C9A227)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Think Different.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-[13px]"
            style={{ color: "#4A4A4A" }}
          >
            Six specialized intelligence layers. One decisive verdict.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feat, i) => {
            const rgb = { r: parseInt(feat.color.slice(1,3),16), g: parseInt(feat.color.slice(3,5),16), b: parseInt(feat.color.slice(5,7),16) };
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group p-5 rounded-xl cursor-default transition-all duration-350"
                style={{
                  background: "rgba(12,12,12,0.85)",
                  border: "1px solid rgba(255,215,0,0.06)",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = `rgba(${rgb.r},${rgb.g},${rgb.b},0.25)`;
                  el.style.boxShadow   = `0 12px 40px rgba(0,0,0,0.5), 0 0 30px rgba(${rgb.r},${rgb.g},${rgb.b},0.06)`;
                  el.style.transform   = "translateY(-4px)";
                  el.style.background  = "rgba(15,15,15,0.95)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = "rgba(255,215,0,0.06)";
                  el.style.boxShadow   = "none";
                  el.style.transform   = "translateY(0)";
                  el.style.background  = "rgba(12,12,12,0.85)";
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: `rgba(${rgb.r},${rgb.g},${rgb.b},0.08)`,
                      border: `1px solid rgba(${rgb.r},${rgb.g},${rgb.b},0.2)`,
                    }}
                  >
                    <feat.icon size={16} style={{ color: feat.color }} />
                  </div>
                  <span
                    className="text-[8px] font-mono uppercase tracking-[0.14em] px-2 py-0.5 rounded-sm"
                    style={{
                      color: feat.color,
                      background: `rgba(${rgb.r},${rgb.g},${rgb.b},0.08)`,
                      border: `1px solid rgba(${rgb.r},${rgb.g},${rgb.b},0.18)`,
                    }}
                  >
                    {feat.tag}
                  </span>
                </div>

                <h3
                  className="font-semibold text-[13.5px] mb-2"
                  style={{
                    fontFamily: "var(--font-space-grotesk, sans-serif)",
                    color: "#F0F0F0",
                  }}
                >
                  {feat.title}
                </h3>
                <p className="text-[11.5px] leading-relaxed" style={{ color: "#4A4A4A" }}>
                  {feat.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   CTA SECTION
═══════════════════════════════════════════ */

function CTASection() {
  return (
    <section
      className="px-4 py-24 relative overflow-hidden"
      style={{ borderTop: "1px solid rgba(255,215,0,0.06)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 80% at 50% 50%, rgba(255,215,0,0.025) 0%, transparent 65%)",
        }}
      />
      <GoldParticles />

      <div className="max-w-3xl mx-auto text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="text-[9px] font-mono uppercase tracking-[0.3em] mb-5" style={{ color: "#FFD700" }}>
            ⬡ Begin Your Analysis
          </div>

          <h2
            className="font-bold mb-4 leading-tight"
            style={{
              fontFamily: "var(--font-space-grotesk, sans-serif)",
              fontSize: "clamp(28px, 5vw, 52px)",
              color: "#F5F5F5",
              letterSpacing: "-0.025em",
            }}
          >
            The Edge Institutional<br />
            <span
              style={{
                background: "linear-gradient(135deg, #FFD700 0%, #C9A227 50%, #FFB800 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Investors Demand.
            </span>
          </h2>

          <p className="mb-10 text-[14px]" style={{ color: "#4A4A4A" }}>
            Start with any NSE or BSE ticker. Get a complete institutional research report in seconds.
          </p>

          <div className="max-w-xl mx-auto mb-10">
            <SearchBar size="hero" />
          </div>

          <div className="flex flex-wrap justify-center gap-8">
            {[
              "No Account Required",
              "Real Market Data",
              "Multi-Agent AI",
            ].map(label => (
              <div key={label} className="flex items-center gap-2">
                <span style={{ color: "#FFD700", fontSize: "10px" }}>◈</span>
                <span className="text-[10.5px] font-mono uppercase tracking-wider" style={{ color: "#4A4A4A" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════ */

function Footer() {
  return (
    <footer
      className="px-4 py-8"
      style={{ borderTop: "1px solid rgba(255,215,0,0.06)" }}
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="font-bold text-[14px] tracking-wider"
            style={{
              fontFamily: "var(--font-space-grotesk, sans-serif)",
              background: "linear-gradient(135deg, #FFD700, #C9A227)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            R.H.T.I.H
          </span>
          <span className="text-[8.5px] font-mono uppercase tracking-wider" style={{ color: "#2A2A2A" }}>
            AI-Powered Indian Equity Intelligence
          </span>
        </div>
        <div className="text-[8.5px] font-mono uppercase tracking-wider" style={{ color: "#2A2A2A" }}>
          Not investment advice · For research purposes only
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════
   PAGE EXPORT
═══════════════════════════════════════════ */

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: "#050505" }}>
      <Navbar />
      <MarketTicker />
      <HeroSection />
      <StatsSection />
      <MarketMovers />
      <AISignalsPanel />
      <FeaturesSection />
      <CTASection />
      <Footer />
    </div>
  );
}
