import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/auth/prisma";

// Also used by the whatsapp-service (authenticated by x-ingest-key)
function isServiceRequest(req: NextRequest) {
  const key = req.headers.get("x-ingest-key") ?? "";
  return key === (process.env.BROKER_INGEST_SECRET ?? "") && key !== "";
}

export async function GET(req: NextRequest) {
  const isService = isServiceRequest(req);
  if (!isService) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sources = await prisma.brokerSource.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json(sources);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chatId, name, type } = await req.json();
  if (!chatId || !name) return NextResponse.json({ error: "chatId and name required" }, { status: 400 });

  const source = await prisma.brokerSource.upsert({
    where:  { chatId },
    create: { chatId, name, type: type ?? "chat", isActive: true },
    update: { name, type: type ?? "chat", isActive: true },
  });

  return NextResponse.json(source, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const chatId  = params.get("chatId");
  const id      = params.get("id");

  if (chatId) {
    await prisma.brokerSource.updateMany({ where: { chatId }, data: { isActive: false } });
  } else if (id) {
    await prisma.brokerSource.update({ where: { id }, data: { isActive: false } });
  } else {
    return NextResponse.json({ error: "chatId or id required" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
