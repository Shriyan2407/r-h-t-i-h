"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp, BarChart2, Brain, Zap, Shield,
  Activity, Globe, Cpu, ArrowRight, Lock,
} from "lucide-react";

/* ═══════════════════════════════════════════
   STATIC DATA
═══════════════════════════════════════════ */

const FEATURES = [
  {
    icon: Brain,
    title: "Multi-Agent AI Research",
    description: "7 specialized AI agents — technical, fundamental, macro, news, lifecycle, sentiment, and trade opportunity — synthesized into a single institutional report.",
    color: "var(--gold)",
    tag: "Core Engine",
  },
  {
    icon: BarChart2,
    title: "Interactive Charts",
    description: "Professional-grade candlestick charts with EMAs, Bollinger Bands, volume analysis, and support/resistance levels rendered at terminal quality.",
    color: "var(--th-blue)",
    tag: "Visualization",
  },
  {
    icon: Shield,
    title: "Brutally Honest Analysis",
    description: "No hype. No targets pulled from thin air. The AI calls out red flags in fundamentals, fake breakouts in technicals, and policy risks most analysts ignore.",
    color: "var(--positive)",
    tag: "Intelligence",
  },
  {
    icon: Globe,
    title: "Macro & Policy Intelligence",
    description: "RBI policy, Union Budget impact, sector regulations, FII/DII flow trends — with clear distinction between verified facts and AI interpretation.",
    color: "var(--neutral)",
    tag: "Macro",
  },
  {
    icon: Activity,
    title: "Full Business Lifecycle",
    description: "Understand how a company was built, survived crises, allocates capital, and where it stands in its growth cycle today. Deep historical context.",
    color: "var(--th-blue)",
    tag: "Research",
  },
  {
    icon: Zap,
    title: "Trade Opportunity Engine",
    description: "Bull, base, and bear scenarios with probability weights, technical confirmation levels, risk/reward ratios, and invalidation triggers. Precise.",
    color: "var(--negative)",
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
  { label: "NSE Listed",          value: "1,900+", sub: "equities"    },
  { label: "BSE Listed",          value: "5,500+", sub: "securities"  },
  { label: "AI Agents",           value: "7",      sub: "specialized" },
  { label: "Analysis Dimensions", value: "8",      sub: "layers"      },
];

const SECTOR_COLORS: Record<string, string> = {
  Energy:     "#FFB800",
  Technology: "#3B82F6",
  Banking:    "#00FF9C",
  Telecom:    "#3B82F6",
};

const AI_SIGNALS = [
  { label: "RELIANCE",  verdict: "BUY",        confidence: 78, color: "#34D399", bg: "rgba(52,211,153,0.08)"  },
  { label: "TCS",       verdict: "HOLD",       confidence: 62, color: "#FFB800", bg: "rgba(255,184,0,0.08)"   },
  { label: "HDFCBANK",  verdict: "STRONG BUY", confidence: 84, color: "#00FF9C", bg: "rgba(0,255,156,0.09)"   },
  { label: "INFY",      verdict: "SELL",       confidence: 71, color: "#FF7A00", bg: "rgba(255,122,0,0.08)"   },
];

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
            background: "var(--gold)",
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
   AUTH CTA BUTTONS
═══════════════════════════════════════════ */

function AuthCTAButtons({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const primaryPad = size === "lg" ? "16px 36px" : size === "sm" ? "8px 20px" : "12px 28px";
  const secondaryPad = size === "lg" ? "16px 32px" : size === "sm" ? "8px 18px" : "12px 24px";
  const fontSize = size === "lg" ? "14px" : size === "sm" ? "10px" : "12px";

  return (
    <div className="flex items-center gap-3 flex-wrap justify-center">
      <Link
        href="/auth/signup"
        className="inline-flex items-center gap-2 font-mono font-bold uppercase tracking-wider rounded-xl transition-all duration-300 relative overflow-hidden group"
        style={{
          padding: primaryPad,
          fontSize,
          background: "linear-gradient(135deg, #FFD700 0%, #C9A227 50%, #FFB800 100%)",
          color: "#050505",
          boxShadow: "0 0 30px rgba(255,215,0,0.25), 0 4px 20px rgba(0,0,0,0.4)",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 50px rgba(255,215,0,0.45), 0 8px 30px rgba(0,0,0,0.5)";
          (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 30px rgba(255,215,0,0.25), 0 4px 20px rgba(0,0,0,0.4)";
          (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
        }}
      >
        Get Started Free
        <ArrowRight size={size === "lg" ? 16 : 13} />
      </Link>
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-2 font-mono font-semibold uppercase tracking-wider rounded-xl transition-all duration-300"
        style={{
          padding: secondaryPad,
          fontSize,
          color: "var(--th-text-secondary)",
          background: "var(--th-bg-elevated)",
          border: "1px solid var(--th-border-normal)",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--th-border-accent)";
          (e.currentTarget as HTMLAnchorElement).style.color = "var(--gold)";
          (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--th-border-normal)";
          (e.currentTarget as HTMLAnchorElement).style.color = "var(--th-text-secondary)";
          (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
        }}
      >
        Sign In
      </Link>
    </div>
  );
}

/* ═══════════════════════════════════════════
   HERO SECTION
═══════════════════════════════════════════ */

function HeroSection() {
  return (
    <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-4 pt-12 pb-20 overflow-hidden">
      <GlowOrbs />
      <HeroGrid />
      <GoldParticles />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 120% 100% at 50% 50%, transparent 30%, var(--th-vignette) 100%)`,
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto text-center">

        {/* Status pill */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-10"
          style={{
            background: "var(--th-bg-card)",
            border: "1px solid var(--th-border-accent)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#00FF9C] animate-live-dot" />
          <span className="text-[9.5px] font-mono uppercase tracking-[0.22em]" style={{ color: "var(--th-text-muted)" }}>
            NSE · BSE · Multi-Agent AI · Live Intelligence
          </span>
          <div
            className="px-2 py-0.5 rounded-full text-[8.5px] font-mono font-bold uppercase tracking-wider"
            style={{
              background: "var(--th-gold-bg-strong)",
              border: "1px solid var(--th-border-accent)",
              color: "var(--gold)",
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
              fontSize: "clamp(48px, 10vw, 112px)",
              background: "linear-gradient(135deg, #FFD700 0%, #C9A227 30%, #FFE55C 55%, #C9A227 75%, #FFD700 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              backgroundSize: "200% auto",
              animation: "shimmer 6s linear infinite",
              filter: "drop-shadow(0 0 40px rgba(255,215,0,0.25))",
            }}
          >
            MARKET KA BAADSHAH
          </h1>
          <div
            className="text-[10px] font-mono uppercase tracking-[0.5em] mt-2"
            style={{ color: "var(--th-text-faint)" }}
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
            color: "var(--th-text-primary)",
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

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-2xl mx-auto mb-3 leading-relaxed"
          style={{ fontSize: "clamp(13px, 1.8vw, 16px)", color: "var(--th-text-dim)" }}
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

        {/* Auth CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mb-8"
        >
          <AuthCTAButtons size="lg" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.65 }}
          className="text-[10px] font-mono tracking-widest mb-12"
          style={{ color: "var(--th-text-ultra-faint)" }}
        >
          Free to join · No credit card required · Instant access
        </motion.p>

        {/* Market pulse strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex items-center justify-center gap-6"
        >
          {[
            { label: "NIFTY 50", value: "24,832", change: "+0.34%" },
            { label: "SENSEX",   value: "81,547", change: "+0.28%" },
            { label: "VIX",      value: "14.2",   change: "-2.1%"  },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-faint)" }}>
                {item.label}
              </span>
              <span className="text-[11px] font-mono font-semibold" style={{ color: "var(--th-text-secondary)" }}>
                {item.value}
              </span>
              <span
                className="text-[9px] font-mono"
                style={{ color: item.change.startsWith("+") ? "var(--positive)" : "var(--negative)" }}
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
              className="flex flex-col items-center gap-1.5 p-5 rounded-xl text-center cursor-default transition-all duration-300"
              style={{
                background: "var(--th-bg-card)",
                border: "1px solid var(--th-border-subtle)",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = "var(--th-border-accent)";
                el.style.boxShadow   = "0 8px 30px rgba(0,0,0,0.5), 0 0 20px rgba(255,215,0,0.04)";
                el.style.transform   = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = "var(--th-border-subtle)";
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
              <span className="text-[9.5px] font-mono font-semibold uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
                {stat.label}
              </span>
              <span className="text-[8.5px] font-mono" style={{ color: "var(--th-text-ultra-faint)" }}>{stat.sub}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   MARKET MOVERS TEASER (non-interactive)
═══════════════════════════════════════════ */

function MarketMoversTeaser() {
  return (
    <section className="px-4 pb-16">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "var(--th-border-card)",
                border: "1px solid var(--th-border-accent)",
              }}
            >
              <TrendingUp size={13} style={{ color: "var(--gold)" }} />
            </div>
            <div>
              <div
                className="text-[13px] font-semibold"
                style={{ fontFamily: "var(--font-space-grotesk, sans-serif)", color: "var(--th-text-primary)" }}
              >
                Market Movers
              </div>
              <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
                Nifty 50 — Preview
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-normal)" }}>
            <Lock size={10} style={{ color: "var(--gold)" }} />
            <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
              Login to access live data
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {TRENDING_STOCKS.map((stock, i) => {
            const color = SECTOR_COLORS[stock.sector] || "#8A8A8A";
            const isUp  = stock.change >= 0;

            return (
              <motion.div
                key={stock.ticker}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <Link
                  href="/auth/login"
                  className="block p-4 rounded-xl transition-all duration-300 relative overflow-hidden group"
                  style={{
                    background: "var(--th-bg-card)",
                    border: "1px solid var(--th-border-subtle)",
                    textDecoration: "none",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.borderColor = "var(--th-border-accent)";
                    el.style.background  = "var(--th-bg-card-hover)";
                    el.style.boxShadow   = "var(--th-shadow-elevated)";
                    el.style.transform   = "translateY(-3px)";
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.borderColor = "var(--th-border-subtle)";
                    el.style.background  = "var(--th-bg-card)";
                    el.style.boxShadow   = "none";
                    el.style.transform   = "translateY(0)";
                  }}
                >
                  {/* Blur overlay on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-xl"
                    style={{ background: "rgba(5,5,5,0.7)", backdropFilter: "blur(4px)", zIndex: 10 }}
                  >
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "var(--th-gold-bg-strong)", border: "1px solid var(--th-border-accent)" }}>
                      <Lock size={10} style={{ color: "var(--gold)" }} />
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider" style={{ color: "var(--gold)" }}>
                        Login to view
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-[13px] font-mono font-bold mb-1" style={{ color: "var(--th-text-primary)" }}>
                        {stock.ticker}
                      </div>
                      <div
                        className="text-[8.5px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-sm inline-block"
                        style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}
                      >
                        {stock.sector}
                      </div>
                    </div>
                    <div
                      className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg"
                      style={{
                        color: isUp ? "var(--positive)" : "var(--negative)",
                        background: isUp ? "var(--th-green-bg)" : "var(--th-red-bg)",
                        border: `1px solid ${isUp ? "rgba(0,255,156,0.18)" : "rgba(255,77,77,0.18)"}`,
                      }}
                    >
                      {isUp ? "▲" : "▼"} {Math.abs(stock.change).toFixed(2)}%
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <div className="text-[15px] font-mono font-semibold" style={{ color: "var(--th-text-primary)" }}>
                      ₹{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-1" style={{ color: "var(--th-text-faint)" }}>
                      <span className="text-[9px] font-mono truncate max-w-[70px]">
                        {stock.name.split(" ").slice(0, 2).join(" ")}
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
   AI SIGNALS TEASER
═══════════════════════════════════════════ */

function AISignalsTeaser() {
  return (
    <section className="px-4 pb-16">
      <div className="max-w-5xl mx-auto">
        <div
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{
            background: "var(--th-bg-card)",
            border: "1px solid var(--th-border-normal)",
          }}
        >
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
                <Cpu size={12} style={{ color: "var(--gold)" }} />
                <span className="text-[9.5px] font-mono font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--th-text-muted)" }}>
                  AI Verdicts Preview
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-[#00FF9C] animate-live-dot ml-1" />
              </div>

              <div className="space-y-2.5">
                {AI_SIGNALS.map((sig, i) => (
                  <motion.div
                    key={sig.label}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-default"
                    style={{
                      background: "rgba(255,255,255,0.015)",
                      border: "1px solid var(--th-border-subtle)",
                    }}
                  >
                    <span className="text-[12px] font-mono font-bold w-24" style={{ color: "var(--th-text-primary)" }}>
                      {sig.label}
                    </span>
                    <span
                      className="text-[9px] font-mono font-bold px-2 py-0.5 rounded"
                      style={{ color: sig.color, background: sig.bg, border: `1px solid ${sig.color}30` }}
                    >
                      {sig.verdict}
                    </span>
                    <div className="flex-1 ml-2">
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${sig.confidence}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: i * 0.1 + 0.2 }}
                          className="h-full rounded-full"
                          style={{ background: sig.color }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-semibold" style={{ color: "var(--th-text-muted)" }}>
                      {sig.confidence}%
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right — Auth gate promo */}
            <div className="flex flex-col justify-center items-center text-center gap-5 p-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: "var(--th-gold-bg-strong)",
                  border: "1px solid var(--th-border-accent)",
                  boxShadow: "0 0 30px rgba(255,215,0,0.1)",
                }}
              >
                <Brain size={24} style={{ color: "var(--gold)" }} />
              </div>
              <div>
                <div
                  className="font-bold text-[18px] mb-1"
                  style={{ fontFamily: "var(--font-space-grotesk, sans-serif)", color: "var(--th-text-primary)" }}
                >
                  Full AI Reports
                </div>
                <div className="text-[12px] leading-relaxed" style={{ color: "var(--th-text-dim)" }}>
                  8-layer institutional analysis with technical, fundamental, macro, and trade opportunity intelligence.
                </div>
              </div>
              <AuthCTAButtons size="sm" />
              <div className="flex flex-wrap justify-center gap-4">
                {["7 AI Agents", "< 30s Reports", "NSE + BSE"].map(label => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span style={{ color: "var(--gold)", fontSize: "10px" }}>◈</span>
                    <span className="text-[9.5px] font-mono font-semibold uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
                      {label}
                    </span>
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
      style={{ borderTop: "1px solid var(--th-border-subtle)" }}
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
              background: "var(--th-bg-elevated)",
              border: "1px solid var(--th-border-normal)",
            }}
          >
            <Cpu size={10} style={{ color: "var(--gold)" }} />
            <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--th-text-muted)" }}>
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
              color: "var(--th-text-primary)",
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
            className="text-[13px] font-medium"
            style={{ color: "var(--th-text-dim)" }}
          >
            Six specialized intelligence layers. One decisive verdict.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group p-5 rounded-xl cursor-default transition-all duration-350"
              style={{
                background: "var(--th-bg-card)",
                border: "1px solid var(--th-border-subtle)",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = "var(--th-border-accent)";
                el.style.boxShadow   = "var(--th-shadow-elevated)";
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
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: `color-mix(in srgb, ${feat.color} 8%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${feat.color} 20%, transparent)`,
                  }}
                >
                  <feat.icon size={16} style={{ color: feat.color }} />
                </div>
                <span
                  className="text-[8px] font-mono font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-sm"
                  style={{ color: feat.color, background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-normal)" }}
                >
                  {feat.tag}
                </span>
              </div>

              <h3
                className="font-semibold text-[13.5px] mb-2"
                style={{
                  fontFamily: "var(--font-space-grotesk, sans-serif)",
                  color: "var(--th-text-primary)",
                }}
              >
                {feat.title}
              </h3>
              <p className="text-[11.5px] leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
                {feat.description}
              </p>
            </motion.div>
          ))}
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
      style={{ borderTop: "1px solid var(--th-border-subtle)" }}
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
          <div className="text-[9px] font-mono uppercase tracking-[0.3em] mb-5" style={{ color: "var(--gold)" }}>
            ⬡ Join Market Ka Baadshah
          </div>

          <h2
            className="font-bold mb-4 leading-tight"
            style={{
              fontFamily: "var(--font-space-grotesk, sans-serif)",
              fontSize: "clamp(28px, 5vw, 52px)",
              color: "var(--th-text-primary)",
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

          <p className="mb-10 text-[14px] font-medium leading-relaxed" style={{ color: "var(--th-text-dim)" }}>
            Create your account and get full access to AI-powered equity intelligence
            for every NSE and BSE listed stock.
          </p>

          <div className="mb-8">
            <AuthCTAButtons size="lg" />
          </div>

          <div className="flex flex-wrap justify-center gap-8">
            {[
              "Free Account",
              "Real Market Data",
              "Multi-Agent AI",
            ].map(label => (
              <div key={label} className="flex items-center gap-2">
                <span style={{ color: "var(--gold)", fontSize: "10px" }}>◈</span>
                <span className="text-[10.5px] font-mono font-semibold uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
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
      style={{ borderTop: "1px solid var(--th-border-subtle)" }}
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
            MARKET KA BAADSHAH
          </span>
          <span className="text-[8.5px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-ultra-faint)" }}>
            AI-Powered Indian Equity Intelligence
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-[9px] font-mono uppercase tracking-wider transition-colors" style={{ color: "var(--th-text-faint)" }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = "var(--gold)"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "var(--th-text-faint)"}
          >
            Sign In
          </Link>
          <Link href="/auth/signup" className="text-[9px] font-mono uppercase tracking-wider transition-colors" style={{ color: "var(--th-text-faint)" }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = "var(--gold)"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "var(--th-text-faint)"}
          >
            Create Account
          </Link>
          <span className="text-[8.5px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-ultra-faint)" }}>
            Not investment advice · For research purposes only
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════
   LIVE INTELLIGENCE FEED
═══════════════════════════════════════════ */

const INTEL_FEED = [
  { ticker: "RELIANCE",   action: "AI Verdict", value: "STRONG BUY", color: "#00FF9C" },
  { ticker: "TCS",        action: "Confidence", value: "84%",        color: "#38BDF8" },
  { ticker: "HDFCBANK",   action: "Signal",     value: "BUY",        color: "#34D399" },
  { ticker: "NIFTY 50",   action: "Trend",      value: "+0.34%",     color: "#00FF9C" },
  { ticker: "INFY",       action: "AI Verdict", value: "HOLD",       color: "#FFB800" },
  { ticker: "BHARTIARTL", action: "Signal",     value: "STRONG BUY", color: "#00FF9C" },
  { ticker: "ICICIBANK",  action: "Confidence", value: "71%",        color: "#38BDF8" },
  { ticker: "WIPRO",      action: "AI Verdict", value: "BUY",        color: "#34D399" },
];

function IntelFeedBar() {
  const doubled = [...INTEL_FEED, ...INTEL_FEED];
  return (
    <div
      className="relative overflow-hidden"
      style={{
        height: "30px",
        background: "rgba(255,215,0,0.025)",
        borderBottom: "1px solid rgba(255,215,0,0.07)",
      }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to right, #050505 40%, transparent)" }} />
      <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, #050505 40%, transparent)" }} />
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 pr-2"
        style={{ borderRight: "1px solid rgba(255,215,0,0.08)" }}>
        <div className="w-1.5 h-1.5 rounded-full animate-live-dot" style={{ background: "#00FF9C" }} />
        <span className="text-[7.5px] font-mono font-bold uppercase tracking-[0.2em]" style={{ color: "#00FF9C" }}>
          AI FEED
        </span>
      </div>
      <div className="flex items-center h-full whitespace-nowrap animate-ticker" style={{ paddingLeft: "72px" }}>
        {doubled.map((item, i) => (
          <div key={i} className="inline-flex items-center gap-2 px-4 h-full"
            style={{ borderRight: "1px solid rgba(255,215,0,0.06)" }}>
            <span className="text-[8.5px] font-mono font-bold" style={{ color: "rgba(255,215,0,0.65)" }}>{item.ticker}</span>
            <span className="text-[7.5px] font-mono uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>{item.action}</span>
            <span className="text-[9px] font-mono font-bold" style={{ color: item.color }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LANDING HEADER
═══════════════════════════════════════════ */

function LandingHeader() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-14"
      style={{
        background: "rgba(5,5,5,0.85)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,215,0,0.07)",
      }}
    >
      {/* Branding */}
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, rgba(255,215,0,0.14), rgba(201,162,39,0.06))",
            border: "1px solid rgba(255,215,0,0.22)",
          }}
        >
          <Activity size={13} style={{ color: "#FFD700" }} />
        </div>
        <span
          className="font-bold text-[13px] tracking-wider hidden sm:block"
          style={{
            fontFamily: "var(--font-space-grotesk, sans-serif)",
            background: "linear-gradient(135deg, #FFD700, #C9A227)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          MARKET KA BAADSHAH
        </span>
      </div>

      {/* Auth nav */}
      <div className="flex items-center gap-2">
        <Link
          href="/auth/login"
          className="px-4 py-1.5 rounded-lg font-mono font-semibold text-[11px] uppercase tracking-wider transition-all duration-200"
          style={{ color: "var(--th-text-secondary)", border: "1px solid var(--th-border-normal)" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--th-border-accent)";
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--gold)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--th-border-normal)";
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--th-text-secondary)";
          }}
        >
          Sign In
        </Link>
        <Link
          href="/auth/signup"
          className="px-4 py-1.5 rounded-lg font-mono font-bold text-[11px] uppercase tracking-wider transition-all duration-200"
          style={{
            background: "linear-gradient(135deg, #FFD700, #C9A227)",
            color: "#050505",
            boxShadow: "0 0 16px rgba(255,215,0,0.2)",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 28px rgba(255,215,0,0.4)";
            (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 16px rgba(255,215,0,0.2)";
            (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
          }}
        >
          Get Started
        </Link>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════
   EXPORT
═══════════════════════════════════════════ */

export function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--th-bg-page)" }}>
      <LandingHeader />
      <div className="pt-14">
        <IntelFeedBar />
        <HeroSection />
        <StatsSection />
        <MarketMoversTeaser />
        <AISignalsTeaser />
        <FeaturesSection />
        <CTASection />
        <Footer />
      </div>
    </div>
  );
}
