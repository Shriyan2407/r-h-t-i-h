import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const m = vi.hoisted(() => ({
  prisma: { telegramConnection: { findUnique: vi.fn() } },
  getIntelligenceReport: vi.fn(),
  tgSend: vi.fn(),
}));

vi.mock("@/lib/auth/prisma", () => ({ prisma: m.prisma }));
vi.mock("@/lib/services/intelligenceEngine", () => ({ getIntelligenceReport: m.getIntelligenceReport }));
vi.mock("@/lib/services/telegramService", async (orig) => {
  const real = await orig<typeof import("@/lib/services/telegramService")>();
  return { ...real, tgSend: m.tgSend };
});

import { POST } from "@/app/api/telegram/webhook/route";
import { MemoryBackend, setRateLimitBackend } from "@/lib/ratelimit/limiter";

const SECRET = "analyze-flow-secret";
const send = (text: string, chatId = 777) =>
  POST(
    new NextRequest("https://example.test/api/telegram/webhook", {
      method: "POST",
      headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": SECRET },
      body: JSON.stringify({ message: { text, chat: { id: chatId }, from: { first_name: "A" } } }),
    }),
  );

const sent = () => m.tgSend.mock.calls.map((c) => String(c[1]));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TELEGRAM_WEBHOOK_SECRET = SECRET;
  setRateLimitBackend(new MemoryBackend());
  m.tgSend.mockResolvedValue({ ok: true });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("/analyze via the Telegram webhook", () => {
  it("refuses to run analysis for chats that are not linked to an account", async () => {
    m.prisma.telegramConnection.findUnique.mockResolvedValue(null);
    expect((await send("/analyze TCS")).status).toBe(200);
    expect(m.getIntelligenceReport).not.toHaveBeenCalled();
    expect(sent().join("\n")).toContain("Link your account");
  });

  it("refuses chats whose link is inactive", async () => {
    m.prisma.telegramConnection.findUnique.mockResolvedValue({ isActive: false });
    await send("/analyze TCS");
    expect(m.getIntelligenceReport).not.toHaveBeenCalled();
  });

  it("calls the engine in-process (no HTTP hop) for linked chats", async () => {
    m.prisma.telegramConnection.findUnique.mockResolvedValue({ isActive: true });
    m.getIntelligenceReport.mockResolvedValue({
      ticker: "TCS",
      currentSentiment: "BULLISH",
      oneLiner: "x",
      scores: { technical: 70, riskReward: 70, fundamental: 70 },
      _meta: { currentPrice: 4000 },
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await send("/analyze tcs");

    expect(m.getIntelligenceReport).toHaveBeenCalledWith("TCS");
    expect(fetchSpy).not.toHaveBeenCalled();
    const reply = sent().join("\n");
    expect(reply).toContain("TCS");
    expect(reply).toContain("BUY");
  });

  it("does not invent a confidence figure when the report has none", async () => {
    m.prisma.telegramConnection.findUnique.mockResolvedValue({ isActive: true });
    m.getIntelligenceReport.mockResolvedValue({ ticker: "TCS", _meta: { currentPrice: 1 } });
    await send("/analyze TCS");
    expect(sent().join("\n")).not.toContain("Confidence");
  });

  it("limits each chat to 10 analyses per hour", async () => {
    m.prisma.telegramConnection.findUnique.mockResolvedValue({ isActive: true });
    m.getIntelligenceReport.mockResolvedValue({ ticker: "TCS", _meta: { currentPrice: 1 } });
    for (let i = 0; i < 12; i++) await send("/analyze TCS", 4242);

    expect(m.getIntelligenceReport).toHaveBeenCalledTimes(10);
    expect(sent().join("\n")).toContain("hourly analysis limit");
  });

  it("limits chats independently", async () => {
    m.prisma.telegramConnection.findUnique.mockResolvedValue({ isActive: true });
    m.getIntelligenceReport.mockResolvedValue({ ticker: "TCS", _meta: { currentPrice: 1 } });
    for (let i = 0; i < 10; i++) await send("/analyze TCS", 1);
    await send("/analyze TCS", 2);
    expect(m.getIntelligenceReport).toHaveBeenCalledTimes(11);
  });

  it("reports a failure to the user without leaking internals", async () => {
    m.prisma.telegramConnection.findUnique.mockResolvedValue({ isActive: true });
    m.getIntelligenceReport.mockRejectedValue(new Error("secret db password in message"));
    await send("/analyze TCS");
    const reply = sent().join("\n");
    expect(reply).toContain("timed out");
    expect(reply).not.toContain("secret db password");
  });
});
