import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { tgSendToUser } from "@/lib/services/telegramService";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const result = await tgSendToUser(
    session.user.id,
    `✅ <b>Test Alert — Market Ka Baadshah</b>\n\nYour Telegram notifications are working!\n\nYou'll receive:\n• 🚀 Breakout alerts\n• 💡 AI buy/sell signals\n• 📊 Daily market briefings\n\n<i>Market Ka Baadshah AI</i>`
  );

  if (!result) return Response.json({ error: "Telegram not connected or bot token missing" }, { status: 400 });
  return Response.json({ ok: true });
}
