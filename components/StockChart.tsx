"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { getChartData, type Candle } from "@/lib/api";
import type { ChartInterval } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Spinner } from "./ui/Spinner";

const INTERVALS: { label: string; value: ChartInterval }[] = [
  { label: "1D", value: "1D" },
  { label: "1W", value: "1W" },
  { label: "1M", value: "1M" },
  { label: "3M", value: "3M" },
  { label: "6M", value: "6M" },
  { label: "1Y", value: "1Y" },
  { label: "3Y", value: "3Y" },
  { label: "5Y", value: "5Y" },
];

interface StockChartProps {
  ticker: string;
  currentPrice?: number;
  changePct?: number;
}

export function StockChart({ ticker, currentPrice, changePct }: StockChartProps) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const chartRef        = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  // Track which ticker the chart was last built for — prevents stale renders
  const chartTickerRef  = useRef<string>("");

  const [interval, setInterval] = useState<ChartInterval>("3M");
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [ohlcv,    setOhlcv]    = useState<{ o: number; h: number; l: number; c: number } | null>(null);

  // ─── Build / rebuild the chart ─────────────────────────────────────────────
  // Runs whenever ticker changes so old series never bleeds into a new symbol.
  const buildChart = useCallback(() => {
    if (!containerRef.current) return;

    // Destroy previous instance completely
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current        = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0d1117" },
        textColor:  "#8b949e",
        fontSize:   11,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      },
      grid: {
        vertLines: { color: "#21262d", style: 1 },
        horzLines: { color: "#21262d", style: 1 },
      },
      crosshair: {
        mode:      CrosshairMode.Normal,
        vertLine: { color: "#484f58", labelBackgroundColor: "#21262d" },
        horzLine: { color: "#484f58", labelBackgroundColor: "#21262d" },
      },
      rightPriceScale: {
        borderColor:   "#30363d",
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor:    "#30363d",
        timeVisible:    true,
        secondsVisible: false,
        rightOffset:    5,
      },
      handleScroll: true,
      handleScale:  true,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor:        "#00ff88",
      downColor:      "#ff4466",
      borderUpColor:  "#00ff88",
      borderDownColor:"#ff4466",
      wickUpColor:    "#00ff88",
      wickDownColor:  "#ff4466",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat:  { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    // Crosshair tooltip
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !candleSeriesRef.current) { setOhlcv(null); return; }
      const d = param.seriesData.get(candleSeriesRef.current) as
        | { open: number; high: number; low: number; close: number }
        | undefined;
      if (d) setOhlcv({ o: d.open, h: d.high, l: d.low, c: d.close });
      else    setOhlcv(null);
    });

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width:  containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(containerRef.current);

    chartRef.current        = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    chartTickerRef.current  = ticker;   // stamp which ticker owns this chart

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current        = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [ticker]); // ← rebuild the entire chart when ticker changes

  // ─── Load candle data ──────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!chartRef.current || !candleSeriesRef.current || !volumeSeriesRef.current) return;

    setLoading(true);
    setError(null);
    setOhlcv(null);

    // Safety: don't paint data for a different ticker onto this chart
    const expectedTicker = ticker;

    console.log(`[StockChart] Fetching candles  ticker=${ticker}  interval=${interval}`);

    try {
      const candles: Candle[] = await getChartData(ticker, interval);

      // Guard: if ticker changed while request was in-flight, discard
      if (chartTickerRef.current !== expectedTicker) {
        console.warn(`[StockChart] Stale response discarded (expected=${expectedTicker}, chart=${chartTickerRef.current})`);
        return;
      }

      if (!candles || candles.length === 0) {
        setError(`No data returned for ${ticker}.`);
        return;
      }

      if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

      console.log(`[StockChart] Received ${candles.length} candles for ${ticker}`);
      console.log(`[StockChart] Sample candles:`, candles.slice(0, 3));
      console.log(`[StockChart] Price range: ${Math.min(...candles.map(c => c.low)).toFixed(2)} – ${Math.max(...candles.map(c => c.high)).toFixed(2)}`);

      const candleData = candles.map((c) => ({
        time:  c.time as Time,
        open:  c.open,
        high:  c.high,
        low:   c.low,
        close: c.close,
      }));

      const volumeData = candles.map((c) => ({
        time:  c.time as Time,
        value: c.volume,
        color: c.close >= c.open ? "rgba(0,255,136,0.3)" : "rgba(255,68,102,0.3)",
      }));

      // setData() replaces all series data — no stale candles possible
      candleSeriesRef.current.setData(candleData);
      volumeSeriesRef.current.setData(volumeData);
      chartRef.current?.timeScale().fitContent();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[StockChart] Fetch error for ${ticker}:`, msg);
      setError(msg.includes("No data") || msg.includes("404") ? msg : `Chart fetch failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [ticker, interval]);

  // Rebuild chart when ticker changes → clears old series completely
  useEffect(() => {
    const cleanup = buildChart();
    return cleanup;
  }, [buildChart]);

  // Reload data when chart is ready OR interval changes
  useEffect(() => {
    if (chartRef.current) loadData();
  }, [loadData]);

  const isPositive = (changePct ?? 0) >= 0;

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#21262d]">
        <div className="flex items-center gap-3">
          {ohlcv ? (
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-[#8b949e]">O <span className="text-[#e6edf3]">{ohlcv.o.toFixed(2)}</span></span>
              <span className="text-[#8b949e]">H <span className="text-[#00ff88]">{ohlcv.h.toFixed(2)}</span></span>
              <span className="text-[#8b949e]">L <span className="text-[#ff4466]">{ohlcv.l.toFixed(2)}</span></span>
              <span className="text-[#8b949e]">C <span className="text-[#e6edf3]">{ohlcv.c.toFixed(2)}</span></span>
            </div>
          ) : currentPrice ? (
            <div className="flex items-center gap-2">
              <span className="text-base font-mono font-bold text-[#e6edf3]">
                ₹{currentPrice.toFixed(2)}
              </span>
              {changePct !== undefined && (
                <span className={cn("text-xs font-mono font-semibold", isPositive ? "text-[#00ff88]" : "text-[#ff4466]")}>
                  {isPositive ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}%
                </span>
              )}
            </div>
          ) : null}
        </div>

        {/* Interval selector */}
        <div className="flex items-center gap-0.5 bg-[#161b22] border border-[#30363d] rounded-lg p-0.5">
          {INTERVALS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setInterval(value)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-mono rounded-md transition-all",
                interval === value
                  ? "bg-[#00aaff]/10 text-[#00aaff] border border-[#00aaff]/30"
                  : "text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart body */}
      <div className="relative flex-1 min-h-0">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117]/80 z-10">
            <Spinner />
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0d1117] z-10">
            <span className="text-xs font-mono text-[#ff4466] text-center max-w-xs px-4">{error}</span>
            <button
              onClick={loadData}
              className="text-xs font-mono text-[#00aaff] hover:underline"
            >
              Retry
            </button>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
