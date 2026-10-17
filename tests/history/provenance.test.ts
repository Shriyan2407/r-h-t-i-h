import { describe, expect, it } from "vitest";
import { historyProvenance } from "@/lib/history/provenance";

describe("history provenance", () => {
  it("never presents generated content as verified", () => {
    for (const s of ["hardcoded", "ai-generated", "sector-playbook", "fallback", undefined] as const) {
      const p = historyProvenance(s);
      expect(p.label.length).toBeGreaterThan(0);
      expect(`${p.label} ${p.detail}`).not.toMatch(/\bverified history\b|\blive\b|\bguaranteed\b/i);
    }
  });
  it("flags AI and template sources for a visible caution banner", () => {
    expect(historyProvenance("ai-generated").level).toBe("caution");
    expect(historyProvenance("sector-playbook").level).toBe("caution");
    expect(historyProvenance(undefined).level).toBe("caution");
    expect(historyProvenance("ai-generated").label).toMatch(/not fact-checked/);
  });
});
