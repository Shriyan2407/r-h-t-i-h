/**
 * Agent 1 — Investment Strategist.
 *
 * Sets the backdrop from measured inputs only: the market regime (NIFTY 50 vs its 200-day average and India VIX,
 * with what historically followed each regime), live macro prices (India VIX, USD/INR, US 10Y, Brent, S&P 500) and
 * the subject's sector move. Policy rates, CPI and GDP have no data feed here and are reported as unavailable,
 * never filled in.
 *
 * Regimes separate subsequent volatility and drawdown frequency; they are not a return forecast. So the strategist's
 * view never goes beyond "lean", and the scenarios are built from historical regime statistics, not invented odds.
 */
import { STOCKS } from "@/lib/data/searchUniverse";
import { REGIME_CONFIG, classifyRegime, type RegimeStats } from "@/lib/ml/regime";
import { noDataOutput, type AgentOutput, type InvestmentAgent } from "./agent";
import type { MacroSnapshot, ResearchContext } from "./context";
import { fmtPct, type EvidenceLog } from "./evidence";
import type { Claim, Intent, View } from "./schema";

const ROTATION_LABEL: Record<string, string> = { banking: "Banking", it: "IT", auto: "Auto", fmcg: "FMCG", pharma: "Pharma", metals: "Metals", realty: "Real Estate" };

export const MACRO_UNAVAILABLE = [
  "RBI policy rate and stance (DATA_UNAVAILABLE: no policy feed; the macro panel's rate pressure is market-implied)",
  "CPI inflation (DATA_UNAVAILABLE)",
  "GDP growth and PMI (DATA_UNAVAILABLE)",
];

export interface Scenario { name: string; description: string; evidenceIds: string[] }

export interface StrategistDetails {
  macroView: string;
  marketRegime: { name: string; trend: string; vol: string; asOf: string; history: RegimeStats | null } | null;
  sectorOutlook: string;
  investmentHorizon: Intent["horizon"];
  scenarios: { bull: Scenario; base: Scenario; bear: Scenario } | null;
  strategicImplication: string;
}

const HIST = REGIME_CONFIG.historical as RegimeStats[];
const byName = (n: string) => HIST.find((h) => h.regime === n) ?? null;
const overallDrawdownRate = () => HIST.reduce((a, h) => a + h.share * h.pFwd5dDrawdownOver3pct, 0) / HIST.reduce((a, h) => a + h.share, 0);

function macroEvidence(m: MacroSnapshot, ev: EvidenceLog) {
  const ids: Record<string, string> = {};
  const add = (key: string, label: string, v: number | null | undefined, display: (x: number) => string) => {
    if (typeof v === "number" && Number.isFinite(v)) ids[key] = ev.add({ kind: "macro", label, value: v, display: display(v), source: "Yahoo Finance quote", asOf: m.fetched_at ?? null });
  };
  add("vix", "India VIX", m.indices?.india_vix?.price, (x) => x.toFixed(2));
  add("usdinr", "USD/INR", m.currency?.usd_inr?.price, (x) => `₹${x.toFixed(2)}`);
  add("us10y", "US 10-year Treasury yield", m.global?.us_10y?.price, (x) => `${x.toFixed(2)}%`);
  add("brent", "Brent crude", m.commodities?.crude_brent?.price, (x) => `$${x.toFixed(2)}`);
  const sp = m.global?.sp500 as { change_1m?: number } | null | undefined;
  add("sp1m", "S&P 500, 1-month change", sp?.change_1m, (x) => `${x > 0 ? "+" : ""}${x.toFixed(1)}%`);
  return ids;
}

async function analyze(ctx: ResearchContext, ev: EvidenceLog): Promise<AgentOutput<StrategistDetails | null>> {
  const [macro, index, vix] = await Promise.all([ctx.macro(), ctx.index(), ctx.vix()]);
  const subject = await ctx.subject();
  const missing = [...MACRO_UNAVAILABLE];
  const claims: Claim[] = [];
  const risks: string[] = [];

  const regime = index.value && vix.value ? classifyRegime(index.value, vix.value) : null;
  if (!regime) missing.push(`market regime (NIFTY 50 ${index.status}, India VIX ${vix.status})`);
  const m = macro.value;
  if (!m) missing.push(`live macro prices (${macro.status})`);
  if (!regime && !m) return noDataOutput("Neither the market regime nor macro prices were available.", missing);

  let regimeId: string | null = null, ddId: string | null = null;
  const overallDd = overallDrawdownRate();
  if (regime) {
    regimeId = ev.add({ kind: "statistical_model", label: "Market regime (NIFTY 50 vs 200-day average, India VIX cut-offs)", value: regime.name, display: regime.name, source: "lib/ml/regime (cut-offs fit on pre-2025 history)", asOf: regime.asOf });
    if (regime.history) {
      ddId = ev.add({ kind: "statistical_model", label: `Historical share of 5-day windows with a >3% NIFTY drawdown in "${regime.name}"`, value: regime.history.pFwd5dDrawdownOver3pct, display: fmtPct(regime.history.pFwd5dDrawdownOver3pct, 0), source: `NIFTY 50 history ${REGIME_CONFIG.sampleRange.join(" to ")}`, asOf: regime.asOf });
    }
    claims.push({ text: `The market is in a "${regime.name}" regime [${regimeId}]${ddId ? `; historically ${fmtPct(regime.history!.pFwd5dDrawdownOver3pct, 0)} of 5-day windows in this regime saw a drawdown over 3% [${ddId}]` : ""}.`, evidenceIds: ddId ? [regimeId, ddId] : [regimeId], direction: regime.trend === "UP" && regime.vol !== "HIGH" ? "positive" : regime.vol === "HIGH" ? "negative" : "neutral" });
    if (regime.vol === "HIGH") risks.push(`High-volatility regime ("${regime.name}"): drawdowns are historically more frequent.`);
  }

  const mids = m ? macroEvidence(m, ev) : {};
  const macroBits: string[] = [];
  if (m) {
    const vixV = m.indices?.india_vix?.price;
    if (mids.vix && typeof vixV === "number") {
      macroBits.push(`India VIX ${vixV.toFixed(2)} [${mids.vix}]`);
      if (vixV >= REGIME_CONFIG.vixHighCutoff) risks.push("India VIX is above its historical high-volatility cut-off.");
    }
    if (mids.usdinr) macroBits.push(`USD/INR ₹${m.currency!.usd_inr!.price.toFixed(2)} [${mids.usdinr}]`);
    if (mids.us10y) macroBits.push(`US 10Y ${m.global!.us_10y!.price.toFixed(2)}% [${mids.us10y}]`);
    if (mids.brent) macroBits.push(`Brent $${m.commodities!.crude_brent!.price.toFixed(2)} [${mids.brent}]`);
    if (mids.sp1m) macroBits.push(`S&P 500 ${(m.global!.sp500 as { change_1m: number }).change_1m.toFixed(1)}% over a month [${mids.sp1m}]`);
    const cited = Object.values(mids);
    if (cited.length) claims.push({ text: `Macro prices: ${macroBits.join(", ")}.`, evidenceIds: cited, direction: "neutral" });
  }

  let sectorOutlook = "Not applicable: the question is not about a single stock.";
  if (subject.kind === "asset") {
    const sector = STOCKS[subject.ticker]?.sector;
    const label = sector ? ROTATION_LABEL[sector] : undefined;
    const row = label && m?.sector_rotation?.find((r) => r.sector === label);
    if (row) {
      const id = ev.add({ kind: "macro", label: `NIFTY ${label} index, 1-week change`, value: row.performance_1w, display: `${row.performance_1w > 0 ? "+" : ""}${row.performance_1w.toFixed(1)}%`, source: "Yahoo Finance sector index quote", asOf: m!.fetched_at ?? null });
      sectorOutlook = `${label} sector index moved ${row.performance_1w > 0 ? "+" : ""}${row.performance_1w.toFixed(1)}% over the past week [${id}]; one week is too short to call a sector cycle.`;
      claims.push({ text: sectorOutlook, evidenceIds: [id], direction: row.performance_1w > 1.5 ? "positive" : row.performance_1w < -1.5 ? "negative" : "neutral" });
    } else {
      sectorOutlook = "No sector index is tracked for this stock's sector.";
      missing.push("sector index performance for this stock's sector");
    }
  }

  const calm = byName("Calm uptrend"), stress = byName("Market stress");
  const scenarios: StrategistDetails["scenarios"] = regime && regime.history && calm && stress ? {
    base: { name: `"${regime.name}" persists`, description: `Historically, 5-day NIFTY volatility averaged ${fmtPct(regime.history.meanFwd5dVol, 2)} a day in this regime and ${fmtPct(regime.history.pFwd5dDrawdownOver3pct, 0)} of windows had a >3% drawdown.`, evidenceIds: ddId ? [regimeId!, ddId] : [regimeId!] },
    bull: { name: "Shift to a calm uptrend", description: `In "Calm uptrend" periods only ${fmtPct(calm.pFwd5dDrawdownOver3pct, 0)} of 5-day windows had a >3% drawdown (average across all regimes: ${fmtPct(overallDd, 0)}).`, evidenceIds: [regimeId!] },
    bear: { name: "Shift to market stress", description: `In "Market stress" periods ${fmtPct(stress.pFwd5dDrawdownOver3pct, 0)} of 5-day windows had a >3% drawdown and daily volatility averaged ${fmtPct(stress.meanFwd5dVol, 2)}.`, evidenceIds: [regimeId!] },
  } : null;

  // The backdrop can only lean: regimes describe risk, not expected returns.
  const view: View = !regime ? "neutral" : regime.trend === "UP" && regime.vol !== "HIGH" ? "lean_bullish" : regime.trend === "DOWN" && regime.vol === "HIGH" ? "lean_bearish" : "neutral";
  const horizon = ctx.intent.horizon;
  const horizonNote = horizon === "unknown"
    ? "No investment horizon was stated; regime evidence speaks to the next few weeks, so a long-term decision should rest on fundamentals."
    : horizon === "long" ? "For a long horizon the current regime matters mainly for entry timing and position sizing, not for the thesis."
      : "For a short horizon the regime's volatility and drawdown frequency matter directly.";
  const scenarioNote = ctx.intent.scenario !== "none" ? ` The ${ctx.intent.scenario.replace("_", " ")} scenario is tested by the risk agent against real historical windows.` : "";
  const implication = regime
    ? `${regime.vol === "HIGH" ? "Risk is elevated; favour smaller positions and staged entry." : regime.trend === "UP" ? "The backdrop is supportive but says nothing about this specific asset's return." : "The index is below its 200-day average; expect weaker breadth."} ${horizonNote}${scenarioNote}`
    : `${horizonNote}${scenarioNote}`;

  return {
    status: missing.length > MACRO_UNAVAILABLE.length ? "partial" : "success",
    conclusion: regime ? `Market regime: ${regime.name}. ${regime.vol === "HIGH" ? "Volatility is high." : "Volatility is not elevated."}` : "Market regime unavailable; macro prices only.",
    view,
    confidence: Math.round(((regime ? 0.6 : 0) + (m ? 0.4 * Math.min(1, Object.keys(mids).length / 4) : 0)) * 100) / 100,
    claims,
    metrics: { regime: regime?.name ?? null, indiaVix: m?.indices?.india_vix?.price ?? null, regimeDrawdownRate: regime?.history?.pFwd5dDrawdownOver3pct ?? null, overallDrawdownRate: overallDd },
    risks,
    catalysts: [],
    disagreements: [],
    missingData: missing,
    reasoningSummary: "Regime from the NIFTY 50 trend and India VIX with historical follow-through; macro levels are live quotes. No policy-rate, inflation or growth data is connected.",
    details: {
      macroView: macroBits.length ? macroBits.join("; ") : "Macro prices unavailable.",
      marketRegime: regime ? { name: regime.name, trend: regime.trend, vol: regime.vol, asOf: regime.asOf, history: regime.history } : null,
      sectorOutlook,
      investmentHorizon: horizon,
      scenarios,
      strategicImplication: implication,
    },
  };
}

export const strategistAgent: InvestmentAgent<StrategistDetails | null> = { id: "strategist", analyze: (ctx, _prior, ev) => analyze(ctx, ev) };
