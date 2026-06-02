"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio, Zap, Target, RefreshCw, ExternalLink,
  Search, CheckCircle, XCircle, MessageSquare,
  Settings, Plus, ChevronDown, ChevronUp, Activity,
  Wifi, WifiOff, Loader2, QrCode,
} from "lucide-react";
import Link from "next/link";
import { Navbar }       from "@/components/Navbar";
import { MarketTicker } from "@/components/MarketTicker";
import { useTheme }     from "@/lib/context/ThemeContext";
import type { Socket }  from "socket.io-client";

// ── Types ──────────────────────────────────────────────────────────────────────
type WAState = "INITIALIZING" | "QR_REQUIRED" | "AUTHENTICATED" | "CONNECTED" | "DISCONNECTED" | "RECONNECTING" | "SERVICE_OFFLINE";

interface WAStatus {
  state:           WAState;
  connected:       boolean;
  qr:              string | null;
  clientInfo:      { pushname: string; phone: string } | null;
  trackedChats:    string[];
  reconnectAttempts: number;
}

interface Signal {
  id:             string;
  ticker:         string;
  action:         string;
  entry:          number | null;
  target:         number | null;
  stopLoss:       number | null;
  classification: string;
  confidence:     number;
  sentiment:      string;
  aiSummary:      string | null;
  aiRisk:         string | null;
  sector:         string | null;
  isActive:       boolean;
  outcome:        string | null;
  createdAt:      string;
  message: {
    body:   string;
    sender: string | null;
    source: { name: string; type: string };
  };
}

interface LiveMessage {
  chatId:    string;
  chatName:  string;
  chatType:  string;
  body:      string;
  sender:    string;
  timestamp: number;
  receivedAt: number;
  signal: {
    ticker:    string | null;
    action:    string | null;
    target:    number | null;
    stopLoss:  number | null;
    entry:     number | null;
    confidence: number;
  } | null;
}

interface DBMessage {
  id:        string;
  body:      string;
  sender:    string | null;
  timestamp: string;
  source:    { name: string; type: string };
  signal:    Signal | null;
}

interface Stats {
  totalSignals:  number;
  activeSignals: number;
  todayMessages: number;
  hitRate:       number | null;
  topTickers:    Array<{ ticker: string; count: number }>;
  sources:       Array<{
    id:            string;
    name:          string;
    type:          string;
    totalMessages: number;
    wins:          number;
    losses:        number;
    hitRate:       number | null;
  }>;
}

interface WAChat {
  id:      string;
  name:    string;
  type:    string;
  tracked: boolean;
  unread:  number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const ACTION_COLOR: Record<string, string> = {
  BUY:         "#00FF9C",
  SELL:        "#FF4D4D",
  HOLD:        "#FFB800",
  BOOK_PROFIT: "#FFD700",
  WATCH:       "#60A5FA",
};
function actionColor(a: string) { return ACTION_COLOR[a] ?? "#909090"; }

const CLASS_COLOR: Record<string, string> = {
  HIGH_CONVICTION: "#FFD700",
  BREAKOUT:        "#00FF9C",
  BREAKDOWN:       "#FF4D4D",
  BUY_CALL:        "#34D399",
  SELL_CALL:       "#F87171",
  WARNING:         "#FBBF24",
  NEWS:            "#60A5FA",
  MACRO:           "#A78BFA",
  GENERAL:         "#909090",
};
const CLASS_LABEL: Record<string, string> = {
  HIGH_CONVICTION: "HIGH CONVICTION", BREAKOUT: "BREAKOUT",
  BREAKDOWN: "BREAKDOWN", BUY_CALL: "BUY CALL", SELL_CALL: "SELL CALL",
  WARNING: "WARNING", NEWS: "NEWS", MACRO: "MACRO", GENERAL: "GENERAL",
};

function relTime(ts: string | number) {
  const d = Date.now() - (typeof ts === "number" ? ts : new Date(ts).getTime());
  const s = Math.floor(d / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ── Connection status badge ────────────────────────────────────────────────────
function WABadge({ status }: { status: WAState }) {
  const cfg: Record<WAState, { label: string; color: string; bg: string; pulse: boolean }> = {
    SERVICE_OFFLINE: { label: "SERVICE OFFLINE", color: "#FF4D4D", bg: "rgba(255,77,77,0.10)",  pulse: false },
    INITIALIZING:    { label: "INITIALIZING",    color: "#FFB800", bg: "rgba(255,184,0,0.10)",   pulse: true  },
    QR_REQUIRED:     { label: "SCAN QR",         color: "#60A5FA", bg: "rgba(96,165,250,0.10)",  pulse: true  },
    AUTHENTICATED:   { label: "AUTHENTICATING",  color: "#FFB800", bg: "rgba(255,184,0,0.10)",   pulse: true  },
    CONNECTED:       { label: "CONNECTED",       color: "#00FF9C", bg: "rgba(0,255,156,0.10)",   pulse: true  },
    DISCONNECTED:    { label: "DISCONNECTED",    color: "#FF4D4D", bg: "rgba(255,77,77,0.10)",   pulse: false },
    RECONNECTING:    { label: "RECONNECTING",    color: "#FFB800", bg: "rgba(255,184,0,0.10)",   pulse: true  },
  };
  const c = cfg[status] ?? cfg.SERVICE_OFFLINE;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 7,
      padding: "6px 12px",
      background: c.bg,
      border: `1px solid ${c.color}33`,
      borderRadius: 6,
    }}>
      {status === "INITIALIZING" || status === "RECONNECTING" || status === "AUTHENTICATED"
        ? <Loader2 size={10} color={c.color} style={{ animation: "spin 1s linear infinite" }} />
        : <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: c.color,
            boxShadow: c.pulse ? `0 0 6px ${c.color}` : "none",
            animation: c.pulse && status === "CONNECTED" ? "dot-pulse 2s ease-in-out infinite" : "none",
          }} />
      }
      <span style={{ fontSize: 10, fontWeight: 700, color: c.color, letterSpacing: "0.08em" }}>
        {c.label}
      </span>
    </div>
  );
}

// ── Signal card ────────────────────────────────────────────────────────────────
function SignalCard({ sig, isLight, onOutcome }: {
  sig:       Signal;
  isLight:   boolean;
  onOutcome: (id: string, outcome: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const col    = actionColor(sig.action);
  const clCol  = CLASS_COLOR[sig.classification] ?? "#909090";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, overflow: "hidden" }}
      onClick={() => setOpen(x => !x)}
      style={{
        background:   isLight ? "rgba(250,248,242,0.97)" : "rgba(10,10,10,0.97)",
        border:       `1px solid ${col}20`,
        borderLeft:   `3px solid ${col}`,
        borderRadius: 8,
        padding:      "12px 14px",
        cursor:       "pointer",
      }}
    >
      {/* Row 1 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/stock/${sig.ticker}`}
            onClick={e => e.stopPropagation()}
            style={{ fontFamily: "var(--font-space-grotesk)", fontWeight: 700, fontSize: 15, color: col, textDecoration: "none", letterSpacing: "0.04em" }}
          >
            {sig.ticker}
          </Link>
          <span style={{ fontSize: 10, fontWeight: 700, background: `${col}18`, color: col, border: `1px solid ${col}44`, borderRadius: 4, padding: "2px 7px", letterSpacing: "0.06em" }}>
            {sig.action.replace("_", " ")}
          </span>
          <span style={{ fontSize: 9, fontWeight: 600, color: clCol, background: `${clCol}12`, border: `1px solid ${clCol}30`, borderRadius: 4, padding: "2px 6px", letterSpacing: "0.05em" }}>
            {CLASS_LABEL[sig.classification] ?? sig.classification}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{sig.confidence}%</span>
          <span style={{ fontSize: 10, color: "var(--text-dim)" }}>{relTime(sig.createdAt)}</span>
          {open ? <ChevronUp size={12} color="var(--text-muted)" /> : <ChevronDown size={12} color="var(--text-muted)" />}
        </div>
      </div>

      {/* Row 2 — prices */}
      {(sig.entry || sig.target || sig.stopLoss) && (
        <div className="flex gap-4 mt-2 flex-wrap">
          {sig.entry    && <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Entry <b style={{ color: "var(--text)" }}>₹{sig.entry.toLocaleString("en-IN")}</b></span>}
          {sig.target   && <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Target <b style={{ color: "#00FF9C" }}>₹{sig.target.toLocaleString("en-IN")}</b></span>}
          {sig.stopLoss && <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>SL <b style={{ color: "#FF4D4D" }}>₹{sig.stopLoss.toLocaleString("en-IN")}</b></span>}
        </div>
      )}

      {/* Row 3 — meta */}
      <div className="flex items-center gap-3 mt-1 flex-wrap">
        <span style={{ fontSize: 10, color: "var(--text-dim)" }}>{sig.message.source.name}</span>
        {sig.sector && <span style={{ fontSize: 10, color: "var(--text-dim)" }}>· {sig.sector}</span>}
        {sig.outcome && (
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: sig.outcome === "WIN" ? "#00FF9C" : sig.outcome === "LOSS" ? "#FF4D4D" : "#FFB800",
            background: sig.outcome === "WIN" ? "rgba(0,255,156,0.08)" : sig.outcome === "LOSS" ? "rgba(255,77,77,0.08)" : "rgba(255,184,0,0.08)",
            borderRadius: 4, padding: "1px 6px",
          }}>{sig.outcome}</span>
        )}
      </div>

      {/* Confidence bar */}
      <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginTop: 8 }}>
        <div style={{ height: "100%", width: `${sig.confidence}%`, background: col, borderRadius: 2, transition: "width 0.4s" }} />
      </div>

      {/* Expanded */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{
                background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 6, padding: "8px 10px",
                fontSize: 11, color: "var(--text-secondary)", fontFamily: "monospace", lineHeight: 1.6, marginBottom: 10,
              }}>{sig.message.body}</div>

              {sig.aiSummary && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: "#FFD700", fontWeight: 600, marginBottom: 4, letterSpacing: "0.07em" }}>AI INTERPRETATION</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>{sig.aiSummary}</div>
                </div>
              )}
              {sig.aiRisk && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: "#FF4D4D", fontWeight: 600, marginBottom: 4, letterSpacing: "0.07em" }}>RISK ANALYSIS</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>{sig.aiRisk}</div>
                </div>
              )}
              {sig.isActive && (
                <div className="flex gap-2">
                  <button onClick={() => onOutcome(sig.id, "WIN")} style={{ fontSize: 10, fontWeight: 600, background: "rgba(0,255,156,0.10)", color: "#00FF9C", border: "1px solid rgba(0,255,156,0.30)", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>
                    ✓ TARGET HIT
                  </button>
                  <button onClick={() => onOutcome(sig.id, "LOSS")} style={{ fontSize: 10, fontWeight: 600, background: "rgba(255,77,77,0.10)", color: "#FF4D4D", border: "1px solid rgba(255,77,77,0.30)", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>
                    ✗ SL HIT
                  </button>
                  <Link href={`/stock/${sig.ticker}`} style={{ fontSize: 10, fontWeight: 600, background: "rgba(255,215,0,0.08)", color: "#FFD700", border: "1px solid rgba(255,215,0,0.25)", borderRadius: 4, padding: "4px 10px", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                    <ExternalLink size={9} /> CHART
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Setup modal ────────────────────────────────────────────────────────────────
function SetupModal({ isLight, serviceUrl, waStatus, waChats, onSaveUrl, onClose, onChatsUpdate }: {
  isLight:       boolean;
  serviceUrl:    string;
  waStatus:      WAStatus | null;
  waChats:       WAChat[];
  onSaveUrl:     (url: string) => void;
  onClose:       () => void;
  onChatsUpdate: (chats: WAChat[]) => void;
}) {
  const [url,          setUrl]   = useState(serviceUrl);
  const [chats,        setChats] = useState<WAChat[]>(waChats);
  const [loadingChats, setLC]    = useState(false);
  const [chatError,    setChatError] = useState<string | null>(null);
  const [saving,       setSaving] = useState(false);
  const [search,       setSearch] = useState("");

  const isConnected = waStatus?.state === "CONNECTED";

  // Sync with parent waChats when they arrive via socket
  useEffect(() => {
    if (waChats.length > 0) setChats(waChats);
  }, [waChats]);

  const fetchChats = useCallback(async () => {
    if (!url) { setChatError("Enter the service URL first"); return; }
    setLC(true);
    setChatError(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const r = await fetch(`${url}/chats`, { signal: controller.signal });
      if (!r.ok) { setChatError(`Service returned ${r.status}`); return; }
      const data = await r.json();
      // Backend now returns { chats, total, cacheAge } or plain array for compat
      const arr: WAChat[] = Array.isArray(data) ? data : (data.chats ?? []);
      setChats(arr);
      onChatsUpdate(arr);
      console.log(`[Setup] Loaded ${arr.length} chats`);
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setChatError("Timed out (30s) — WhatsApp may still be loading chats. Try again.");
      } else {
        setChatError(`Fetch failed: ${(e as Error).message}`);
      }
    } finally {
      clearTimeout(timer);
      setLC(false);
    }
  }, [url, onChatsUpdate]);

  // Auto-fetch when modal opens and WA is connected but no chats cached yet
  useEffect(() => {
    if (isConnected && chats.length === 0) fetchChats();
  }, [isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleChat = async (chat: WAChat) => {
    setSaving(true);
    try {
      if (chat.tracked) {
        await fetch(`/api/broker-intelligence/sources?chatId=${encodeURIComponent(chat.id)}`, { method: "DELETE" });
        await fetch(`${url}/track/${encodeURIComponent(chat.id)}`, { method: "DELETE" });
      } else {
        await fetch("/api/broker-intelligence/sources", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId: chat.id, name: chat.name, type: chat.type }),
        });
        await fetch(`${url}/track`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId: chat.id, name: chat.name, type: chat.type }),
        });
      }
      const updated = chats.map(c => c.id === chat.id ? { ...c, tracked: !c.tracked } : c);
      setChats(updated);
      onChatsUpdate(updated);
      console.log(`[Setup] ${chat.tracked ? "Untracked" : "Tracking"}: ${chat.name}`);
    } catch (err) {
      console.error("[Setup] toggleChat error:", err);
    }
    setSaving(false);
  };

  const filteredChats = search
    ? chats.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.type.includes(search.toLowerCase()))
    : chats;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.88)" }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: isLight ? "#F2EDDE" : "#0A0A0A",
          border: "1px solid rgba(255,215,0,0.28)",
          borderRadius: 14,
          padding: "28px 30px",
          width: 580,
          maxWidth: "96vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,215,0,0.10)", border: "1px solid rgba(255,215,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Radio size={15} color="#FFD700" />
            </div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#FFD700", margin: 0 }}>Broker Intelligence Setup</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        {/* Status row */}
        {waStatus && (
          <div style={{ marginBottom: 16 }}>
            <WABadge status={waStatus.state} />
            {waStatus.clientInfo && (
              <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(0,255,156,0.06)", border: "1px solid rgba(0,255,156,0.18)", borderRadius: 6 }}>
                <div style={{ fontSize: 12, color: "#00FF9C", fontWeight: 600 }}>✓ {waStatus.clientInfo.pushname}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>+{waStatus.clientInfo.phone}</div>
              </div>
            )}
          </div>
        )}

        {/* QR display */}
        {waStatus?.qr && (
          <div style={{ marginBottom: 20, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#60A5FA", fontWeight: 600, marginBottom: 10, letterSpacing: "0.07em" }}>
              📱 SCAN WITH WHATSAPP
            </div>
            <img
              src={waStatus.qr}
              alt="WhatsApp QR"
              style={{ width: 220, height: 220, borderRadius: 8, display: "inline-block", background: "#fff" }}
            />
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 8 }}>
              WhatsApp → Settings → Linked Devices → Link a Device
            </div>
          </div>
        )}

        {/* Service URL */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, letterSpacing: "0.07em" }}>
            SERVICE URL
          </div>
          <div className="flex gap-2">
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://xxxx.trycloudflare.com"
              style={{
                flex: 1, padding: "8px 12px", fontSize: 13,
                background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,215,0,0.22)",
                borderRadius: 6, color: "var(--text)", outline: "none",
              }}
            />
            <button
              onClick={() => onSaveUrl(url)}
              style={{
                padding: "8px 16px", fontSize: 12, fontWeight: 600,
                background: "rgba(255,215,0,0.12)", color: "#FFD700",
                border: "1px solid rgba(255,215,0,0.30)",
                borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              Save
            </button>
          </div>
        </div>

        {/* Setup steps (when offline) */}
        {(!waStatus || waStatus.state === "SERVICE_OFFLINE") && (
          <div style={{ background: "rgba(255,215,0,0.05)", border: "1px solid rgba(255,215,0,0.15)", borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#FFD700", marginBottom: 10 }}>
              Connect the WhatsApp service
            </div>
            <ol style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 2.2, margin: 0, paddingLeft: 18 }}>
              <li>Open a terminal at the project root and run: <code style={{ color: "#FFD700" }}>.\start-mkb.ps1</code> (Windows) or <code style={{ color: "#FFD700" }}>./start-mkb.sh</code></li>
              <li>Copy the public URL printed in the terminal — looks like <code style={{ color: "#60A5FA" }}>https://xxxx.trycloudflare.com</code></li>
              <li>Paste it in the field above and click <strong>Save</strong></li>
              <li>Open <code style={{ color: "#60A5FA" }}>{url || "https://xxxx.trycloudflare.com"}/qr</code> to scan with WhatsApp</li>
              <li>This page auto-updates when connected</li>
            </ol>
          </div>
        )}

        {/* Chat selection (when connected) */}
        {isConnected && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.07em" }}>
                CHATS TO MONITOR
                {chats.length > 0 && <span style={{ color: "var(--text-dim)", marginLeft: 6, fontWeight: 400 }}>({chats.filter(c => c.tracked).length} tracked / {chats.length} total)</span>}
              </div>
              <button
                onClick={fetchChats}
                disabled={loadingChats}
                style={{ fontSize: 11, color: "#FFD700", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
              >
                <RefreshCw size={10} style={{ animation: loadingChats ? "spin 1s linear infinite" : "none" }} />
                {loadingChats ? "Loading…" : "Refresh"}
              </button>
            </div>

            {/* Search */}
            {chats.length > 5 && (
              <div style={{ position: "relative", marginBottom: 8 }}>
                <Search size={11} color="var(--text-dim)" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search chats…"
                  style={{ width: "100%", paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7, fontSize: 12, background: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,215,0,0.18)", borderRadius: 6, color: "var(--text)", outline: "none" }}
                />
              </div>
            )}

            {/* Error */}
            {chatError && (
              <div style={{ marginBottom: 8, padding: "8px 12px", background: "rgba(255,77,77,0.08)", border: "1px solid rgba(255,77,77,0.25)", borderRadius: 6, fontSize: 11, color: "#FF4D4D" }}>
                {chatError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 320, overflowY: "auto" }}>
              {loadingChats && chats.length === 0
                ? <div style={{ textAlign: "center", padding: 24, color: "var(--text-dim)", fontSize: 13 }}>
                    <Loader2 size={18} style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px", display: "block" }} />
                    Loading WhatsApp chats… (may take up to 30s on first load)
                  </div>
                : filteredChats.length === 0
                  ? <div style={{ textAlign: "center", padding: 20, color: "var(--text-dim)", fontSize: 13 }}>
                      {chats.length === 0 ? "No chats loaded — click Refresh" : "No matching chats"}
                    </div>
                  : filteredChats.map(chat => (
                      <div
                        key={chat.id}
                        onClick={() => !saving && toggleChat(chat)}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "8px 12px",
                          background: chat.tracked ? "rgba(255,215,0,0.07)" : isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)",
                          border: chat.tracked ? "1px solid rgba(255,215,0,0.22)" : "1px solid transparent",
                          borderRadius: 7, cursor: saving ? "not-allowed" : "pointer",
                          opacity: saving ? 0.7 : 1,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 380 }}>{chat.name}</div>
                          <div style={{ fontSize: 10, color: "var(--text-dim)" }}>
                            {chat.type}{chat.unread > 0 ? ` · ${chat.unread} unread` : ""}
                          </div>
                        </div>
                        <div style={{
                          width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                          background: chat.tracked ? "#FFD700" : "rgba(255,255,255,0.08)",
                          border: "2px solid " + (chat.tracked ? "#FFD700" : "rgba(255,255,255,0.15)"),
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {chat.tracked && <span style={{ color: "#000", fontSize: 10, fontWeight: 800 }}>✓</span>}
                        </div>
                      </div>
                    ))
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BrokerIntelligencePage() {
  const { data: session } = useSession();
  const { theme }          = useTheme();
  const isLight            = theme === "light";

  // ── WA state ────────────────────────────────────────────────────────────────
  const [waStatus,    setWaStatus]    = useState<WAStatus | null>(null);
  const [waChats,     setWaChats]     = useState<WAChat[]>([]);
  const PROD_URL =
    process.env.NEXT_PUBLIC_WS_URL ??
    process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL ??
    "";
  const [serviceUrl,  setServiceUrl]  = useState(PROD_URL || "");
  const socketRef                     = useRef<Socket | null>(null);

  // ── Page state ───────────────────────────────────────────────────────────────
  const [signals,     setSignals]     = useState<Signal[]>([]);
  const [liveMessages,setLiveMsgs]    = useState<LiveMessage[]>([]);
  const [dbMessages,  setDbMessages]  = useState<DBMessage[]>([]);
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [dbLoading,   setDbLoading]   = useState(true);
  const [showSetup,   setShowSetup]   = useState(false);
  const [searchQ,     setSearchQ]     = useState("");
  const [filterAction,setFilter]      = useState("ALL");
  const [activeTab,   setTab]         = useState<"signals" | "feed">("signals");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // ── Load service URL from localStorage (only when no production env var set) ─
  useEffect(() => {
    if (PROD_URL) return;
    const saved = localStorage.getItem("mkb-wa-service-url");
    if (saved) setServiceUrl(saved);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Socket.IO connection ─────────────────────────────────────────────────────
  const connectSocket = useCallback((url: string) => {
    if (!url) return;
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Dynamically import socket.io-client (client-side only)
    import("socket.io-client").then(({ io }) => {
      const socket = io(url, {
        transports:        ["websocket", "polling"],
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        timeout: 5000,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("[Socket.IO] Connected to service");
        setWaStatus(prev => prev ?? { state: "INITIALIZING", connected: false, qr: null, clientInfo: null, trackedChats: [], reconnectAttempts: 0 });
      });

      socket.on("connect_error", () => {
        console.log("[Socket.IO] Service unreachable");
        setWaStatus(prev => ({ ...(prev ?? { connected: false, qr: null, clientInfo: null, trackedChats: [], reconnectAttempts: 0 }), state: "SERVICE_OFFLINE", connected: false }));
      });

      socket.on("disconnect", () => {
        setWaStatus(prev => prev ? { ...prev, state: "SERVICE_OFFLINE" } : null);
      });

      socket.on("status", (data: WAStatus) => {
        setWaStatus(data);
        // When we become connected, request chat list
        if (data.state === "CONNECTED") {
          socket.emit("request_chats");
        }
      });

      socket.on("chats_list", (chats: WAChat[]) => {
        console.log(`[Socket.IO] Received ${chats.length} chats`);
        setWaChats(chats);
      });

      socket.on("message", (msg: LiveMessage) => {
        setLiveMsgs(prev => {
          const next = [msg, ...prev];
          return next.slice(0, 50);
        });
        // If it has a signal, trigger a DB reload to get AI-enhanced version
        if (msg.signal?.ticker) {
          setTimeout(() => loadDBData(), 3000);
        }
      });

      socket.on("recent_messages", (msgs: LiveMessage[]) => {
        setLiveMsgs(msgs.slice(0, 50));
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    connectSocket(serviceUrl);
    return () => { socketRef.current?.disconnect(); };
  }, [serviceUrl, connectSocket]);

  // ── DB data loader ───────────────────────────────────────────────────────────
  const loadDBData = useCallback(async () => {
    if (!session?.user) return;
    try {
      const [sigR, msgR, statR] = await Promise.all([
        fetch("/api/broker-intelligence/signals?limit=60"),
        fetch("/api/broker-intelligence/messages?limit=30"),
        fetch("/api/broker-intelligence/stats"),
      ]);
      if (sigR.ok)  { const d = await sigR.json();  setSignals(d.signals ?? []); }
      if (msgR.ok)  setDbMessages(await msgR.json());
      if (statR.ok) setStats(await statR.json());
      setLastRefresh(new Date());
    } catch { /* */ } finally {
      setDbLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    loadDBData();
    const t = setInterval(loadDBData, 30_000);
    return () => clearInterval(t);
  }, [loadDBData]);

  const saveServiceUrl = (url: string) => {
    setServiceUrl(url);
    localStorage.setItem("mkb-wa-service-url", url);
    connectSocket(url);
  };

  const handleOutcome = async (id: string, outcome: string) => {
    try {
      await fetch("/api/broker-intelligence/signals", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, outcome }),
      });
      setSignals(ss => ss.map(s => s.id === id ? { ...s, outcome, isActive: false } : s));
    } catch { /* */ }
  };

  // ── Filtered signals ─────────────────────────────────────────────────────────
  const filteredSigs = signals.filter(s => {
    const q = searchQ.toLowerCase();
    return (!q || s.ticker.toLowerCase().includes(q) || s.message.source.name.toLowerCase().includes(q))
        && (filterAction === "ALL" || s.action === filterAction);
  });
  const activeSigs = filteredSigs.filter(s => s.isActive);
  const closedSigs = filteredSigs.filter(s => !s.isActive);

  const waState = waStatus?.state ?? "SERVICE_OFFLINE";

  // ── Shared styles ─────────────────────────────────────────────────────────────
  const panel  = { background: isLight ? "rgba(248,246,240,0.97)" : "rgba(7,7,7,0.97)", border: "1px solid var(--th-border-card)", borderRadius: 10 };
  const label  = { fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: "var(--text-muted)", textTransform: "uppercase" as const };

  return (
    <div className="min-h-screen" style={{ background: "var(--th-bg-page)" }}>
      <Navbar />
      <MarketTicker />

      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "24px 16px 60px" }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(255,215,0,0.10)", border: "1px solid rgba(255,215,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Radio size={18} color="#FFD700" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-space-grotesk)", color: "var(--text)", margin: 0, letterSpacing: "0.02em" }}>
                BROKER INTELLIGENCE
              </h1>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                Real-time WhatsApp broker signal surveillance
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <WABadge status={waState} />

            {waStatus?.clientInfo && (
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                <span style={{ color: "#00FF9C", fontWeight: 600 }}>{waStatus.clientInfo.pushname}</span>
                <span style={{ color: "var(--text-dim)" }}> (+{waStatus.clientInfo.phone})</span>
              </div>
            )}

            <span style={{ fontSize: 10, color: "var(--text-dim)" }}>{lastRefresh.toLocaleTimeString()}</span>

            <button
              onClick={loadDBData}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", fontSize: 11, fontWeight: 600, background: "rgba(255,215,0,0.08)", color: "#FFD700", border: "1px solid rgba(255,215,0,0.22)", borderRadius: 6, cursor: "pointer" }}
            >
              <RefreshCw size={11} /> Refresh
            </button>

            <button
              onClick={() => setShowSetup(true)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", border: "1px solid var(--th-border-normal)", borderRadius: 6, cursor: "pointer" }}
            >
              <Settings size={11} /> Setup
            </button>
          </div>
        </div>

        {/* ── QR banner (appears when QR is needed, outside setup modal) ─── */}
        <AnimatePresence>
          {waStatus?.qr && waState === "QR_REQUIRED" && !showSetup && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.25)", borderRadius: 10, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", gap: 24 }}
            >
              <img src={waStatus.qr} alt="WA QR" style={{ width: 130, height: 130, borderRadius: 8, background: "#fff", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#60A5FA", marginBottom: 8 }}>
                  <QrCode size={14} style={{ display: "inline", marginRight: 6 }} />
                  Scan to connect WhatsApp
                </div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
                  Open WhatsApp on your phone → <strong>Settings → Linked Devices → Link a Device</strong>.<br />
                  Point camera at this QR code. Page updates automatically when connected.
                </p>
              </div>
              <button onClick={() => setShowSetup(true)} style={{ marginLeft: "auto", padding: "6px 14px", fontSize: 11, fontWeight: 600, background: "rgba(96,165,250,0.12)", color: "#60A5FA", border: "1px solid rgba(96,165,250,0.30)", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                Open Setup
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stats strip ──────────────────────────────────────────────────── */}
        <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          {[
            { label: "TOTAL SIGNALS", value: stats?.totalSignals ?? "—", color: "#FFD700",  Icon: Zap          },
            { label: "ACTIVE",        value: stats?.activeSignals ?? "—", color: "#00FF9C",  Icon: Activity     },
            { label: "TODAY MSGS",    value: stats?.todayMessages ?? "—", color: "#60A5FA",  Icon: MessageSquare },
            { label: "HIT RATE",      value: stats?.hitRate != null ? `${stats.hitRate}%` : "—", color: "#A78BFA", Icon: Target },
          ].map(s => (
            <div key={s.label} style={{ ...panel, padding: "14px 16px" }}>
              <div className="flex justify-between items-start">
                <div>
                  <div style={label}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: "var(--font-space-grotesk)", marginTop: 4 }}>
                    {s.value}
                  </div>
                </div>
                <s.Icon size={18} color={`${s.color}70`} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Main grid ────────────────────────────────────────────────────── */}
        <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 360px" }}>

          {/* ── Left panel ─────────────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Tab + filter bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex gap-1" style={{ background: "rgba(255,255,255,0.04)", borderRadius: 7, padding: 3 }}>
                {(["signals", "feed"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      padding: "5px 16px", fontSize: 11, fontWeight: 600, letterSpacing: "0.07em",
                      borderRadius: 5, border: "none", cursor: "pointer",
                      background: activeTab === t ? "rgba(255,215,0,0.12)" : "transparent",
                      color: activeTab === t ? "#FFD700" : "var(--text-muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    {t === "signals"
                      ? `SIGNALS (${activeSigs.length + closedSigs.length})`
                      : `LIVE FEED (${liveMessages.length + dbMessages.length})`
                    }
                  </button>
                ))}
              </div>

              {activeTab === "signals" && (
                <div className="flex gap-2">
                  <div style={{ position: "relative" }}>
                    <Search size={11} color="var(--text-dim)" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                    <input
                      value={searchQ}
                      onChange={e => setSearchQ(e.target.value)}
                      placeholder="RELIANCE, HAL…"
                      style={{ paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6, fontSize: 12, background: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.04)", border: "1px solid var(--th-border-normal)", borderRadius: 6, color: "var(--text)", outline: "none", width: 155 }}
                    />
                  </div>
                  <select
                    value={filterAction}
                    onChange={e => setFilter(e.target.value)}
                    style={{ padding: "6px 10px", fontSize: 11, fontWeight: 600, background: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.04)", border: "1px solid var(--th-border-normal)", borderRadius: 6, color: "var(--text)", outline: "none", cursor: "pointer" }}
                  >
                    {["ALL","BUY","SELL","HOLD","WATCH","BOOK_PROFIT"].map(a => (
                      <option key={a} value={a} style={{ background: isLight ? "#F0EBE0" : "#0A0A0A" }}>
                        {a.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* ── Signals tab ──────────────────────────────────────────────── */}
            {activeTab === "signals" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {dbLoading ? (
                  <div style={{ textAlign: "center", padding: 40, color: "var(--text-dim)", fontSize: 13 }}>Loading signals…</div>
                ) : filteredSigs.length === 0 ? (
                  <div style={{ ...panel, padding: "40px 20px", textAlign: "center" }}>
                    <Radio size={32} color="rgba(255,215,0,0.2)" style={{ margin: "0 auto 12px" }} />
                    <div style={{ fontSize: 14, color: "var(--text-dim)", marginBottom: 8 }}>No signals yet</div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 16 }}>
                      {waState === "CONNECTED"
                        ? "Waiting for messages from tracked chats…"
                        : "Start the WhatsApp service and connect to receive broker signals"}
                    </div>
                    <button
                      onClick={() => setShowSetup(true)}
                      style={{ padding: "8px 20px", fontSize: 12, fontWeight: 600, background: "rgba(255,215,0,0.10)", color: "#FFD700", border: "1px solid rgba(255,215,0,0.28)", borderRadius: 6, cursor: "pointer" }}
                    >
                      Setup WhatsApp Service
                    </button>
                  </div>
                ) : (
                  <>
                    {activeSigs.length > 0 && (
                      <>
                        <div style={{ ...label, marginBottom: 4 }}>ACTIVE SIGNALS</div>
                        <AnimatePresence mode="popLayout">
                          {activeSigs.map(s => <SignalCard key={s.id} sig={s} isLight={isLight} onOutcome={handleOutcome} />)}
                        </AnimatePresence>
                      </>
                    )}
                    {closedSigs.length > 0 && (
                      <>
                        <div style={{ ...label, marginTop: 8, marginBottom: 4 }}>CLOSED SIGNALS</div>
                        <AnimatePresence mode="popLayout">
                          {closedSigs.map(s => <SignalCard key={s.id} sig={s} isLight={isLight} onOutcome={handleOutcome} />)}
                        </AnimatePresence>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Live feed tab ─────────────────────────────────────────────── */}
            {activeTab === "feed" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Real-time messages (from Socket.IO) first */}
                {liveMessages.map((m, i) => (
                  <motion.div
                    key={`live-${i}-${m.timestamp}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                      background: isLight ? "rgba(248,246,240,0.97)" : "rgba(8,8,8,0.97)",
                      border: "1px solid var(--th-border-subtle)",
                      borderLeft: m.signal ? `3px solid ${actionColor(m.signal.action ?? "")}` : "3px solid rgba(255,215,0,0.20)",
                      borderRadius: 8, padding: "10px 12px",
                    }}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#FFD700", letterSpacing: "0.07em" }}>
                        {m.chatName}
                        <span style={{ fontSize: 9, color: "rgba(0,255,156,0.7)", marginLeft: 6 }}>● LIVE</span>
                      </span>
                      <span style={{ fontSize: 10, color: "var(--text-dim)" }}>{relTime(m.receivedAt)}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0, wordBreak: "break-word" }}>
                      {m.body.length > 200 ? m.body.slice(0, 200) + "…" : m.body}
                    </p>
                    {m.signal?.ticker && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span style={{ fontSize: 9, fontWeight: 700, color: actionColor(m.signal.action ?? ""), background: `${actionColor(m.signal.action ?? "")}14`, border: `1px solid ${actionColor(m.signal.action ?? "")}30`, borderRadius: 4, padding: "1px 6px", letterSpacing: "0.07em" }}>
                          {m.signal.ticker} {m.signal.action}
                        </span>
                        {m.signal.target && <span style={{ fontSize: 9, color: "var(--text-dim)" }}>TGT ₹{m.signal.target.toLocaleString("en-IN")}</span>}
                        {m.signal.stopLoss && <span style={{ fontSize: 9, color: "var(--text-dim)" }}>SL ₹{m.signal.stopLoss.toLocaleString("en-IN")}</span>}
                        <span style={{ fontSize: 9, color: "var(--text-dim)" }}>conf {m.signal.confidence}%</span>
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* DB messages (historical) */}
                {dbMessages.map(m => (
                  <div
                    key={`db-${m.id}`}
                    style={{
                      background: isLight ? "rgba(248,246,240,0.95)" : "rgba(8,8,8,0.95)",
                      border: "1px solid var(--th-border-subtle)",
                      borderLeft: m.signal ? `3px solid ${actionColor(m.signal.action)}` : "3px solid var(--th-border-normal)",
                      borderRadius: 8, padding: "10px 12px",
                    }}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#FFD700", letterSpacing: "0.07em" }}>{m.source.name}</span>
                      <span style={{ fontSize: 10, color: "var(--text-dim)" }}>{relTime(m.timestamp)}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0, wordBreak: "break-word" }}>
                      {m.body.length > 200 ? m.body.slice(0, 200) + "…" : m.body}
                    </p>
                    {m.signal && (
                      <div className="flex items-center gap-2 mt-2">
                        <span style={{ fontSize: 9, fontWeight: 700, color: actionColor(m.signal.action), background: `${actionColor(m.signal.action)}14`, border: `1px solid ${actionColor(m.signal.action)}30`, borderRadius: 4, padding: "1px 6px" }}>
                          {m.signal.ticker} {m.signal.action}
                        </span>
                        {m.signal.target && <span style={{ fontSize: 9, color: "var(--text-dim)" }}>TGT ₹{m.signal.target.toLocaleString("en-IN")}</span>}
                      </div>
                    )}
                  </div>
                ))}

                {liveMessages.length === 0 && dbMessages.length === 0 && (
                  <div style={{ ...panel, padding: "40px 20px", textAlign: "center" }}>
                    <MessageSquare size={28} color="rgba(255,215,0,0.2)" style={{ margin: "0 auto 12px" }} />
                    <div style={{ fontSize: 13, color: "var(--text-dim)" }}>No messages yet</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right sidebar ─────────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Service status card */}
            <div style={{ ...panel, padding: "16px 18px" }}>
              <div style={{ ...label, marginBottom: 12 }}>SERVICE STATUS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(["SERVICE_OFFLINE","INITIALIZING","QR_REQUIRED","AUTHENTICATED","CONNECTED","DISCONNECTED","RECONNECTING"] as WAState[]).map(s => {
                  const isCurrent = waState === s;
                  const dotColor = s === "CONNECTED" ? "#00FF9C" : s === "DISCONNECTED" || s === "SERVICE_OFFLINE" ? "#FF4D4D" : "#FFB800";
                  return (
                    <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, opacity: isCurrent ? 1 : 0.3, transition: "opacity 0.3s" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: isCurrent ? dotColor : "rgba(255,255,255,0.2)", flexShrink: 0, boxShadow: isCurrent ? `0 0 4px ${dotColor}` : "none" }} />
                      <span style={{ fontSize: 11, fontWeight: isCurrent ? 700 : 400, color: isCurrent ? dotColor : "var(--text-dim)", letterSpacing: "0.06em" }}>
                        {s.replace("_", " ")}
                      </span>
                    </div>
                  );
                })}
              </div>

              {waStatus?.reconnectAttempts ? (
                <div style={{ fontSize: 10, color: "#FFB800", marginTop: 8 }}>
                  Reconnect attempt #{waStatus.reconnectAttempts}
                </div>
              ) : null}

              {waState === "SERVICE_OFFLINE" && (
                <div style={{ marginTop: 12, padding: "8px 10px", background: "rgba(255,77,77,0.07)", border: "1px solid rgba(255,77,77,0.20)", borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: "#FF4D4D", fontWeight: 600, marginBottom: 4 }}>Service not connected</div>
                  <div style={{ fontSize: 10, color: "var(--text-dim)" }}>Run .\start-mkb.ps1, then paste the tunnel URL in Setup</div>
                </div>
              )}

              <button
                onClick={() => setShowSetup(true)}
                style={{ marginTop: 12, width: "100%", padding: "8px", fontSize: 11, fontWeight: 600, background: "rgba(255,215,0,0.07)", color: "#FFD700", border: "1px solid rgba(255,215,0,0.20)", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                <Settings size={10} /> Configure
              </button>
            </div>

            {/* Top tickers */}
            <div style={{ ...panel, padding: "16px 18px" }}>
              <div style={{ ...label, marginBottom: 12 }}>MOST MENTIONED</div>
              {!stats?.topTickers?.length
                ? <div style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", padding: "12px 0" }}>No data yet</div>
                : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {stats.topTickers.map((t, i) => {
                      const pct = Math.round((t.count / (stats.topTickers[0]?.count || 1)) * 100);
                      return (
                        <div key={t.ticker} className="flex items-center gap-2">
                          <span style={{ fontSize: 10, color: "var(--text-dim)", width: 14, textAlign: "right" }}>{i + 1}</span>
                          <Link href={`/stock/${t.ticker}`} style={{ fontSize: 12, fontWeight: 700, color: "#FFD700", textDecoration: "none", width: 90, flexShrink: 0 }}>
                            {t.ticker}
                          </Link>
                          <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: "#FFD700", borderRadius: 2, opacity: 0.7 }} />
                          </div>
                          <span style={{ fontSize: 10, color: "var(--text-muted)", width: 20, textAlign: "right" }}>{t.count}</span>
                        </div>
                      );
                    })}
                  </div>
              }
            </div>

            {/* Broker accuracy */}
            <div style={{ ...panel, padding: "16px 18px" }}>
              <div style={{ ...label, marginBottom: 12 }}>BROKER ACCURACY</div>
              {!stats?.sources?.length
                ? <div style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", padding: "12px 0" }}>No brokers yet</div>
                : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[...stats.sources].sort((a, b) => (b.hitRate ?? -1) - (a.hitRate ?? -1)).map(src => (
                      <div key={src.id} style={{ padding: "10px 12px", background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)", border: "1px solid var(--th-border-subtle)", borderRadius: 7 }}>
                        <div className="flex justify-between items-start mb-1">
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{src.name}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: src.hitRate != null ? src.hitRate >= 60 ? "#00FF9C" : src.hitRate >= 40 ? "#FFB800" : "#FF4D4D" : "var(--text-dim)" }}>
                            {src.hitRate != null ? `${src.hitRate}%` : "—"}
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <span style={{ fontSize: 10, color: "var(--text-dim)" }}>{src.totalMessages} msgs</span>
                          <span style={{ fontSize: 10, color: "#00FF9C" }}>{src.wins}W</span>
                          <span style={{ fontSize: 10, color: "#FF4D4D" }}>{src.losses}L</span>
                        </div>
                        {src.hitRate != null && (
                          <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginTop: 6 }}>
                            <div style={{ height: "100%", width: `${src.hitRate}%`, background: src.hitRate >= 60 ? "#00FF9C" : src.hitRate >= 40 ? "#FFB800" : "#FF4D4D", borderRadius: 2 }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
              }
              <button
                onClick={() => setShowSetup(true)}
                style={{ marginTop: 12, width: "100%", padding: "8px", fontSize: 11, fontWeight: 600, background: "rgba(255,215,0,0.07)", color: "#FFD700", border: "1px solid rgba(255,215,0,0.20)", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                <Plus size={10} /> Add Broker Chat
              </button>
            </div>

            {/* Signal types */}
            {signals.length > 0 && (
              <div style={{ ...panel, padding: "16px 18px" }}>
                <div style={{ ...label, marginBottom: 12 }}>SIGNAL TYPES</div>
                {(() => {
                  const counts: Record<string, number> = {};
                  for (const s of signals) counts[s.classification] = (counts[s.classification] ?? 0) + 1;
                  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                  const mx = sorted[0]?.[1] ?? 1;
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {sorted.map(([cls, cnt]) => (
                        <div key={cls} className="flex items-center gap-2">
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: CLASS_COLOR[cls] ?? "#909090", flexShrink: 0 }} />
                          <span style={{ fontSize: 10, color: "var(--text-muted)", width: 115, flexShrink: 0 }}>{CLASS_LABEL[cls] ?? cls}</span>
                          <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                            <div style={{ height: "100%", width: `${Math.round((cnt / mx) * 100)}%`, background: CLASS_COLOR[cls] ?? "#909090", borderRadius: 2, opacity: 0.7 }} />
                          </div>
                          <span style={{ fontSize: 10, color: "var(--text-dim)", width: 20, textAlign: "right" }}>{cnt}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Setup Modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSetup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SetupModal
              isLight={isLight}
              serviceUrl={serviceUrl}
              waStatus={waStatus}
              waChats={waChats}
              onSaveUrl={saveServiceUrl}
              onClose={() => setShowSetup(false)}
              onChatsUpdate={setWaChats}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes dot-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes spin       { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
