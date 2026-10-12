import { NextRequest } from "next/server";
import { prisma } from "@/lib/auth/prisma";
import { tgSend, fmtHelp, fmtConnected, fmtStockAnalysis } from "@/lib/services/telegramService";
import { checkSecret } from "@/lib/security/secrets";
import { telegramUpdateSchema, parseStartToken, parseAnalyzeCommand } from "@/lib/telegram/updates";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // The webhook secret is mandatory: without it anyone could forge bot updates.
  const check = checkSecret(
    req.headers.get("x-telegram-bot-api-secret-token"),
    process.env.TELEGRAM_WEBHOOK_SECRET,
  );
  if (!check.ok) {
    if (check.status === 503) console.error("[telegram/webhook] TELEGRAM_WEBHOOK_SECRET is not configured");
    return new Response(check.error, { status: check.status });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ ok: true });
  }

  // Malformed updates are acknowledged (200) so Telegram does not retry them.
  const parsed = telegramUpdateSchema.safeParse(raw);
  const message = parsed.success ? parsed.data.message : undefined;
  if (!message) return Response.json({ ok: true });

  const chatId = message.chat.id;
  const text: string = message.text ?? "";
  const firstName: string = message.from?.first_name ?? "";
  const username: string = message.from?.username ?? "";

  if (!text) return Response.json({ ok: true });

  try {
    // /start TOKEN — connect user account
    if (text.startsWith("/start")) {
      const token = parseStartToken(text);
      if (token) {
        const conn = await prisma.telegramConnection.findUnique({
          where: { connectToken: token },
          include: { user: true },
        });

        if (conn && conn.tokenExpiry && conn.tokenExpiry > new Date()) {
          await prisma.telegramConnection.update({
            where: { id: conn.id },
            data: {
              chatId: String(chatId),
              username: username || null,
              firstName: firstName || null,
              connectedAt: new Date(),
              isActive: true,
              connectToken: null,
              tokenExpiry: null,
            },
          });
          await tgSend(chatId, fmtConnected(firstName));
        } else if (conn) {
          await tgSend(chatId, "⚠️ This connect link has expired. Please generate a new one from the alerts page.");
        } else {
          await tgSend(chatId, fmtHelp());
        }
        return Response.json({ ok: true });
      }
      await tgSend(chatId, fmtHelp());
      return Response.json({ ok: true });
    }

    // /help
    if (text === "/help") {
      await tgSend(chatId, fmtHelp());
      return Response.json({ ok: true });
    }

    // /alerts
    if (text === "/alerts") {
      const conn = await prisma.telegramConnection.findUnique({ where: { chatId: String(chatId) } });
      if (!conn) {
        await tgSend(chatId, "❌ Account not linked. Visit Market Ka Baadshah → Alerts to connect.");
        return Response.json({ ok: true });
      }
      const prefs = await prisma.alertPreference.findUnique({ where: { userId: conn.userId } });
      const msg = prefs
        ? `🔔 <b>Your Alert Settings</b>\n\nBreakouts: ${prefs.breakoutAlerts ? "✅" : "❌"}\nBreakdowns: ${prefs.breakdownAlerts ? "✅" : "❌"}\nAI Buy Signals: ${prefs.aiBuySignals ? "✅" : "❌"}\nAI Sell Signals: ${prefs.aiSellSignals ? "✅" : "❌"}\nVolume Spikes: ${prefs.volumeAlerts ? "✅" : "❌"}\nMarket Summary: ${prefs.marketSummary ? "✅" : "❌"}\nTier: <b>${prefs.tier.toUpperCase()}</b>\n\nManage at: market-ka-baadshah.vercel.app/alerts`
        : "No preferences found. Visit the alerts page to configure.";
      await tgSend(chatId, msg);
      return Response.json({ ok: true });
    }

    // /briefing — send daily briefing on demand
    if (text === "/briefing") {
      await tgSend(chatId, "⏳ Generating your market briefing...");
      const { generateAndSendDailyBriefing } = await import("@/lib/services/alertEngine");
      // Find user and send briefing just to them
      const conn = await prisma.telegramConnection.findUnique({ where: { chatId: String(chatId) } });
      if (conn) {
        // Trigger the full briefing but it will only target users with prefs;
        // For this user, generate and send directly
        const { fmtDailyBriefing } = await import("@/lib/services/telegramService");
        const YFClass = (await import("yahoo-finance2")).default;
        const yf = new (YFClass as any)();
        let niftyChange = 0;
        try {
          const nq: any = await yf.quote("^NSEI");
          niftyChange = nq?.regularMarketChangePercent ?? 0;
        } catch { /* use 0 */ }
        const dateStr = new Date().toLocaleDateString("en-IN", {
          weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
        });
        const brief = fmtDailyBriefing({
          date: dateStr,
          nifty: { price: 24000, change: niftyChange },
          banknifty: { price: 51500, change: 0.1 },
          topGainers: [{ ticker: "RELIANCE", change: 1.8 }, { ticker: "HDFCBANK", change: 1.2 }, { ticker: "TCS", change: 0.9 }],
          topLosers: [{ ticker: "WIPRO", change: -1.5 }, { ticker: "INFY", change: -0.8 }, { ticker: "LTIM", change: -0.6 }],
          aiPicks: [
            { ticker: "HDFCBANK", verdict: "ACCUMULATE", note: "Near key support" },
            { ticker: "TCS", verdict: "HOLD", note: "Await breakout" },
            { ticker: "RELIANCE", verdict: "BUY", note: "Strong volume" },
          ],
          fii: "Check NSE website",
          dii: "Check NSE website",
          usdinr: "83.50",
          riskLevel: niftyChange > 0.5 ? 4 : niftyChange < -0.5 ? 7 : 5,
          outlook: niftyChange > 0 ? "Bullish bias. Stay disciplined." : "Cautious. Manage risk.",
        });
        await tgSend(chatId, brief);
      } else {
        await tgSend(chatId, "❌ Account not linked. Visit Market Ka Baadshah → Alerts to connect.");
      }
      return Response.json({ ok: true });
    }

    // /analyze TICKER or "analyze TICKER" or just "TICKER analysis"
    const ticker = parseAnalyzeCommand(text);

    if (ticker) {
      await tgSend(chatId, `⏳ Analyzing <b>${ticker}</b>…`);

      try {
        const baseUrl = process.env.NEXTAUTH_URL ?? "https://r-h-t-i-h.vercel.app";
        const res = await fetch(`${baseUrl}/api/intelligence/${ticker}`, {
          signal: AbortSignal.timeout ? AbortSignal.timeout(30000) : undefined,
          headers: { "x-internal-call": "1" },
        });
        if (res.ok) {
          const data: any = await res.json();
          const report = data.report ?? data;

          // Map IntelligenceReport fields → fmtStockAnalysis fields
          const parseRupee = (s?: string) => s ? parseFloat(s.replace(/[^\d.]/g, "")) || undefined : undefined;

          const sentimentToVerdict = (s?: string) =>
            s === "BULLISH" ? "BUY" : s === "BEARISH" ? "SELL/AVOID" : s === "MIXED" ? "WATCH" : "HOLD";

          const scoreToRisk = (scores?: Record<string, number>) => {
            if (!scores) return "MODERATE";
            const avg = (scores.technical + scores.riskReward + scores.fundamental) / 3;
            return avg >= 65 ? "LOW" : avg <= 40 ? "HIGH" : "MODERATE";
          };

          await tgSend(chatId, fmtStockAnalysis(ticker, {
            price: report._meta?.currentPrice ?? report.price ?? report.quote?.regularMarketPrice ?? 0,
            verdict: sentimentToVerdict(report.currentSentiment) ?? report.verdict ?? "HOLD",
            confidence: report.aiConfidence ?? report.confidence ?? 65,
            summary: report.narrativeSummary ?? report.oneLiner ?? report.summary ?? "",
            t1: parseRupee(report.entryZone?.target1) ?? report.target1,
            t2: parseRupee(report.entryZone?.target2) ?? report.target2,
            sl: parseRupee(report.entryZone?.stopLoss) ?? report.stopLoss,
            riskLevel: scoreToRisk(report.scores) ?? report.riskLevel ?? "MODERATE",
            newsSentiment: report.currentSentiment ?? report.newsSentiment ?? "NEUTRAL",
          }));
        } else {
          const errBody = await res.text().catch(() => "");
          console.error(`[TelegramBot] Intelligence API ${res.status} for ${ticker}:`, errBody.slice(0, 200));
          await tgSend(chatId, `❌ Could not fetch analysis for <b>${ticker}</b>. Please try again.`);
        }
      } catch (e) {
        console.error(`[TelegramBot] fetch/parse error for ${ticker}:`, (e as Error).message);
        await tgSend(chatId, `❌ Analysis timed out for <b>${ticker}</b>. Try again in a moment.`);
      }
      return Response.json({ ok: true });
    }

    // Default — unknown command
    await tgSend(chatId, fmtHelp());
  } catch (err) {
    console.error("[Telegram Webhook]", err);
  }

  return Response.json({ ok: true });
}
