"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Activity, AlertCircle } from "lucide-react";
import { useTheme } from "@/lib/context/ThemeContext";

const ERROR_MESSAGES: Record<string, string> = {
  Configuration:  "There is a problem with the server configuration.",
  AccessDenied:   "You do not have permission to sign in.",
  Verification:   "The sign in link is no longer valid. It may have been used already or expired.",
  OAuthSignin:    "Could not start the OAuth sign in flow. Please try again.",
  OAuthCallback:  "Could not complete the OAuth sign in. Please try again.",
  OAuthCreateAccount: "Could not create an OAuth account. Try a different sign in method.",
  EmailCreateAccount: "Could not create an email account. Try a different sign in method.",
  OAuthAccountNotLinked: "An account with this email already exists. Sign in with your email and password instead.",
  Callback:       "There was an error during the sign in callback.",
  Default:        "An unexpected error occurred during sign in.",
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const errorCode    = searchParams.get("error") ?? "Default";
  const { theme }    = useTheme();
  const isLight      = theme === "light";

  const message = ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default;
  const textP   = isLight ? "#1A1A1A" : "#EEEEEE";
  const textM   = isLight ? "#7A6A50" : "#5A5A5A";

  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{ background: "rgba(255,77,77,0.08)", border: "1px solid rgba(255,77,77,0.22)" }}>
        <AlertCircle size={22} style={{ color: "var(--negative)" }} />
      </div>
      <h2 className="font-bold mb-2"
        style={{ fontFamily: "var(--font-space-grotesk, sans-serif)", fontSize: "20px", color: textP }}>
        Authentication Error
      </h2>
      <p className="text-[13px] mb-1 font-mono" style={{ color: "var(--negative)" }}>
        {errorCode}
      </p>
      <p className="text-[13px] mb-7 max-w-[280px] mx-auto" style={{ color: textM }}>
        {message}
      </p>
      <div className="flex flex-col gap-2.5">
        <Link
          href="/auth/login"
          className="w-full py-2.5 rounded-xl text-[13px] font-bold text-center transition-all"
          style={{
            background: "linear-gradient(135deg, #C6A22A, #E8C345, #C6A22A)",
            color: "#050505",
            fontFamily: "var(--font-space-grotesk, sans-serif)",
          }}
        >
          Back to Sign In
        </Link>
        <Link
          href="/"
          className="w-full py-2.5 rounded-xl text-[13px] font-mono text-center transition-all"
          style={{
            background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${isLight ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.08)"}`,
            color: isLight ? "#4A4A4A" : "#8A8A8A",
          }}
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  const { theme } = useTheme();
  const isLight   = theme === "light";
  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: isLight ? "#F8F4EC" : "#050505" }}>
      <div className="w-full max-w-[400px]">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Activity size={18} style={{ color: "var(--gold)" }} />
          <span className="font-bold text-[15px] tracking-wider"
            style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}>
            <span style={{ color: isLight ? "#1A1A1A" : "#E8E8E8" }}>EQUITY</span>
            <span style={{ color: "var(--gold)" }}>LENS</span>
          </span>
        </div>
        <div className="rounded-2xl p-8"
          style={{
            background: isLight ? "rgba(255,252,245,0.98)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${isLight ? "rgba(184,150,46,0.18)" : "rgba(255,215,0,0.10)"}`,
            backdropFilter: "blur(24px)",
            boxShadow: isLight ? "0 8px 40px rgba(100,80,20,0.09)" : "0 8px 60px rgba(0,0,0,0.85)",
          }}>
          <Suspense fallback={<div className="h-48 animate-pulse rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }} />}>
            <ErrorContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
