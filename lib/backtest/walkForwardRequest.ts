import { z } from "zod";
import { TICKER_PATTERN } from "@/lib/validation/ticker";

/** Live strategy walk-forward. Windows are in trading days; bounds stop one call from becoming a compute DoS. */
export const walkForwardRequestSchema = z
  .object({
    ticker: z.string().trim().toUpperCase().regex(TICKER_PATTERN, "Invalid ticker symbol"),
    years: z.number().int().min(3).max(10).default(5),
    trainBars: z.number().int().min(120).max(1000).default(250),
    testBars: z.number().int().min(20).max(250).default(63),
    initialCapital: z.number().min(10_000).max(1_000_000_000).default(1_000_000),
    feeBps: z.number().min(0).max(100).default(10),
    slippageBps: z.number().min(0).max(200).default(5),
  })
  .refine((r) => r.testBars < r.trainBars, { message: "testBars must be smaller than trainBars", path: ["testBars"] });

export type WalkForwardRequest = z.infer<typeof walkForwardRequestSchema>;
