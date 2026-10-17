"use client";
import { useState } from "react";
import type { PortfolioRiskResponse } from "@/lib/portfolio/riskService";

const pct = (v: number | null | undefined, d = 1) => (v === null || v === undefined || !Number.isFinite(v) ? "n/a" : `${(v * 100).toFixed(d)}%`);
const num = (v: number | null | undefined, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? "n/a" : v.toFixed(d));

const card: React.CSSProperties = { background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-card)", borderRadius: 12, padding: 16 };
const label: React.CSSProperties = { fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--th-text-muted)" };
const cell: React.CSSProperties = { padding: "5px 8px", fontFamily: "monospace", fontSize: 12, textAlign: "right", whiteSpace: "nowrap" };

function Stat({ name, value, hint }: { name: string; value: string; hint?: string }) {
  return (
    <div style={{ ...card, padding: 12 }}>
      <div style={label}>{name}</div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "monospace", marginTop: 2 }}>{value}</div>
      {hint && <div style={{ fontSize: 11, color: "var(--th-text-muted)", marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function heat(c: number) {
  if (!Number.isFinite(c)) return "transparent";
  const a = Math.min(Math.abs(c), 1) * 0.55;
  return c >= 0 ? `rgba(255,77,77,${a})` : `rgba(56,189,248,${a})`;
}

export function PortfolioRiskView({ data }: { data: PortfolioRiskResponse }) {
  const r = data.report;
  const h = r.historical;
  const conc = r.concentration;
  const showMatrix = r.correlation.tickers.length <= 15;
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
        <Stat name="Expected daily move (model)" value={pct(data.forecast.dailyVol, 2)} hint={`next 5 days · ${pct(data.forecast.coverage, 0)} of value covered`} />
        <Stat name="Historical daily vol" value={pct(data.forecast.historicalDailyVol, 2)} hint={`annualised ${pct(h.annualVol)}`} />
        <Stat name="Beta to NIFTY 50" value={num(h.beta)} hint={`correlation ${num(h.correlationToIndex)}`} />
        <Stat name="Max drawdown (1y)" value={pct(h.maxDrawdown)} />
        <Stat name="1-day VaR 95%" value={pct(h.var95, 2)} hint="historical" />
        <Stat name="Effective holdings" value={num(conc.effectiveHoldings, 1)} hint={`largest ${pct(conc.topWeight)}`} />
        <Stat name="Sharpe / Sortino (1y)" value={`${num(h.sharpe)} / ${num(h.sortino)}`} hint="past, rf = 0" />
        <Stat name="Diversification ratio" value={num(h.diversificationRatio)} hint={`avg pair corr ${num(h.avgPairwiseCorrelation)}`} />
      </div>

      <section style={card} aria-labelledby="stress-h">
        <h3 id="stress-h" style={{ ...label, margin: "0 0 8px" }}>Stress scenarios (estimates, not forecasts)</h3>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {data.stress.map((s) => (
            <li key={s.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, borderTop: "1px solid var(--border-muted)", paddingTop: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "var(--th-text-muted)" }}>{s.method}{s.notes ? ` ${s.notes}` : ""}</div>
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: (s.portfolioReturn ?? 0) < 0 ? "var(--danger)" : "var(--success)" }}>
                {s.portfolioReturn === null ? "no data" : pct(s.portfolioReturn)}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section style={card} aria-labelledby="hold-h">
        <h3 id="hold-h" style={{ ...label, margin: "0 0 8px" }}>Where the risk comes from</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead><tr style={{ color: "var(--th-text-muted)" }}>
              <th scope="col" style={{ ...cell, textAlign: "left" }}>Holding</th><th scope="col" style={cell}>Weight</th><th scope="col" style={cell}>Risk share</th>
              <th scope="col" style={cell}>Ann. vol</th><th scope="col" style={cell}>Beta</th><th scope="col" style={cell}>Days to exit</th>
            </tr></thead>
            <tbody>
              {[...r.holdings].sort((a, b) => b.riskContribution - a.riskContribution).map((x) => (
                <tr key={x.ticker} style={{ borderTop: "1px solid var(--border-muted)" }}>
                  <td style={{ ...cell, textAlign: "left", fontFamily: "inherit" }}>{x.ticker} <span style={{ color: "var(--th-text-muted)" }}>· {x.sector}</span></td>
                  <td style={cell}>{pct(x.weight)}</td>
                  <td style={{ ...cell, fontWeight: x.riskContribution > x.weight * 1.25 ? 700 : 400 }}>{pct(x.riskContribution)}</td>
                  <td style={cell}>{pct(x.annualVol)}</td><td style={cell}>{num(x.beta)}</td>
                  <td style={cell}>{x.daysToLiquidate === null ? "n/a" : x.daysToLiquidate < 0.1 ? "<0.1" : num(x.daysToLiquidate, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--th-text-muted)" }}>
          Risk share is each holding&apos;s contribution to portfolio variance; bold when it is well above its weight.
        </p>
      </section>

      <section style={card} aria-labelledby="sector-h">
        <h3 id="sector-h" style={{ ...label, margin: "0 0 8px" }}>Sector exposure</h3>
        {r.sectors.map((s) => (
          <div key={s.sector} style={{ display: "grid", gridTemplateColumns: "140px 1fr 56px", gap: 8, alignItems: "center", fontSize: 12, marginTop: 4 }}>
            <span>{s.sector}</span>
            <div style={{ height: 6, borderRadius: 3, background: "var(--th-border-card)" }}>
              <div style={{ width: `${Math.min(100, s.weight * 100)}%`, height: 6, borderRadius: 3, background: "var(--primary)" }} />
            </div>
            <span style={{ fontFamily: "monospace", textAlign: "right" }}>{pct(s.weight)}</span>
          </div>
        ))}
      </section>

      <section style={card} aria-labelledby="factor-h">
        <h3 id="factor-h" style={{ ...label, margin: "0 0 8px" }}>Style exposures vs Nifty 50 members</h3>
        {data.factors.exposures.map((f) => {
          const z = f.exposure;
          const pctW = z === null ? 0 : (Math.min(Math.abs(z), 3) / 3) * 50;
          return (
            <div key={f.factor} style={{ display: "grid", gridTemplateColumns: "120px 1fr 120px", gap: 8, alignItems: "center", fontSize: 12, marginTop: 6 }}>
              <span title={f.definition}>{f.name}</span>
              <div role="img" aria-label={z === null ? `${f.name}: no data` : `${f.name}: ${z.toFixed(2)} standard deviations, ${z >= 0 ? f.high : f.low}`}
                style={{ position: "relative", height: 8, borderRadius: 4, background: "var(--th-border-card)" }}>
                <div style={{ position: "absolute", left: "50%", top: -2, width: 1, height: 12, background: "var(--th-text-muted)" }} />
                {z !== null && (
                  <div style={{ position: "absolute", top: 0, height: 8, borderRadius: 4, background: "var(--primary)",
                    left: z >= 0 ? "50%" : `${50 - pctW}%`, width: `${pctW}%` }} />
                )}
              </div>
              <span style={{ fontFamily: "monospace", textAlign: "right" }}>
                {z === null ? "no data" : `${z >= 0 ? "+" : ""}${z.toFixed(2)}`}
                <span style={{ color: "var(--th-text-muted)" }}> · {pct(f.coverage, 0)}</span>
              </span>
            </div>
          );
        })}
        <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--th-text-muted)" }}>
          {data.factors.method} Reference: {data.factors.reference.count} stocks as of {data.factors.reference.asOf}. Right-hand % is the share of value with data.
        </p>
      </section>

      {showMatrix && r.correlation.tickers.length > 1 && (
        <section style={card} aria-labelledby="corr-h">
          <h3 id="corr-h" style={{ ...label, margin: "0 0 8px" }}>Correlation (1y daily returns)</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse" }}>
              <thead><tr><th />{r.correlation.tickers.map((t) => <th key={t} scope="col" style={{ ...cell, fontSize: 10 }}>{t}</th>)}</tr></thead>
              <tbody>
                {r.correlation.matrix.map((row, i) => (
                  <tr key={r.correlation.tickers[i]}>
                    <th scope="row" style={{ ...cell, textAlign: "left", fontSize: 10 }}>{r.correlation.tickers[i]}</th>
                    {row.map((c, j) => <td key={j} style={{ ...cell, background: i === j ? "transparent" : heat(c) }}>{i === j ? "" : num(c)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {data.excluded.length > 0 && (
        <p role="note" style={{ margin: 0, fontSize: 12, color: "var(--warning)" }}>
          Not included: {data.excluded.map((e) => `${e.ticker} (${e.reason})`).join("; ")}.
        </p>
      )}
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "var(--th-text-muted)", display: "grid", gap: 2 }}>
        {r.conventions.map((c) => <li key={c}>{c}</li>)}
        <li>{data.forecast.method}</li>
        <li>As of {r.asOf}. Not investment advice.</li>
      </ul>
    </div>
  );
}

type State = { phase: "idle" } | { phase: "loading" } | { phase: "error"; message: string } | { phase: "ready"; data: PortfolioRiskResponse };

export default function PortfolioRiskPanel() {
  const [state, setState] = useState<State>({ phase: "idle" });
  async function run() {
    setState({ phase: "loading" });
    try {
      const res = await fetch("/api/portfolio/risk");
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.empty) setState({ phase: "error", message: "Add holdings to analyse portfolio risk." });
      else if (res.ok) setState({ phase: "ready", data: body as PortfolioRiskResponse });
      else if (res.status === 429) setState({ phase: "error", message: "Too many risk analyses. Please try again later." });
      else if (res.status === 422) setState({ phase: "error", message: "None of your holdings has enough price history for a risk analysis. Holdings saved only on this device are not included." });
      else setState({ phase: "error", message: "Risk analysis is unavailable right now." });
    } catch {
      setState({ phase: "error", message: "Network error. Check your connection." });
    }
  }
  return (
    <section aria-labelledby="pf-risk-h" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
        <h2 id="pf-risk-h" style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Risk analysis</h2>
        <button onClick={run} disabled={state.phase === "loading"} aria-busy={state.phase === "loading"}
          style={{ fontSize: 13, fontWeight: 600, background: "var(--primary)", color: "#050505", border: 0, borderRadius: 8, padding: "8px 14px", cursor: state.phase === "loading" ? "wait" : "pointer" }}>
          {state.phase === "loading" ? "Analysing…" : state.phase === "ready" ? "Refresh" : "Run risk analysis"}
        </button>
      </div>
      <div role="status" aria-live="polite">
        {state.phase === "idle" && <p style={{ margin: 0, fontSize: 13, color: "var(--th-text-muted)" }}>Concentration, beta, correlation, drawdown, liquidity, stress scenarios and a model-based forecast of portfolio volatility, using your saved holdings.</p>}
        {state.phase === "loading" && <div className="animate-pulse motion-reduce:animate-none" style={{ ...card, height: 120, opacity: 0.6 }} />}
        {state.phase === "error" && <p role="alert" style={{ margin: 0, fontSize: 13 }}>{state.message}</p>}
      </div>
      {state.phase === "ready" && <PortfolioRiskView data={state.data} />}
    </section>
  );
}
