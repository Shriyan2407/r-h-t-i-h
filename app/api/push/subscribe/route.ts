import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/auth/prisma";
import { pushSubscriptionSchema } from "@/lib/validation/push";

/** A user realistically has a handful of browsers/devices; cap to stop table abuse. */
const MAX_SUBSCRIPTIONS_PER_USER = 20;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  let raw: unknown;
  try { raw = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = pushSubscriptionSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "Invalid subscription object" }, { status: 400 });
  }
  const { endpoint, keys, userAgent } = parsed.data;

  const existing = await prisma.pushSubscription.count({ where: { userId } });
  const alreadyOurs = existing > 0
    ? await prisma.pushSubscription.findFirst({ where: { userId, endpoint }, select: { id: true } })
    : null;
  if (!alreadyOurs && existing >= MAX_SUBSCRIPTIONS_PER_USER) {
    return Response.json({ error: "Too many registered devices" }, { status: 409 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId,
      endpoint,
      auth: keys.auth,
      p256dh: keys.p256dh,
      userAgent: userAgent ?? null,
    },
    update: {
      auth: keys.auth,
      p256dh: keys.p256dh,
      userId,
    },
  });

  return Response.json({ ok: true });
}
