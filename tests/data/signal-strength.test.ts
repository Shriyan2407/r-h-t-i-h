import { describe, it, expect } from "vitest";
import { computeSignalStrength, computeQuantScore, buildQuantSummary } from "@/lib/scoring/quantEngine";
import { parseIntelligenceResponse } from "@/lib/services/claudeService";
import { buildDeterministicReport } from "@/lib/services/deterministicIntelligence";
import type { TechnicalIndicators, FundamentalData } from "@/lib/types";

describe("computeSignalStrength", () => {
  it.each([
    [0, 0, 0], // nothing fired: no strength, NOT a default like 55 or 65
    [4, 0, 100], // unanimous
    [0, 5, 100],
    [3, 3, 0], // perfectly split
    [3, 1, 50],
    [1, 3, 50],
    [9, 1, 80],
  ])("bullish=%i bearish=%i -> %i", (bull, bear, expected) => {
    expect(computeSignalStrength(bull, bear)).toBe(expected);
  });

  it("stays within 0-100 for any non-negative counts", () => {
    for (let b = 0; b <= 20; b++) {
      for (let r = 0; r <= 20; r++) {
        const v = computeSignalStrength(b, r);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });

  it("is not clamped into a flattering band: weak evidence reads as weak", () => {
    expect(computeSignalStrength(2, 2)).toBeLessThan(10);
  });
});

const tech = (over: Partial<TechnicalIndicators> = {}): TechnicalIndicators =>
  ({
    rsi_14: 50, macd: 0, macd_signal: 0, macd_histogram: 0,
    ema_20: 100, ema_50: 100, ema_200: 100,
    bb_upper: 110, bb_middle: 100, bb_lower: 90, atr_14: 2, obv: 0, adx: 20,
    stoch_k: 50, stoch_d: 50, vwap: 100, support_levels: [], resistance_levels: [],
    trend: "SIDEWAYS", trend_strength: "WEAK", ...over,
  }) as TechnicalIndicators;

const fund = (over: Partial<FundamentalData> = {}): FundamentalData =>
  ({
    pe_ratio: null, pb_ratio: null, ps_ratio: null, ev_ebitda: null, sector_pe: null,
    roe: null, roce: null, roa: null, net_margin: null, operating_margin: null, gross_margin: null,
    revenue_growth_yoy: null, profit_growth_yoy: null, eps_growth_3yr: null,
    debt_to_equity: null, current_ratio: null, quick_ratio: null, interest_coverage: null,
    free_cash_flow: null, promoter_holding: null, fii_holding: null, dii_holding: null, pledged_shares: null,
    ...over,
  }) as FundamentalData;

describe("computeQuantScore", () => {
  it("exposes signalStrength and no longer exposes a 'confidence' field", () => {
    const score = computeQuantScore(tech({ rsi_14: 25, trend: "UPTREND" }), fund({ pe_ratio: 12, roe: 25 }), 120, 150, 90);
    expect(score).toHaveProperty("signalStrength");
    expect(score).not.toHaveProperty("confidence");
    expect(score.signalStrength).toBe(
      computeSignalStrength(score.signals.bullish.length, score.signals.bearish.length),
    );
  });

  it("the LLM prompt summary states that signal strength is not a probability", () => {
    const score = computeQuantScore(tech(), fund(), 100, 120, 80);
    const summary = buildQuantSummary(score, 100, "TCS");
    expect(summary).toContain("not a probability");
    expect(summary).not.toMatch(/confidence \d+%/i);
  });
});

describe("LLM-supplied confidence is never shown", () => {
  const llmReport = (extra: Record<string, unknown>) =>
    JSON.stringify({
      ticker: "TCS", companyName: "TCS", sector: "IT",
      scores: { technical: 70 }, events: [], ...extra,
    });

  it("discards aiConfidence from model output instead of clamping it into 60-95", () => {
    for (const claimed of [5, 40, 75, 99, undefined]) {
      const parsed = parseIntelligenceResponse(llmReport({ aiConfidence: claimed }), "TCS");
      expect(parsed).not.toHaveProperty("aiConfidence");
    }
  });

  it("does not add a default confidence when the model omits one", () => {
    const parsed = parseIntelligenceResponse(llmReport({}), "TCS");
    expect(parsed.aiConfidence).toBeUndefined();
  });
});

describe("deterministic intelligence report", () => {
  it("contains no invented confidence figure", () => {
    const report = buildDeterministicReport("TCS", null, null, [], null);
    expect(report).not.toHaveProperty("aiConfidence");
    expect(JSON.stringify(report)).not.toMatch(/"aiConfidence"/);
  });
});
