import { Suspense } from "react";
import { Activity, Shield, Zap, TrendingUp } from "lucide-react";
import { LoginForm } from "./LoginForm";
import { getLandingMarket, type LandingMarket } from "@/lib/services/landingMarket";

/** Real quotes only; see lib/services/landingMarket.ts. Empty when Yahoo is unreachable. */
function toStats(market: LandingMarket | null) {
  if (!market) return [];
  const fmt = (n: number, dec = 2) => n.toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
  return [
    ...market.indices.slice(0, 3).map(i => ({ ticker: i.label, value: fmt(i.value), change: pct(i.change), up: i.change >= 0 })),
    ...market.quotes.slice(0, 3).map(q => ({ ticker: q.ticker, value: `₹${fmt(q.price)}`, change: pct(q.change), up: q.change >= 0 })),
  ];
}

export default async function LoginPage() {
  const marketStats = toStats(await getLandingMarket());
  return (
    <div className="min-h-screen flex" style={{ background: "#050505" }}>

      {/* ══ LEFT VISUAL PANEL ══════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex flex-col w-[58%] relative overflow-hidden"
        style={{
          background: "linear-gradient(150deg, #060604 0%, #090805 60%, #0e0b05 100%)",
          borderRight: "1px solid rgba(255,215,0,0.07)",
        }}
      >
        {/* Subtle grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,215,0,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,215,0,0.04) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Gold radial halo */}
        <div
          className="absolute top-[40%] left-[45%] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            width: "700px",
            height: "700px",
            background: "radial-gradient(circle, rgba(255,215,0,0.035) 0%, transparent 65%)",
          }}
        />

        <div className="relative z-10 flex flex-col h-full px-14 py-12">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(255,215,0,0.14), rgba(201,162,39,0.06))",
                border: "1px solid rgba(255,215,0,0.22)",
              }}
            >
              <Activity size={16} style={{ color: "#FFD700" }} />
            </div>
            <div className="flex flex-col leading-none">
              <span
                className="font-bold text-[15px] tracking-wider"
                style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
              >
                <span style={{ color: "#E8E8E8" }}>MARKET KA </span>
                <span style={{ color: "#FFD700" }}>BAADSHAH</span>
              </span>
              <span
                className="text-[8px] font-mono uppercase tracking-[0.18em] mt-0.5"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                Equity Intelligence Platform
              </span>
            </div>
          </div>

          {/* Headline */}
          <div className="mt-20 mb-auto">
            <div
              className="text-[10px] font-mono uppercase tracking-[0.28em] mb-5"
              style={{ color: "rgba(255,215,0,0.55)" }}
            >
              Institutional Grade · Multi-Agent AI
            </div>
            <h1
              className="font-bold leading-[1.1] mb-5"
              style={{
                fontFamily: "var(--font-space-grotesk, sans-serif)",
                fontSize: "clamp(28px, 3.2vw, 42px)",
                color: "#EEEEEE",
              }}
            >
              Markets reward the{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #FFD700 0%, #F5C518 50%, #E8A800 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                prepared
              </span>
              <br />
              and the patient.
            </h1>
            <p
              className="text-[13.5px] leading-relaxed max-w-[380px]"
              style={{ color: "rgba(255,255,255,0.38)" }}
            >
              NSE/BSE real-time intelligence. Multi-agent technical analysis,
              fundamental research, macro signals. Decisive AI verdicts for every
              serious investor.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 mt-7">
              {[
                { icon: Shield,     label: "Bank-Grade Security" },
                { icon: Zap,        label: "Real-Time Intelligence" },
                { icon: TrendingUp, label: "AI Equity Research" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
                  style={{
                    background: "rgba(255,215,0,0.04)",
                    border: "1px solid rgba(255,215,0,0.10)",
                  }}
                >
                  <Icon size={9} style={{ color: "rgba(255,215,0,0.55)" }} />
                  <span
                    className="text-[9px] font-mono"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Market snapshot - real data only; omitted entirely when unavailable */}
          {marketStats.length > 0 && (
          <div className="mt-auto">
            <div
              className="flex items-center gap-2 mb-3"
              style={{ color: "rgba(255,255,255,0.18)" }}
            >
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00FF9C" }} />
              <span className="text-[8.5px] font-mono uppercase tracking-[0.20em]">
                Market snapshot · may be delayed
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {marketStats.map((item) => (
                <div
                  key={item.ticker}
                  className="flex items-center justify-between px-3 py-2 rounded-lg"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <span
                    className="text-[10px] font-mono font-semibold"
                    style={{ color: "rgba(255,215,0,0.7)" }}
                  >
                    {item.ticker}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      {item.value}
                    </span>
                    <span
                      className="text-[9px] font-mono font-bold"
                      style={{ color: item.up ? "#00FF9C" : "#FF4D4D" }}
                    >
                      {item.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* ══ RIGHT FORM PANEL ═══════════════════════════════════════════════ */}
      <div
        className="flex-1 flex items-center justify-center p-6 sm:p-10"
        style={{ background: "#050505" }}
      >
        <Suspense
          fallback={
            <div className="w-full max-w-md h-96 rounded-2xl animate-pulse"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,215,0,0.08)" }}
            />
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
