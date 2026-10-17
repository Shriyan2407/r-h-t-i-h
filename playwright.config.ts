import { defineConfig, devices } from "@playwright/test";

/**
 * E2E against a production build (`next build` must have run).
 *
 * SAFETY: the server is always started with an explicit DATABASE_URL. Next.js would otherwise load .env.local,
 * which may point at a production database. Without E2E_DATABASE_URL an unreachable local address is used, so
 * only the public tier runs; the authenticated tier is skipped.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const DB = process.env.E2E_DATABASE_URL ?? "postgresql://e2e:e2e@127.0.0.1:1/e2e_unavailable";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /public\.spec\.ts/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/auth/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: DB,
      NEXTAUTH_SECRET: process.env.E2E_NEXTAUTH_SECRET ?? "e2e-only-secret-not-used-anywhere-else-0123456789",
      AUTH_SECRET: process.env.E2E_NEXTAUTH_SECRET ?? "e2e-only-secret-not-used-anywhere-else-0123456789",
      NEXTAUTH_URL: `http://localhost:${PORT}`,
      AUTH_URL: `http://localhost:${PORT}`,
      AUTH_TRUST_HOST: "true",
      // Never send real email, Telegram or LLM traffic from tests.
      RESEND_API_KEY: "",
      TELEGRAM_BOT_TOKEN: "",
      ANTHROPIC_API_KEY: "",
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
      NODE_ENV: "production",
    },
  },
});
