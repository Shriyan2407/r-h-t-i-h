// ── Minimal interfaces (consumed by both page.tsx and PortfolioIntelligence.tsx) ─

export interface HoldingData {
  ticker: string;
  allocationPct: number;
  pnlPct: number;
  pnl: number;
  currentValue: number;
  investedValue: number;
  sector?: string | null;
  liveChangePct: number;
  quantity?: number;
  avgPrice?: number;
}

export interface PortfolioData {
  hhi: number;
  beta: number;
  sharpe: number;
  volatility: number;
  totalPnlPct: number;
  totalPnl: number;
  totalValue: number;
  investedValue: number;
  gainers: number;
  losers: number;
  sectorCount: number;
  concentration: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// PORTFOLIO DNA
// ══════════════════════════════════════════════════════════════════════════════

export type DNAType =
  | "PSU_HUNTER"
  | "MOMENTUM_CHASER"
  | "TECH_BULL"
  | "BANKING_HEAVY"
  | "DEFENSIVE_INVESTOR"
  | "SPECULATIVE_RETAIL"
  | "BALANCED_GROWTH"
  | "CYCLICAL_COMMODITY";

export interface DNAResult {
  type: DNAType;
  label: string;
  emoji: string;
  description: string;
  behaviors: string[];
  riskTemperament: string;
  color: string;
  bgColor: string;
}

function sectorSum(holdings: HoldingData[], ...names: string[]): number {
  const set = new Set(names.map(s => s.toLowerCase()));
  return holdings.reduce((sum, h) => {
    const s = (h.sector ?? "Other").toLowerCase();
    return set.has(s) ? sum + h.allocationPct : sum;
  }, 0);
}

export function classifyPortfolioDNA(
  holdings: HoldingData[],
  metrics: PortfolioData,
): DNAResult {
  if (holdings.length === 0) {
    return {
      type: "BALANCED_GROWTH", label: "UNKNOWN", emoji: "📊",
      description: "Add holdings to unlock portfolio personality detection.",
      behaviors: ["Awaiting portfolio data"],
      riskTemperament: "Unknown", color: "#FFD700", bgColor: "rgba(255,215,0,0.08)",
    };
  }

  const psu    = sectorSum(holdings, "Energy", "Oil & Gas", "Defense", "Aerospace", "Infra", "Infrastructure");
  const tech   = sectorSum(holdings, "IT", "Technology", "Telecom");
  const bank   = sectorSum(holdings, "Banking", "Financial Services", "Finance");
  const fmcg   = sectorSum(holdings, "FMCG", "Consumer", "Healthcare", "Pharma");
  const metals = sectorSum(holdings, "Metals", "Mining", "Chemicals");

  if (metrics.hhi > 0.42 || (holdings.length <= 3 && metrics.concentration > 55)) {
    return {
      type: "SPECULATIVE_RETAIL", label: "SPECULATIVE RETAIL", emoji: "🎲",
      description: "High-concentration, undiversified portfolio typical of retail momentum bets.",
      behaviors: [
        `${holdings.length} dominant position${holdings.length > 1 ? "s" : ""} carrying all capital weight`,
        "Single thesis dependency — one bad call impacts entire portfolio",
        "Extreme drawdown risk in market corrections",
      ],
      riskTemperament: "EXTREME RISK", color: "#FF4D4D", bgColor: "rgba(255,77,77,0.08)",
    };
  }
  if (psu > 52) {
    return {
      type: "PSU_HUNTER", label: "PSU HUNTER", emoji: "🏛️",
      description: "Government-sector portfolio chasing PSU re-rating and capex cycle themes.",
      behaviors: [
        `${psu.toFixed(0)}% in PSU/Energy/Defense/Infra sectors`,
        "Policy-dependent — budget announcements are high-impact events",
        "Strong capex cycle alignment with dividend optionality",
      ],
      riskTemperament: "MODERATE-HIGH", color: "#FF6B35", bgColor: "rgba(255,107,53,0.08)",
    };
  }
  if (tech > 42) {
    return {
      type: "TECH_BULL", label: "TECH BULL", emoji: "💻",
      description: "Technology-concentrated portfolio aligned with India's digital transformation.",
      behaviors: [
        `${tech.toFixed(0)}% in IT/Technology/Telecom`,
        "USD/INR sensitive — rupee depreciation boosts IT earnings",
        "Global macro dependency — US slowdown directly impacts revenue",
      ],
      riskTemperament: "MODERATE", color: "#00AAFF", bgColor: "rgba(0,170,255,0.08)",
    };
  }
  if (bank > 48) {
    return {
      type: "BANKING_HEAVY", label: "BANKING HEAVY", emoji: "🏦",
      description: "Financial sector dominated portfolio riding India's credit expansion cycle.",
      behaviors: [
        `${bank.toFixed(0)}% in Banking/Financial Services`,
        "RBI rate cycle is the primary portfolio driver",
        "Credit quality and NPA trends are critical watchpoints",
      ],
      riskTemperament: "MODERATE", color: "#F59E0B", bgColor: "rgba(245,158,11,0.08)",
    };
  }
  if (fmcg > 38) {
    return {
      type: "DEFENSIVE_INVESTOR", label: "DEFENSIVE INVESTOR", emoji: "🛡️",
      description: "Stability-focused portfolio built around low-beta consumer and healthcare names.",
      behaviors: [
        `${fmcg.toFixed(0)}% in defensive FMCG/Consumer/Pharma`,
        "Portfolio holds up well in market corrections",
        "Steady compounder style — lower alpha, higher predictability",
      ],
      riskTemperament: "LOW-MODERATE", color: "#34D399", bgColor: "rgba(52,211,153,0.08)",
    };
  }
  if (metrics.beta > 1.45 && metrics.volatility > 28) {
    return {
      type: "MOMENTUM_CHASER", label: "MOMENTUM CHASER", emoji: "⚡",
      description: "High-beta, momentum-driven portfolio chasing breakouts and trend continuation.",
      behaviors: [
        `Portfolio beta ${metrics.beta.toFixed(2)} — amplifies every market move`,
        "Positions selected for price momentum, not fundamental value",
        "Requires constant monitoring — quick entry, quicker exit",
      ],
      riskTemperament: "HIGH", color: "#A78BFA", bgColor: "rgba(167,139,250,0.08)",
    };
  }
  if (metals > 32) {
    return {
      type: "CYCLICAL_COMMODITY", label: "CYCLICAL COMMODITY", emoji: "⛏️",
      description: "Commodity-heavy portfolio sensitive to China demand and global cycles.",
      behaviors: [
        `${metals.toFixed(0)}% in Metals/Chemicals/Materials`,
        "China demand and global inventory cycles are primary catalysts",
        "High cyclicality — strong in upcycles, brutal in downturns",
      ],
      riskTemperament: "HIGH", color: "#94A3B8", bgColor: "rgba(148,163,184,0.08)",
    };
  }
  if (metrics.sectorCount >= 5 && metrics.hhi < 0.16 && holdings.length >= 7) {
    return {
      type: "BALANCED_GROWTH", label: "BALANCED GROWTH", emoji: "📊",
      description: "Well-diversified, institutional-quality portfolio with healthy position sizing.",
      behaviors: [
        `${metrics.sectorCount} sectors, ${holdings.length} holdings — excellent diversification`,
        "No single stock dominates — risk is distributed across themes",
        "All-weather portfolio resilient across market cycles",
      ],
      riskTemperament: "LOW-MODERATE", color: "#00FF9C", bgColor: "rgba(0,255,156,0.08)",
    };
  }
  return {
    type: "BALANCED_GROWTH", label: "INCOME SEEKER", emoji: "💰",
    description: "Mixed portfolio with balanced sector exposure and moderate risk tolerance.",
    behaviors: [
      `${holdings.length} holdings across ${metrics.sectorCount} sector${metrics.sectorCount !== 1 ? "s" : ""}`,
      "Blend of growth and value positions",
      "Moderate risk orientation with income awareness",
    ],
    riskTemperament: "MODERATE", color: "#FFD700", bgColor: "rgba(255,215,0,0.08)",
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// NARRATIVE VERDICT
// ══════════════════════════════════════════════════════════════════════════════

export function generateNarrativeVerdict(
  holdings: HoldingData[],
  metrics: PortfolioData,
  sectorData: { label: string; value: number }[],
): string {
  if (holdings.length === 0) return "Add your first holding to unlock AI portfolio intelligence.";
  if (holdings.length < 3) return `Early-stage portfolio with ${holdings.length} holding${holdings.length === 1 ? "" : "s"}. Add holdings across multiple sectors for a meaningful intelligence profile.`;

  const byAlloc  = [...holdings].sort((a, b) => b.allocationPct - a.allocationPct);
  const byPnl    = [...holdings].sort((a, b) => b.pnlPct - a.pnlPct);
  const top      = byAlloc[0];
  const best     = byPnl[0];
  const worst    = byPnl[byPnl.length - 1];
  const topSec   = sectorData[0];
  const parts: string[] = [];

  // Opening: concentration story
  if (metrics.hhi > 0.40) {
    parts.push(`Dangerously concentrated — ${top.ticker} commands ${top.allocationPct.toFixed(0)}% of total capital, making the entire portfolio hostage to one stock's fate.`);
  } else if (metrics.hhi > 0.25) {
    parts.push(`${top.ticker} dominates at ${top.allocationPct.toFixed(0)}% of the portfolio, creating meaningful single-stock dependency that will amplify P&L swings.`);
  } else if (metrics.hhi < 0.10 && holdings.length >= 7) {
    parts.push(`Institutional-quality diversification — no single holding exceeds ${metrics.concentration.toFixed(0)}%, distributing risk intelligently across ${holdings.length} positions.`);
  } else {
    parts.push(`Moderate diversification across ${metrics.sectorCount} sector${metrics.sectorCount !== 1 ? "s" : ""} with ${holdings.length} active positions.`);
  }

  // Middle: sector dominance or P&L story
  if (topSec && topSec.value > 58) {
    parts.push(`${topSec.label} sector concentration at ${topSec.value.toFixed(0)}% creates sector-level vulnerability — a broad rotation out of ${topSec.label} would disproportionately damage this portfolio.`);
  } else if (metrics.totalPnlPct > 30) {
    parts.push(`Exceptional ${metrics.totalPnlPct.toFixed(1)}% unrealised return led by ${best.ticker} (+${best.pnlPct.toFixed(0)}%), though this gain is compounding concentration risk as winning positions grow larger.`);
  } else if (metrics.totalPnlPct < -12) {
    parts.push(`Under-water at ${metrics.totalPnlPct.toFixed(1)}% — ${worst.ticker} (${worst.pnlPct.toFixed(0)}%) is the biggest drag. A thesis review is warranted before averaging down.`);
  } else if (metrics.gainers >= metrics.losers && metrics.totalPnlPct > 0) {
    parts.push(`${metrics.gainers} of ${holdings.length} positions profitable. ${best.ticker} leads at +${best.pnlPct.toFixed(0)}% while the portfolio accumulates steady unrealised gains.`);
  }

  // Closing: forward-looking
  if (metrics.beta > 1.5) {
    parts.push(`High beta of ${metrics.beta.toFixed(2)} — this portfolio is wired for amplified moves. A 10% NIFTY swing translates to ~${(metrics.beta * 10).toFixed(0)}% portfolio impact.`);
  } else if (metrics.sharpe > 1.5) {
    parts.push(`Risk-adjusted returns are strong (Sharpe ${metrics.sharpe.toFixed(2)}) — this portfolio is efficiently converting risk into returns. Maintain discipline.`);
  } else if (metrics.sectorCount < 3 && holdings.length > 3) {
    parts.push(`Only ${metrics.sectorCount} active sectors across ${holdings.length} holdings is a structural weakness — sector-specific shocks carry outsized impact here.`);
  }

  return parts.join(" ");
}

// ══════════════════════════════════════════════════════════════════════════════
// PER-STOCK ACTION ENGINE
// ══════════════════════════════════════════════════════════════════════════════

export type StockAction = "STRONG" | "HOLD" | "REDUCE" | "WATCH";

export interface StockActionResult {
  action: StockAction;
  reason: string;
  color: string;
  bg: string;
}

export function getStockAction(
  holding: HoldingData,
): StockActionResult {
  const { allocationPct, pnlPct, liveChangePct } = holding;

  if (allocationPct > 28 && pnlPct > 40)
    return { action: "REDUCE", reason: `Overweight at ${allocationPct.toFixed(0)}% with ${pnlPct.toFixed(0)}% gain — book partial profits`, color: "#FF8C42", bg: "rgba(255,140,66,0.14)" };
  if (allocationPct > 35)
    return { action: "REDUCE", reason: `Position too large at ${allocationPct.toFixed(0)}% — concentration risk is elevated`, color: "#FF8C42", bg: "rgba(255,140,66,0.14)" };
  if (pnlPct < -22)
    return { action: "WATCH", reason: `Down ${Math.abs(pnlPct).toFixed(0)}% — review thesis before averaging down`, color: "#FF4D4D", bg: "rgba(255,77,77,0.12)" };
  if (pnlPct < -10 && liveChangePct < -1.5)
    return { action: "WATCH", reason: `Under pressure — ${pnlPct.toFixed(0)}% loss + today's ${liveChangePct.toFixed(1)}% decline`, color: "#FF4D4D", bg: "rgba(255,77,77,0.12)" };
  if (pnlPct > 25 && allocationPct < 20)
    return { action: "STRONG", reason: `+${pnlPct.toFixed(0)}% with healthy sizing — generating strong alpha`, color: "#00FF9C", bg: "rgba(0,255,156,0.12)" };
  if (pnlPct > 15 && liveChangePct > 1)
    return { action: "STRONG", reason: `Momentum intact — ${pnlPct.toFixed(0)}% gain + today's +${liveChangePct.toFixed(1)}%`, color: "#00FF9C", bg: "rgba(0,255,156,0.12)" };

  const holdReason = pnlPct > 0
    ? `Steady +${pnlPct.toFixed(0)}% — maintain position, no action needed`
    : `Minor ${pnlPct.toFixed(0)}% loss within normal range — hold unless thesis changes`;
  return { action: "HOLD", reason: holdReason, color: "#FFD700", bg: "rgba(255,215,0,0.08)" };
}

// ══════════════════════════════════════════════════════════════════════════════
// STRESS TEST ENGINE
// ══════════════════════════════════════════════════════════════════════════════

export interface StressTest {
  scenario: string;
  icon: string;
  portfolioImpactPct: number;
  portfolioImpactAbs: number;
  severity: "SAFE" | "CAUTION" | "WARNING" | "CRITICAL";
}

const STRESS_SCENARIOS: Array<{
  name: string;
  icon: string;
  fn: (beta: number, macro: Record<string, number>) => number;
}> = [
  { name: "NIFTY −5%",    icon: "📉", fn: (b) => b * -5 * 1.08 },
  { name: "NIFTY −20%",   icon: "💥", fn: (b) => b * -20 * 1.15 },
  { name: "Rate Hike +1%", icon: "🏦", fn: (_, m) => -(m.rbi / 100) * 12 - 2 },
  { name: "Oil +30%",      icon: "🛢️", fn: (_, m) => (m.crude / 100) * 6 - (m.crude / 100) * 14 - 3 },
  { name: "US Recession",  icon: "🇺🇸", fn: (b, m) => -(m.usRecession / 100) * 18 - b * 3 },
  { name: "Rupee −10%",    icon: "💵", fn: (_, m) => (m.usdinr / 100) * 8 - (m.crude / 100) * 5 - 1 },
];

export function runStressTests(
  macroExposure: Record<string, number>,
  metrics: PortfolioData,
): StressTest[] {
  return STRESS_SCENARIOS.map(s => {
    const rawPct      = s.fn(metrics.beta, macroExposure);
    const impactPct   = Math.max(-65, Math.min(25, rawPct));
    const impactAbs   = (metrics.totalValue * impactPct) / 100;
    const severity: StressTest["severity"] =
      impactPct < -25 ? "CRITICAL" :
      impactPct < -15 ? "WARNING" :
      impactPct < -8  ? "CAUTION" : "SAFE";
    return { scenario: s.name, icon: s.icon, portfolioImpactPct: impactPct, portfolioImpactAbs: impactAbs, severity };
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// PORTFOLIO DIMENSIONS (Radar Chart)
// ══════════════════════════════════════════════════════════════════════════════

export interface PortfolioDimensions {
  quality: number;
  momentum: number;
  stability: number;
  diversification: number;
  growth: number;
  defense: number;
}

export function computePortfolioDimensions(
  holdings: HoldingData[],
  metrics: PortfolioData,
  macroExposure: Record<string, number>,
): PortfolioDimensions {
  const n = holdings.length;
  if (n === 0) return { quality: 0, momentum: 0, stability: 0, diversification: 0, growth: 0, defense: 0 };

  const winRate = (holdings.filter(h => h.pnl > 0).length / n) * 100;
  const quality = Math.min(100, Math.round(
    winRate * 0.5 + Math.max(0, Math.min(50, metrics.totalPnlPct * 1.2))
  ));

  const avgPnl   = holdings.reduce((s, h) => s + h.pnlPct, 0) / n;
  const momentum = Math.min(100, Math.max(0, Math.round(50 + avgPnl * 1.4)));

  const stability = Math.min(100, Math.max(0, Math.round(100 - metrics.volatility * 1.9)));

  const diversification = Math.min(100, Math.round(
    (1 - metrics.hhi) * 50 +
    Math.min(metrics.sectorCount, 8) * 5.5 +
    Math.min(n, 12) * 2
  ));

  const growth = Math.min(100, Math.round((macroExposure.ai + macroExposure.capex) / 2));

  const defensivePct = sectorSum(holdings, "FMCG", "Consumer", "Pharma", "Healthcare");
  const defense = Math.min(100, Math.round(defensivePct * 0.6 + Math.max(0, (2 - metrics.beta) * 25)));

  return { quality, momentum, stability, diversification, growth, defense };
}

// ══════════════════════════════════════════════════════════════════════════════
// FEAR SCORE
// ══════════════════════════════════════════════════════════════════════════════

export function computeFearScore(holdings: HoldingData[], metrics: PortfolioData): number {
  const n = holdings.length || 1;
  let fear = 0;
  fear += Math.min(35, Math.max(0, (metrics.beta - 0.6) * 22));
  fear += Math.min(28, metrics.hhi * 75);
  fear += Math.min(18, (metrics.volatility - 10) * 0.7);
  fear += (metrics.losers / n) * 12;
  fear += metrics.concentration > 30 ? 7 : 0;
  return Math.max(0, Math.min(100, Math.round(fear)));
}

export function fearLabel(score: number): string {
  if (score >= 80) return "PANIC";
  if (score >= 65) return "FEARFUL";
  if (score >= 45) return "NERVOUS";
  if (score >= 25) return "CAUTIOUS";
  return "CALM";
}

export function fearColor(score: number): string {
  if (score >= 80) return "#FF4D4D";
  if (score >= 65) return "#FF6B6B";
  if (score >= 45) return "#FF8C42";
  if (score >= 25) return "#FFD700";
  return "#00FF9C";
}

// ══════════════════════════════════════════════════════════════════════════════
// AI CHAT ENGINE
// ══════════════════════════════════════════════════════════════════════════════

export interface ChatMessage {
  role: "user" | "ai";
  text: string;
  ts: number;
}

export function processAIQuery(
  query: string,
  holdings: HoldingData[],
  metrics: PortfolioData,
  dna: DNAResult,
  stressTests: StressTest[],
  sectorData: { label: string; value: number }[],
): string {
  if (holdings.length === 0)
    return "Add some holdings first — then I can analyze your portfolio in detail.";

  const q       = query.toLowerCase().trim();
  const byPnl   = [...holdings].sort((a, b) => a.pnlPct - b.pnlPct);
  const worst   = byPnl[0];
  const best    = byPnl[byPnl.length - 1];
  const topAlloc = [...holdings].sort((a, b) => b.allocationPct - a.allocationPct)[0];

  const fmtAbs = (n: number) => {
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "+";
    if (abs >= 10_000_000) return `${sign}₹${(abs / 10_000_000).toFixed(1)}Cr`;
    if (abs >= 100_000)    return `${sign}₹${(abs / 100_000).toFixed(1)}L`;
    return `${sign}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  };

  if (/weak|worst|loss|loser|drag|underperform/.test(q)) {
    return `Your weakest position is **${worst.ticker}** at ${worst.pnlPct.toFixed(1)}% loss (${fmtAbs(worst.pnl)} P&L). It occupies ${worst.allocationPct.toFixed(1)}% of capital. ${worst.pnlPct < -20 ? "This is a significant drawdown — review the investment thesis before averaging down." : "Loss is within tolerable range for now, but watch for further deterioration."}`;
  }

  if (/strong|best|top|winner|gain|outperform/.test(q)) {
    return `**${best.ticker}** is your strongest performer at +${best.pnlPct.toFixed(1)}% (${fmtAbs(best.pnl)} P&L). ${best.allocationPct > 25 ? `It has also grown to ${best.allocationPct.toFixed(0)}% of the portfolio — the combination of size and gains amplifies concentration risk.` : `Well-sized at ${best.allocationPct.toFixed(0)}% of the portfolio — a clean alpha generator.`}`;
  }

  if (/crash|fall|survive|drop|correction|nifty|bear/.test(q)) {
    const s5  = stressTests.find(s => s.scenario.includes("5%"));
    const s20 = stressTests.find(s => s.scenario.includes("20%"));
    if (s5 && s20) {
      return `With portfolio beta **${metrics.beta.toFixed(2)}**: a **NIFTY −5% correction** → estimated portfolio damage **${s5.portfolioImpactPct.toFixed(1)}%** (${fmtAbs(s5.portfolioImpactAbs)}). A **COVID-scale −20% crash** → **${s20.portfolioImpactPct.toFixed(1)}%** (${fmtAbs(s20.portfolioImpactAbs)}). ${metrics.hhi > 0.3 ? "High concentration amplifies your downside beyond the beta estimate." : "Reasonable diversification provides some cushion."}`;
    }
  }

  if (/risk|danger|safe|concentrat|vulnerable/.test(q)) {
    const topSec = sectorData[0];
    if (metrics.hhi > 0.3) {
      return `**HIGH concentration risk** detected. ${topAlloc.ticker} alone holds ${topAlloc.allocationPct.toFixed(0)}% — a single bad quarter destroys portfolio-level returns. ${topSec ? `${topSec.label} sector at ${topSec.value.toFixed(0)}% adds sector-level vulnerability.` : ""} Target: no single position above 20-25%.`;
    }
    return `Portfolio risk is **MODERATE**. Beta ${metrics.beta.toFixed(2)}, estimated volatility ${metrics.volatility.toFixed(0)}% across ${metrics.sectorCount} sectors. Largest risk: ${topAlloc.ticker} at ${topAlloc.allocationPct.toFixed(0)}% concentration.`;
  }

  if (/reduce|sell|exit|trim|profit/.test(q)) {
    const candidates = holdings
      .filter(h => (h.allocationPct > 25 && h.pnlPct > 35) || h.allocationPct > 35)
      .sort((a, b) => b.allocationPct - a.allocationPct);
    if (candidates.length > 0) {
      return `Consider reducing **${candidates.map(c => c.ticker).join(", ")}**. ${candidates[0].allocationPct > 35 ? `${candidates[0].ticker} at ${candidates[0].allocationPct.toFixed(0)}% is dangerously overweight.` : `${candidates[0].ticker} has gained ${candidates[0].pnlPct.toFixed(0)}% and grown to ${candidates[0].allocationPct.toFixed(0)}% — partial profit booking makes strategic sense.`} Target: all positions below 20-25%.`;
    }
    return "No immediate reduction candidates — current position sizing is within acceptable range. Continue monitoring high-performers that may become overweight over time.";
  }

  if (/buy|add|accum|increase/.test(q)) {
    const underweight = holdings.filter(h => h.allocationPct < 8 && h.pnlPct > 8).sort((a, b) => b.pnlPct - a.pnlPct);
    if (underweight.length > 0) {
      return `**${underweight[0].ticker}** is performing well (+${underweight[0].pnlPct.toFixed(0)}%) but is underweight at ${underweight[0].allocationPct.toFixed(1)}%. Accumulating this winner makes sense if the thesis is intact. ${metrics.sectorCount < 5 ? `Also consider adding exposure to new sectors — currently only ${metrics.sectorCount} sectors represented.` : ""}`;
    }
    return `Portfolio sizing looks reasonable. If deploying fresh capital, prioritize underrepresented sectors${metrics.sectorCount < 5 ? ` — you only cover ${metrics.sectorCount} of the market's key themes` : ""}.`;
  }

  if (/diversif|sector|spread|allocation/.test(q)) {
    const missingSectors = ["Pharma", "IT", "FMCG", "Auto", "Defense"].filter(s => !sectorData.some(d => d.label === s));
    return `Portfolio spans **${metrics.sectorCount} sector${metrics.sectorCount !== 1 ? "s" : ""}** with ${holdings.length} holdings. HHI diversification index: ${metrics.hhi.toFixed(3)} (${metrics.hhi < 0.15 ? "excellent" : metrics.hhi < 0.25 ? "good" : "moderate"}). ${metrics.sectorCount < 4 ? `Structurally underdiversified — consider adding ${missingSectors.slice(0, 2).join(", ")} exposure.` : "Sector distribution is reasonable."}`;
  }

  if (/alpha|benchmark|nifty|outperform|compare|return/.test(q)) {
    return `Portfolio return: **${metrics.totalPnlPct >= 0 ? "+" : ""}${metrics.totalPnlPct.toFixed(1)}%**. With beta ${metrics.beta.toFixed(2)}, a typical NIFTY50 move of ~12% implies ${(12 * metrics.beta).toFixed(1)}% expected portfolio move. Sharpe ratio ${metrics.sharpe.toFixed(2)} indicates **${metrics.sharpe > 1.5 ? "excellent" : metrics.sharpe > 1 ? "good" : metrics.sharpe > 0.5 ? "moderate" : "poor"}** risk-adjusted performance.`;
  }

  if (/dna|type|personality|style|investor/.test(q)) {
    return `Your portfolio DNA is **${dna.label}** ${dna.emoji}. ${dna.description} Risk temperament: **${dna.riskTemperament}**. Key behaviors: ${dna.behaviors.slice(0, 2).join("; ")}.`;
  }

  if (/dead|stagnant|idle|capital/.test(q)) {
    const dead = holdings.filter(h => Math.abs(h.pnlPct) < 3 && h.allocationPct > 8);
    if (dead.length > 0) {
      return `Potential dead capital detected in **${dead.map(d => d.ticker).join(", ")}** — ${dead.length > 1 ? "these positions are" : "this position is"} flat (within 3%) but consuming meaningful allocation. If the thesis isn't playing out, consider redeployment to higher-conviction ideas.`;
    }
    return "No obvious dead capital detected — most holdings are showing meaningful price movement relative to average cost.";
  }

  return `I can analyze: weakest/strongest stock, crash survival, concentration risk, sell/buy candidates, diversification gaps, benchmark comparison, portfolio DNA. Try: "Can my portfolio survive a 20% crash?" or "Which stock should I reduce?"`;
}
