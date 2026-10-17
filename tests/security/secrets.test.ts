import { describe, it, expect } from "vitest";
import { checkBearer, checkSecret, safeEqual } from "@/lib/security/secrets";

const req = (authorization?: string) =>
  new Request("https://example.test/api/cron/x", {
    headers: authorization ? { authorization } : {},
  });

describe("safeEqual", () => {
  it("matches identical strings", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
  });
  it("rejects different strings, including different lengths", () => {
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "a")).toBe(false);
  });
});

describe("checkSecret", () => {
  it("fails closed with 503 when the server secret is unset", () => {
    expect(checkSecret("anything", undefined)).toEqual({
      ok: false,
      status: 503,
      error: "Server misconfigured",
    });
    expect(checkSecret("anything", "")).toMatchObject({ ok: false, status: 503 });
  });
  it("rejects a missing or wrong secret with 401", () => {
    expect(checkSecret(null, "s3cret")).toMatchObject({ ok: false, status: 401 });
    expect(checkSecret("nope", "s3cret")).toMatchObject({ ok: false, status: 401 });
  });
  it("accepts the correct secret", () => {
    expect(checkSecret("s3cret", "s3cret")).toEqual({ ok: true });
  });
});

describe("checkBearer", () => {
  it('does NOT accept the literal "Bearer undefined" when the secret is unset', () => {
    // Regression: `Bearer ${process.env.CRON_SECRET}` used to equal "Bearer undefined".
    const result = checkBearer(req("Bearer undefined"), undefined);
    expect(result).toMatchObject({ ok: false, status: 503 });
  });
  it("rejects missing or malformed headers", () => {
    expect(checkBearer(req(), "s3cret")).toMatchObject({ ok: false, status: 401 });
    expect(checkBearer(req("Basic abc"), "s3cret")).toMatchObject({ ok: false, status: 401 });
    expect(checkBearer(req("Bearer "), "s3cret")).toMatchObject({ ok: false, status: 401 });
  });
  it("accepts the right bearer token", () => {
    expect(checkBearer(req("Bearer s3cret"), "s3cret")).toEqual({ ok: true });
  });
});
