import type { CommitteeResult } from "@/lib/agents/orchestrator";
import { AGENT_NAMES, type AgentEvidence } from "@/lib/agents/schema";
import { Cited } from "../Cited";
import { VIEW_LABEL, decisionColor, viewColor } from "./state";
import { body, card, label } from "./styles";

function List({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p style={{ ...body, color: "var(--th-text-muted)" }}>{empty}</p>;
  return (
    <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
      {items.map((t, i) => <li key={i} style={{ fontSize: 14, lineHeight: 1.55 }}><Cited text={t} /></li>)}
    </ul>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section style={card} aria-labelledby={id}>
      <h3 id={id} style={{ ...label, margin: "0 0 8px" }}>{title}</h3>
      {children}
    </section>
  );
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

function EvidenceRow({ e }: { e: AgentEvidence }) {
  return (
    <li id={`ev-${e.id}`} style={{ display: "grid", gridTemplateColumns: "38px 1fr", gap: 8, padding: "7px 0", borderTop: "1px solid var(--border-muted)", fontSize: 13, scrollMarginTop: 90 }}>
      <span style={{ fontFamily: "monospace", color: "var(--primary)" }}>{e.id}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ overflowWrap: "anywhere" }}>{e.label}: <strong>{e.display}</strong></div>
        <div style={{ fontSize: 11, color: "var(--th-text-muted)", overflowWrap: "anywhere" }}>
          {e.url ? <a href={e.url} target="_blank" rel="noopener noreferrer nofollow" style={{ color: "inherit" }}>{e.source}</a> : e.source}
          {e.asOf ? ` · ${e.asOf.slice(0, 16).replace("T", " ")}` : " · undated"} · {e.kind.replace(/_/g, " ")} · reliability {pct(e.reliability)}
        </div>
      </div>
    </li>
  );
}

export function CommitteeMemo({ result }: { result: CommitteeResult }) {
  const { memo, decision } = result;
  const color = decisionColor(decision.decision);
  const groups = new Map<string, AgentEvidence[]>();
  for (const r of result.results) if (r.evidence.length) groups.set(AGENT_NAMES[r.agent], r.evidence);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section style={{ ...card, borderColor: color }} aria-labelledby="verdict-h">
        <div style={label}>Investment verdict</div>
        <h2 id="verdict-h" style={{ margin: "4px 0 2px", fontSize: 22 }}>{memo.asset}</h2>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: "0.02em", color }}>{decision.decision ?? "No decision"}</span>
          {decision.decision && decision.decision !== "INSUFFICIENT DATA" && (
            <div style={{ minWidth: 180, flex: "1 1 180px", maxWidth: 320 }}>
              <div style={{ fontSize: 12, color: "var(--th-text-muted)" }}>Conviction {decision.conviction}/100 (evidence agreement, not a probability)</div>
              <div role="meter" aria-label="Conviction" aria-valuemin={0} aria-valuemax={100} aria-valuenow={decision.conviction} style={{ height: 6, borderRadius: 3, background: "var(--th-border-subtle)", marginTop: 4 }}>
                <div style={{ width: `${decision.conviction}%`, height: "100%", borderRadius: 3, background: color }} />
              </div>
            </div>
          )}
        </div>
        <p style={{ ...body, marginTop: 10 }}><Cited text={memo.executiveThesis} /></p>
        <p style={{ fontSize: 12, color: "var(--th-text-muted)", margin: "8px 0 0" }}>
          Horizon: {memo.timeHorizon} · {memo.currentContext}
          {result.narrative.source === "llm" ? ` · Thesis worded by ${result.narrative.model}; numbers and decision were checked against the evidence.` : ""}
        </p>
        {result.narrative.rejected && result.narrative.source === "template" && (
          <p style={{ fontSize: 12, color: "var(--th-text-muted)", margin: "4px 0 0" }}>AI wording not used: {result.narrative.rejected.join("; ")}.</p>
        )}
      </section>

      {memo.why.length > 0 && <Section id="why-h" title="Why"><List items={memo.why} empty="" /></Section>}

      <Section id="views-h" title="Agent opinions">
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {result.results.filter((r) => r.agent !== "cio").map((r) => (
            <li key={r.agent} style={{ border: "1px solid var(--border-muted)", borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong style={{ fontSize: 13 }}>{AGENT_NAMES[r.agent]}</strong>
                <span style={{ fontSize: 12, fontWeight: 600, color: viewColor(r.view) }}>{VIEW_LABEL[r.view]}</span>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.5, margin: "6px 0 0" }}>{memo.views[r.agent as keyof typeof memo.views]}</p>
              <p style={{ fontSize: 11, color: "var(--th-text-muted)", margin: "6px 0 0" }}>Input coverage {pct(r.confidence)}</p>
              {r.missingData.length > 0 && (
                <details style={{ marginTop: 4 }}>
                  <summary style={{ cursor: "pointer", fontSize: 11, color: "var(--th-text-muted)" }}>
                    What this agent could not see ({r.missingData.length})
                  </summary>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: 11, color: "var(--th-text-muted)", lineHeight: 1.5 }}>
                    {r.missingData.map((m) => <li key={m}>{m}</li>)}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="dis-h" title="Disagreements">
        {decision.disagreements.length ? (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {decision.disagreements.map((d, i) => (
              <li key={i} style={{ fontSize: 13, lineHeight: 1.5 }}>
                <strong>{AGENT_NAMES[d.between[0]]}</strong> vs <strong>{AGENT_NAMES[d.between[1]]}</strong>
                <div style={{ color: "var(--th-text-muted)" }}>{d.resolution}</div>
              </li>
            ))}
          </ul>
        ) : <p style={{ ...body, color: "var(--th-text-muted)" }}>The agents that reported did not point in opposite directions.</p>}
        {decision.overrides.length > 0 && <div style={{ marginTop: 10 }}><div style={label}>Committee overrides</div><List items={decision.overrides} empty="" /></div>}
      </Section>

      <Section id="scen-h" title="Scenarios">
        <dl style={{ margin: 0, display: "grid", gap: 8 }}>
          {(["bull", "base", "bear"] as const).map((k) => (
            <div key={k}><dt style={{ fontSize: 12, fontWeight: 700, textTransform: "capitalize" }}>{k} case</dt><dd style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}><Cited text={memo.scenarios[k]} /></dd></div>
          ))}
        </dl>
      </Section>

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <Section id="cat-h" title="Key catalysts"><List items={memo.keyCatalysts} empty="No dated catalysts were found." /></Section>
        <Section id="risk-h" title="Key risks"><List items={memo.keyRisks} empty="No material risks were flagged." /></Section>
      </div>

      <Section id="mind-h" title="What would change our mind"><List items={memo.whatWouldChangeOurMind} empty="" /></Section>

      <Section id="data-h" title="Data used">
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {result.datasets.map((d) => (
            <li key={d.name} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, padding: "4px 0", borderTop: "1px solid var(--border-muted)", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "monospace" }}>{d.name}</span>
              <span style={{ color: d.status === "ok" ? "var(--th-text-muted)" : "var(--negative)" }}>
                {d.status}{d.asOf ? ` · as of ${d.asOf.slice(0, 10)}` : ""}{d.attempts > 1 ? ` · ${d.attempts} attempts` : ""}
              </span>
            </li>
          ))}
        </ul>
        {result.datasets.length === 0 && <p style={{ ...body, color: "var(--th-text-muted)" }}>No data was retrieved.</p>}
      </Section>

      <Section id="ev-h" title={`Evidence (${result.evidence.length})`}>
        {[...groups.entries()].map(([agent, items]) => (
          <details key={agent} style={{ marginTop: 6 }}>
            <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{agent} · {items.length}</summary>
            <ul style={{ listStyle: "none", margin: "4px 0 0", padding: 0 }}>{items.map((e) => <EvidenceRow key={e.id} e={e} />)}</ul>
          </details>
        ))}
      </Section>

      <section aria-label="Disclaimers" style={{ fontSize: 12, color: "var(--th-text-muted)", lineHeight: 1.5 }}>
        {memo.disclaimers.map((d) => <p key={d} style={{ margin: "0 0 4px" }}>{d}</p>)}
        <p style={{ margin: 0, fontFamily: "monospace" }}>Request {result.requestId} · {result.trace.totalMs} ms</p>
      </section>
    </div>
  );
}
