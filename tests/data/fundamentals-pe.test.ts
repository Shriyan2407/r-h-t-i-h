import { describe, expect, it, vi } from "vitest";

vi.mock("yahoo-finance2", () => ({
  default: class {
    async quoteSummary() {
      return { financialData: {}, defaultKeyStatistics: { forwardPE: 21.456 }, summaryDetail: {} };
    }
  },
}));

describe("fetchFundamentals P/E", () => {
  it("does not report a forward P/E as the trailing P/E", async () => {
    const { fetchFundamentals } = await import("@/lib/services/fundamentals");
    const f = await fetchFundamentals("TCS");
    expect(f.pe_ratio).toBeNull();
    expect(f.forward_pe).toBe(21.46);
  });
});
