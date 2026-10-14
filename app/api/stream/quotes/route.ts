import { auth } from "@/lib/auth/auth";
import { enforceRateLimit, POLICIES } from "@/lib/ratelimit/guard";
import { parseTicker } from "@/lib/validation/ticker";
import { MAX_TICKERS, POLL_SEC, changedQuotes, fetchLiveQuotes, sseEvent, type LiveQuote } from "@/lib/live/quotes";
import { incr } from "@/lib/observability/metrics";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Each connection lives for this long, then ends cleanly; EventSource reconnects automatically. */
const CONNECTION_MS = 50_000;

/**
 * GET /api/stream/quotes?tickers=RELIANCE,TCS
 * Server-Sent Events: `quote` events when a price changes (polled every POLL_SEC from a shared cache), `ping`
 * heartbeats, and `end` before the connection closes. Quotes are delayed provider data, not exchange-real-time.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const raw = new URL(req.url).searchParams.get("tickers") ?? "";
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const tickers = [...new Set(parts.map((p) => parseTicker(p)).filter((t): t is string => !!t))];
  if (tickers.length === 0 || tickers.length !== parts.length || tickers.length > MAX_TICKERS) {
    return Response.json({ error: `Provide 1-${MAX_TICKERS} valid tickers`, code: "INVALID_TICKERS" }, { status: 400 });
  }
  const limited = await enforceRateLimit(req, POLICIES.liveQuotes, session.user.id);
  if (limited) return limited;

  incr("stream.quotes.connections");
  const enc = new TextEncoder();
  const sent: Record<string, LiveQuote> = {};

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (s: string) => {
        if (!closed) controller.enqueue(enc.encode(s));
      };
      const close = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };
      req.signal.addEventListener("abort", close);
      send(`retry: 3000\n\n`);
      const deadline = Date.now() + CONNECTION_MS;
      while (!closed && Date.now() < deadline) {
        const next = await fetchLiveQuotes(tickers);
        const changed = changedQuotes(sent, next);
        for (const q of changed) {
          sent[q.ticker] = q;
          send(sseEvent("quote", q));
        }
        if (changed.length === 0) send(`: ping\n\n`);
        await new Promise((r) => setTimeout(r, POLL_SEC * 1000));
      }
      send(sseEvent("end", { reconnect: true }));
      close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
