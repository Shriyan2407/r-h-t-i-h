/**
 * Build the supervised dataset and a data-quality audit from ml/data/raw.
 *   npx tsx ml/build-dataset.ts
 * Outputs: ml/data/dataset.csv (gitignored), ml/data/dataset.meta.json and ml/data/quality.json (committed).
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CSV_HEADER, buildDatasetRows, describeDataset, rowsToCsv, validateDataset, type DatasetRow } from "../lib/ml/dataset";
import { toAdjustedBars } from "../lib/ml/features";

const root = join(process.cwd(), "ml");
const SET = process.env.ML_SET ? `_${process.env.ML_SET}` : "";
const rawDir = join(root, "data", `raw${SET}`);

type Raw = Array<{ date: string; open: number; high: number; low: number; close: number; adjClose: number; volume: number }>;
const load = (name: string): Raw => JSON.parse(readFileSync(join(rawDir, `${name}.json`), "utf8"));

interface Quality {
  rawRows: number; duplicateDates: number; nonMonotonic: number; zeroVolumeDays: number;
  gapsOver5Days: number; absReturnOver25pct: number; adjFactorChangesOver1pct: number; usableBars: number;
}

function audit(raw: Raw): Quality {
  let dup = 0, nonMono = 0, zeroVol = 0, gaps = 0, jumps = 0, adj = 0;
  const seen = new Set<string>();
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    if (seen.has(r.date)) dup++;
    seen.add(r.date);
    if (r.volume === 0) zeroVol++;
    if (i > 0) {
      if (r.date <= raw[i - 1].date) nonMono++;
      if ((Date.parse(r.date) - Date.parse(raw[i - 1].date)) / 86400000 > 5) gaps++;
      if (Math.abs(r.adjClose / raw[i - 1].adjClose - 1) > 0.25) jumps++;
      const f0 = raw[i - 1].adjClose / raw[i - 1].close, f1 = r.adjClose / r.close;
      if (Math.abs(f1 / f0 - 1) > 0.01) adj++;
    }
  }
  return { rawRows: raw.length, duplicateDates: dup, nonMonotonic: nonMono, zeroVolumeDays: zeroVol, gapsOver5Days: gaps, absReturnOver25pct: jumps, adjFactorChangesOver1pct: adj, usableBars: toAdjustedBars(raw).length };
}

function main() {
  const index = toAdjustedBars(load("_INDEX"));
  const vix = toAdjustedBars(load("_VIX"));
  const names = readdirSync(rawDir).filter((f) => f.endsWith(".json") && !f.startsWith("_")).map((f) => f.replace(/\.json$/, "")).sort();

  const all: DatasetRow[] = [];
  const quality: Record<string, Quality> = {};
  for (const name of names) {
    const raw = load(name);
    quality[name] = audit(raw);
    all.push(...buildDatasetRows(name, toAdjustedBars(raw), index, vix));
  }
  // Global order by decision date then ticker: makes time-based splitting a simple prefix operation.
  all.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.ticker < b.ticker ? -1 : 1));

  const problems = validateDataset(all);
  if (problems.length) {
    console.error(`DATASET INVALID (${problems.length} problems), first 10:\n` + problems.slice(0, 10).join("\n"));
    process.exit(1);
  }

  const csv = rowsToCsv(all);
  writeFileSync(join(root, "data", `dataset${SET}.csv`), csv);
  const meta = { ...describeDataset(all), csvSha256: createHash("sha256").update(csv).digest("hex"), columns: CSV_HEADER.length, builtFrom: `ml/data/manifest${SET}.json` };
  writeFileSync(join(root, "data", `dataset${SET}.meta.json`), JSON.stringify(meta, null, 2) + "\n");
  writeFileSync(join(root, "data", `quality${SET}.json`), JSON.stringify(quality, null, 2) + "\n");

  const totals = Object.values(quality).reduce(
    (a, q) => ({ dup: a.dup + q.duplicateDates, nonMono: a.nonMono + q.nonMonotonic, zero: a.zero + q.zeroVolumeDays, gaps: a.gaps + q.gapsOver5Days, jumps: a.jumps + q.absReturnOver25pct, adj: a.adj + q.adjFactorChangesOver1pct }),
    { dup: 0, nonMono: 0, zero: 0, gaps: 0, jumps: 0, adj: 0 },
  );
  console.log("dataset:", meta);
  console.log("quality totals:", totals);
}

main();
