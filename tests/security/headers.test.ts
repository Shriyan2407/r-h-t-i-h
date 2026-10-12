import { describe, it, expect } from "vitest";
import { buildCsp, securityHeaders } from "@/lib/security/headers";

const asMap = (h: { key: string; value: string }[]) => Object.fromEntries(h.map((x) => [x.key, x.value]));

describe("securityHeaders", () => {
  it("always sends the headers that cannot break rendering", () => {
    for (const production of [true, false]) {
      const h = asMap(securityHeaders({ production }));
      expect(h["X-Content-Type-Options"]).toBe("nosniff");
      expect(h["X-Frame-Options"]).toBe("DENY");
      expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
      expect(h["Permissions-Policy"]).toContain("camera=()");
      expect(h["Permissions-Policy"]).toContain("geolocation=()");
    }
  });

  it("sends HSTS and the CSP only in production", () => {
    const dev = asMap(securityHeaders({ production: false }));
    expect(dev).not.toHaveProperty("Strict-Transport-Security");
    expect(dev).not.toHaveProperty("Content-Security-Policy-Report-Only");

    const prod = asMap(securityHeaders({ production: true }));
    expect(prod["Strict-Transport-Security"]).toMatch(/^max-age=\d{7,}/);
    expect(prod["Content-Security-Policy-Report-Only"]).toBeTruthy();
  });

  it("ships the CSP as report-only, never enforced, until validated in a browser", () => {
    const prod = asMap(securityHeaders({ production: true }));
    expect(prod).not.toHaveProperty("Content-Security-Policy");
  });

  it("has no duplicate header names", () => {
    const keys = securityHeaders({ production: true }).map((h) => h.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("CSP content", () => {
  const csp = buildCsp();
  const directive = (name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

  it("blocks framing, plugins, base-tag hijacking and cross-site form posts", () => {
    expect(directive("frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive("object-src")).toBe("object-src 'none'");
    expect(directive("base-uri")).toBe("base-uri 'self'");
    expect(directive("form-action")).toBe("form-action 'self'");
  });

  it("never allows eval or wildcard script sources", () => {
    const script = directive("script-src");
    expect(script).not.toContain("unsafe-eval");
    expect(script).not.toMatch(/\s\*(\s|$)/);
    // a bare scheme source ("https:") would allow scripts from ANY https origin
    expect(script).not.toMatch(/(^|\s)https:(\s|$)/);
  });

  it("defaults to same-origin and only widens what the app needs", () => {
    expect(directive("default-src")).toBe("default-src 'self'");
    expect(directive("connect-src")).not.toContain("*");
  });

  it("is a valid semicolon-separated policy", () => {
    expect(csp.split("; ").every((d) => /^[a-z-]+ .+/.test(d))).toBe(true);
  });
});
