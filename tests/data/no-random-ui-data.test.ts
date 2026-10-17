import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Random values were the source of several fabricated "live" numbers (confidence random walks, a performance chart
 * drawn from noise). Product code may not use Math.random except where listed with a reason.
 */
const ALLOWED: Record<string, string> = {
  "lib/ai/narrativeEngine.ts": "chooses between equivalent phrasings in template text; never produces a number",
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

describe("no random numbers in product code", () => {
  const root = process.cwd();
  const files = ["app", "components", "lib", "features", "store"].flatMap((d) => walk(join(root, d)));
  it("only allow-listed files use Math.random", () => {
    const offenders = files
      .map((f) => f.slice(root.length + 1).split("\\").join("/"))
      .filter((rel) => /Math\.random/.test(readFileSync(join(root, rel), "utf8")) && !(rel in ALLOWED));
    expect(offenders).toEqual([]);
  });
  it("the dashboard no longer ships a fixed stress-test result", () => {
    const src = readFileSync(join(root, "app/dashboard/page.tsx"), "utf8");
    expect(src).not.toMatch(/Protection Score|TEJASNET|-19\.5%/);
  });
});
