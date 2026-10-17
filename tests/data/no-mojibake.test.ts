import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** UTF-8 text decoded as Windows-1252 and saved again shows up as these sequences (e.g. "·" -> "Â·", "₹" -> "â‚¹"). */
const MOJIBAKE = /Â[·°±²³µ¹º»¼½¾ -]|â‚¹|â€[™œ“”"–—¦¢]|â•|â”|Ã[©¨¢ ]/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|md|css|json)$/.test(name)) out.push(p);
  }
  return out;
}

describe("no double-encoded text", () => {
  it("source and docs contain no mojibake", () => {
    const root = process.cwd();
    const bad = ["app", "components", "lib", "features", "docs"].flatMap((d) => walk(join(root, d)))
      .filter((f) => MOJIBAKE.test(readFileSync(f, "utf8")))
      .map((f) => f.slice(root.length + 1));
    expect(bad).toEqual([]);
  });
});
