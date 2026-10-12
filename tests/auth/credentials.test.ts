import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

const m = vi.hoisted(() => ({ findUserByEmail: vi.fn() }));
vi.mock("@/lib/auth/users", () => ({ findUserByEmail: m.findUserByEmail }));
vi.mock("@/lib/auth/prisma", () => ({ prisma: {} }));

import { authorizeCredentials } from "@/lib/auth/credentials";
import { EmailNotVerifiedError, TooManyAttemptsError } from "@/lib/auth/errors";
import { MemoryBackend, setRateLimitBackend } from "@/lib/ratelimit/limiter";

const PASSWORD = "correct horse battery";
const HASH = bcrypt.hashSync(PASSWORD, 4); // low cost: tests only

let ip = 0;
const req = (address?: string) =>
  new Request("https://example.test/api/auth/callback/credentials", {
    method: "POST",
    headers: { "x-forwarded-for": address ?? `192.0.2.${++ip}` },
  });

const user = (over: Record<string, unknown> = {}) => ({
  id: "u1",
  name: "Asha",
  email: "asha@example.com",
  image: null,
  hashedPassword: HASH,
  emailVerified: new Date(),
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  setRateLimitBackend(new MemoryBackend());
});

describe("authorizeCredentials", () => {
  it("returns null for malformed credentials", async () => {
    expect(await authorizeCredentials({ email: "nope", password: "x" }, req())).toBeNull();
    expect(await authorizeCredentials({}, req())).toBeNull();
    expect(m.findUserByEmail).not.toHaveBeenCalled();
  });

  it("returns the user for a verified account with the right password", async () => {
    m.findUserByEmail.mockResolvedValue(user());
    const out = await authorizeCredentials({ email: "Asha@Example.com ", password: PASSWORD }, req());
    expect(out).toEqual({ id: "u1", name: "Asha", email: "asha@example.com", image: null });
    expect(m.findUserByEmail).toHaveBeenCalledWith("asha@example.com");
  });

  it("returns null for a wrong password", async () => {
    m.findUserByEmail.mockResolvedValue(user());
    expect(await authorizeCredentials({ email: "asha@example.com", password: "wrong" }, req())).toBeNull();
  });

  it("still runs a bcrypt comparison for unknown accounts (no timing oracle)", async () => {
    m.findUserByEmail.mockResolvedValue(null);
    const compare = vi.spyOn(bcrypt, "compare");
    const out = await authorizeCredentials({ email: "ghost@example.com", password: PASSWORD }, req());
    expect(out).toBeNull();
    expect(compare).toHaveBeenCalledTimes(1);
  });

  it("returns null for OAuth-only accounts that have no password", async () => {
    m.findUserByEmail.mockResolvedValue(user({ hashedPassword: null }));
    expect(await authorizeCredentials({ email: "asha@example.com", password: PASSWORD }, req())).toBeNull();
  });

  it("blocks unverified accounts, but only after the password is proven correct", async () => {
    m.findUserByEmail.mockResolvedValue(user({ emailVerified: null }));

    await expect(
      authorizeCredentials({ email: "asha@example.com", password: PASSWORD }, req()),
    ).rejects.toBeInstanceOf(EmailNotVerifiedError);

    // Wrong password on the same unverified account must NOT reveal it is unverified.
    expect(await authorizeCredentials({ email: "asha@example.com", password: "wrong" }, req())).toBeNull();
  });

  it("exposes a machine-readable error code", () => {
    expect(new EmailNotVerifiedError().code).toBe("email_not_verified");
    expect(new TooManyAttemptsError().code).toBe("rate_limited");
  });

  it("rate limits repeated attempts from one IP", async () => {
    m.findUserByEmail.mockResolvedValue(null);
    const ipAddr = "198.51.100.200";
    let thrown: unknown = null;
    for (let i = 0; i < 12; i++) {
      try {
        await authorizeCredentials({ email: `u${i}@example.com`, password: "x" }, req(ipAddr));
      } catch (e) {
        thrown = e;
        break;
      }
    }
    expect(thrown).toBeInstanceOf(TooManyAttemptsError);
  });

  it("rate limits password guessing against a single account across IPs", async () => {
    m.findUserByEmail.mockResolvedValue(user());
    let thrown: unknown = null;
    for (let i = 0; i < 12; i++) {
      try {
        await authorizeCredentials({ email: "asha@example.com", password: `guess${i}` }, req());
      } catch (e) {
        thrown = e;
        break;
      }
    }
    expect(thrown).toBeInstanceOf(TooManyAttemptsError);
  });
});
