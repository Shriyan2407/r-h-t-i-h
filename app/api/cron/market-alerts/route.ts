import { NextRequest } from "next/server";
import { processMarketAlerts } from "@/lib/services/alertEngine";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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
