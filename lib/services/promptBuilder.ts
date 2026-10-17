/* ═══════════════════════════════════════════════════════════════
   EquityLens — Sector-Aware Institutional Prompt Builder
   This is the intelligence core. Sector-specific frameworks
   ensure every stock receives fundamentally different analysis.
═══════════════════════════════════════════════════════════════ */

import type { NewsItem }       from "./newsAggregator";
import type { SentimentReport }from "./socialSentiment";

/* ── SECTOR INTELLIGENCE DATABASE ──────────────────────── */

interface SectorProfile {
  label:          string;
  yFSectors:      string[];          // Yahoo Finance sector strings that map here
  keyMetrics:     string[];          // What to track for this sector
  macroFactors:   string[];          // Macro drivers
  riskFactors:    string[];          // Structural risks
  framework:      string;            // How to think about this sector
  indianContext:  string;            // India-specific nuances
  verdictLogic:   string;            // How to form conviction
}

export const SECTOR_PROFILES: Record<string, SectorProfile> = {

  BANKING: {
    label: "Banking & Financial Services",
    yFSectors: ["Financial Services", "Banks", "Banking"],
    keyMetrics: [
      "Net Interest Margin (NIM) — the primary profitability driver",
      "CASA Ratio — indicates low-cost deposit franchise quality",
      "Credit Growth vs. System Growth — market share trajectory",
      "Gross NPA % and Net NPA % — asset quality health",
      "Slippage Ratio — leading indicator of future NPAs",
      "Capital Adequacy Ratio (CAR/CET1) — regulatory buffer",
      "Return on Assets (ROA) — operational efficiency",
      "Cost-to-Income Ratio — operating leverage",
    ],
    macroFactors: [
      "RBI Repo Rate — each 25 bps move impacts NIM by 8-15 bps",
      "Liquidity Adjustment Facility (LAF) — system-level liquidity",
      "Credit-Deposit ratio (currently ~80% — elevated historically)",
      "CPI Inflation trajectory — affects RBI policy timeline",
      "Government fiscal deficit — impacts bond yields and banking cost of funds",
      "US Fed policy — affects FII flows into Indian banking stocks",
    ],
    riskFactors: [
      "NPA cycle deterioration from over-leveraged retail borrowers",
      "Regulatory capital requirements (Basel III compliance)",
      "Deposit competition pressure driving up cost of funds",
      "Rate cut cycle compressing NIM on asset side",
      "HDFC Bank merger integration creating sector-wide comparison distortion",
    ],
    framework: `
BANKING ANALYSIS FRAMEWORK — MANDATORY SEQUENCE:
1. NIM first: Is it expanding (bullish), stable (neutral), or compressing (bearish)? What is driving it?
2. CASA quality: Higher CASA = lower deposit cost = structural advantage
3. Credit growth: Above-system growth = market share gain. Below-system = losing share.
4. Asset quality: Track slippage ratio (not just reported NPA). Rising slippage = future NPA problem.
5. Capital: Adequately capitalized stocks can grow without dilution.
6. Valuation: Private banks deserve 2.5-4x book, PSU banks 1-2x book. Premium justified by ROE differential.
RBI rate cycle is the macro anchor — banks perform best when rates are stable or falling.`,
    indianContext: `
India's banking sector is unique:
- RBI is omnipotent — a single rate decision can move banking stocks 5-8%
- CASA franchise quality separates permanent winners (HDFC, ICICI, Kotak) from the rest
- PSU banks carry 'government as promoter' risk — capital allocation can be politically driven
- Private credit penetration is still growing — India's credit/GDP at 56% vs 75%+ in developed markets
- FII holding in private banks is near maximum permissible — limits further FII buying upside
- Unsecured retail lending (credit cards, personal loans) growing 30%+ YoY — watch RBI intervention risk`,
    verdictLogic: `
For banks: STRONG BUY when NIM expanding + credit growth above system + asset quality stable + attractive valuation.
AVOID when NIM compressing + slippage rising + over-leveraged balance sheet.
The best bank to own at any given time: track which one is growing deposits fastest at the lowest cost.`,
  },

  IT: {
    label: "Technology / IT Services",
    yFSectors: ["Technology", "Information Technology", "IT Services"],
    keyMetrics: [
      "Deal Total Contract Value (TCV) — the single leading indicator",
      "Revenue Growth (constant currency — excludes FX noise)",
      "EBIT Margins — pricing power and execution quality",
      "Attrition Rate — talent cost driver and morale indicator",
      "Digital Revenue % — measures transformation from legacy",
      "Large Deal Wins (>$50M TCV) — platform credibility signal",
      "Headcount additions — demand confidence signal",
      "Days Sales Outstanding (DSO) — cash conversion quality",
    ],
    macroFactors: [
      "US GDP growth — IT spending is correlated 0.7x to US economic activity",
      "USD/INR exchange rate — each 1% INR depreciation = ~120 bps margin tailwind",
      "US Federal Reserve interest rates — higher rates reduce client IT capex budgets",
      "US banking sector health — BFSI is 30-35% of Indian IT revenue",
      "H-1B visa approval rates and costs — impacts onsite delivery cost structure",
      "EU macro conditions — Europe represents 25-32% of revenue for large caps",
    ],
    riskFactors: [
      "Generative AI automating ADM/maintenance work (20-30% of revenue at risk by 2027)",
      "US BFSI sector reducing discretionary IT spending (post-SVB ripple effects)",
      "Client budget freezes during US economic slowdowns",
      "Talent war causing wage inflation and margin compression",
      "INR appreciation scenario compressing rupee-denominated earnings",
      "Client concentration risk in specific verticals",
    ],
    framework: `
IT ANALYSIS FRAMEWORK — MANDATORY SEQUENCE:
1. US macro first: What is happening in US GDP, rates, and BFSI health? This drives 70% of the thesis.
2. Deal TCV: Is the pipeline growing? Large deal wins indicate structural demand health.
3. Guidance vs. reality: Has the company consistently beat guidance? If yes, credibility premium justified.
4. AI positioning: Is the company a disruption victim or transformation partner? Track AI-labeled TCV.
5. Margins: Sustainable 20%+ margins = pricing power. Margin guidance cuts = warning sign.
6. Valuation: IT companies deserve 20-30x PE during growth cycles, 15-20x during slowdowns.
REMEMBER: Indian IT is a derivative play on the US economy. Always start there.`,
    indianContext: `
Indian IT is globally unique in its business model:
- 75-85% revenue from US/EU clients with delivery from India
- India's time zone + English proficiency + STEM talent = structural cost advantage
- The 'Great Attrition' of 2021-22 showed talent is the primary cost variable
- TCS, Infy, Wipro behave differently: TCS = defensive quality, Infy = execution risk, Wipro = recovery story
- HCL Tech's product/engineering mix makes it the best positioned for AI era
- Midcap IT (Coforge, LTIM, Persistent) have better growth rates but higher client concentration risk
- Gen AI is the binary event: it either automates away margins or creates massive transformation deals`,
    verdictLogic: `
BUY when: US economy recovering + deal TCV accelerating + guidance being raised + valuation below historical mean.
AVOID when: Guidance cuts + US recession fears + AI disruption narrative gaining traction without AI deal wins.
The most reliable signal: Large deal TCV trend over 4 quarters. Rising = buy. Falling = caution.`,
  },

  ENERGY: {
    label: "Oil, Gas & Energy",
    yFSectors: ["Energy", "Oil & Gas"],
    keyMetrics: [
      "Gross Refining Margin (GRM) — measures refinery profitability",
      "Singapore Complex GRM — global benchmark for Asian refineries",
      "E&P Production Volumes (BOE/day) — upstream output",
      "Replacement Cost of Reserves — long-term asset value",
      "Gas realization prices — for gas-heavy companies",
      "Marketing margins on petrol/diesel — for PSU OMCs",
      "Petrochemical spread — O2C downstream profitability",
      "Debt-to-EBITDA — leverage management",
    ],
    macroFactors: [
      "Brent crude oil price — primary driver for all energy companies",
      "Singapore GRM — refinery margin benchmark (Indian refiners earn this ± premium/discount)",
      "OPEC+ production decisions — supply-side price management",
      "USD/INR — India imports 85% of crude in USD, so rupee depreciation = higher input costs",
      "US strategic petroleum reserve (SPR) releases — dampens price spikes",
      "Global economic growth (China PMI) — demand indicator for energy",
    ],
    riskFactors: [
      "Crude above $90-100 destroying Indian consumption demand",
      "Government price control on auto fuel capping marketing margins",
      "GRM compression from new global refining capacity additions",
      "Energy transition reducing long-term fossil fuel demand",
      "ESG capital exits reducing institutional ownership",
      "Russia-Ukraine ceasefire normalizing discounted crude premiums",
    ],
    framework: `
ENERGY ANALYSIS FRAMEWORK:
For Refiners (IOC, BPCL, HPCL): Track Singapore GRM + India marketing margins. GRM above $10 = healthy.
For E&P (ONGC, Oil India): Production volume + realization price. APM pricing limits upside but ensures stable returns.
For Reliance Industries: O2C is the background business; Jio + Retail drive 70% of narrative.
For Gas (GAIL, Petronet): Volume throughput + gas price spread. Domestic gas production growth is key.
OIL = ₹ income + $ costs: Currency matters enormously. Hedging status is worth checking.`,
    indianContext: `
India's energy sector has unique characteristics:
- India imports 85% of crude oil — highly sensitive to global prices AND INR/USD
- PSU OMCs (IOC, BPCL, HPCL) are subject to government price control — cannot fully pass crude spikes to consumers
- ONGC's production is declining — it's a value stock, not a growth story
- Reliance's O2C at Jamnagar is the world's largest single-location refinery — unique pricing power
- New energy (solar, wind, green hydrogen) is the structural transition story — Adani Green, Renew Power
- Government's 'energy security' agenda means PSU energy companies are never allowed to fail`,
    verdictLogic: `
BUY refiners when: Brent $75-85 (sweet spot) + GRM above $8 + stable INR + retail margin positive.
AVOID refiners when: Crude above $90 + government likely to force price caps + GRM below $5.
For Reliance: ignore O2C and trade on Jio ARPU + Retail EBITDA trajectory.`,
  },

  PHARMA: {
    label: "Pharmaceuticals & Healthcare",
    yFSectors: ["Healthcare", "Pharmaceuticals", "Biotechnology"],
    keyMetrics: [
      "USFDA ANDA filings and approvals — US pipeline health",
      "US business revenue and growth — primary value driver",
      "Domestic formulation growth — secondary stable revenue base",
      "Active USFDA Warning Letters/Import Alerts — red flags",
      "Complex generics pipeline (injectables, inhalers, biosimilars)",
      "R&D expense as % of revenue — innovation investment",
      "API business margins — for backward-integrated players",
      "Patent litigation exposure — risk for branded generic players",
    ],
    macroFactors: [
      "USD/INR — pharma companies earn 60-80% revenue in USD",
      "USFDA inspection schedule and outcomes — regulatory calendar",
      "US generic drug pricing trends — industry-level pricing pressure",
      "China API supply chain — India imports significant API from China",
      "Indian domestic healthcare spending — growing 12-15% annually",
      "National Pharmaceutical Pricing Authority (NPPA) price controls",
    ],
    riskFactors: [
      "USFDA Warning Letter or Import Alert — can halt US shipments",
      "US generic price erosion (averaging -8 to -12% annually)",
      "Loss of patent cliff opportunities as competitors enter",
      "API sourcing disruption from China supply chain issues",
      "NPPA price capping on essential drugs limiting domestic growth",
      "Clinical trial failures for specialty pipeline",
    ],
    framework: `
PHARMA ANALYSIS FRAMEWORK:
USFDA regulatory track record is THE primary screen. A company with clean regulatory history deserves premium.
Then: US generic pipeline (ANDA count + complex generics proportion) + domestic formulation market position.
For Sun Pharma: specialty US business (Ilumya, Cequa) is the re-rating catalyst, track its growth.
For Divi's Labs: API quality and margins. No US regulatory risk but exposed to pricing pressure.
For Dr. Reddy's: US generics + domestic + Russia/CIS business mix.
IMPORTANT: Any USFDA observation (483) or warning letter immediately re-check the fundamentals.`,
    indianContext: `
India is the global pharmacy — exports $27B in pharmaceuticals, 20% of global generics by volume.
The USFDA is the most powerful external force in Indian pharma — one warning letter can wipe 20% off a stock.
Indian pharma companies have a structural advantage in injectable generics, semi-synthetic APIs, and biosimilars.
The domestic market is growing but price-controlled — margins are lower than exports.
Promoter-heavy companies (Sun Pharma's Dilip Shanghvi, Divi's Labs) have shown superior capital allocation.
The next big wave: biosimilars and complex drug delivery systems (inhalers, transdermal patches).`,
    verdictLogic: `
BUY when: Clean USFDA track record + strong US pipeline launches + domestic double-digit growth + attractive valuation.
AVOID immediately when: USFDA Warning Letter received — wait for resolution before re-entry.
ACCUMULATE on regulatory dips when: Warning letter resolved + management credibility intact + pipeline remains strong.`,
  },

  DEFENSE: {
    label: "Defense & Aerospace",
    yFSectors: ["Industrials", "Aerospace & Defense"],
    keyMetrics: [
      "Order Book expressed in 'years of revenue' — key visibility metric",
      "Order Inflow Quarterly — leading indicator of future revenue",
      "Revenue per employee — operational efficiency",
      "Export order proportion — diversification beyond government",
      "Indigenization % — reduces import dependency risk",
      "Margin profile — typically 15-25% for quality defense companies",
      "Government Defense Budget allocation — macro driver",
      "DRDO technology transfer pipeline",
    ],
    macroFactors: [
      "Government defense budget (₹6.2 lakh cr in FY25) — primary driver",
      "Geopolitical tensions (India-China, India-Pakistan) — urgency signal",
      "Atmanirbhar Bharat defense policy — structural tailwind for domestic players",
      "Defense export target ($5B by 2025) — export order flow",
      "US-India defense cooperation (iCET, INDUS-X) — technology access",
      "SIPRI global military spending data — global context",
    ],
    riskFactors: [
      "Order execution delays (defense projects are notoriously delayed in India)",
      "Technology transfer challenges for complex weapons systems",
      "Critical component import dependency (engines for HAL, semiconductors for BEL)",
      "Budget compression in deficit years",
      "Single-customer (Ministry of Defence) concentration risk",
      "Competition from newly approved private defense companies (L&T, Tata Advanced Systems)",
    ],
    framework: `
DEFENSE ANALYSIS FRAMEWORK:
Order book depth is THE primary signal. Calculate as: Order Book ÷ Annual Revenue = years of visibility.
HAL at 5x revenue in order book = 5 years of revenue visibility. This is the safety anchor.
Then: Order inflow trend (quarterly data) — rising inflow = accelerating narrative.
Margin sustainability: Defense margins are sticky but capped by government negotiation.
Export orders are premium-valued: they demonstrate technology credibility beyond India.
HAL is unique: it's an oligopoly with no competition for large military aircraft maintenance in India.`,
    indianContext: `
India is transitioning from world's largest defense importer to a growing exporter.
The Atmanirbhar Bharat defense initiative has a 15-20 year structural runway.
Key beneficiaries: HAL (aircraft + helicopters), BEL (electronics systems), Cochin Shipyard (naval vessels), MTAR (precision components).
HAL's key risk: engine dependency on Russian/Ukrainian suppliers post-2022 creates supply chain vulnerability.
India's defense exports grew from $1.5B in FY21 to $2.1B in FY24 — still tiny but directionally very positive.
The private sector opening (L&T, Tata, Mahindra) adds competition but also capacity — net positive for the ecosystem.`,
    verdictLogic: `
BUY when: Order book > 4x revenue + quarterly order inflow accelerating + geopolitical tensions elevated + budget allocation increasing.
This is a long-duration story — trade on order book momentum, not quarterly earnings.`,
  },

  PSU: {
    label: "Public Sector Undertakings",
    yFSectors: ["Utilities", "Industrials", "Energy", "Financial Services"],
    keyMetrics: [
      "Government capex disbursement rate — primary revenue driver",
      "Order book (for infra PSUs) — revenue visibility",
      "Dividend yield — return of capital signal",
      "Debt-to-equity — balance sheet health",
      "Return on equity — capital efficiency despite government constraints",
      "Regulated equity growth (for utilities) — predictable compounding",
      "Capacity addition pipeline — for power and infra PSUs",
    ],
    macroFactors: [
      "Union Budget capital expenditure allocation — the single most important number",
      "Government fiscal deficit — determines ability to fund capex",
      "Infrastructure sector policy (NIP, NITI Aayog roadmap)",
      "Power demand growth (correlated with GDP and industrial activity)",
      "Railway electrification and modernization pace",
      "Disinvestment programme — stake sale announcement = downside risk",
    ],
    riskFactors: [
      "Government stake disinvestment announcement — creates supply overhang",
      "Capital allocation for political objectives (Urjit debt waiver, farm loan forgiveness)",
      "Regulatory price control limiting pricing power",
      "Competition from private sector in previously protected domains",
      "Management quality constrained by IAS/bureaucratic system",
      "Budget year elections reducing capex effectiveness",
    ],
    framework: `
PSU ANALYSIS FRAMEWORK:
Always start with the Union Budget — PSU stocks are essentially 'government capex derivatives'.
The budget speech directly impacts PSU stocks on announcement day.
Track actual capex disbursement vs. budgeted — under-spending is bearish, over-spending is bullish.
Dividend yield provides a floor: PSUs with 3%+ yields attract income capital.
The 'PSU premium' trade: when government reforms/disinvestment intent is strong, PSU discounts compress.
IRFC is unique: it funds railway capex and is essentially a bond proxy with equity upside.`,
    indianContext: `
India's PSU stocks have a distinct market dynamic:
- LIC is the largest PSU investor — its buying stabilizes prices during FII selling
- Budget speech is the 'earnings call' for PSU stocks — monitor allocation changes
- PSU banks trade at 1-2x book vs. 3-4x for private banks — the PSU governance discount
- IRCTC is unique among PSUs: monopoly + no government price control on premium segment
- Coal India offers 7%+ dividend yield — functions like a high-yield quasi-bond
- NTPC's RE capacity addition is the new growth narrative layered on stable thermal base`,
    verdictLogic: `
BUY PSUs when: Government is in capex expansion mode + fiscal deficit is under control + no disinvestment risk.
AVOID when: Budget cuts capex allocation + disinvestment announcement imminent + private competition enters sector.
Best trade: Buy 2-3 months before Budget if signals suggest infra push. Sell on Budget day spike.`,
  },

  TELECOM: {
    label: "Telecommunications",
    yFSectors: ["Communication Services", "Telecom Services"],
    keyMetrics: [
      "Average Revenue Per User (ARPU) — the single most important metric",
      "Data consumption per user (GB/month) — demand health",
      "Subscriber base (net adds/churns) — growth momentum",
      "5G site rollout pace — infrastructure investment",
      "EBITDA margin — pricing power minus network costs",
      "Debt levels — balance sheet risk",
      "Home broadband subscribers — next growth vector",
      "Enterprise/B2B revenue — premium segment diversification",
    ],
    macroFactors: [
      "Government spectrum policy and auction prices — capex burden",
      "TRAI tariff regulation — limits pricing power",
      "5G rollout timeline and ROI visibility",
      "Africa operations currency risk (for Airtel Africa)",
      "Digital India government push — benefits enterprise business",
      "Consumer spending patterns — discretionary vs. essential",
    ],
    riskFactors: [
      "TRAI tariff intervention limiting ARPU expansion",
      "Vodafone India competitive revival (unlikely but possible)",
      "5G ROI taking longer than expected",
      "Africa currency devaluation impacting Airtel Africa earnings",
      "Spectrum renewal costs at elevated prices",
    ],
    framework: `
TELECOM ANALYSIS FRAMEWORK:
ARPU is everything. Track it quarterly like a hawk. ₹10 ARPU increase = ~₹21,000 cr annualized revenue for Airtel.
Industry has consolidated from 7 players to 3 — pricing power has returned permanently.
5G question: is it monetized yet? Currently infrastructure cost without revenue — timeline matters.
Home broadband (JioAirFiber, Airtel Xstream) is the NEXT ARPU unlock after mobile.
Enterprise business (cloud, IoT, security) is the HIGH-MARGIN vector that's underanalyzed.`,
    indianContext: `
Indian telecom had the most dramatic consolidation in global telco history — Jio killed 4+ operators in 3 years.
The 3-player oligopoly (Jio, Airtel, Vodafone) has pricing power that most other markets lack.
Indian ARPU at ₹193 is still 60-70% below comparable markets — massive headroom for ARPU expansion.
Jio and Airtel are now MORE than telcos — they're becoming 'digital platforms' with media, cloud, fintech.`,
    verdictLogic: `
BUY Airtel when: ARPU trajectory is positive + 5G network quality differentiating vs. Jio + debt reducing.
The single best indicator: quarterly ARPU direction. Rising = buy more. Declining = re-examine thesis.`,
  },

  AUTO: {
    label: "Automobiles & Auto Ancillaries",
    yFSectors: ["Consumer Cyclical", "Auto Manufacturers", "Automotive"],
    keyMetrics: [
      "Monthly wholesale volumes (units sold to dealers)",
      "Retail sales (vehicles delivered to end customers — better demand signal)",
      "Average Selling Price (ASP) — mix improvement indicator",
      "EBITDA margin — pricing + commodity cost management",
      "EV volume % and EV EBITDA contribution",
      "Rural vs. urban demand split (monsoon sensitivity)",
      "Market share within segment",
      "Commodity cost outlook (steel, aluminium, copper)",
    ],
    macroFactors: [
      "India GDP growth and per capita income — auto demand correlates strongly",
      "Interest rates — auto loans financed at 70%+; rate cuts boost affordability",
      "Fuel prices — diesel economics affect CV demand, petrol affects PV sentiment",
      "Monsoon performance — rural income, 2W demand proxy",
      "Government FAME scheme subsidies for EVs",
      "China EV competitive threat (BYD entry, etc.)",
    ],
    riskFactors: [
      "EV transition disrupting ICE incumbents' installed base advantage",
      "Commodity cost surge compressing margins",
      "Rural demand slowdown (drought, farmer distress)",
      "Competition from new entrants (Ola Electric, Tata EV)",
      "Component supply chain issues (semiconductors, displays)",
    ],
    framework: `
AUTO ANALYSIS FRAMEWORK:
Segment matters: 2W = rural India proxy, PV = urban middle class, CV = industrial/infrastructure cycle.
Volume trajectory first, then ASP mix improvement, then margin. In that order.
EV is the structural risk for ICE players AND structural opportunity for EV-ready ones.
Tata Motors is really two stocks: JLR (premium global) + India EV (growth). Value accordingly.
Maruti is the India middle-class consumption play — safest but slowest EV transition.
M&M has the best EV SUV positioning — benefits from both farm equipment AND SUV demand cycles.`,
    indianContext: `
India is 3rd largest auto market globally but hugely under-penetrated (30 cars/1000 people vs 800 in US).
Festival season (Navratri to Diwali) drives 35-40% of annual 2W sales — track festival season closely.
BS6 emission standards elevated vehicle prices 8-12% — one-time headwind now absorbed.
GST rate rationalization on EVs (5%) vs ICE (28%) creates massive structural cost advantage for EV.
Premiumization is a dominant trend — ASP improvement is more important than volume for margin expansion.`,
    verdictLogic: `
BUY auto when: Volume growth + ASP mix improving + commodity costs falling + EV portfolio positioned.
AVOID when: Rural distress + commodity spike + EV transition taking share without margin contribution.`,
  },
};

/* ── SECTOR DETECTOR ────────────────────────────────────── */

export function detectSector(yFSector?: string, ticker?: string): SectorProfile {
  const t = (ticker ?? "").toUpperCase();
  const s = (yFSector ?? "").toLowerCase();

  // Ticker-based hard overrides (most reliable)
  const BANKING_TICKERS  = ["HDFCBANK","ICICIBANK","SBIN","KOTAKBANK","AXISBANK","INDUSINDBK","BANDHANBNK","IDFCFIRSTB","PNB","CANARABANK","UNIONBANK"];
  const IT_TICKERS       = ["TCS","INFY","WIPRO","HCLTECH","TECHM","MPHASIS","LTIM","COFORGE","PERSISTENT","HEXAWARE"];
  const ENERGY_TICKERS   = ["RELIANCE","ONGC","IOC","BPCL","HINDPETRO","GAIL","PETRONET","OIL","MRPL"];
  const PHARMA_TICKERS   = ["SUNPHARMA","DRREDDY","CIPLA","DIVISLAB","LUPIN","TORNTPHARM","ALKEM","IPCA","AUROPHARMA"];
  const DEFENSE_TICKERS  = ["HAL","BEL","MTAR","COCHINSHIP","MAZDOCK","DATA","PARAS","SOLARINDS","BHEL"];
  const TELECOM_TICKERS  = ["BHARTIARTL","AIRTELAFRI","IDEA","MTNL","TATACOMM","HFCL"];
  const AUTO_TICKERS     = ["TATAMOTORS","MARUTI","BAJAJ-AUTO","EICHERMOT","HEROMOTOCO","M&M","ASHOKLEY","BOSCHLTD","SONA-BLW","MOTHERSON"];
  const PSU_TICKERS      = ["NTPC","POWERGRID","IRFC","RVNL","IRCTC","COALINDIA","NHPC","RECLTD","PFC","HUDCO","IRCON","RITES","NBCC"];

  if (BANKING_TICKERS.includes(t))  return SECTOR_PROFILES.BANKING;
  if (IT_TICKERS.includes(t))       return SECTOR_PROFILES.IT;
  if (ENERGY_TICKERS.includes(t))   return SECTOR_PROFILES.ENERGY;
  if (PHARMA_TICKERS.includes(t))   return SECTOR_PROFILES.PHARMA;
  if (DEFENSE_TICKERS.includes(t))  return SECTOR_PROFILES.DEFENSE;
  if (TELECOM_TICKERS.includes(t))  return SECTOR_PROFILES.TELECOM;
  if (AUTO_TICKERS.includes(t))     return SECTOR_PROFILES.AUTO;
  if (PSU_TICKERS.includes(t))      return SECTOR_PROFILES.PSU;

  // Yahoo Finance sector string fallback
  if (s.includes("financial") || s.includes("bank"))  return SECTOR_PROFILES.BANKING;
  if (s.includes("technolog") || s.includes("softw")) return SECTOR_PROFILES.IT;
  if (s.includes("energy") || s.includes("oil"))      return SECTOR_PROFILES.ENERGY;
  if (s.includes("health") || s.includes("pharma"))   return SECTOR_PROFILES.PHARMA;
  if (s.includes("communic") || s.includes("telecom"))return SECTOR_PROFILES.TELECOM;
  if (s.includes("consumer") || s.includes("auto"))   return SECTOR_PROFILES.AUTO;
  if (s.includes("util") || s.includes("industri"))   return SECTOR_PROFILES.PSU;

  // Default: return a generic profile
  return {
    label:         "Diversified / Unknown",
    yFSectors:     [],
    keyMetrics:    ["Revenue growth", "Operating margins", "Return on equity", "Debt levels", "Free cash flow"],
    macroFactors:  ["RBI policy rate", "INR/USD exchange rate", "India GDP growth", "FII/DII flow trends"],
    riskFactors:   ["Sector-specific regulatory risk", "Management execution risk", "Balance sheet leverage"],
    framework:     "Analyze fundamentals first: revenue growth trajectory, margin sustainability, balance sheet quality. Then macro sensitivity. Then technical structure.",
    indianContext: "Indian equities operate in a unique context: retail FOMO cycles are more extreme, promoter holding signals matter, FII flows dominate price discovery in large caps.",
    verdictLogic:  "Form view based on: (1) fundamental quality, (2) valuation vs. growth rate, (3) technical structure, (4) macro headwinds/tailwinds.",
  };
}

/* ── COMPREHENSIVE PROMPT BUILDER ───────────────────────── */

interface PromptContext {
  ticker:       string;
  quote:        any;
  summary:      any;
  news:         NewsItem[];
  sentiment:    SentimentReport | null;
}

export function buildInstitutionalPrompt(ctx: PromptContext): string {
  const { ticker, quote, summary, news, sentiment } = ctx;

  /* Detect sector */
  const sector = detectSector(quote?.sector, ticker);

  /* ── Financial data block ── */
  const priceBlock = quote ? `
Stock: ${quote.longName ?? quote.shortName ?? ticker} (${ticker})
Current Price: ₹${quote.regularMarketPrice?.toFixed(2) ?? "N/A"}
Day Change: ${quote.regularMarketChangePercent?.toFixed(2) ?? "N/A"}%
52-Week High: ₹${quote.fiftyTwoWeekHigh?.toFixed(2) ?? "N/A"}
52-Week Low: ₹${quote.fiftyTwoWeekLow?.toFixed(2) ?? "N/A"}
Volume vs 3M Avg: ${quote.regularMarketVolume && quote.averageVolume3Month ? ((quote.regularMarketVolume / quote.averageVolume3Month) * 100).toFixed(0) + "%" : "N/A"}
Market Cap: ${quote.marketCap ? `₹${(quote.marketCap / 1e12).toFixed(2)} Trillion` : "N/A"}
P/E Ratio (TTM): ${quote.trailingPE?.toFixed(1) ?? "N/A"}
Forward P/E: ${quote.forwardPE?.toFixed(1) ?? "N/A"}
Price/Book: ${quote.priceToBook?.toFixed(2) ?? "N/A"}
Dividend Yield: ${quote.dividendYield ? (quote.dividendYield * 100).toFixed(2) + "%" : "N/A"}
Beta: ${quote.beta?.toFixed(2) ?? "N/A"}
Exchange: ${quote.exchange ?? "NSE"}
Yahoo Finance Sector: ${quote.sector ?? "N/A"}`.trim() : `Ticker: ${ticker} — Price data unavailable`;

  const profileBlock = summary?.assetProfile ? `
Business Summary: ${summary.assetProfile.longBusinessSummary?.slice(0, 500) ?? "N/A"}
Industry: ${summary.assetProfile.industry ?? "N/A"}
Employees: ${summary.assetProfile.fullTimeEmployees?.toLocaleString("en-IN") ?? "N/A"}`.trim() : "";

  const financialsBlock = summary?.financialData ? `
Revenue Growth (YoY): ${((summary.financialData.revenueGrowth ?? 0) * 100).toFixed(1)}%
Gross Margin: ${((summary.financialData.grossMargins ?? 0) * 100).toFixed(1)}%
Operating Margin: ${((summary.financialData.operatingMargins ?? 0) * 100).toFixed(1)}%
Profit Margin: ${((summary.financialData.profitMargins ?? 0) * 100).toFixed(1)}%
Return on Equity: ${((summary.financialData.returnOnEquity ?? 0) * 100).toFixed(1)}%
Return on Assets: ${((summary.financialData.returnOnAssets ?? 0) * 100).toFixed(1)}%
Debt/Equity Ratio: ${summary.financialData.debtToEquity?.toFixed(2) ?? "N/A"}
Current Ratio: ${summary.financialData.currentRatio?.toFixed(2) ?? "N/A"}
Free Cash Flow: ${summary.financialData.freeCashflow ? `₹${(summary.financialData.freeCashflow / 1e9).toFixed(0)} Bn` : "N/A"}
Revenue (TTM): ${summary.financialData.totalRevenue ? `₹${(summary.financialData.totalRevenue / 1e9).toFixed(0)} Bn` : "N/A"}`.trim() : "";

  /* ── News block ── */
  const newsBlock = news.length > 0
    ? news.slice(0, 28).map((n, i) => {
        const age = n.ageHours < 1
          ? `${Math.round(n.ageHours * 60)}m`
          : n.ageHours < 24
          ? `${Math.round(n.ageHours)}h`
          : `${Math.round(n.ageHours / 24)}d`;
        const rel = n.relevance >= 0.5 ? "⭐" : " ";
        return `${rel}${i+1}. [${age} ago | ${n.sentiment.toUpperCase()} | ${n.source}] ${n.title}`;
      }).join("\n")
    : "No recent news available — use your knowledge of this sector and company.";

  /* ── Social sentiment block ── */
  const sentimentBlock = sentiment ? `
Overall Social Sentiment: ${sentiment.overallSentiment} (${sentiment.overallScore}/100)
Total Mentions Tracked: ${sentiment.totalMentions}
Bullish vs. Bearish: ${sentiment.bullishCount} vs. ${sentiment.bearishCount}
Mention Velocity: ${sentiment.mentionVelocity}
FOMO Signal Active: ${sentiment.fomoSignal ? "YES ⚠️" : "No"}
Fear Signal Active: ${sentiment.fearSignal ? "YES ⚠️" : "No"}
Top Discussion Themes: ${sentiment.topThemes.join(", ") || "N/A"}
AI Summary: ${sentiment.sentimentSummary}

Top Reddit Discussions:
${sentiment.redditPosts.slice(0, 8).map((p, i) =>
  `${i+1}. [${p.sentiment.toUpperCase()} | r/${p.subreddit} | ${p.score} upvotes] ${p.title}`
).join("\n")}`.trim() : "Social sentiment data unavailable.";

  /* ── Sector framework ── */
  const frameworkBlock = `
SECTOR CONTEXT: ${sector.label}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KEY METRICS TO ANALYZE FOR THIS SECTOR:
${sector.keyMetrics.map((m, i) => `${i+1}. ${m}`).join("\n")}

MACRO FACTORS SPECIFIC TO THIS SECTOR:
${sector.macroFactors.map((m, i) => `${i+1}. ${m}`).join("\n")}

STRUCTURAL RISK FACTORS:
${sector.riskFactors.map((r, i) => `${i+1}. ${r}`).join("\n")}

MANDATORY ANALYSIS FRAMEWORK:
${sector.framework.trim()}

INDIA-SPECIFIC CONTEXT:
${sector.indianContext.trim()}

VERDICT LOGIC FOR THIS SECTOR:
${sector.verdictLogic}`.trim();

  /* ── Output format ── */
  const outputFormat = `
Return ONLY valid JSON matching this exact structure. No markdown, no commentary:
{
  "ticker": "${ticker}",
  "companyName": "official full name",
  "sector": "${sector.label}",
  "exchange": "NSE",
  "currentTrend": "6-8 word current trend description",
  "currentSentiment": "BULLISH|BEARISH|NEUTRAL|MIXED",
  "oneLiner": "ONE sharp sentence capturing the current investment thesis for ${ticker} — SPECIFIC, not generic",
  "trendState": "current market structure in 4-6 words",
  "events": [
    /* 5-8 events. ONLY derive from the ACTUAL NEWS provided. Do not invent events.
       Each event must be grounded in a specific headline from the news list above.
       Order: most recent first. */
    {
      "date": "Month YYYY",
      "headline": "Sharpened version of the actual news headline",
      "context": "2-3 sentences of specific institutional context",
      "marketReaction": "Expected or described market price reaction",
      "institutionalRead": "What sophisticated money is likely doing/thinking",
      "retailSentiment": "Retail and social media behavioral pattern",
      "longTermImpact": "Structural significance if any",
      "impactScore": <40-98>,
      "sentiment": "BULLISH|BEARISH|NEUTRAL|MIXED",
      "category": "EARNINGS|MACRO|CORPORATE|REGULATORY|SOCIAL|TECHNICAL|CONTROVERSY",
      "institutionalConf": <0-100>,
      "retailExcitement": <0-100>,
      "ltImportance": <0-100>
    }
  ],
  "narrativeEvolution": [
    /* 3-5 eras that capture THIS COMPANY's actual narrative journey.
       Must be SPECIFIC to ${ticker} — not sector-generic. */
    {
      "period": "YYYY-YYYY or YYYY-Present",
      "title": "Specific narrative name for this company in this era",
      "description": "2-3 sentences describing what drove this narrative",
      "sentiment": <0-100>,
      "dominant": "Primary driver in 5-8 words",
      "color": "#00FF9C|#FFD700|#FF4D4D|#38BDF8|#C084FC|#FB923C"
    }
  ],
  "sentimentChart": [
    /* 6-10 yearly data points tracking ACTUAL sentiment changes based on real events */
    { "year": <number>, "score": <0-100>, "label": "specific descriptor, not generic" }
  ],
  "smartMoneyAnalysis": "Institutional holding facts ONLY if present in the data above (e.g. % held by institutions). If not provided, write: Not available in the data provided.",
  "macroConnections": "SPECIFIC macro inputs for THIS sector — e.g., for banking: RBI rate trajectory impact on NIM; for IT: USD/INR impact; for energy: Brent crude sensitivity.",
  "techAnalysis": "SPECIFIC technical structure using the ACTUAL price data provided — mention real price levels from 52W high/low.",
  "graphAnalysis": "SPECIFIC chart behavior description based on the price data — what pattern is forming?",
  "timeframes": {
    "intraday": {"trend":"","strength":"Strong|Moderate|Weak|Neutral","risk":"Low|Medium|High","note":"specific tactical note"},
    "swing": {"trend":"","strength":"","risk":"","note":""},
    "positional": {"trend":"","strength":"","risk":"","note":""},
    "longTerm": {"trend":"","strength":"","risk":"","note":""}
  },
  "institutionalFlow": "Only facts present in the data or news above; otherwise: Not available in the data provided.",
  "riskAnalysis": "3-4 SPECIFIC risks unique to ${ticker} right now based on actual news",
  "macroContext": "SPECIFIC macro tailwinds and headwinds for this sector at this moment",
  "aiInsights": "A UNIQUE insight about ${ticker} that most retail investors are missing — must be specific and contrarian",
  "bullCase": "Specific bull scenario: catalyst and what would need to happen. Do NOT give a price target.",
  "bearCase": "Specific bear scenario: trigger + downside + invalidation",
  "invalidation": "Specific technical or fundamental signal that would invalidate the primary thesis",
  "latestDevelopments": [
    /* 3 most important developments from ACTUAL NEWS. Real headlines, real dates. */
    {"headline":"real headline","aiRead":"institutional interpretation","date":"date","sentiment":"BULLISH|BEARISH|NEUTRAL|MIXED"}
  ],
  "keyRisks": ["4-5 specific risks for ${ticker} right now — derived from actual news and sector analysis"],
  "narrativeSummary": "2-3 sentences on the current dominant market narrative for ${ticker}"
}`.trim();

  /* ── Final assembled prompt ── */
  return `You are the EquityLens research assistant — an equity analyst for Indian markets (NSE/BSE).

TODAY: ${new Date().toLocaleDateString("en-IN", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}

═══════════════════════════════════════════
REAL MARKET DATA FOR ${ticker}
═══════════════════════════════════════════
${priceBlock}
${profileBlock ? `\n${profileBlock}` : ""}
${financialsBlock ? `\n${financialsBlock}` : ""}

═══════════════════════════════════════════
LATEST NEWS (${news.length} articles — ⭐ = high relevance to ${ticker})
═══════════════════════════════════════════
${newsBlock}

═══════════════════════════════════════════
SOCIAL SENTIMENT DATA
═══════════════════════════════════════════
${sentimentBlock}

═══════════════════════════════════════════
SECTOR-SPECIFIC ANALYSIS FRAMEWORK
═══════════════════════════════════════════
${frameworkBlock}

═══════════════════════════════════════════
CRITICAL ANALYSIS RULES
═══════════════════════════════════════════
1. DERIVE ALL EVENTS from the actual news provided — never invent events
2. DO NOT OUTPUT SCORES OR RATINGS — numeric scores are computed separately by fixed rules
3. ANALYSIS MUST BE SPECIFIC TO ${ticker} — not sector-generic boilerplate
4. SOUND INSTITUTIONAL — like a Goldman Sachs or Motilal Oswal research note
5. MENTION SPECIFIC NUMBERS from the data (price levels, PE ratios, margins)
6. EXPLAIN THE WHY behind every thesis — not just what, but why
7. ADDRESS BOTH BULL AND BEAR CASES — no one-sided analysis
8. IF NEWS IS MIXED — reflect that complexity in the output, don't force a verdict
9. Social sentiment is ONE input, not the thesis — institutions drive prices, retail reflects them

═══════════════════════════════════════════
OUTPUT (valid JSON only)
═══════════════════════════════════════════
${outputFormat}`;
}

/* ═══════════════════════════════════════════════════════════════
   COMPACT PROMPT BUILDER
   For the fast streaming path — quant scores already computed,
   AI only generates narrative interpretation.
   Target: ~700 input tokens + ~600 output tokens = ~1300 total.
   At 8 tok/s (7B CPU): ~75s. At 25 tok/s (3B CPU): ~24s.
═══════════════════════════════════════════════════════════════ */

export interface CompactPromptContext {
  ticker:   string;
  quote:    any;
  summary:  any;
  news:     NewsItem[];
  scores: {
    technical: number; fundamental: number; momentum: number;
    institutional: number; riskReward: number; smartMoney: number;
    volatility: number; ltInvestment: number; swingTrade: number;
  };
  composite: number;
}

export function buildCompactPrompt(ctx: CompactPromptContext): string {
  const { ticker, quote, summary, news, scores, composite } = ctx;

  const sector = detectSector(quote?.sector, ticker);
  const cn     = quote?.longName ?? quote?.shortName ?? ticker;
  const price  = quote?.regularMarketPrice?.toFixed(2) ?? "N/A";
  const chg    = quote?.regularMarketChangePercent?.toFixed(2) ?? "0";
  const pe     = quote?.trailingPE?.toFixed(1) ?? "N/A";
  const hi52   = quote?.fiftyTwoWeekHigh?.toFixed(0) ?? "N/A";
  const lo52   = quote?.fiftyTwoWeekLow?.toFixed(0) ?? "N/A";
  const rev    = summary?.financialData?.revenueGrowth
    ? `${((summary.financialData.revenueGrowth) * 100).toFixed(1)}%` : "N/A";
  const roe    = summary?.financialData?.returnOnEquity
    ? `${((summary.financialData.returnOnEquity) * 100).toFixed(1)}%` : "N/A";
  const de     = summary?.financialData?.debtToEquity?.toFixed(2) ?? "N/A";

  // Sentiment signal derived from composite score
  const sentSignal = composite >= 65 ? "BULLISH" : composite >= 52 ? "NEUTRAL" : composite >= 42 ? "MIXED" : "BEARISH";

  // Top 8 most relevant news items only
  const topNews = news
    .slice(0, 8)
    .map((n, i) => `${i + 1}. [${n.sentiment}] ${n.title}`)
    .join("\n") || "No recent news.";

  // Compact verdict from sector
  const sectorVerdict = sector.verdictLogic
    .split("\n")
    .filter(l => l.trim().startsWith("BUY") || l.trim().startsWith("AVOID"))
    .slice(0, 2)
    .join(" ")
    .trim() || sector.label;

  return `Analyze ${ticker} (${cn}) for Indian institutional investors. Return ONLY valid JSON.

PRICE: ₹${price} (${chg}% today) | P/E: ${pe} | 52W: ₹${lo52}–${hi52}
FUNDAMENTALS: Revenue Growth ${rev} | ROE ${roe} | D/E ${de}
SECTOR: ${sector.label} — ${sectorVerdict}

QUANT SCORES (pre-computed — use as context for narrative):
Technical ${scores.technical} | Fundamental ${scores.fundamental} | Momentum ${scores.momentum}
Institutional ${scores.institutional} | Risk/Reward ${scores.riskReward} | SmartMoney ${scores.smartMoney}
Composite: ${composite}/100 → signal: ${sentSignal}

LATEST NEWS (${news.length} total):
${topNews}

Return this JSON exactly (no markdown, no extra fields):
{
  "currentSentiment": "${sentSignal}",
  "oneLiner": "one sharp sentence on the current investment thesis for ${ticker}",
  "trendState": "4-6 word market structure description",
  "smartMoneyAnalysis": "Institutional holding facts only if present in the data above; otherwise: Not available in the data provided.",
  "macroConnections": "2 sentences on key macro drivers for ${sector.label}",
  "techAnalysis": "2 sentences on technical structure using the actual price levels above",
  "aiInsights": "one contrarian insight retail investors are missing about ${ticker}",
  "bullCase": "catalyst and what would need to happen, in 2 sentences. Do NOT give a price target.",
  "bearCase": "trigger + downside risk in 2 sentences",
  "narrativeSummary": "2 sentences on the current dominant market narrative",
  "keyRisks": ["specific risk 1", "specific risk 2", "specific risk 3"]
}`;
}
