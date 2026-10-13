"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Activity } from "lucide-react";
import { useTheme } from "@/lib/context/ThemeContext";

const loginSchema = z.object({
  email:    z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get("callbackUrl") ?? "/dashboard";
  const { theme }    = useTheme();
  const isLight      = theme === "light";

  const [showPass,     setShowPass]     = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const justVerified = searchParams.get("verified") === "1";

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    setError(null);
    setUnverifiedEmail(null);
    setResendState("idle");
    try {
      const result = await signIn("credentials", {
        email:    data.email,
        password: data.password,
        redirect: false,
      });
      if (result?.error) {
        if (result.code === "email_not_verified") {
          setError("Please verify your email before signing in. Check your inbox for the link.");
          setUnverifiedEmail(data.email);
        } else if (result.code === "rate_limited") {
          setError("Too many attempts. Please wait a few minutes and try again.");
        } else {
          setError("Invalid email or password. Please try again.");
        }
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendVerification = async () => {
    if (!unverifiedEmail) return;
    setResendState("sending");
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
    } finally {
      setResendState("sent");
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl });
  };

  const inputStyle = (hasError: boolean) => ({
    background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)",
    border: `1px solid ${hasError
      ? "rgba(255,77,77,0.45)"
      : isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.09)"}`,
    color: isLight ? "#1A1A1A" : "#F0F0F0",
    outline: "none",
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "13px",
    fontFamily: "var(--font-inter, sans-serif)",
    transition: "border-color 0.15s",
  } as React.CSSProperties);

  return (
    <div className="w-full max-w-[400px]">

      {/* Mobile logo */}
      <div
        className="flex lg:hidden items-center justify-center gap-2 mb-8"
      >
        <Activity size={18} style={{ color: "#FFD700" }} />
        <span
          className="font-bold text-[15px] tracking-wider"
          style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
        >
          <span style={{ color: isLight ? "#1A1A1A" : "#E8E8E8" }}>MARKET KA </span>
          <span style={{ color: "#FFD700" }}>BAADSHAH</span>
        </span>
      </div>

      {/* Card */}
      <div
        className="rounded-2xl p-8"
        style={{
          background: isLight
            ? "rgba(255,252,245,0.98)"
            : "rgba(255,255,255,0.03)",
          border: `1px solid ${isLight ? "rgba(184,150,46,0.18)" : "rgba(255,215,0,0.10)"}`,
          backdropFilter: "blur(24px)",
          boxShadow: isLight
            ? "0 8px 40px rgba(100,80,20,0.09)"
            : "0 8px 60px rgba(0,0,0,0.85)",
        }}
      >
        {/* Header */}
        <div className="mb-6">
          <h2
            className="font-bold mb-1"
            style={{
              fontFamily: "var(--font-space-grotesk, sans-serif)",
              fontSize: "22px",
              color: isLight ? "#1A1A1A" : "#EEEEEE",
            }}
          >
            Welcome back
          </h2>
          <p
            className="text-[13px]"
            style={{ color: isLight ? "#7A6A50" : "#5A5A5A" }}
          >
            Sign in to your intelligence account
          </p>
        </div>

        {justVerified && !error && (
          <div
            role="status"
            className="mb-5 px-4 py-3 rounded-xl text-[12px] font-mono"
            style={{ background: "rgba(0,255,156,0.08)", border: "1px solid rgba(0,255,156,0.22)", color: "#00CC7A" }}
          >
            Email verified. You can sign in now.
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div
            className="mb-5 px-4 py-3 rounded-xl text-[12px] font-mono flex items-center gap-2"
            style={{
              background: "rgba(255,77,77,0.08)",
              border: "1px solid rgba(255,77,77,0.22)",
              color: "#FF4D4D",
            }}
          >
            <span className="flex-shrink-0">⚠</span>
            <span>
              {error}
              {unverifiedEmail && (
                <button
                  type="button"
                  onClick={resendVerification}
                  disabled={resendState !== "idle"}
                  className="block mt-2 underline disabled:opacity-60"
                >
                  {resendState === "sent" ? "New link sent (if the account needs one)" : resendState === "sending" ? "Sending…" : "Resend verification email"}
                </button>
              )}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="login-email"
              className="text-[10.5px] font-mono uppercase tracking-widest"
              style={{ color: isLight ? "#6B5536" : "var(--th-text-muted)" }}
            >
              Email
            </label>
            <input
              id="login-email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              {...register("email")}
              type="email"
              placeholder="analyst@firm.com"
              autoComplete="email"
              style={inputStyle(!!errors.email)}
              onFocus={e => {
                (e.target as HTMLInputElement).style.borderColor = "rgba(255,215,0,0.35)";
              }}
              onBlur={e => {
                (e.target as HTMLInputElement).style.borderColor = errors.email
                  ? "rgba(255,77,77,0.45)"
                  : isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.09)";
              }}
            />
            {errors.email && (
              <span id="login-email-error" role="alert" className="text-[10px] font-mono" style={{ color: "#FF4D4D" }}>
                {errors.email.message}
              </span>
            )}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="text-[10.5px] font-mono uppercase tracking-widest"
                style={{ color: isLight ? "#6B5536" : "var(--th-text-muted)" }}
              >
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-[11px] font-mono transition-opacity hover:opacity-80"
                style={{ color: "#FFD700" }}
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                aria-invalid={!!errors.password}
                {...register("password")}
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ ...inputStyle(!!errors.password), paddingRight: "44px" }}
                onFocus={e => {
                  (e.target as HTMLInputElement).style.borderColor = "rgba(255,215,0,0.35)";
                }}
                onBlur={e => {
                  (e.target as HTMLInputElement).style.borderColor = errors.password
                    ? "rgba(255,77,77,0.45)"
                    : isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.09)";
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? "Hide password" : "Show password"}
                aria-pressed={showPass}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                style={{ color: isLight ? "#9A9A9A" : "#4A4A4A" }}
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.password && (
              <span className="text-[10px] font-mono" style={{ color: "#FF4D4D" }}>
                {errors.password.message}
              </span>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl text-[13px] font-bold tracking-wide transition-all duration-200 mt-1"
            style={{
              background: isSubmitting
                ? "rgba(255,215,0,0.25)"
                : "linear-gradient(135deg, #C6A22A 0%, #E8C345 50%, #C6A22A 100%)",
              color: "#050505",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              fontFamily: "var(--font-space-grotesk, sans-serif)",
              letterSpacing: "0.04em",
              boxShadow: isSubmitting ? "none" : "0 0 24px rgba(255,215,0,0.18)",
              border: "none",
            }}
          >
            {isSubmitting ? "Signing in…" : "Sign In"}
          </button>

          {/* Google — only rendered when OAuth credentials are configured */}
          {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true" && (
            <>
              <div className="flex items-center gap-3 my-1">
                <div
                  className="flex-1 h-px"
                  style={{ background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.05)" }}
                />
                <span
                  className="text-[9.5px] font-mono"
                  style={{ color: isLight ? "#BBAA90" : "#2A2A2A" }}
                >
                  or continue with
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.05)" }}
                />
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-[13px] font-medium transition-all duration-200"
                style={{
                  background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isLight ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.08)"}`,
                  color: isLight ? "#4A4A4A" : "#8A8A8A",
                  cursor: googleLoading ? "not-allowed" : "pointer",
                }}
                onMouseEnter={e => {
                  if (!googleLoading) {
                    (e.currentTarget as HTMLButtonElement).style.background = isLight
                      ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.07)";
                    (e.currentTarget as HTMLButtonElement).style.color = isLight ? "#1A1A1A" : "#D0D0D0";
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = isLight
                    ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)";
                  (e.currentTarget as HTMLButtonElement).style.color = isLight ? "#4A4A4A" : "#8A8A8A";
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {googleLoading ? "Redirecting…" : "Continue with Google"}
              </button>
            </>
          )}
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <span
            className="text-[12px]"
            style={{ color: isLight ? "#9A9A9A" : "#3A3A3A" }}
          >
            Don&apos;t have an account?{" "}
          </span>
          <Link
            href="/auth/signup"
            className="text-[12px] font-semibold transition-opacity hover:opacity-80"
            style={{ color: "#FFD700" }}
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
