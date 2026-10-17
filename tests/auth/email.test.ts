import { describe, it, expect, vi } from "vitest";
import { sendEmail, EmailNotConfiguredError, EmailDeliveryError } from "@/lib/email/send";
import { resetPasswordMessage, verifyEmailMessage } from "@/lib/email/templates";
import { getAppUrl } from "@/lib/config/appUrl";

const msg = { to: "a@b.co", subject: "s", html: "<p>h</p>", text: "t" };
const env = (e: Record<string, string>) => e as unknown as NodeJS.ProcessEnv;

describe("sendEmail", () => {
  it("throws in production when credentials are missing", async () => {
    await expect(sendEmail(msg, env({ NODE_ENV: "production" }))).rejects.toBeInstanceOf(
      EmailNotConfiguredError,
    );
    await expect(
      sendEmail(msg, env({ NODE_ENV: "production", RESEND_API_KEY: "k" })),
    ).rejects.toBeInstanceOf(EmailNotConfiguredError);
  });

  it("logs instead of sending in development without credentials", async () => {
    const fetchSpy = vi.fn();
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await sendEmail(msg, env({ NODE_ENV: "development" }), fetchSpy as unknown as typeof fetch);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalled();
    info.mockRestore();
  });

  it("posts to Resend with bearer auth when configured", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    await sendEmail(
      msg,
      env({ NODE_ENV: "production", RESEND_API_KEY: "re_123", EMAIL_FROM: "MKB <no-reply@x.test>" }),
      fetchSpy as unknown as typeof fetch,
    );
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_123");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ from: "MKB <no-reply@x.test>", to: ["a@b.co"], subject: "s" });
  });

  it("surfaces provider failures without leaking the response body", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: false, status: 422, text: async () => "a@b.co invalid" });
    const err = await sendEmail(
      msg,
      env({ NODE_ENV: "production", RESEND_API_KEY: "k", EMAIL_FROM: "f" }),
      fetchSpy as unknown as typeof fetch,
    ).catch((e) => e);
    expect(err).toBeInstanceOf(EmailDeliveryError);
    expect(err.message).not.toContain("a@b.co");
  });
});

describe("email templates", () => {
  it("escape user-controlled names and urls in HTML", () => {
    const m = resetPasswordMessage("a@b.co", "<script>alert(1)</script>", 'https://x.test/?a="b"');
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("&lt;script&gt;");
    expect(m.html).not.toContain('a="b"');
  });
  it("include the link in both html and text bodies", () => {
    const url = "https://x.test/auth/verify-email?token=abc";
    const m = verifyEmailMessage("a@b.co", null, url);
    expect(m.text).toContain(url);
    expect(m.html).toContain(url);
  });
});

describe("getAppUrl", () => {
  it("prefers APP_URL and strips trailing slashes", () => {
    expect(getAppUrl(env({ APP_URL: "https://a.test/", NEXTAUTH_URL: "https://b.test" }))).toBe("https://a.test");
  });
  it("falls back to NEXTAUTH_URL", () => {
    expect(getAppUrl(env({ NEXTAUTH_URL: "https://b.test" }))).toBe("https://b.test");
  });
  it("requires https in production and refuses to guess", () => {
    expect(() => getAppUrl(env({ NODE_ENV: "production" }))).toThrow();
    expect(() => getAppUrl(env({ NODE_ENV: "production", APP_URL: "http://a.test" }))).toThrow();
  });
  it("defaults to localhost in development", () => {
    expect(getAppUrl(env({ NODE_ENV: "development" }))).toBe("http://localhost:3000");
  });
});
