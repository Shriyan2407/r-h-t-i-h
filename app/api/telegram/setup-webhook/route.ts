import { NextRequest } from "next/server";
import { setWebhook } from "@/lib/services/telegramService";
import { checkSecret } from "@/lib/security/secrets";

// One-time setup endpoint — call after deployment to register webhook with Telegram
export async function POST(req: NextRequest) {
  const check = checkSecret(req.headers.get("x-setup-secret"), process.env.CRON_SECRET);
  if (!check.ok) {
    return Response.json({ error: check.error }, { status: check.status });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://r-h-t-i-h.vercel.app";
  const webhookUrl = `${baseUrl}/api/telegram/webhook`;

  const result = await setWebhook(webhookUrl);
  return Response.json({ webhookUrl, result });
}
