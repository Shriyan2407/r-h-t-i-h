import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** WCAG 2.1 AA (axe) on the public pages, in both themes. The theme is set the way the app reads it on boot. */
const PAGES = ["/", "/team", "/auth/login", "/auth/signup", "/auth/forgot-password"];

for (const theme of ["dark", "light"] as const) {
  test.describe(`accessibility (${theme} theme)`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("equitylens-theme", t), theme);
    });
    for (const path of PAGES) {
      test(`${path} has no WCAG A/AA violations`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("networkidle").catch(() => {});
        const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
        const summary = r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 3).map((n) => n.html.slice(0, 80)).join(" | ")}`);
        expect(summary).toEqual([]);
      });
    }
  });
}
