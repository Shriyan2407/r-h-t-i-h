import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { evaluationSummary } from "@/lib/ml/evaluation";

export const metadata: Metadata = {
  title: "Intelligence",
  description: "What the analysis in this product is made of: data, indicators, a validated volatility model, and an LLM that only explains.",
};

const card: React.CSSProperties = { background: "var(--th-bg-elevated)", border: "1px solid var(--th-border-card)", borderRadius: 12, padding: 20 };
const muted: React.CSSProperties = { color: "var(--th-text-muted)" };
const tag = (color: string): React.CSSProperties => ({ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color, border: `1px solid ${color}`, borderRadius: 6, padding: "2px 7px", whiteSpace: "nowrap" });

const LAYERS = [
  { name: "Market data", what: "Daily prices and volume, NIFTY 50 and India VIX from Yahoo Finance. May be delayed; never simulated.", kind: "DATA", color: "var(--th-text-muted)" },
  { name: "Indicators", what: "RSI, MACD, moving averages, ATR, ADX, volatility, drawdown, beta. Fixed formulas, not AI.", kind: "RULES", color: "var(--th-text-muted)" },
  { name: "Market regime", what: "NIFTY vs its 200-day average plus India VIX cut-offs learned from 2011-2025 history. Describes risk, not direction.", kind: "STATISTICAL", color: "var(--secondary)" },
  { name: "Volatility model", what: "A ridge regression trained on 47 NSE stocks (2011-2025) that forecasts the size of the next 5 days' moves. Validated out of sample.", kind: "ML · DEPLOYED", color: "var(--success)" },
  { name: "Direction models", what: "Logistic regression, random forest and gradient boosting were trained to predict up/down moves. None beat chance, so none are used.", kind: "ML · REJECTED", color: "var(--danger)" },
  { name: "Investment committee", what: "One orchestrator and seven rule-based agents (strategist, quant, fundamental, intelligence, risk, contrarian, CIO) weigh cited evidence into a decision. The rules are published but not yet validated against returns.", kind: "RULES · MULTI-AGENT", color: "var(--gold)" },
  { name: "LLM explanations", what: "Optionally rewrites the computed evidence in plain language. It cannot add numbers: any figure not in the evidence is rejected.", kind: "LLM · EXPLAINS ONLY", color: "var(--warning)" },
];

const TOOLS = [
  { href: "/ai/analyze", title: "Stock analysis", body: "Technicals, fundamentals, news and a rule-based score for any NSE/BSE symbol, with an optional AI-written narrative." },
  { href: "/research#committee", title: "Investment committee", body: "Ask a question and seven specialist agents analyse it from real data; the CIO decides, with every claim cited and every gap stated." },
  { href: "/research#move", title: "Why is it moving?", body: "Today's move split into market and stock-specific parts, volume, the expected range and recent headlines, each cited." },
  { href: "/models", title: "Model evidence", body: "Every model we trained, how it was tested, and the measured results, including the ones we rejected." },
  { href: "/backtest", title: "Backtest", body: "Test simple rules on historical prices after fees and slippage, with walk-forward validation in the API." },
  { href: "/portfolio", title: "Portfolio risk", body: "Concentration, beta, correlation, drawdown, liquidity, stress scenarios and a model-based volatility forecast." },
];

export default function IntelligencePage() {
  const ev = evaluationSummary();
  const chosen = ev.volatility.rows.find((r) => r.model === ev.volatility.chosen);
  const bestDirection = Math.max(...ev.direction.targets.flatMap((t) => t.rows.filter((r) => r.kind === "ml").map((r) => r.rocAuc ?? 0)));

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "96px 16px 64px", display: "grid", gap: 28 }}>
        <header>
          <h1 style={{ fontSize: 30, fontWeight: 700, margin: "0 0 8px" }}>How the intelligence works</h1>
          <p style={{ ...muted, margin: 0, maxWidth: 760, fontSize: 15, lineHeight: 1.6 }}>
            Each number in this product comes from one of the layers below, and is labelled with its source. Only one
            trained model is in use: it forecasts how much a stock is likely to move, not which way. We tried to
            forecast direction and could not do better than chance, so we do not show up/down predictions.
          </p>
        </header>

        <section aria-labelledby="measured-h" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          <h2 id="measured-h" className="sr-only">Measured results</h2>
          <div style={card}>
            <div style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", ...muted }}>Volatility model, out of sample</div>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "monospace", marginTop: 4 }}>{chosen?.mseVsPersist != null ? `${(chosen.mseVsPersist * 100).toFixed(1)}%` : "n/a"}</div>
            <div style={{ fontSize: 13, ...muted }}>error vs simply repeating recent volatility, better in {chosen?.foldsBeatingPersist}/{ev.volatility.method.folds} test periods</div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", ...muted }}>Best direction model, out of sample</div>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "monospace", marginTop: 4 }}>AUC {bestDirection.toFixed(3)}</div>
            <div style={{ fontSize: 13, ...muted }}>0.500 is a coin flip; below our 0.52 bar, so not used</div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", ...muted }}>Forecast range reliability</div>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "monospace", marginTop: 4 }}>{chosen ? `${(chosen.interval80Coverage * 100).toFixed(1)}%` : "n/a"}</div>
            <div style={{ fontSize: 13, ...muted }}>of outcomes fell inside the stated 80% range</div>
          </div>
        </section>

        <section aria-labelledby="layers-h">
          <h2 id="layers-h" style={{ fontSize: 18, margin: "0 0 12px" }}>Layers</h2>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
            {LAYERS.map((l, i) => (
              <li key={l.name} style={{ ...card, display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 12, alignItems: "start", padding: 16 }}>
                <span style={{ fontFamily: "monospace", ...muted }}>{i + 1}</span>
                <div><div style={{ fontWeight: 600 }}>{l.name}</div><div style={{ fontSize: 14, ...muted, marginTop: 2 }}>{l.what}</div></div>
                <span style={tag(l.color)}>{l.kind}</span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="tools-h">
          <h2 id="tools-h" style={{ fontSize: 18, margin: "0 0 12px" }}>Tools</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {TOOLS.map((t) => (
              <Link key={t.href} href={t.href} style={{ ...card, display: "block", textDecoration: "none", color: "inherit" }} className="focus-visible:outline focus-visible:outline-2">
                <div style={{ fontWeight: 600 }}>{t.title} →</div>
                <div style={{ fontSize: 14, ...muted, marginTop: 4 }}>{t.body}</div>
              </Link>
            ))}
          </div>
        </section>

        <p style={{ fontSize: 12, ...muted, margin: 0 }}>
          Informational only. Not investment advice. Forecasts are probabilistic, past performance does not guarantee
          future results, and data may be delayed or wrong.
        </p>
      </main>
    </>
  );
}
