"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Activity, Eye, EyeOff } from "lucide-react";
import { useTheme } from "@/lib/context/ThemeContext";
import { getPasswordStrength } from "@/lib/auth/password";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, { message: "Passwords do not match", path: ["confirm"] });
type Form = z.infer<typeof schema>;

function ResetForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get("token");
  const { theme }    = useTheme();
  const isLight      = theme === "light";

  const [showPass,     setShowPass]     = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done,         setDone]         = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [password,     setPassword]     = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const strength = getPasswordStrength(password);

  const textP = isLight ? "#1A1A1A" : "#EEEEEE";
  const textM = isLight ? "#7A6A50" : "#5A5A5A";
  const label = isLight ? "#9A8060" : "#3A3A3A";

  const onSubmit = async (data: Form) => {
    if (!token) { setError("Invalid reset link."); return; }
    setIsSubmitting(true);
    setError(null);
    try {
      const res  = await fetch("/api/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, password: data.password }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Reset failed"); return; }
      setDone(true);
      setTimeout(() => router.push("/auth/login"), 2500);
    } catch {
      setError("Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = (hasError: boolean) => ({
    background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)",
    border: `1px solid ${hasError ? "rgba(255,77,77,0.45)" : isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.09)"}`,
    color: textP,
    outline: "none",
    width: "100%",
    padding: "11px 44px 11px 16px",
    borderRadius: "12px",
    fontSize: "13px",
  } as React.CSSProperties);

  if (!token) {
    return (
      <div className="text-center py-8">
        <p className="text-[13px] font-mono" style={{ color: "#FF4D4D" }}>Invalid or missing reset token.</p>
        <Link href="/auth/forgot-password" className="text-[12px] mt-3 block" style={{ color: "#FFD700" }}>
          Request a new link
        </Link>
      </div>
    );
  }

  return done ? (
    <div className="text-center py-6">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: "rgba(0,255,156,0.08)", border: "1px solid rgba(0,255,156,0.2)" }}>
        <span style={{ fontSize: "24px" }}>✓</span>
      </div>
      <h3 className="font-bold mb-2" style={{ fontFamily: "var(--font-space-grotesk, sans-serif)", fontSize: "18px", color: textP }}>
        Password reset!
      </h3>
      <p className="text-[13px]" style={{ color: textM }}>Redirecting to sign in…</p>
    </div>
  ) : (
    <>
      <div className="mb-6">
        <h2 className="font-bold mb-1"
          style={{ fontFamily: "var(--font-space-grotesk, sans-serif)", fontSize: "20px", color: textP }}>
          New password
        </h2>
        <p className="text-[12px]" style={{ color: textM }}>Choose a strong password for your account</p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-[12px] font-mono"
          style={{ background: "rgba(255,77,77,0.08)", border: "1px solid rgba(255,77,77,0.22)", color: "#FF4D4D" }}>
          ⚠ {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10.5px] font-mono uppercase tracking-widest" style={{ color: label }}>New Password</label>
          <div className="relative">
            <input
              {...register("password", { onChange: e => setPassword(e.target.value) })}
              type={showPass ? "text" : "password"}
              placeholder="Min. 8 characters"
              style={inputStyle(!!errors.password)}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,215,0,0.35)"; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = errors.password ? "rgba(255,77,77,0.45)" : isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.09)"; }}
            />
            <button type="button" onClick={() => setShowPass(!showPass)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
              style={{ color: isLight ? "#9A9A9A" : "#4A4A4A" }}>
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {password.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5 flex-1">
                {[0,1,2,3].map(i => (
                  <div key={i} className="h-1 flex-1 rounded-full transition-all"
                    style={{ background: i < strength.score ? strength.color : isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)" }} />
                ))}
              </div>
              <span className="text-[9px] font-mono" style={{ color: strength.color }}>{strength.label}</span>
            </div>
          )}
          {errors.password && <span className="text-[10px] font-mono" style={{ color: "#FF4D4D" }}>{errors.password.message}</span>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10.5px] font-mono uppercase tracking-widest" style={{ color: label }}>Confirm Password</label>
          <input
            {...register("confirm")}
            type="password"
            placeholder="••••••••"
            style={inputStyle(!!errors.confirm)}
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,215,0,0.35)"; }}
            onBlur={e => { (e.target as HTMLInputElement).style.borderColor = errors.confirm ? "rgba(255,77,77,0.45)" : isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.09)"; }}
          />
          {errors.confirm && <span className="text-[10px] font-mono" style={{ color: "#FF4D4D" }}>{errors.confirm.message}</span>}
        </div>

        <button type="submit" disabled={isSubmitting}
          className="w-full py-3 rounded-xl text-[13px] font-bold tracking-wide transition-all mt-1"
          style={{
            background: isSubmitting ? "rgba(255,215,0,0.25)" : "linear-gradient(135deg, #C6A22A, #E8C345, #C6A22A)",
            color: "#050505",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            fontFamily: "var(--font-space-grotesk, sans-serif)",
            boxShadow: isSubmitting ? "none" : "0 0 24px rgba(255,215,0,0.18)",
            border: "none",
          }}>
          {isSubmitting ? "Resetting…" : "Reset Password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  const { theme } = useTheme();
  const isLight   = theme === "light";
  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: isLight ? "#F8F4EC" : "#050505" }}>
      <div className="w-full max-w-[400px]">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Activity size={18} style={{ color: "#FFD700" }} />
          <span className="font-bold text-[15px] tracking-wider"
            style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}>
            <span style={{ color: isLight ? "#1A1A1A" : "#E8E8E8" }}>EQUITY</span>
            <span style={{ color: "#FFD700" }}>LENS</span>
          </span>
        </div>
        <div className="rounded-2xl p-8"
          style={{
            background: isLight ? "rgba(255,252,245,0.98)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${isLight ? "rgba(184,150,46,0.18)" : "rgba(255,215,0,0.10)"}`,
            backdropFilter: "blur(24px)",
            boxShadow: isLight ? "0 8px 40px rgba(100,80,20,0.09)" : "0 8px 60px rgba(0,0,0,0.85)",
          }}>
          <Suspense fallback={<div className="h-48 animate-pulse" style={{ background: "rgba(255,255,255,0.02)", borderRadius: "12px" }} />}>
            <ResetForm />
          </Suspense>
          <div className="mt-5 text-center">
            <Link href="/auth/login" className="text-[12px] font-mono hover:opacity-70 transition-opacity"
              style={{ color: isLight ? "#9A8060" : "#4A4A4A" }}>
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
