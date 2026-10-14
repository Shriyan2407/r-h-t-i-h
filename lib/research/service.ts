import { INDEX_SYMBOL, VIX_SYMBOL, fetchAdjustedBars } from "@/lib/ml/data";
import { buildRiskForecast } from "@/lib/ml/riskForecast";
import { fetchLiveQuotes } from "@/lib/live/quotes";
import { getStockNews } from "@/lib/services/newsAggregator";
import { checkExplanation } from "@/lib/ai/numericGuard";
import { log } from "@/lib/observability/logger";
import { incr, timed } from "@/lib/observability/metrics";
import { buildMoveAnswer, type MoveAnswer } from "./move";

export type MoveResult = { available: true; result: MoveAnswer & { answerSource: "template" | "llm"; model?: string } } | { available: false; reason: string };

/** Gather inputs, build the evidence-only answer, optionally let Claude reword it behind the numeric guard. */
export async function explainMove(ticker: string, opts: { useLlm?: boolean } = {}): Promise<MoveResult> {
  const [index, vix, live] = await Promise.all([
    fetchAdjustedBars(INDEX_SYMBOL, 3),
    fetchAdjustedBars(VIX_SYMBOL, 3),
    fetchLiveQuotes([ticker]).catch(() => ({} as Record<string, null>)),
  ]);
  let symbol = `${ticker}.NS`;
  let stock = await fetchAdjustedBars(symbol, 3);
  if (!stock) {
    symbol = `${ticker}.BO`;
    stock = await fetchAdjustedBars(symbol, 3);
  }
  if (!stock || stock.length < 25) return { available: false, reason: "NO_DATA" };

  const forecast = index && vix ? buildRiskForecast({ ticker, symbol, stock, index, vix }) : null;
  const contract = forecast?.available ? forecast.contract : null;
  const beta = contract ? Number(contract.evidence.find((e) => e.id === "E9")?.value ?? NaN) : NaN;
  const news = await getStockNews(ticker).catch(() => []);

  const answer = buildMoveAnswer({
    ticker, symbol, stock, index: index ?? [],
    liveChangePct: live[ticker]?.changePct ?? null,
    beta: Number.isFinite(beta) ? beta : null,
    forecastDailyVol: contract?.volatility.dailyVol ?? null,
    regime: contract?.regime?.name ?? null,
    news,
  });

  if (!opts.useLlm || !process.env.ANTHROPIC_API_KEY?.trim()) return { available: true, result: { ...answer, answerSource: "template" } };
  const reworded = await rewordWithClaude(answer);
  return { available: true, result: reworded ? { ...answer, answer: reworded.answer, answerSource: "llm", model: reworded.model } : { ...answer, answerSource: "template" } };
}

const SYSTEM = [
  "You explain why an Indian stock is moving today, to a retail investor, using ONLY the JSON evidence provided.",
  "Do not state any number that is not exactly one of the evidence `display` values. Cite evidence ids in square brackets after each claim.",
  "Never say a headline caused the move; say it may be related. Never predict what happens next, never give buy/sell advice,",
  "never use certainty words. Return JSON with keys what, market, news, caveats; each 1-3 plain sentences.",
].join(" ");

async function rewordWithClaude(a: MoveAnswer): Promise<{ answer: MoveAnswer["answer"]; model: string } | null> {
  const model = process.env.CLAUDE_MODEL?.trim() || "claude-opus-5-5";
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic();
    const evidence = a.evidence.map(({ id, label, display, kind }) => ({ id, label, display, kind }));
    const res = (await timed("ai.research.llm", () =>
      client.beta.messages.create({
        model,
        max_tokens: 2000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        system: SYSTEM,
        messages: [{ role: "user", content: JSON.stringify({ ticker: a.ticker, classification: a.classification, evidence }) }],
      } as Parameters<typeof client.beta.messages.create>[0]),
    )) as { stop_reason?: string; content: Array<{ type: string; text?: string }> };
    if (res.stop_reason === "refusal") return null;
    const raw = res.content.find((b) => b.type === "text")?.text ?? "";
    const j = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as Record<string, unknown>;
    const parts = (["what", "market", "news", "caveats"] as const).map((k) => (typeof j[k] === "string" ? (j[k] as string) : ""));
    if (parts.some((p) => !p)) return null;
    const verdict = checkExplanation(parts.join(" "), a.evidence);
    if (!verdict.ok) {
      incr("ai.research.rejected");
      log.warn("ai.research.rejected", { ticker: a.ticker, problems: verdict.problems.slice(0, 5) });
      return null;
    }
    incr("ai.research.accepted");
    return { answer: { what: parts[0], market: parts[1], news: parts[2], caveats: parts[3] }, model };
  } catch (err) {
    incr("ai.research.error");
    log.warn("ai.research.failed", { ticker: a.ticker, error: err });
    return null;
  }
}
