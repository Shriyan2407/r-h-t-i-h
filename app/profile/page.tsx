"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, User, Shield, Palette, LogOut, Trash2 } from "lucide-react";
import { Navbar }       from "@/components/Navbar";
import { MarketTicker } from "@/components/MarketTicker";
import { useTheme }     from "@/lib/context/ThemeContext";
import { ThemeToggle }  from "@/components/ThemeToggle";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
});
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newPassword:     z.string().min(8, "New password must be 8+ characters"),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

interface UserProfile {
  hasPassword: boolean;
  name: string | null;
  email: string;
  createdAt: string;
  lastLogin: string | null;
  subscriptionTier: string;
  _count: { watchlist: number; aiHistory: number; searches: number };
}

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const { theme }                 = useTheme();
  const isLight                   = theme === "light";

  const [profile,      setProfile]      = useState<UserProfile | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [profileMsg,   setProfileMsg]   = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [passwordMsg,  setPasswordMsg]  = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showCurr,     setShowCurr]     = useState(false);
  const [showNew,      setShowNew]      = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput,   setDeleteInput]   = useState("");
  const [deleteError,   setDeleteError]   = useState<string | null>(null);

  const profileForm  = useForm({ resolver: zodResolver(profileSchema)  });
  const passwordForm = useForm({ resolver: zodResolver(passwordSchema) });

  const loadProfile = useCallback(async () => {
    const res = await fetch("/api/user/profile");
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      profileForm.reset({ name: data.name ?? "" });
    }
    setLoading(false);
  }, [profileForm]);

  useEffect(() => { if (session?.user) loadProfile(); }, [session, loadProfile]);

  const onProfileSubmit = async (data: { name: string }) => {
    const res = await fetch("/api/user/profile", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: data.name }),
    });
    if (res.ok) {
      await update({ user: { name: data.name } });
      setProfileMsg({ type: "ok", text: "Profile updated" });
      setTimeout(() => setProfileMsg(null), 3000);
    } else {
      setProfileMsg({ type: "err", text: "Update failed" });
    }
  };

  const onPasswordSubmit = async (data: z.infer<typeof passwordSchema>) => {
    const res = await fetch("/api/user/profile", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
    });
    const json = await res.json();
    if (res.ok) {
      // The server revokes every session on a password change, including this one.
      setPasswordMsg({ type: "ok", text: "Password changed. Signing you out - please sign in again." });
      passwordForm.reset();
      setTimeout(() => signOut({ callbackUrl: "/auth/login" }), 1500);
    } else {
      setPasswordMsg({ type: "err", text: json.error ?? "Failed" });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleteError(null);
    // Re-authentication: password accounts re-enter their password, OAuth-only accounts type their email.
    const body = profile?.hasPassword ? { password: deleteInput } : { confirmEmail: deleteInput };
    const res = await fetch("/api/user/profile", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setDeleteError(json.error ?? "Could not delete the account");
      return;
    }
    await signOut({ callbackUrl: "/" });
  };

  const cardBg = isLight ? "rgba(255,252,245,0.95)" : "rgba(255,255,255,0.03)";
  const cardBd = isLight ? "rgba(184,150,46,0.12)"   : "rgba(255,215,0,0.08)";
  const textP  = isLight ? "#1A1A1A" : "#EEEEEE";
  const textM  = isLight ? "#7A6A50" : "#5A5A5A";
  const label  = isLight ? "#9A8060" : "#3A3A3A";

  const inputStyle = (hasError: boolean) => ({
    background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)",
    border: `1px solid ${hasError ? "rgba(255,77,77,0.45)" : isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.09)"}`,
    color: textP,
    outline: "none",
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    fontSize: "13px",
    fontFamily: "var(--font-inter, sans-serif)",
  } as React.CSSProperties);

  const initials = profile?.name
    ? profile.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : session?.user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="min-h-screen" style={{ background: isLight ? "var(--th-bg-page)" : "#050505" }}>
      <Navbar />
      <MarketTicker />

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-[18px] flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(255,215,0,0.18), rgba(201,162,39,0.08))",
              border: "1px solid rgba(255,215,0,0.28)",
              color: "#FFD700",
              fontFamily: "var(--font-space-grotesk, sans-serif)",
            }}
          >
            {initials}
          </div>
          <div>
            <h1
              className="font-bold mb-0.5"
              style={{ fontFamily: "var(--font-space-grotesk, sans-serif)", fontSize: "22px", color: textP }}
            >
              {loading ? "Loading…" : profile?.name ?? "Profile"}
            </h1>
            <p className="text-[12px] font-mono" style={{ color: textM }}>
              {profile?.email ?? session?.user?.email}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5">

          {/* Profile Section */}
          <div className="rounded-xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBd}` }}>
            <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${cardBd}` }}>
              <User size={13} style={{ color: "#FFD700" }} />
              <span className="text-[11px] font-mono uppercase tracking-widest" style={{ color: label }}>
                Profile Information
              </span>
            </div>
            <div className="p-5">
              {profileMsg && (
                <div className="mb-4 px-4 py-2.5 rounded-lg text-[11px] font-mono"
                  style={{
                    background: profileMsg.type === "ok" ? "rgba(0,255,156,0.07)" : "rgba(255,77,77,0.08)",
                    border: `1px solid ${profileMsg.type === "ok" ? "rgba(0,255,156,0.2)" : "rgba(255,77,77,0.22)"}`,
                    color: profileMsg.type === "ok" ? "#00FF9C" : "#FF4D4D",
                  }}>
                  {profileMsg.type === "ok" ? "✓" : "⚠"} {profileMsg.text}
                </div>
              )}
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10.5px] font-mono uppercase tracking-widest" style={{ color: label }}>Display Name</label>
                    <input
                      {...profileForm.register("name")}
                      type="text"
                      style={inputStyle(!!profileForm.formState.errors.name)}
                      onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,215,0,0.35)"; }}
                      onBlur={e => { (e.target as HTMLInputElement).style.borderColor = profileForm.formState.errors.name ? "rgba(255,77,77,0.45)" : isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.09)"; }}
                    />
                    {profileForm.formState.errors.name && (
                      <span className="text-[10px] font-mono" style={{ color: "#FF4D4D" }}>
                        {profileForm.formState.errors.name.message}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10.5px] font-mono uppercase tracking-widest" style={{ color: label }}>Email</label>
                    <input
                      type="email"
                      value={profile?.email ?? ""}
                      disabled
                      style={{ ...inputStyle(false), opacity: 0.5, cursor: "not-allowed" }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={profileForm.formState.isSubmitting}
                    className="px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all"
                    style={{
                      background: "linear-gradient(135deg, #C6A22A, #E8C345, #C6A22A)",
                      color: "#050505",
                      fontFamily: "var(--font-space-grotesk, sans-serif)",
                      border: "none",
                      cursor: profileForm.formState.isSubmitting ? "not-allowed" : "pointer",
                    }}
                  >
                    {profileForm.formState.isSubmitting ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Password Section */}
          <div className="rounded-xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBd}` }}>
            <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${cardBd}` }}>
              <Shield size={13} style={{ color: "#38BDF8" }} />
              <span className="text-[11px] font-mono uppercase tracking-widest" style={{ color: label }}>
                Security
              </span>
            </div>
            <div className="p-5">
              {passwordMsg && (
                <div className="mb-4 px-4 py-2.5 rounded-lg text-[11px] font-mono"
                  style={{
                    background: passwordMsg.type === "ok" ? "rgba(0,255,156,0.07)" : "rgba(255,77,77,0.08)",
                    border: `1px solid ${passwordMsg.type === "ok" ? "rgba(0,255,156,0.2)" : "rgba(255,77,77,0.22)"}`,
                    color: passwordMsg.type === "ok" ? "#00FF9C" : "#FF4D4D",
                  }}>
                  {passwordMsg.type === "ok" ? "✓" : "⚠"} {passwordMsg.text}
                </div>
              )}
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10.5px] font-mono uppercase tracking-widest" style={{ color: label }}>Current Password</label>
                  <div className="relative">
                    <input
                      {...passwordForm.register("currentPassword")}
                      type={showCurr ? "text" : "password"}
                      placeholder="••••••••"
                      style={{ ...inputStyle(!!passwordForm.formState.errors.currentPassword), paddingRight: "40px" }}
                      onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,215,0,0.35)"; }}
                      onBlur={e => { (e.target as HTMLInputElement).style.borderColor = passwordForm.formState.errors.currentPassword ? "rgba(255,77,77,0.45)" : isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.09)"; }}
                    />
                    <button type="button" onClick={() => setShowCurr(!showCurr)} tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
                      style={{ color: isLight ? "#9A9A9A" : "#4A4A4A" }}>
                      {showCurr ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.currentPassword && (
                    <span className="text-[10px] font-mono" style={{ color: "#FF4D4D" }}>{passwordForm.formState.errors.currentPassword.message}</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10.5px] font-mono uppercase tracking-widest" style={{ color: label }}>New Password</label>
                    <div className="relative">
                      <input
                        {...passwordForm.register("newPassword")}
                        type={showNew ? "text" : "password"}
                        placeholder="Min. 8 characters"
                        style={{ ...inputStyle(!!passwordForm.formState.errors.newPassword), paddingRight: "40px" }}
                        onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,215,0,0.35)"; }}
                        onBlur={e => { (e.target as HTMLInputElement).style.borderColor = passwordForm.formState.errors.newPassword ? "rgba(255,77,77,0.45)" : isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.09)"; }}
                      />
                      <button type="button" onClick={() => setShowNew(!showNew)} tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
                        style={{ color: isLight ? "#9A9A9A" : "#4A4A4A" }}>
                        {showNew ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                    {passwordForm.formState.errors.newPassword && (
                      <span className="text-[10px] font-mono" style={{ color: "#FF4D4D" }}>{passwordForm.formState.errors.newPassword.message}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10.5px] font-mono uppercase tracking-widest" style={{ color: label }}>Confirm Password</label>
                    <input
                      {...passwordForm.register("confirmPassword")}
                      type="password"
                      placeholder="••••••••"
                      style={inputStyle(!!passwordForm.formState.errors.confirmPassword)}
                      onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,215,0,0.35)"; }}
                      onBlur={e => { (e.target as HTMLInputElement).style.borderColor = passwordForm.formState.errors.confirmPassword ? "rgba(255,77,77,0.45)" : isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.09)"; }}
                    />
                    {passwordForm.formState.errors.confirmPassword && (
                      <span className="text-[10px] font-mono" style={{ color: "#FF4D4D" }}>{passwordForm.formState.errors.confirmPassword.message}</span>
                    )}
                  </div>
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={passwordForm.formState.isSubmitting}
                    className="px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all"
                    style={{
                      background: "linear-gradient(135deg, #C6A22A, #E8C345, #C6A22A)",
                      color: "#050505",
                      fontFamily: "var(--font-space-grotesk, sans-serif)",
                      border: "none",
                      cursor: passwordForm.formState.isSubmitting ? "not-allowed" : "pointer",
                    }}
                  >
                    {passwordForm.formState.isSubmitting ? "Changing…" : "Change Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Preferences */}
          <div className="rounded-xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBd}` }}>
            <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${cardBd}` }}>
              <Palette size={13} style={{ color: "#A855F7" }} />
              <span className="text-[11px] font-mono uppercase tracking-widest" style={{ color: label }}>Preferences</span>
            </div>
            <div className="p-5 flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium mb-0.5" style={{ color: textP }}>Theme</div>
                <div className="text-[11px] font-mono" style={{ color: textM }}>
                  {isLight ? "Imperial Light Mode" : "Obsidian Dark Mode"}
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-xl overflow-hidden"
            style={{ background: cardBg, border: "1px solid rgba(255,77,77,0.15)" }}>
            <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid rgba(255,77,77,0.10)" }}>
              <Trash2 size={13} style={{ color: "#FF4D4D" }} />
              <span className="text-[11px] font-mono uppercase tracking-widest" style={{ color: "#FF4D4D" }}>Danger Zone</span>
            </div>
            <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-[13px] font-medium mb-0.5" style={{ color: textP }}>Sign Out</div>
                <div className="text-[11px] font-mono" style={{ color: textM }}>Sign out from this device</div>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-mono transition-all"
                  style={{
                    background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isLight ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.08)"}`,
                    color: textM,
                    cursor: "pointer",
                  }}
                >
                  <LogOut size={11} /> Sign Out
                </button>
                {deleteConfirm && (
                  <input
                    type={profile?.hasPassword ? "password" : "email"}
                    value={deleteInput}
                    onChange={e => setDeleteInput(e.target.value)}
                    placeholder={profile?.hasPassword ? "Enter your password" : "Type your account email"}
                    aria-label={profile?.hasPassword ? "Password to confirm deletion" : "Email to confirm deletion"}
                    autoComplete={profile?.hasPassword ? "current-password" : "off"}
                    className="px-3 py-2 rounded-lg text-[11px] font-mono"
                    style={{
                      background: isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,77,77,0.30)",
                      color: textP,
                      outline: "none",
                    }}
                  />
                )}
                <button
                  onClick={handleDelete}
                  disabled={deleteConfirm && !deleteInput}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-mono transition-all disabled:opacity-50"
                  style={{
                    background: deleteConfirm ? "rgba(255,77,77,0.10)" : "transparent",
                    border: `1px solid ${deleteConfirm ? "rgba(255,77,77,0.30)" : "rgba(255,77,77,0.18)"}`,
                    color: "#FF4D4D",
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={11} />
                  {deleteConfirm ? "Permanently delete" : "Delete Account"}
                </button>
                {deleteConfirm && (
                  <button
                    onClick={() => { setDeleteConfirm(false); setDeleteInput(""); setDeleteError(null); }}
                    className="px-3 py-2 rounded-lg text-[11px] font-mono"
                    style={{ color: textM, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                )}
                {deleteError && (
                  <span role="alert" className="text-[11px] font-mono" style={{ color: "#FF4D4D" }}>{deleteError}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
