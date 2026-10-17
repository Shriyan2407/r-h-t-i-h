import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { AGENT_PROFILES } from "@/lib/agents/profiles";

const AGENTS = AGENT_PROFILES.map((a) => ({ n: a.number, id: a.id, name: a.name, body: a.summary }));

const QUESTIONS = ["Should I buy Reliance?", "Is Infosys overvalued?", "Should I hold my portfolio in a recession?"];

/** Landing section for investors: what the investment committee is and what it will and will not do. */
export function InvestorCommitteeSection() {
  return (
    <section className="px-4 pb-16" aria-labelledby="investor-committee-h">
      <div
        className="max-w-5xl mx-auto rounded-2xl p-6 sm:p-8"
        style={{ background: "var(--th-bg-card)", border: "1px solid var(--th-border-normal)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Users size={13} style={{ color: "var(--gold)" }} aria-hidden="true" />
          <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--gold)" }}>
            For investors
          </span>
        </div>
        <h2
          id="investor-committee-h"
          className="font-bold mb-2"
          style={{ fontFamily: "var(--font-space-grotesk, sans-serif)", fontSize: "clamp(22px, 3.2vw, 30px)", color: "var(--th-text-primary)" }}
        >
          Your own investment committee
        </h2>
        <p className="text-[14px] leading-relaxed max-w-2xl mb-6" style={{ color: "var(--th-text-muted)" }}>
          Ask a question the way you would ask an adviser. Seven specialists examine it from real market data, challenge
          each other, and a CIO makes the call. Every claim links to its source, and anything the data cannot tell you
          is listed rather than guessed.
        </p>

        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 list-none p-0 m-0 mb-6">
          {AGENTS.map((a) => (
            <li
              key={a.n}
              className="rounded-xl p-4 relative"
              style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-subtle)" }}
            >
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[11px] font-mono" style={{ color: "var(--gold)" }}>{a.n}</span>
                <Link href={`/team#${a.id}`} className="text-[14px] font-semibold after:absolute after:inset-0 focus-visible:outline focus-visible:outline-2" style={{ color: "var(--th-text-primary)" }}>{a.name}</Link>
              </div>
              <p className="text-[12.5px] leading-relaxed m-0" style={{ color: "var(--th-text-muted)" }}>{a.body}</p>
            </li>
          ))}
        </ol>

        <div className="grid gap-6 md:grid-cols-2 items-start">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.14em] mb-2" style={{ color: "var(--th-text-muted)" }}>
              Questions you can ask
            </div>
            <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
              {QUESTIONS.map((q) => (
                <li key={q} className="text-[12.5px] px-3 py-1.5 rounded-full" style={{ border: "1px solid var(--th-border-card)", color: "var(--th-text-primary)" }}>
                  {q}
                </li>
              ))}
            </ul>
            <Link
              href="/research#committee"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl text-[13px] font-bold focus-visible:outline focus-visible:outline-2"
              style={{ background: "linear-gradient(135deg, #FFD700 0%, #C9A227 50%, #FFB800 100%)", color: "#050505" }}
            >
              Ask the committee <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <Link
              href="/team"
              className="inline-flex items-center gap-2 mt-4 ml-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold focus-visible:outline focus-visible:outline-2"
              style={{ border: "1px solid var(--th-border-card)", color: "var(--th-text-primary)" }}
            >
              Meet the team
            </Link>
          </div>
          <div className="rounded-xl p-4 text-[12.5px] leading-relaxed" style={{ border: "1px solid var(--th-border-subtle)", color: "var(--th-text-muted)" }}>
            <strong style={{ color: "var(--th-text-primary)" }}>What to expect.</strong> Decisions summarise the evidence under
            published rules. They are not predictions: no model here has shown it can forecast which way a price will move,
            and the conviction score measures how much the evidence agrees, not your chance of profit. Covers NSE and BSE
            listed stocks and your saved portfolio. Not investment advice.
          </div>
        </div>
      </div>
    </section>
  );
}
