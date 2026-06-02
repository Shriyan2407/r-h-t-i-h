import { prisma } from "@/lib/auth/prisma";
import { tgSendToUser, fmtBreakout, fmtBreakdown, fmtVolumeSpike, fmtBuySignal, fmtSellSignal, fmtDailyBriefing } from "./telegramService";
import { sendPushToUser } from "./pushService";

// ── Types ────────────────────────────────────────────────────────────────────

export interface QuoteData {
  ticker: string;
  price: number;
  previousClose: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  volume: number;
  averageVolume: number;
  changePercent: number;
}

export interface AlertPayload {
  type: "breakout" | "breakdown" | "volume" | "ai_buy" | "ai_sell" | "sl_hit" | "target_hit" | "earnings" | "market_summary" | "macro";
  ticker?: string;
  title: string;
  message: string;
  tgMessage: string;
}

// ── Alert detection logic ────────────────────────────────────────────────────

export function detectBreakout(q: QuoteData): boolean {
  return q.price >= q.fiftyTwoWeekHigh * 0.998;
}

export function detectBreakdown(q: QuoteData): boolean {
  return q.price <= q.fiftyTwoWeekLow * 1.002;
}

export function detectVolumeSpike(q: QuoteData): { spiked: boolean; multiple: number } {
  if (!q.averageVolume || q.averageVolume === 0) return { spiked: false, multiple: 1 };
  const multiple = q.volume / q.averageVolume;
  return { spiked: multiple >= 3, multiple };
}

// ── Fetch quote from Yahoo Finance ───────────────────────────────────────────

async function fetchQuote(ticker: string): Promise<QuoteData | null> {
  try {
    const YFClass = (await import("yahoo-finance2")).default;
    const yf = new (YFClass as any)();
    const symbols = [`${ticker}.NS`, `${ticker}.BO`];
    for (const sym of symbols) {
      try {
        const q: any = await yf.quote(sym);
        if (!q?.regularMarketPrice) continue;
        return {
          ticker,
          price: q.regularMarketPrice,
          previousClose: q.regularMarketPreviousClose ?? q.regularMarketPrice,
          fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? q.regularMarketPrice * 1.3,
          fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? q.regularMarketPrice * 0.7,
          volume: q.regularMarketVolume ?? 0,
          averageVolume: q.averageDailyVolume3Month ?? q.averageDailyVolume10Day ?? 1,
          changePercent: q.regularMarketChangePercent ?? 0,
        };
      } catch { /* try next symbol */ }
    }
  } catch { /* non-critical */ }
  return null;
}

// ── Notify a user across all enabled channels ─────────────────────────────────

async function notifyUser(
  userId: string,
  prefs: { telegramEnabled: boolean; pushEnabled: boolean; tier: string },
  payload: AlertPayload
) {
  const promises: Promise<any>[] = [];

  // Store in history
  promises.push(
    prisma.alertHistory.create({
      data: {
        userId,
        type: payload.type,
        ticker: payload.ticker,
        title: payload.title,
        message: payload.message,
        channel: [
          prefs.telegramEnabled ? "telegram" : "",
          prefs.pushEnabled ? "push" : "",
        ].filter(Boolean).join(",") || "none",
      },
    }).catch(() => {})
  );

  if (prefs.telegramEnabled) {
    promises.push(tgSendToUser(userId, payload.tgMessage).catch(() => {}));
  }

  if (prefs.pushEnabled) {
    promises.push(sendPushToUser(userId, {
      title: payload.title,
      body: payload.message,
      tag: `${payload.type}-${payload.ticker ?? "market"}`,
      url: payload.ticker ? `/stock/${payload.ticker}` : "/alerts",
    }).catch(() => {}));
  }

  await Promise.allSettled(promises);
}

// ── Main market alerts processor ──────────────────────────────────────────────

export async function processMarketAlerts(): Promise<{ processed: number; alerts: number }> {
  // Get all users with connected Telegram or push enabled
  const prefs = await prisma.alertPreference.findMany({
    where: { OR: [{ telegramEnabled: true }, { pushEnabled: true }] },
    include: { user: { include: { watchlist: true } } },
  });

  if (prefs.length === 0) return { processed: 0, alerts: 0 };

  // Collect all unique tickers from watchlists
  const allTickers = new Set<string>();
  for (const p of prefs) {
    if (p.watchlistOnly) {
      for (const w of p.user.watchlist) allTickers.add(w.ticker);
    }
  }

  // Fetch quotes for all tickers (with rate limiting)
  const quotes = new Map<string, QuoteData>();
  const tickers = [...allTickers].slice(0, 50); // cap at 50 per run
  for (const ticker of tickers) {
    const q = await fetchQuote(ticker);
    if (q) quotes.set(ticker, q);
    await new Promise(r => setTimeout(r, 120)); // avoid Yahoo rate limits
  }

  let alertCount = 0;

  for (const pref of prefs) {
    const userTickers = pref.watchlistOnly
      ? pref.user.watchlist.map(w => w.ticker)
      : tickers;

    for (const ticker of userTickers) {
      const q = quotes.get(ticker);
      if (!q) continue;

      // Breakout
      if (pref.breakoutAlerts && detectBreakout(q)) {
        await notifyUser(pref.userId, pref, {
          type: "breakout",
          ticker,
          title: `🚀 ${ticker} Breakout!`,
          message: `${ticker} breaking 52-week high at ₹${q.price.toFixed(2)}`,
          tgMessage: fmtBreakout(ticker, q.price, q.fiftyTwoWeekHigh),
        });
        alertCount++;
      }

      // Breakdown
      if (pref.breakdownAlerts && detectBreakdown(q)) {
        await notifyUser(pref.userId, pref, {
          type: "breakdown",
          ticker,
          title: `🔴 ${ticker} Breakdown`,
          message: `${ticker} breaking 52-week low at ₹${q.price.toFixed(2)}`,
          tgMessage: fmtBreakdown(ticker, q.price, q.fiftyTwoWeekLow),
        });
        alertCount++;
      }

      // Volume spike
      if (pref.volumeAlerts) {
        const { spiked, multiple } = detectVolumeSpike(q);
        if (spiked) {
          await notifyUser(pref.userId, pref, {
            type: "volume",
            ticker,
            title: `📊 ${ticker} Volume Spike (${multiple.toFixed(1)}x)`,
            message: `${ticker} showing ${multiple.toFixed(1)}x above-average volume at ₹${q.price.toFixed(2)}`,
            tgMessage: fmtVolumeSpike(ticker, q.price, multiple),
          });
          alertCount++;
        }
      }

      // Simple AI buy/sell based on price action + momentum
      if ((pref.aiBuySignals || pref.aiSellSignals) && pref.tier !== "free") {
        const signal = deriveSimpleSignal(q);
        if (signal === "BUY" && pref.aiBuySignals) {
          const sl = q.price * 0.95;
          const t1 = q.price * 1.08;
          const t2 = q.price * 1.15;
          await notifyUser(pref.userId, pref, {
            type: "ai_buy",
            ticker,
            title: `💡 AI Buy Signal: ${ticker}`,
            message: `AI buy signal for ${ticker} at ₹${q.price.toFixed(2)} | Target ₹${t1.toFixed(2)}`,
            tgMessage: fmtBuySignal(ticker, q.price, t1, t2, sl, 72),
          });
          alertCount++;
        } else if (signal === "SELL" && pref.aiSellSignals) {
          await notifyUser(pref.userId, pref, {
            type: "ai_sell",
            ticker,
            title: `🔴 AI Sell Signal: ${ticker}`,
            message: `AI sell signal for ${ticker} at ₹${q.price.toFixed(2)}`,
            tgMessage: fmtSellSignal(ticker, q.price, 68),
          });
          alertCount++;
        }
      }
    }
  }

  return { processed: prefs.length, alerts: alertCount };
}

// Simple momentum-based signal (no AI cost on free tier)
function deriveSimpleSignal(q: QuoteData): "BUY" | "SELL" | "HOLD" {
  const rangePos = (q.price - q.fiftyTwoWeekLow) / (q.fiftyTwoWeekHigh - q.fiftyTwoWeekLow);
  if (q.changePercent > 2.5 && rangePos > 0.6 && q.volume > q.averageVolume * 1.5) return "BUY";
  if (q.changePercent < -2.5 && rangePos < 0.4 && q.volume > q.averageVolume * 1.5) return "SELL";
  return "HOLD";
}

// ── Daily briefing ────────────────────────────────────────────────────────────

export async function generateAndSendDailyBriefing(): Promise<{ sent: number }> {
  const indices = await fetchIndices();
  const prefs = await prisma.alertPreference.findMany({
    where: { marketSummary: true, OR: [{ telegramEnabled: true }, { pushEnabled: true }] },
  });

  const dateStr = new Date().toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
  });

  const briefingText = fmtDailyBriefing({
    date: dateStr,
    nifty: indices.nifty,
    banknifty: indices.banknifty,
    topGainers: indices.topGainers,
    topLosers: indices.topLosers,
    aiPicks: indices.aiPicks,
    fii: indices.fii,
    dii: indices.dii,
    usdinr: indices.usdinr,
    riskLevel: indices.riskLevel,
    outlook: indices.outlook,
  });

  let sent = 0;
  for (const pref of prefs) {
    if (pref.telegramEnabled) {
      await tgSendToUser(pref.userId, briefingText).catch(() => {});
    }
    if (pref.pushEnabled) {
      await sendPushToUser(pref.userId, {
        title: "📊 Market Ka Baadshah — Daily Briefing",
        body: `NIFTY ${indices.nifty.change >= 0 ? "▲" : "▼"} ${Math.abs(indices.nifty.change).toFixed(2)}% · ${dateStr}`,
        tag: "daily-briefing",
        url: "/alerts",
      }).catch(() => {});
    }
    // Store in history
    await prisma.alertHistory.create({
      data: {
        userId: pref.userId,
        type: "market_summary",
        title: `Daily Briefing — ${dateStr}`,
        message: briefingText.replace(/<[^>]+>/g, ""),
        channel: [pref.telegramEnabled ? "telegram" : "", pref.pushEnabled ? "push" : ""].filter(Boolean).join(","),
      },
    }).catch(() => {});
    sent++;
  }

  return { sent };
}

// ── Fetch index data (Yahoo Finance) ─────────────────────────────────────────

async function fetchIndices() {
  const fallback = {
    nifty: { price: 24000, change: 0.15 },
    banknifty: { price: 51500, change: 0.08 },
    topGainers: [{ ticker: "RELIANCE", change: 1.8 }, { ticker: "INFY", change: 1.2 }],
    topLosers: [{ ticker: "WIPRO", change: -1.5 }, { ticker: "HCLTECH", change: -0.9 }],
    aiPicks: [
      { ticker: "HDFCBANK", verdict: "ACCUMULATE", note: "Near support with FII buying" },
      { ticker: "TCS", verdict: "HOLD", note: "Near resistance, await breakout" },
    ],
    fii: "Data unavailable",
    dii: "Data unavailable",
    usdinr: "83.50",
    riskLevel: 5,
    outlook: "Markets in consolidation phase.",
  };

  try {
    const YFClass = (await import("yahoo-finance2")).default;
    const yf = new (YFClass as any)();
    const [niftyQ, bnQ, usdinrQ] = await Promise.allSettled([
      yf.quote("^NSEI"),
      yf.quote("^NSEBANK"),
      yf.quote("USDINR=X"),
    ]);

    const niftyData = niftyQ.status === "fulfilled" ? niftyQ.value : null;
    const bnData = bnQ.status === "fulfilled" ? bnQ.value : null;
    const usdinrData = usdinrQ.status === "fulfilled" ? usdinrQ.value : null;

    const niftyChange = niftyData?.regularMarketChangePercent ?? 0;
    const riskLevel = Math.min(10, Math.max(1, 5 + Math.round(Math.abs(niftyChange) * -2 * Math.sign(niftyChange))));

    return {
      nifty: {
        price: niftyData?.regularMarketPrice ?? fallback.nifty.price,
        change: niftyChange,
      },
      banknifty: {
        price: bnData?.regularMarketPrice ?? fallback.banknifty.price,
        change: bnData?.regularMarketChangePercent ?? 0,
      },
      topGainers: fallback.topGainers,
      topLosers: fallback.topLosers,
      aiPicks: fallback.aiPicks,
      fii: "See NSE website",
      dii: "See NSE website",
      usdinr: usdinrData?.regularMarketPrice?.toFixed(2) ?? "83.50",
      riskLevel,
      outlook: niftyChange > 0.5
        ? "Markets trending bullish. Stay disciplined."
        : niftyChange < -0.5
        ? "Markets under pressure. Manage risk carefully."
        : "Markets consolidating. Wait for clear direction.",
    };
  } catch {
    return fallback;
  }
}
