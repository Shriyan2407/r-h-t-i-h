import type {
  TechnicalIndicators,
  FundamentalData,
  AIAnalysis,
  NewsItem,
  MarketBreadth,
  SearchResult,
  Verdict,
} from "./types";

interface CompanyProfile {
  name: string;
  sector: string;
  industry: string;
  founded: number;
  history: string;
  moat: string;
  management: string;
}

const COMPANY_PROFILES: Record<string, CompanyProfile> = {
  RELIANCE: {
    name: "Reliance Industries Limited",
    sector: "Energy & Materials",
    industry: "Oil & Gas Refineries & Marketing",
    founded: 1973,
    history: "Founded by Dhirubhai Ambani as a textile company, Reliance has evolved into India's largest conglomerate spanning petrochemicals, oil refining, retail, telecom (Jio), and renewable energy.",
    moat: "Dominant pricing power in retail, massive scale in telecom with over 450M subscribers, high-complexity oil refinery integration at Jamnagar (the world's largest), and a deep capital war chest.",
    management: "Led by Mukesh Ambani, who has successfully steered the shift from legacy refining to consumer-facing businesses (Jio, Retail). Highly capital-disciplined but aggressively expansionist.",
  },
  TCS: {
    name: "Tata Consultancy Services Limited",
    sector: "Technology",
    industry: "Information Technology Services",
    founded: 1968,
    history: "Established as a division of Tata Sons, TCS pioneering the offshore global delivery model and has grown into the second-largest Indian company by market capitalization.",
    moat: "Deep long-term relationships with Fortune 500 companies, exceptionally low employee attrition compared to peers, proprietary software suites (Ignio, BaNCS), and Tata group heritage which acts as a gold standard for trust.",
    management: "Led by CEO K. Krithivasan. Excellent institutional legacy, outstanding track record of high Return on Equity (ROE > 35%) and consistent shareholder payouts (dividend payout ratio > 80%).",
  },
  INFY: {
    name: "Infosys Limited",
    sector: "Technology",
    industry: "Information Technology Services",
    founded: 1981,
    history: "Founded by N.R. Narayana Murthy and six other software professionals, Infosys became the first Indian IT company to list on NASDAQ, epitomizing the corporate governance gold standard in India.",
    moat: "Highly recognized brand in global corporate consulting, advanced digital transformational capabilities (Cobalt suite), and a massive global training center in Mysore ensuring continuous talent pipeline.",
    management: "Led by CEO Salil Parekh, who stabilized the company after co-founder disputes and led a successful cloud and digital-first growth phase. Extremely conservative accounting.",
  },
  HDFCBANK: {
    name: "HDFC Bank Limited",
    sector: "Banking & Finance",
    industry: "Private Sector Bank",
    founded: 1994,
    history: "Incorporated as a subsidiary of HDFC Ltd (Housing Development Finance Corporation), it was among the first private sector banks authorized by RBI, and merged back with HDFC Ltd in 2023.",
    moat: "World-class low-cost deposit franchise (CASA > 40%), massive distribution network across rural and urban India, unmatched risk management engine resulting in lowest gross NPAs (<1.4%) historically.",
    management: "Led by CEO Sashidhar Jagdishan. Strong transition from founder Aditya Puri, executing a digital-first scaling plan while managing the integration of the massive HDFC merger.",
  },
  ICICIBANK: {
    name: "ICICI Bank Limited",
    sector: "Banking & Finance",
    industry: "Private Sector Bank",
    founded: 1994,
    history: "Originally established as a development financial institution, ICICI launched commercial banking in 1994 and has pioneered retail lending, digital banking, and credit cards in India.",
    moat: "Industry-leading digital ecosystem (iMobile Pay), stellar retail loan portfolio, strong subsidiary base (ICICI Prudential, ICICI Lombard, ICICI Securities) providing robust cross-selling synergy.",
    management: "Led by CEO Sandeep Bakhshi. Famous for shifting focus from aggressive asset growth to risk-calibrated operating profit ('One Bank' approach), leading to massive valuation rerating since 2018.",
  },
  SBIN: {
    name: "State Bank of India",
    sector: "Banking & Finance",
    industry: "Public Sector Bank",
    founded: 1955,
    history: "With origins tracing back to the Bank of Calcutta (1806), SBI is India's largest bank, nationalized in 1955, and is a systemically important financial institution serving over 480M customers.",
    moat: "Unrivaled reach with over 22,000 branches, custodian of the sovereign salary accounts and government business, massive treasury book, and a digital channel (YONO) that is one of India's largest fin-tech apps.",
    management: "Led by Chairman C.S. Shetty. Successfully cleaned the bank's legacy bad loans over the last decade, leading to institutional-grade credit metrics and historic profitability.",
  },
  ITC: {
    name: "ITC Limited",
    sector: "FMCG",
    industry: "Cigarettes, Hotels, Paperboards & Agri-Business",
    founded: 1910,
    history: "Originally established as the Imperial Tobacco Company of India, ITC has systematically diversified into packaged foods (Aashirvaad, Sunfeast), premium hotels, paperboards, and agricultural exports.",
    moat: "Absolute monopoly in organized cigarette manufacturing (>75% volume share), massive distribution network reaching over 7 million retail outlets, and cash flows from cigarettes that fully fund FMCG scale-up.",
    management: "Led by Chairman Sanjiv Puri. Highly rated capital allocation strategy focusing on 'ITC Next' - leveraging digital, sustainability, and carving out the hotel business to improve Return on Capital (ROCE).",
  },
  LT: {
    name: "Larsen & Toubro Limited",
    sector: "Infrastructure & Capital Goods",
    industry: "Engineering, Procurement & Construction (EPC)",
    founded: 1938,
    history: "Founded by two Danish engineers fleeing World War II, L&T has built India's iconic landmarks, airports, metro networks, defense vessels, nuclear projects, and space launch infrastructure.",
    moat: "Unmatched technical capability to execute multi-billion dollar mega-projects, massive order book exceeding ₹4.5 Lakh Crores, and a technology subsidiary arm (LTIMindtree, LTTS) providing defensive cash flows.",
    management: "Led by Chairman S.N. Subrahmanyan. Exceptionally high standards of execution capability, aggressive bidding discipline, and a strong focus on asset-light business transitions.",
  },
};

function getProfile(ticker: string): CompanyProfile {
  const cleanTicker = ticker.toUpperCase().replace(/\.(NS|BO|NSE|BSE)$/i, "");
  if (COMPANY_PROFILES[cleanTicker]) {
    return COMPANY_PROFILES[cleanTicker];
  }
  
  // Generic fallback profile generator
  const name = cleanTicker.endsWith("BANK") 
    ? `${cleanTicker.charAt(0) + cleanTicker.slice(1).toLowerCase()} Bank Limited`
    : `${cleanTicker} Industries Limited`;
  const sector = cleanTicker.endsWith("BANK") ? "Banking & Finance" : "Industrial Manufacturing";
  const industry = cleanTicker.endsWith("BANK") ? "Private Sector Bank" : "Conglomerate Services";
  
  return {
    name,
    sector,
    industry,
    founded: 1985 + (cleanTicker.charCodeAt(0) % 20),
    history: `Established as a regional player in the mid-1980s, ${name} has capitalized on India's economic liberalization since 1991 to expand national operations and build a highly resilient business model.`,
    moat: `Strong regional brand equity, a localized distribution network, high switching costs for regular B2B enterprise customers, and proprietary technological processes optimized for the Indian operating environment.`,
    management: `Led by a team of highly experienced professionals with a proven history of navigating Indian regulatory shifts, maintaining a conservative balance sheet, and delivering stable compounding returns.`,
  };
}

export function generateMockSearchResult(query: string): SearchResult[] {
  const q = query.toUpperCase();
  const watchlist = [
    { ticker: "RELIANCE", name: "Reliance Industries Limited", sector: "Energy & Materials", cap: "Large Cap" },
    { ticker: "TCS", name: "Tata Consultancy Services Ltd", sector: "Technology", cap: "Large Cap" },
    { ticker: "INFY", name: "Infosys Limited", sector: "Technology", cap: "Large Cap" },
    { ticker: "HDFCBANK", name: "HDFC Bank Limited", sector: "Banking & Finance", cap: "Large Cap" },
    { ticker: "ICICIBANK", name: "ICICI Bank Limited", sector: "Banking & Finance", cap: "Large Cap" },
    { ticker: "SBIN", name: "State Bank of India", sector: "Banking & Finance", cap: "Large Cap" },
    { ticker: "ITC", name: "ITC Limited", sector: "FMCG", cap: "Large Cap" },
    { ticker: "LT", name: "Larsen & Toubro Limited", sector: "Infrastructure", cap: "Large Cap" },
    { ticker: "TATAMOTORS", name: "Tata Motors Limited", sector: "Auto", cap: "Large Cap" },
    { ticker: "BHARTIARTL", name: "Bharti Airtel Limited", sector: "Telecom", cap: "Large Cap" },
  ];

  const filtered = watchlist.filter(
    (w) => w.ticker.includes(q) || w.name.toUpperCase().includes(q)
  );

  if (filtered.length === 0 && query.length >= 2) {
    // Dynamic match fallback
    return [{
      ticker: q,
      company_name: `${q} Industries Limited`,
      exchange: "NSE",
      sector: "Diversified",
      market_cap_category: "Mid Cap"
    }];
  }

  return filtered.map((f) => ({
    ticker: f.ticker,
    company_name: f.name,
    exchange: "NSE",
    sector: f.sector,
    market_cap_category: f.cap as any,
  }));
}

export function generateMockTechnicalIndicators(
  ticker: string,
  currentPrice: number
): TechnicalIndicators {
  const seed = ticker.charCodeAt(0) + ticker.charCodeAt(ticker.length - 1);
  const isUp = seed % 2 === 0;
  
  const rsi = isUp ? 55 + (seed % 15) : 35 + (seed % 15);
  const trend = isUp ? "UPTREND" : (seed % 3 === 0 ? "SIDEWAYS" : "DOWNTREND");
  const strength = (seed % 4 === 0) ? "STRONG" : "MODERATE";

  const ema20 = Math.round(currentPrice * (isUp ? 0.985 : 1.015) * 100) / 100;
  const ema50 = Math.round(currentPrice * (isUp ? 0.965 : 1.035) * 100) / 100;
  const ema200 = Math.round(currentPrice * (isUp ? 0.915 : 1.085) * 100) / 100;

  const bbandDev = currentPrice * 0.045;
  const bbMiddle = currentPrice;
  const bbUpper = Math.round((bbMiddle + bbandDev) * 100) / 100;
  const bbLower = Math.round((bbMiddle - bbandDev) * 100) / 100;

  const atr = Math.round((currentPrice * 0.018) * 100) / 100;
  const macdVal = currentPrice * 0.004;
  const signalVal = currentPrice * 0.003;

  return {
    rsi_14: Math.round(rsi * 100) / 100,
    macd: Math.round(macdVal * 100) / 100,
    macd_signal: Math.round(signalVal * 100) / 100,
    macd_histogram: Math.round((macdVal - signalVal) * 100) / 100,
    ema_20: ema20,
    ema_50: ema50,
    ema_200: ema200,
    bb_upper: bbUpper,
    bb_middle: bbMiddle,
    bb_lower: bbLower,
    atr_14: atr,
    obv: 14520300 + (seed * 1000),
    adx: 18 + (seed % 15),
    stoch_k: isUp ? 68 : 34,
    stoch_d: isUp ? 64 : 38,
    vwap: Math.round(currentPrice * 0.999 * 100) / 100,
    support_levels: [
      Math.round(currentPrice * 0.97 * 100) / 100,
      Math.round(currentPrice * 0.94 * 100) / 100,
      Math.round(currentPrice * 0.90 * 100) / 100,
    ],
    resistance_levels: [
      Math.round(currentPrice * 1.03 * 100) / 100,
      Math.round(currentPrice * 1.06 * 100) / 100,
      Math.round(currentPrice * 1.10 * 100) / 100,
    ],
    trend: trend as any,
    trend_strength: strength as any,
  };
}

export function generateMockFundamentals(
  ticker: string,
  quotePE: number | null
): FundamentalData {
  const seed = ticker.charCodeAt(0);
  const pe = quotePE ?? (15 + (seed % 30));
  const sectorPE = Math.round((pe * 0.9) * 100) / 100;
  const isBank = ticker.endsWith("BANK") || ticker === "SBIN";

  return {
    pe_ratio: pe,
    pb_ratio: isBank ? 2.5 + (seed % 4) / 2 : 4.5 + (seed % 8) / 2,
    ps_ratio: isBank ? null : 3.8 + (seed % 5),
    ev_ebitda: isBank ? null : 12.4 + (seed % 10),
    sector_pe: sectorPE,
    roe: 12 + (seed % 18),
    roce: isBank ? null : 14 + (seed % 20),
    roa: isBank ? 1.1 + (seed % 10) / 10 : 7.5 + (seed % 10),
    net_margin: isBank ? 14 + (seed % 10) : 10 + (seed % 15),
    operating_margin: isBank ? null : 16 + (seed % 20),
    gross_margin: isBank ? null : 28 + (seed % 30),
    revenue_growth_yoy: 8 + (seed % 15),
    profit_growth_yoy: 10 + (seed % 25),
    eps_growth_3yr: 11 + (seed % 12),
    debt_to_equity: isBank ? null : Math.round(((seed % 8) / 10) * 100) / 100,
    current_ratio: isBank ? null : 1.4 + (seed % 10) / 10,
    quick_ratio: isBank ? null : 1.0 + (seed % 10) / 10,
    interest_coverage: isBank ? null : 4.5 + (seed % 15),
    free_cash_flow: 1200 + (seed * 8),
    promoter_holding: 40 + (seed % 35),
    fii_holding: 15 + (seed % 15),
    dii_holding: 12 + (seed % 12),
    pledged_shares: seed % 5 === 0 ? Math.round(((seed % 10) * 0.8) * 100) / 100 : 0,
    asset_turnover: isBank ? null : 0.65 + (seed % 10) / 20,
    inventory_turnover: isBank ? null : 4.5 + (seed % 15),
    receivables_turnover: isBank ? null : 6.2 + (seed % 20),
  };
}

export function generateMockNews(ticker: string): NewsItem[] {
  const profile = getProfile(ticker);
  
  return [
    {
      id: "news_1",
      headline: `${profile.name} Q4 Profit Beats Estimates, Announces ₹12 Dividend`,
      summary: `The flagship company registered a net profit growth of 18.2% YoY, beating analyst estimates across major indices. Margin expanded by 80bps on lower raw material costs and operational efficiencies.`,
      source: "Moneycontrol",
      url: "https://www.moneycontrol.com",
      published_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      sentiment: "POSITIVE",
      signal_type: "SIGNAL",
      tickers: [ticker],
    },
    {
      id: "news_2",
      headline: `Brokerage Target Hiked on Strong Structural Sector Tailwind`,
      summary: `Global investment bank revised upward target pricing reflecting strong structural demand growth, dominant competitive moat, and a highly efficient capital expansion plan that supports earnings trajectory.`,
      source: "Economic Times",
      url: "https://economictimes.indiatimes.com",
      published_at: new Date(Date.now() - 3600000 * 14).toISOString(),
      sentiment: "POSITIVE",
      signal_type: "SIGNAL",
      tickers: [ticker],
    },
    {
      id: "news_3",
      headline: `${ticker} to Invest ₹5,000 Crore in Tech Upgrades Over 3 Years`,
      summary: `The firm is doubling down on artificial intelligence, cyber defense, and green logistics to transform customer experience and reduce overheads across key corporate business departments.`,
      source: "Livemint",
      url: "https://www.livemint.com",
      published_at: new Date(Date.now() - 3600000 * 32).toISOString(),
      sentiment: "POSITIVE",
      signal_type: "SIGNAL",
      tickers: [ticker],
    },
    {
      id: "news_4",
      headline: `Social Media Chatter Volatile on Rumored Joint Venture Negotiations`,
      summary: `Various retail stock boards discussion boards are buzzing with unverified reports of a potential strategic technology joint venture in the Middle East region. Analyst view remains skeptical.`,
      source: "Twitter Analyst",
      url: "https://twitter.com",
      published_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      sentiment: "NEUTRAL",
      signal_type: "NOISE",
      tickers: [ticker],
    },
  ];
}

export function generateMockAIAnalysis(
  ticker: string,
  currentPrice: number,
  companyName: string
): AIAnalysis {
  const profile = getProfile(ticker);
  const seed = ticker.charCodeAt(0);
  const isUp = seed % 2 === 0;
  
  const rating: Verdict = isUp ? "STRONG BUY" : (seed % 3 === 0 ? "BUY" : "HOLD");
  const confidence = 75 + (seed % 18);
  const rr = isUp ? 2.5 : 1.8;

  const target1 = Math.round(currentPrice * (isUp ? 1.08 : 1.04) * 100) / 100;
  const target2 = Math.round(currentPrice * (isUp ? 1.15 : 1.09) * 100) / 100;
  const stopLoss = Math.round(currentPrice * (isUp ? 0.95 : 0.93) * 100) / 100;
  
  const bullTarget = Math.round(currentPrice * 1.20 * 100) / 100;
  const baseTarget = Math.round(currentPrice * 1.07 * 100) / 100;
  const bearTarget = Math.round(currentPrice * 0.88 * 100) / 100;
  
  const bullProb = isUp ? 55 : 30;
  const baseProb = isUp ? 35 : 45;
  const bearProb = 100 - bullProb - baseProb;

  return {
    ticker: ticker.toUpperCase(),
    company_name: companyName || profile.name,
    generated_at: new Date().toISOString(),
    analysis_id: `job_mock_${seed}_${Date.now()}`,
    snapshot: {
      market_cap_category: currentPrice * 10000000 > 100000000000 ? "Large Cap" : "Mid Cap",
      trend_bias: isUp ? "BULLISH ACCELERATING" : "CONSOLIDATING SIDEWAYS",
      momentum: isUp ? "STRONG MOMENTUM ABOVE 50 DMA" : "NEUTRAL / MEAN REVERTING",
      risk_profile: "MODERATE / BETA IN LINE WITH BENCHMARK",
      analyst_consensus: isUp ? "85% ACCUMULATE OR BUY" : "HOLD / SECTOR UNDERPERFORMANCE",
    },
    lifecycle: {
      founding_year: profile.founded,
      key_milestones: [
        { year: profile.founded, event: `Incorporation and setup of first facility.`, impact: "NEUTRAL" },
        { year: profile.founded + 15, event: `Successful initial public offering (IPO) on NSE.`, impact: "POSITIVE" },
        { year: profile.founded + 25, event: `Survived global economic crisis, restructuring non-core businesses.`, impact: "POSITIVE" },
        { year: profile.founded + 30, event: `Unveiled massive capital expenditure plan for next generation growth.`, impact: "POSITIVE" },
      ],
      business_evolution: profile.history,
      management_quality: profile.management,
      capital_allocation_quality: `Exceptional history of compounding capital. Dividend payout ratios are balanced with reinvestment needs, resulting in a consistent Return on Equity (ROE) well above the cost of capital.`,
      crises_survived: [
        "1997 Asian Financial Crisis: Optimized working capital to survive high liquidity squeeze.",
        "2008 Global Credit Freeze: Maintained debt discipline and protected balance sheet core metrics.",
        "2020 Supply Chain Shut Down: Transitioned smoothly to hybrid delivery and digital distribution.",
      ],
      competitive_moat: profile.moat,
    },
    technical: {
      summary: `Price action is trading inside a structural ${isUp ? "bullish expansion corridor" : "consolidation range"}. Moving averages are currently in a ${isUp ? "perfect bullish ribbon setup (20 > 50 > 200 EMA)" : "flat cluster alignment"} that suggests low short-term breakout volatility.`,
      signals: [
        { indicator: "RSI 14", signal: isUp ? "BUY" : "NEUTRAL", value: isUp ? "64" : "48", interpretation: isUp ? "Strong momentum room to expand" : "Trading in a healthy neutral range" },
        { indicator: "MACD Cross", signal: isUp ? "BUY" : "NEUTRAL", value: "+4.2", interpretation: isUp ? "Fast line crossed signal line upward" : "Sideways consolidation with no bias" },
        { indicator: "200 DMA", signal: "BUY", value: `₹${(currentPrice * 0.92).toFixed(0)}`, interpretation: "Price trades securely above structural support" },
      ],
      key_levels: {
        immediate_support: Math.round(currentPrice * 0.96 * 100) / 100,
        immediate_resistance: Math.round(currentPrice * 1.04 * 100) / 100,
        breakout_level: Math.round(currentPrice * 1.06 * 100) / 100,
        breakdown_level: Math.round(currentPrice * 0.93 * 100) / 100,
      },
      volume_analysis: `Volume is expanding on upward price bars, confirming institutional accumulation. Spot delivery volume stands at a healthy 38%, which aligns with standard long-term trend extensions.`,
      momentum_analysis: `ADX at 24 indicates an emerging trend strength. The daily candle forms a clean bullish continuation setup that validates buying the immediate dips.`,
    },
    fundamentals: {
      summary: `Stellar balance sheet characterized by low leverage, high interest coverage, and excellent capital efficiency ratios. Operating cash flows are robust and fully cover projected growth capital expenditure.`,
      strengths: [
        "Negligible long-term debt-to-equity ratio ensures solid financial cushion.",
        "Consistently high Return on Capital Employed (ROCE) exceeding 20%.",
        "High promoter ownership with zero pledge percentage provides strong governance trust.",
      ],
      red_flags: [
        { category: "Valuation", flag: "P/E premium relative to historic 5-year median averages.", severity: "MEDIUM" },
        { category: "Receivables", flag: "Slight 4-day increase in debtor lifecycle in the previous quarter.", severity: "LOW" },
      ],
      valuation_assessment: `The stock is currently trading at a premium multiples which is fully supported by its high double-digit earnings growth rate. Sector comparative ratios indicate fair value.`,
      financial_health: `Outstanding. Quick ratio at 1.4 suggests excellent short-term liquidity headroom to manage working capital cycles comfortably.`,
      cash_flow_quality: `High cash conversion efficiency with over 90% of EBITDA converting directly into operating cash flows over the last trailing twelve months.`,
    },
    macro: {
      summary: `The sector is a prime beneficiary of domestic capital expenditure pushes and regulatory schemes. Import tariffs protect domestic margins, offset partially by rising input resource prices.`,
      rbi_impact: `Recent monetary policy comments suggest interest rate pauses, which is highly supportive of borrowing-intensive growth sectors.`,
      budget_impact: `The Union Budget allocated substantial capital grants to industrial infrastructure, creating indirect tailwinds for downstream market leaders.`,
      sector_tailwinds: [
        "Government PLI (Production Linked Incentive) scheme benefits.",
        "Robust domestic demand expansion driving volume growth.",
        "Consolidation in the market leading to market share gains.",
      ],
      sector_headwinds: [
        "Rising global commodities pricing inflating material inputs.",
        "Skilled workforce talent availability pressure.",
      ],
      policy_risks: [
        "Unexpected shifts in government subsidy payouts.",
        "Stricter environmental carbon emission standards.",
      ],
      facts_vs_interpretation: {
        facts: [
          "Union Budget cap-ex allocation rose by 11.1% YoY.",
          "Interest rate benchmarks were held steady at 6.5%.",
          "Company has utilized 82% of its domestic manufacturing capacity.",
        ],
        interpretations: [
          "Budget expansion will result in structural supply chain capacity addition for the firm.",
          "Steady interest rates will boost consumer discretionary financing.",
          "82% capacity means the company will trigger next-stage cap-ex, increasing asset turnover.",
        ],
      },
    },
    sentiment: {
      overall: isUp ? "POSITIVE" : "NEUTRAL",
      score: isUp ? 0.65 : 0.15,
      key_catalysts: [
        "Anticipated regulatory approval for new eco-friendly product lines.",
        "Potential market share gains from unorganized regional operators.",
      ],
      key_risks_from_news: [
        "Slight delay in logistics terminal expansion in western ports.",
      ],
      noise_filtered_summary: `Overall corporate news feeds remain constructive. Hype around immediate mergers has been discounted as speculative retail noise. Focus is firmly on fundamental execution.`,
      sources: [
        { headline: "Q4 profits beat, margins expand", source: "Moneycontrol", sentiment: "POSITIVE", signal_type: "SIGNAL", published_at: new Date(Date.now() - 3600000 * 2).toISOString() },
        { headline: "Broker hikes target pricing by 12%", source: "Economic Times", sentiment: "POSITIVE", signal_type: "SIGNAL", published_at: new Date(Date.now() - 3600000 * 14).toISOString() },
        { headline: "Strategic joint venture rumors circulating", source: "Retail Forums", sentiment: "NEUTRAL", signal_type: "NOISE", published_at: new Date(Date.now() - 3600000 * 4).toISOString() },
      ],
    },
    scenarios: [
      { type: "BULL", target_price: bullTarget, probability: bullProb, timeline: "6-12 Months", key_drivers: ["Successful scaling of green logistics", "Volume expansion beats expectations by 4%"], invalidation_level: Math.round(currentPrice * 0.98) },
      { type: "BASE", target_price: baseTarget, probability: baseProb, timeline: "6-12 Months", key_drivers: ["Growth tracks in line with historical median", "Steady margins"], invalidation_level: Math.round(currentPrice * 0.95) },
      { type: "BEAR", target_price: bearTarget, probability: bearProb, timeline: "6-12 Months", key_drivers: ["Raw material spikes erode margin by 120bps", "Slow domestic consumption recovery"], invalidation_level: Math.round(currentPrice * 1.05) },
    ],
    verdict: {
      rating,
      confidence,
      timeline: "6-12 Months",
      entry_range: [Math.round(currentPrice * 0.985 * 100) / 100, Math.round(currentPrice * 1.015 * 100) / 100],
      stop_loss: stopLoss,
      target_1: target1,
      target_2: target2,
      risk_reward: rr,
      key_risks: [
        "Input commodity price hikes leading to short-term EBITDA pressure.",
        "Macro policy adjustments impacting corporate import levies.",
      ],
      key_catalysts: [
        "Strong sequential Q1 results demonstrating pricing elasticity.",
        "Successful commercial launch of green energy expansion.",
      ],
      investment_thesis: `An institutional-grade compounding opportunity. The firm represents the highest capital efficiency in its sector, backed by stellar management, zero balance sheet red flags, and massive market tailwinds. Recommend accumulation within the specified entry range.`,
      when_to_review: "Upon Q1 earnings disclosure or if price breaches the stop loss level.",
    },
  };
}

export function generateMockMarketBreadth(): MarketBreadth {
  const seed = new Date().getHours() + new Date().getMinutes();
  const isUp = seed % 2 === 0;

  const n50c = isUp ? 0.45 : -0.22;
  const n50 = 22350.40 + (isUp ? 80 : -50);

  return {
    nse_advance: isUp ? 1245 : 820,
    nse_decline: isUp ? 812 : 1238,
    nse_unchanged: 84,
    nifty50: Math.round(n50 * 100) / 100,
    nifty50_change_pct: n50c,
    sensex: Math.round((n50 * 3.28) * 100) / 100,
    sensex_change_pct: Math.round((n50c * 0.95) * 100) / 100,
    nifty_bank: Math.round((n50 * 2.12) * 100) / 100,
    nifty_bank_change_pct: Math.round((n50c * 1.2) * 100) / 100,
    india_vix: Math.round((14.5 + (seed % 40) / 10) * 100) / 100,
    market_status: "OPEN",
  };
}

export function generateMockTrendingStocks(): SearchResult[] {
  return [
    { ticker: "RELIANCE", company_name: "Reliance Industries Limited", exchange: "NSE", sector: "Energy & Materials", market_cap_category: "Large Cap", current_price: 2450.40, change_pct: 1.25 },
    { ticker: "HDFCBANK", company_name: "HDFC Bank Limited", exchange: "NSE", sector: "Banking & Finance", market_cap_category: "Large Cap", current_price: 1445.60, change_pct: -0.85 },
    { ticker: "TCS", company_name: "Tata Consultancy Services Ltd", exchange: "NSE", sector: "Technology", market_cap_category: "Large Cap", current_price: 3820.15, change_pct: 0.45 },
    { ticker: "INFY", company_name: "Infosys Limited", exchange: "NSE", sector: "Technology", market_cap_category: "Large Cap", current_price: 1540.20, change_pct: 2.15 },
    { ticker: "TATAMOTORS", company_name: "Tata Motors Limited", exchange: "NSE", sector: "Auto", market_cap_category: "Large Cap", current_price: 945.30, change_pct: -1.45 },
  ];
}
