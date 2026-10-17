import { beforeEach, describe, expect, it, vi } from "vitest";
import { loaders } from "./fixtures";

const m = vi.hoisted(() => ({ auth: vi.fn(), findUnique: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/auth/prisma", () => ({ prisma: { portfolio: { findUnique: m.findUnique } } }));
vi.mock("@/lib/agents/loaders", () => ({
  productionLoaders: (holdings: () => Promise<unknown>) => ({ ...loaders(), holdings }),
}));

import { POST } from "@/app/api/agents/committee/route";
import { MemoryBackend, setRateLimitBackend } from "@/lib/ratelimit/limiter";

const post = (body: unknown) => POST(new Request("https://x.test/api/agents/committee", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));

describe("POST /api/agents/committee", () => {
  beforeEach(() => {
    setRateLimitBackend(new MemoryBackend());
    m.auth.mockResolvedValue({ user: { id: "u1" } });
    m.findUnique.mockResolvedValue(null);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("requires a session and fails closed without one", async () => {
    m.auth.mockResolvedValue(null);
    const res = await post({ query: "Should I buy TCS?" });
    expect(res.status).toBe(401);
  });

  it.each([{}, { query: "" }, { query: "hi" }, { query: 42 }, { query: "x".repeat(501) }, "not json"])("rejects invalid input %j", async (b) => {
    expect((await post(b)).status).toBe(400);
  });

  it("returns the committee result as JSON, never cached", async () => {
    const res = await post({ query: "Should I buy TCS?" });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const body = await res.json();
    expect(body.schema).toBe("committee/1");
    expect(body.integrity.ok).toBe(true);
    expect(body.memo.asset).toBe("TCS");
  });

  it("streams real progress events as NDJSON", async () => {
    const res = await post({ query: "Why did TCS fall today?", stream: true });
    expect(res.headers.get("content-type")).toMatch(/application\/x-ndjson/);
    const lines = (await res.text()).trim().split("\n").map((l) => JSON.parse(l));
    expect(lines[0].type).toBe("plan");
    expect(lines.filter((l) => l.type === "agent_finished")).toHaveLength(4);
    expect(lines.at(-1).type).toBe("result");
  });

  it("reads holdings only for the signed-in user", async () => {
    m.findUnique.mockResolvedValue({ holdings: [{ ticker: "TCS", quantity: 5, sector: "it", exchange: "NSE" }] });
    const res = await post({ query: "Review my portfolio" });
    expect(res.status).toBe(200);
    expect(m.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1" } }));
  });

  it("rate-limits per user", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 13; i++) statuses.push((await post({ query: "What is the market outlook?" })).status);
    expect(statuses.slice(0, 12).every((s) => s === 200)).toBe(true);
    expect(statuses[12]).toBe(429);
  });
});
