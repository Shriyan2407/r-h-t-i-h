"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Activity, CheckCircle2, AlertCircle, MailCheck, Loader2 } from "lucide-react";
import { useTheme } from "@/lib/context/ThemeContext";

type Status = "idle" | "verifying" | "success" | "error";

function VerifyContent() {
  const params = useSearchParams();
  const token = params.get("token");
  const sent = params.get("sent") === "1";
  const { theme } = useTheme();
  const isLight = theme === "light";

  const textP = isLight ? "#1A1A1A" : "#EEEEEE";
  const textM = isLight ? "#7A6A50" : "#8A8A8A";

  const [status, setStatus] = useState<Status>(token ? "verifying" : "idle");
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const started = useRef(false);

  // Verification is submitted by script (POST) rather than by the link itself, so mail
  // scanners that merely fetch the URL cannot consume the single-use token.
  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (res.ok) {
          setStatus("success");
        } else {
          const json = await res.json().catch(() => ({}));
          setMessage(json.error ?? "This verification link is invalid or has expired.");
          setStatus("error");
        }
      } catch {
        setMessage("We could not reach the server. Please try again.");
        setStatus("error");
      }
    })();
  }, [token]);

  async function resend(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setResendState("sending");
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } finally {
      setResendState("sent");
    }
  }

  const resendForm = (
    <form onSubmit={resend} className="flex flex-col gap-2.5 mt-6 text-left">
      <label className="text-[10.5px] font-mono uppercase tracking-widest" style={{ color: textM }} htmlFor="resend-email">
        Send a new link
      </label>
      <input
        id="resend-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full px-4 py-3 rounded-xl text-[13px]"
        style={{
          background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.09)"}`,
          color: isLight ? "#1A1A1A" : "#F0F0F0",
        }}
      />
      <button
        type="submit"
        disabled={resendState === "sending"}
        className="w-full py-2.5 rounded-xl text-[13px] font-bold"
        style={{ background: "linear-gradient(135deg, #C6A22A, #E8C345, #C6A22A)", color: "#050505" }}
      >
        {resendState === "sending" ? "Sending…" : "Resend verification email"}
      </button>
      {resendState === "sent" && (
        <p role="status" className="text-[12px]" style={{ color: textM }}>
          If that account needs verification, a new link is on its way.
        </p>
      )}
    </form>
  );

  const icon = (node: React.ReactNode, tone: "ok" | "bad" | "neutral") => (
    <div
      className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
      style={{
        background: tone === "bad" ? "rgba(255,77,77,0.08)" : tone === "ok" ? "rgba(0,255,156,0.08)" : "rgba(255,215,0,0.08)",
        border: `1px solid ${tone === "bad" ? "rgba(255,77,77,0.22)" : tone === "ok" ? "rgba(0,255,156,0.22)" : "rgba(255,215,0,0.22)"}`,
      }}
    >
      {node}
    </div>
  );

  if (status === "verifying") {
    return (
      <div className="text-center" role="status" aria-live="polite">
        {icon(<Loader2 size={22} className="animate-spin" style={{ color: "#FFD700" }} />, "neutral")}
        <h2 className="font-bold mb-2" style={{ fontSize: "20px", color: textP }}>Verifying your email…</h2>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="text-center" role="status" aria-live="polite">
        {icon(<CheckCircle2 size={22} style={{ color: "#00FF9C" }} />, "ok")}
        <h2 className="font-bold mb-2" style={{ fontSize: "20px", color: textP }}>Email verified</h2>
        <p className="text-[13px] mb-7" style={{ color: textM }}>Your account is active. You can sign in now.</p>
        <Link
          href="/auth/login?verified=1"
          className="block w-full py-2.5 rounded-xl text-[13px] font-bold text-center"
          style={{ background: "linear-gradient(135deg, #C6A22A, #E8C345, #C6A22A)", color: "#050505" }}
        >
          Continue to sign in
        </Link>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="text-center" role="alert">
        {icon(<AlertCircle size={22} style={{ color: "#FF4D4D" }} />, "bad")}
        <h2 className="font-bold mb-2" style={{ fontSize: "20px", color: textP }}>Link not valid</h2>
        <p className="text-[13px]" style={{ color: textM }}>{message}</p>
        {resendForm}
      </div>
    );
  }

  return (
    <div className="text-center">
      {icon(<MailCheck size={22} style={{ color: "#FFD700" }} />, "neutral")}
      <h2 className="font-bold mb-2" style={{ fontSize: "20px", color: textP }}>
        {sent ? "Check your inbox" : "Verify your email"}
      </h2>
      <p className="text-[13px]" style={{ color: textM }}>
        {sent
          ? "If the address you entered can be registered, we have sent a verification link. It expires in 24 hours."
          : "Open the link in the verification email we sent you."}
      </p>
      {resendForm}
      <Link href="/auth/login" className="block mt-6 text-[12px] font-mono" style={{ color: textM }}>
        Back to sign in
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: isLight ? "#F8F4EC" : "#050505" }}>
      <div className="w-full max-w-[400px]">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Activity size={18} style={{ color: "#FFD700" }} />
          <span className="font-bold text-[15px] tracking-wider" style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}>
            <span style={{ color: isLight ? "#1A1A1A" : "#E8E8E8" }}>MARKET KA </span>
            <span style={{ color: "#FFD700" }}>BAADSHAH</span>
          </span>
        </div>
        <div
          className="rounded-2xl p-8"
          style={{
            background: isLight ? "rgba(255,252,245,0.98)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${isLight ? "rgba(184,150,46,0.18)" : "rgba(255,215,0,0.10)"}`,
            backdropFilter: "blur(24px)",
            boxShadow: isLight ? "0 8px 40px rgba(100,80,20,0.09)" : "0 8px 60px rgba(0,0,0,0.85)",
          }}
        >
          <Suspense fallback={<div className="h-48 animate-pulse rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }} />}>
            <VerifyContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
