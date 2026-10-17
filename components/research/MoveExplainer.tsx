"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { MoveAnswer } from "@/lib/research/move";
import { Cited } from "./Cited";

type Result = MoveAnswer & { answerSource: "template" | "llm"; model?: string };
type State = { phase: "idle" } | { phase: "loading" } | { phase: "error"; message: string } | { phase: "done"; data: Result };

const card: React.CSSProperties = { background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-card)", borderRadius: 12, padding: 16 };
const label: React.CSSProperties = { fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--th-text-muted)" };
const CLASS_TEXT: Record<MoveAnswer["classification"], string> = {
  MARKET_DRIVEN: "Mostly market-wide",
  STOCK_SPECIFIC: "Mostly stock-specific",
  MIXED: "Partly market, partly stock-specific",
  QUIET: "Small move",
};

export function MoveView({ data }: { data: Result }) {
  const sections = [["What happened", data.answer.what], ["Market vs stock", data.answer.market], ["News", data.answer.news], ["Caveats", data.answer.caveats]] as const;
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section style={card} aria-labelledby="ans-h">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <h2 id="ans-h" style={{ margin: 0, fontSize: 18 }}>Why is {data.ticker} moving?</h2>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>{CLASS_TEXT[data.classification]}</span>
        </div>
        <div style={{ display: "grid", gap: 10, marginTop: 10, fontSize: 14, lineHeight: 1.6 }}>
          {sections.map(([h, t]) => (
            <div key={h}><div style={label}>{h}</div><p style={{ margin: "2px 0 0" }}><Cited text={t} /></p></div>
          ))}
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 11, color: "var(--th-text-muted)" }}>
          {data.answerSource === "llm" ? `Worded by ${data.model}; every number was checked against the evidence below.` : "Generated from the evidence below by a fixed template."} As of {data.asOf}.
        </p>
      </section>

      <section style={card} aria-labelledby="ev-h">
        <h2 id="ev-h" style={{ ...label, margin: 0 }}>Evidence</h2>
        <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0 }}>
          {data.evidence.map((e) => {
            const h = data.headlines.find((x) => x.id === e.id);
            return (
              <li key={e.id} id={`ev-${e.id}`} style={{ display: "grid", gridTemplateColumns: "34px 1fr auto", gap: 8, padding: "6px 0", borderTop: "1px solid var(--border-muted)", fontSize: 13, scrollMarginTop: 90 }}>
                <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--th-text-muted)" }}>{e.id}</span>
                <span>
                  {h ? <a href={h.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }} className="hover:underline">{h.title}</a> : e.label}
                  <span style={{ display: "block", fontSize: 11, color: "var(--th-text-muted)" }}>{e.source}{e.asOf ? ` · ${e.asOf}` : ""}{h ? ` · ${h.tone} wording` : ""}</span>
                </span>
                {!h && <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{e.display}</span>}
              </li>
            );
          })}
        </ul>
      </section>

      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "var(--th-text-muted)", display: "grid", gap: 2 }}>
        {data.limitations.map((l) => <li key={l}>{l}</li>)}
        <li>Not investment advice.</li>
      </ul>
    </div>
  );
}

export function MoveExplainer() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = (params.get("t") ?? "").toUpperCase();
  const [ticker, setTicker] = useState(initial);
  const [state, setState] = useState<State>({ phase: "idle" });

  const run = useCallback(async (t: string) => {
    if (!t) return;
    setState({ phase: "loading" });
    try {
      const res = await fetch(`/api/research/move/${encodeURIComponent(t)}`);
      const body = await res.json().catch(() => ({}));
      if (res.ok) setState({ phase: "done", data: body as Result });
      else setState({ phase: "error", message: res.status === 404 ? `No price history found for ${t}.` : res.status === 429 ? "Too many requests. Try again later." : res.status === 400 ? "That is not a valid NSE/BSE symbol." : "Research is unavailable right now." });
    } catch {
      setState({ phase: "error", message: "Network error. Check your connection." });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- run once for a ticker given in the URL
    if (initial) void run(initial);
  }, [initial, run]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = ticker.trim().toUpperCase();
          router.replace(`/research?t=${encodeURIComponent(t)}`);
          void run(t);
        }}
        style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}
      >
        <div style={{ flex: "1 1 220px" }}>
          <label htmlFor="rs-ticker" style={{ ...label, display: "block", marginBottom: 6 }}>NSE/BSE symbol</label>
          <input id="rs-ticker" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} maxLength={20} required pattern="[A-Za-z0-9&\-]{1,20}" placeholder="RELIANCE"
            style={{ width: "100%", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)", padding: "10px 12px", fontSize: 14 }} />
        </div>
        <button type="submit" disabled={state.phase === "loading"} style={{ background: "var(--primary)", color: "#050505", border: 0, borderRadius: 8, padding: "11px 16px", fontWeight: 600, cursor: "pointer" }}>
          {state.phase === "loading" ? "Gathering evidence…" : "Why is it moving?"}
        </button>
      </form>
      <div role="status" aria-live="polite">
        {state.phase === "idle" && <p style={{ margin: 0, fontSize: 13, color: "var(--th-text-muted)" }}>Explains today&apos;s move from observable evidence: the market, volume, the model&apos;s expected range and recent headlines.</p>}
        {state.phase === "loading" && <div className="animate-pulse motion-reduce:animate-none" style={{ ...card, height: 140, opacity: 0.6 }} />}
        {state.phase === "error" && <p role="alert" style={{ margin: 0 }}>{state.message}</p>}
      </div>
      {state.phase === "done" && <MoveView data={state.data} />}
    </div>
  );
}
