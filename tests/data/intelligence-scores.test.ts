import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ callClaude: vi.fn(), callOllama: vi.fn() }));
vi.mock("yahoo-finance2", () => ({
  default: class {
    async quote() { return { regularMarketPrice: 100, regularMarketChangePercent: 1.2, fiftyTwoWeekHigh: 120, fiftyTwoWeekLow: 80, trailingPE: 22 }; }
    async quoteSummary() { return { assetProfile: { sector: "Technology" }, financialData: { returnOnEquity: 0.2, profitMargins: 0.15 }, defaultKeyStatistics: {}, summaryDetail: {} }; }
  },
}));
vi.mock("@/lib/services/newsAggregator", () => ({ getStockNews: async () => [] }));
vi.mock("@/lib/services/socialSentiment", () => ({ getSocialSentiment: async () => null }));
vi.mock("@/lib/ai/ollamaClient", () => ({ callOllama: m.callOllama }));
vi.mock("@/lib/services/claudeService", async (orig) => ({ ...(await orig<typeof import("@/lib/services/claudeService")>()), callClaude: m.callClaude }));

import { generateIntelligence } from "@/lib/services/intelligenceEngine";
import { buildInstitutionalPrompt } from "@/lib/services/promptBuilder";

const llmReport = JSON.stringify({
  ticker: "TCS", companyName: "TCS", sector: "IT", events: [],
  scores: { technical: 99, fundamental: 99, momentum: 99, institutional: 99, riskReward: 99, smartMoney: 99, volatility: 99, ltInvestment: 99, swingTrade: 99 },
});

describe("intelligence report scores", () => {
  beforeEach(() => { vi.stubEnv("ANTHROPIC_API_KEY", "test"); m.callOllama.mockResolvedValue(null); m.callClaude.mockResolvedValue(llmReport); });
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

  it("always shows the rule scores, never scores written by the LLM", async () => {
    const withLlm = await generateIntelligence("TCS");
    expect(m.callClaude).toHaveBeenCalled();
    expect(Object.values(withLlm.scores)).not.toContain(99);
    m.callClaude.mockResolvedValue(null);
    const rulesOnly = await generateIntelligence("TCS");
    expect(withLlm.scores).toEqual(rulesOnly.scores);
  });

  it("the institutional prompt no longer asks the model for scores", () => {
    const p = buildInstitutionalPrompt({ ticker: "TCS", quote: null, summary: null, news: [], sentiment: null });
    expect(p).not.toMatch(/"scores"\s*:/);
    expect(p).toMatch(/DO NOT OUTPUT SCORES OR RATINGS/);
  });
});
