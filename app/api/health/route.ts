import { NextResponse } from "next/server";
import YFClass from "yahoo-finance2";
import { prisma } from "@/lib/auth/prisma";
import { checkBearer } from "@/lib/security/secrets";
import { deepHealth, publicHealth, type HealthProbes } from "@/lib/observability/health";
import { cacheHitRate, snapshot } from "@/lib/observability/metrics";
import { log } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yf = new (YFClass as any)();

const probes: HealthProbes = {
  database: async () => {
    await prisma.$queryRaw`SELECT 1`;
  },
  yahoo: async () => {
    const q = await yf.quote("^NSEI");
    return typeof q?.regularMarketPrice === "number";
  },
};

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Public: liveness + database only (safe for uptime monitors; 503 when degraded).
 * With `Authorization: Bearer $HEALTH_SECRET` (falls back to CRON_SECRET): dependency detail
 * plus single-instance latency and cache hit-rate metrics.
 */
export async function GET(req: Request) {
  const secret = process.env.HEALTH_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  const wantsDetail = req.headers.has("authorization");

  if (wantsDetail) {
    const auth = checkBearer(req, secret);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers: NO_STORE });

    const health = await deepHealth(probes);
    if (health.status !== "ok") log.warn("health.degraded", { checks: health.checks });
    const m = snapshot();
    return NextResponse.json(
      {
        ...health,
        version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
        metrics: {
          ...m,
          cacheHitRate: {
            intelligence: cacheHitRate("intelligence"),
            "ai-analysis": cacheHitRate("ai-analysis"),
            bars: cacheHitRate("bars"),
          },
        },
      },
      { status: health.status === "ok" ? 200 : 503, headers: NO_STORE },
    );
  }

  const health = await publicHealth(probes);
  if (health.status !== "ok") log.error("health.database_down", {});
  return NextResponse.json(health, { status: health.status === "ok" ? 200 : 503, headers: NO_STORE });
}
