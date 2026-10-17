import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createPasswordResetToken: vi.fn(),
  sendEmail: vi.fn(),
}));
vi.mock("@/lib/auth/tokens", () => ({ createPasswordResetToken: mocks.createPasswordResetToken }));
vi.mock("@/lib/email/send", () => ({ sendEmail: mocks.sendEmail }));

import { POST } from "@/app/api/auth/forgot-password/route";
import { MemoryBackend, setRateLimitBackend } from "@/lib/ratelimit/limiter";

const call = (body: unknown) =>
  POST(
    new NextRequest("https://example.test/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  setRateLimitBackend(new MemoryBackend());
  process.env.APP_URL = "https://app.example.test";
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/auth/forgot-password", () => {
  it("is rate limited per address and per IP", async () => {
    mocks.createPasswordResetToken.mockResolvedValue(null);
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) statuses.push((await call({ email: "flood@example.com" })).status);
    expect(statuses.slice(0, 5).every((s) => s === 200)).toBe(true);
    expect(statuses.slice(5).every((s) => s === 429)).toBe(true);
  });

  it("rejects malformed requests", async () => {
    expect((await call("not json")).status).toBe(400);
    expect((await call({ email: "nope" })).status).toBe(400);
    expect(mocks.createPasswordResetToken).not.toHaveBeenCalled();
  });

  it("returns the same response for unknown and known accounts (no enumeration)", async () => {
    mocks.createPasswordResetToken.mockResolvedValueOnce(null);
    const unknown = await call({ email: "ghost@example.com" });

    mocks.createPasswordResetToken.mockResolvedValueOnce({ token: "tok", email: "a@b.co", name: "A" });
    mocks.sendEmail.mockResolvedValue(undefined);
    const known = await call({ email: "a@b.co" });

    expect(unknown.status).toBe(200);
    expect(known.status).toBe(200);
    expect(await unknown.json()).toEqual(await known.json());
  });

  it("emails a reset link containing the raw token to the account", async () => {
    mocks.createPasswordResetToken.mockResolvedValue({ token: "abc123", email: "a@b.co", name: null });
    mocks.sendEmail.mockResolvedValue(undefined);
    await call({ email: "  A@B.co " });

    expect(mocks.createPasswordResetToken).toHaveBeenCalledWith("a@b.co");
    const message = mocks.sendEmail.mock.calls[0][0];
    expect(message.to).toBe("a@b.co");
    expect(message.text).toContain("https://app.example.test/auth/reset-password?token=abc123");
  });

  it("does not reveal delivery failures to the caller", async () => {
    mocks.createPasswordResetToken.mockResolvedValue({ token: "t", email: "a@b.co", name: null });
    mocks.sendEmail.mockRejectedValue(new Error("provider down"));
    const res = await call({ email: "a@b.co" });
    expect(res.status).toBe(200);
  });
});
