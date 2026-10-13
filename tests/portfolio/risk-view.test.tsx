import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PortfolioRiskView } from "@/components/portfolio/PortfolioRiskPanel";
import { buildPortfolioRisk } from "@/lib/portfolio/riskService";
import { synthBars, synthMarket } from "../ml/synth";

const m = synthMarket(700);
const bars: Record<string, ReturnType<typeof synthBars>> = { "AAA.NS": synthBars(700, 31), "BBB.NS": synthBars(700, 32) };

describe("PortfolioRiskView", async () => {
  const res = await buildPortfolioRisk(
    [
      { ticker: "AAA", quantity: 10, sector: "IT", exchange: "NSE" },
      { ticker: "BBB", quantity: 20, sector: "Banks", exchange: "NSE" },
      { ticker: "GONE", quantity: 1, sector: "Auto", exchange: "NSE" },
    ],
    async (s) => bars[s] ?? null,
    { index: m.index, vix: m.vix },
  );
  if ("error" in res) throw new Error("expected report");
  const html = renderToStaticMarkup(createElement(PortfolioRiskView, { data: res }));

  it("labels stress results as estimates and shows each scenario", () => {
    expect(html).toContain("estimates, not forecasts");
    for (const s of res.stress) expect(html).toContain(s.label);
  });

  it("lists excluded holdings with the reason instead of silently dropping them", () => {
    expect(html).toContain("GONE (insufficient price history)");
  });

  it("states conventions, the forecast method and that it is not advice", () => {
    for (const c of res.report.conventions) expect(html).toContain(c.replace(/'/g, "&#x27;"));
    expect(html).toContain("Not investment advice");
  });

  it("renders a correlation matrix with row and column headers", () => {
    expect(html).toContain('scope="row"');
    expect(html).toMatch(/Correlation \(1y daily returns\)/);
  });
});
