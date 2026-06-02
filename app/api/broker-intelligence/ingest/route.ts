import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/auth/prisma";

export async function POST(req: NextRequest) {
  // Authenticate with shared secret
  const key = req.headers.get("x-ingest-key") ?? "";
  if (!key || key !== (process.env.BROKER_INGEST_SECRET ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { chatId, chatName, chatType, msgId, sender, body: text, timestamp, signal, aiSummary, aiRisk } = body;

    if (!chatId || !text) {
      return NextResponse.json({ error: "chatId and body required" }, { status: 400 });
    }

    // Upsert broker source
    const source = await prisma.brokerSource.upsert({
      where:  { chatId },
      create: { chatId, name: chatName ?? chatId, type: chatType ?? "chat" },
      update: { name: chatName ?? chatId, type: chatType ?? "chat" },
    });

    // Skip if duplicate message
    if (msgId) {
      const existing = await prisma.brokerMessage.findUnique({ where: { msgId } });
      if (existing) return NextResponse.json({ ok: true, duplicate: true });
    }

    // Create message
    const message = await prisma.brokerMessage.create({
      data: {
        sourceId:  source.id,
        msgId:     msgId ?? null,
        sender:    sender ?? null,
        body:      text,
        timestamp: new Date(timestamp ?? Date.now()),
      },
    });

    // Create signal if parser found one
    if (signal?.ticker && signal?.action) {
      await prisma.stockSignal.create({
        data: {
          messageId:      message.id,
          ticker:         signal.ticker,
          action:         signal.action,
          entry:          signal.entry ?? null,
          target:         signal.target ?? null,
          stopLoss:       signal.stopLoss ?? null,
          classification: signal.classification ?? "GENERAL",
          confidence:     signal.confidence ?? 50,
          sentiment:      signal.sentiment ?? "NEUTRAL",
          sector:         signal.sector ?? null,
          aiSummary:      aiSummary ?? null,
          aiRisk:         aiRisk ?? null,
        },
      });
    }

    return NextResponse.json({ ok: true, messageId: message.id });
  } catch (err) {
    console.error("[/api/broker-intelligence/ingest]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
