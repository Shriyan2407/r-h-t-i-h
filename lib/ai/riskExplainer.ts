/**
 * Turns a RiskContract into a short explanation in four parts: WHY, WHAT SUPPORTS IT, WHAT COULD INVALIDATE IT,
 * WHAT THE MODEL DOES NOT KNOW.
 *
 * Default: a deterministic template (always available, always grounded).
 * Optional: Claude rewrites the same evidence in plainer language. The LLM receives ONLY the contract, cannot
 * change any number, and its output must pass checkExplanation(); otherwise the template is used.
 */
import { checkExplanation } from "./numericGuard";
import type { RiskContract } from "./evidence";
import { log } from "@/lib/observability/logger";
import { incr, timed } from "@/lib/observability/metrics";

export interface Explanation {
  why: string;
  supports: string;
  invalidates: string;
  unknowns: string;
  source: "template" | "llm";
  model?: string;
}

const LEVEL = (pctile: number | null) =>
  pctile === null ? "" : pctile >= 80 ? "high for this stock" : pctile <= 20 ? "low for this stock" : "about normal for this stock";

export function templateExplanation(c: RiskContract): Explanation {
  const has = (id: string) => c.evidence.some((e) => e.id === id);
  const raising = c.factors.raising.map((f) => f.group.toLowerCase()).join(", ");
  const lowering = c.factors.lowering.map((f) => f.group.toLowerCase()).join(", ");
  const why =
    `The model expects daily moves of about ${c.evidence.find((e) => e.id === "E4")!.display} over the next 5 trading days [E4]` +
    (has("E10") ? `, which is ${LEVEL(c.volatility.percentileVsOwnYear)} [E10]` : "") + ". " +
    (raising ? `The largest upward pressure comes from ${raising}` : "No factor raises the forecast above its average") +
    (lowering ? `; ${lowering} pull it down.` : ".");
  const supports =
    `Recent realised volatility is ${c.evidence.find((e) => e.id === "E2")!.display} [E2] and the average true range is ` +
    `${c.evidence.find((e) => e.id === "E3")!.display} [E3]; India VIX is ${c.evidence.find((e) => e.id === "E8")!.display} [E8]` +
    (has("E11") ? ` and the market regime is ${c.evidence.find((e) => e.id === "E11")!.display} [E11]` : "") + ". " +
    `In walk-forward testing this model's error was ${c.evidence.find((e) => e.id === "E7")!.display} relative to simply repeating recent volatility [E7].`;
  const invalidates =
    `Scheduled events (results, policy decisions) and unexpected news can move prices far outside the 80% range of ` +
    `${c.evidence.find((e) => e.id === "E5")!.display} [E5]; by construction about one day in five falls outside it.` +
    (has("E12") ? ` Historically, in this regime ${c.evidence.find((e) => e.id === "E12")!.display} [E12].` : "");
  const unknowns =
    "The model sees only prices, volume, the index and India VIX. It does not read news, earnings, fundamentals or order flow, " +
    "and it does not predict direction: no direction model passed validation.";
  return { why, supports, invalidates, unknowns, source: "template" };
}

const SYSTEM = [
  "You explain a stock-volatility forecast to a retail investor using ONLY the JSON evidence provided.",
  "Rules: Do not state any number that is not exactly one of the evidence `display` values (the number 5 for the horizon is allowed).",
  "Cite evidence ids in square brackets, e.g. [E4], after each claim. Never predict direction, never give buy/sell advice,",
  "never use words like guaranteed, certain, will rise or will fall. Return JSON with keys why, supports, invalidates, unknowns;",
  "each value is 1-3 plain sentences.",
].join(" ");

/** Optional LLM rewrite; returns the template whenever the key is missing, the call fails, or the guard rejects it. */
export async function explainRisk(c: RiskContract, opts: { useLlm?: boolean } = {}): Promise<Explanation> {
  const fallback = templateExplanation(c);
  if (!opts.useLlm || !process.env.ANTHROPIC_API_KEY?.trim()) return fallback;

  const model = process.env.CLAUDE_MODEL?.trim() || "claude-opus-5-5";
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic();
    const evidence = c.evidence.map(({ id, label, display, kind }) => ({ id, label, display, kind }));
    const res = await timed("ai.explain.llm", () =>
      client.beta.messages.create({
        model,
        max_tokens: 2000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        system: SYSTEM,
        messages: [{ role: "user", content: JSON.stringify({ ticker: c.ticker, horizonDays: 5, evidence }) }],
      } as Parameters<typeof client.beta.messages.create>[0]),
    );
    const msg = res as { stop_reason?: string; content: Array<{ type: string; text?: string }> };
    if (msg.stop_reason === "refusal") {
      incr("ai.explain.refusal");
      return fallback;
    }
    const raw = msg.content.find((b) => b.type === "text")?.text ?? "";
    const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as Record<string, unknown>;
    const parts = ["why", "supports", "invalidates", "unknowns"].map((k) => (typeof json[k] === "string" ? (json[k] as string) : ""));
    if (parts.some((p) => !p)) throw new Error("missing sections");
    const verdict = checkExplanation(parts.join(" "), c.evidence);
    if (!verdict.ok) {
      incr("ai.explain.rejected");
      log.warn("ai.explain.rejected", { ticker: c.ticker, problems: verdict.problems.slice(0, 5) });
      return fallback;
    }
    incr("ai.explain.accepted");
    return { why: parts[0], supports: parts[1], invalidates: parts[2], unknowns: parts[3], source: "llm", model };
  } catch (err) {
    incr("ai.explain.error");
    log.warn("ai.explain.failed", { ticker: c.ticker, error: err });
    return fallback;
  }
}
