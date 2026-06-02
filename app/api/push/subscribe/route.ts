import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/auth/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { endpoint, keys, userAgent } = body;
  if (!endpoint || !keys?.auth || !keys?.p256dh) {
    return Response.json({ error: "Invalid subscription object" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: session.user.id,
      endpoint,
      auth: keys.auth,
      p256dh: keys.p256dh,
      userAgent: userAgent ?? null,
    },
    update: {
      auth: keys.auth,
      p256dh: keys.p256dh,
      userId: session.user.id,
    },
  });

  return Response.json({ ok: true });
}
