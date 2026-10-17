import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/auth/prisma";
import { enforceRateLimit, POLICIES } from "@/lib/ratelimit/guard";
import { runCommittee, type CommitteeEvent } from "@/lib/agents/orchestrator";
import { productionLoaders } from "@/lib/agents/loaders";
import { MAX_QUERY_LENGTH } from "@/lib/agents/intent";
import type { Holding } from "@/lib/agents/context";
import { reportError } from "@/lib/observability/errors";

export const maxDuration = 60;

const bodySchema = z.object({
  query: z.string().trim().min(3, "Ask a question of at least 3 characters").max(MAX_QUERY_LENGTH),
  stream: z.boolean().optional().default(false),
  narrative: z.enum(["template", "llm"]).optional().default("template"),
});

/**
 * POST /api/agents/committee — run the seven-agent investment committee on a question.
 * Body: { query: string, stream?: boolean, narrative?: "template" | "llm" }. With stream=true the response is NDJSON: one CommitteeEvent per line
 * as agents actually start and finish, ending with a "result" (or "error") event.
 */
export async function POST(req: Request) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const headers = { "x-request-id": requestId, "Cache-Control": "private, no-store" };
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request", code: "INVALID_INPUT" }, { status: 400, headers });
  const limited = await enforceRateLimit(req, POLICIES.committee, userId);
  if (limited) return limited;

  // Holdings are read only if an agent asks for them, and never leave the server except as computed analytics.
  const holdings = async (): Promise<Holding[] | null> => {
    const p = await prisma.portfolio.findUnique({ where: { userId }, include: { holdings: true } });
    const rows = (p?.holdings ?? []).map((h) => ({ ticker: h.ticker, quantity: Number(h.quantity), sector: h.sector ?? "Other", exchange: h.exchange }));
    return rows.length ? rows : null;
  };
  const loaders = productionLoaders(holdings);
  const { query, stream, narrative } = parsed.data;

  if (!stream) {
    try {
      const result = await runCommittee(query, loaders, { requestId, narrative });
      return NextResponse.json(result, { headers });
    } catch (err) {
      reportError("agents.committee.failed", err, { requestId });
      return NextResponse.json({ error: "The committee could not complete this request", requestId }, { status: 500, headers });
    }
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: CommitteeEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
      try {
        await runCommittee(query, loaders, { requestId, narrative, onEvent: send });
      } catch (err) {
        reportError("agents.committee.failed", err, { requestId });
        send({ type: "error", requestId, message: "The committee could not complete this request." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, { headers: { ...headers, "Content-Type": "application/x-ndjson; charset=utf-8", "X-Accel-Buffering": "no" } });
}
