import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Server-only modules must never be imported (as values) by client components: they break or bloat the bundle. */
const SERVER_ONLY = [/from ["']yahoo-finance2["']/, /from ["']@prisma\/client["']/, /from ["']@\/lib\/auth\/prisma["']/, /from ["']@\/lib\/live\/quotes["']/, /from ["']@\/lib\/ml\/data["']/];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

describe("client components import no server-only modules", () => {
  const files = [...walk(join(process.cwd(), "app")), ...walk(join(process.cwd(), "components"))]
    .filter((f) => /^\s*["']use client["']/.test(readFileSync(f, "utf8")));

  it("found client components to check", () => expect(files.length).toBeGreaterThan(20));

  it.each(files.map((f) => [f.replace(process.cwd(), "")]))("%s", (rel) => {
    const src = readFileSync(join(process.cwd(), rel), "utf8");
    const valueImports = src.split("\n").filter((l) => /^\s*import\s/.test(l) && !/^\s*import\s+type\s/.test(l));
    for (const re of SERVER_ONLY) expect(valueImports.filter((l) => re.test(l))).toEqual([]);
  });
});
