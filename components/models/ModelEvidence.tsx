import type { EvaluationSummary } from "@/lib/ml/evaluation";

const f = (v: number | null | undefined, d = 3) => (v === null || v === undefined || !Number.isFinite(v) ? "n/a" : v.toFixed(d));
const p = (v: number | null | undefined, d = 1) => (v === null || v === undefined || !Number.isFinite(v) ? "n/a" : `${(v * 100).toFixed(d)}%`);

const card: React.CSSProperties = { background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-card)", borderRadius: 12, padding: 20 };
const th: React.CSSProperties = { textAlign: "right", padding: "6px 10px", fontWeight: 500, color: "var(--th-text-muted)", fontSize: 12, whiteSpace: "nowrap" };
const td: React.CSSProperties = { textAlign: "right", padding: "6px 10px", fontFamily: "monospace", fontSize: 13, whiteSpace: "nowrap" };
const tdName: React.CSSProperties = { ...td, textAlign: "left", fontFamily: "inherit" };

function Verdict({ v }: { v: "DEPLOYED" | "REJECTED" }) {
  const color = v === "DEPLOYED" ? "var(--success)" : "var(--danger)";
  return <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color, border: `1px solid ${color}`, borderRadius: 6, padding: "2px 8px" }}>{v}</span>;
}

export function ModelEvidence({ data }: { data: EvaluationSummary }) {
  const prod = data.registry.find((m) => m.status === "production");
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section style={card} aria-labelledby="vol-h">
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <h2 id="vol-h" style={{ margin: 0, fontSize: 18 }}>Volatility forecast (next 5 trading days)</h2>
          <Verdict v="DEPLOYED" />
        </div>
        <p style={{ margin: "8px 0 12px", fontSize: 14, color: "var(--th-text-muted)", maxWidth: 760 }}>
          Predicts how large daily moves will be, not their direction. Compared with a naive average and with simply
          repeating recent volatility (persistence), over {data.volatility.method.folds} purged six-month walk-forward folds
          from {data.volatility.method.firstTest} ({data.volatility.method.rows.toLocaleString("en-IN")} out-of-sample predictions).
          In production: <code>{prod ? `${prod.id}@${prod.version}` : "none"}</code>.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead><tr>
              <th scope="col" style={{ ...th, textAlign: "left" }}>Model</th><th scope="col" style={th}>R² vs naive</th><th scope="col" style={th}>Error vs persistence</th>
              <th scope="col" style={th}>Folds beating persistence</th><th scope="col" style={th}>80% range coverage</th><th scope="col" style={th}>Monotone in own vol</th><th scope="col" style={th}>Passed gate</th>
            </tr></thead>
            <tbody>
              {data.volatility.rows.map((r) => (
                <tr key={r.model} style={{ borderTop: "1px solid var(--border-muted)", fontWeight: r.model === data.volatility.chosen ? 700 : 400 }}>
                  <td style={tdName}>{r.model}{r.model === data.volatility.chosen ? " (chosen)" : ""}</td>
                  <td style={td}>{f(r.r2VsNaive)}</td><td style={td}>{p(r.mseVsPersist)}</td>
                  <td style={td}>{r.foldsBeatingPersist ?? "n/a"}</td><td style={td}>{p(r.interval80Coverage)}</td>
                  <td style={td}>{p(r.ownVolMonotoneRate)}</td><td style={td}>{r.eligible === null ? "n/a" : r.eligible ? "yes" : "no"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={card} aria-labelledby="dir-h">
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <h2 id="dir-h" style={{ margin: 0, fontSize: 18 }}>Price direction (up or down over 5 days)</h2>
          <Verdict v="REJECTED" />
        </div>
        <p style={{ margin: "8px 0 4px", fontSize: 14, color: "var(--th-text-muted)", maxWidth: 760 }}>{data.direction.summary}</p>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--th-text-muted)", maxWidth: 760 }}>
          ROC-AUC 0.5 is a coin flip. Brier skill below 0 means the probabilities were worse than always predicting the
          average. Strategy: {data.direction.method.strategy}, {data.direction.method.costBpsPerSide} bps per side.
          Rows starting with <code>rule_</code> are the hand-written indicator rules the product used before, evaluated the same way.
        </p>
        {data.direction.targets.map((t) => (
          <div key={t.target} style={{ marginTop: 12 }}>
            <h3 style={{ fontSize: 14, margin: "0 0 6px" }}>Target: {t.target}</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead><tr>
                  <th scope="col" style={{ ...th, textAlign: "left" }}>Model</th><th scope="col" style={th}>ROC-AUC</th><th scope="col" style={th}>Brier skill</th>
                  <th scope="col" style={th}>Calibration error</th><th scope="col" style={th}>Rank IC</th><th scope="col" style={th}>Net Sharpe</th>
                  <th scope="col" style={th}>Max drawdown</th><th scope="col" style={th}>Benchmark Sharpe</th>
                </tr></thead>
                <tbody>
                  {t.rows.map((r) => (
                    <tr key={r.model} style={{ borderTop: "1px solid var(--border-muted)" }}>
                      <td style={tdName}>{r.model}</td><td style={td}>{f(r.rocAuc)}</td><td style={td}>{f(r.brierSkill, 4)}</td>
                      <td style={td}>{f(r.ece)}</td><td style={td}>{f(r.rankIC, 4)}</td><td style={td}>{f(r.netSharpe, 2)}</td>
                      <td style={td}>{p(r.netMaxDrawdown)}</td><td style={td}>{f(r.benchmarkSharpe, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      <section style={card} aria-labelledby="reg-h">
        <h2 id="reg-h" style={{ margin: 0, fontSize: 18 }}>Market regimes (descriptive)</h2>
        <p style={{ margin: "8px 0 12px", fontSize: 14, color: "var(--th-text-muted)", maxWidth: 760 }}>
          NIFTY 50 above/below its 200-day average, and India VIX below {data.regimes.cutoffs.low.toFixed(2)} / above {data.regimes.cutoffs.high.toFixed(2)}.
          What followed each regime, {data.regimes.sampleRange[0]} to {data.regimes.sampleRange[1]}. {data.regimes.note}
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead><tr>
              <th scope="col" style={{ ...th, textAlign: "left" }}>Regime</th><th scope="col" style={th}>Days</th><th scope="col" style={th}>Next-5-day daily vol</th>
              <th scope="col" style={th}>P(index falls &gt;3% in 5 days)</th><th scope="col" style={th}>Mean 5-day return</th>
            </tr></thead>
            <tbody>
              {data.regimes.historical.map((r) => (
                <tr key={r.regime} style={{ borderTop: "1px solid var(--border-muted)" }}>
                  <td style={tdName}>{r.regime}</td><td style={td}>{r.days}</td><td style={td}>{p(r.meanFwd5dVol, 2)}</td>
                  <td style={td}>{p(r.pFwd5dDrawdownOver3pct)}</td><td style={td}>{p(r.meanFwd5dReturn, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={card} aria-labelledby="regy-h">
        <h2 id="regy-h" style={{ margin: 0, fontSize: 18 }}>Model registry</h2>
        <ul style={{ margin: "10px 0 0", paddingLeft: 18, display: "grid", gap: 6, fontSize: 13 }}>
          {data.registry.map((m) => (
            <li key={`${m.id}@${m.version}`}>
              <code>{m.id}@{m.version}</code> · <strong>{m.status}</strong>
              {"reason" in m && m.reason ? <span style={{ color: "var(--th-text-muted)" }}> · {String(m.reason)}</span> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
