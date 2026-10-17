import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/auth/prisma";
import { requireAdmin } from "@/lib/auth/admin";

// GET /api/admin/alerts — dashboard data
export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    telegramUsers,
    recentAlerts,
    alertCounts,
  ] = await Promise.all([
    prisma.telegramConnection.findMany({
      where: { isActive: true },
      include: { user: { select: { email: true, name: true } } },
      orderBy: { connectedAt: "desc" },
    }),
    prisma.alertHistory.findMany({
      orderBy: { sentAt: "desc" },
      take: 100,
      include: { user: { select: { email: true } } },
    }),
    prisma.alertHistory.groupBy({
      by: ["type"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  return Response.json({
    telegramUsers: telegramUsers.map(t => ({
      chatId:      t.chatId,
      username:    t.username,
      firstName:   t.firstName,
      email:       t.user.email,
      connectedAt: t.connectedAt,
    })),
    recentAlerts: recentAlerts.map(a => ({
      id:      a.id,
      type:    a.type,
      ticker:  a.ticker,
      title:   a.title,
      channel: a.channel,
      sentAt:  a.sentAt,
      email:   a.user.email,
    })),
    alertCounts: alertCounts.map(c => ({ type: c.type, count: c._count.id })),
  });
}

const BULK_PREFS = [
  "breakoutAlerts", "breakdownAlerts", "volumeAlerts", "aiBuySignals", "aiSellSignals",
  "earningsAlerts", "marketSummary", "macroNews", "telegramEnabled",
] as const;

const postSchema = z.union([
  z.object({ action: z.enum(["trigger_price", "trigger_news", "trigger_briefing"]) }).strict(),
  z.object({ pref: z.enum(BULK_PREFS), value: z.boolean() }).strict(),
]);

// POST /api/admin/alerts — manual trigger or global pref update
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) return Response.json({ error: "Unknown action" }, { status: 400 });
  const body = parsed.data;

  if ("action" in body) {
    const engine = await import("@/lib/services/alertEngine");
    if (body.action === "trigger_briefing") {
      const result = await engine.generateAndSendDailyBriefing();
      return Response.json({ ok: true, triggered: "briefing", result });
    }
    // trigger_price and trigger_news both run the same engine (it handles dedup internally).
    const result = await engine.processMarketAlerts();
    return Response.json({ ok: true, triggered: body.action, result });
  }

  // Bulk preference update: { pref: "breakoutAlerts", value: true }
  const updated = await prisma.alertPreference.updateMany({
    data: { [body.pref]: body.value },
  });
  return Response.json({ ok: true, updated: updated.count });
}
