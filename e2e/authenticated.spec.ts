import AxeBuilder from "@axe-core/playwright";
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
  // Live (delayed) quote stream connects and updates the header status.
  await expect(page.getByText(/Updating · delayed/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Risk Model" }).first().click();
  await expect(page.getByText(/Expected daily move/)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("Not predicted")).toBeVisible();
  await page.getByRole("button", { name: "Why?" }).click();
  await expect(page.getByText("What the model does not know")).toBeVisible();
  // The model id also appears in each evidence source; assert the model card line specifically.
  await expect(page.getByText(/volatility-ridge@\d+\.\d+\.\d+ · production · trained/)).toBeVisible();
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
  await expect(page.getByText("REJECTED", { exact: true })).toBeVisible();
  await expect(page.getByText("DEPLOYED", { exact: true })).toBeVisible();
  await expect(page.getByText("rule_trend_ema50").first()).toBeVisible();
});

test("portfolio risk analysis runs on the saved holdings", async ({ page }) => {
  await login(page);
  await page.goto("/portfolio");
  await expect(page.getByRole("heading", { name: "Current holdings vs NIFTY 50" })).toBeVisible();
  await expect(page.getByText(/not your actual trading history|Not enough price history/)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("button", { name: "Edit RELIANCE" })).toBeVisible();
  await page.getByRole("button", { name: "Run risk analysis" }).click();
  await expect(page.getByText("Stress scenarios (estimates, not forecasts)")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("COVID crash (Feb-Mar 2020)", { exact: true })).toBeVisible();
});

test("the investment committee convenes, shows real agent progress and a cited memo", async ({ page }) => {
  await login(page);
  await page.goto("/research");
  await page.getByLabel("Ask the investment committee").fill("Should I buy Reliance?");
  await page.getByRole("button", { name: "Convene committee" }).click();
  const activity = page.getByRole("region", { name: "Orchestrator" });
  await expect(activity.getByText("Quantitative Analyst")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "RELIANCE", level: 2 })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("evidence agreement, not a probability")).toBeVisible();
  await expect(page.getByRole("heading", { name: "What would change our mind" })).toBeVisible();
  // Citations resolve to evidence rows on the page.
  const first = page.locator('a[href^="#ev-"]').first();
  const target = (await first.getAttribute("href"))!;
  await expect(page.locator(target)).toHaveCount(1);
});

test("the research workspace has no WCAG A/AA violations after a committee run", async ({ page }) => {
  await login(page);
  await page.goto("/research");
  await page.getByLabel("Ask the investment committee").fill("Is Infosys overvalued?");
  await page.getByRole("button", { name: "Convene committee" }).click();
  await expect(page.getByRole("heading", { name: "Agent opinions" })).toBeVisible({ timeout: 60_000 });
  const r = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 3).map((n) => n.html.slice(0, 80)).join(" | ")}`)).toEqual([]);
});

test("the committee refuses to analyse a stock outside its coverage", async ({ page }) => {
  await login(page);
  await page.goto("/research");
  await page.getByLabel("Ask the investment committee").fill("Should I buy NVIDIA right now?");
  await page.getByRole("button", { name: "Convene committee" }).click();
  await expect(page.getByText("INSUFFICIENT DATA").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/NSE\/BSE-listed Indian equities only/).first()).toBeVisible();
});

test("research explains why a stock is moving with cited evidence", async ({ page }) => {
  await login(page);
  await page.goto("/research?t=RELIANCE");
  await expect(page.getByRole("heading", { name: "Why is RELIANCE moving?" })).toBeVisible({ timeout: 45_000 });
  await expect(page.locator("#ev-M1")).toBeVisible();
  await expect(page.getByText(/do not prove that any of them caused|No headlines mentioning the company/)).toBeVisible();
});

