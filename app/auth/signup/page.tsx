import { Suspense } from "react";
import { Activity } from "lucide-react";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex" style={{ background: "#050505" }}>

      {/* LEFT PANEL */}
      <div
        className="hidden lg:flex flex-col w-[54%] relative overflow-hidden"
        style={{
          background: "linear-gradient(150deg, #060604 0%, #090805 60%, #0e0b05 100%)",
          borderRight: "1px solid rgba(255,215,0,0.07)",
        }}
      >
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
        <div
          className="absolute top-[45%] left-[45%] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            width: "600px",
            height: "600px",
            background: "radial-gradient(circle, rgba(255,215,0,0.03) 0%, transparent 65%)",
          }}
        />

        <div className="relative z-10 flex flex-col h-full px-14 py-12">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(255,215,0,0.14), rgba(201,162,39,0.06))",
                border: "1px solid rgba(255,215,0,0.22)",
              }}
            >
              <Activity size={16} style={{ color: "#FFD700" }} />
            </div>
            <div>
              <span
                className="font-bold text-[15px] tracking-wider"
                style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
              >
                <span style={{ color: "#E8E8E8" }}>MARKET KA </span>
                <span style={{ color: "#FFD700" }}>BAADSHAH</span>
              </span>
              <div className="text-[8px] font-mono uppercase tracking-[0.18em] mt-0.5"
                style={{ color: "rgba(255,255,255,0.25)" }}>
                Equity Intelligence Platform
              </div>
            </div>
          </div>

          <div className="mt-20 mb-auto">
            <div
              className="text-[10px] font-mono uppercase tracking-[0.28em] mb-5"
              style={{ color: "rgba(255,215,0,0.55)" }}
            >
              Join the platform
            </div>
            <h1
              className="font-bold leading-[1.1] mb-5"
              style={{
                fontFamily: "var(--font-space-grotesk, sans-serif)",
                fontSize: "clamp(26px, 3vw, 38px)",
                color: "#EEEEEE",
              }}
            >
              Your{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #FFD700, #E8A800)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                institutional-grade
              </span>
              <br />
              research terminal awaits.
            </h1>
            <p
              className="text-[13px] leading-relaxed max-w-sm"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              Access multi-agent AI analysis, live NSE/BSE data, personalized
              watchlists, and decisive equity research — all in one platform.
            </p>
          </div>

          <div className="mt-auto">
            {[
              "Personalized AI equity reports",
              "Real-time NSE/BSE watchlists",
              "Multi-agent technical analysis",
              "Macro & sentiment intelligence",
            ].map(feature => (
              <div
                key={feature}
                className="flex items-center gap-2.5 py-2 border-b"
                style={{ borderColor: "rgba(255,255,255,0.04)" }}
              >
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(0,255,156,0.12)", border: "1px solid rgba(0,255,156,0.25)" }}
                >
                  <span style={{ color: "#00FF9C", fontSize: "9px" }}>✓</span>
                </div>
                <span
                  className="text-[12px] font-mono"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT FORM */}
      <div
        className="flex-1 flex items-center justify-center p-6 sm:p-10"
        style={{ background: "#050505" }}
      >
        <Suspense fallback={
          <div className="w-full max-w-md h-[520px] rounded-2xl animate-pulse"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,215,0,0.08)" }} />
        }>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}
