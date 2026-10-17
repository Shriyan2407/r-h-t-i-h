#!/usr/bin/env node
/**
 * Fails the build if generated sample data was shipped in a production bundle.
 *
 * lib/mockData.ts holds fabricated company profiles. It must only be reachable through
 * the dev-only demo path in lib/api.ts, which the bundler removes from production builds.
 * This script scans the compiled output for sentinel strings copied from mockData.ts.
 *
 *   npm run build && npm run check:bundle
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const SENTINELS = [
  "Founded by Dhirubhai Ambani as a textile",
  "Highly capital-disciplined but aggressively expansionist",
];

const ROOTS = [".next/static", ".next/server"];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else if (!name.endsWith(".map")) yield full;
  }
}

if (!ROOTS.some(existsSync)) {
  console.error("No .next build output found. Run `npm run build` first.");
  process.exit(2);
}

const hits = [];
for (const root of ROOTS.filter(existsSync)) {
  for (const file of walk(root)) {
    if (!/\.(js|mjs|cjs|html|json|txt)$/.test(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const s of SENTINELS) if (text.includes(s)) hits.push(`${file}: "${s}"`);
  }
}

if (hits.length) {
  console.error("Sample/mock data found in the production build:\n  " + hits.join("\n  "));
  process.exit(1);
}
console.log("OK: no sample/mock data in the production bundle.");
