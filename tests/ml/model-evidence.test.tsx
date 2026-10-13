import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModelEvidence } from "@/components/models/ModelEvidence";
import { evaluationSummary } from "@/lib/ml/evaluation";

const data = evaluationSummary();
const html = renderToStaticMarkup(createElement(ModelEvidence, { data }));

describe("ModelEvidence page", () => {
  it("shows both verdicts and the production model id", () => {
    expect(html).toContain("DEPLOYED");
    expect(html).toContain("REJECTED");
    expect(html).toContain("volatility-ridge@1.1.0");
  });

  it("publishes every rejected and superseded model with its reason", () => {
    for (const m of data.registry.filter((x) => x.status !== "production")) {
      expect(html).toContain(`${m.id}@${m.version}`);
    }
    expect(html).toContain("collinear");
  });

  it("shows the recorded AUC for each direction model (no rounding up)", () => {
    for (const r of data.direction.targets[0].rows.filter((x) => x.kind === "ml")) {
      expect(html).toContain(`>${r.model}<`);
      expect(html).toContain(`>${r.rocAuc!.toFixed(3)}<`);
    }
  });

  it("includes the old rule baselines so the comparison with the previous product is visible", () => {
    expect(html).toContain("rule_rsi_meanreversion");
    expect(html).toContain("rule_trend_ema50");
  });

  it("uses scoped table headers", () => {
    expect((html.match(/<th scope="col"/g) ?? []).length).toBeGreaterThan(20);
  });
});
