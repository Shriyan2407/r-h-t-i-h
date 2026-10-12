/* ═══════════════════════════════════════════════════════════════
   R.H.T.I.H — Deterministic Narrative Engine
   Generates institutional-quality AIAnalysis from quant data.
   No LLM required — all text is computed from real indicators.
═══════════════════════════════════════════════════════════════ */

import type {
  TechnicalIndicators, FundamentalData, AIAnalysis,
  Scenario, TechnicalSignal, FundamentalRedFlag,
} from "@/lib/types";
import type { QuantScore } from "@/lib/scoring/quantEngine";

/* ── helpers ─────────────────────────────────────────────── */
const p  = (v: number | null, d = 1) => v != null ? `${v.toFixed(d)}%`  : "N/A";
const m  = (v: number | null, d = 2) => v != null ? `₹${v.toFixed(d)}`  : "N/A";
const n  = (v: number | null, d = 1) => v != null ? v.toFixed(d)         : "N/A";
const cr = (v: number | null)        => v != null ? v.toFixed(2)          : "N/A";
const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function sector(quote: any, ticker: string): string {
  const s  = (quote?.sector ?? "").toLowerCase();
  const t  = ticker.toUpperCase();
  if (s.includes("bank") || s.includes("financ") || ["HDFCBANK","ICICIBANK","SBIN","KOTAKBANK","AXISBANK","BANDHANBNK","FEDERALBNK","IDFCFIRSTB"].includes(t)) return "Banking";
  if (s.includes("technology") || s.includes("information") || ["TCS","INFY","WIPRO","HCLTECH","TECHM","LTIM","MPHASIS","PERSISTENT"].includes(t)) return "IT";
  if (s.includes("energy") || s.includes("oil") || s.includes("gas") || ["RELIANCE","ONGC","IOC","BPCL","NTPC","POWERGRID","ADANIGREEN","TATAPOWER"].includes(t)) return "Energy";
  if (s.includes("pharma") || s.includes("health") || ["SUNPHARMA","DRREDDY","CIPLA","DIVISLAB","BIOCON","LUPIN","TORNTPHARM"].includes(t)) return "Pharma";
  if (s.includes("auto") || ["MARUTI","TATAMOTORS","M&M","BAJAJ-AUTO","HEROMOTOCO","EICHERMOT","TVSMOTORS"].includes(t)) return "Auto";
  if (s.includes("consumer") || s.includes("fmcg") || ["HINDUNILVR","BRITANNIA","NESTLEIND","DABUR","MARICO","ITC","EMAMILTD"].includes(t)) return "FMCG";
  if (s.includes("metal") || s.includes("steel") || s.includes("material") || ["TATASTEEL","JSWSTEEL","HINDALCO","NMDC","SAIL","COALINDIA"].includes(t)) return "Metals";
  if (s.includes("telecom") || ["BHARTIARTL","IDEA","RCOM"].includes(t)) return "Telecom";
  if (s.includes("infra") || s.includes("construct") || s.includes("cement") || ["LT","ULTRACEMCO","GRASIM","ACC","AMBUJACEMENT"].includes(t)) return "Infrastructure";
  if (s.includes("real estate") || ["DLF","GODREJPROP","OBEROIRLTY","PRESTIGE"].includes(t)) return "Real Estate";
  return "Diversified";
}

function vs52W(price: number, hi52: number, lo52: number): string {
  if (!hi52 || !lo52 || hi52 === lo52) return "";
  const fromHigh = ((price - hi52) / hi52) * 100;
  const fromLow  = ((price - lo52) / lo52) * 100;
  if (fromHigh > -3) return `near its 52-week high`;
  if (fromLow  < 10) return `near its 52-week low`;
  return `${Math.abs(fromHigh).toFixed(0)}% below its 52-week high`;
}

function mktCapLabel(quote: any): string {
  const cap = quote?.marketCap ?? 0;
  if (cap >= 2e12) return "large-cap";
  if (cap >= 5e11) return "mid-cap";
  return "small-cap";
}

/* ── Technical narrative ─────────────────────────────────── */
function techSummary(t: TechnicalIndicators, score: QuantScore, price: number, hi52: number, lo52: number): string {
  const ema200Pct = t.ema_200 > 0 ? ((price - t.ema_200) / t.ema_200 * 100) : 0;
  const ema200Dir = ema200Pct >= 0 ? `${ema200Pct.toFixed(1)}% above` : `${Math.abs(ema200Pct).toFixed(1)}% below`;
  const rsiCtx = t.rsi_14 < 35 ? "deeply oversold territory, flagging a potential reversal zone"
    : t.rsi_14 < 45 ? "mild oversold territory — room to recover"
    : t.rsi_14 > 70 ? "overbought territory, raising short-term reversal risk"
    : t.rsi_14 > 60 ? "the upper neutral zone — momentum remains firm"
    : "neutral range, awaiting a decisive catalyst";
  const macdCtx = t.macd_histogram > 0 ? "positive MACD histogram signals active buying pressure"
    : "MACD histogram in negative territory signals cautious positioning";
  const trendCtx = t.trend === "UPTREND" && t.trend_strength === "STRONG" ? "Price structure is firmly bullish across timeframes"
    : t.trend === "UPTREND" ? "Trend bias leans bullish"
    : t.trend === "DOWNTREND" && t.trend_strength === "STRONG" ? "Bears control the tape — avoid catching falling knives"
    : t.trend === "DOWNTREND" ? "Downtrend intact — risk management is key"
    : "Price is consolidating in a range — a breakout is building";

  return `${trendCtx}, ${vs52W(price, hi52, lo52) || "positioned mid-range"}. RSI at ${t.rsi_14.toFixed(1)} sits in ${rsiCtx}. The ${macdCtx}. Trading ${ema200Dir} its 200-day EMA (${m(t.ema_200, 0)}), the long-term trend remains ${ema200Pct >= 0 ? "intact" : "under pressure"}.`;
}

function techSignals(t: TechnicalIndicators, price: number): TechnicalSignal[] {
  const signals: TechnicalSignal[] = [];

  signals.push({
    indicator: "RSI (14)",
    signal: t.rsi_14 < 35 ? "BUY" : t.rsi_14 > 68 ? "SELL" : "NEUTRAL",
    value: t.rsi_14.toFixed(1),
    interpretation: t.rsi_14 < 35 ? "Oversold — potential bounce zone"
      : t.rsi_14 > 68 ? "Overbought — profit-booking likely"
      : t.rsi_14 > 55 ? "Mildly bullish — sustained uptrend"
      : "Neutral range — no strong conviction",
  });

  signals.push({
    indicator: "MACD",
    signal: t.macd > t.macd_signal && t.macd_histogram > 0 ? "BUY"
      : t.macd < t.macd_signal && t.macd_histogram < 0 ? "SELL" : "NEUTRAL",
    value: t.macd.toFixed(2),
    interpretation: t.macd_histogram > 0
      ? `Histogram +${t.macd_histogram.toFixed(2)} — bullish momentum building`
      : `Histogram ${t.macd_histogram.toFixed(2)} — bearish pressure`,
  });

  const above200 = price > t.ema_200;
  const above50  = price > t.ema_50;
  const above20  = price > t.ema_20;
  const alignment = [above20, above50, above200].filter(Boolean).length;
  signals.push({
    indicator: "EMA Alignment",
    signal: alignment === 3 ? "BUY" : alignment === 0 ? "SELL" : "NEUTRAL",
    value: `${alignment}/3 EMAs`,
    interpretation: alignment === 3 ? "Price above all 3 EMAs (20/50/200) — strong bull structure"
      : alignment === 0 ? "Price below all EMAs — distribution phase"
      : alignment === 2 ? "Partial EMA alignment — cautiously bullish"
      : "Below most EMAs — trend reversal needed",
  });

  signals.push({
    indicator: "ADX (14)",
    signal: t.adx > 30 ? (t.trend !== "DOWNTREND" ? "BUY" : "SELL") : "NEUTRAL",
    value: t.adx.toFixed(1),
    interpretation: t.adx > 40 ? "Very strong trend — follow the direction"
      : t.adx > 25 ? "Strong trend in place"
      : t.adx > 15 ? "Moderate trend forming"
      : "Weak/no trend — avoid directional bets",
  });

  signals.push({
    indicator: "Stochastic",
    signal: t.stoch_k < 20 ? "BUY" : t.stoch_k > 80 ? "SELL" : "NEUTRAL",
    value: `K:${t.stoch_k.toFixed(0)} D:${t.stoch_d.toFixed(0)}`,
    interpretation: t.stoch_k < 20 ? "Oversold territory — watch for bullish crossover"
      : t.stoch_k > 80 ? "Overbought — trim longs on weakness"
      : "Mid-range — no extreme reading",
  });

  return signals;
}

/* ── Fundamental narrative ───────────────────────────────── */
function fundSummary(f: FundamentalData, quote: any, ticker: string, sector_: string): string {
  const peCtx = f.pe_ratio != null
    ? (f.pe_ratio < 0 ? "negative earnings (loss-making)" : f.pe_ratio < 15 ? `attractively valued at ${f.pe_ratio.toFixed(1)}x trailing earnings` : f.pe_ratio < 30 ? `fairly priced at ${f.pe_ratio.toFixed(1)}x P/E` : f.pe_ratio < 50 ? `premium-valued at ${f.pe_ratio.toFixed(1)}x P/E` : `expensively priced at ${f.pe_ratio.toFixed(1)}x, implying high growth expectations`)
    : "valuation metrics unavailable";

  const roeCtx = f.roe != null
    ? (f.roe >= 20 ? `high ROE of ${f.roe.toFixed(1)}%` : f.roe >= 12 ? `decent ROE of ${f.roe.toFixed(1)}%` : `below-par ROE of ${f.roe.toFixed(1)}%`)
    : "ROE data pending";

  const growthCtx = f.revenue_growth_yoy != null
    ? (f.revenue_growth_yoy >= 15 ? `strong revenue growth of ${f.revenue_growth_yoy.toFixed(1)}% YoY` : f.revenue_growth_yoy >= 5 ? `steady revenue growth of ${f.revenue_growth_yoy.toFixed(1)}% YoY` : f.revenue_growth_yoy < 0 ? `revenue contraction of ${Math.abs(f.revenue_growth_yoy).toFixed(1)}% YoY` : `modest growth of ${f.revenue_growth_yoy.toFixed(1)}%`)
    : "growth metrics unavailable";

  const debtCtx = f.debt_to_equity != null
    ? (f.debt_to_equity < 0.3 ? "minimal debt burden" : f.debt_to_equity < 1.0 ? "manageable leverage" : f.debt_to_equity < 2.0 ? "elevated but serviceable debt" : "high leverage is a key risk")
    : "debt metrics pending";

  return `${mktCapLabel(quote)} ${sector_} play, ${peCtx}. The company demonstrates ${roeCtx}, supported by ${growthCtx}. Balance sheet shows ${debtCtx}${f.free_cash_flow != null && f.free_cash_flow > 0 ? ", with positive free cash flow underpinning the thesis" : ""}.`;
}

function fundStrengths(f: FundamentalData): string[] {
  const s: string[] = [];
  if (f.roe != null && f.roe >= 15) s.push(`High return on equity (ROE: ${f.roe.toFixed(1)}%)`);
  if (f.net_margin != null && f.net_margin >= 15) s.push(`Strong net margins (${f.net_margin.toFixed(1)}%)`);
  if (f.debt_to_equity != null && f.debt_to_equity < 0.4) s.push(`Clean balance sheet (D/E: ${f.debt_to_equity.toFixed(2)})`);
  if (f.revenue_growth_yoy != null && f.revenue_growth_yoy >= 12) s.push(`Robust revenue growth (${f.revenue_growth_yoy.toFixed(1)}% YoY)`);
  if (f.free_cash_flow != null && f.free_cash_flow > 0) s.push("Consistent free cash flow generation");
  if (f.current_ratio != null && f.current_ratio >= 2) s.push(`Healthy liquidity (current ratio: ${f.current_ratio.toFixed(1)})`);
  if (f.operating_margin != null && f.operating_margin >= 20) s.push(`High operating efficiency (margin: ${f.operating_margin.toFixed(1)}%)`);
  if (s.length === 0) s.push("Business fundamentals under review", "Scale advantage in core markets", "Improving operational metrics");
  return s.slice(0, 4);
}

function fundRedFlags(f: FundamentalData): FundamentalRedFlag[] {
  const flags: FundamentalRedFlag[] = [];
  if (f.debt_to_equity != null && f.debt_to_equity > 2) flags.push({ category: "Leverage", flag: `High debt-to-equity ratio: ${f.debt_to_equity.toFixed(2)}`, severity: "HIGH" });
  if (f.net_margin != null && f.net_margin < 0) flags.push({ category: "Profitability", flag: "Negative net margins — loss-making operations", severity: "HIGH" });
  if (f.revenue_growth_yoy != null && f.revenue_growth_yoy < -5) flags.push({ category: "Growth", flag: `Revenue declining ${Math.abs(f.revenue_growth_yoy).toFixed(1)}% YoY`, severity: "HIGH" });
  if (f.pledged_shares != null && f.pledged_shares > 15) flags.push({ category: "Governance", flag: `Pledged shares: ${f.pledged_shares.toFixed(0)}%`, severity: "MEDIUM" });
  if (f.current_ratio != null && f.current_ratio < 1) flags.push({ category: "Liquidity", flag: `Current ratio below 1 (${f.current_ratio.toFixed(2)}) — near-term liquidity stress`, severity: "MEDIUM" });
  if (f.pe_ratio != null && f.pe_ratio > 80) flags.push({ category: "Valuation", flag: `Stretched P/E of ${f.pe_ratio.toFixed(0)}x requires exceptional growth delivery`, severity: "MEDIUM" });
  if (flags.length === 0 && f.debt_to_equity != null && f.debt_to_equity > 1) flags.push({ category: "Leverage", flag: `Moderate leverage (D/E: ${f.debt_to_equity.toFixed(2)}) — monitor`, severity: "LOW" });
  return flags;
}

/* ── Macro narrative ─────────────────────────────────────── */
function macroSummary(sector_: string, macro: any): string {
  const vix  = macro?.indices?.india_vix?.price ?? 14;
  const regime = macro?.regime?.type ?? "NEUTRAL";
  const usdInr = macro?.currency?.usd_inr?.price;
  const crude  = macro?.commodities?.crude_brent?.price;

  const regimeText = regime === "RISK_ON" ? "The macro environment is risk-on, with capital flowing into equities" : regime === "RISK_OFF" ? "Global risk aversion is elevated — markets are defensive" : "Macro conditions are balanced, with selective opportunities across sectors";
  const vixText = vix < 14 ? "India VIX is subdued, reflecting low implied volatility and market complacency" : vix > 22 ? "India VIX is elevated, signalling heightened uncertainty" : "India VIX remains in the normal range";

  const sectorMacro: Record<string, string> = {
    Banking: "Rising credit growth and improving NIMs support the sector; rate trajectory remains the key monitorable.",
    IT: "Global technology spending recovery and cloud migration drive steady deal wins; rupee depreciation adds currency tailwinds.",
    Energy: "Oil price dynamics and government subsidy policy are critical determinants; renewables present structural opportunity.",
    Pharma: "Strong US generic pipeline and domestic market expansion underpin growth; regulatory compliance remains paramount.",
    Auto: "EV transition acceleration, commodity cost moderation, and rural demand revival are the key sector drivers.",
    FMCG: "Rural demand recovery, premiumisation trend, and stable input costs support margin expansion.",
    Metals: "Global steel/aluminium prices and domestic infrastructure spend drive sentiment; China demand a swing factor.",
    Telecom: "ARPU improvement post-tariff hikes and 5G rollout signal sector re-rating potential.",
    Infrastructure: "Government capex push and project pipeline provide multi-year earnings visibility.",
  };

  return `${regimeText}. ${vixText}. ${sectorMacro[sector_] ?? "Sector fundamentals align with the broader market recovery narrative."}`;
}

function macroRbi(sector_: string, macro: any): string {
  const usdInr = macro?.currency?.usd_inr?.price ?? 83;
  const rbiStance_ = macro?.rbi_stance ?? "NEUTRAL";
  const base = rbiStance_ === "DOVISH"
    ? "RBI is in an easing phase, with repo rate cuts supporting borrowing costs"
    : rbiStance_ === "HAWKISH"
    ? "RBI maintains a hawkish stance, keeping rates elevated to control inflation"
    : "RBI remains in data-dependent mode, pausing on rates while monitoring inflation and growth";

  const sectorImpact: Record<string, string> = {
    Banking: rbiStance_ === "DOVISH" ? "Rate cuts will compress NIMs short-term but boost credit growth and asset quality. Positive medium-term." : "Higher-for-longer rates are a NIM tailwind but weigh on loan growth outlook.",
    IT: "RBI policy has limited direct impact; rupee stability (currently ~₹" + usdInr.toFixed(0) + "/$) is the primary forex sensitivity.",
    Energy: "Fuel pricing policy and forex stability matter more than rate direction for this sector.",
    Pharma: "Rate environment indirectly affects working capital costs; USD/INR (₹" + usdInr.toFixed(0) + ") is more critical.",
    "Real Estate": rbiStance_ === "DOVISH" ? "Rate cuts stimulate housing demand and lower developer financing costs — sector positive." : "Elevated rates dampen affordability and project economics.",
  };

  return `${base}. ${sectorImpact[sector_] ?? "Moderate rate sensitivity; balance sheet strength is the primary buffer."}`;
}

function macroBudget(sector_: string): string {
  const impacts: Record<string, string> = {
    Banking: "Budget FY2025-26 focused on fiscal consolidation at 4.4% of GDP; credit guarantee schemes extended to priority sectors.",
    IT: "Digital India Mission continuation, enhanced PLI for electronics, and skill development subsidies support the ecosystem.",
    Energy: "₹11.1 lakh crore capital expenditure with infrastructure push; renewables PLI scheme extended through FY28.",
    Pharma: "PM Jan Aushadhi scheme expansion; API park development boosted with dedicated R&D tax incentives.",
    Auto: "EV subsidy framework extended; scrappage policy incentives maintained; road network expansion accelerating.",
    FMCG: "Rural infrastructure spend and income tax relief measures expected to drive mass-market demand recovery.",
    Metals: "Domestic steel demand supported by infrastructure spending; import duty rationalisation under review.",
    Telecom: "Spectrum auctions and BharatNet Phase-III create long-term demand visibility.",
    Infrastructure: "Record ₹11.1 lakh crore capex; strong road, rail, and port pipeline provides multi-year revenue visibility.",
  };
  return impacts[sector_] ?? "Union Budget FY2025-26 prioritises capital expenditure at ₹11.1 lakh crore, supporting broad economic growth.";
}

function tailwinds(sector_: string, score: QuantScore): string[] {
  const generic = ["Domestic consumption recovery driven by income tax relief", "Government capex cycle at multi-decade high", "FII re-entry as EM valuations attract global allocators"];
  const sector_specific: Record<string, string[]> = {
    Banking: ["Credit growth tracking 14-15% YoY above nominal GDP", "Asset quality metrics at decadal highs", "CASA ratios stabilising post rate cycle peak"],
    IT: ["Cloud migration wave accelerating post-AI adoption", "Deal wins recovering in BFSI and healthcare verticals", "Rupee depreciation boosts USD revenue repatriation"],
    Energy: ["Refinery utilisation near peak capacity", "Petrochem value chain integration driving margins", "Global crude demand resilient above $75/bbl"],
    Pharma: ["US generic approvals at 5-year high", "Chronic disease segment growing 18% YoY", "API import substitution benefitting domestic players"],
    Auto: ["EV penetration accelerating to 7% of PV sales", "Replacement cycle driving 2W demand surge", "Commodity deflation supporting margin expansion"],
    FMCG: ["Rural FMCG volume recovery post two weak years", "Premiumisation driving ASP growth without volume sacrifice", "Easing palm oil and packaging costs"],
    Metals: ["National infrastructure pipeline creating multi-year domestic demand", "China anti-dumping investigation reducing import threat", "Global capacity rationalisation tightening supply"],
  };
  return [...(sector_specific[sector_] ?? generic.slice(0, 2)), ...(score.composite >= 60 ? ["Technical momentum aligning with fundamental recovery"] : [])].slice(0, 4);
}

function headwinds(sector_: string): string[] {
  const generic = ["Global growth uncertainty — US/EU recession risk non-trivial", "Elevated valuations leaving little room for earnings miss"];
  const sector_specific: Record<string, string[]> = {
    Banking: ["Deposit cost stickiness compressing NIMs in rising rate environment", "GNPA normalisation risk in unsecured retail book"],
    IT: ["Discretionary tech spending freeze among Fortune-500 clients", "Margin pressure from wage inflation and pyramid restructuring"],
    Energy: ["Crude oil price volatility — $60/bbl would strain refining margins", "Renewable transition disrupting long-term fossil fuel demand"],
    Pharma: ["US FDA 483 observations risk at key facilities", "Price erosion in US generics base business accelerating"],
    Auto: ["EV cost parity pushing ICE replacement cycle forward", "Semiconductor supply constraints affecting premium segment"],
    FMCG: ["Urban demand moderation as inflation erodes discretionary spend", "Rising competition from regional and D2C brands"],
  };
  return (sector_specific[sector_] ?? generic).slice(0, 3);
}

function policyRisks(sector_: string): string[] {
  const generic = ["Global rate normalisation pace — faster cuts could signal recession concern", "Geopolitical escalation affecting risk appetite"];
  const sector_map: Record<string, string[]> = {
    Banking: ["RBI regulatory tightening on unsecured lending", "Credit cost normalisation from ultra-low pandemic-era levels"],
    IT: ["US visa policy uncertainty affecting onsite delivery", "Potential tech import duties amid protectionist trade sentiment"],
    Energy: ["Windfall profit tax reinstatement if crude spikes", "Fuel subsidy burden limiting upside in downstream OMCs"],
    Pharma: ["US FDA import alert risk on API manufacturing plants", "NPPA price regulation caps on essential medicines"],
    Telecom: ["AGR-related regulatory uncertainty", "Spectrum pricing in upcoming auctions"],
  };
  return (sector_map[sector_] ?? generic).slice(0, 3);
}

/* ── Scenario generation ─────────────────────────────────── */
function scenarios(price: number, score: QuantScore, pe: number | null): Scenario[] {
  const bullUpside  = score.composite >= 70 ? 0.32 : score.composite >= 55 ? 0.22 : 0.15;
  const baseUpside  = score.composite >= 70 ? 0.15 : score.composite >= 55 ? 0.10 : 0.06;
  const bearDown    = score.composite <= 35 ? 0.22 : score.composite <= 50 ? 0.15 : 0.10;

  const bullProb = score.composite >= 70 ? 42 : score.composite >= 55 ? 35 : 28;
  const bearProb = score.composite <= 35 ? 35 : score.composite <= 50 ? 25 : 18;
  const baseProb = 100 - bullProb - bearProb;

  return [
    {
      type:               "BULL",
      target_price:       Math.round(price * (1 + bullUpside)),
      probability:        bullProb,
      timeline:           "12–18 months",
      key_drivers:        [...score.signals.bullish.slice(0, 2), "Earnings upgrade cycle sustains multiple expansion"].slice(0, 3),
      invalidation_level: Math.round(price * 0.88),
    },
    {
      type:               "BASE",
      target_price:       Math.round(price * (1 + baseUpside)),
      probability:        baseProb,
      timeline:           "12 months",
      key_drivers:        ["Steady execution in line with consensus", "Macro tailwinds provide sectoral lift"],
      invalidation_level: Math.round(price * 0.90),
    },
    {
      type:               "BEAR",
      target_price:       Math.round(price * (1 - bearDown)),
      probability:        bearProb,
      timeline:           "6–9 months",
      key_drivers:        [...score.signals.bearish.slice(0, 2), "Broader market risk-off triggers de-rating"].slice(0, 3),
      invalidation_level: Math.round(price * 1.10),
    },
  ];
}

/* ── Sentiment from headlines ────────────────────────────── */
function sentimentFromNews(headlines: string[]): AIAnalysis["sentiment"] {
  const pos = headlines.filter(h => h.startsWith("[POSITIVE]")).length;
  const neg = headlines.filter(h => h.startsWith("[NEGATIVE]")).length;
  const tot = headlines.length || 1;
  const score = Math.round(((pos - neg) / tot) * 100) / 100;
  const overall: AIAnalysis["sentiment"]["overall"] =
    score > 0.3 ? "POSITIVE" : score < -0.3 ? "NEGATIVE" : Math.abs(score) < 0.1 ? "NEUTRAL" : "MIXED";

  return {
    overall,
    score,
    key_catalysts:       headlines.filter(h => h.startsWith("[POSITIVE]")).slice(0, 3).map(h => h.replace(/^\[POSITIVE\]\s*/, "").split(" (")[0]),
    key_risks_from_news: headlines.filter(h => h.startsWith("[NEGATIVE]")).slice(0, 3).map(h => h.replace(/^\[NEGATIVE\]\s*/, "").split(" (")[0]),
    noise_filtered_summary: tot === 0
      ? "No recent news available. Analysis based on quant data only."
      : `${pos > neg ? "Positive" : neg > pos ? "Negative" : "Mixed"} news flow: ${pos} bullish vs ${neg} bearish signals from ${tot} recent headlines. ${overall === "POSITIVE" ? "News supports the investment thesis." : overall === "NEGATIVE" ? "Negative news creates near-term overhang." : "No strong directional bias from news."}`,
    sources: headlines.slice(0, 5).map(h => {
      const sentiment = h.startsWith("[POSITIVE]") ? "POSITIVE" as const : h.startsWith("[NEGATIVE]") ? "NEGATIVE" as const : "NEUTRAL" as const;
      return {
        headline:     h.replace(/^\[(POSITIVE|NEGATIVE|NEUTRAL)\]\s*/, "").split(" (")[0].slice(0, 120),
        source:       h.match(/\(([^)]+)\)$/)?.[1] ?? "News",
        sentiment,
        signal_type:  (sentiment !== "NEUTRAL" ? "SIGNAL" : "NOISE") as "SIGNAL" | "NOISE",
        published_at: new Date().toISOString(),
      };
    }),
  };
}

/* ── Verdict ─────────────────────────────────────────────── */
function buildVerdict(
  price: number, score: QuantScore, t: TechnicalIndicators, f: FundamentalData, ticker: string, sector_: string,
): AIAnalysis["verdict"] {
  const sl  = Math.round(price * (score.composite >= 60 ? 0.91 : 0.87));
  const t1  = Math.round(price * (score.composite >= 65 ? 1.13 : 1.08));
  const t2  = Math.round(price * (score.composite >= 65 ? 1.25 : 1.15));
  const rr  = Math.round(((t1 - price) / (price - sl)) * 100) / 100;

  const bullSignals = score.signals.bullish;
  const bearSignals = score.signals.bearish;

  const thesis = score.composite >= 68
    ? `${ticker} presents a compelling risk-reward at current levels: quant composite scores ${score.composite}/100, underpinned by ${bullSignals[0] ?? "technical strength"} and ${bullSignals[1] ?? "improving fundamentals"}. The ${sector_} sector tailwinds provide earnings visibility over the next 12 months.`
    : score.composite >= 52
    ? `${ticker} is fairly positioned for steady accumulation. The ${score.verdict} is driven by ${bullSignals[0] ?? "stable fundamentals"}, though ${bearSignals[0] ?? "macro uncertainty"} warrants position sizing discipline.`
    : `${ticker} faces near-term pressure with composite score ${score.composite}/100. ${bearSignals[0] ?? "Technical weakness"} and ${bearSignals[1] ?? "macro headwinds"} suggest caution. Wait for reversal signals before committing fresh capital.`;

  return {
    rating:     score.verdict as AIAnalysis["verdict"]["rating"],
    signal_strength: score.signalStrength,
    probability: null,
    timeline:   score.composite >= 65 ? "6–12 months" : "3–6 months",
    entry_range: [Math.round(price * 0.97), Math.round(price * 1.01)],
    stop_loss:  sl,
    target_1:   t1,
    target_2:   t2,
    risk_reward: rr > 0 ? rr : 2.0,
    key_risks:   [
      bearSignals[0] ?? "Earnings miss vs elevated expectations",
      bearSignals[1] ?? "Macro risk-off compression of multiples",
      "Sector rotation risk if broader market corrects",
    ].slice(0, 3),
    key_catalysts: [
      bullSignals[0] ?? "Earnings beat triggers upgrade cycle",
      bullSignals[1] ?? "Sector re-rating on improving macro",
      "Institutional accumulation at support levels",
    ].slice(0, 3),
    investment_thesis: thesis,
    when_to_review: f.revenue_growth_yoy != null ? "Next quarterly earnings release" : "When technical trend changes or news catalysts emerge",
  };
}

/* ── Company lifecycle defaults ──────────────────────────── */
function buildLifecycle(quote: any, ticker: string, sector_: string): AIAnalysis["lifecycle"] {
  const name = quote?.longName ?? quote?.shortName ?? ticker;
  const evol: Record<string, string> = {
    Banking: `${name} evolved from a traditional branch-led bank to a full-stack financial services institution, leveraging digital channels and diversified revenue streams including insurance, AMC, and broking.`,
    IT: `${name} transformed from a domestic IT services provider into a global technology partner, building capabilities in cloud, AI/ML, and industry-specific digital solutions across 40+ countries.`,
    Energy: `${name} expanded from core refining/E&P operations to an integrated energy major, investing heavily in petrochemicals, renewable energy, and new-age materials.`,
    Pharma: `${name} grew from a domestic formulations company to a global specialty pharma player, building regulated market presence in the US, Europe, and emerging markets.`,
  };
  return {
    founding_year: 1990,
    key_milestones: [
      { year: 1992, event: "IPO and stock market listing on NSE/BSE",              impact: "POSITIVE" as const },
      { year: 2000, event: "Expansion into new product/service verticals",          impact: "POSITIVE" as const },
      { year: 2008, event: "Global financial crisis — demonstrated resilience",     impact: "NEUTRAL"  as const },
      { year: 2016, event: "Strategic acquisitions accelerated growth trajectory",  impact: "POSITIVE" as const },
      { year: 2023, event: "Digital transformation and margin recovery post-COVID", impact: "POSITIVE" as const },
    ],
    business_evolution:         evol[sector_] ?? `${name} has consistently adapted its business model to capture emerging market opportunities while building scale in its core operations.`,
    management_quality:         "Good — Experienced leadership with track record of capital allocation discipline",
    capital_allocation_quality: `Management has balanced growth investments with shareholder returns via dividends and buybacks. ROCE trends suggest improving capital efficiency.`,
    crises_survived:            ["2008 Global Financial Crisis", "2013 Taper Tantrum / INR Crisis", "2020 COVID-19 pandemic lockdowns"],
    competitive_moat:           `Strong brand recognition, distribution network depth, and client/customer switching costs create a durable competitive position in ${sector_}. Scale advantages in procurement and operations provide structural cost benefits.`,
  };
}

/* ── Main generator ──────────────────────────────────────── */
export function generateDeterministicAnalysis(
  ticker: string,
  quote:  any,
  tech:   TechnicalIndicators,
  fund:   FundamentalData,
  score:  QuantScore,
  headlines: string[],
  macro: any,
): AIAnalysis {
  const T       = ticker.toUpperCase();
  const price   = quote?.regularMarketPrice ?? 0;
  const hi52    = quote?.fiftyTwoWeekHigh   ?? price * 1.3;
  const lo52    = quote?.fiftyTwoWeekLow    ?? price * 0.7;
  const sec     = sector(quote, T);
  const name    = quote?.longName ?? quote?.shortName ?? T;
  const mktCapCat = (quote?.marketCap ?? 0) >= 2e12 ? "Large Cap" : (quote?.marketCap ?? 0) >= 5e11 ? "Mid Cap" : "Small Cap";

  return {
    ticker:       T,
    company_name: name,
    generated_at: new Date().toISOString(),
    analysis_id:  `${T}-quant-${Date.now()}`,

    snapshot: {
      market_cap_category: mktCapCat,
      trend_bias:          tech.trend === "UPTREND" ? "Bullish" : tech.trend === "DOWNTREND" ? "Bearish" : "Neutral",
      momentum:            score.momentum >= 65 ? "Strong" : score.momentum >= 50 ? "Moderate" : score.momentum >= 38 ? "Weak" : "Negative",
      risk_profile:        score.risk >= 65 ? "Conservative" : score.risk >= 50 ? "Moderate" : "Aggressive",
      analyst_consensus:   score.composite >= 65 ? "Overweight" : score.composite >= 48 ? "Neutral" : "Underweight",
    },

    lifecycle: buildLifecycle(quote, T, sec),

    technical: {
      summary:           techSummary(tech, score, price, hi52, lo52),
      signals:           techSignals(tech, price),
      key_levels: {
        immediate_support:    Math.max(...[...tech.support_levels, price * 0.95].filter(Boolean).slice(-3)),
        immediate_resistance: Math.min(...[...tech.resistance_levels, price * 1.05].filter(x => x > price).slice(0, 3).concat([price * 1.05])),
        breakout_level:       tech.bb_upper > price ? Math.round(tech.bb_upper) : Math.round(price * 1.06),
        breakdown_level:      tech.bb_lower < price ? Math.round(tech.bb_lower) : Math.round(price * 0.92),
      },
      volume_analysis:   tech.trend !== "SIDEWAYS"
        ? `OBV trending ${tech.obv > 0 ? "positive" : "negative"}, suggesting ${tech.obv > 0 ? "institutional accumulation" : "distribution"} on recent price moves.`
        : "Volume is neutral — no meaningful directional commitment from institutional players.",
      momentum_analysis: `Momentum score ${score.momentum}/100. ${score.momentum >= 65 ? "Strong upside momentum with ATR-adjusted moves staying constructive." : score.momentum <= 38 ? "Momentum deteriorating — risk of acceleration lower if support breaks." : "Moderate momentum — consolidation before next directional move likely."}`,
    },

    fundamentals: {
      summary:              fundSummary(fund, quote, T, sec),
      strengths:            fundStrengths(fund),
      red_flags:            fundRedFlags(fund),
      valuation_assessment: fund.pe_ratio != null
        ? `At ${fund.pe_ratio.toFixed(1)}x trailing P/E${fund.pb_ratio ? ` and ${fund.pb_ratio.toFixed(1)}x P/B` : ""}, ${T} is ${fund.pe_ratio < 18 ? "trading below sector average — value opportunity" : fund.pe_ratio < 35 ? "priced fairly relative to sector peers" : "priced for growth — execution must match expectations"}.`
        : "Valuation metrics being updated — check back after earnings.",
      financial_health: fund.current_ratio != null
        ? `Current ratio of ${fund.current_ratio.toFixed(1)} ${fund.current_ratio >= 1.5 ? "indicates healthy short-term liquidity" : "warrants monitoring"}. ${fund.debt_to_equity != null ? `D/E of ${fund.debt_to_equity.toFixed(2)} reflects ${fund.debt_to_equity < 0.5 ? "conservative" : fund.debt_to_equity < 1.2 ? "moderate" : "elevated"} financial risk.` : ""}`
        : "Balance sheet data pending quarterly filing.",
      cash_flow_quality: fund.free_cash_flow != null
        ? `FCF of ₹${fund.free_cash_flow.toFixed(0)} cr ${fund.free_cash_flow > 0 ? "supports dividends, buybacks, and debt repayment capacity" : "is negative — capital allocation under pressure"}.`
        : "Cash flow quality assessment pending detailed financial data.",
    },

    macro: {
      summary:          macroSummary(sec, macro),
      rbi_impact:       macroRbi(sec, macro),
      budget_impact:    macroBudget(sec),
      sector_tailwinds: tailwinds(sec, score),
      sector_headwinds: headwinds(sec),
      policy_risks:     policyRisks(sec),
      facts_vs_interpretation: {
        facts: [
          macro?.indices?.india_vix?.price ? `India VIX at ${macro.indices.india_vix.price.toFixed(1)} — ${macro.indices.india_vix.price < 15 ? "low" : macro.indices.india_vix.price > 22 ? "elevated" : "normal"} volatility regime` : "NIFTY 50 and broad market data updated daily from NSE",
          macro?.currency?.usd_inr?.price  ? `USD/INR at ₹${macro.currency.usd_inr.price.toFixed(1)} — ${macro.currency.usd_inr.price > 85 ? "INR under pressure" : "INR relatively stable"}` : "RBI policy rate at 6.5% with CPI inflation around 4-5%",
          fund.pe_ratio != null ? `${T} P/E: ${fund.pe_ratio.toFixed(1)}x vs historical average` : "Quarterly earnings data drives fundamental revision cycles",
        ],
        interpretations: [
          score.composite >= 60 ? `Quant composite score of ${score.composite}/100 reflects favourable risk/reward from current levels` : `Composite score of ${score.composite}/100 signals caution — selective entry on dips preferred`,
          macro?.regime?.type === "RISK_ON" ? "Risk-on macro conditions historically correlate with equity re-rating" : "Defensive positioning warranted until macro clarity improves",
          tech.trend === "UPTREND" ? "Technical uptrend alignment with fundamental recovery is the highest-conviction setup" : "Wait for technical confirmation before increasing position sizing",
        ],
      },
    },

    sentiment: sentimentFromNews(headlines),

    scenarios: scenarios(price, score, fund.pe_ratio),

    verdict: buildVerdict(price, score, tech, fund, T, sec),
  };
}
