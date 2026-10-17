"use client";
import { useId, useState } from "react";
import { AgentActivity } from "./AgentActivity";
import { CommitteeMemo } from "./CommitteeMemo";
import { useCommittee } from "./useCommittee";
import { card } from "./styles";

const EXAMPLES = [
  "Should I buy Reliance?",
  "Is Infosys overvalued?",
  "Why did TCS fall today?",
  "Should I hold my portfolio during a recession?",
  "Build a moderate-risk portfolio from TCS, HDFCBANK, ITC and SUNPHARMA",
];

/** One question in, seven specialist agents, one evidence-backed committee memo out. */
export function CommitteeWorkspace() {
  const [query, setQuery] = useState("");
  const [llm, setLlm] = useState(false);
  const { state, run } = useCommittee();
  const inputId = useId();
  const running = state.phase === "running";

  const submit = (q: string) => {
    const t = q.trim();
    if (t.length < 3 || running) return;
    setQuery(t);
    void run(t, llm ? "llm" : "template");
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <form
        style={card}
        onSubmit={(e) => { e.preventDefault(); submit(query); }}
        aria-describedby={`${inputId}-help`}
      >
        <label htmlFor={inputId} style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Ask the investment committee</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            id={inputId}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={500}
            placeholder="e.g. Should I buy HDFC Bank for the long term?"
            autoComplete="off"
            style={{ flex: "1 1 260px", minWidth: 0, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--th-border-card)", background: "var(--th-bg-card)", color: "var(--text)", fontSize: 14 }}
          />
          <button
            type="submit"
            disabled={running || query.trim().length < 3}
            style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "var(--primary)", color: "var(--primary-foreground, #000)", fontWeight: 700, fontSize: 14, cursor: running ? "progress" : "pointer", opacity: running || query.trim().length < 3 ? 0.6 : 1 }}
          >
            {running ? "Analysing…" : "Convene committee"}
          </button>
        </div>
        <p id={`${inputId}-help`} style={{ fontSize: 12, color: "var(--th-text-muted)", margin: "8px 0 0" }}>
          Covers NSE/BSE-listed Indian stocks and your saved portfolio. Agents use market data, fundamentals and dated headlines; anything unavailable is reported, not estimated.
        </p>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, marginTop: 8, color: "var(--th-text-muted)" }}>
          <input type="checkbox" checked={llm} onChange={(e) => setLlm(e.target.checked)} />
          Let Claude reword the thesis (kept only if every number and the decision match the evidence)
        </label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }} aria-label="Example questions">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => submit(ex)} disabled={running}
              style={{ fontSize: 12, padding: "5px 10px", borderRadius: 999, border: "1px solid var(--th-border-card)", background: "transparent", color: "var(--text)", cursor: "pointer" }}>
              {ex}
            </button>
          ))}
        </div>
      </form>

      {state.phase !== "idle" && state.agents.length > 0 && (
        <AgentActivity agents={state.agents} running={running} blocked={state.phase === "running" ? state.blocked : state.phase === "done" ? state.result.plan.blocked : null} />
      )}
      {state.phase === "error" && (
        <p role="alert" style={{ ...card, color: "var(--negative)", margin: 0 }}>{state.message}</p>
      )}
      {state.phase === "done" && <CommitteeMemo result={state.result} />}
    </div>
  );
}
