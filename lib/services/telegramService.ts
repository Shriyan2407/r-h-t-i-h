const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? "MarketKaBaadshahBot";
const BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ── Low-level API ────────────────────────────────────────────────────────────

export async function tgSend(chatId: string | number, text: string, parseMode: "HTML" | "Markdown" = "HTML") {
  if (!BOT_TOKEN) return { ok: false, error: "No bot token" };
  try {
    const res = await fetch(`${BASE}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode, disable_web_page_preview: true }),
    });
    return res.json();
  } catch {
    return { ok: false };
  }
}

export async function tgSendToUser(userId: string, text: string) {
  const { prisma } = await import("@/lib/auth/prisma");
  const conn = await prisma.telegramConnection.findUnique({ where: { userId } });
  if (!conn?.isActive || !conn.chatId) return;
  return tgSend(conn.chatId, text);
}

export async function setWebhook(webhookUrl: string) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
  const res = await fetch(`${BASE}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ["message"],
      drop_pending_updates: true,
    }),
  });
  return res.json();
}

export function getBotDeepLink(token: string) {
  return `https://t.me/${BOT_USERNAME}?start=${token}`;
}

export function getBotUsername() {
  return BOT_USERNAME;
}

// ── Message formatters ───────────────────────────────────────────────────────

export function fmtBreakout(ticker: string, price: number, prevHigh: number): string {
  const pct = (((price - prevHigh) / prevHigh) * 100).toFixed(2);
  return `🚀 <b>BREAKOUT ALERT</b>
━━━━━━━━━━━━━━━━━━━━━━

📊 <b>${ticker}</b>

💰 Price: ₹${price.toFixed(2)}
📈 Broke Above: ₹${prevHigh.toFixed(2)} (+${pct}%)
⚡ Signal: <b>BULLISH BREAKOUT</b>

Act fast — breakouts reverse quickly.

<i>Market Ka Baadshah AI</i>`;
}

export function fmtBreakdown(ticker: string, price: number, prevLow: number): string {
  const pct = (((prevLow - price) / prevLow) * 100).toFixed(2);
  return `🔴 <b>BREAKDOWN ALERT</b>
━━━━━━━━━━━━━━━━━━━━━━

📊 <b>${ticker}</b>

💰 Price: ₹${price.toFixed(2)}
📉 Broke Below: ₹${prevLow.toFixed(2)} (-${pct}%)
⚠️ Signal: <b>BEARISH BREAKDOWN</b>

Consider trailing stop or exit.

<i>Market Ka Baadshah AI</i>`;
}

export function fmtVolumeSpike(ticker: string, price: number, volumeMultiple: number): string {
  return `📊 <b>UNUSUAL VOLUME</b>
━━━━━━━━━━━━━━━━━━━━━━

📊 <b>${ticker}</b>

💰 Price: ₹${price.toFixed(2)}
🔊 Volume: <b>${volumeMultiple.toFixed(1)}x</b> above average

Unusual activity detected — potential big move incoming.

<i>Market Ka Baadshah AI</i>`;
}

export function fmtBuySignal(ticker: string, price: number, t1: number, t2: number, sl: number, confidence: number): string {
  const rr = ((t1 - price) / (price - sl)).toFixed(1);
  return `💡 <b>AI BUY SIGNAL</b>
━━━━━━━━━━━━━━━━━━━━━━

📊 <b>${ticker}</b>
🧠 Confidence: <b>${confidence}%</b>

💰 Entry: ₹${price.toFixed(2)}
🎯 T1: ₹${t1.toFixed(2)}   T2: ₹${t2.toFixed(2)}
🛡️ Stop Loss: ₹${sl.toFixed(2)}
📐 Risk/Reward: ${rr}:1

<i>Market Ka Baadshah AI</i>`;
}

export function fmtSellSignal(ticker: string, price: number, confidence: number): string {
  return `🔴 <b>AI SELL SIGNAL</b>
━━━━━━━━━━━━━━━━━━━━━━

📊 <b>${ticker}</b>
🧠 Confidence: <b>${confidence}%</b>

💰 Current: ₹${price.toFixed(2)}
📉 Signal: Exit / Book Profits

<i>Market Ka Baadshah AI</i>`;
}

export function fmtStockAnalysis(ticker: string, data: {
  price: number;
  verdict: string;
  confidence: number;
  summary: string;
  t1?: number;
  t2?: number;
  sl?: number;
  riskLevel?: string;
  newsSentiment?: string;
}): string {
  const verdictEmoji = data.verdict?.toLowerCase().includes("buy") || data.verdict?.toLowerCase().includes("accum")
    ? "🟢" : data.verdict?.toLowerCase().includes("sell") || data.verdict?.toLowerCase().includes("avoid")
    ? "🔴" : "🟡";

  let msg = `🧠 <b>${ticker} — AI ANALYSIS</b>
━━━━━━━━━━━━━━━━━━━━━━

${verdictEmoji} Verdict: <b>${data.verdict ?? "HOLD"}</b>
💪 Confidence: <b>${data.confidence ?? 0}%</b>
💰 Price: ₹${data.price.toFixed(2)}`;

  if (data.t1 && data.sl) {
    msg += `

🎯 T1: ₹${data.t1.toFixed(2)}`;
    if (data.t2) msg += `  T2: ₹${data.t2.toFixed(2)}`;
    msg += `
🛡️ Stop Loss: ₹${data.sl.toFixed(2)}`;
  }

  if (data.riskLevel) msg += `\n⚠️ Risk: <b>${data.riskLevel}</b>`;
  if (data.newsSentiment) msg += `\n📰 Sentiment: ${data.newsSentiment}`;

  if (data.summary) {
    const shortSummary = data.summary.slice(0, 280).replace(/<[^>]+>/g, "");
    msg += `\n\n📝 ${shortSummary}${data.summary.length > 280 ? "…" : ""}`;
  }

  msg += `\n\n<i>Market Ka Baadshah AI</i>`;
  return msg;
}

export function fmtDailyBriefing(data: {
  date: string;
  nifty: { price: number; change: number };
  banknifty: { price: number; change: number };
  topGainers: Array<{ ticker: string; change: number }>;
  topLosers: Array<{ ticker: string; change: number }>;
  aiPicks: Array<{ ticker: string; verdict: string; note: string }>;
  fii: string;
  dii: string;
  usdinr: string;
  riskLevel: number;
  outlook: string;
}): string {
  const gainers = data.topGainers.slice(0, 3)
    .map(s => `▲ ${s.ticker.padEnd(12)} +${s.change.toFixed(1)}%`).join("\n");
  const losers = data.topLosers.slice(0, 3)
    .map(s => `▼ ${s.ticker.padEnd(12)} ${s.change.toFixed(1)}%`).join("\n");
  const picks = data.aiPicks.slice(0, 3)
    .map(p => `• <b>${p.ticker}</b> — ${p.verdict} | ${p.note}`).join("\n");

  const niftySign = data.nifty.change >= 0 ? "+" : "";
  const bnSign = data.banknifty.change >= 0 ? "+" : "";

  return `📊 <b>MARKET KA BAADSHAH</b>
Daily Briefing — ${data.date}
━━━━━━━━━━━━━━━━━━━━━━━━

🇮🇳 <b>INDICES</b>
NIFTY 50:   <b>${data.nifty.price.toLocaleString("en-IN")}</b>  (${niftySign}${data.nifty.change.toFixed(2)}%)
BANKNIFTY:  <b>${data.banknifty.price.toLocaleString("en-IN")}</b>  (${bnSign}${data.banknifty.change.toFixed(2)}%)

📈 <b>TOP MOVERS</b>
<code>${gainers}
${losers}</code>

🧠 <b>AI PICKS TODAY</b>
${picks}

🌐 <b>MACRO PULSE</b>
FII:      ${data.fii}
DII:      ${data.dii}
USD/INR:  ${data.usdinr}

⚡ <b>RISK LEVEL: ${data.riskLevel}/10</b>
${data.outlook}

<i>Market Ka Baadshah AI · ${new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })} IST</i>`;
}

export function fmtHelp(): string {
  return `🤖 <b>MARKET KA BAADSHAH BOT</b>
━━━━━━━━━━━━━━━━━━━━━━

Your AI-powered Indian equity assistant.

<b>Commands:</b>
/analyze &lt;TICKER&gt; — AI analysis
/briefing — Today's market briefing
/alerts — Your alert settings
/help — Show this message

<b>Examples:</b>
/analyze RELIANCE
/analyze HDFCBANK
/analyze TCS

Or just type: <i>Analyze INFY</i>

<i>Market Ka Baadshah AI</i>`;
}

export function fmtConnected(firstName?: string): string {
  return `✅ <b>Connected!</b>

Welcome${firstName ? `, ${firstName}` : ""} to <b>Market Ka Baadshah AI</b>!

You'll now receive:
• 🚀 Breakout & breakdown alerts
• 💡 AI buy/sell signals
• 📊 Daily market briefings
• ⚡ Volume spike alerts

Type /help to see all commands.

<i>Market Ka Baadshah AI</i>`;
}
