import YFClass from "yahoo-finance2";
import { TTL } from "@/lib/services/cache";
import { isUsable, sharedWrap } from "@/lib/cache/shared";
import type { FundamentalData } from "@/lib/types";

/* yahoo-finance2 v3: default export is the class — must instantiate */
const yf = new (YFClass as any)();

export async function fetchFundamentals(ticker: string): Promise<FundamentalData> {
  const T = ticker.toUpperCase().replace(/\.(NS|BO)$/i, "");
  const symbols = [`${T}.NS`, `${T}.BO`];

  let data: any = null;
  for (const sym of symbols) {
    try {
      const result = await yf.quoteSummary(sym, {
        modules: [
          "financialData",
          "defaultKeyStatistics",
          "summaryDetail",
          "majorHoldersBreakdown",
        ] as any,
      });
      if (result?.financialData || result?.defaultKeyStatistics) {
        data = result;
        break;
      }
    } catch (e) {
      console.warn(`[fundamentals] ${sym}:`, (e as Error).message);
    }
  }

  if (!data) {
    throw new Error(`No fundamental data available for ${T}`);
  }

  const fd = data.financialData        ?? {};
  const ks = data.defaultKeyStatistics ?? {};
  const sd = data.summaryDetail        ?? {};
  const mh = data.majorHoldersBreakdown ?? {};

  const pct = (v: any) => (v != null ? Math.round(Number(v) * 10000) / 100 : null);
  const num = (v: any) => (v != null ? Math.round(Number(v) * 100) / 100 : null);

  return {
    // Valuation
    pe_ratio:    num(sd.trailingPE),
    forward_pe:  num(ks.forwardPE ?? sd.forwardPE),
    pb_ratio:    num(ks.priceToBook),
    ps_ratio:    num(ks.priceToSalesTrailing12Months),
    ev_ebitda:   num(ks.enterpriseToEbitda),
    sector_pe:   null,

    // Profitability
    roe:             pct(fd.returnOnEquity),
    roce:            null,
    roa:             pct(fd.returnOnAssets),
    net_margin:      pct(fd.profitMargins),
    operating_margin:pct(fd.operatingMargins),
    gross_margin:    pct(fd.grossMargins),

    // Growth
    revenue_growth_yoy: pct(fd.revenueGrowth),
    profit_growth_yoy:  pct(fd.earningsGrowth ?? ks.earningsQuarterlyGrowth),
    eps_growth_3yr:     pct(ks.threeYearAverageReturn),

    // Financial Health
    debt_to_equity:     num(fd.debtToEquity),
    current_ratio:      num(fd.currentRatio),
    quick_ratio:        num(fd.quickRatio),
    interest_coverage:  null,
    free_cash_flow:     fd.freeCashflow != null ? Math.round(Number(fd.freeCashflow) / 1e7) : null, // ₹ crore

    // Ownership (Yahoo Finance uses institutional/insider — approximate)
    promoter_holding: mh.insidersPercentHeld != null  ? pct(mh.insidersPercentHeld)       : null,
    fii_holding:      mh.institutionsPercentHeld != null ? pct(mh.institutionsPercentHeld) : null,
    dii_holding:      null,
    pledged_shares:   null,

    // Efficiency
    asset_turnover:       null,
    inventory_turnover:   null,
    receivables_turnover: null,
  };
}

/** Cached (5 min) fundamentals for a validated ticker. Shared by the HTTP route and in-process callers. */
export function getFundamentals(ticker: string): Promise<FundamentalData> {
  return sharedWrap("fundamentals", ticker, TTL.MARKET * 5, () => fetchFundamentals(ticker), isUsable);
}
