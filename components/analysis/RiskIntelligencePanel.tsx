"use client";
import { useCallback, useEffect, useState } from "react";
import type { Evidence, EvidenceKind, RiskContract } from "@/lib/ai/evidence";
import type { Explanation } from "@/lib/ai/riskExplainer";

export type Payload = RiskContract & { explanation: Explanation };
type State =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "unavailable"; reason: string; detail: string }
  | { phase: "ready"; data: Payload };

const pct = (v: number, d = 2) => `${(v * 100).toFixed(d)}%`;

const KIND_LABEL: Record<EvidenceKind, string> = {
  market_data: "Market data",
  derived_indicator: "Indicator",
  statistical_model: "Statistical",
  ml_model: "ML model",
  model_validation: "Validation",
};

const card: React.CSSProperties = { background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-card)", borderRadius: 12, padding: 16 };
const muted: React.CSSProperties = { color: "var(--th-text-muted)" };
const label: React.CSSProperties = { fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--th-text-muted)" };

function Skeleton() {
  return (
    <div aria-hidden style={{ display: "grid", gap: 12 }}>
      {[96, 64, 140].map((h, i) => (
        <div key={i} className="animate-pulse motion-reduce:animate-none" style={{ ...card, height: h, opacity: 0.6 }} />
      ))}
    </div>
  );
}

function Range({ low, mid, high }: { low: number; mid: number; high: number }) {
  // Position on a log scale so the asymmetric interval reads correctly.
  const lo = Math.log(low), hi = Math.log(high), m = Math.log(mid);
  const pos = ((m - lo) / (hi - lo)) * 100;
  return (
    <div aria-label={`80% range ${pct(low)} to ${pct(high)}, forecast ${pct(mid)}`} role="img" style={{ marginTop: 10 }}>
      <div style={{ position: "relative", height: 6, borderRadius: 3, background: "var(--th-border-card)" }}>
        <div style={{ position: "absolute", left: `calc(${pos}% - 5px)`, top: -3, width: 10, height: 12, borderRadius: 3, background: "var(--primary)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 4, ...muted }}>
        <span>{pct(low)}</span><span>80% range</span><span>{pct(high)}</span>
      </div>
    </div>
  );
}

function EvidenceRow({ e }: { e: Evidence }) {
  return (
    <li style={{ display: "grid", gridTemplateColumns: "34px 1fr auto", gap: 8, alignItems: "baseline", padding: "6px 0", borderTop: "1px solid var(--border-muted)" }}>
      <span style={{ fontFamily: "monospace", fontSize: 11, ...muted }}>{e.id}</span>
      <span style={{ fontSize: 13 }}>
        {e.label}
        <span style={{ display: "block", fontSize: 11, ...muted }}>
          {KIND_LABEL[e.kind]} · {e.source}{e.asOf ? ` · ${e.asOf}` : ""}
        </span>
      </span>
      <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600, textAlign: "right" }}>{e.display}</span>
    </li>
  );
}

export function RiskIntelligencePanel({ ticker }: { ticker: string }) {
  const [state, setState] = useState<State>({ phase: "loading" });
  const load = useCallback(async () => {
    setState({ phase: "loading" });
    try {
      const res = await fetch(`/api/ml/risk/${encodeURIComponent(ticker)}`);
      const body = await res.json().catch(() => ({}));
      if (res.status === 422 || res.status === 404 || res.status === 503) {
        setState({ phase: "unavailable", reason: body.reason ?? "UNAVAILABLE", detail: body.detail ?? "" });
      } else if (!res.ok) {
        setState({ phase: "error", message: res.status === 429 ? "Too many requests. Try again later." : "Could not load the risk model." });
      } else {
        setState({ phase: "ready", data: body as Payload });
      }
    } catch {
      setState({ phase: "error", message: "Network error. Check your connection." });
    }
  }, [ticker]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; state is set after the await
    void load();
  }, [load]);

  if (state.phase === "loading") return <div role="status" aria-label="Loading risk model"><Skeleton /></div>;
  if (state.phase === "error") {
    return (
      <div style={card} role="alert">
        <p style={{ margin: 0 }}>{state.message}</p>
        <button onClick={load} style={{ marginTop: 10, fontSize: 13, color: "var(--primary)", background: "none", border: 0, cursor: "pointer", padding: 0 }}>Retry</button>
      </div>
    );
  }
  if (state.phase === "unavailable") {
    const msg = state.reason === "INSUFFICIENT_HISTORY" ? "Not enough trading history for a forecast (about 13 months are needed)."
      : state.reason === "MARKET_DATA_UNAVAILABLE" ? "Index or India VIX data is unavailable right now, so no forecast is made."
      : state.reason === "NO_DATA" ? "No price history was found for this symbol." : "A forecast is not available for this symbol.";
    return <div style={card}><p style={{ margin: 0 }}>{msg}</p>{state.detail && <p style={{ margin: "6px 0 0", fontSize: 12, ...muted }}>{state.detail}</p>}</div>;
  }

  return <RiskView data={state.data} />;
}

/** Presentational view of a loaded forecast (exported for tests). */
export function RiskView({ data: d }: { data: Payload }) {
  const [showWhy, setShowWhy] = useState(false);
  const v = d.volatility;
  const level = v.percentileVsOwnYear === null ? null : v.percentileVsOwnYear >= 80 ? "Elevated" : v.percentileVsOwnYear <= 20 ? "Subdued" : "Typical";

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {d.stale && (
        <div role="alert" style={{ ...card, borderColor: "var(--warning)", fontSize: 13 }}>
          Data is {d.dataAgeDays} days old (last bar {d.asOf}). The forecast may not reflect recent trading.
        </div>
      )}

      <section style={card} aria-labelledby="risk-head">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <h3 id="risk-head" style={{ ...label, margin: 0 }}>Expected daily move · next {v.horizonDays} trading days</h3>
          <span style={{ fontSize: 11, ...muted }}>as of {d.asOf}</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 32, fontWeight: 700, fontFamily: "monospace" }}>{pct(v.dailyVol)}</span>
          {level && <span style={{ fontSize: 13, ...muted }}>{level} for {d.ticker} · {v.percentileVsOwnYear}th percentile of its past year</span>}
        </div>
        <Range low={v.dailyVolLow} mid={v.dailyVol} high={v.dailyVolHigh} />
        <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, margin: "14px 0 0" }}>
          <div><dt style={label}>Typical 5-day move</dt><dd style={{ margin: 0, fontFamily: "monospace" }}>±{pct(v.fiveDayMove, 1)}</dd></div>
          <div><dt style={label}>Annualised</dt><dd style={{ margin: 0, fontFamily: "monospace" }}>{pct(v.annualizedVol, 1)}</dd></div>
          <div><dt style={label}>Direction</dt><dd style={{ margin: 0, fontSize: 13 }}>Not predicted</dd></div>
        </dl>
        <button
          onClick={() => setShowWhy((s) => !s)}
          aria-expanded={showWhy}
          aria-controls="risk-why"
          style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: "var(--primary)", background: "none", border: "1px solid var(--th-border-card)", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}
        >
          {showWhy ? "Hide explanation" : "Why?"}
        </button>
        {showWhy && (
          <div id="risk-why" style={{ marginTop: 12, display: "grid", gap: 10, fontSize: 13, lineHeight: 1.55 }}>
            {([["Why", d.explanation.why], ["What supports it", d.explanation.supports], ["What could invalidate it", d.explanation.invalidates], ["What the model does not know", d.explanation.unknowns]] as const).map(([h, t]) => (
              <div key={h}><div style={label}>{h}</div><p style={{ margin: "2px 0 0" }}>{t}</p></div>
            ))}
            <p style={{ margin: 0, fontSize: 11, ...muted }}>
              {d.explanation.source === "llm" ? `Wording by ${d.explanation.model}, checked against the evidence below; numbers it did not receive are rejected.` : "Generated from the evidence below by a fixed template."}
            </p>
          </div>
        )}
      </section>

      <section style={card} aria-labelledby="factors-head">
        <h3 id="factors-head" style={{ ...label, margin: "0 0 8px" }}>Model factors (contribution vs average)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
          <div>
            <div style={{ ...muted, fontSize: 12 }}>Raising the forecast</div>
            {d.factors.raising.length ? d.factors.raising.map((f) => <div key={f.group} style={{ display: "flex", justifyContent: "space-between" }}><span>{f.group}</span><span style={{ fontFamily: "monospace", color: "var(--danger)" }}>+{f.value.toFixed(2)}</span></div>) : <div style={muted}>None</div>}
          </div>
          <div>
            <div style={{ ...muted, fontSize: 12 }}>Lowering the forecast</div>
            {d.factors.lowering.length ? d.factors.lowering.map((f) => <div key={f.group} style={{ display: "flex", justifyContent: "space-between" }}><span>{f.group}</span><span style={{ fontFamily: "monospace", color: "var(--success)" }}>{f.value.toFixed(2)}</span></div>) : <div style={muted}>None</div>}
          </div>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 11, ...muted }}>Exact linear contributions to log-volatility from the model&apos;s coefficients.</p>
      </section>

      {d.regime && (
        <section style={card} aria-labelledby="regime-head">
          <h3 id="regime-head" style={{ ...label, margin: 0 }}>Market regime</h3>
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{d.regime.name}</div>
          <p style={{ margin: "4px 0 0", fontSize: 13, ...muted }}>
            NIFTY 50 {d.regime.trend === "UP" ? "above" : "below"} its 200-day average; India VIX {d.regime.vol.toLowerCase()}.
            {d.regime.historicalP5dDrawdownOver3pct !== null && ` Since 2011, ${pct(d.regime.historicalP5dDrawdownOver3pct, 1)} of 5-day windows in this regime saw the index fall more than 3%.`}
          </p>
        </section>
      )}

      <section style={card} aria-labelledby="evidence-head">
        <h3 id="evidence-head" style={{ ...label, margin: 0 }}>Evidence ({d.evidence.length})</h3>
        <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0 }}>{d.evidence.map((e) => <EvidenceRow key={e.id} e={e} />)}</ul>
      </section>

      <section style={card} aria-labelledby="model-head">
        <h3 id="model-head" style={{ ...label, margin: 0 }}>Model</h3>
        <div style={{ fontFamily: "monospace", fontSize: 13, marginTop: 4 }}>{d.model.id}@{d.model.version} · {d.model.status} · trained {d.model.trainedAt}</div>
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13, display: "grid", gap: 2 }}>
          <li>Walk-forward ({d.model.validation.folds} folds): {pct(-d.model.validation.mseVsPersist, 1)} lower error than repeating recent volatility; better in {d.model.validation.foldsBeatingPersist}/{d.model.validation.folds} folds.</li>
          <li>80% range contained the outcome {pct(d.model.validation.interval80Coverage, 1)} of the time.</li>
          <li>Holdout (Oct 2025 onward): {pct(-d.model.holdout.mseVsPersist, 1)} lower error{d.model.holdout.pristine ? "" : " (scored after a model fix, so not a pristine holdout)"}.</li>
        </ul>
        <details style={{ marginTop: 8, fontSize: 12 }}>
          <summary style={{ cursor: "pointer", ...muted }}>Limitations and why there is no up/down prediction</summary>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18, display: "grid", gap: 2 }}>
            {d.model.limitations.map((l) => <li key={l}>{l}</li>)}
            <li>{d.direction.reason}</li>
          </ul>
        </details>
      </section>

      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, display: "grid", gap: 2, ...muted }}>
        {d.disclaimers.map((x) => <li key={x}>{x}</li>)}
      </ul>
    </div>
  );
}
