import { describe, expect, it } from "vitest";
import { checkExplanation, allowedNumbers } from "@/lib/ai/numericGuard";
import type { Evidence } from "@/lib/ai/evidence";

const ev: Evidence[] = [
  { id: "E1", kind: "ml_model", label: "Forecast daily volatility", value: 0.0182, display: "1.8%", source: "volatility-ridge@1.1.0", asOf: "2026-10-09" },
  { id: "E2", kind: "market_data", label: "India VIX", value: 13.42, display: "13.42", source: "Yahoo Finance ^INDIAVIX", asOf: "2026-10-09" },
  { id: "E3", kind: "statistical_model", label: "Market regime", value: "Calm uptrend", display: "Calm uptrend", source: "regimes.json", asOf: "2026-10-09" },
];

describe("numeric guard", () => {
  it("accepts text whose numbers all come from the evidence and which cites it", () => {
    const r = checkExplanation("Expected daily moves are around 1.8% [E1], with India VIX at 13.42 [E2] in a Calm uptrend [E3] over the next 5 days.", ev);
    expect(r).toEqual({ ok: true, problems: [] });
  });

  it("rejects an invented price, probability or return", () => {
    expect(checkExplanation("The stock trades at 2,950 [E1].", ev).problems.join()).toMatch(/ungrounded number "2,950"/);
    expect(checkExplanation("There is a 64.7% chance of gains [E1].", ev).ok).toBe(false);
    expect(checkExplanation("Analysts expect 12% upside [E1].", ev).ok).toBe(false);
  });

  it("rejects missing or fabricated citations", () => {
    expect(checkExplanation("Volatility is about 1.8%.", ev).problems).toContain("no evidence citations");
    expect(checkExplanation("Volatility is about 1.8% [E9].", ev).problems.join()).toMatch(/unknown citation \[E9\]/);
  });

  it("does not treat citation ids as numbers", () => {
    expect(checkExplanation("See [E3] and [E2].", ev).ok).toBe(true);
  });

  it.each([
    "This is guaranteed to hold [E1].",
    "The stock will rise next week [E1].",
    "Our model is 100% accurate [E1].",
    "A risk-free setup [E1].",
    "Strong buy signal [E1].",
    "You should buy this [E1].",
    "Our price target [E1].",
  ])("rejects certainty/advice language: %s", (t) => {
    expect(checkExplanation(t, ev).ok).toBe(false);
  });

  it("allows only small structural numbers without evidence", () => {
    const a = allowedNumbers(ev);
    expect(a.has("5")).toBe(true);
    expect(a.has("1.8")).toBe(true);
    expect(a.has("13.42")).toBe(true);
    expect(a.has("7")).toBe(false);
  });
});

describe("numeric guard: names and id formats", () => {
  it("treats index names as names, not figures", () => {
    expect(checkExplanation("NIFTY 50 is calm [E3].", ev).ok).toBe(true);
    expect(checkExplanation("The S&P 500 fell [E3].", ev).ok).toBe(true);
  });
  it("still rejects a standalone invented 50", () => {
    expect(checkExplanation("There is a 50% chance [E1].", ev).ok).toBe(false);
  });
  it("accepts any letter-prefixed evidence id that exists", () => {
    const mv: Evidence[] = [{ id: "M1", kind: "market_data", label: "x", value: 1, display: "+1.20%", source: "s", asOf: null }];
    expect(checkExplanation("Up 1.20% [M1].", mv).ok).toBe(true);
    expect(checkExplanation("Up 1.20% [N9].", mv).problems.join()).toMatch(/unknown citation \[N9\]/);
  });
});

