/**
 * "Why is X moving?" — an evidence-only answer. Pure: all inputs are passed in, so it is fully testable.
 *
 * What it can say: how big today's move is, how much the market (via the stock's beta) accounts for, whether
 * volume is unusual, how the move compares with the model's expected range, and which recent headlines mention
 * the company. What it cannot say: that a headline CAUSED the move. Matching is by name and time only.
 */
import type { Bar } from "@/lib/backtest/types";
import { pct, type Evidence } from "@/lib/ai/evidence";
import type { NewsItem } from "@/lib/services/newsAggregator";

export interface MoveInputs {
  ticker: string;
  symbol: string;
  stock: readonly Bar[];
  index: readonly Bar[];
  /** Intraday change % from the live quote, if available (overrides the last daily bar). */
  liveChangePct?: number | null;
  beta: number | null;
  forecastDailyVol: number | null;
  regime: string | null;
  news: readonly NewsItem[];
  now?: Date;
}

export interface MoveAnswer {
  schema: "move-explanation/1";
  ticker: string;
  asOf: string;
  summary: { stockMove: number; indexMove: number | null; marketPart: number | null; specificPart: number | null; volumeRatio: number | null; moveVsForecast: number | null };
  classification: "MARKET_DRIVEN" | "STOCK_SPECIFIC" | "MIXED" | "QUIET";
  evidence: Evidence[];
  headlines: Array<{ id: string; title: string; source: string; url: string; ageHours: number; tone: NewsItem["sentiment"] }>;
  answer: { what: string; market: string; news: string; caveats: string };
  limitations: string[];
}

const dayChange = (bars: readonly Bar[]) => (bars.length >= 2 ? bars[bars.length - 1].close / bars[bars.length - 2].close - 1 : null);

export function classifyMove(stockMove: number, marketPart: number | null, forecastDailyVol: number | null): MoveAnswer["classification"] {
  const scale = forecastDailyVol && forecastDailyVol > 0 ? forecastDailyVol : 0.015;
  if (Math.abs(stockMove) < 0.5 * scale) return "QUIET";
  if (marketPart === null) return "MIXED";
  const share = Math.abs(marketPart) / Math.abs(stockMove);
  if (Math.sign(marketPart) === Math.sign(stockMove) && share >= 0.67) return "MARKET_DRIVEN";
  if (share <= 0.33 || Math.sign(marketPart) !== Math.sign(stockMove)) return "STOCK_SPECIFIC";
  return "MIXED";
}

export function buildMoveAnswer(inp: MoveInputs): MoveAnswer {
  const stockMove = inp.liveChangePct != null && Number.isFinite(inp.liveChangePct) ? inp.liveChangePct / 100 : dayChange(inp.stock) ?? 0;
  const indexMove = dayChange(inp.index);
  const marketPart = inp.beta != null && indexMove != null ? inp.beta * indexMove : null;
  const specificPart = marketPart != null ? stockMove - marketPart : null;
  const last = inp.stock[inp.stock.length - 1];
  const vols = inp.stock.slice(-21, -1).map((b) => b.volume).filter((v) => v > 0);
  const avgVol = vols.length >= 10 ? vols.reduce((a, b) => a + b, 0) / vols.length : null;
  const volumeRatio = avgVol && last?.volume ? last.volume / avgVol : null;
  const moveVsForecast = inp.forecastDailyVol && inp.forecastDailyVol > 0 ? stockMove / inp.forecastDailyVol : null;
  const classification = classifyMove(stockMove, marketPart, inp.forecastDailyVol);
  const asOf = last?.date ?? "";
  const signed = (v: number, d = 2) => `${v >= 0 ? "+" : "-"}${pct(Math.abs(v), d)}`;

  const ev: Evidence[] = [
    { id: "M1", kind: "market_data", label: `${inp.ticker} change today`, value: stockMove, display: signed(stockMove), source: inp.liveChangePct != null ? "Yahoo Finance live quote (may be delayed)" : `Yahoo Finance ${inp.symbol} daily close`, asOf },
  ];
  if (indexMove != null) ev.push({ id: "M2", kind: "market_data", label: "NIFTY 50 change today", value: indexMove, display: signed(indexMove), source: "Yahoo Finance ^NSEI", asOf: inp.index[inp.index.length - 1]?.date ?? null });
  if (inp.beta != null) ev.push({ id: "M3", kind: "derived_indicator", label: "Beta to NIFTY 50 (60 days)", value: inp.beta, display: inp.beta.toFixed(2), source: "rolling regression", asOf });
  if (marketPart != null && specificPart != null) {
    ev.push({ id: "M4", kind: "derived_indicator", label: "Move explained by the market (beta x index move)", value: marketPart, display: signed(marketPart), source: "M3 x M2", asOf });
    ev.push({ id: "M5", kind: "derived_indicator", label: "Stock-specific part of the move", value: specificPart, display: signed(specificPart), source: "M1 - M4", asOf });
  }
  if (volumeRatio != null) ev.push({ id: "M6", kind: "derived_indicator", label: "Volume vs 20-day average", value: volumeRatio, display: `${volumeRatio.toFixed(1)}x`, source: "daily volume", asOf });
  if (moveVsForecast != null) ev.push({ id: "M7", kind: "ml_model", label: "Move relative to the expected daily move", value: moveVsForecast, display: `${Math.abs(moveVsForecast).toFixed(1)}x`, source: "volatility-ridge forecast", asOf });
  if (inp.regime) ev.push({ id: "M8", kind: "statistical_model", label: "Market regime", value: inp.regime, display: inp.regime, source: "NIFTY trend + India VIX", asOf });

  const now = inp.now ?? new Date();
  const recent = inp.news.filter((n) => n.ageHours <= 72).slice(0, 5);
  const headlines = recent.map((n, i) => ({ id: `N${i + 1}`, title: n.title, source: n.source.split(" / ")[0], url: n.url, ageHours: n.ageHours, tone: n.sentiment }));
  for (const h of headlines) {
    ev.push({ id: h.id, kind: "market_data", label: "Headline mentioning the company", value: h.title, display: h.title, source: h.source, asOf: new Date(now.getTime() - h.ageHours * 3_600_000).toISOString().slice(0, 16) });
  }

  const dir = stockMove >= 0 ? "up" : "down";
  const what = `${inp.ticker} is ${dir} ${pct(Math.abs(stockMove), 2)} [M1]` +
    (moveVsForecast != null ? `, which is ${Math.abs(moveVsForecast).toFixed(1)}x its expected daily move [M7]` : "") +
    (volumeRatio != null ? `, on volume ${volumeRatio.toFixed(1)}x the 20-day average [M6].` : ".");
  const market = marketPart != null && indexMove != null
    ? `NIFTY 50 is ${indexMove >= 0 ? "up" : "down"} ${pct(Math.abs(indexMove), 2)} [M2]. With a beta of ${inp.beta!.toFixed(2)} [M3], the market accounts for about ${signed(marketPart)} [M4], leaving ${signed(specificPart!)} that is specific to ${inp.ticker} [M5]. ` +
      ({ MARKET_DRIVEN: "Most of the move is market-wide.", STOCK_SPECIFIC: "Most of the move is specific to this stock.", MIXED: "The move is partly market-wide and partly stock-specific.", QUIET: "The move is small relative to normal daily swings." } as const)[classification]
    : "Index data was not available, so the market's share of the move cannot be separated.";
  const news = headlines.length
    ? `Recent headlines mentioning the company: ${headlines.map((h) => `[${h.id}]`).join(" ")}. They may be related, but timing and name matching do not prove that any of them caused the move.`
    : "No headlines mentioning the company were found in the last three days; the move may reflect flows, sector news or information not covered by these feeds.";
  const caveats = "Prices may be delayed. This explains what is observable; it does not predict what happens next" + (inp.regime ? `. Market regime: ${inp.regime} [M8].` : ".");

  return {
    schema: "move-explanation/1",
    ticker: inp.ticker,
    asOf,
    summary: { stockMove, indexMove, marketPart, specificPart, volumeRatio, moveVsForecast },
    classification,
    evidence: ev,
    headlines,
    answer: { what, market, news, caveats },
    limitations: [
      "Headlines are matched by company name and time only; causation is not established.",
      "Sources are public RSS feeds and Yahoo Finance; paywalled news, exchange filings and order flow are not covered.",
      "The market's share uses a 60-day beta, a linear approximation.",
    ],
  };
}
