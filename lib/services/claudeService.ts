/* ═══════════════════════════════════════════════════════════════
   R.H.T.I.H — Claude AI Service
   Handles: client initialization, retry logic, rate limiting,
   response validation, and JSON extraction.
═══════════════════════════════════════════════════════════════ */

const MAX_RETRIES    = 3;
const BASE_DELAY_MS  = 1000;
const MAX_TOKENS     = 7000;

/* ── Exponential backoff sleep ──────────────────────────── */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/* ── Extract valid JSON from Claude response ────────────── */
export function extractJSON(raw: string): string {
  // 1. Try to strip markdown code fences
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) return fenced[1].trim();

  // 2. Try to find the outermost JSON object
  const start = raw.indexOf("{");
  const end   = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return raw.slice(start, end + 1);
  }

  return raw.trim();
}

/* ── Response validator ─────────────────────────────────── */
export function validateReport(data: any): boolean {
  if (!data || typeof data !== "object") return false;
  const required = ["ticker", "companyName", "sector", "scores", "events"];
  return required.every(key => key in data);
}

/* ── Main Claude API caller ─────────────────────────────── */
export async function callClaude(
  prompt:     string,
  systemMsg?: string,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const model = process.env.CLAUDE_MODEL ?? "claude-opus-4-5";

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const anthropic = new Anthropic({ apiKey });

      const msg = await anthropic.messages.create({
        model,
        max_tokens: MAX_TOKENS,
        system: systemMsg ?? [
          "You are R.H.T.I.H Intelligence Core — an institutional AI equity analyst for Indian markets.",
          "You ALWAYS return valid JSON only.",
          "No markdown fences, no explanations outside the JSON.",
          "Your analysis is specific, non-generic, and evidence-based.",
        ].join(" "),
        messages: [{ role: "user", content: prompt }],
      });

      const raw = msg.content.find(c => c.type === "text")?.text ?? "";
      if (!raw) throw new Error("Empty response from Claude");

      return raw;

    } catch (err: any) {
      lastError = err;

      /* Rate limit — wait before retry */
      if (err?.status === 429 || err?.message?.includes("rate")) {
        const wait = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[Claude] Rate limited. Waiting ${wait}ms before retry ${attempt}/${MAX_RETRIES}`);
        await sleep(wait);
        continue;
      }

      /* Overloaded — retry */
      if (err?.status === 529 || err?.message?.includes("overloaded")) {
        const wait = BASE_DELAY_MS * attempt * 2;
        console.warn(`[Claude] Overloaded. Waiting ${wait}ms before retry ${attempt}/${MAX_RETRIES}`);
        await sleep(wait);
        continue;
      }

      /* Auth error — no point retrying */
      if (err?.status === 401 || err?.status === 403) {
        throw new Error(`Claude auth error: ${err.message}. Check ANTHROPIC_API_KEY.`);
      }

      /* Other errors — retry with backoff */
      if (attempt < MAX_RETRIES) {
        const wait = BASE_DELAY_MS * attempt;
        console.warn(`[Claude] Error on attempt ${attempt}: ${err.message}. Retrying in ${wait}ms...`);
        await sleep(wait);
        continue;
      }
    }
  }

  throw lastError ?? new Error("Claude API call failed after all retries");
}

/* ── Parse and validate Claude's intelligence response ───── */
export function parseIntelligenceResponse(raw: string, ticker: string): any {
  const jsonStr = extractJSON(raw);

  let data: any;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    // Try to fix common JSON issues
    const fixed = jsonStr
      .replace(/,\s*}/g, "}")     // trailing commas
      .replace(/,\s*]/g, "]")     // trailing commas in arrays
      .replace(/\n/g, " ")        // newlines in strings
      .replace(/[\x00-\x1F]/g, ""); // control chars
    data = JSON.parse(fixed);
  }

  if (!validateReport(data)) {
    throw new Error("Claude response missing required fields (ticker, companyName, scores, events)");
  }

  /* Ensure ticker is correct */
  data.ticker = ticker.toUpperCase();

  /* Clamp all score values to 0-100 */
  if (data.scores) {
    for (const key of Object.keys(data.scores)) {
      data.scores[key] = Math.max(0, Math.min(100, Math.round(data.scores[key] ?? 50)));
    }
  }

  /* Clamp event scores */
  if (Array.isArray(data.events)) {
    data.events = data.events.map((e: any) => ({
      ...e,
      impactScore:       Math.max(0, Math.min(100, Math.round(e.impactScore      ?? 50))),
      institutionalConf: Math.max(0, Math.min(100, Math.round(e.institutionalConf?? 50))),
      retailExcitement:  Math.max(0, Math.min(100, Math.round(e.retailExcitement ?? 50))),
      ltImportance:      Math.max(0, Math.min(100, Math.round(e.ltImportance     ?? 50))),
    }));
  }

  /* A model-written "confidence" is not a calibrated probability, so it is discarded: it was
     previously clamped into 60-95 (and defaulted to 75), which made every report look confident. */
  delete data.aiConfidence;

  return data;
}
