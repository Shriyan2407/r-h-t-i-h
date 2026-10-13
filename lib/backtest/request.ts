import { z } from "zod";
import { STRATEGY_IDS } from "./strategies";
import { TICKER_PATTERN } from "@/lib/validation/ticker";

/** Bounds keep one request from becoming a compute or upstream-data abuse vector. */
export const backtestRequestSchema = z.object({
  ticker: z
    .string()
    .trim()
    .toUpperCase()
    .regex(TICKER_PATTERN, "Invalid ticker symbol"),
  strategy: z.enum(STRATEGY_IDS),
  years: z.number().int().min(1).max(10).default(3),
  initialCapital: z.number().min(10_000).max(1_000_000_000).default(1_000_000),
  feeBps: z.number().min(0).max(100).default(10),
  slippageBps: z.number().min(0).max(200).default(5),
});

export type BacktestRequest = z.infer<typeof backtestRequestSchema>;
