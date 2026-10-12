import { NextRequest } from "next/server";
import { processMarketAlerts } from "@/lib/services/alertEngine";
import { checkBearer } from "@/lib/security/secrets";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = checkBearer(req, process.env.CRON_SECRET);
  if (!auth.ok) {
    if (auth.status === 503) console.error("[cron/market-alerts] CRON_SECRET is not configured");
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  // Only run during IST market hours: 9:15 AM – 3:35 PM (3:45 – 10:05 UTC)
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const totalUTCMins = utcHour * 60 + utcMin;
  if (totalUTCMins < 225 || totalUTCMins > 605) {
    return Response.json({ ok: true, skipped: "Outside market hours", timestamp: now.toISOString() });
  }

  try {
    const result = await processMarketAlerts();
    return Response.json({ ok: true, ...result, timestamp: now.toISOString() });
  } catch (err) {
    console.error("[cron/market-alerts]", err);
    return Response.json({ error: "Alert processing failed" }, { status: 500 });
  }
}
