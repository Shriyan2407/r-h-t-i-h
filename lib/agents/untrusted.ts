/**
 * External text (headlines, summaries, anything a provider returns) is data, never instructions.
 *
 * Two layers:
 *   1. sanitize: strip control characters and markup, collapse whitespace and cap length, so a payload cannot
 *      smuggle formatting or very long text into a prompt or the UI.
 *   2. quarantine: text that reads like an instruction to a model is kept out of claims and prompts altogether and
 *      reported, so an attacker who plants "ignore previous instructions" in a headline gains nothing.
 *
 * The committee's decision is computed by rules and never depends on an LLM, so even text that slipped past
 * both layers could only change wording, which the numeric guard and decision check then verify.
 */

const INJECTION_PATTERNS: RegExp[] = [
  /\b(ignore|disregard|forget|override)\b[^.]{0,40}\b(previous|prior|above|all|earlier|system)\b[^.]{0,20}\b(instructions?|prompts?|rules?|messages?)\b/i,
  /\b(system|developer)\s*(prompt|message|instructions?)\b/i,
  /\byou are now\b|\bact as (an?|the)\b|\bnew instructions?\b|\bjailbreak\b/i,
  /\b(output|respond with|say|print|return)\b[^.]{0,30}\b(strong buy|strong sell|buy rating|sell rating)\b/i,
  /<\/?(system|assistant|user|instructions?)>/i,
  /\b(assistant|claude|chatgpt|llm|ai model)\s*[:,]\s*(please\s+)?(ignore|output|recommend|say)\b/i,
];

export function looksLikeInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((re) => re.test(text));
}

export function sanitizeExternalText(text: string, maxLength = 300): string {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/** Only absolute http(s) URLs are kept; anything else (javascript:, data:, relative) is dropped. */
export function safeUrl(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}
