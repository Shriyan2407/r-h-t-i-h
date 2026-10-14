import { expect, test } from "@playwright/test";

/** Runs without a database: public pages, access control, health and security headers. */

test("landing page renders without fabricated claims", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Indian Equity Research and Risk Analytics/);
  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(/7 agents|multi-agent|AI-Powered|real-time intelligence/i);
  expect(body).not.toMatch(/Market Ka Baadshah|R\.H\.T\.I\.H/i);
  expect(body).toMatch(/EquityLens/i);
});

test("login form fields are reachable by their labels", async ({ page }) => {
  await page.goto("/auth/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /show password/i })).toBeVisible();
});

test("protected pages redirect to login with a callback", async ({ page }) => {
  for (const path of ["/dashboard", "/backtest", "/models", "/portfolio"]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/auth/login\\?callbackUrl=${encodeURIComponent(path).replace(/%2F/g, "(%2F|/)")}`));
  }
});

test("protected APIs return 401 JSON without a session", async ({ request }) => {
  for (const path of ["/api/ml/risk/TCS", "/api/ml/evaluation", "/api/portfolio/risk", "/api/search?q=tcs"]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(401);
    expect((await res.json()).code).toBe("UNAUTHENTICATED");
  }
});

test("public health endpoint exposes no internals", async ({ request }) => {
  const res = await request.get("/api/health");
  expect([200, 503]).toContain(res.status());
  const body = await res.json();
  expect(Object.keys(body).sort()).toEqual(["checks", "status", "ts"]);
  expect(res.headers()["cache-control"]).toContain("no-store");
  const detail = await request.get("/api/health", { headers: { authorization: "Bearer wrong" } });
  expect([401, 503]).toContain(detail.status());
});

test("security headers are set", async ({ request }) => {
  const h = (await request.get("/auth/login")).headers();
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["referrer-policy"]).toBeTruthy();
});

test("command palette opens with Ctrl+K and navigates by keyboard", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Model evidence")).toBeVisible();
  await page.keyboard.type("backtest");
  await page.keyboard.press("Enter");
  // Signed out, so the protected page redirects to login with the callback preserved.
  await expect(page).toHaveURL(/\/auth\/login\?callbackUrl=(%2F|\/)backtest/);
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});
