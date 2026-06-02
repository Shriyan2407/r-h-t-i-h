import { NextRequest } from "next/server";
import { setWebhook } from "@/lib/services/telegramService";

// One-time setup endpoint — call after deployment to register webhook with Telegram
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-setup-secret");
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://r-h-t-i-h.vercel.app";
  const webhookUrl = `${baseUrl}/api/telegram/webhook`;

  const result = await setWebhook(webhookUrl);
  return Response.json({ webhookUrl, result });
}
