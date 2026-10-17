/**
 * NSE/BSE symbols: uppercase letters, digits, '&' (M&M) and '-' (BAJAJ-AUTO), 1-20 chars.
 * Anything else is rejected before it reaches Yahoo, a cache key, a prompt or a log line.
 */
export const TICKER_PATTERN = /^[A-Z0-9&-]{1,20}$/;

/**
 * Normalise a user-supplied symbol (trims, upper-cases, strips a trailing .NS/.BO/.NSE/.BSE)
 * and validate it. Returns null when the input is not a plausible Indian-equity symbol.
 */
export function parseTicker(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().toUpperCase().replace(/\.(NS|BO|NSE|BSE)$/, "");
  return TICKER_PATTERN.test(cleaned) ? cleaned : null;
}

export function invalidTickerResponse(): Response {
  return Response.json({ error: "Invalid ticker symbol", code: "INVALID_TICKER" }, { status: 400 });
}
