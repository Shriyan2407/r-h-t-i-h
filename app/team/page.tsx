import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { AGENT_PROFILES } from "@/lib/agents/profiles";
import { parseIntent } from "@/lib/agents/intent";
import { planExecution } from "@/lib/agents/router";
import { ROLE_WEIGHTS, UNPROVEN_SIGNAL_MULTIPLIER } from "@/lib/agents/cio";
import { RULE_EVALUATION } from "@/lib/agents/quant";
import type { AgentId, IntentType } from "@/lib/agents/schema";

export const metadata: Metadata = {
  title: "The investment team",
  description: "Meet the seven specialists behind every EquityLens decision: what each one does, how it works and what it never does.",
};

const card: React.CSSProperties = { background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-card)", borderRadius: 14, padding: 20 };
const eyebrow: React.CSSProperties = { fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold)", fontWeight: 700 };
const label: React.CSSProperties = { fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--th-text-muted)", fontWeight: 700, margin: "0 0 6px" };
const muted: React.CSSProperties = { color: "var(--th-text-muted)" };

const FLOW = [
  { title: "You ask", body: "A question in plain words, such as \"Should I buy Reliance for the long term?\"" },
  { title: "The orchestrator plans", body: "It works out what you are asking, which stock and which horizon, then calls only the members that question needs." },
  { title: "Analysts work in parallel", body: "Strategist, Quant, Fundamental, Intelligence and Risk each study real data independently, citing every number." },
  { title: "The contrarian attacks", body: "It reads the others' conclusions and tries to break the emerging thesis with their own evidence." },
  { title: "The CIO decides", body: "It weighs every view, explains each disagreement and writes a memo, or says there is not enough data." },
];

/** Example questions, routed by the real router so this table always matches what runs. */
const EXAMPLES = [
  "Should I buy Reliance?",
  "Why did TCS fall today?",
  "Is Infosys overvalued?",
  "How risky is HDFC Bank?",
  "Should I hold my portfolio during a recession?",
  "Build a moderate-risk portfolio from TCS, ITC and SUNPHARMA",
  "Should I buy NVIDIA?",
];

const INTENT_LABEL: Record<IntentType, string> = {
  investment_decision: "Buy, hold or sell a stock",
  valuation: "Is it fairly valued?",
  risk_assessment: "How risky is it?",
  portfolio_review: "Review my portfolio",
  portfolio_construction: "Build a portfolio",
  explain_move: "Why did it move? (no decision)",
  general_research: "Market outlook (no decision)",
};

const pct = (v: number) => `${Math.round(v * 100)}%`;
const SHORT = Object.fromEntries(AGENT_PROFILES.map((a) => [a.id, a.name])) as Record<AgentId, string>;

export default function TeamPage() {
  const routes = EXAMPLES.map((q) => {
    const plan = planExecution(parseIntent(q));
    return { q, agents: plan.agents.filter((a) => a !== "cio"), blocked: plan.blocked };
  });
  const decisionIntents: IntentType[] = ["investment_decision", "valuation", "risk_assessment", "portfolio_review", "portfolio_construction"];
  const weightCols: AgentId[] = ["strategist", "quant", "fundamental", "intelligence", "risk"];
  const ev = RULE_EVALUATION;

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "96px 16px 72px" }}>
        {/* Header */}
        <div style={eyebrow}>For investors</div>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, margin: "6px 0 10px" }}>The investment team</h1>
        <p style={{ ...muted, fontSize: 16, lineHeight: 1.6, maxWidth: 760, margin: 0 }}>
          Every question you ask EquityLens goes to a committee of seven specialists. Each one has a single job, works
          from real market data and follows rules that are published below. They do not always agree, and when they
          disagree you see why. Nothing they say is guessed: missing data is listed, and every claim links to its source.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
          <Link href="/research#committee" style={{ padding: "11px 20px", borderRadius: 10, fontWeight: 700, fontSize: 14, background: "linear-gradient(135deg, #FFD700 0%, #C9A227 50%, #FFB800 100%)", color: "#050505", textDecoration: "none" }}>
            Watch the team work on your question
          </Link>
          <a href="#members" style={{ padding: "11px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, border: "1px solid var(--th-border-card)", color: "var(--text)", textDecoration: "none" }}>
            Meet the members
          </a>
        </div>

        {/* Roster */}
        <nav aria-label="Team members" style={{ marginTop: 32 }}>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
            {AGENT_PROFILES.map((a) => (
              <li key={a.id}>
                <a href={`#${a.id}`} style={{ display: "block", ...card, padding: "12px 14px", textDecoration: "none", color: "inherit" }}>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--gold)" }}>{a.number}</span>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{a.name}</div>
                  <div style={{ fontSize: 12, ...muted }}>{a.title}</div>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* How a question flows */}
        <section aria-labelledby="flow-h" style={{ marginTop: 48 }}>
          <h2 id="flow-h" style={{ fontSize: 24, fontWeight: 700, margin: "0 0 14px" }}>How the team works on a question</h2>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
            {FLOW.map((f, i) => (
              <li key={f.title} style={card}>
                <div style={{ fontFamily: "monospace", fontSize: 12, color: "var(--gold)" }}>Step {i + 1}</div>
                <div style={{ fontWeight: 700, fontSize: 15, margin: "4px 0" }}>{f.title}</div>
                <p style={{ fontSize: 13, lineHeight: 1.55, margin: 0, ...muted }}>{f.body}</p>
              </li>
            ))}
          </ol>

          <h3 style={{ fontSize: 17, fontWeight: 700, margin: "28px 0 8px" }}>Who joins for which question</h3>
          <p style={{ fontSize: 13, margin: "0 0 10px", ...muted }}>Generated from the live routing code. The CIO always chairs.</p>
          <div style={{ overflowX: "auto", ...card, padding: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: "left", padding: "10px 14px", borderBottom: "1px solid var(--th-border-card)" }}>Question</th>
                  <th scope="col" style={{ textAlign: "left", padding: "10px 14px", borderBottom: "1px solid var(--th-border-card)" }}>Members convened</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((r) => (
                  <tr key={r.q}>
                    <th scope="row" style={{ textAlign: "left", fontWeight: 500, padding: "10px 14px", borderBottom: "1px solid var(--border-muted)" }}>{r.q}</th>
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-muted)", ...muted }}>
                      {r.blocked ? `None. ${r.blocked}` : r.agents.map((a) => SHORT[a]).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Members */}
        <section id="members" aria-labelledby="members-h" style={{ marginTop: 48, scrollMarginTop: 90 }}>
          <h2 id="members-h" style={{ fontSize: 24, fontWeight: 700, margin: "0 0 14px" }}>The members</h2>
          <div style={{ display: "grid", gap: 16 }}>
            {AGENT_PROFILES.map((a) => (
              <article key={a.id} id={a.id} aria-labelledby={`${a.id}-h`} style={{ ...card, scrollMarginTop: 90 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "monospace", fontSize: 13, color: "var(--gold)" }}>{a.number}</span>
                  <h3 id={`${a.id}-h`} style={{ fontSize: 21, fontWeight: 800, margin: 0 }}>{a.name}</h3>
                  <span style={{ fontSize: 13, ...muted }}>{a.title}</span>
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.55, margin: "8px 0 16px" }}>{a.mandate}</p>
                <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                  <div>
                    <h4 style={label}>How it works</h4>
                    <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 13.5, lineHeight: 1.55 }}>
                      {a.howItWorks.map((s) => <li key={s}>{s}</li>)}
                    </ol>
                  </div>
                  <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
                    <div>
                      <h4 style={label}>What it looks at</h4>
                      <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4, fontSize: 13.5, lineHeight: 1.5 }}>
                        {a.looksAt.map((s) => <li key={s}>{s}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 style={label}>What it never does</h4>
                      <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4, fontSize: 13.5, lineHeight: 1.5 }}>
                        {a.neverDoes.map((s) => <li key={s}>{s}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 style={label}>What it hands to the CIO</h4>
                      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>{a.handsOver}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* How the CIO weighs the team */}
        <section aria-labelledby="weights-h" style={{ marginTop: 48 }}>
          <h2 id="weights-h" style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>How much each member counts</h2>
          <p style={{ fontSize: 14, lineHeight: 1.55, margin: "0 0 12px", maxWidth: 780, ...muted }}>
            The CIO&apos;s starting weights, read from the live decision code. Each weight is then multiplied by the quality of
            that member&apos;s evidence on the day (completeness, source reliability and freshness) and adjusted for your horizon.
            The Contrarian has no weight: it changes the decision through its verdict instead.
          </p>
          <div style={{ overflowX: "auto", ...card, padding: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 520 }}>
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: "left", padding: "10px 14px", borderBottom: "1px solid var(--th-border-card)" }}>Question type</th>
                  {weightCols.map((a) => <th key={a} scope="col" style={{ textAlign: "right", padding: "10px 14px", borderBottom: "1px solid var(--th-border-card)" }}>{SHORT[a]}</th>)}
                </tr>
              </thead>
              <tbody>
                {decisionIntents.map((i) => (
                  <tr key={i}>
                    <th scope="row" style={{ textAlign: "left", fontWeight: 500, padding: "10px 14px", borderBottom: "1px solid var(--border-muted)" }}>{INTENT_LABEL[i]}</th>
                    {weightCols.map((a) => {
                      const w = ROLE_WEIGHTS[i][a];
                      const eff = w === undefined ? null : a === "quant" && !ev.measuredEdge ? w * UNPROVEN_SIGNAL_MULTIPLIER : w;
                      return (
                        <td key={a} style={{ textAlign: "right", padding: "10px 14px", borderBottom: "1px solid var(--border-muted)", fontFamily: "monospace", ...muted }}>
                          {eff === null ? "–" : pct(eff)}{a === "quant" && eff !== null && !ev.measuredEdge ? "*" : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!ev.measuredEdge && (
            <p style={{ fontSize: 12, margin: "8px 0 0", ...muted }}>* Halved: the Quant&apos;s rule score showed no edge when tested (see below).</p>
          )}
        </section>

        {/* Track record */}
        <section aria-labelledby="record-h" style={{ marginTop: 48 }}>
          <h2 id="record-h" style={{ fontSize: 24, fontWeight: 700, margin: "0 0 12px" }}>The team&apos;s track record, honestly</h2>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            <div style={card}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>Quant: tested, no edge</h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0, ...muted }}>
                Its rule score was tested on {ev.tickers} stocks from {ev.period[0].slice(0, 4)}, using only data available
                on each date. Its rank correlation with the next {ev.horizonDays} days&apos; returns was {ev.meanRankIc.toFixed(3)}{" "}
                (t {ev.tStat.toFixed(2)}), which is no measurable edge. It still describes the chart well, but it does not forecast it.
              </p>
            </div>
            <div style={card}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>Volatility model: validated</h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0, ...muted }}>
                The Quant and Risk members use one validated model. It forecasts how much a stock may move (not which way)
                and beat simple baselines on data it never saw. <Link href="/models" style={{ color: "var(--gold)", textDecoration: "underline" }}>See the evidence.</Link>
              </p>
            </div>
            <div style={card}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>Fundamental and news: not yet testable</h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0, ...muted }}>
                There is no point-in-time history of fundamentals and headlines in our data, so these members cannot be
                tested on the past yet. Until they can, no decision label has a measured edge.
              </p>
            </div>
          </div>
        </section>

        <section aria-label="Disclaimer" style={{ marginTop: 40, fontSize: 13, lineHeight: 1.6, ...muted, maxWidth: 820 }}>
          <p style={{ margin: "0 0 12px" }}>
            The team covers NSE- and BSE-listed stocks and your saved portfolio. Its decisions summarise evidence under
            published rules; they are not predictions, and conviction measures how much the evidence agrees, not your
            chance of profit. EquityLens is a research tool, not investment advice.
          </p>
          <Link href="/research#committee" style={{ color: "var(--gold)", fontWeight: 700 }}>Ask the team a question →</Link>
        </section>
      </main>
    </>
  );
}
