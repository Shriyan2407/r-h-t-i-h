import { beforeEach, describe, expect, it, vi } from "vitest";
import { synthBars } from "../ml/synth";

const m = vi.hoisted(() => ({ auth: vi.fn(), bars: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/backtest/data", () => ({ fetchDailyBars: m.bars }));

import { POST } from "@/app/api/backtest/walk-forward/route";
import { GET as evaluation } from "@/app/api/ml/evaluation/route";
import { MemoryBackend, setRateLimitBackend } from "@/lib/ratelimit/limiter";

const post = (body: unknown) => POST(new Request("https://x.test/api/backtest/walk-forward", { method: "POST", body: JSON.stringify(body) }));

describe("POST /api/backtest/walk-forward", () => {
  beforeEach(() => {
    setRateLimitBackend(new MemoryBackend());
    m.auth.mockResolvedValue({ user: { id: "u1" } });
    m.bars.mockResolvedValue({ symbol: "TCS.NS", bars: synthBars(900, 5) });
  });

  it("requires a session", async () => {
    m.auth.mockResolvedValue(null);
    expect((await post({ ticker: "TCS" })).status).toBe(401);
  });

  it.each([{ ticker: "../x" }, { ticker: "TCS", trainBars: 50 }, { ticker: "TCS", trainBars: 200, testBars: 220 }, { ticker: "TCS", years: 40 }])(
    "rejects invalid input %j",
    async (b) => expect((await post(b)).status).toBe(400),
  );

  it("returns chained out-of-sample folds whose test windows never precede training", async () => {
    const res = await post({ ticker: "TCS", years: 5, trainBars: 250, testBars: 63 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe("WALK_FORWARD_RESULT");
    expect(body.folds.length).toBe(Math.floor((900 - 250) / 63));
    for (const f of body.folds) expect(f.testStart > f.trainEnd).toBe(true);
    const dates = body.equity.map((p: { date: string }) => p.date);
    expect(new Set(dates).size).toBe(dates.length);
    expect([...dates].sort()).toEqual(dates);
    expect(body.equity[0].equity).toBe(1_000_000);
  });

  it("returns 422 when history is too short", async () => {
    m.bars.mockResolvedValue({ symbol: "X.NS", bars: synthBars(200, 1) });
    expect((await post({ ticker: "X" })).status).toBe(422);
  });
});

describe("GET /api/ml/evaluation", () => {
  it("publishes rejected direction models alongside the deployed volatility model", async () => {
    const body = await (await evaluation()).json();
    expect(body.direction.verdict).toBe("REJECTED");
    expect(body.volatility.verdict).toBe("DEPLOYED");
    expect(body.direction.targets).toHaveLength(2);
    const ml = body.direction.targets[0].rows.filter((r: { kind: string }) => r.kind === "ml");
    expect(ml.length).toBe(3);
    for (const r of ml) expect(r.rocAuc).toBeLessThan(0.52);
    expect(body.registry.some((x: { status: string }) => x.status === "rejected")).toBe(true);
  });
});
