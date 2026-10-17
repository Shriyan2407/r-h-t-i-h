import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Regression tests for the "silent mock fallback" defect: when an API call failed,
 * lib/api.ts used to return generated sample data as if it were live market data.
 */

const loadApi = async (env: { NODE_ENV: string; NEXT_PUBLIC_DEMO_MODE?: string }) => {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", env.NODE_ENV);
  vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", env.NEXT_PUBLIC_DEMO_MODE ?? "");
  return import("@/lib/api");
};

const failingFetch = () => vi.fn().mockRejectedValue(new Error("network down"));
const htmlFetch = () =>
  vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => "<html>Application error</html>" });

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("failed requests are never disguised as data (default / production)", () => {
  it.each([
    ["getAIAnalysis", (api: typeof import("@/lib/api")) => api.getAIAnalysis("TCS")],
    ["getTechnicalIndicators", (api: typeof import("@/lib/api")) => api.getTechnicalIndicators("TCS")],
    ["getFundamentals", (api: typeof import("@/lib/api")) => api.getFundamentals("TCS")],
    ["getNews", (api: typeof import("@/lib/api")) => api.getNews("TCS")],
    ["searchStocks", (api: typeof import("@/lib/api")) => api.searchStocks("tcs")],
    ["getStockQuote", (api: typeof import("@/lib/api")) => api.getStockQuote("TCS")],
  ])("%s rejects when the network fails", async (_name, call) => {
    vi.stubGlobal("fetch", failingFetch());
    const api = await loadApi({ NODE_ENV: "test" });
    await expect(call(api)).rejects.toThrow();
  });

  it("rejects when the server answers with an HTML error page", async () => {
    vi.stubGlobal("fetch", htmlFetch());
    const api = await loadApi({ NODE_ENV: "test" });
    await expect(api.getAIAnalysis("TCS")).rejects.toThrow(/HTML/);
  });

  it("demo mode flag alone is ignored in a PRODUCTION build", async () => {
    vi.stubGlobal("fetch", failingFetch());
    const api = await loadApi({ NODE_ENV: "production", NEXT_PUBLIC_DEMO_MODE: "true" });
    await expect(api.getAIAnalysis("TCS")).rejects.toThrow();
    await expect(api.getNews("TCS")).rejects.toThrow();
  });
});

describe("explicit demo mode (development only)", () => {
  it("returns labelled sample data only when NEXT_PUBLIC_DEMO_MODE=true outside production", async () => {
    vi.stubGlobal("fetch", failingFetch());
    const api = await loadApi({ NODE_ENV: "development", NEXT_PUBLIC_DEMO_MODE: "true" });
    const news = await api.getNews("TCS");
    expect(Array.isArray(news)).toBe(true);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("[API][demo]"), expect.anything());
  });

  it("still prefers real data when the request succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ items: [] }) }),
    );
    const api = await loadApi({ NODE_ENV: "development", NEXT_PUBLIC_DEMO_MODE: "true" });
    expect(await api.getNews("TCS")).toEqual([]);
    expect(console.warn).not.toHaveBeenCalled();
  });
});

describe("DEMO_MODE constant", () => {
  it.each([
    ["production", "true", false],
    ["production", "false", false],
    ["development", "true", true],
    ["development", "", false],
    ["test", "true", true],
    ["test", "false", false],
  ])("NODE_ENV=%s NEXT_PUBLIC_DEMO_MODE=%j -> %s", async (nodeEnv, flag, expected) => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", nodeEnv);
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", flag);
    const { DEMO_MODE } = await import("@/lib/config/demo");
    expect(DEMO_MODE).toBe(expected);
  });
});
