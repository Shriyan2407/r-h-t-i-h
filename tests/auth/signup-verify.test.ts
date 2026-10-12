import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const m = vi.hoisted(() => ({
  prisma: { user: { create: vi.fn(), update: vi.fn() } },
  findUserByEmail: vi.fn(),
  createEmailVerificationToken: vi.fn(),
  consumeEmailVerificationToken: vi.fn(),
  hashPassword: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/auth/prisma", () => ({ prisma: m.prisma }));
vi.mock("@/lib/auth/users", () => ({ findUserByEmail: m.findUserByEmail }));
vi.mock("@/lib/auth/password", () => ({ hashPassword: m.hashPassword }));
vi.mock("@/lib/auth/tokens", () => ({
  createEmailVerificationToken: m.createEmailVerificationToken,
  consumeEmailVerificationToken: m.consumeEmailVerificationToken,
}));
vi.mock("@/lib/email/send", () => ({ sendEmail: m.sendEmail }));

import { POST as signup } from "@/app/api/auth/signup/route";
import { POST as verify } from "@/app/api/auth/verify-email/route";
import { POST as resend } from "@/app/api/auth/resend-verification/route";
import { MemoryBackend, setRateLimitBackend } from "@/lib/ratelimit/limiter";

let ipCounter = 0;
const post = (path: string, body: unknown, ip?: string) =>
  new NextRequest(`https://example.test${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip ?? `198.51.100.${++ipCounter}`,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const valid = { name: "Asha", email: "Asha@Example.com", password: "correct horse" };

beforeEach(() => {
  vi.clearAllMocks();
  setRateLimitBackend(new MemoryBackend());
  process.env.APP_URL = "https://app.example.test";
  m.hashPassword.mockResolvedValue("HASH");
  m.createEmailVerificationToken.mockResolvedValue("a".repeat(64));
  m.sendEmail.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/auth/signup", () => {
  it("rejects invalid input", async () => {
    expect((await signup(post("/api/auth/signup", "nope"))).status).toBe(400);
    expect((await signup(post("/api/auth/signup", { ...valid, password: "short" }))).status).toBe(400);
    expect((await signup(post("/api/auth/signup", { ...valid, email: "x" }))).status).toBe(400);
  });

  it("creates an UNVERIFIED account with a lower-cased email and emails a link", async () => {
    m.findUserByEmail.mockResolvedValue(null);
    const res = await signup(post("/api/auth/signup", valid));

    expect(res.status).toBe(202);
    expect((await res.json()).requiresVerification).toBe(true);
    const data = m.prisma.user.create.mock.calls[0][0].data;
    expect(data.email).toBe("asha@example.com");
    expect(data.hashedPassword).toBe("HASH");
    expect(data.emailVerified).toBeUndefined(); // never verified at creation
    expect(m.sendEmail.mock.calls[0][0].text).toContain("/auth/verify-email?token=");
  });

  it("returns an identical response for an already-verified address and changes nothing", async () => {
    m.findUserByEmail.mockResolvedValueOnce(null);
    const fresh = await signup(post("/api/auth/signup", valid));
    m.findUserByEmail.mockResolvedValueOnce({ id: "u1", email: "asha@example.com", emailVerified: new Date(), hashedPassword: "x" });
    const dup = await signup(post("/api/auth/signup", valid));

    expect(dup.status).toBe(fresh.status);
    expect(await dup.json()).toEqual(await fresh.json());
    expect(m.prisma.user.create).toHaveBeenCalledTimes(1);
    expect(m.prisma.user.update).not.toHaveBeenCalled();
  });

  it("PRE-HIJACK: replaces the credentials of an unverified account before re-verifying", async () => {
    m.findUserByEmail.mockResolvedValue({
      id: "attacker-made",
      email: "asha@example.com",
      name: "Mallory",
      emailVerified: null,
      hashedPassword: "ATTACKER_HASH",
    });
    await signup(post("/api/auth/signup", valid));

    const upd = m.prisma.user.update.mock.calls[0][0];
    expect(upd.where).toEqual({ id: "attacker-made" });
    expect(upd.data.hashedPassword).toBe("HASH"); // the new registrant's password wins
    expect(upd.data.sessionVersion).toEqual({ increment: 1 });
    expect(m.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("never touches OAuth-only accounts (no password)", async () => {
    m.findUserByEmail.mockResolvedValue({ id: "g1", email: "asha@example.com", emailVerified: null, hashedPassword: null });
    const res = await signup(post("/api/auth/signup", valid));
    expect(res.status).toBe(202);
    expect(m.prisma.user.update).not.toHaveBeenCalled();
    expect(m.sendEmail).not.toHaveBeenCalled();
  });

  it("reports 503 when the verification email cannot be sent", async () => {
    m.findUserByEmail.mockResolvedValue(null);
    m.sendEmail.mockRejectedValue(new Error("provider down"));
    expect((await signup(post("/api/auth/signup", valid))).status).toBe(503);
  });

  it("is rate limited per IP", async () => {
    m.findUserByEmail.mockResolvedValue({ id: "x", emailVerified: new Date(), hashedPassword: "h", email: "a@b.co" });
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) statuses.push((await signup(post("/api/auth/signup", valid, "203.0.113.50"))).status);
    expect(statuses.slice(0, 5).every((s) => s === 202)).toBe(true);
    expect(statuses[5]).toBe(429);
  });
});

describe("POST /api/auth/verify-email", () => {
  it("rejects malformed tokens without touching the database", async () => {
    expect((await verify(post("/api/auth/verify-email", { token: "short" }))).status).toBe(400);
    expect((await verify(post("/api/auth/verify-email", "nope"))).status).toBe(400);
    expect(m.consumeEmailVerificationToken).not.toHaveBeenCalled();
  });

  it("returns 400 for unknown or expired tokens and 200 for a valid one", async () => {
    const token = "b".repeat(64);
    m.consumeEmailVerificationToken.mockResolvedValueOnce(null);
    expect((await verify(post("/api/auth/verify-email", { token }))).status).toBe(400);
    m.consumeEmailVerificationToken.mockResolvedValueOnce("asha@example.com");
    const ok = await verify(post("/api/auth/verify-email", { token }));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ success: true });
  });
});

describe("POST /api/auth/resend-verification", () => {
  it("answers identically for unknown, verified and unverified accounts", async () => {
    const bodies: unknown[] = [];

    m.findUserByEmail.mockResolvedValueOnce(null);
    bodies.push(await (await resend(post("/api/auth/resend-verification", { email: "a@b.co" }))).json());

    m.findUserByEmail.mockResolvedValueOnce({ email: "a@b.co", emailVerified: new Date(), hashedPassword: "h" });
    bodies.push(await (await resend(post("/api/auth/resend-verification", { email: "a@b.co" }))).json());

    m.findUserByEmail.mockResolvedValueOnce({ email: "a@b.co", name: null, emailVerified: null, hashedPassword: "h" });
    bodies.push(await (await resend(post("/api/auth/resend-verification", { email: "a@b.co" }))).json());

    expect(bodies[0]).toEqual(bodies[1]);
    expect(bodies[1]).toEqual(bodies[2]);
    expect(m.sendEmail).toHaveBeenCalledTimes(1); // only the unverified password account
  });

  it("limits resends per address across different IPs", async () => {
    m.findUserByEmail.mockResolvedValue(null);
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) statuses.push((await resend(post("/api/auth/resend-verification", { email: "flood@x.co" }))).status);
    expect(statuses.filter((s) => s === 429).length).toBeGreaterThan(0);
  });
});
