import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({ default: class { beta = { messages: { create } }; } }));

import { explainRisk } from "@/lib/ai/riskExplainer";
import { buildRiskForecast } from "@/lib/ml/riskForecast";
import { synthMarket } from "../ml/synth";

const r = buildRiskForecast({ ticker: "TEST", symbol: "TEST.NS", ...synthMarket() });
if (!r.available) throw new Error("expected forecast");
const c = r.contract;
const e4 = c.evidence.find((e) => e.id === "E4")!.display;
const reply = (obj: unknown, stop = "end_turn") => ({ stop_reason: stop, content: [{ type: "text", text: JSON.stringify(obj) }] });

describe("risk explainer", () => {
  beforeEach(() => { create.mockReset(); vi.stubEnv("ANTHROPIC_API_KEY", "test-key"); });
  afterEach(() => vi.unstubAllEnvs());

  it("uses the template when no API key is configured (no network call)", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const out = await explainRisk(c, { useLlm: true });
    expect(out.source).toBe("template");
    expect(create).not.toHaveBeenCalled();
  });

  it("accepts a grounded LLM rewrite", async () => {
    create.mockResolvedValue(reply({
      why: `Expect daily swings near ${e4} over 5 days [E4].`, supports: "Recent volatility supports this [E2].",
      invalidates: "Surprise news could break the range [E5].", unknowns: "It does not read news or predict direction [E4].",
    }));
    const out = await explainRisk(c, { useLlm: true });
    expect(out.source).toBe("llm");
    expect(out.model).toBe("claude-opus-5-5");
    const req = create.mock.calls[0][0];
    expect(req.fallbacks).toBe("default");
    const sent = JSON.parse(req.messages[0].content);
    expect(Object.keys(sent).sort()).toEqual(["evidence", "horizonDays", "ticker"]); // only evidence is sent
    expect(Object.keys(sent.evidence[0]).sort()).toEqual(["display", "id", "kind", "label"]);
  });

  it("discards an LLM answer that invents a number and falls back to the template", async () => {
    create.mockResolvedValue(reply({
      why: "There is a 64.7% chance the stock rises [E4].", supports: "x [E2]", invalidates: "y [E5]", unknowns: "z [E4]",
    }));
    const out = await explainRisk(c, { useLlm: true });
    expect(out.source).toBe("template");
  });

  it("falls back on refusal, malformed JSON, or an API error", async () => {
    create.mockResolvedValueOnce(reply({}, "refusal"));
    expect((await explainRisk(c, { useLlm: true })).source).toBe("template");
    create.mockResolvedValueOnce({ stop_reason: "end_turn", content: [{ type: "text", text: "not json" }] });
    expect((await explainRisk(c, { useLlm: true })).source).toBe("template");
    create.mockRejectedValueOnce(new Error("503"));
    expect((await explainRisk(c, { useLlm: true })).source).toBe("template");
  });
});
