import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/auth/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const offset = Number(searchParams.get("offset") ?? 0);

  const [items, total] = await Promise.all([
    prisma.alertHistory.findMany({
      where: { userId: session.user.id },
      orderBy: { sentAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.alertHistory.count({ where: { userId: session.user.id } }),
  ]);

  return Response.json({ items, total, limit, offset });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Mark all unread alerts as read
  await prisma.alertHistory.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });

  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.alertHistory.deleteMany({ where: { userId: session.user.id } });
  return Response.json({ ok: true });
}
