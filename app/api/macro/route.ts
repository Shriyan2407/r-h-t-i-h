import { NextResponse } from "next/server";
import { cache, TTL }    from "@/lib/services/cache";

/* ═══════════════════════════════════════════════════════════════
   R.H.T.I.H — Live Macro Intelligence Engine
   Fetches real market data: NIFTY, VIX, USD/INR, Crude, Gold,
   NIFTY Bank, S&P 500, sector indices — all from Yahoo Finance.
   Computes: risk regime, macro pressure score, sector rotation.
   Zero paid APIs. Zero hardcoded data.
═══════════════════════════════════════════════════════════════ */

interface Index {
  symbol:      string;
  label:       string;
  price:       number;
  change_pct:  number;
  change_1w:   number;
  change_1m:   number;
}

// Minimal yf quote fetch
async function fetchQuote(symbol: string): Promise<{ price: number; change1d: number; change1w: number; change1m: number } | null> {
  try {
    const { default: YFClass } = await import("yahoo-finance2");
    const yf = new (YFClass as any)();

    // Get current quote
    const q = await yf.quote(symbol);
    if (!q?.regularMarketPrice) return null;

    // Get 1M historical for weekly/monthly change
    const now   = new Date();
    const p1    = new Date(now);
    p1.setDate(p1.getDate() - 35);
    const period1 = p1.toISOString().slice(0, 10);
    const period2 = now.toISOString().slice(0, 10);

    let change1w = 0;
    let change1m = 0;
    try {
      const hist = await yf.chart(symbol, { period1, period2, interval: "1d" });
      const quotes = hist?.quotes ?? [];
      if (quotes.length >= 5) {
        const prev5  = quotes[Math.max(0, quotes.length - 6)]?.close;
        const prev20 = quotes[0]?.close;
        const cur    = q.regularMarketPrice;
        if (prev5)  change1w = Math.round(((cur - prev5)  / prev5)  * 10000) / 100;
        if (prev20) change1m = Math.round(((cur - prev20) / prev20) * 10000) / 100;
      }
    } catch { /* skip historical */ }

    return {
      price:    Math.round(q.regularMarketPrice * 100) / 100,
      change1d: Math.round((q.regularMarketChangePercent ?? 0) * 100) / 100,
      change1w,
      change1m,
    };
  } catch { return null; }
}

async function fetchMacroData() {
  const symbols: Record<string, { symbol: string; label: string }> = {
    nifty50:    { symbol: "^NSEI",         label: "NIFTY 50"      },
    niftyBank:  { symbol: "^NSEBANK",      label: "NIFTY Bank"    },
    niftyIT:    { symbol: "^CNXIT",        label: "NIFTY IT"      },
    niftyAuto:  { symbol: "^CNXAUTO",      label: "NIFTY Auto"    },
    indiaVix:   { symbol: "^INDIAVIX",     label: "India VIX"     },
    usdInr:     { symbol: "INR=X",         label: "USD/INR"       },
    brentCrude: { symbol: "BZ=F",          label: "Brent Crude"   },
    gold:       { symbol: "GC=F",          label: "Gold"          },
    sp500:      { symbol: "^GSPC",         label: "S&P 500"       },
    us10y:      { symbol: "^TNX",          label: "US 10Y Yield"  },
    niftyFMCG:  { symbol: "^CNXFMCG",     label: "NIFTY FMCG"    },
    niftyPharma:{ symbol: "^CNXPHARMA",    label: "NIFTY Pharma"  },
    niftyMetal: { symbol: "^CNXMETAL",     label: "NIFTY Metal"   },
    niftyRealty:{ symbol: "^CNXREALTY",    label: "NIFTY Realty"  },
  };

  // Fetch all in parallel, fail gracefully per symbol
  const results = await Promise.allSettled(
    Object.entries(symbols).map(async ([key, info]) => ({
      key,
      ...info,
      data: await fetchQuote(info.symbol),
    })),
  );

  const map: Record<string, { label: string; symbol: string; price: number; change_pct: number; change_1w: number; change_1m: number }> = {};
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.data) {
      const { key, label, symbol, data } = r.value;
      map[key] = { label, symbol, price: data.price, change_pct: data.change1d, change_1w: data.change1w, change_1m: data.change1m };
    }
  }
  return map;
}

function computeRegime(data: Record<string, any>): {
  type: "RISK_ON" | "RISK_OFF" | "NEUTRAL";
  label: string;
  description: string;
  confidence: number;
} {
  let score = 0;
  let signals = 0;

  const vix    = data.indiaVix?.price;
  const nifty  = data.nifty50;
  const sp500  = data.sp500;
  const crude  = data.brentCrude;
  const usdInr = data.usdInr?.price;

  if (vix != null) {
    signals++;
    if (vix < 13)       score += 2;
    else if (vix < 16)  score += 1;
    else if (vix > 22)  score -= 2;
    else if (vix > 18)  score -= 1;
  }

  if (nifty?.change_pct != null) {
    signals++;
    if (nifty.change_pct > 1)     score += 2;
    else if (nifty.change_pct > 0) score += 1;
    else if (nifty.change_pct < -1) score -= 2;
    else score -= 1;
  }
  if (nifty?.change_1w != null) {
    signals++;
    if (nifty.change_1w > 2)     score += 1;
    else if (nifty.change_1w < -2) score -= 1;
  }

  if (sp500?.change_pct != null) {
    signals++;
    if (sp500.change_pct > 0.5)  score += 1;
    else if (sp500.change_pct < -0.8) score -= 1;
  }

  if (usdInr != null) {
    signals++;
    if (usdInr > 86)    score -= 1;
    else if (usdInr < 83) score += 1;
  }

  const normalised = signals > 0 ? score / signals : 0;
  const confidence = Math.min(90, Math.round(40 + Math.abs(normalised) * 50));

  if (normalised > 0.4) return { type: "RISK_ON",  label: "Risk-On",  description: "Broad market risk appetite is positive. Equities outperforming, volatility subdued.", confidence };
  if (normalised < -0.4) return { type: "RISK_OFF", label: "Risk-Off", description: "Risk aversion elevated. Capital rotating to defensive assets, VIX expanding.", confidence };
  return { type: "NEUTRAL", label: "Neutral", description: "Mixed signals — no clear risk-on or risk-off regime. Selective stock-picking environment.", confidence };
}

function computePressureScore(data: Record<string, any>): number {
  // Pressure score 0-100: higher = more bearish pressure
  let score = 40; // neutral baseline

  const vix = data.indiaVix?.price;
  if (vix != null) {
    if (vix > 25) score += 20;
    else if (vix > 18) score += 10;
    else if (vix < 14) score -= 10;
  }

  const usdInr = data.usdInr?.price;
  if (usdInr != null) {
    if (usdInr > 86) score += 8;
    else if (usdInr > 84) score += 3;
    else if (usdInr < 82) score -= 5;
  }

  const crude = data.brentCrude;
  if (crude?.price != null) {
    if (crude.price > 95) score += 8;
    else if (crude.price > 85) score += 3;
    else if (crude.price < 65) score -= 5;
  }

  const sp500 = data.sp500;
  if (sp500?.change_1m != null) {
    if (sp500.change_1m < -5) score += 10;
    else if (sp500.change_1m < -2) score += 5;
    else if (sp500.change_1m > 3)  score -= 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function computeRbiStance(data: Record<string, any>): "HAWKISH" | "NEUTRAL" | "DOVISH" {
  const vix = data.indiaVix?.price ?? 15;
  const usdInr = data.usdInr?.price ?? 83;
  const us10y  = data.us10y?.price ?? 4.3;

  // Simplified RBI stance inference from market data
  if (usdInr > 86 || us10y > 5) return "HAWKISH";
  if (vix < 13 && usdInr < 83 && us10y < 4.0) return "DOVISH";
  return "NEUTRAL";
}

function buildSectorRotation(data: Record<string, any>) {
  const sectors = [
    { key: "niftyBank",   label: "Banking"     },
    { key: "niftyIT",     label: "IT"          },
    { key: "niftyAuto",   label: "Auto"        },
    { key: "niftyFMCG",   label: "FMCG"        },
    { key: "niftyPharma", label: "Pharma"      },
    { key: "niftyMetal",  label: "Metals"      },
    { key: "niftyRealty", label: "Real Estate" },
  ];

  return sectors
    .filter(s => data[s.key]?.change_1w != null)
    .map(s => {
      const w = data[s.key].change_1w;
      return {
        sector:           s.label,
        performance_1w:   w,
        signal:           w > 1.5 ? "ACCUMULATE" as const : w < -1.5 ? "AVOID" as const : "NEUTRAL" as const,
      };
    })
    .sort((a, b) => b.performance_1w - a.performance_1w);
}

async function buildMacroIntelligence() {
  const data       = await fetchMacroData();
  const regime     = computeRegime(data);
  const pressure   = computePressureScore(data);
  const rbiStance  = computeRbiStance(data);
  const sectors    = buildSectorRotation(data);

  const vix        = data.indiaVix?.price ?? 14;
  const macroSignals: string[] = [];
  if (data.nifty50?.change_1w > 2)   macroSignals.push(`NIFTY up ${data.nifty50.change_1w.toFixed(1)}% weekly — positive breadth`);
  if (data.nifty50?.change_1w < -2)  macroSignals.push(`NIFTY down ${Math.abs(data.nifty50.change_1w).toFixed(1)}% weekly — correction underway`);
  if (vix > 20)                       macroSignals.push(`India VIX elevated at ${vix.toFixed(1)} — options pricing in higher risk`);
  if (vix < 13)                       macroSignals.push(`India VIX subdued at ${vix.toFixed(1)} — low volatility regime`);
  if (data.usdInr?.price > 85)        macroSignals.push(`Rupee under pressure at ₹${data.usdInr.price.toFixed(1)} — FII outflow risk`);
  if (data.brentCrude?.price > 90)    macroSignals.push(`Brent Crude at $${data.brentCrude.price.toFixed(0)} — input cost pressure for oil-sensitive sectors`);
  if (data.brentCrude?.price < 70)    macroSignals.push(`Brent Crude at $${data.brentCrude.price.toFixed(0)} — fiscal relief for OMCs and downstream`);
  if (sectors.length > 0)             macroSignals.push(`Sector rotation: ${sectors[0].sector} leads (+${sectors[0].performance_1w.toFixed(1)}% 1W)`);

  const riskFactors: string[] = [];
  if (vix > 20)                         riskFactors.push("Elevated VIX signals short-term volatility");
  if (data.usdInr?.price > 85)          riskFactors.push("Rupee depreciation pressuring FII flows");
  if (data.brentCrude?.price > 90)      riskFactors.push("Oil price spike — CAD and inflation risk");
  if (data.sp500?.change_1m < -4)       riskFactors.push("Global equity weakness contagion risk");
  if (data.us10y?.price > 4.8)          riskFactors.push("US yields elevated — EM outflow risk");
  if (riskFactors.length === 0)         riskFactors.push("No extreme macro stress signals at this time");

  return {
    fetched_at:      new Date().toISOString(),
    regime,
    pressure_score:  pressure,
    rbi_stance:      rbiStance,
    indices: {
      nifty50:    data.nifty50    ?? null,
      nifty_bank: data.niftyBank  ?? null,
      india_vix:  data.indiaVix   ?? null,
    },
    currency: {
      usd_inr: data.usdInr   ?? null,
    },
    commodities: {
      crude_brent: data.brentCrude ?? null,
      gold:        data.gold       ?? null,
    },
    global: {
      sp500:      data.sp500  ?? null,
      us_10y:     data.us10y  ?? null,
    },
    sector_rotation: sectors,
    macro_signals:   macroSignals,
    risk_factors:    riskFactors,
  };
}

export async function GET() {
  try {
    const macro = await cache.wrap("macro:global", TTL.MARKET * 2, buildMacroIntelligence);
    return NextResponse.json(macro, {
      headers: { "Cache-Control": "s-maxage=120, stale-while-revalidate=240" },
    });
  } catch (err) {
    const msg = (err as Error).message;
    console.error("[macro]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
