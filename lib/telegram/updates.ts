import { z } from "zod";

/** Subset of the Telegram Bot API `Update` object this app consumes. */
export const telegramUpdateSchema = z
  .object({
    message: z
      .object({
        text: z.string().max(4096).optional(),
        chat: z.object({ id: z.number().int() }),
        from: z
          .object({
            first_name: z.string().max(256).optional(),
            username: z.string().max(64).optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .passthrough();

export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;

/** NSE/BSE symbols: letters, digits, '&' (M&M) and '-' (BAJAJ-AUTO), max 20 chars. */
export const TICKER_RE = /^[A-Z0-9&-]{1,20}$/;

/** Connect tokens are 16 random bytes, hex-encoded (see /api/telegram/connect). */
export const CONNECT_TOKEN_RE = /^[a-f0-9]{32}$/;

/** Extract and validate a connect token from `/start <token>`. */
export function parseStartToken(text: string): string | null {
  const token = text.split(/\s+/)[1]?.trim();
  return token && CONNECT_TOKEN_RE.test(token) ? token : null;
}

/** Recognise `/analyze TCS`, `analyze tcs`, or `TCS analysis` and return a valid ticker. */
export function parseAnalyzeCommand(text: string): string | null {
  const match =
    text.match(/^(?:\/analyze\s+|analyze\s+)([A-Z0-9&-]{1,20})\b/i) ??
    text.match(/^([A-Z]{2,10})\s+(?:analysis|analyze|report)\b/i);
  if (!match) return null;
  const ticker = match[1].toUpperCase();
  return TICKER_RE.test(ticker) ? ticker : null;
}
