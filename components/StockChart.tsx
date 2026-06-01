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
import { useTheme } from "@/lib/context/ThemeContext";
import { RefreshCw } from "lucide-react";

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

function getChartTheme(isLight: boolean) {
  return {
    bg:              isLight ? "#FAF6EE"                    : "#060606",
    textColor:       isLight ? "#7A7268"                    : "#888888",
    gridColor:       isLight ? "rgba(0,0,0,0.05)"           : "rgba(255,255,255,0.035)",
    borderColor:     isLight ? "rgba(150,120,45,0.18)"      : "rgba(255,215,0,0.09)",
    crosshairColor:  isLight ? "rgba(150,120,45,0.55)"      : "rgba(255,215,0,0.45)",
    labelBg:         isLight ? "#E8E2D4"                    : "#141414",
    upColor:         isLight ? "#0A7A50"                    : "#00FF9C",
    downColor:       isLight ? "#C42B2B"                    : "#FF4D4D",
    volUp:           isLight ? "rgba(10,122,80,0.28)"       : "rgba(0,255,156,0.22)",
    volDown:         isLight ? "rgba(196,43,43,0.28)"       : "rgba(255,77,77,0.22)",
  };
}

export function StockChart({ ticker, currentPrice, changePct }: StockChartProps) {
  const { theme }       = useTheme();
  const isLight         = theme === "light";
  const containerRef    = useRef<HTMLDivElement>(null);
  const chartRef        = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const chartTickerRef  = useRef<string>("");

  const [interval, setInterval] = useState<ChartInterval>("3M");
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [ohlcv,    setOhlcv]    = useState<{ o: number; h: number; l: number; c: number } | null>(null);

  const buildChart = useCallback(() => {
    if (!containerRef.current) return;
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current        = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    }

    const t = getChartTheme(isLight);

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: t.bg },
        textColor:  t.textColor,
        fontSize:   11,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      },
      grid: {
        vertLines: { color: t.gridColor, style: 1 },
        horzLines: { color: t.gridColor, style: 1 },
      },
      crosshair: {
        mode:      CrosshairMode.Normal,
        vertLine: { color: t.crosshairColor, labelBackgroundColor: t.labelBg },
        horzLine: { color: t.crosshairColor, labelBackgroundColor: t.labelBg },
      },
      rightPriceScale: {
        borderColor:  t.borderColor,
        scaleMargins: { top: 0.08, bottom: 0.24 },
      },
      timeScale: {
        borderColor:    t.borderColor,
        timeVisible:    true,
        secondsVisible: false,
        rightOffset:    6,
      },
      handleScroll: true,
      handleScale:  true,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor:         t.upColor,
      downColor:       t.downColor,
      borderUpColor:   t.upColor,
      borderDownColor: t.downColor,
      wickUpColor:     t.upColor,
      wickDownColor:   t.downColor,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat:  { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !candleSeriesRef.current) { setOhlcv(null); return; }
      const d = param.seriesData.get(candleSeriesRef.current) as
        | { open: number; high: number; low: number; close: number }
        | undefined;
      if (d) setOhlcv({ o: d.open, h: d.high, l: d.low, c: d.close });
      else   setOhlcv(null);
    });

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
    chartTickerRef.current  = ticker;

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current        = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [ticker, isLight]);

  const loadData = useCallback(async () => {
    if (!chartRef.current || !candleSeriesRef.current || !volumeSeriesRef.current) return;
    setLoading(true);
    setError(null);
    setOhlcv(null);
    const expectedTicker = ticker;
    const t = getChartTheme(isLight);

    try {
      const candles: Candle[] = await getChartData(ticker, interval);
      if (chartTickerRef.current !== expectedTicker) return;
      if (!candles || candles.length === 0) { setError(`No chart data for ${ticker}.`); return; }
      if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

      candleSeriesRef.current.setData(candles.map(c => ({
        time: c.time as Time,
        open: c.open, high: c.high, low: c.low, close: c.close,
      })));
      volumeSeriesRef.current.setData(candles.map(c => ({
        time:  c.time as Time,
        value: c.volume,
        color: c.close >= c.open ? t.volUp : t.volDown,
      })));
      chartRef.current?.timeScale().fitContent();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes("No data") || msg.includes("404") ? msg : `Chart fetch failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [ticker, interval, isLight]);

  useEffect(() => {
    const cleanup = buildChart();
    return cleanup;
  }, [buildChart]);

  useEffect(() => {
    if (chartRef.current) loadData();
  }, [loadData]);

  const isPositive = (changePct ?? 0) >= 0;
  const t = getChartTheme(isLight);

  return (
    <div className="flex flex-col h-full" style={{ background: t.bg }}>

      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-2.5 gap-3 flex-wrap"
        style={{
          borderBottom: "1px solid var(--th-border-subtle)",
          background: isLight ? "rgba(250,246,238,0.95)" : "rgba(8,8,8,0.97)",
        }}
      >
        {/* OHLCV or current price */}
        <div className="flex items-center gap-3 min-w-0">
          {ohlcv ? (
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span style={{ color: "var(--th-text-muted)" }}>
                O <span style={{ color: "var(--th-text-primary)", fontWeight: 600 }}>{ohlcv.o.toFixed(2)}</span>
              </span>
              <span style={{ color: "var(--th-text-muted)" }}>
                H <span style={{ color: "var(--positive)", fontWeight: 600 }}>{ohlcv.h.toFixed(2)}</span>
              </span>
              <span style={{ color: "var(--th-text-muted)" }}>
                L <span style={{ color: "var(--negative)", fontWeight: 600 }}>{ohlcv.l.toFixed(2)}</span>
              </span>
              <span style={{ color: "var(--th-text-muted)" }}>
                C <span style={{ color: "var(--th-text-primary)", fontWeight: 600 }}>{ohlcv.c.toFixed(2)}</span>
              </span>
            </div>
          ) : currentPrice ? (
            <div className="flex items-center gap-2.5">
              <span className="text-[16px] font-mono font-bold" style={{ color: "var(--th-text-primary)" }}>
                ₹{currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {changePct !== undefined && (
                <span
                  className="text-[11px] font-mono font-bold px-2 py-0.5 rounded"
                  style={{
                    color: isPositive ? "var(--positive)" : "var(--negative)",
                    background: isPositive ? "var(--th-green-bg)" : "var(--th-red-bg)",
                    border: `1px solid ${isPositive ? "rgba(0,255,156,0.2)" : "rgba(255,77,77,0.2)"}`,
                  }}
                >
                  {isPositive ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}%
                </span>
              )}
            </div>
          ) : null}
        </div>

        {/* Interval selector */}
        <div
          className="flex items-center gap-0.5 rounded-lg p-0.5 flex-shrink-0"
          style={{
            background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.03)",
            border: "1px solid var(--th-border-subtle)",
          }}
        >
          {INTERVALS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setInterval(value)}
              className="px-2.5 py-1 text-[10.5px] font-mono font-semibold rounded-md transition-all duration-150"
              style={{
                color: interval === value ? (isLight ? "#050505" : "#050505") : "var(--th-text-muted)",
                background: interval === value
                  ? "linear-gradient(135deg, #FFD700, #C9A227)"
                  : "transparent",
                boxShadow: interval === value ? "0 0 10px rgba(255,215,0,0.2)" : "none",
              }}
              onMouseEnter={e => {
                if (interval !== value) {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-primary)";
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--th-bg-hover)";
                }
              }}
              onMouseLeave={e => {
                if (interval !== value) {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-muted)";
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chart body ── */}
      <div className="relative flex-1 min-h-0">
        {loading && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ background: `${t.bg}CC` }}
          >
            <div className="flex flex-col items-center gap-3">
              <Spinner />
              <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--th-text-muted)" }}>
                Loading chart data…
              </span>
            </div>
          </div>
        )}
        {error && !loading && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 p-6 text-center"
            style={{ background: t.bg }}
          >
            <div className="text-[13px] font-mono font-semibold" style={{ color: "var(--negative)" }}>
              Chart unavailable
            </div>
            <div className="text-[11px] font-mono max-w-xs" style={{ color: "var(--th-text-muted)" }}>
              {error}
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-mono font-semibold transition-all"
              style={{
                color: "var(--gold)",
                background: "var(--th-gold-bg-strong)",
                border: "1px solid var(--th-border-accent)",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 16px rgba(255,215,0,0.15)"}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"}
            >
              <RefreshCw size={11} /> Retry
            </button>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
