import { NextRequest } from "next/server";
import { generateAndSendDailyBriefing } from "@/lib/services/alertEngine";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Secure with CRON_SECRET (set in vercel.json authorization)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateAndSendDailyBriefing();
    return Response.json({ ok: true, ...result, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("[cron/daily-briefing]", err);
    return Response.json({ error: "Briefing generation failed" }, { status: 500 });
  }
}
