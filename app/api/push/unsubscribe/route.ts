import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/auth/prisma";
import { pushUnsubscribeSchema } from "@/lib/validation/push";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let raw: unknown;
  try { raw = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = pushUnsubscribeSchema.safeParse(raw);
  if (!parsed.success) return Response.json({ error: "Missing endpoint" }, { status: 400 });

  await prisma.pushSubscription.deleteMany({
    where: { userId: session.user.id, endpoint: parsed.data.endpoint },
  });

  return Response.json({ ok: true });
}
