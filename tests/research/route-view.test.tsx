import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const m = vi.hoisted(() => ({ auth: vi.fn(), explainMove: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/research/service", () => ({ explainMove: m.explainMove }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }), useSearchParams: () => new URLSearchParams() }));

import { GET } from "@/app/api/research/move/[ticker]/route";
import { MoveView } from "@/components/research/MoveExplainer";
import { buildMoveAnswer } from "@/lib/research/move";
import { MemoryBackend, setRateLimitBackend } from "@/lib/ratelimit/limiter";
import type { Bar } from "@/lib/backtest/types";

const bars = (closes: number[]): Bar[] => closes.map((c, i) => ({ date: `2026-09-${String(i + 1).padStart(2, "0")}`, open: c, high: c, low: c, close: c, volume: 1000 }));
const answer = buildMoveAnswer({
  ticker: "TCS", symbol: "TCS.NS", stock: bars([...Array(24).fill(100), 102]), index: bars([...Array(24).fill(100), 101]),
  beta: 1, forecastDailyVol: 0.015, regime: "Uptrend",
  news: [{ title: "TCS signs deal", summary: "", url: "https://n.example/x", source: "Feed", publishedAt: "", ageHours: 3, relevance: 1, sentiment: "positive" }],
});
const call = (t: string) => GET(new Request(`https://x.test/api/research/move/${t}`), { params: Promise.resolve({ ticker: t }) });

describe("GET /api/research/move/[ticker]", () => {
  beforeEach(() => {
    setRateLimitBackend(new MemoryBackend());
    m.auth.mockResolvedValue({ user: { id: "u1" } });
    m.explainMove.mockResolvedValue({ available: true, result: { ...answer, answerSource: "template" } });
  });
  it("requires a session and a valid ticker", async () => {
    expect((await call("../x")).status).toBe(400);
    m.auth.mockResolvedValue(null);
    expect((await call("TCS")).status).toBe(401);
  });
  it("returns the explanation, and 404 when there is no data", async () => {
    const body = await (await call("tcs")).json();
    expect(body.schema).toBe("move-explanation/1");
    expect(m.explainMove).toHaveBeenCalledWith("TCS", { useLlm: false });
    m.explainMove.mockResolvedValue({ available: false, reason: "NO_DATA" });
    expect((await call("TCS")).status).toBe(404);
  });
  it("is rate limited", async () => {
    let last = 200;
    for (let i = 0; i < 31; i++) last = (await call("TCS")).status;
    expect(last).toBe(429);
  });
});

describe("MoveView", () => {
  const html = renderToStaticMarkup(createElement(MoveView, { data: { ...answer, answerSource: "template" } }));
  it("links every citation to an evidence row that exists", () => {
    const cites = [...html.matchAll(/href="#ev-([A-Z]\d+)"/g)].map((x) => x[1]);
    expect(cites.length).toBeGreaterThan(3);
    for (const c of cites) expect(html).toContain(`id="ev-${c}"`);
  });
  it("links headlines to their source and states the causation caveat", () => {
    expect(html).toContain('href="https://n.example/x"');
    expect(html).toContain("rel=\"noopener noreferrer\"");
    expect(html).toMatch(/do not prove that any of them caused the move/);
  });
});
