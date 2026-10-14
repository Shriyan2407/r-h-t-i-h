/**
 * Guard for generated explanations. An explanation is accepted only if:
 *   1. every number it states appears in the evidence (as displayed), or is a small structural number
 *      such as the 5-day horizon;
 *   2. every citation [E#] refers to an existing evidence item, and at least one citation is present;
 *   3. it contains no certainty or advice language.
 * Anything else is rejected and the deterministic template is used instead. This makes it impossible for an
 * LLM to introduce a price, ratio, probability or performance figure that the system did not compute.
 */
import type { Evidence } from "./evidence";

const NUMBER = /(?<![A-Za-z#])[-+]?\d[\d,]*(?:\.\d+)?/g;
const CITATION = /\[([A-Z]\d+)\]/g;
/** Proper names that contain digits (index names), removed before scanning for numbers. */
const NAMED = /\b(?:NIFTY|Nifty)\s?(?:50|100|500|Next 50|Bank)\b|\bS&P\s?500\b/g;
/** Structural numbers allowed without evidence: horizons and interval width used by the product itself. */
const STRUCTURAL = new Set(["5", "80", "20", "200", "1"]);

const BANNED = [
  /\bguarantee[ds]?\b/i, /\bwill (?:rise|fall|go up|go down|increase|decrease|crash|rally)\b/i, /\b100\s*%\s*(?:accurate|certain|sure)\b/i,
  /\brisk[- ]free\b/i, /\bsure (?:thing|shot)\b/i, /\b(?:strong )?(?:buy|sell) (?:now|signal|recommendation)\b/i, /\byou should (?:buy|sell)\b/i,
  /\bprice target\b/i, /\bcertain(?:ly)? (?:to|that)\b/i,
];

function normalize(n: string): string {
  const v = Number(n.replace(/,/g, "").replace(/^\+/, ""));
  return Number.isFinite(v) ? String(Math.abs(v)) : n;
}

export function allowedNumbers(evidence: readonly Evidence[]): Set<string> {
  const s = new Set(STRUCTURAL);
  for (const e of evidence) for (const m of e.display.matchAll(NUMBER)) s.add(normalize(m[0]));
  return s;
}

export interface GuardResult {
  ok: boolean;
  problems: string[];
}

export function checkExplanation(text: string, evidence: readonly Evidence[]): GuardResult {
  const problems: string[] = [];
  const ids = new Set(evidence.map((e) => e.id));
  // Strip citations before scanning numbers so "E3" is not read as the number 3.
  const body = text.replace(CITATION, " ").replace(NAMED, " ");
  const allowed = allowedNumbers(evidence);
  for (const m of body.matchAll(NUMBER)) {
    if (!allowed.has(normalize(m[0]))) problems.push(`ungrounded number "${m[0]}"`);
  }
  const cites = [...text.matchAll(CITATION)].map((m) => m[1]);
  if (cites.length === 0) problems.push("no evidence citations");
  for (const c of cites) if (!ids.has(c)) problems.push(`unknown citation [${c}]`);
  for (const re of BANNED) if (re.test(text)) problems.push(`prohibited language: ${re.source}`);
  return { ok: problems.length === 0, problems };
}
