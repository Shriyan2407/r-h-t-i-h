"use client";
import { useEffect, useState } from "react";
import type { PerformanceSeries } from "@/lib/portfolio/performance";

type State = { phase: "loading" } | { phase: "error"; message: string } | { phase: "ready"; data: PerformanceSeries };

function Chart({ d }: { d: PerformanceSeries }) {
  const W = 560, H = 150, P = { t: 12, b: 22, l: 40, r: 10 };
  const all = [...d.portfolio, ...d.benchmark];
  const lo = Math.min(...all, 0), hi = Math.max(...all, 0), span = hi - lo || 1;
  const x = (i: number) => P.l + (i / (d.dates.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - (v - lo) / span) * (H - P.t - P.b);
  const path = (xs: number[]) => xs.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const last = d.portfolio.at(-1)!, bl = d.benchmark.at(-1)!;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
      aria-label={`Over ${d.windowDays} trading days your current holdings changed ${last.toFixed(1)}% versus ${bl.toFixed(1)}% for NIFTY 50`}>
      <line x1={P.l} x2={W - P.r} y1={y(0)} y2={y(0)} stroke="var(--th-border-card)" />
      {[lo, hi].map((v) => <text key={v} x={P.l - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="var(--th-text-muted)">{v.toFixed(1)}%</text>)}
      <text x={P.l} y={H - 6} fontSize="9" fill="var(--th-text-muted)">{d.dates[0]}</text>
      <text x={W - P.r} y={H - 6} fontSize="9" textAnchor="end" fill="var(--th-text-muted)">{d.dates.at(-1)}</text>
      <path d={path(d.benchmark)} fill="none" stroke="var(--secondary)" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d={path(d.portfolio)} fill="none" stroke={last >= 0 ? "var(--positive)" : "var(--negative)"} strokeWidth="2" />
    </svg>
  );
}

/** Current holdings over the last ~3 months vs NIFTY 50, from real daily closes. */
export function PerformanceCard({ holdingsKey }: { holdingsKey: string }) {
  const [state, setState] = useState<State>({ phase: "loading" });
  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset before refetching for new holdings
    setState({ phase: "loading" });
    fetch("/api/portfolio/performance")
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!alive) return;
        if (r.ok && !body.empty) setState({ phase: "ready", data: body as PerformanceSeries });
        else setState({ phase: "error", message: r.status === 422 ? "Not enough price history yet." : body.empty ? "Holdings saved only on this device are not included." : "Performance is unavailable right now." });
      })
      .catch(() => alive && setState({ phase: "error", message: "Network error." }));
    return () => {
      alive = false;
    };
  }, [holdingsKey]);

  return (
    <section aria-labelledby="perf-h" className="rounded-xl p-4" style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-card)" }}>
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-2">
        <h2 id="perf-h" className="text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--th-text-muted)", margin: 0 }}>Current holdings vs NIFTY 50</h2>
        <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
          <span style={{ color: "var(--positive)" }}>━</span> holdings · <span style={{ color: "var(--secondary)" }}>┅</span> NIFTY 50
        </span>
      </div>
      <div role="status" aria-live="polite">
        {state.phase === "loading" && <div className="animate-pulse motion-reduce:animate-none rounded-lg" style={{ height: 150, background: "var(--th-border-subtle)" }} />}
        {state.phase === "error" && <p className="text-[12px]" style={{ color: "var(--th-text-muted)", margin: 0 }}>{state.message}</p>}
      </div>
      {state.phase === "ready" && (
        <>
          <Chart d={state.data} />
          <p className="text-[10.5px] mt-1" style={{ color: "var(--th-text-muted)", margin: 0 }}>
            Today&apos;s quantities valued at each day&apos;s close over {state.data.windowDays} trading days; not your actual trading history.
            {state.data.excluded.length > 0 && ` Not enough history for ${state.data.excluded.join(", ")}.`}
          </p>
        </>
      )}
    </section>
  );
}
