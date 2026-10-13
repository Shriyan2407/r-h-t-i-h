/** Manual smoke test: run the production risk pipeline on live Yahoo data.  npx tsx ml/live-check.ts RELIANCE TCS */
import { INDEX_SYMBOL, VIX_SYMBOL, fetchAdjustedBars } from "../lib/ml/data";
import { buildRiskForecast } from "../lib/ml/riskForecast";
import { templateExplanation } from "../lib/ai/riskExplainer";
import { checkExplanation } from "../lib/ai/numericGuard";

async function main() {
  const [index, vix] = await Promise.all([fetchAdjustedBars(INDEX_SYMBOL, 3), fetchAdjustedBars(VIX_SYMBOL, 3)]);
  if (!index || !vix) throw new Error("index/vix unavailable");
  for (const t of process.argv.slice(2)) {
    const stock = await fetchAdjustedBars(`${t}.NS`, 3);
    if (!stock) { console.log(t, "no data"); continue; }
    const r = buildRiskForecast({ ticker: t, symbol: `${t}.NS`, stock, index, vix });
    if (!r.available) { console.log(t, r.reason, r.detail); continue; }
    const c = r.contract;
    const e = templateExplanation(c);
    const g = checkExplanation([e.why, e.supports, e.invalidates, e.unknowns].join(" "), c.evidence);
    console.log(`${t.padEnd(10)} asOf=${c.asOf} stale=${c.stale} dailyVol=${(c.volatility.dailyVol * 100).toFixed(2)}% [${(c.volatility.dailyVolLow * 100).toFixed(2)}-${(c.volatility.dailyVolHigh * 100).toFixed(2)}] pctile=${c.volatility.percentileVsOwnYear} regime=${c.regime?.name} up=${c.factors.raising.map((f) => f.group).join("/")} guard=${g.ok}`);
  }
  const t0 = performance.now();
  const s = await fetchAdjustedBars("INFY.NS", 3);
  buildRiskForecast({ ticker: "INFY", symbol: "INFY.NS", stock: s!, index, vix });
  console.log(`warm-path latency incl. cache read: ${(performance.now() - t0).toFixed(0)} ms`);
}
main().catch((e) => { console.error(e); process.exit(1); });
