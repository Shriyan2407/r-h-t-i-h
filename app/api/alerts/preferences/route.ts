import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/auth/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await prisma.alertPreference.findUnique({ where: { userId: session.user.id } });

  // Return defaults if not yet set
  return Response.json(prefs ?? {
    breakoutAlerts: true, breakdownAlerts: true, volumeAlerts: false,
    aiBuySignals: true, aiSellSignals: true, slHitAlerts: true,
    targetAlerts: true, earningsAlerts: true, marketSummary: true, macroNews: false,
    telegramEnabled: true, pushEnabled: true, emailEnabled: false,
    tier: "free", watchlistOnly: true,
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const allowed = [
    "breakoutAlerts", "breakdownAlerts", "volumeAlerts", "aiBuySignals", "aiSellSignals",
    "slHitAlerts", "targetAlerts", "earningsAlerts", "marketSummary", "macroNews",
    "telegramEnabled", "pushEnabled", "emailEnabled", "watchlistOnly",
  ];

  const data: any = {};
  for (const key of allowed) {
    if (typeof body[key] === "boolean") data[key] = body[key];
  }

  const prefs = await prisma.alertPreference.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  });

  return Response.json(prefs);
}
