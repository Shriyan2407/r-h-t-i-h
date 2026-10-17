/**
 * Build lib/portfolio/factorReference.json: the cross-sectional mean/std of each style characteristic across the
 * current Nifty 50 constituents (ml/universe.json). Momentum and volatility use ml/data/raw (run ml:download first);
 * size and value use a live Yahoo quote (market cap, price/book). Re-run periodically; the file records its date.
 *   npx tsx ml/build-factor-reference.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import YF from "yahoo-finance2";
import { toAdjustedBars } from "../lib/ml/features";
import { characteristics, referenceStats, type FactorReference } from "../lib/portfolio/factors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yf: any = new (YF as any)();

async function main() {
  const root = process.cwd();
  const universe = JSON.parse(readFileSync(join(root, "ml", "universe.json"), "utf8")) as { symbols: string[] };
  const all = [];
  for (const s of universe.symbols) {
    let raw;
    try {
      raw = JSON.parse(readFileSync(join(root, "ml", "data", "raw", `${s}.json`), "utf8"));
    } catch {
      console.log(`skip ${s}: no downloaded history`);
      continue;
    }
    let f = null;
    try {
      const q = await yf.quote(`${s}.NS`);
      f = { marketCap: q?.marketCap ?? null, priceToBook: q?.priceToBook ?? null };
    } catch {
      console.log(`no quote for ${s}`);
    }
    all.push(characteristics(toAdjustedBars(raw), f));
  }
  const ref: FactorReference = {
    asOf: new Date().toISOString().slice(0, 10),
    universe: "Current Nifty 50 constituents (ml/universe.json)",
    count: all.length,
    stats: referenceStats(all),
  };
  writeFileSync(join(root, "lib", "portfolio", "factorReference.json"), JSON.stringify(ref, null, 2) + "\n");
  console.log(JSON.stringify(ref, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
