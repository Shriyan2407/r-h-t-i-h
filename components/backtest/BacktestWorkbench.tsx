"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { fmtInr, fmtPct, fmtRatio } from "@/lib/backtest/format";
import type { BacktestResult, Metrics } from "@/lib/backtest/types";

const EquityChart = dynamic(() => import("./EquityChart"), {
  ssr: false,
  loading: () => <div style={{ height: 320 }} aria-hidden />,
});

const STRATEGIES = [
  { id: "sma_crossover", label: "SMA crossover (20/50)" },
  { id: "rsi_mean_reversion", label: "RSI mean reversion (14, <30 buy, >55 sell)" },
  { id: "buy_and_hold", label: "Buy and hold" },
] as const;

interface ApiOk {
  ticker: string;
  symbol: string;
  years: number;
  barCount: number;
  result: BacktestResult;
}

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "done"; data: ApiOk };

const field: React.CSSProperties = {
  background: "var(--bg-panel)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--foreground)",
  padding: "10px 12px",
  fontSize: 14,
  width: "100%",
};
const label: React.CSSProperties = { display: "block", fontSize: 12, color: "var(--muted-foreground)", marginBottom: 6 };

function Stat({ name, value, hint }: { name: string; value: string; hint?: string }) {
  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 0.6 }}>{name}</div>
      <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{value}</div>
      {hint && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function MetricsGrid({ m, title }: { m: Metrics; title: string }) {
  return (
    <section aria-label={title}>
      <h3 style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 8px" }}>{title}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
        <Stat name="Total return" value={fmtPct(m.totalReturn)} />
        <Stat name="CAGR" value={fmtPct(m.cagr)} />
        <Stat name="Sharpe" value={fmtRatio(m.sharpe)} hint="0% risk-free" />
        <Stat name="Sortino" value={fmtRatio(m.sortino)} />
        <Stat name="Max drawdown" value={fmtPct(m.maxDrawdown)} />
        <Stat name="Win rate" value={fmtPct(m.winRate, 0)} />
        <Stat name="Profit factor" value={fmtRatio(m.profitFactor)} />
        <Stat name="Trades" value={String(m.tradeCount)} />
        <Stat name="Time in market" value={fmtPct(m.exposure, 0)} />
      </div>
    </section>
  );
}

export function BacktestWorkbench() {
  const [ticker, setTicker] = useState("RELIANCE");
  const [strategy, setStrategy] = useState<(typeof STRATEGIES)[number]["id"]>("sma_crossover");
  const [years, setYears] = useState(3);
  const [capital, setCapital] = useState(1_000_000);
  const [feeBps, setFeeBps] = useState(10);
  const [slippageBps, setSlippageBps] = useState(5);
  const [state, setState] = useState<State>({ phase: "idle" });

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setState({ phase: "loading" });
    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, strategy, years, initialCapital: capital, feeBps, slippageBps }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          res.status === 429
            ? "Too many backtests. Please wait a while and try again."
            : res.status === 401
              ? "Please sign in to run a backtest."
              : (body as { error?: string }).error ?? "The backtest failed. Please try again.";
        setState({ phase: "error", message });
        return;
      }
      setState({ phase: "done", data: body as ApiOk });
    } catch {
      setState({ phase: "error", message: "Network error. Check your connection and try again." });
    }
  }

  const busy = state.phase === "loading";

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <form onSubmit={run} aria-busy={busy} style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", alignItems: "end" }}>
        <div>
          <label htmlFor="bt-ticker" style={label}>NSE/BSE symbol</label>
          <input id="bt-ticker" style={field} value={ticker} maxLength={20} required pattern="[A-Za-z0-9&\-]{1,20}"
            onChange={(e) => setTicker(e.target.value.toUpperCase())} />
        </div>
        <div>
          <label htmlFor="bt-strategy" style={label}>Strategy</label>
          <select id="bt-strategy" style={field} value={strategy} onChange={(e) => setStrategy(e.target.value as typeof strategy)}>
            {STRATEGIES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="bt-years" style={label}>History (years)</label>
          <select id="bt-years" style={field} value={years} onChange={(e) => setYears(Number(e.target.value))}>
            {[1, 2, 3, 5, 10].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="bt-capital" style={label}>Capital (₹)</label>
          <input id="bt-capital" style={field} type="number" min={10000} max={1000000000} step={10000} value={capital}
            onChange={(e) => setCapital(Number(e.target.value))} />
        </div>
        <div>
          <label htmlFor="bt-fee" style={label}>Fees per side (bps)</label>
          <input id="bt-fee" style={field} type="number" min={0} max={100} step={1} value={feeBps}
            onChange={(e) => setFeeBps(Number(e.target.value))} />
        </div>
        <div>
          <label htmlFor="bt-slip" style={label}>Slippage per side (bps)</label>
          <input id="bt-slip" style={field} type="number" min={0} max={200} step={1} value={slippageBps}
            onChange={(e) => setSlippageBps(Number(e.target.value))} />
        </div>
        <button type="submit" disabled={busy}
          style={{ background: "var(--primary)", color: "#050505", border: 0, borderRadius: 8, padding: "11px 16px", fontWeight: 600, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}>
          {busy ? "Running…" : "Run backtest"}
        </button>
      </form>

      <div role="status" aria-live="polite">
        {state.phase === "loading" && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--muted-foreground)" }}>
            <Spinner size="sm" /> Fetching history and simulating…
          </div>
        )}
        {state.phase === "error" && <p role="alert" style={{ color: "var(--danger)", margin: 0 }}>{state.message}</p>}
        {state.phase === "idle" && (
          <p style={{ color: "var(--muted-foreground)", margin: 0 }}>
            Choose a symbol and rule, then run. Results describe how the rule would have performed historically after costs.
          </p>
        )}
      </div>

      {state.phase === "done" && <Results data={state.data} />}
    </div>
  );
}

function Results({ data }: { data: ApiOk }) {
  const r = data.result;
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ border: "1px solid var(--border)", background: "var(--primary-muted)", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>
        <strong>BACKTEST RESULT — not a prediction.</strong> {data.symbol}, {data.barCount} daily bars over {data.years}y. Past performance
        does not indicate future results.
      </div>

      <section aria-label="Equity curve">
        <h3 style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 8px" }}>
          Equity: {fmtInr(r.initialCapital)} → {fmtInr(r.finalEquity)}
        </h3>
        <EquityChart equity={r.equity} benchmark={r.benchmark} />
      </section>

      <MetricsGrid m={r.metrics} title="Strategy" />
      <MetricsGrid m={r.benchmarkMetrics} title="Buy & hold benchmark" />

      <section aria-label="Assumptions">
        <h3 style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 8px" }}>Assumptions & limitations</h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--muted-foreground)", display: "grid", gap: 4 }}>
          {r.assumptions.map((a) => <li key={a}>{a}</li>)}
        </ul>
      </section>

      {r.trades.length > 0 && (
        <section aria-label="Trades">
          <h3 style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 8px" }}>Last {Math.min(10, r.trades.length)} trades</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--muted-foreground)" }}>
                  <th scope="col" style={{ padding: "6px 8px" }}>Entry</th>
                  <th scope="col" style={{ padding: "6px 8px" }}>Exit</th>
                  <th scope="col" style={{ padding: "6px 8px", textAlign: "right" }}>Days</th>
                  <th scope="col" style={{ padding: "6px 8px", textAlign: "right" }}>Net return</th>
                </tr>
              </thead>
              <tbody>
                {r.trades.slice(-10).reverse().map((t) => (
                  <tr key={t.entryDate} style={{ borderTop: "1px solid var(--border-muted)" }}>
                    <td style={{ padding: "6px 8px" }}>{t.entryDate}</td>
                    <td style={{ padding: "6px 8px" }}>{t.exitDate}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{t.bars}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: t.returnPct >= 0 ? "var(--success)" : "var(--danger)" }}>
                      {fmtPct(t.returnPct, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
