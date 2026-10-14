import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { enforceRateLimit, POLICIES } from "@/lib/ratelimit/guard";
import { invalidTickerResponse, parseTicker } from "@/lib/validation/ticker";
import { explainMove } from "@/lib/research/service";
import { reportError } from "@/lib/observability/errors";

export const maxDuration = 30;

/** GET /api/research/move/[ticker]?explain=llm — evidence-backed "why is it moving today?" */
export async function GET(req: Request, ctx: { params: Promise<{ ticker: string }> }) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const headers = { "x-request-id": requestId, "Cache-Control": "private, no-store" };
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  const ticker = parseTicker((await ctx.params).ticker);
  if (!ticker) return invalidTickerResponse();
  const limited = await enforceRateLimit(req, POLICIES.research, session.user.id);
  if (limited) return limited;

  try {
    const r = await explainMove(ticker, { useLlm: new URL(req.url).searchParams.get("explain") === "llm" });
    if (!r.available) return NextResponse.json({ available: false, reason: r.reason }, { status: 404, headers });
    return NextResponse.json(r.result, { headers });
  } catch (err) {
    reportError("research.move.failed", err, { requestId, ticker });
    return NextResponse.json({ error: "Research failed", requestId }, { status: 500, headers });
  }
}
