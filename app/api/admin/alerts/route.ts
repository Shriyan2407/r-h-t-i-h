import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/auth/prisma";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "shriyanbohra24077@gmail.com";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) return null;
  return session;
}

// GET /api/admin/alerts — dashboard data
export async function GET(req: NextRequest) {
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

// POST /api/admin/alerts — manual trigger or global pref update
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  // Manual trigger: { action: "trigger_price" | "trigger_news" | "trigger_briefing" }
  if (body.action === "trigger_price" || body.action === "trigger_news") {
    const { processMarketAlerts } = await import("@/lib/services/alertEngine");
    const result = await processMarketAlerts();
    return Response.json({ ok: true, triggered: body.action, result });
  }

  if (body.action === "trigger_briefing") {
    const { generateAndSendDailyBriefing } = await import("@/lib/services/alertEngine");
    const result = await generateAndSendDailyBriefing();
    return Response.json({ ok: true, triggered: "briefing", result });
  }

  // Bulk preference update: { pref: "breakoutAlerts", value: true }
  if (body.pref && typeof body.value === "boolean") {
    const allowed = [
      "breakoutAlerts", "breakdownAlerts", "volumeAlerts", "aiBuySignals", "aiSellSignals",
      "earningsAlerts", "marketSummary", "macroNews", "telegramEnabled",
    ];
    if (!allowed.includes(body.pref)) {
      return Response.json({ error: "Unknown preference" }, { status: 400 });
    }
    const updated = await prisma.alertPreference.updateMany({
      data: { [body.pref]: body.value },
    });
    return Response.json({ ok: true, updated: updated.count });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
