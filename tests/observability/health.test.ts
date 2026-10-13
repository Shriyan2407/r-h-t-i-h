import { describe, expect, it } from "vitest";
import { deepHealth, publicHealth } from "@/lib/observability/health";

const ok = async () => {};
const boom = async () => {
  throw new Error("connect ECONNREFUSED 10.0.0.5:5432 password=hunter2");
};

describe("publicHealth", () => {
  it("is ok when the database answers", async () => {
    const h = await publicHealth({ database: ok });
    expect(h.status).toBe("ok");
    expect(h.checks).toEqual({ database: "ok" });
  });

  it("is degraded when the database fails, without leaking the error", async () => {
    const h = await publicHealth({ database: boom });
    expect(h.status).toBe("degraded");
    expect(JSON.stringify(h)).not.toMatch(/ECONNREFUSED|hunter2|10\.0\.0\.5/);
  });

  it("times out a hung database instead of hanging the monitor", async () => {
    const hang = () => new Promise<void>(() => {});
    const h = await publicHealth({ database: hang }, 20);
    expect(h.checks.database).toBe("down");
  });
});

describe("deepHealth", () => {
  const env = {} as NodeJS.ProcessEnv;

  it("reports unconfigured optional services honestly and stays ok", async () => {
    const h = await deepHealth({ database: ok, yahoo: async () => true }, env);
    expect(h.status).toBe("ok");
    expect(h.checks.ai).toBe("not_configured");
    expect(h.checks.sharedCache).toBe("not_configured");
    expect(h.checks.rateLimit).toBe("not_configured");
  });

  it("recognises configured AI and Redis", async () => {
    const h = await deepHealth(
      { database: ok, yahoo: async () => true },
      { ANTHROPIC_API_KEY: "k", UPSTASH_REDIS_REST_URL: "https://r", UPSTASH_REDIS_REST_TOKEN: "t" } as unknown as NodeJS.ProcessEnv,
    );
    expect(h.checks.ai).toBe("ok");
    expect(h.checks.sharedCache).toBe("ok");
  });

  it("degrades when market data is empty or failing", async () => {
    expect((await deepHealth({ database: ok, yahoo: async () => false }, env)).checks.marketData).toBe("degraded");
    const down = await deepHealth({ database: ok, yahoo: boom as never }, env);
    expect(down.checks.marketData).toBe("down");
    expect(down.status).toBe("degraded");
  });
});
