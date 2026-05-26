// ─── Market Data Types ────────────────────────────────────────────────────────

export interface StockQuote {
  ticker: string;
  exchange: "NSE" | "BSE";
  company_name: string;
  sector: string;
  industry: string;
  current_price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  prev_close: number;
  change: number;
  change_pct: number;
  volume: number;
  avg_volume: number;
  market_cap: number;
  week_52_high: number;
  week_52_low: number;
  pe_ratio: number | null;
  pb_ratio: number | null;
  eps: number | null;
  dividend_yield: number | null;
  beta: number | null;
  last_updated: string;
}

export interface OHLCVCandle {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SearchResult {
  ticker: string;
  company_name: string;
  exchange: string;
  sector: string;
  market_cap_category: "Large Cap" | "Mid Cap" | "Small Cap" | "Micro Cap";
  current_price?: number;
  change_pct?: number;
}

// ─── Technical Analysis Types ────────────────────────────────────────────────

export interface TechnicalIndicators {
  rsi_14: number;
  macd: number;
  macd_signal: number;
  macd_histogram: number;
  ema_20: number;
  ema_50: number;
  ema_200: number;
  bb_upper: number;
  bb_middle: number;
  bb_lower: number;
  atr_14: number;
  obv: number;
  adx: number;
  stoch_k: number;
  stoch_d: number;
  vwap: number;
  support_levels: number[];
  resistance_levels: number[];
  trend: "UPTREND" | "DOWNTREND" | "SIDEWAYS";
  trend_strength: "STRONG" | "MODERATE" | "WEAK";
}

export interface TechnicalSignal {
  indicator: string;
  signal: "BUY" | "SELL" | "NEUTRAL";
  value: string;
  interpretation: string;
}

// ─── Fundamental Analysis Types ──────────────────────────────────────────────

export interface FundamentalData {
  // Valuation
  pe_ratio: number | null;
  pb_ratio: number | null;
  ps_ratio: number | null;
  ev_ebitda: number | null;
  sector_pe: number | null;

  // Profitability
  roe: number | null;
  roce: number | null;
  roa: number | null;
  net_margin: number | null;
  operating_margin: number | null;
  gross_margin: number | null;

  // Growth
  revenue_growth_yoy: number | null;
  profit_growth_yoy: number | null;
  eps_growth_3yr: number | null;

  // Financial Health
  debt_to_equity: number | null;
  current_ratio: number | null;
  quick_ratio: number | null;
  interest_coverage: number | null;
  free_cash_flow: number | null;

  // Ownership
  promoter_holding: number | null;
  fii_holding: number | null;
  dii_holding: number | null;
  pledged_shares: number | null;

  // Efficiency
  asset_turnover: number | null;
  inventory_turnover: number | null;
  receivables_turnover: number | null;
}

export interface FundamentalRedFlag {
  category: string;
  flag: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

// ─── AI Analysis Types ────────────────────────────────────────────────────────

export type Verdict =
  | "STRONG BUY"
  | "BUY"
  | "HOLD"
  | "SELL"
  | "STRONG SELL";

export interface Scenario {
  type: "BULL" | "BASE" | "BEAR";
  target_price: number;
  probability: number;
  timeline: string;
  key_drivers: string[];
  invalidation_level: number;
}

export interface AIAnalysis {
  ticker: string;
  company_name: string;
  generated_at: string;
  analysis_id: string;

  // Snapshot
  snapshot: {
    market_cap_category: string;
    trend_bias: string;
    momentum: string;
    risk_profile: string;
    analyst_consensus: string;
  };

  // Historical Lifecycle
  lifecycle: {
    founding_year: number;
    key_milestones: Array<{
      year: number;
      event: string;
      impact: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
    }>;
    business_evolution: string;
    management_quality: string;
    capital_allocation_quality: string;
    crises_survived: string[];
    competitive_moat: string;
  };

  // Technical
  technical: {
    summary: string;
    signals: TechnicalSignal[];
    key_levels: {
      immediate_support: number;
      immediate_resistance: number;
      breakout_level: number;
      breakdown_level: number;
    };
    volume_analysis: string;
    momentum_analysis: string;
  };

  // Fundamentals
  fundamentals: {
    summary: string;
    strengths: string[];
    red_flags: FundamentalRedFlag[];
    valuation_assessment: string;
    financial_health: string;
    cash_flow_quality: string;
  };

  // Macro & Policy
  macro: {
    summary: string;
    rbi_impact: string;
    budget_impact: string;
    sector_tailwinds: string[];
    sector_headwinds: string[];
    policy_risks: string[];
    facts_vs_interpretation: {
      facts: string[];
      interpretations: string[];
    };
  };

  // News & Sentiment
  sentiment: {
    overall: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED";
    score: number; // -1 to 1
    key_catalysts: string[];
    key_risks_from_news: string[];
    noise_filtered_summary: string;
    sources: Array<{
      headline: string;
      source: string;
      sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
      signal_type: "SIGNAL" | "NOISE";
      published_at: string;
    }>;
  };

  // Scenarios
  scenarios: Scenario[];

  // Final Verdict
  verdict: {
    rating: Verdict;
    confidence: number; // 0-100
    timeline: string;
    entry_range: [number, number] | null;
    stop_loss: number | null;
    target_1: number | null;
    target_2: number | null;
    risk_reward: number | null;
    key_risks: string[];
    key_catalysts: string[];
    investment_thesis: string;
    when_to_review: string;
  };
}

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  published_at: string;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  signal_type: "SIGNAL" | "NOISE";
  tickers: string[];
}

// ─── Macro Intelligence ───────────────────────────────────────────────────────

export interface MacroIndex {
  symbol:      string;
  label:       string;
  price:       number;
  change_pct:  number;
  change_1w:   number;
  change_1m:   number;
}

export interface SectorRotation {
  sector:         string;
  performance_1w: number;
  signal:         "ACCUMULATE" | "NEUTRAL" | "AVOID";
}

export interface MacroIntelligence {
  fetched_at:     string;
  regime: {
    type:         "RISK_ON" | "RISK_OFF" | "NEUTRAL";
    label:        string;
    description:  string;
    confidence:   number;
  };
  pressure_score: number;
  rbi_stance:     "HAWKISH" | "NEUTRAL" | "DOVISH";
  indices: {
    nifty50?:    MacroIndex | null;
    nifty_bank?: MacroIndex | null;
    india_vix?:  MacroIndex | null;
  };
  currency: {
    usd_inr?: MacroIndex | null;
  };
  commodities: {
    crude_brent?: MacroIndex | null;
    gold?:        MacroIndex | null;
  };
  global: {
    sp500?:  MacroIndex | null;
    us_10y?: MacroIndex | null;
  };
  sector_rotation: SectorRotation[];
  macro_signals:   string[];
  risk_factors:    string[];
}

// ─── Market Breadth ──────────────────────────────────────────────────────────

export interface MarketBreadth {
  nse_advance: number;
  nse_decline: number;
  nse_unchanged: number;
  nifty50: number;
  nifty50_change_pct: number;
  sensex: number;
  sensex_change_pct: number;
  nifty_bank: number;
  nifty_bank_change_pct: number;
  india_vix: number;
  market_status: "OPEN" | "CLOSED" | "PRE_OPEN";
}

// ─── UI State Types ───────────────────────────────────────────────────────────

export type ChartInterval = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "MAX";
export type AnalysisTab = "overview" | "technical" | "fundamentals" | "macro" | "news" | "ai-report";

export interface TickerItem {
  ticker: string;
  name: string;
  price: number;
  change_pct: number;
}
