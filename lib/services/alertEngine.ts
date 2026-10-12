import { prisma } from "@/lib/auth/prisma";
import {
  tgSendToUser,
  fmtBreakout, fmtBreakdown, fmtVolumeSpike,
  fmtMomentumAlert, fmtDailyBriefing,
  fmtNewsAlert, fmtEarningsAlert,
} from "./telegramService";
import { sendPushToUser } from "./pushService";
import { getStockNews } from "./newsAggregator";
import { getMarketSnapshot } from "./marketSnapshot";
import type { NewsItem } from "./newsAggregator";

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
  // 20-day high/low derived from regularMarketDayHigh approximation
  recentHigh?: number;
  recentLow?: number;
}

export interface AlertPayload {
  type: "breakout" | "breakdown" | "volume" | "ai_buy" | "ai_sell" | "sl_hit" | "target_hit" | "earnings" | "market_summary" | "macro";
  ticker?: string;
  title: string;
  message: string;
  tgMessage: string;
}

type PrefWithUser = Awaited<ReturnType<typeof loadPrefs>>[number];

// ── Alert detection ──────────────────────────────────────────────────────────

export function detectBreakout(q: QuoteData): boolean {
  // At or within 0.2% of the 52-week high
  return q.price >= q.fiftyTwoWeekHigh * 0.998;
}

export function detectBreakdown(q: QuoteData): boolean {
  // Breakdown below 52-week low (within 0.2%)
  return q.price <= q.fiftyTwoWeekLow * 1.002;
}

export function detectVolumeSpike(q: QuoteData): { spiked: boolean; multiple: number } {
  if (!q.averageVolume || q.averageVolume === 0) return { spiked: false, multiple: 1 };
  const multiple = q.volume / q.averageVolume;
  return { spiked: multiple >= 3, multiple };
}

// ── Deduplication ────────────────────────────────────────────────────────────

async function isDuplicate(
  userId: string,
  type: string,
  ticker: string | null,
  cooldownHours: number,
): Promise<boolean> {
  const since = new Date(Date.now() - cooldownHours * 3_600_000);
  const existing = await prisma.alertHistory.findFirst({
    where: {
      userId,
      type,
      ...(ticker ? { ticker } : {}),
      sentAt: { gte: since },
    },
    select: { id: true },
  });
  return !!existing;
}

// ── Fetch quote ──────────────────────────────────────────────────────────────

async function fetchQuote(ticker: string): Promise<QuoteData | null> {
  try {
    const YFClass = (await import("yahoo-finance2")).default;
    const yf = new (YFClass as any)();
    for (const sym of [`${ticker}.NS`, `${ticker}.BO`]) {
      try {
        const q: any = await yf.quote(sym);
        if (!q?.regularMarketPrice) continue;
        return {
          ticker,
          price:            q.regularMarketPrice,
          previousClose:    q.regularMarketPreviousClose ?? q.regularMarketPrice,
          fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? q.regularMarketPrice * 1.3,
          fiftyTwoWeekLow:  q.fiftyTwoWeekLow  ?? q.regularMarketPrice * 0.7,
          volume:           q.regularMarketVolume ?? 0,
          averageVolume:    q.averageDailyVolume3Month ?? q.averageDailyVolume10Day ?? 1,
          changePercent:    q.regularMarketChangePercent ?? 0,
          recentHigh:       q.regularMarketDayHigh ?? q.regularMarketPrice,
          recentLow:        q.regularMarketDayLow  ?? q.regularMarketPrice,
        };
      } catch { /* try next symbol */ }
    }
  } catch { /* non-critical */ }
  return null;
}

// ── Notify user (all channels) ───────────────────────────────────────────────

async function notifyUser(
  userId: string,
  prefs: { telegramEnabled: boolean; pushEnabled: boolean; tier: string },
  payload: AlertPayload,
) {
  const promises: Promise<any>[] = [];

  promises.push(
    prisma.alertHistory.create({
      data: {
        userId,
        type:    payload.type,
        ticker:  payload.ticker ?? null,
        title:   payload.title,
        message: payload.message,
        channel: [
          prefs.telegramEnabled ? "telegram" : "",
          prefs.pushEnabled     ? "push"     : "",
        ].filter(Boolean).join(",") || "none",
      },
    }).catch(() => {}),
  );

  if (prefs.telegramEnabled) {
    promises.push(tgSendToUser(userId, payload.tgMessage).catch(() => {}));
  }

  if (prefs.pushEnabled) {
    promises.push(sendPushToUser(userId, {
      title: payload.title,
      body:  payload.message,
      tag:   `${payload.type}-${payload.ticker ?? "market"}`,
      url:   payload.ticker ? `/stock/${payload.ticker}` : "/alerts",
    }).catch(() => {}));
  }

  await Promise.allSettled(promises);
}

// ── Load prefs helper ─────────────────────────────────────────────────────────

async function loadPrefs() {
  return prisma.alertPreference.findMany({
    where: { OR: [{ telegramEnabled: true }, { pushEnabled: true }] },
    include: { user: { include: { watchlist: true } } },
  });
}

// ── News alert scanner ───────────────────────────────────────────────────────

const HIGH_IMPACT_KEYWORDS = [
  "earnings", "results", "quarterly", "profit", "revenue", "eps", "guidance",
  "acquisition", "merger", "buyback", "dividend", "fii", "block deal",
  "sebi", "insider", "bankruptcy", "default", "rating", "upgrade", "downgrade",
  "ipo", "qip", "rights issue", "stake sale", "promoter selling",
  "record high", "52-week", "circuit breaker", "board meeting", "agm",
  "split", "bonus issue", "order win", "contract", "deal signed",
];

const COMPANY_ALIASES: Record<string, string[]> = {
  RELIANCE:   ["reliance industries", "ril", "jio", "mukesh ambani"],
  TCS:        ["tata consultancy", "tcs"],
  HDFCBANK:   ["hdfc bank", "hdfc merger"],
  INFY:       ["infosys", "salil parekh"],
  ICICIBANK:  ["icici bank"],
  BHARTIARTL: ["airtel", "bharti airtel"],
  HAL:        ["hindustan aeronautics", "tejas"],
  IRFC:       ["indian railway finance", "irfc"],
  SBIN:       ["state bank of india", "sbi"],
  WIPRO:      ["wipro"],
  HCLTECH:    ["hcl technologies", "hcl tech"],
  KOTAKBANK:  ["kotak mahindra bank", "kotak bank"],
  MARUTI:     ["maruti suzuki"],
  BAJFINANCE: ["bajaj finance", "bajaj finserv"],
  NTPC:       ["ntpc", "national thermal power"],
  ONGC:       ["ongc", "oil and natural gas"],
  LT:         ["larsen & toubro", "l&t"],
  ADANIENT:   ["adani enterprises", "adani group"],
};

function isHighImpactNews(item: NewsItem, ticker: string): boolean {
  const text = (item.title + " " + item.summary).toLowerCase();
  const aliases = COMPANY_ALIASES[ticker.toUpperCase()] ?? [];
  const tickerLower = ticker.toLowerCase();

  // Must mention the company
  const relevant =
    text.includes(tickerLower) ||
    aliases.some(a => text.includes(a));
  if (!relevant) return false;

  // Must contain a high-impact keyword
  const impact = HIGH_IMPACT_KEYWORDS.filter(k => text.includes(k)).length;
  return impact >= 1 && item.sentiment !== "neutral";
}

async function scanNewsAlerts(
  prefs: PrefWithUser[],
  allTickers: string[],
): Promise<number> {
  let alertCount = 0;

  for (const ticker of allTickers.slice(0, 25)) {
    let news: NewsItem[];
    try {
      news = await getStockNews(ticker, "");
    } catch { continue; }

    // Only fresh (< 3 hours) high-impact items
    const hits = news.filter(n => n.ageHours < 3 && isHighImpactNews(n, ticker));
    if (!hits.length) continue;

    for (const pref of prefs) {
      if (!pref.macroNews) continue;
      const userTickers = pref.watchlistOnly
        ? pref.user.watchlist.map(w => w.ticker)
        : allTickers;
      if (!userTickers.includes(ticker)) continue;

      // Cooldown: one news alert per ticker per 3 hours
      if (await isDuplicate(pref.userId, "macro", ticker, 3)) continue;

      const item = hits[0];
      await notifyUser(pref.userId, pref, {
        type:      "macro",
        ticker,
        title:     `📰 ${ticker}: Breaking News`,
        message:   item.title,
        tgMessage: fmtNewsAlert(ticker, item),
      });
      alertCount++;
    }
  }

  return alertCount;
}

// ── Earnings alert scanner ───────────────────────────────────────────────────

async function scanEarningsAlerts(
  prefs: PrefWithUser[],
  allTickers: string[],
): Promise<number> {
  let alertCount = 0;

  for (const ticker of allTickers.slice(0, 20)) {
    try {
      const YFClass = (await import("yahoo-finance2")).default;
      const yf = new (YFClass as any)();

      let earningsDate: Date | null = null;
      let earningsData: any = null;

      for (const sym of [`${ticker}.NS`, `${ticker}.BO`]) {
        try {
          const summary = await yf.quoteSummary(sym, {
            modules: ["calendarEvents", "earnings"] as any,
          });
          const dates = summary?.calendarEvents?.earnings?.earningsDate;
          if (dates) {
            const first = Array.isArray(dates) ? dates[0] : dates;
            if (first) { earningsDate = new Date(first); earningsData = summary.earnings; break; }
          }
        } catch { /* try next */ }
      }

      if (!earningsDate) continue;

      const daysUntil = (earningsDate.getTime() - Date.now()) / 86_400_000;
      // Alert if earnings within next 2 days or just happened (last 12h)
      if (daysUntil < -0.5 || daysUntil > 2) continue;

      for (const pref of prefs) {
        if (!pref.earningsAlerts) continue;
        const userTickers = pref.watchlistOnly
          ? pref.user.watchlist.map(w => w.ticker)
          : allTickers;
        if (!userTickers.includes(ticker)) continue;

        // Cooldown: one earnings alert per ticker per 3 days
        if (await isDuplicate(pref.userId, "earnings", ticker, 72)) continue;

        await notifyUser(pref.userId, pref, {
          type:      "earnings",
          ticker,
          title:     `📊 ${ticker} Earnings ${daysUntil < 0 ? "Released!" : "Alert"}`,
          message:   `Earnings ${daysUntil < 0 ? "just reported" : `in ~${Math.ceil(daysUntil)} day(s)`} — ${earningsDate.toLocaleDateString("en-IN")}`,
          tgMessage: fmtEarningsAlert(ticker, earningsDate, daysUntil, earningsData),
        });
        alertCount++;
      }
    } catch { continue; }
  }

  return alertCount;
}

// ── Main market alerts processor ──────────────────────────────────────────────

export async function processMarketAlerts(): Promise<{
  processed: number;
  alerts: number;
  breakdown: { price: number; news: number; earnings: number };
}> {
  const prefs = await loadPrefs();
  if (!prefs.length) return { processed: 0, alerts: 0, breakdown: { price: 0, news: 0, earnings: 0 } };

  // Collect unique tickers from all watchlists
  const allTickers = new Set<string>();
  for (const p of prefs) {
    for (const w of p.user.watchlist) allTickers.add(w.ticker);
  }

  const tickerList = [...allTickers].slice(0, 50);

  // Fetch live quotes
  const quotes = new Map<string, QuoteData>();
  for (const ticker of tickerList) {
    const q = await fetchQuote(ticker);
    if (q) quotes.set(ticker, q);
    await new Promise(r => setTimeout(r, 150));
  }

  let priceAlerts = 0;

  for (const pref of prefs) {
    const userTickers = pref.watchlistOnly
      ? pref.user.watchlist.map(w => w.ticker)
      : tickerList;

    for (const ticker of userTickers) {
      const q = quotes.get(ticker);
      if (!q) continue;

      // Breakout — cooldown 24h
      if (pref.breakoutAlerts && detectBreakout(q)) {
        if (!(await isDuplicate(pref.userId, "breakout", ticker, 24))) {
          await notifyUser(pref.userId, pref, {
            type:      "breakout",
            ticker,
            title:     `🚀 ${ticker} Breakout!`,
            message:   `${ticker} breaking 52-week high at ₹${q.price.toFixed(2)}`,
            tgMessage: fmtBreakout(ticker, q.price, q.fiftyTwoWeekHigh),
          });
          priceAlerts++;
        }
      }

      // Breakdown — cooldown 24h
      if (pref.breakdownAlerts && detectBreakdown(q)) {
        if (!(await isDuplicate(pref.userId, "breakdown", ticker, 24))) {
          await notifyUser(pref.userId, pref, {
            type:      "breakdown",
            ticker,
            title:     `🔴 ${ticker} Breakdown`,
            message:   `${ticker} breaking 52-week low at ₹${q.price.toFixed(2)}`,
            tgMessage: fmtBreakdown(ticker, q.price, q.fiftyTwoWeekLow),
          });
          priceAlerts++;
        }
      }

      // Volume spike — cooldown 4h
      if (pref.volumeAlerts) {
        const { spiked, multiple } = detectVolumeSpike(q);
        if (spiked && !(await isDuplicate(pref.userId, "volume", ticker, 4))) {
          await notifyUser(pref.userId, pref, {
            type:      "volume",
            ticker,
            title:     `📊 ${ticker} Volume Spike (${multiple.toFixed(1)}x)`,
            message:   `${ticker} showing ${multiple.toFixed(1)}x above-average volume at ₹${q.price.toFixed(2)}`,
            tgMessage: fmtVolumeSpike(ticker, q.price, multiple),
          });
          priceAlerts++;
        }
      }

      // Momentum screen (non-free tier) — cooldown 8h. Stored under the legacy "ai_buy" /
      // "ai_sell" types so existing preferences and history keep working; it is a rule, not AI.
      if ((pref.aiBuySignals || pref.aiSellSignals) && pref.tier !== "free") {
        const m = detectMomentum(q);
        if (m.direction) {
          const wantsIt = m.direction === "up" ? pref.aiBuySignals : pref.aiSellSignals;
          const type = m.direction === "up" ? "ai_buy" : "ai_sell";
          if (wantsIt && !(await isDuplicate(pref.userId, type, ticker, 8))) {
            const sign = q.changePercent >= 0 ? "+" : "";
            await notifyUser(pref.userId, pref, {
              type,
              ticker,
              title:     `${m.direction === "up" ? "📈" : "📉"} ${ticker} momentum ${m.direction} (${sign}${q.changePercent.toFixed(1)}%)`,
              message:   `${ticker} ${sign}${q.changePercent.toFixed(2)}% on ${m.volumeMultiple.toFixed(1)}x volume at ₹${q.price.toFixed(2)}`,
              tgMessage: fmtMomentumAlert({
                ticker,
                direction:        m.direction,
                price:            q.price,
                changePercent:    q.changePercent,
                volumeMultiple:   m.volumeMultiple,
                rangePositionPct: m.rangePositionPct,
              }),
            });
            priceAlerts++;
          }
        }
      }
    }
  }

  // News + earnings scanners
  const [newsAlerts, earningsAlerts] = await Promise.all([
    scanNewsAlerts(prefs, tickerList),
    scanEarningsAlerts(prefs, tickerList),
  ]);

  return {
    processed: prefs.length,
    alerts:    priceAlerts + newsAlerts + earningsAlerts,
    breakdown: { price: priceAlerts, news: newsAlerts, earnings: earningsAlerts },
  };
}

export interface MomentumResult {
  direction: "up" | "down" | null;
  volumeMultiple: number;
  /** 0-100 position within the 52-week range; 50 when the range is degenerate. */
  rangePositionPct: number;
}

/**
 * Momentum screen: a move of more than 2.5% in either direction on volume above 1.5x the
 * average, with price in the upper (up) or lower (down) part of its 52-week range.
 * Returns facts, never a recommendation. Pure and exported for testing.
 */
export function detectMomentum(q: QuoteData): MomentumResult {
  const span = q.fiftyTwoWeekHigh - q.fiftyTwoWeekLow;
  const rangePos = span > 0 ? (q.price - q.fiftyTwoWeekLow) / span : 0.5;
  const volumeMultiple = q.averageVolume > 0 ? q.volume / q.averageVolume : 1;
  const heavyVolume = volumeMultiple > 1.5;

  let direction: MomentumResult["direction"] = null;
  if (q.changePercent > 2.5 && rangePos > 0.6 && heavyVolume) direction = "up";
  else if (q.changePercent < -2.5 && rangePos < 0.4 && heavyVolume) direction = "down";

  return { direction, volumeMultiple, rangePositionPct: Math.max(0, Math.min(100, rangePos * 100)) };
}

// ── Daily briefing ────────────────────────────────────────────────────────────

export async function generateAndSendDailyBriefing(): Promise<{ sent: number; skipped?: string }> {
  const snapshot = await getMarketSnapshot();

  // Never send a briefing without real index data - skip instead of fabricating one.
  if (!snapshot.nifty) {
    console.warn("[alerts] daily briefing skipped: live NIFTY data unavailable");
    return { sent: 0, skipped: "live market data unavailable" };
  }
  const nifty = snapshot.nifty;

  const prefs = await prisma.alertPreference.findMany({
    where: { marketSummary: true, OR: [{ telegramEnabled: true }, { pushEnabled: true }] },
  });

  const dateStr = new Date().toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
  });

  const briefingText = fmtDailyBriefing({
    date:       dateStr,
    nifty,
    banknifty:  snapshot.banknifty,
    usdinr:     snapshot.usdinr,
    topGainers: snapshot.topGainers,
    topLosers:  snapshot.topLosers,
  });

  let sent = 0;
  for (const pref of prefs) {
    // Cooldown: one daily brief per day
    if (await isDuplicate(pref.userId, "market_summary", null, 20)) continue;

    if (pref.telegramEnabled) {
      await tgSendToUser(pref.userId, briefingText).catch(() => {});
    }
    if (pref.pushEnabled) {
      await sendPushToUser(pref.userId, {
        title: "📊 Market Ka Baadshah — Market Briefing",
        body:  `NIFTY ${nifty.change >= 0 ? "▲" : "▼"} ${Math.abs(nifty.change).toFixed(2)}% · ${dateStr}`,
        tag:   "daily-briefing",
        url:   "/alerts",
      }).catch(() => {});
    }
    await prisma.alertHistory.create({
      data: {
        userId:  pref.userId,
        type:    "market_summary",
        title:   `Market Briefing — ${dateStr}`,
        message: briefingText.replace(/<[^>]+>/g, ""),
        channel: [pref.telegramEnabled ? "telegram" : "", pref.pushEnabled ? "push" : ""].filter(Boolean).join(","),
      },
    }).catch(() => {});
    sent++;
  }

  return { sent };
}
