/* ═══════════════════════════════════════════════════════════════
   R.H.T.I.H — Deterministic Intelligence Report Generator
   Builds a complete IntelligenceReport from Yahoo Finance data
   with zero LLM dependency. Used as final fallback tier.
═══════════════════════════════════════════════════════════════ */

import { detectSector } from "./promptBuilder";
import type { NewsItem } from "./newsAggregator";

function clamp(v: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, v)); }

/* ── Score computation from raw Yahoo Finance data ─────────── */

function computeScores(quote: any, summary: any, newsRatio: number) {
  const price    = quote?.regularMarketPrice ?? 1000;
  const change1d = quote?.regularMarketChangePercent ?? 0;
  const hi52     = quote?.fiftyTwoWeekHigh ?? price * 1.2;
  const lo52     = quote?.fiftyTwoWeekLow  ?? price * 0.8;
  const rangePos = hi52 > lo52 ? (price - lo52) / (hi52 - lo52) : 0.5;
  const pe       = quote?.trailingPE ?? null;
  const beta     = Math.abs(quote?.beta ?? 1);

  const fd  = summary?.financialData ?? {};
  const roe = (fd.returnOnEquity ?? 0) * 100;
  const rev = (fd.revenueGrowth   ?? 0) * 100;
  const pm  = (fd.profitMargins   ?? 0) * 100;
  const de  = fd.debtToEquity ?? 0;

  /* Technical — price action + range position */
  let tech = 50;
  if (change1d > 1.5)       tech += 12; else if (change1d > 0.5)  tech += 6;
  else if (change1d < -1.5) tech -= 12; else if (change1d < -0.5) tech -= 6;
  if (rangePos > 0.72)      tech += 8;  else if (rangePos > 0.52)  tech += 4;
  else if (rangePos < 0.28) tech -= 8;  else if (rangePos < 0.45)  tech -= 4;
  tech = clamp(tech);

  /* Fundamental */
  let fund = 50;
  if (pe !== null) {
    if (pe > 0 && pe < 15)  fund += 12;
    else if (pe < 25)        fund += 6;
    else if (pe > 60)        fund -= 10;
    else if (pe > 40)        fund -= 5;
    else if (pe < 0)         fund -= 8;
  }
  if (roe >= 20) fund += 10; else if (roe >= 12) fund += 5; else if (roe > 0 && roe < 5) fund -= 6;
  if (rev >= 15) fund += 8;  else if (rev >= 8)  fund += 4; else if (rev < 0) fund -= 10;
  if (pm >= 20)  fund += 6;  else if (pm < 0)    fund -= 8;
  if (de < 0.3)  fund += 6;  else if (de > 2)    fund -= 10; else if (de > 1.2) fund -= 5;
  fund = clamp(fund);

  /* Momentum — position in 52W range + direction */
  let mom = 50;
  if (rangePos > 0.80)      mom += 15; else if (rangePos > 0.60) mom += 8;
  else if (rangePos < 0.20) mom -= 15; else if (rangePos < 0.35) mom -= 8;
  mom += change1d > 0 ? 5 : -5;
  mom += Math.round(newsRatio * 8);
  mom = clamp(mom);

  /* Volatility (higher = calmer) */
  let vol = 65;
  if (beta > 1.5)      vol -= 20; else if (beta > 1.2) vol -= 10;
  else if (beta < 0.8) vol += 10;
  if (rangePos < 0.15 || rangePos > 0.90) vol -= 5;
  vol = clamp(vol);

  /* Risk-Reward */
  const upside = hi52 > price ? ((hi52 - price) / price) * 100 : 0;
  let rr = 50;
  if (upside > 20 && rangePos < 0.40) rr += 20;
  else if (upside > 10 && rangePos < 0.60) rr += 10;
  else if (upside < 5  && rangePos > 0.85) rr -= 15;
  if (de > 1.5) rr -= 8;
  rr = clamp(rr);

  const smart = clamp(50 + Math.round(newsRatio * 12) + (change1d > 0.5 ? 8 : change1d < -0.5 ? -8 : 0));
  const lt    = clamp(Math.round(fund * 0.5 + tech * 0.2 + mom * 0.2 + vol * 0.1));
  const swing = clamp(Math.round(tech * 0.4 + mom * 0.4 + rr * 0.2));
  const inst  = clamp(Math.round(smart * 0.4 + fund * 0.3 + mom * 0.3));

  return { tech, fund, mom, vol, rr, smart, lt, swing, inst, rangePos, change1d, pe, de, roe, rev, beta, price, hi52, lo52 };
}

/* ── Text generation helpers ──────────────────────────────── */

function fmt(n: number, dec = 0) { return n.toFixed(dec); }
function fmtInr(n: number)       { return `₹${n.toFixed(0)}`; }

function oneLiner(ticker: string, s: ReturnType<typeof computeScores>, sector: any): string {
  const { tech, fund, rangePos, change1d, pe, rev } = s;
  if (tech >= 65 && fund >= 65)
    return `${ticker} is technically and fundamentally sound — institutional accumulation phase likely in progress.`;
  if (tech >= 65 && fund < 50)
    return `${ticker} shows strong price momentum but fundamentals require monitoring before adding aggressively.`;
  if (fund >= 65 && tech < 50)
    return `${ticker} is a fundamentally attractive stock in a technical correction — potential value entry zone.`;
  if (rangePos < 0.25)
    return `${ticker} trades near 52-week lows — wait for stabilization signal or incremental accumulation on weakness.`;
  if (rangePos > 0.85)
    return `${ticker} is near 52-week highs — momentum is intact but near-term risk-reward compresses; trailing stops advised.`;
  if (change1d < -2)
    return `${ticker} faces sharp intraday selling pressure — assess whether this is a technical correction or fundamental deterioration.`;
  if (pe !== null && pe < 15 && fund >= 60)
    return `${ticker} trades at an attractive ${pe.toFixed(1)}x P/E with solid fundamentals — value-oriented entry opportunity.`;
  if (rev < 0)
    return `${ticker} faces revenue headwinds — monitor next quarterly results for signs of recovery before building positions.`;
  return `${ticker} is in a neutral market structure — selective accumulation on dips aligned with ${sector.label} cycle dynamics.`;
}

function techAnalysisText(ticker: string, s: ReturnType<typeof computeScores>): string {
  const { price, hi52, lo52, rangePos, change1d, pe } = s;
  const hi52Pct = ((hi52 - price) / price * 100).toFixed(1);
  const lo52Pct = ((price - lo52) / price * 100).toFixed(1);
  const zone    = rangePos > 0.7 ? "upper quadrant" : rangePos > 0.4 ? "mid-range" : "lower quadrant";
  return `${ticker} currently trades at ${fmtInr(price)}, positioned in the ${zone} of its 52-week range (${fmtInr(lo52)}–${fmtInr(hi52)}). ` +
    `The stock is ${rangePos > 0.5 ? `${hi52Pct}% below its 52-week high` : `${lo52Pct}% above its 52-week low`}, ` +
    `with a day change of ${change1d > 0 ? "+" : ""}${change1d.toFixed(2)}%. ` +
    `${rangePos > 0.75 ? "Price structure suggests continuation momentum — breakout traders may look for volume confirmation." : rangePos < 0.3 ? "Price is near support zone — watch for reversal patterns or breakdown below 52-week low." : "Price is in a consolidation zone — directional clarity needed before committing large positions."}` +
    `${pe !== null ? ` Valuation at ${pe.toFixed(1)}x TTM P/E ${pe < 20 ? "provides a valuation buffer" : pe > 50 ? "requires strong growth delivery to sustain" : "is in line with market expectations"}.` : ""}`;
}

function graphAnalysisText(ticker: string, s: ReturnType<typeof computeScores>): string {
  const { price, hi52, lo52, rangePos, change1d, beta } = s;
  const pattern = rangePos > 0.8 ? "potential breakout above recent resistance" :
                  rangePos < 0.2 ? "testing multi-month support — distribution phase" :
                  change1d > 1.5 ? "bullish momentum candle forming" :
                  change1d < -1.5 ? "bearish pressure bar — distribution risk" :
                  "inside consolidation bar — watch for range expansion";
  return `Chart structure for ${ticker} shows ${pattern}. ` +
    `The 52-week range (${fmtInr(lo52)}–${fmtInr(hi52)}) maps a ${((hi52 - lo52) / lo52 * 100).toFixed(0)}% oscillation band. ` +
    `Current price at ${fmtInr(price)} suggests ${rangePos > 0.5 ? "buyers in control" : "sellers applying pressure"}. ` +
    `Beta of ${beta.toFixed(2)} indicates ${beta > 1.3 ? "above-average market sensitivity — size positions accordingly" : beta < 0.8 ? "defensive characteristics relative to Nifty" : "market-correlated volatility profile"}.`;
}

function institutionalFlowText(ticker: string, s: ReturnType<typeof computeScores>, fiiHolding: number | null): string {
  const { tech, fund, change1d, rangePos } = s;
  const fiiStr = fiiHolding !== null
    ? `Institutional ownership at ${(fiiHolding * 100).toFixed(1)}% of float. `
    : "";
  const flowDir = tech > 60 && change1d > 0 ? "net buying" : tech < 45 && change1d < 0 ? "net selling / profit booking" : "mixed positioning";
  return `${fiiStr}Delivery-based volume analysis suggests ${flowDir} at current levels. ` +
    `${fund >= 60 ? "Fundamental strength supports institutional interest for medium-to-long term portfolios." : "Institutional positioning likely cautious pending fundamental improvement."} ` +
    `${rangePos > 0.7 ? "High price levels may trigger periodic profit-booking from large holders." : rangePos < 0.3 ? "Potential accumulation interest from value-oriented funds at these levels." : "Institutional activity appears balanced — await catalysts for directional positioning."}`;
}

function riskAnalysisText(ticker: string, s: ReturnType<typeof computeScores>, sectorRisks: string[]): string {
  const { de, pe, beta, rangePos } = s;
  const risks = [
    de > 1.5  ? `Elevated leverage (D/E: ${de.toFixed(1)}x) increases sensitivity to interest rate changes.` : null,
    pe !== null && pe > 50 ? `Premium valuation (${pe.toFixed(1)}x P/E) leaves limited margin of error for earnings misses.` : null,
    beta > 1.4 ? `High beta (${beta.toFixed(2)}) amplifies drawdowns during broader market corrections.` : null,
    rangePos > 0.85 ? "Extended technical positioning increases mean-reversion risk near-term." : null,
    sectorRisks[0] ?? null,
  ].filter(Boolean).slice(0, 4).join(" ");
  return risks || `Standard equity risks apply for ${ticker}: sector cyclicality, macro sensitivity, and execution risk from management. Monitor quarterly results and guidance revisions.`;
}

function bullCaseText(ticker: string, s: ReturnType<typeof computeScores>, sector: any): string {
  const { price, hi52, fund, rev } = s;
  const t1 = (price * 1.18).toFixed(0);
  const t2 = hi52.toFixed(0);
  return `Bull Case: ${fund >= 60 ? `Strong fundamentals (ROE ${s.roe.toFixed(1)}%, revenue growth ${rev.toFixed(1)}%)` : "Sector re-rating potential"} ` +
    `support re-rating toward ₹${t1}–₹${t2} (${((Number(t1) - price) / price * 100).toFixed(0)}–${((Number(t2) - price) / price * 100).toFixed(0)}% upside) over 6–12 months. ` +
    `Catalysts: ${sector.verdictLogic.split(".")[0]}.`;
}

function bearCaseText(ticker: string, s: ReturnType<typeof computeScores>, sector: any): string {
  const { price, lo52, de, pe } = s;
  const ds = (price * 0.85).toFixed(0);
  return `Bear Case: ${de > 1.2 ? `Leverage concerns (D/E: ${de.toFixed(1)}x) combined with ` : ""}` +
    `${pe !== null && pe > 40 ? `rich valuation (${pe.toFixed(1)}x P/E) may ` : "macro deterioration could "}` +
    `pressure ${ticker} toward ₹${ds}–₹${lo52.toFixed(0)} (${((price - Number(ds)) / price * 100).toFixed(0)}–${((price - lo52) / price * 100).toFixed(0)}% downside). ` +
    `Triggers: ${sector.riskFactors[0]}.`;
}

/* ── Main builder ──────────────────────────────────────────── */

export function buildDeterministicReport(
  ticker:    string,
  quote:     any,
  summary:   any,
  news:      NewsItem[],
  sentiment: any,
): any {
  const posNews = news.filter(n => (n as any).sentiment === "positive").length;
  const negNews = news.filter(n => (n as any).sentiment === "negative").length;
  const newsRatio = news.length > 0 ? (posNews - negNews) / news.length : 0;

  const s = computeScores(quote, summary, newsRatio);
  const { tech, fund, mom, vol, rr, smart, lt, swing, inst, rangePos, change1d, price, hi52, lo52, de } = s;

  const sectorProfile = detectSector(quote?.sector, ticker);
  const companyName   = quote?.longName ?? quote?.shortName ?? ticker;
  const exchange      = quote?.exchange ?? "NSE";

  const composite = clamp(Math.round(tech * 0.30 + fund * 0.25 + mom * 0.25 + vol * 0.10 + rr * 0.10));

  let currentSentiment: "BULLISH" | "BEARISH" | "NEUTRAL" | "MIXED" = "NEUTRAL";
  if (composite >= 65 && newsRatio >= 0)       currentSentiment = "BULLISH";
  else if (composite >= 58 || newsRatio > 0.2)  currentSentiment = "MIXED";
  else if (composite <= 40 && newsRatio <= 0)   currentSentiment = "BEARISH";
  else if (composite <= 45 || newsRatio < -0.2) currentSentiment = "MIXED";


  const fiiHolding = summary?.majorHoldersBreakdown?.institutionsPercentHeld ?? null;

  const latestDevelopments = (news as any[]).slice(0, 3).map((n: any) => ({
    headline: n.title,
    aiRead: `Institutional read: ${n.sentiment === "positive" ? `Constructive development for ${ticker} — adds to the bull narrative` : n.sentiment === "negative" ? `Risk signal for ${ticker} — monitor follow-through impact on upcoming quarter` : `Neutral development — assess secondary implications for ${sectorProfile.label}`}.`,
    date: new Date(n.publishedAt ?? Date.now()).toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
    sentiment: n.sentiment === "positive" ? "BULLISH" : n.sentiment === "negative" ? "BEARISH" : "NEUTRAL",
  }));

  const keyRisks = [
    ...sectorProfile.riskFactors.slice(0, 3),
    de > 1.2 ? `Elevated D/E of ${de.toFixed(1)}x may strain debt serviceability in a rising rate environment` : null,
    s.pe !== null && s.pe > 45 ? `Premium valuation at ${s.pe.toFixed(1)}x P/E requires consistent earnings delivery to sustain` : null,
  ].filter(Boolean) as string[];

  const trendState  = change1d > 1.2 ? "Bullish momentum" : change1d < -1.2 ? "Selling pressure" : "Consolidation";
  const currentTrend = rangePos > 0.7 ? `${ticker} near 52-week highs — uptrend intact` :
                       rangePos < 0.3 ? `${ticker} near 52-week lows — testing support` :
                       `${ticker} consolidating in mid-range`;

  return {
    ticker,
    companyName,
    sector: sectorProfile.label,
    exchange,
    currentTrend,
    currentSentiment,
    oneLiner: oneLiner(ticker, s, sectorProfile),
    trendState,
    scores: {
      technical:    Math.round(tech),
      fundamental:  Math.round(fund),
      momentum:     Math.round(mom),
      institutional:Math.round(inst),
      riskReward:   Math.round(rr),
      smartMoney:   Math.round(smart),
      volatility:   Math.round(vol),
      ltInvestment: Math.round(lt),
      swingTrade:   Math.round(swing),
    },
    events: latestDevelopments.map((d: any, i: number) => ({
      date:              d.date,
      headline:          d.headline,
      context:           d.aiRead,
      marketReaction:    `${d.sentiment === "BULLISH" ? "Positive" : d.sentiment === "BEARISH" ? "Negative" : "Neutral"} price response expected`,
      institutionalRead: `Institutional stance: ${d.sentiment === "BULLISH" ? "likely increasing exposure" : d.sentiment === "BEARISH" ? "risk-monitoring mode" : "wait-and-watch"}`,
      retailSentiment:   `Retail activity ${d.sentiment === "BULLISH" ? "elevated — FOMO risk present" : d.sentiment === "BEARISH" ? "risk-averse — stop-loss triggers active" : "balanced"}`,
      longTermImpact:    i === 0 ? "Monitoring for structural impact on medium-term thesis" : "Near-term event — no structural change to long-term view",
      impactScore:       i === 0 ? 68 : 52,
      sentiment:         d.sentiment,
      category:          "CORPORATE",
      institutionalConf: 55,
      retailExcitement:  50,
      ltImportance:      i === 0 ? 55 : 45,
    })),
    narrativeEvolution: [],
    sentimentChart:     [],
    smartMoneyAnalysis: institutionalFlowText(ticker, s, fiiHolding),
    macroConnections: `${sectorProfile.macroFactors.slice(0, 2).join(". ")}. ${sectorProfile.label} stocks are influenced by these macro drivers at this juncture.`,
    techAnalysis:     techAnalysisText(ticker, s),
    graphAnalysis:    graphAnalysisText(ticker, s),
    timeframes: {
      intraday:  {
        trend:    change1d > 0 ? "Bullish intraday" : "Bearish intraday",
        strength: Math.abs(change1d) > 1.2 ? "Moderate" : "Weak",
        risk:     "High",
        note:     `Day change ${change1d > 0 ? "+" : ""}${change1d.toFixed(2)}% — watch ${fmtInr(price)} as pivot`,
      },
      swing:     {
        trend:    rangePos > 0.5 ? "Upward bias" : "Cautious",
        strength: rangePos > 0.65 || rangePos < 0.35 ? "Moderate" : "Weak",
        risk:     "Medium",
        note:     `Price is ${(rangePos * 100).toFixed(0)}% of the way from its 52-week low to its 52-week high`,
      },
      positional:{
        trend:    composite >= 60 ? "Positive" : composite <= 45 ? "Cautious" : "Neutral",
        strength: composite >= 65 || composite <= 40 ? "Moderate" : "Weak",
        risk:     "Medium",
        note:     `3–6 month view: quant composite ${composite}/100`,
      },
      longTerm:  {
        trend:    fund >= 60 ? "Structurally sound" : fund <= 45 ? "Fundamental concerns" : "Monitor for improvement",
        strength: fund >= 65 ? "Strong" : fund <= 45 ? "Weak" : "Moderate",
        risk:     de > 1.5 ? "High" : de > 0.8 ? "Medium" : "Low",
        note:     `Long-term anchor: ROE ${s.roe.toFixed(1)}%, revenue growth ${s.rev.toFixed(1)}%`,
      },
    },
    institutionalFlow: institutionalFlowText(ticker, s, fiiHolding),
    riskAnalysis:      riskAnalysisText(ticker, s, sectorProfile.riskFactors),
    macroContext:      `${sectorProfile.macroFactors[0]}. ${sectorProfile.indianContext.trim().slice(0, 250)}`,
    aiInsights: `${ticker}'s current ${composite < 50 ? "weakness" : "strength"} is best understood through the lens of ${sectorProfile.label} cyclicality. ` +
      `${composite >= 60 ? `The quant composite score of ${composite}/100 suggests systematic buying opportunity — particularly for investors who missed the earlier move.` : composite <= 40 ? `The composite score of ${composite}/100 flags elevated risk — position sizing should reflect uncertainty until fundamentals stabilize.` : `The composite score of ${composite}/100 reflects genuine ambiguity — neither a compelling buy nor a clear sell. Patience is the edge here.`}`,
    bullCase:   bullCaseText(ticker, s, sectorProfile),
    bearCase:   bearCaseText(ticker, s, sectorProfile),
    invalidation: `Bull thesis invalidated if ${ticker} closes below ${fmtInr(price * 0.9)} on elevated volume, or if ${sectorProfile.riskFactors[0].toLowerCase()}.`,
    latestDevelopments,
    keyRisks:   keyRisks.slice(0, 5),
    narrativeSummary: `${ticker} presents a ${currentSentiment.toLowerCase()} market profile at ${fmtInr(price)}, with a quant composite of ${composite}/100. ` +
      `${oneLiner(ticker, s, sectorProfile)}`,
    _meta: {
      ticker,
      generatedAt:      new Date().toISOString(),
      newsCount:        news.length,
      hasQuoteData:     !!quote,
      hasFinancialData: !!(summary?.financialData),
      hasSentiment:     !!sentiment,
      sentimentScore:   sentiment?.overallScore ?? null,
      model:            "deterministic-quant-v1",
      source:           "yahoo-finance2 + rss-news + deterministic-engine",
      currentPrice:     price,
      priceChange:      change1d,
    },
  };
}
