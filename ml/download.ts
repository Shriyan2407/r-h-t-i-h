/**
 * Download daily OHLCV + adjusted close for the universe, index and India VIX from Yahoo Finance.
 *   npx tsx ml/download.ts
 * Raw files go to ml/data/raw (gitignored). ml/data/manifest.json (committed) records exactly what
 * was fetched: row counts, date ranges, SHA-256 of each file and any symbol that failed.
 * Yahoo's adjusted prices are revised over time, so re-running changes the hashes; the manifest
 * referenced by a registered model is the authoritative record of what that model saw.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import YF from "yahoo-finance2";

const START = "2010-01-01";
const root = join(process.cwd(), "ml");
// ML_SET=former downloads the robustness universe into separate files so the training data is never touched.
const SET = process.env.ML_SET ? `_${process.env.ML_SET}` : "";
const rawDir = join(root, "data", `raw${SET}`);
mkdirSync(rawDir, { recursive: true });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yf: any = new (YF as any)();
const universe = JSON.parse(readFileSync(join(root, `universe${SET}.json`), "utf8")) as { index: string; vix: string; symbols: string[] };

interface Row { date: string; open: number; high: number; low: number; close: number; adjClose: number; volume: number }

async function fetchRows(symbol: string): Promise<Row[]> {
  const res = await yf.chart(symbol, { period1: START, period2: new Date().toISOString().slice(0, 10), interval: "1d" });
  const rows: Row[] = [];
  for (const q of res?.quotes ?? []) {
    if (!q?.date || q.open == null || q.high == null || q.low == null || q.close == null) continue;
    rows.push({
      date: new Date(q.date).toISOString().slice(0, 10),
      open: q.open, high: q.high, low: q.low, close: q.close,
      adjClose: q.adjclose ?? q.close, volume: q.volume ?? 0,
    });
  }
  return rows;
}

const manifest: {
  downloadedAt: string; start: string; source: string;
  files: Record<string, { rows: number; first: string; last: string; sha256: string }>;
  failed: Record<string, string>;
} = { downloadedAt: new Date().toISOString(), start: START, source: "yahoo-finance2 chart (1d, adjclose)", files: {}, failed: {} };

const jobs: Array<{ name: string; symbol: string }> = [
  { name: "_INDEX", symbol: universe.index },
  { name: "_VIX", symbol: universe.vix },
  ...universe.symbols.map((s) => ({ name: s, symbol: `${s}.NS` })),
];

async function main() {
for (const { name, symbol } of jobs) {
  try {
    const rows = await fetchRows(symbol);
    if (rows.length < 300) throw new Error(`only ${rows.length} rows`);
    const body = JSON.stringify(rows);
    writeFileSync(join(rawDir, `${name}.json`), body);
    manifest.files[name] = {
      rows: rows.length, first: rows[0].date, last: rows[rows.length - 1].date,
      sha256: createHash("sha256").update(body).digest("hex"),
    };
    console.log(`ok   ${name.padEnd(12)} ${rows.length} rows ${rows[0].date}..${rows[rows.length - 1].date}`);
  } catch (e) {
    manifest.failed[name] = (e as Error).message;
    console.log(`FAIL ${name}: ${(e as Error).message}`);
  }
}

writeFileSync(join(root, "data", `manifest${SET}.json`), JSON.stringify(manifest, null, 2) + "\n");
console.log(`\n${Object.keys(manifest.files).length} downloaded, ${Object.keys(manifest.failed).length} failed`);
}

main().catch((e) => { console.error(e); process.exit(1); });
