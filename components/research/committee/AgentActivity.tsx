import { VIEW_LABEL, viewColor, type AgentRow } from "./state";
import { card, label } from "./styles";

const GLYPH: Record<AgentRow["status"], { mark: string; text: string; color: string }> = {
  pending: { mark: "○", text: "waiting", color: "var(--th-text-muted)" },
  running: { mark: "●", text: "working", color: "var(--gold)" },
  success: { mark: "✓", text: "done", color: "var(--positive)" },
  partial: { mark: "◐", text: "done with gaps", color: "var(--gold)" },
  failed: { mark: "✕", text: "failed", color: "var(--negative)" },
};

/** Live view of the orchestrator: which agents were planned, why, and what each has reported so far. */
export function AgentActivity({ agents, running, blocked }: { agents: AgentRow[]; running: boolean; blocked: string | null }) {
  const done = agents.filter((a) => a.status !== "pending" && a.status !== "running").length;
  return (
    <section style={card} aria-labelledby="orch-h">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <h2 id="orch-h" style={{ ...label, margin: 0 }}>Orchestrator</h2>
        <span style={{ fontSize: 12, color: "var(--th-text-muted)" }} aria-live="polite">
          {running ? `Analysing: ${done} of ${agents.length} agents reported` : `${agents.length} agent${agents.length === 1 ? "" : "s"} reported`}
        </span>
      </div>
      {blocked && <p role="note" style={{ margin: "8px 0 0", fontSize: 13, color: "var(--th-text-muted)" }}>{blocked}</p>}
      <ol style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "grid", gap: 2 }}>
        {agents.map((a) => {
          const g = GLYPH[a.status];
          return (
            <li key={a.id} style={{ display: "grid", gridTemplateColumns: "20px 1fr auto", gap: 10, alignItems: "start", padding: "8px 0", borderTop: "1px solid var(--border-muted)" }}>
              <span aria-hidden="true" className={a.status === "running" ? "motion-safe:animate-pulse" : undefined} style={{ color: g.color, fontSize: 14, lineHeight: "20px", textAlign: "center" }}>{g.mark}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</span>
                  <span className="sr-only">{g.text}</span>
                  {a.id !== "cio" && a.view && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: viewColor(a.view) }}>{VIEW_LABEL[a.view]}</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--th-text-muted)", marginTop: 2 }}>
                  {a.conclusion ?? `Wave ${a.wave}: ${a.reason}`}
                </div>
              </div>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--th-text-muted)", whiteSpace: "nowrap" }}>
                {a.latencyMs !== undefined ? `${(a.latencyMs / 1000).toFixed(1)}s` : g.text}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
