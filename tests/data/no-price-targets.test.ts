import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseIntelligenceResponse } from "@/lib/services/claudeService";
import { buildDeterministicReport } from "@/lib/services/deterministicIntelligence";
import { fmtStockAnalysis } from "@/lib/services/telegramService";

/**
 * No direction model passed validation (lib/ml/registry.json), so the product must not show entry, stop or
 * target price levels from any source: the LLM, the rule-based report, or Telegram.
 */
describe("no invented price targets", () => {
  it("strips entry/stop/target levels returned by an LLM", () => {
    const raw = JSON.stringify({
      ticker: "TCS", companyName: "TCS", sector: "IT", scores: {}, events: [],
      entryZone: { entry: "₹3,900", stopLoss: "₹3,700", target1: "₹4,300", target2: "₹4,700", riskReward: "1:2.5" },
    });
    const parsed = parseIntelligenceResponse(raw, "TCS");
    expect(parsed.entryZone).toBeUndefined();
  });

  it("the rule-based report contains no target or stop levels", () => {
    const quote = { regularMarketPrice: 1000, fiftyTwoWeekHigh: 1200, fiftyTwoWeekLow: 800, regularMarketChangePercent: 1 };
    const r = buildDeterministicReport("TEST", quote, null, [], null) as Record<string, unknown>;
    expect(r.entryZone).toBeUndefined();
    expect(JSON.stringify(r)).not.toMatch(/Swing target|stop loss|target1|1120|1,120/i);
  });

  it("the LLM prompts no longer ask for price targets", () => {
    const src = readFileSync(join(process.cwd(), "lib/services/promptBuilder.ts"), "utf8");
    expect(src).not.toMatch(/"entryZone"/);
    expect(src).not.toMatch(/price target \+ timeline|₹price target/);
  });

  it("Telegram analysis messages carry no levels and say why", () => {
    const msg = fmtStockAnalysis("TCS", { price: 3900, verdict: "HOLD", summary: "x" });
    expect(msg).not.toMatch(/T1|T2|Stop Loss|Confidence/);
    expect(msg).toMatch(/No price targets/);
  });
});
