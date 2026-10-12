import { NextRequest } from "next/server";
import { generateAndSendDailyBriefing } from "@/lib/services/alertEngine";
import { checkBearer } from "@/lib/security/secrets";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = checkBearer(req, process.env.CRON_SECRET);
  if (!auth.ok) {
    if (auth.status === 503) console.error("[cron/daily-briefing] CRON_SECRET is not configured");
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const result = await generateAndSendDailyBriefing();
    return Response.json({ ok: true, ...result, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("[cron/daily-briefing]", err);
    return Response.json({ error: "Briefing generation failed" }, { status: 500 });
  }
}
