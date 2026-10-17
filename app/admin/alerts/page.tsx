"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell, BellOff, Zap, TrendingUp, TrendingDown, BarChart2,
  Brain, Newspaper, Calendar, RefreshCw, Send, Users,
  Activity, CheckCircle, XCircle, Clock, AlertCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TelegramUser {
  chatId: string | null;
  username: string | null;
  firstName: string | null;
  email: string;
  connectedAt: string | null;
}

interface AlertEntry {
  id: string;
  type: string;
  ticker: string | null;
  title: string;
  channel: string;
  sentAt: string;
  email: string;
}

interface AlertCount { type: string; count: number }

interface DashData {
  telegramUsers: TelegramUser[];
  recentAlerts: AlertEntry[];
  alertCounts: AlertCount[];
}

// ── Alert type config ─────────────────────────────────────────────────────────

const ALERT_TYPES = [
  { pref: "breakoutAlerts",  label: "Breakout Alerts",   icon: TrendingUp,  color: "var(--positive)" },
  { pref: "breakdownAlerts", label: "Breakdown Alerts",  icon: TrendingDown, color: "#FF4444" },
  { pref: "volumeAlerts",    label: "Volume Spikes",      icon: BarChart2,   color: "#FFAA00" },
  { pref: "aiBuySignals",    label: "Momentum Up",        icon: Brain,       color: "#00CFFF" },
  { pref: "aiSellSignals",   label: "Momentum Down",       icon: Brain,       color: "#FF6B9D" },
  { pref: "earningsAlerts",  label: "Earnings Alerts",   icon: Calendar,    color: "#A78BFA" },
  { pref: "marketSummary",   label: "Daily Briefing",    icon: Activity,    color: "#34D399" },
  { pref: "macroNews",       label: "Breaking News",     icon: Newspaper,   color: "#FB923C" },
  { pref: "telegramEnabled", label: "Telegram Channel",  icon: Send,        color: "#38BDF8" },
];

const TYPE_ICONS: Record<string, React.ElementType> = {
  breakout: TrendingUp, breakdown: TrendingDown, volume: BarChart2,
  ai_buy: Brain, ai_sell: Brain, earnings: Calendar,
  market_summary: Activity, macro: Newspaper,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminAlertsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [data, setData]           = useState<DashData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [toggling, setToggling]   = useState<string | null>(null);
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/alerts");
      if (!res.ok) { router.push("/dashboard"); return; }
      setData(await res.json());
    } catch { showToast("Failed to load dashboard", false); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/auth/login"); return; }
    if (status === "authenticated") fetchData();
  }, [status, fetchData, router]);

  const trigger = async (action: string, label: string) => {
    setTriggering(action);
    try {
      const res = await fetch("/api/admin/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.ok) {
        const r = json.result;
        const detail = r?.alerts != null
          ? ` — ${r.alerts} alert(s) sent`
          : r?.sent != null ? ` — sent to ${r.sent} user(s)` : "";
        showToast(`${label} triggered${detail}`, true);
        fetchData();
      } else {
        showToast(json.error ?? "Trigger failed", false);
      }
    } catch { showToast("Request failed", false); }
    finally { setTriggering(null); }
  };

  const togglePref = async (pref: string, value: boolean, label: string) => {
    setToggling(pref);
    try {
      const res = await fetch("/api/admin/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pref, value }),
      });
      const json = await res.json();
      if (json.ok) {
        showToast(`${label} ${value ? "enabled" : "disabled"} for ${json.updated} user(s)`, true);
      } else {
        showToast(json.error ?? "Update failed", false);
      }
    } catch { showToast("Request failed", false); }
    finally { setToggling(null); }
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });
  };

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#080C14", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--positive)", fontSize: 14 }}>Loading admin panel…</div>
      </div>
    );
  }

  if (!data) return null;

  const totalAlerts = data.alertCounts.reduce((s, c) => s + c.count, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#080C14", color: "#E2E8F0", fontFamily: "monospace", padding: "24px" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 999,
          background: toast.ok ? "#0D2B1F" : "#2B0D0D",
          border: `1px solid ${toast.ok ? "#00FF9C" : "#FF4444"}`,
          borderRadius: 8, padding: "10px 16px", fontSize: 13,
          color: toast.ok ? "#00FF9C" : "#FF4444",
        }}>
          {toast.ok ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--positive)", marginBottom: 4 }}>
          ⚡ Alert Engine Admin
        </div>
        <div style={{ fontSize: 12, color: "#64748B" }}>
          EquityLens · Proactive Alert System
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Telegram Users", value: data.telegramUsers.length, icon: Users, color: "#38BDF8" },
          { label: "Total Alerts Sent", value: totalAlerts, icon: Bell, color: "var(--positive)" },
          { label: "Alert Types", value: data.alertCounts.length, icon: Activity, color: "#A78BFA" },
        ].map(s => (
          <div key={s.label} style={{ background: "#0D1621", border: "1px solid #1E293B", borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, color: "#64748B", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>

        {/* Manual triggers */}
        <div style={{ background: "#0D1621", border: "1px solid #1E293B", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", marginBottom: 14 }}>MANUAL TRIGGERS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { action: "trigger_price",    label: "Scan Price Alerts",   icon: Zap,      color: "var(--positive)" },
              { action: "trigger_news",     label: "Scan News Alerts",    icon: Newspaper, color: "#FB923C" },
              { action: "trigger_briefing", label: "Send Daily Briefing", icon: Send,      color: "#38BDF8" },
            ].map(t => {
              const Icon = t.icon;
              const busy = triggering === t.action;
              return (
                <button
                  key={t.action}
                  onClick={() => trigger(t.action, t.label)}
                  disabled={!!triggering}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: busy ? "#1E293B" : "transparent",
                    border: `1px solid ${t.color}22`,
                    borderRadius: 8, padding: "10px 14px",
                    color: busy ? "#64748B" : t.color,
                    cursor: triggering ? "not-allowed" : "pointer",
                    fontSize: 13, fontFamily: "monospace",
                    transition: "background 0.2s",
                  }}
                >
                  {busy
                    ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
                    : <Icon size={14} />}
                  {busy ? "Running…" : t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Alert volume by type */}
        <div style={{ background: "#0D1621", border: "1px solid #1E293B", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", marginBottom: 14 }}>ALERT VOLUME BY TYPE</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.alertCounts.slice(0, 8).map(c => {
              const Icon = TYPE_ICONS[c.type] ?? Bell;
              const pct = totalAlerts > 0 ? (c.count / totalAlerts) * 100 : 0;
              return (
                <div key={c.type} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Icon size={12} style={{ color: "#64748B", flexShrink: 0 }} />
                  <div style={{ fontSize: 11, color: "#94A3B8", width: 100, flexShrink: 0 }}>
                    {c.type.replace(/_/g, " ")}
                  </div>
                  <div style={{ flex: 1, height: 4, background: "#1E293B", borderRadius: 2 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "#00FF9C", borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 11, color: "#64748B", width: 30, textAlign: "right" }}>{c.count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Global alert type toggles */}
      <div style={{ background: "#0D1621", border: "1px solid #1E293B", borderRadius: 10, padding: 20, marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", marginBottom: 4 }}>GLOBAL ALERT TOGGLES</div>
        <div style={{ fontSize: 11, color: "#475569", marginBottom: 16 }}>
          Enables or disables each alert type across ALL users simultaneously.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {ALERT_TYPES.map(t => {
            const Icon = t.icon;
            const busy = toggling === t.pref;
            return (
              <div key={t.pref} style={{
                background: "#0A1628", border: "1px solid #1E293B",
                borderRadius: 8, padding: "12px 14px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon size={13} style={{ color: t.color }} />
                  <span style={{ fontSize: 12, color: "#CBD5E1" }}>{t.label}</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => togglePref(t.pref, true, t.label)}
                    disabled={busy}
                    title="Enable for all users"
                    style={{
                      background: "transparent", border: "1px solid #00FF9C33",
                      borderRadius: 4, padding: "3px 8px", cursor: "pointer",
                      color: "var(--positive)", fontSize: 11, fontFamily: "monospace",
                    }}
                  >ON</button>
                  <button
                    onClick={() => togglePref(t.pref, false, t.label)}
                    disabled={busy}
                    title="Disable for all users"
                    style={{
                      background: "transparent", border: "1px solid #FF444433",
                      borderRadius: 4, padding: "3px 8px", cursor: "pointer",
                      color: "#FF4444", fontSize: 11, fontFamily: "monospace",
                    }}
                  >OFF</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Connected Telegram users */}
        <div style={{ background: "#0D1621", border: "1px solid #1E293B", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", marginBottom: 14 }}>
            CONNECTED TELEGRAM USERS ({data.telegramUsers.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }}>
            {data.telegramUsers.length === 0 ? (
              <div style={{ fontSize: 12, color: "#475569" }}>No connected users yet.</div>
            ) : data.telegramUsers.map(u => (
              <div key={u.chatId ?? u.email} style={{
                background: "#0A1628", borderRadius: 6, padding: "8px 12px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div>
                  <div style={{ fontSize: 12, color: "#E2E8F0" }}>
                    {u.firstName ?? u.username ?? "Unknown"}
                    {u.username && <span style={{ color: "#64748B" }}> @{u.username}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#475569" }}>{u.email}</div>
                </div>
                <CheckCircle size={12} style={{ color: "var(--positive)" }} />
              </div>
            ))}
          </div>
        </div>

        {/* Recent alerts log */}
        <div style={{ background: "#0D1621", border: "1px solid #1E293B", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", marginBottom: 14 }}>
            RECENT ALERTS LOG
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
            {data.recentAlerts.length === 0 ? (
              <div style={{ fontSize: 12, color: "#475569" }}>No alerts sent yet.</div>
            ) : data.recentAlerts.slice(0, 40).map(a => {
              const Icon = TYPE_ICONS[a.type] ?? Bell;
              return (
                <div key={a.id} style={{
                  background: "#0A1628", borderRadius: 6, padding: "7px 10px",
                  display: "flex", alignItems: "flex-start", gap: 8,
                }}>
                  <Icon size={11} style={{ color: "#64748B", marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "#CBD5E1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {a.ticker ? <span style={{ color: "var(--positive)", marginRight: 6 }}>{a.ticker}</span> : null}
                      {a.title}
                    </div>
                    <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>
                      {fmtTime(a.sentAt)} · {a.channel} · {a.email}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        button:hover:not(:disabled) { opacity: 0.85; }
      `}</style>
    </div>
  );
}
