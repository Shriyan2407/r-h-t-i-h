import { z } from "zod";
import { parseTicker } from "./ticker";

/** Upper bounds are sanity limits, not market rules: they stop overflow and absurd values. */
const MAX_QUANTITY = 1_000_000_000;
const MAX_PRICE = 10_000_000;

export const MAX_HOLDINGS_PER_PORTFOLIO = 500;

const tickerField = z
  .string()
  .transform((v, ctx) => {
    const t = parseTicker(v);
    if (!t) ctx.addIssue({ code: "custom", message: "Invalid ticker symbol" });
    return t ?? z.NEVER;
  });

const quantity = z.number().finite().positive().max(MAX_QUANTITY);
const avgPrice = z.number().finite().positive().max(MAX_PRICE);

export const holdingCreateSchema = z
  .object({
    ticker: tickerField,
    name: z.string().trim().min(1).max(200),
    exchange: z.enum(["NSE", "BSE"]).default("NSE"),
    sector: z.string().trim().max(100).optional(),
    quantity,
    avgPrice,
    notes: z.string().trim().max(500).nullish(),
  });
// Unknown keys (the client also sends its local id/addedAt) are stripped, not rejected,
// so only the validated fields below can ever reach the database.

export const holdingUpdateSchema = z
  .object({
    quantity: quantity.optional(),
    avgPrice: avgPrice.optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

export const holdingIdSchema = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});
