/**
 * Public profiles of the seven committee members: what each one is for, what it looks at and what it never does.
 * Plain data with no server imports, so the landing page and /team can both use it. Every statement here must
 * match the agent's code (docs/AGENTS.md is the detailed reference).
 */
import type { AgentId } from "./schema";

export interface AgentProfile {
  id: AgentId;
  number: string;
  name: string;
  title: string;
  /** One line for cards. */
  summary: string;
  mandate: string;
  /** The actual procedure, step by step, as implemented. */
  howItWorks: string[];
  looksAt: string[];
  neverDoes: string[];
  handsOver: string;
}

export const AGENT_PROFILES: AgentProfile[] = [
  {
    id: "strategist",
    number: "01",
    name: "Strategist",
    title: "Investment Strategist",
    summary: "Reads the market regime and macro backdrop: is this a calm market or a stressed one?",
    mandate: "Sets the backdrop for every decision: what kind of market are we in, and what has usually followed it?",
    howItWorks: [
      "Classifies the market regime: NIFTY 50 above or below its 200-day average, with India VIX in a low, normal or high band (cut-offs fit on 2011-2025 data).",
      "Looks up what followed that regime historically: average 5-day volatility and how often 5-day drawdowns exceeded 3%.",
      "Reads live macro quotes, and the sector index if the question is about a stock.",
      "Builds a base case (the regime persists), a bull case (a calm uptrend) and a bear case (market stress) from those statistics.",
      "Leans bullish only in an uptrend without high volatility, and leans bearish only in a downtrend with high volatility. Otherwise neutral.",
    ],
    looksAt: [
      "NIFTY 50 against its 200-day average, and India VIX",
      "What historically followed the current regime (volatility, how often drawdowns over 3% happened)",
      "India VIX, USD/INR, the US 10-year yield, Brent crude and the S&P 500",
      "The stock's sector index over the past week",
    ],
    neverDoes: [
      "Invent interest rates, inflation or GDP figures. No feed is connected, so it says they are unavailable",
      "Turn a market regime into a return forecast. Its view never goes beyond \"leaning\" bullish or bearish",
    ],
    handsOver: "The regime, macro levels, and bull, base and bear scenarios built from historical regime statistics.",
  },
  {
    id: "quant",
    number: "02",
    name: "Quant",
    title: "Quantitative Analyst",
    summary: "Trend, momentum, volatility and beta from price history, plus a validated volatility forecast.",
    mandate: "Describes what the price chart is doing, using six published rules and the one validated model.",
    howItWorks: [
      "Scores six rules: 200-day trend (±1), 6-month return beyond ±10% (±1), 12-1 month return beyond ±15% (±1), MACD histogram (±0.5), within 5% of the 52-week high (+0.5) or more than 30% below it (−0.5), and RSI above 75 (−0.5).",
      "Adds the points: 2.5 or more is bullish, 1 or more leans bullish, and the same on the bearish side.",
      "Measures beta and correlation to the NIFTY 50 over one year.",
      "Runs the registered volatility model for the next 5 days, with its walk-forward and holdout validation.",
      "Lowers its confidence when inputs are missing, and halves it when prices are more than 4 days old.",
    ],
    looksAt: [
      "200-day trend, 6-month and 12-month momentum, MACD, distance from the 52-week high, RSI",
      "Beta and correlation to the NIFTY 50",
      "The validated 5-day volatility forecast and its 80% range",
    ],
    neverDoes: [
      "Give an up/down probability. No direction model passed validation",
      "Pretend its rule score predicts returns. Tested point-in-time since 2019, it showed no edge, and it says so in every answer",
    ],
    handsOver: "Its rule score and view, kept separate from the volatility forecast, the input coverage and its measured track record.",
  },
  {
    id: "fundamental",
    number: "03",
    name: "Fundamental",
    title: "Fundamental Analyst",
    summary: "Growth, profitability, balance sheet and valuation from reported figures.",
    mandate: "Asks whether the business is growing, profitable, financially sound and sensibly priced.",
    howItWorks: [
      "Scores growth: revenue and earnings growth of 15% or more is strong; below 0 is weak.",
      "Scores profitability: ROE of 18% or more is strong, below 8% weak; it also checks operating and net margins.",
      "Scores balance-sheet health: debt/equity below 50% is strong, above 150% weak (skipped for lenders); it also checks current ratio and free cash flow.",
      "Scores valuation from trailing P/E, EV/EBITDA and PEG (P/E divided by earnings growth).",
      "Averages the four areas into a 0-100 score: 70 or more is bullish, 30 or less bearish.",
    ],
    looksAt: [
      "Revenue and earnings growth",
      "Return on equity and margins",
      "Debt, liquidity and free cash flow (debt is not scored for banks)",
      "Trailing and forward P/E, EV/EBITDA and PEG",
    ],
    neverDoes: [
      "Estimate figures it does not have, such as ROCE, free-cash-flow yield, moat or management quality",
      "Mix up forward and trailing P/E",
    ],
    handsOver: "A 0-100 score with a grade for growth, profitability, balance sheet and valuation, plus strengths and weaknesses.",
  },
  {
    id: "intelligence",
    number: "04",
    name: "Intelligence",
    title: "Intelligence & Sentiment Analyst",
    summary: "Recent dated headlines and catalysts, each with its source and link.",
    mandate: "Finds what has been reported about the company recently, and how much each source can be trusted.",
    howItWorks: [
      "Collects headlines mentioning the company from the last 14 days, removing duplicates and irrelevant items.",
      "Removes any headline that reads like an instruction to an AI, before it can reach anything else.",
      "Records each item's publisher, link and time, and rates the publisher (exchanges 0.85, business press 0.75, aggregators 0.55).",
      "Tags catalysts (results, deals, regulation, ratings, management, products) and weighs keyword tone by publisher reliability.",
      "Moves its view only with at least 3 items and a clear balance, and never beyond \"leaning\".",
    ],
    looksAt: [
      "Headlines from the last 14 days, each with its publisher, link and time",
      "Catalyst types: results, deals, regulation, analyst ratings, management and products",
      "Publisher reliability, from exchanges and wire services down to aggregators",
    ],
    neverDoes: [
      "Claim a headline caused a price move. Headlines are only \"possibly related\"",
      "Call anything breaking news, or follow instructions hidden in a headline",
      "Report insider trades or institutional flows, which have no data feed",
    ],
    handsOver: "Sourced headlines, catalysts and a news tone, which on its own can only tilt the view slightly.",
  },
  {
    id: "risk",
    number: "05",
    name: "Risk",
    title: "Risk & Portfolio Manager",
    summary: "Drawdowns, worst-day losses and replays of the 2020 crash and 2022 sell-off. Never bullish.",
    mandate: "Asks how much this could hurt, and how big a position the risk justifies.",
    howItWorks: [
      "Measures one year of daily returns: volatility, beta, maximum drawdown, Sharpe and Sortino.",
      "Computes VaR and CVaR: the 95% one-day loss, and the average loss on the worst 5% of days.",
      "Replays the 2020 COVID crash and the 2022 rate-hike sell-off using real prices, and adds labelled hypothetical NIFTY falls of 10% and 20%.",
      "Sets a risk level from volatility (below 20% low, below 35% medium, below 55% high), raising it for deep drawdowns, heavy tail losses or thin trading.",
      "Suggests a position ceiling: 2.5% of the portfolio in annual volatility for a moderate investor, capped at 10%.",
    ],
    looksAt: [
      "Volatility, beta, maximum drawdown, Sharpe and Sortino ratios",
      "Average loss on the worst 5% of days (VaR and CVaR)",
      "Replays of the COVID crash and the 2022 rate-hike sell-off, plus hypothetical market shocks",
      "Liquidity, and concentration in your saved portfolio",
    ],
    neverDoes: [
      "Turn bullish. It is the committee's brake",
      "Estimate a stress scenario its data does not cover",
    ],
    handsOver: "A risk level that can cap the decision, stress-test results, and a position-size ceiling from a published rule.",
  },
  {
    id: "contrarian",
    number: "06",
    name: "Contrarian",
    title: "Research / Contrarian Analyst",
    summary: "Tries to break the thesis: stretched valuation, ignored risks, weak evidence.",
    mandate: "Assumes everyone else is wrong, then looks for the evidence that proves it.",
    howItWorks: [
      "Waits for the analysts, then works out the thesis they are leaning towards.",
      "Applies fixed challenges, such as P/E above 40, price more than 25% above its 200-day average, HIGH risk, disagreements and missing data, each with a severity.",
      "Re-cites the other agents' own evidence for every challenge.",
      "Scores the thesis out of 100, losing 10 points per unit of severity: 65 or more SURVIVES, 35 or more is WEAKENED, below that INVALIDATED.",
    ],
    looksAt: [
      "Stretched valuations, over-extended prices and ignored risks",
      "Places where the other agents disagree, and agents that had no data",
      "Survivorship bias and the lack of any validated direction model",
    ],
    neverDoes: [
      "Add conviction. It only challenges the thesis",
      "Attack without evidence. Every challenge cites the data it relies on",
    ],
    handsOver: "A verdict on the thesis (survives, weakened or invalidated), with a survival score and alternative explanations.",
  },
  {
    id: "cio",
    number: "07",
    name: "CIO",
    title: "Chief Investment Officer",
    summary: "Weighs everything, explains disagreements and makes the call, or says there is not enough data.",
    mandate: "Chairs the committee and makes the decision under published rules.",
    howItWorks: [
      "Weights each analyst by its role for the question, your horizon and its evidence quality (confidence × source reliability × freshness).",
      "Counts the quant agent at half weight, because its rule score showed no measured edge.",
      "Maps the weighted score (−2 to +2) to a decision: 1.5 or more STRONG BUY, 1.0 or more BUY, 0.5 or more ACCUMULATE, then HOLD, WATCH/REDUCE and AVOID/SELL.",
      "Applies overrides: HIGH risk caps at ACCUMULATE and EXTREME at WATCH, and a weakened or invalidated thesis downgrades the decision.",
      "Returns INSUFFICIENT DATA when the core analysts have nothing usable.",
    ],
    looksAt: [
      "Every agent's view, weighted by its role, your horizon and the quality of its evidence",
      "Where the agents disagree, and which side the evidence favours",
      "The risk agent's cap and the contrarian's verdict",
    ],
    neverDoes: [
      "Average the scores blindly, or force a decision when the evidence is thin",
      "Call conviction a probability. It measures how much the evidence agrees",
    ],
    handsOver: "The decision, a conviction score and a memo with every claim cited.",
  },
];
