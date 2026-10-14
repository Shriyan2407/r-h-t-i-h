import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RiskView, type Payload } from "@/components/analysis/RiskIntelligencePanel";
import { buildRiskForecast } from "@/lib/ml/riskForecast";
import { templateExplanation } from "@/lib/ai/riskExplainer";
import { synthMarket } from "./synth";

const m = synthMarket();
const r = buildRiskForecast({ ticker: "TEST", symbol: "TEST.NS", ...m }, new Date(Date.parse(m.stock.at(-1)!.date) + 86400000));
if (!r.available) throw new Error("expected forecast");
const data: Payload = { ...r.contract, explanation: templateExplanation(r.contract) };
const html = (d: Payload) => renderToStaticMarkup(createElement(RiskView, { data: d }));

describe("RiskView", () => {
  const out = html(data);

  it("shows the forecast, the model version and that direction is not predicted", () => {
    expect(out).toContain((data.volatility.dailyVol * 100).toFixed(2) + "%");
    expect(out).toContain(`${data.model.id}@${data.model.version}`);
    expect(out).toContain("Not predicted");
  });

  it("lists every evidence item with its layer label and all disclaimers", () => {
    for (const e of data.evidence) expect(out).toContain(`>${e.id}<`);
    expect(out).toContain("ML model");
    expect(out).toContain("Market data");
    for (const d of data.disclaimers) expect(out).toContain(d.replace(/'/g, "&#x27;"));
  });

  it("discloses the non-pristine holdout", () => {
    expect(out).toMatch(/not a pristine holdout/);
  });

  it("has a collapsed Why? control wired for assistive tech", () => {
    expect(out).toMatch(/aria-expanded="false"[^>]*aria-controls="risk-why"|aria-controls="risk-why"[^>]*aria-expanded="false"/);
    expect(out).not.toContain('id="risk-why"');
  });

  it("warns when data is stale", () => {
    expect(out).not.toContain("days old");
    expect(html({ ...data, stale: true, dataAgeDays: 9 })).toContain("Data is 9 days old");
  });

  it("contains no certainty or advice language (outside the negated disclaimer)", () => {
    const matches = out.match(/[^.>]*\b(?:guarantee|will rise|will fall|strong buy|risk-free|100% accurate)[^.<]*/gi) ?? [];
    expect(matches).toEqual(["Past model performance does not guarantee future performance"]);
  });
});

describe("RiskView live move signal", () => {
  it("relates today's move to the expected daily move and flags unusual moves", () => {
    const big = (data.volatility.dailyVol * 100 * 3);
    const html = renderToStaticMarkup(createElement(RiskView, { data, liveChangePct: big }));
    expect(html).toMatch(/3\.0× the expected daily move/);
    expect(html).toContain("unusually large");
    const small = renderToStaticMarkup(createElement(RiskView, { data, liveChangePct: data.volatility.dailyVol * 50 }));
    expect(small).toMatch(/0\.5× the expected daily move\./);
    expect(small).not.toContain("unusually large");
  });
  it("shows nothing without a live change", () => {
    expect(renderToStaticMarkup(createElement(RiskView, { data }))).not.toContain("expected daily move.");
  });
});
