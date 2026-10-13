"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Star, Brain, Search, TrendingUp, Clock,
  BarChart2, ArrowRight, RefreshCw, Zap,
  Activity, ChevronRight, Cpu, Shield, AlertTriangle,
} from "lucide-react";
import { Navbar }       from "@/components/Navbar";
import { useMarketIndices } from "@/lib/hooks/useMarketIndices";
import { MarketTicker } from "@/components/MarketTicker";
import { useTheme }     from "@/lib/context/ThemeContext";
import { useWatchlistStore } from "@/store/watchlistStore";

interface UserProfile {
  name: string | null;
  email: string;
  createdAt: string;
  lastLogin: string | null;
  subscriptionTier: string;
  _count: { watchlist: number; aiHistory: number; searches: number };
}

function greeting(name: string | null | undefined) {
  const hour = new Date().getHours();
  const g    = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return `${g}${name ? `, ${name.split(" ")[0]}` : ""}`;
}

const TIER_STYLES: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  free:          { bg: "rgba(255,255,255,0.04)", text: "#888888", border: "rgba(255,255,255,0.10)", glow: "none" },
  pro:           { bg: "rgba(255,215,0,0.09)",  text: "#FFD700", border: "rgba(255,215,0,0.28)",  glow: "0 0 12px rgba(255,215,0,0.15)" },
  institutional: { bg: "rgba(0,255,156,0.08)",  text: "#00FF9C", border: "rgba(0,255,156,0.28)",  glow: "0 0 12px rgba(0,255,156,0.12)" },
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const { theme }         = useTheme();
  const isLight           = theme === "light";

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Single source of truth — same store the watchlist page and WatchButton use
  const watchlist        = useWatchlistStore(s => s.items);
  const watchlistLoaded  = useWatchlistStore(s => s.loaded);

  // Real quotes only (shared poller). Nothing is shown for an index we have no data for.
  const market = useMarketIndices();
  const pulse = market.status === "ready"
    ? market.data.indices.filter(i => ["NIFTY 50", "SENSEX", "INDIA VIX", "USD/INR"].includes(i.label))
    : [];
  const movers = market.status === "ready" ? market.data.movers : null;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const pRes = await fetch("/api/user/profile");
      if (pRes.ok) setProfile(await pRes.json());
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (session?.user) loadData(); }, [session, loadData]);

  const tier      = profile?.subscriptionTier ?? "free";
  const tierStyle = TIER_STYLES[tier] ?? TIER_STYLES.free;

  return (
    <div className="min-h-screen" style={{ background: "var(--th-bg-page)" }}>
      <Navbar />
      <MarketTicker />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-7">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 mb-7">
          <div>
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <h1
                className="font-bold"
                style={{
                  fontFamily: "var(--font-space-grotesk, sans-serif)",
                  fontSize: "clamp(20px, 2.5vw, 28px)",
                  color: "var(--th-text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                {loading ? "Loading…" : greeting(session?.user?.name)}
              </h1>
              {!loading && (
                <span
                  className="text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{
                    background: tierStyle.bg,
                    color:      tierStyle.text,
                    border:     `1px solid ${tierStyle.border}`,
                    boxShadow:  tierStyle.glow,
                  }}
                >
                  {tier}
                </span>
              )}
            </div>
            <p className="text-[12px] font-mono font-medium" style={{ color: "var(--th-text-muted)" }}>
              {loading ? "" : "Your institutional AI intelligence dashboard"}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Market pulse strip */}
            <div
              className="hidden lg:flex items-center gap-4 px-4 py-2 rounded-xl"
              style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-subtle)" }}
            >
              {market.status === "loading" && (
                <span className="text-[10px] font-mono" style={{ color: "var(--th-text-faint)" }}>Loading market data…</span>
              )}
              {market.status === "error" && (
                <span className="text-[10px] font-mono" style={{ color: "var(--th-text-faint)" }}>Market data unavailable</span>
              )}
              {pulse.map(item => (
                <div key={item.symbol} className="flex items-center gap-1.5">
                  <span style={{ fontFamily: "monospace", fontSize: "9px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--th-text-faint)" }}>
                    {item.label}
                  </span>
                  <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--th-text-secondary)" }}>
                    {item.kind === "rate"
                      ? item.value.toFixed(2)
                      : item.value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                  <span style={{ fontFamily: "monospace", fontSize: "11px", fontWeight: 600, color: item.changePct >= 0 ? "var(--positive)" : "var(--negative)" }}>
                    {item.changePct >= 0 ? "+" : ""}{item.changePct.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-mono font-semibold transition-all"
              style={{
                color:      "var(--th-text-secondary)",
                background: "var(--th-bg-elevated)",
                border:     "1px solid var(--th-border-subtle)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-border-accent)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--gold)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-border-subtle)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-secondary)";
              }}
            >
              <RefreshCw size={11} /> Refresh
            </button>
          </div>
        </div>

        {/* ── Stats Strip ── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Watchlist",   value: watchlist.length,               icon: Star,   color: "#FFD700", href: "/watchlist" },
            { label: "AI Reports",  value: profile?._count.aiHistory ?? 0, icon: Brain,  color: "#38BDF8", href: "/history"   },
            { label: "Searches",    value: profile?._count.searches  ?? 0, icon: Search, color: "#00FF9C", href: "/"          },
          ].map(({ label, value, icon: Icon, color, href }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                href={href}
                className="flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-200 block group"
                style={{
                  background: "var(--th-bg-card)",
                  border:     "1px solid var(--th-border-subtle)",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.borderColor = "var(--th-border-accent)";
                  el.style.transform   = "translateY(-2px)";
                  el.style.boxShadow   = "0 8px 30px rgba(0,0,0,0.4)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.borderColor = "var(--th-border-subtle)";
                  el.style.transform   = "translateY(0)";
                  el.style.boxShadow   = "none";
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}14`, border: `1px solid ${color}28` }}
                >
                  <Icon size={15} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  {/* Number — hero weight */}
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "32px",
                      fontWeight: 700,
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                      color: "var(--th-text-primary)",
                      marginBottom: "4px",
                    }}
                  >
                    {loading ? "—" : value}
                  </div>
                  {/* Label — subtle */}
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "10px",
                      fontWeight: 400,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase" as const,
                      color: "var(--th-text-muted)",
                    }}
                  >
                    {label}
                  </div>
                </div>
                <ArrowRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  style={{ color: "var(--th-text-faint)" }} />
              </Link>
            </motion.div>
          ))}
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Left: Watchlist + AI Signals ── */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Watchlist panel */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-subtle)" }}
            >
              <div
                className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: "1px solid var(--th-border-subtle)" }}
              >
                <div className="flex items-center gap-2.5">
                  <Star size={13} style={{ color: "var(--gold)" }} />
                  <span className="text-[10.5px] font-mono font-bold uppercase tracking-widest" style={{ color: "var(--th-text-muted)" }}>
                    My Watchlist
                  </span>
                  {watchlist.length > 0 && (
                    <span
                      className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(255,215,0,0.09)", color: "#FFD700", border: "1px solid rgba(255,215,0,0.22)" }}
                    >
                      {watchlist.length}
                    </span>
                  )}
                </div>
                <Link
                  href="/watchlist"
                  className="flex items-center gap-1 text-[10px] font-mono font-semibold transition-all"
                  style={{ color: "var(--th-text-muted)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = "var(--gold)"}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "var(--th-text-muted)"}
                >
                  View all <ArrowRight size={9} />
                </Link>
              </div>

              {!watchlistLoaded ? (
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-14 rounded-lg skeleton" />
                  ))}
                </div>
              ) : watchlist.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-1"
                    style={{ background: "var(--th-gold-bg-strong)", border: "1px solid var(--th-border-accent)" }}
                  >
                    <Star size={18} style={{ color: "var(--gold)" }} />
                  </div>
                  <p className="text-[12px] font-semibold" style={{ color: "var(--th-text-secondary)" }}>
                    Your watchlist is empty
                  </p>
                  <p className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                    Search any NSE or BSE stock to add it
                  </p>
                  <Link
                    href="/watchlist"
                    className="mt-1 text-[11px] font-mono font-bold px-4 py-2 rounded-lg transition-all"
                    style={{ background: "var(--th-gold-bg-strong)", border: "1px solid var(--th-border-accent)", color: "var(--gold)" }}
                  >
                    + Add Stocks
                  </Link>
                </div>
              ) : (
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {watchlist.slice(0, 6).map((item, i) => (
                    <motion.div
                      key={item.ticker}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Link
                        href={`/stock/${item.ticker}`}
                        className="flex items-center gap-2.5 px-3 py-3 rounded-xl transition-all duration-150 group block"
                        style={{
                          background: "var(--th-bg-elevated)",
                          border:     "1px solid var(--th-border-subtle)",
                        }}
                        onMouseEnter={e => {
                          const el = e.currentTarget as HTMLAnchorElement;
                          el.style.borderColor = "var(--th-border-accent)";
                          el.style.background  = "var(--th-bg-card-hover)";
                          el.style.transform   = "translateY(-1px)";
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget as HTMLAnchorElement;
                          el.style.borderColor = "var(--th-border-subtle)";
                          el.style.background  = "var(--th-bg-elevated)";
                          el.style.transform   = "translateY(0)";
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[8px] font-mono font-bold"
                          style={{ background: "var(--th-gold-bg-strong)", color: "var(--gold)", border: "1px solid var(--th-border-accent)" }}
                        >
                          {item.ticker.slice(0, 3)}
                        </div>
                        <div className="min-w-0 flex-1">
                          {/* Ticker — name weight */}
                          <div
                            style={{
                              fontFamily: "monospace",
                              fontSize: "14px",
                              fontWeight: 600,
                              color: "var(--th-text-primary)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.ticker}
                          </div>
                          {/* Metadata — micro label */}
                          <div
                            style={{
                              fontFamily: "monospace",
                              fontSize: "10px",
                              fontWeight: 400,
                              color: "var(--th-text-muted)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.exchange} · {item.sector ?? "Stock"}
                          </div>
                        </div>
                        <ChevronRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          style={{ color: "var(--th-text-faint)" }} />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Signal Preview */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-subtle)" }}
            >
              <div
                className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: "1px solid var(--th-border-subtle)" }}
              >
                <div className="flex items-center gap-2.5">
                  <Cpu size={12} style={{ color: "var(--gold)" }} />
                  <span className="text-[10.5px] font-mono font-bold uppercase tracking-widest" style={{ color: "var(--th-text-muted)" }}>
                    Large-Cap Movers
                  </span>
                </div>
                <Link
                  href="/ai"
                  className="flex items-center gap-1 text-[10px] font-mono font-semibold transition-all"
                  style={{ color: "var(--th-text-muted)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = "var(--gold)"}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "var(--th-text-muted)"}
                >
                  Analyse a stock <ArrowRight size={9} />
                </Link>
              </div>
              <div className="p-4">
                {market.status === "loading" && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="status" aria-label="Loading movers">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className="h-[74px] rounded-xl animate-pulse" style={{ background: "var(--th-bg-elevated)" }} />
                    ))}
                  </div>
                )}
                {market.status === "error" && (
                  <p className="text-[12px] font-mono py-4 text-center" style={{ color: "var(--th-text-muted)" }}>
                    Market data is temporarily unavailable.
                  </p>
                )}
                {movers && movers.gainers.length + movers.losers.length === 0 && (
                  <p className="text-[12px] font-mono py-4 text-center" style={{ color: "var(--th-text-muted)" }}>
                    No movers to show right now.
                  </p>
                )}
                {movers && movers.gainers.length + movers.losers.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[...movers.gainers.slice(0, 2), ...movers.losers.slice(0, 2)].map((m, i) => {
                      const up = m.change >= 0;
                      const color = up ? "#00FF9C" : "#FF4D4D";
                      return (
                        <motion.div key={m.ticker} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                          <Link
                            href={`/stock/${m.ticker}`}
                            className="flex flex-col gap-2 p-3 rounded-xl transition-all duration-200 block"
                            style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-subtle)" }}
                          >
                            <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 600, color: "var(--th-text-primary)" }}>
                              {m.ticker}
                            </span>
                            <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 700, color }}>
                              {up ? "▲ +" : "▼ "}{m.change.toFixed(2)}%
                            </span>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
                {market.status === "ready" && (
                  <p className="text-[10px] font-mono mt-3" style={{ color: "var(--th-text-faint)" }}>
                    Day change from Yahoo Finance for a fixed large-cap basket. Quotes may be delayed. Not investment advice.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Quick Actions + Account ── */}
          <div className="flex flex-col gap-4">

            {/* Quick Actions */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-subtle)" }}
            >
              <div
                className="flex items-center gap-2.5 px-5 py-3.5"
                style={{ borderBottom: "1px solid var(--th-border-subtle)" }}
              >
                <Zap size={12} style={{ color: "var(--gold)" }} />
                <span className="text-[10.5px] font-mono font-bold uppercase tracking-widest" style={{ color: "var(--th-text-muted)" }}>
                  Quick Access
                </span>
              </div>
              <div className="p-3 flex flex-col gap-1">
                {[
                  { icon: Search,    label: "Search Stocks",  href: "/",         desc: "Any NSE/BSE stock"        },
                  { icon: Brain,     label: "AI Analysis",    href: "/ai",       desc: "How the analysis works" },
                  { icon: TrendingUp,label: "Markets",        href: "/",         desc: "Live market overview"     },
                  { icon: BarChart2, label: "History",        href: "/history",  desc: "Price & event history"    },
                  { icon: Star,      label: "Watchlist",      href: "/watchlist",desc: "Your tracked stocks"      },
                ].map(({ icon: Icon, label, href, desc }) => (
                  <Link
                    key={href + label}
                    href={href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group"
                    style={{ border: "1px solid transparent" }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.background   = "var(--th-gold-bg)";
                      el.style.borderColor  = "var(--th-border-subtle)";
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.background  = "transparent";
                      el.style.borderColor = "transparent";
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--th-gold-bg-strong)", border: "1px solid var(--th-border-accent)" }}
                    >
                      <Icon size={11} style={{ color: "var(--gold)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold" style={{ color: "var(--th-text-primary)" }}>{label}</div>
                      <div className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>{desc}</div>
                    </div>
                    <ChevronRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      style={{ color: "var(--th-text-faint)" }} />
                  </Link>
                ))}
              </div>
            </div>

            {/* Account info */}
            {profile && (
              <div
                className="rounded-xl overflow-hidden"
                style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-subtle)" }}
              >
                <div
                  className="flex items-center gap-2.5 px-5 py-3.5"
                  style={{ borderBottom: "1px solid var(--th-border-subtle)" }}
                >
                  <Activity size={11} style={{ color: "var(--th-text-muted)" }} />
                  <span className="text-[10.5px] font-mono font-bold uppercase tracking-widest" style={{ color: "var(--th-text-muted)" }}>
                    Account
                  </span>
                </div>
                <div className="p-4 flex flex-col gap-2.5">
                  {[
                    { label: "Email",        value: profile.email },
                    { label: "Member Since", value: new Date(profile.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) },
                    { label: "Last Login",   value: profile.lastLogin ? new Date(profile.lastLogin).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Now" },
                    { label: "Plan",         value: tier.charAt(0).toUpperCase() + tier.slice(1) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>{label}</span>
                      <span className="text-[11px] font-mono font-semibold truncate max-w-[140px] text-right" style={{ color: "var(--th-text-secondary)" }}>
                        {value}
                      </span>
                    </div>
                  ))}
                  <Link
                    href="/profile"
                    className="mt-1 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-mono font-bold transition-all"
                    style={{
                      background: "var(--th-bg-elevated)",
                      border:     "1px solid var(--th-border-subtle)",
                      color:      "var(--th-text-muted)",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLAnchorElement).style.color       = "var(--gold)";
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--th-border-accent)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLAnchorElement).style.color       = "var(--th-text-muted)";
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--th-border-subtle)";
                    }}
                  >
                    Edit Profile <ArrowRight size={10} />
                  </Link>
                </div>
              </div>
            )}

            {/* Portfolio Stress Test */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-subtle)" }}
            >
              <div
                className="flex items-center gap-2.5 px-5 py-3.5"
                style={{ borderBottom: "1px solid var(--th-border-subtle)" }}
              >
                <Shield size={11} style={{ color: "var(--th-text-muted)" }} />
                <span className="text-[10.5px] font-mono font-bold uppercase tracking-widest" style={{ color: "var(--th-text-muted)" }}>
                  Portfolio Stress Test
                </span>
              </div>
              <div className="p-5 flex flex-col gap-5">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: "var(--th-text-muted)" }}>If NIFTY falls 20%</div>
                  <div className="flex items-baseline gap-2">
                    <div className="font-mono font-bold" style={{ fontSize: "36px", color: "var(--negative)", letterSpacing: "-0.04em", lineHeight: 1 }}>-19.5%</div>
                    <div className="text-[11px] font-mono" style={{ color: "var(--th-text-faint)" }}>Est. Loss</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg" style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-subtle)" }}>
                    <div className="text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: "var(--th-text-faint)" }}>Risk Level</div>
                    <div className="text-[12px] font-bold" style={{ color: "var(--gold)" }}>MEDIUM</div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-subtle)" }}>
                    <div className="text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: "var(--th-text-faint)" }}>Protection Score</div>
                    <div className="text-[12px] font-bold" style={{ color: "var(--th-text-primary)" }}>63<span className="text-[9px]" style={{ color: "var(--th-text-muted)" }}>/100</span></div>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest mb-2.5" style={{ color: "var(--th-text-muted)" }}>Most Vulnerable</div>
                  <div className="flex flex-col gap-2">
                    {["TEJASNET", "NTPCGREEN", "GATECH"].map((t, i) => (
                      <div key={t} className="flex items-center justify-between p-2 rounded-md" style={{ background: "rgba(255,77,77,0.04)", border: "1px solid rgba(255,77,77,0.1)" }}>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>{i + 1}.</span>
                          <span className="text-[12px] font-semibold" style={{ color: "var(--th-text-primary)" }}>{t}</span>
                        </div>
                        <AlertTriangle size={11} style={{ color: "var(--negative)" }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Intelligence CTA */}
            <Link
              href="/ai/analyze"
              className="rounded-xl p-5 flex flex-col gap-3 transition-all duration-200 relative overflow-hidden group block"
              style={{
                background: "linear-gradient(135deg, rgba(255,215,0,0.07) 0%, rgba(201,162,39,0.04) 100%)",
                border:     "1px solid rgba(255,215,0,0.18)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,215,0,0.35)";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow   = "0 8px 32px rgba(0,0,0,0.4), 0 0 24px rgba(255,215,0,0.08)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,215,0,0.18)";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow   = "none";
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse 60% 60% at 50% 0%, rgba(255,215,0,0.06) 0%, transparent 60%)" }}
              />
              <div className="relative flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.28)" }}
                >
                  <Brain size={14} style={{ color: "var(--gold)" }} />
                </div>
                <div>
                  <div className="text-[12px] font-bold" style={{ color: "var(--gold)" }}>Run AI Analysis</div>
                  <div className="text-[9.5px] font-mono" style={{ color: "rgba(255,215,0,0.55)" }}>Rule-based scores · optional AI narrative</div>
                </div>
              </div>
              <div className="relative flex items-center gap-1.5 text-[10px] font-mono font-bold"
                style={{ color: "var(--gold)" }}>
                Start now <ArrowRight size={11} />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
