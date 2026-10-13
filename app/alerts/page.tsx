"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, BellOff, Send, Zap, TrendingUp, TrendingDown,
  BarChart2, Brain, Target, Shield, Star, RefreshCw,
  CheckCircle, XCircle, Clock, ChevronRight, Trash2,
  Smartphone, Mail, Globe, Crown, Sparkles, AlertCircle,
  ExternalLink, Copy, Check,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { MarketTicker } from "@/components/MarketTicker";
import { useTheme } from "@/lib/context/ThemeContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TelegramStatus {
  connected: boolean;
  username: string | null;
  firstName: string | null;
  connectedAt: string | null;
}

interface AlertPrefs {
  breakoutAlerts: boolean;
  breakdownAlerts: boolean;
  volumeAlerts: boolean;
  aiBuySignals: boolean;
  aiSellSignals: boolean;
  slHitAlerts: boolean;
  targetAlerts: boolean;
  earningsAlerts: boolean;
  marketSummary: boolean;
  macroNews: boolean;
  telegramEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  tier: string;
  watchlistOnly: boolean;
}

interface AlertItem {
  id: string;
  type: string;
  ticker: string | null;
  title: string;
  message: string;
  channel: string;
  sentAt: string;
  read: boolean;
}

// ── Alert type metadata ───────────────────────────────────────────────────────

const ALERT_TYPES = [
  { key: "breakoutAlerts",  label: "Breakout Alerts",   desc: "52-week high breakouts",    icon: TrendingUp,  color: "#00FF9C", tier: "free"  },
  { key: "breakdownAlerts", label: "Breakdown Alerts",  desc: "52-week low breakdowns",    icon: TrendingDown,color: "#FF4D6A", tier: "free"  },
  { key: "aiBuySignals",    label: "Momentum Up",        desc: "Sharp rises on heavy volume",icon: Brain,       color: "#FFD700", tier: "pro"   },
  { key: "aiSellSignals",   label: "Momentum Down",      desc: "Sharp falls on heavy volume",icon: Target,      color: "#FF8C00", tier: "pro"   },
  { key: "volumeAlerts",    label: "Volume Spikes",     desc: "3x+ above-average volume",  icon: BarChart2,   color: "#4FC3F7", tier: "pro"   },
  { key: "slHitAlerts",     label: "Stop Loss Hit",     desc: "Price hits your SL level",  icon: Shield,      color: "#FF4D6A", tier: "free"  },
  { key: "targetAlerts",    label: "Target Hit",        desc: "Price hits your target",    icon: Star,        color: "#00FF9C", tier: "free"  },
  { key: "earningsAlerts",  label: "Earnings Alerts",   desc: "Quarterly results alerts",  icon: Zap,         color: "#CE93D8", tier: "pro"   },
  { key: "marketSummary",   label: "Daily Briefing",    desc: "9:15 AM IST market summary",icon: Globe,       color: "#FFD700", tier: "free"  },
  { key: "macroNews",       label: "Macro News",        desc: "RBI, FII, macro events",    icon: AlertCircle, color: "#4FC3F7", tier: "elite" },
];

const TYPE_ICON: Record<string, { icon: any; color: string }> = {
  breakout:     { icon: TrendingUp,  color: "#00FF9C" },
  breakdown:    { icon: TrendingDown,color: "#FF4D6A" },
  volume:       { icon: BarChart2,   color: "#4FC3F7" },
  ai_buy:       { icon: Brain,       color: "#FFD700" },
  ai_sell:      { icon: Target,      color: "#FF8C00" },
  sl_hit:       { icon: Shield,      color: "#FF4D6A" },
  target_hit:   { icon: Star,        color: "#00FF9C" },
  earnings:     { icon: Zap,         color: "#CE93D8" },
  market_summary:{ icon: Globe,      color: "#FFD700" },
  macro:        { icon: AlertCircle, color: "#4FC3F7" },
};

const TIER_CONFIG = {
  free:  { label: "FREE",  color: "#888",    bg: "rgba(136,136,136,0.1)"  },
  pro:   { label: "PRO",   color: "#FFD700", bg: "rgba(255,215,0,0.12)"   },
  elite: { label: "ELITE", color: "#CE93D8", bg: "rgba(206,147,216,0.12)" },
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme } = useTheme();
  const isLight = theme === "light";

  // Telegram
  const [tgStatus, setTgStatus]       = useState<TelegramStatus | null>(null);
  const [connectData, setConnectData] = useState<{ deepLink: string; token: string; botUsername: string; expiresAt: string } | null>(null);
  const [tgLoading, setTgLoading]     = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [copied, setCopied]           = useState(false);

  // Preferences
  const [prefs, setPrefs]       = useState<AlertPrefs | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [saving, setSaving]     = useState<string | null>(null);

  // Push
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // History
  const [history, setHistory]       = useState<AlertItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login?callbackUrl=/alerts");
  }, [status, router]);

  // ── Load data on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== "authenticated") return;
    fetchTgStatus();
    fetchPrefs();
    fetchHistory(0);
    checkPushSupport();
  }, [status]);

  async function fetchTgStatus() {
    const r = await fetch("/api/telegram/connect");
    if (r.ok) setTgStatus(await r.json());
  }

  async function fetchPrefs() {
    const r = await fetch("/api/alerts/preferences");
    if (r.ok) setPrefs(await r.json());
  }

  async function fetchHistory(page: number) {
    setHistoryLoading(true);
    const r = await fetch(`/api/alerts/history?limit=20&offset=${page * 20}`);
    if (r.ok) {
      const data = await r.json();
      setHistory(page === 0 ? data.items : prev => [...prev, ...data.items]);
      setHistoryTotal(data.total);
      setHistoryPage(page);
    }
    setHistoryLoading(false);
  }

  async function checkPushSupport() {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setPushSupported(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setPushSubscribed(!!sub);
    } catch { /* not critical */ }
  }

  // ── Telegram connect ───────────────────────────────────────────────────────
  async function handleTgConnect() {
    setTgLoading(true);
    try {
      const r = await fetch("/api/telegram/connect", { method: "POST" });
      if (r.ok) setConnectData(await r.json());
    } finally {
      setTgLoading(false);
    }
  }

  async function handleTgDisconnect() {
    setTgLoading(true);
    try {
      await fetch("/api/telegram/connect", { method: "DELETE" });
      setTgStatus(prev => prev ? { ...prev, connected: false } : null);
      setConnectData(null);
    } finally {
      setTgLoading(false);
    }
  }

  async function handleTestAlert() {
    setTestLoading(true);
    try {
      await fetch("/api/telegram/test", { method: "POST" });
    } finally {
      setTestLoading(false);
    }
  }

  async function pollTgStatus() {
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const r = await fetch("/api/telegram/connect");
      if (r.ok) {
        const data = await r.json();
        setTgStatus(data);
        if (data.connected) { setConnectData(null); return; }
      }
    }
  }

  function copyDeepLink() {
    if (!connectData) return;
    navigator.clipboard.writeText(connectData.deepLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Start polling when connect data is shown
  useEffect(() => {
    if (connectData) pollTgStatus();
  }, [connectData]);

  // ── Toggle preference ──────────────────────────────────────────────────────
  async function togglePref(key: keyof AlertPrefs) {
    if (!prefs) return;
    const newVal = !prefs[key];
    setPrefs(p => p ? { ...p, [key]: newVal } : p);
    setSaving(key);
    try {
      await fetch("/api/alerts/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newVal }),
      });
    } finally {
      setSaving(null);
    }
  }

  // ── Push subscribe / unsubscribe ───────────────────────────────────────────
  async function handlePushToggle() {
    if (!pushSupported) return;
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (pushSubscribed) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setPushSubscribed(false);
        if (prefs) {
          setPrefs(p => p ? { ...p, pushEnabled: false } : p);
          await fetch("/api/alerts/preferences", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pushEnabled: false }),
          });
        }
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) { alert("Push notifications not configured yet."); return; }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
        });

        const subJson: any = sub.toJSON();
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: subJson.endpoint,
            keys: subJson.keys,
            userAgent: navigator.userAgent.slice(0, 200),
          }),
        });
        setPushSubscribed(true);
        if (prefs) {
          setPrefs(p => p ? { ...p, pushEnabled: true } : p);
          await fetch("/api/alerts/preferences", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pushEnabled: true }),
          });
        }
      }
    } finally {
      setPushLoading(false);
    }
  }

  // ── Clear history ──────────────────────────────────────────────────────────
  async function clearHistory() {
    await fetch("/api/alerts/history", { method: "DELETE" });
    setHistory([]);
    setHistoryTotal(0);
  }

  // ── Render helpers ─────────────────────────────────────────────────────────
  const cardBase: React.CSSProperties = {
    background: isLight ? "rgba(255,252,245,0.85)" : "rgba(10,10,10,0.85)",
    border: `1px solid ${isLight ? "rgba(184,150,46,0.18)" : "rgba(255,215,0,0.12)"}`,
    borderRadius: "12px",
    backdropFilter: "blur(20px)",
  };

  const goldText = { color: "var(--gold)" } as const;
  const dimText  = { color: "var(--text-dim)" } as const;
  const mutedText = { color: "var(--text-muted)" } as const;

  function Toggle({ active, onChange, loading }: { active: boolean; onChange: () => void; loading?: boolean }) {
    return (
      <button
        onClick={onChange}
        disabled={loading}
        className="relative w-10 h-5 rounded-full transition-all duration-200 flex-shrink-0"
        style={{
          background: active ? "var(--gold)" : isLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.12)",
          opacity: loading ? 0.6 : 1,
        }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
          style={{
            left: active ? "calc(100% - 18px)" : "2px",
            background: active ? "#050505" : isLight ? "#fff" : "rgba(255,255,255,0.7)",
          }}
        />
      </button>
    );
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--gold)" }} />
      </div>
    );
  }

  if (!session) return null;

  const tier = prefs?.tier ?? "free";
  const tierCfg = TIER_CONFIG[tier as keyof typeof TIER_CONFIG] ?? TIER_CONFIG.free;
  const unreadCount = history.filter(h => !h.read).length;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar />
      <MarketTicker />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Page Header ────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold tracking-wide" style={{ color: "var(--text)" }}>
                AI ALERTS
              </h1>
              <span
                className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold tracking-wider"
                style={{ background: tierCfg.bg, color: tierCfg.color, border: `1px solid ${tierCfg.color}40` }}
              >
                {tierCfg.label}
              </span>
              {unreadCount > 0 && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold"
                  style={{ background: "var(--gold)", color: "#050505" }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-[13px]" style={mutedText}>
              Telegram and browser push alerts, checked several times each trading day (not real-time)
            </p>
          </div>
        </div>

        {/* ── Notification Channels ─────────────────────────────────────── */}
        <section>
          <h2 className="text-[11px] font-mono uppercase tracking-[0.18em] mb-4" style={dimText}>
            Notification Channels
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Telegram Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
              className="p-5 space-y-4"
              style={cardBase}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(38,136,205,0.15)", border: "1px solid rgba(38,136,205,0.25)" }}
                  >
                    <Send size={16} style={{ color: "#2688CD" }} />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Telegram</div>
                    <div className="text-[10px] font-mono" style={dimText}>
                      {tgStatus?.connected ? `@${tgStatus.username ?? tgStatus.firstName ?? "Connected"}` : "Not connected"}
                    </div>
                  </div>
                </div>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: tgStatus?.connected ? "var(--positive)" : "#555" }}
                />
              </div>

              {tgStatus?.connected ? (
                <div className="space-y-2">
                  <button
                    onClick={handleTestAlert}
                    disabled={testLoading}
                    className="w-full py-2 rounded-lg text-[11px] font-mono transition-all duration-200"
                    style={{
                      background: "rgba(255,215,0,0.08)",
                      border: "1px solid rgba(255,215,0,0.25)",
                      color: "var(--gold)",
                    }}
                  >
                    {testLoading ? "Sending…" : "Send Test Alert"}
                  </button>
                  <button
                    onClick={handleTgDisconnect}
                    disabled={tgLoading}
                    className="w-full py-2 rounded-lg text-[11px] font-mono transition-all duration-200"
                    style={{ background: "rgba(255,77,77,0.06)", border: "1px solid rgba(255,77,77,0.18)", color: "#FF4D6A" }}
                  >
                    Disconnect
                  </button>
                </div>
              ) : connectData ? (
                <div className="space-y-3">
                  <div
                    className="p-3 rounded-lg space-y-2"
                    style={{ background: "rgba(255,215,0,0.04)", border: "1px solid rgba(255,215,0,0.15)" }}
                  >
                    <p className="text-[10px]" style={mutedText}>1. Open Telegram and search <strong>@{connectData.botUsername}</strong></p>
                    <p className="text-[10px]" style={mutedText}>2. Tap the link below or send the command to the bot</p>
                    <div className="flex items-center gap-2">
                      <code
                        className="flex-1 text-[9px] font-mono px-2 py-1 rounded truncate"
                        style={{ background: "rgba(0,0,0,0.3)", color: "var(--gold)" }}
                      >
                        /start {connectData.token}
                      </code>
                      <button
                        onClick={copyDeepLink}
                        className="p-1.5 rounded transition-all"
                        style={{ background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)", color: "var(--gold)" }}
                      >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                    <a
                      href={connectData.deepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-mono w-full transition-all"
                      style={{ background: "rgba(38,136,205,0.15)", border: "1px solid rgba(38,136,205,0.3)", color: "#2688CD" }}
                    >
                      <ExternalLink size={11} /> Open in Telegram
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]" style={dimText}>
                    <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--gold)" }} />
                    Waiting for connection…
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleTgConnect}
                  disabled={tgLoading}
                  className="w-full py-2 rounded-lg text-[11px] font-mono transition-all duration-200"
                  style={{
                    background: "linear-gradient(135deg, rgba(38,136,205,0.15), rgba(38,136,205,0.08))",
                    border: "1px solid rgba(38,136,205,0.3)",
                    color: "#2688CD",
                  }}
                >
                  {tgLoading ? "Generating link…" : "Connect Telegram"}
                </button>
              )}
            </motion.div>

            {/* Browser Push Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
              className="p-5 space-y-4"
              style={cardBase}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(0,255,156,0.1)", border: "1px solid rgba(0,255,156,0.2)" }}
                  >
                    <Bell size={16} style={{ color: "var(--positive)" }} />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Browser Push</div>
                    <div className="text-[10px] font-mono" style={dimText}>
                      {!pushSupported ? "Not supported" : pushSubscribed ? "Active" : "Not enabled"}
                    </div>
                  </div>
                </div>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: pushSubscribed ? "var(--positive)" : "#555" }}
                />
              </div>

              <p className="text-[11px]" style={mutedText}>
                Instant browser notifications even when the app is in the background.
              </p>

              {pushSupported ? (
                <button
                  onClick={handlePushToggle}
                  disabled={pushLoading}
                  className="w-full py-2 rounded-lg text-[11px] font-mono transition-all duration-200"
                  style={
                    pushSubscribed
                      ? { background: "rgba(255,77,77,0.06)", border: "1px solid rgba(255,77,77,0.18)", color: "#FF4D6A" }
                      : { background: "rgba(0,255,156,0.08)", border: "1px solid rgba(0,255,156,0.25)", color: "var(--positive)" }
                  }
                >
                  {pushLoading ? "…" : pushSubscribed ? "Disable Push" : "Enable Push"}
                </button>
              ) : (
                <div className="py-2 text-center text-[11px] font-mono" style={dimText}>
                  Use Chrome/Firefox/Edge
                </div>
              )}
            </motion.div>

            {/* Email Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
              className="p-5 space-y-4 relative overflow-hidden"
              style={cardBase}
            >
              <div
                className="absolute top-2 right-2 px-2 py-0.5 rounded text-[9px] font-mono"
                style={{ background: "rgba(206,147,216,0.12)", color: "#CE93D8", border: "1px solid rgba(206,147,216,0.2)" }}
              >
                COMING SOON
              </div>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(206,147,216,0.1)", border: "1px solid rgba(206,147,216,0.2)" }}
                >
                  <Mail size={16} style={{ color: "#CE93D8" }} />
                </div>
                <div>
                  <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Email Digest</div>
                  <div className="text-[10px] font-mono" style={dimText}>Daily summary</div>
                </div>
              </div>
              <p className="text-[11px]" style={mutedText}>
                Morning email with NIFTY outlook, AI picks, and portfolio alerts.
              </p>
              <div className="py-2 text-center text-[11px] font-mono" style={{ color: "#CE93D8", opacity: 0.5 }}>
                Elite tier feature
              </div>
            </motion.div>

          </div>
        </section>

        {/* ── Alert Preferences ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-mono uppercase tracking-[0.18em]" style={dimText}>
              Alert Preferences
            </h2>
            {prefs && (
              <label className="flex items-center gap-2 text-[11px] font-mono" style={mutedText}>
                <Toggle
                  active={prefs.watchlistOnly}
                  onChange={() => togglePref("watchlistOnly")}
                  loading={saving === "watchlistOnly"}
                />
                Watchlist only
              </label>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {ALERT_TYPES.map(({ key, label, desc, icon: Icon, color, tier: reqTier }) => {
              const active = prefs?.[key as keyof AlertPrefs] as boolean ?? false;
              const locked = reqTier === "elite" && tier !== "elite"
                || reqTier === "pro" && tier === "free";

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: ALERT_TYPES.findIndex(t => t.key === key) * 0.04 }}
                  className="flex items-center justify-between p-3.5 rounded-xl transition-all duration-200"
                  style={{
                    ...cardBase,
                    opacity: locked ? 0.55 : 1,
                    boxShadow: active && !locked ? `0 0 20px ${color}12` : "none",
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}18`, border: `1px solid ${color}30` }}
                    >
                      <Icon size={14} style={{ color }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-semibold truncate" style={{ color: "var(--text)" }}>{label}</span>
                        {reqTier !== "free" && (
                          <span
                            className="px-1.5 py-0 rounded text-[8px] font-mono uppercase flex-shrink-0"
                            style={reqTier === "elite"
                              ? { background: "rgba(206,147,216,0.12)", color: "#CE93D8" }
                              : { background: "rgba(255,215,0,0.1)", color: "var(--gold)" }
                            }
                          >
                            {reqTier}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] truncate" style={dimText}>{desc}</div>
                    </div>
                  </div>
                  {locked ? (
                    <Crown size={14} style={{ color: reqTier === "elite" ? "#CE93D8" : "var(--gold)", flexShrink: 0 }} />
                  ) : (
                    <Toggle
                      active={active}
                      onChange={() => togglePref(key as keyof AlertPrefs)}
                      loading={saving === key}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── Alert History ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-mono uppercase tracking-[0.18em]" style={dimText}>
              Alert History
              {historyTotal > 0 && (
                <span className="ml-2 text-[10px]" style={goldText}>({historyTotal})</span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { fetchHistory(0); }}
                className="p-1.5 rounded-lg transition-all"
                style={{ background: "var(--th-gold-bg)", border: "1px solid var(--th-border-subtle)", color: "var(--text-muted)" }}
              >
                <RefreshCw size={12} className={historyLoading ? "animate-spin" : ""} />
              </button>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all"
                  style={{ background: "rgba(255,77,77,0.06)", border: "1px solid rgba(255,77,77,0.15)", color: "#FF4D6A" }}
                >
                  <Trash2 size={10} /> Clear
                </button>
              )}
            </div>
          </div>

          {historyLoading && history.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--gold)" }} />
            </div>
          ) : history.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 rounded-xl"
              style={cardBase}
            >
              <Bell size={32} style={{ color: "var(--text-dim)", marginBottom: "12px" }} />
              <p className="text-[13px] font-medium" style={{ color: "var(--text)" }}>No alerts yet</p>
              <p className="text-[11px] mt-1" style={mutedText}>Alerts will appear here once you connect Telegram or enable push.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item, i) => {
                const meta = TYPE_ICON[item.type] ?? { icon: Bell, color: "var(--gold)" };
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-start gap-3 p-3.5 rounded-xl"
                    style={{
                      ...cardBase,
                      opacity: item.read ? 0.65 : 1,
                      borderColor: !item.read ? `${meta.color}30` : undefined,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}30` }}
                    >
                      <Icon size={14} style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>{item.title}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {item.ticker && (
                            <Link
                              href={`/stock/${item.ticker}`}
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                              style={{ background: "rgba(255,215,0,0.08)", color: "var(--gold)", border: "1px solid rgba(255,215,0,0.2)" }}
                            >
                              {item.ticker}
                            </Link>
                          )}
                          <span className="text-[9px] font-mono" style={dimText}>
                            {new Date(item.sentAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] mt-0.5 line-clamp-2" style={mutedText}>{item.message}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {item.channel.split(",").filter(Boolean).map(ch => (
                          <span key={ch} className="text-[9px] font-mono px-1.5 py-0 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-dim)" }}>
                            {ch}
                          </span>
                        ))}
                        {!item.read && (
                          <span className="text-[9px] font-mono px-1.5 py-0 rounded" style={{ background: "rgba(255,215,0,0.08)", color: "var(--gold)" }}>
                            NEW
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {history.length < historyTotal && (
                <button
                  onClick={() => fetchHistory(historyPage + 1)}
                  disabled={historyLoading}
                  className="w-full py-3 rounded-xl text-[11px] font-mono transition-all"
                  style={{
                    ...cardBase,
                    color: "var(--gold)",
                    borderStyle: "dashed",
                  }}
                >
                  {historyLoading ? "Loading…" : `Load more (${historyTotal - history.length} remaining)`}
                </button>
              )}
            </div>
          )}
        </section>

        {/* Paid plans were removed: there is no billing system and several advertised features
            ("institutional signals", "smart money tracking", "real-time alerts") did not exist. */}

      </main>
    </div>
  );
}

// ── Utility ───────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
