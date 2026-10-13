import { describe, expect, it } from "vitest";
import { NA, downsample, fmtInr, fmtPct, fmtRatio } from "@/lib/backtest/format";

describe("backtest formatting", () => {
  it("renders undefined metrics as n/a, never 0", () => {
    for (const v of [null, undefined, NaN, Infinity]) {
      expect(fmtPct(v)).toBe(NA);
      expect(fmtRatio(v)).toBe(NA);
      expect(fmtInr(v)).toBe(NA);
    }
  });
  it("formats real values, including a genuine zero", () => {
    expect(fmtPct(0.1234)).toBe("12.3%");
    expect(fmtPct(0)).toBe("0.0%");
    expect(fmtRatio(1.236)).toBe("1.24");
    expect(fmtInr(1000000)).toContain("10,00,000");
  });
  it("downsample keeps first and last points and respects the cap", () => {
    const pts = Array.from({ length: 1000 }, (_, i) => i);
    const out = downsample(pts, 100);
    expect(out).toHaveLength(100);
    expect(out[0]).toBe(0);
    expect(out.at(-1)).toBe(999);
    expect(downsample([1, 2, 3], 100)).toEqual([1, 2, 3]);
  });
});
