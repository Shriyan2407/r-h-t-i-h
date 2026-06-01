"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Activity, ArrowLeft, Mail } from "lucide-react";
import { useTheme } from "@/lib/context/ThemeContext";

const schema = z.object({ email: z.string().email("Enter a valid email") });
type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { theme } = useTheme();
  const isLight   = theme === "light";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent,         setSent]         = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res  = await fetch("/api/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: data.email }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Something went wrong"); return; }
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const bg    = isLight ? "#F8F4EC" : "#050505";
  const card  = isLight ? "rgba(255,252,245,0.98)" : "rgba(255,255,255,0.03)";
  const cardB = isLight ? "rgba(184,150,46,0.18)" : "rgba(255,215,0,0.10)";
  const textP = isLight ? "#1A1A1A" : "#EEEEEE";
  const textM = isLight ? "#7A6A50" : "#5A5A5A";
  const label = isLight ? "#9A8060" : "#3A3A3A";

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: bg }}
    >
      <div className="w-full max-w-[400px]">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Activity size={18} style={{ color: "#FFD700" }} />
          <span className="font-bold text-[15px] tracking-wider"
            style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}>
            <span style={{ color: textP }}>MARKET KA </span>
            <span style={{ color: "#FFD700" }}>BAADSHAH</span>
          </span>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{
            background: card,
            border: `1px solid ${cardB}`,
            backdropFilter: "blur(24px)",
            boxShadow: isLight ? "0 8px 40px rgba(100,80,20,0.09)" : "0 8px 60px rgba(0,0,0,0.85)",
          }}
        >
          {!sent ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.18)" }}
                >
                  <Mail size={16} style={{ color: "#FFD700" }} />
                </div>
                <div>
                  <h2 className="font-bold" style={{ fontFamily: "var(--font-space-grotesk, sans-serif)", fontSize: "20px", color: textP }}>
                    Reset password
                  </h2>
                  <p className="text-[12px]" style={{ color: textM }}>
                    We&apos;ll send a reset link to your email
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl text-[12px] font-mono"
                  style={{ background: "rgba(255,77,77,0.08)", border: "1px solid rgba(255,77,77,0.22)", color: "#FF4D4D" }}>
                  ⚠ {error}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10.5px] font-mono uppercase tracking-widest" style={{ color: label }}>
                    Email Address
                  </label>
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="analyst@firm.com"
                    autoComplete="email"
                    style={{
                      background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${errors.email ? "rgba(255,77,77,0.45)" : isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.09)"}`,
                      color: textP,
                      outline: "none",
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "12px",
                      fontSize: "13px",
                    }}
                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,215,0,0.35)"; }}
                    onBlur={e => {
                      (e.target as HTMLInputElement).style.borderColor = errors.email
                        ? "rgba(255,77,77,0.45)" : isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.09)";
                    }}
                  />
                  {errors.email && <span className="text-[10px] font-mono" style={{ color: "#FF4D4D" }}>{errors.email.message}</span>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl text-[13px] font-bold tracking-wide transition-all duration-200"
                  style={{
                    background: isSubmitting ? "rgba(255,215,0,0.25)" : "linear-gradient(135deg, #C6A22A, #E8C345, #C6A22A)",
                    color: "#050505",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    fontFamily: "var(--font-space-grotesk, sans-serif)",
                    boxShadow: isSubmitting ? "none" : "0 0 24px rgba(255,215,0,0.18)",
                    border: "none",
                  }}
                >
                  {isSubmitting ? "Sending…" : "Send Reset Link"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(0,255,156,0.08)", border: "1px solid rgba(0,255,156,0.2)" }}
              >
                <span style={{ fontSize: "24px" }}>✓</span>
              </div>
              <h3 className="font-bold mb-2" style={{ fontFamily: "var(--font-space-grotesk, sans-serif)", fontSize: "18px", color: textP }}>
                Check your email
              </h3>
              <p className="text-[13px] mb-1" style={{ color: textM }}>
                If an account exists for
              </p>
              <p className="text-[13px] font-mono font-semibold mb-4" style={{ color: "#FFD700" }}>
                {getValues("email")}
              </p>
              <p className="text-[12px]" style={{ color: textM }}>
                you&apos;ll receive a password reset link shortly.
              </p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/auth/login"
              className="flex items-center justify-center gap-1.5 text-[12px] font-mono transition-opacity hover:opacity-70"
              style={{ color: isLight ? "#9A8060" : "#4A4A4A" }}
            >
              <ArrowLeft size={11} /> Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
