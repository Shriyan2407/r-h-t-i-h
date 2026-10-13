import { expect, test, type Page } from "@playwright/test";
import { E2E_USER } from "./global-setup";

/**
 * Critical signed-in flows. Needs E2E_DATABASE_URL (seeded by global-setup) and network access to Yahoo Finance.
 * LOGIN -> DASHBOARD -> STOCK -> RISK MODEL -> BACKTEST -> MODEL EVIDENCE -> PORTFOLIO RISK
 */
test.skip(!process.env.E2E_DATABASE_URL, "authenticated tier needs E2E_DATABASE_URL");
test.describe.configure({ mode: "serial" });

async function login(page: Page) {
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(E2E_USER.email);
  await page.getByLabel("Password", { exact: true }).fill(E2E_USER.password);
  await page.getByRole("button", { name: /sign in|log in|access/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
}

test("login lands on the dashboard", async ({ page }) => {
  await login(page);
  await expect(page.locator("body")).not.toContainText("7 agents");
});

test("stock risk model shows a forecast with evidence and no direction call", async ({ page }) => {
  await login(page);
  await page.goto("/stock/RELIANCE");
  await page.getByRole("button", { name: "Risk Model" }).first().click();
  await expect(page.getByText(/Expected daily move/)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("Not predicted")).toBeVisible();
  await page.getByRole("button", { name: "Why?" }).click();
  await expect(page.getByText("What the model does not know")).toBeVisible();
  await expect(page.getByText(/volatility-ridge@/)).toBeVisible();
});

test("backtest runs and is labelled as not a prediction", async ({ page }) => {
  await login(page);
  await page.goto("/backtest");
  await page.getByLabel("NSE/BSE symbol").fill("TCS");
  await page.getByRole("button", { name: "Run backtest" }).click();
  await expect(page.getByText(/BACKTEST RESULT — not a prediction/)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("region", { name: "Strategy" })).toContainText("Sharpe");
});

test("model evidence publishes rejected models", async ({ page }) => {
  await login(page);
  await page.goto("/models");
  await expect(page.getByText("REJECTED")).toBeVisible();
  await expect(page.getByText("DEPLOYED")).toBeVisible();
  await expect(page.getByText("rule_trend_ema50").first()).toBeVisible();
});

test("portfolio risk analysis runs on the saved holdings", async ({ page }) => {
  await login(page);
  await page.goto("/portfolio");
  await page.getByRole("button", { name: "Run risk analysis" }).click();
  await expect(page.getByText("Stress scenarios (estimates, not forecasts)")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/COVID crash/)).toBeVisible();
});
