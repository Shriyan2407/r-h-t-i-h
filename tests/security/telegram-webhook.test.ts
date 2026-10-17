import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/telegram/webhook/route";

const SECRET = "test-webhook-secret";
const url = "https://example.test/api/telegram/webhook";

const call = (headers: Record<string, string>, body: unknown) =>
  POST(
    new NextRequest(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

describe("POST /api/telegram/webhook authentication", () => {
  const original = process.env.TELEGRAM_WEBHOOK_SECRET;
  beforeEach(() => {
    process.env.TELEGRAM_WEBHOOK_SECRET = SECRET;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.TELEGRAM_WEBHOOK_SECRET;
    else process.env.TELEGRAM_WEBHOOK_SECRET = original;
  });

  it("returns 503 when the secret is not configured (fails closed)", async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    const res = await call({}, { message: { text: "/help", chat: { id: 1 } } });
    expect(res.status).toBe(503);
  });

  it("returns 401 when the header is missing or wrong", async () => {
    expect((await call({}, {})).status).toBe(401);
    const wrong = await call({ "x-telegram-bot-api-secret-token": "nope" }, {});
    expect(wrong.status).toBe(401);
  });

  it("acknowledges malformed payloads without processing them", async () => {
    const headers = { "x-telegram-bot-api-secret-token": SECRET };
    expect((await call(headers, "not json")).status).toBe(200);
    expect((await call(headers, { message: { chat: { id: "x" } } })).status).toBe(200);
    expect((await call(headers, { no: "message" })).status).toBe(200);
  });
});
