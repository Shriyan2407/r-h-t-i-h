import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// IST market hours: 9:15 AM – 3:35 PM = UTC 03:45 – 10:05
function isMarketHours(): boolean {
  const now = new Date();
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  return mins >= 225 && mins <= 605;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isMarketHours()) {
    return Response.json({ ok: true, skipped: "Outside market hours", timestamp: new Date().toISOString() });
  }

  try {
    const { processMarketAlerts } = await import("@/lib/services/alertEngine");
    // News + earnings scanning is included in processMarketAlerts.
    // This cron exists as a separate slot so news runs independently
    // of the price-alert cron — both call the same engine which handles
    // deduplication internally.
    const result = await processMarketAlerts();
    return Response.json({
      ok: true,
      ...result,
      source: "news-alerts-cron",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/news-alerts]", err);
    return Response.json({ error: "News alert scan failed" }, { status: 500 });
  }
}
