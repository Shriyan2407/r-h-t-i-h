import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/auth/prisma";
import { getBotDeepLink, getBotUsername } from "@/lib/services/telegramService";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const token = randomBytes(16).toString("hex");
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Upsert connection record
  await prisma.telegramConnection.upsert({
    where: { userId },
    create: { userId, connectToken: token, tokenExpiry: expiry },
    update: { connectToken: token, tokenExpiry: expiry, isActive: false },
  });

  return Response.json({
    token,
    deepLink: getBotDeepLink(token),
    botUsername: getBotUsername(),
    expiresAt: expiry.toISOString(),
  });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const conn = await prisma.telegramConnection.findUnique({
    where: { userId: session.user.id },
  });

  return Response.json({
    connected: conn?.isActive ?? false,
    username: conn?.username ?? null,
    firstName: conn?.firstName ?? null,
    connectedAt: conn?.connectedAt ?? null,
  });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.telegramConnection.updateMany({
    where: { userId: session.user.id },
    data: { isActive: false, chatId: null, connectToken: null, tokenExpiry: null },
  });

  return Response.json({ ok: true });
}
