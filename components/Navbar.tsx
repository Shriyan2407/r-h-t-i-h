"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search, TrendingUp, Star, Menu, X, Activity, Brain, Target, Newspaper, LayoutDashboard, User, LogOut, ChevronDown, PieChart, Bell } from "lucide-react";
import { useWatchlistStore } from "@/store/watchlistStore";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/lib/context/ThemeContext";
import { useSession, signOut } from "next-auth/react";

export function Navbar() {
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [mounted,      setMounted]      = useState(false);
  const [scrolled,     setScrolled]     = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router      = useRouter();
  const pathname    = usePathname();
  const { theme }   = useTheme();
  const isLight     = theme === "light";
  const { data: session, status } = useSession();

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const count      = useWatchlistStore(s => s.items.length);
  const loadFromDB = useWatchlistStore(s => s.loadFromDB);
  const wlLoaded   = useWatchlistStore(s => s.loaded);

  // Single trigger: load watchlist from DB once per authenticated session
  useEffect(() => {
    if (session?.user && !wlLoaded) {
      loadFromDB();
    }
  }, [session?.user, wlLoaded, loadFromDB]);

  const navLinks = [
    { label: "Markets",      href: "/",            icon: TrendingUp },
    { label: "Intelligence", href: "/ai",          icon: Brain      },
    { label: "Analyze",      href: "/ai/analyze",  icon: Target     },
    { label: "News",         href: "/news",        icon: Newspaper  },
    { label: "Portfolio",    href: "/portfolio",   icon: PieChart   },
    { label: "Watchlist",    href: "/watchlist",   icon: Star       },
    { label: "Alerts",       href: "/alerts",      icon: Bell       },
  ];

  /* Dynamic colours based on theme */
  const navBg = scrolled
    ? isLight
      ? "rgba(242,237,226,0.98)"
      : "rgba(5,5,5,0.97)"
    : isLight
      ? "rgba(240,235,224,0.75)"
      : "rgba(5,5,5,0.60)";

  const navBorder = scrolled
    ? `1px solid var(--gold-border-soft)`
    : `1px solid var(--gold-border)`;

  const navShadow = scrolled
    ? isLight
      ? "0 4px 24px rgba(100,80,20,0.10)"
      : "0 4px 40px rgba(0,0,0,0.70)"
    : "none";

  return (
    <nav
      className="sticky top-0 z-50 transition-all duration-500"
      style={{
        background: navBg,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: navBorder,
        boxShadow: navShadow,
      }}
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-3 flex-shrink-0 group">
          <div className="relative">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300"
              style={{
                background: isLight
                  ? "linear-gradient(135deg, rgba(184,150,46,0.14), rgba(150,120,45,0.07))"
                  : "linear-gradient(135deg, rgba(255,215,0,0.12), rgba(201,162,39,0.06))",
                border: "1px solid var(--gold-border-soft)",
              }}
            >
              <Activity size={14} style={{ color: "var(--gold)" }} />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-live-dot"
              style={{ background: "var(--positive)" }} />
          </div>

          <div className="flex flex-col leading-none">
            <span className="font-bold text-[15px] tracking-wider"
              style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}>
              <span className="transition-colors duration-300"
                style={{ color: "var(--text)" }}>
                MARKET KA{" "}
              </span>
              <span style={{ color: "var(--gold)" }}>BAADSHAH</span>
            </span>
            <span className="text-[7.5px] font-mono uppercase tracking-[0.18em] mt-0.5"
              style={{ color: "var(--text-dim)" }}>
              Equity Intelligence
            </span>
          </div>
        </Link>

        {/* ── Center Nav ── */}
        <div className="hidden md:flex items-center gap-0.5">
          {navLinks.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-all duration-200"
                )}
                style={{
                  color: active ? "var(--gold)" : "var(--th-text-secondary)",
                  background: active
                    ? isLight ? "rgba(184,150,46,0.10)" : "rgba(255,215,0,0.07)"
                    : "transparent",
                  border: active
                    ? `1px solid ${isLight ? "rgba(184,150,46,0.28)" : "rgba(255,215,0,0.22)"}`
                    : "1px solid transparent",
                  boxShadow: active
                    ? `0 0 16px ${isLight ? "rgba(184,150,46,0.10)" : "rgba(255,215,0,0.07)"}`
                    : "none",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.color      = "var(--th-text-primary)";
                    el.style.background = isLight ? "rgba(184,150,46,0.06)" : "rgba(255,215,0,0.04)";
                    el.style.border     = `1px solid ${isLight ? "rgba(184,150,46,0.15)" : "rgba(255,215,0,0.10)"}`;
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.color      = "var(--th-text-secondary)";
                    el.style.background = "transparent";
                    el.style.border     = "1px solid transparent";
                  }
                }}
              >
                <Icon size={12} style={{ opacity: active ? 1 : 0.7 }} />
                {label}

                {label === "Watchlist" && mounted && count > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 text-[9px] font-mono font-bold rounded-full flex items-center justify-center"
                    style={{
                      background: "var(--gold)",
                      color: "#050505",
                      boxShadow: "0 0 8px rgba(255,215,0,0.35)",
                    }}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* ── Right Controls ── */}
        <div className="flex items-center gap-2">
          {/* Search button */}
          <button
            onClick={() => router.push("/")}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all duration-200"
            style={{
              background: "var(--th-gold-bg)",
              border: "1px solid var(--th-border-subtle)",
              color: "var(--text-muted)",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = "var(--gold-border-soft)";
              el.style.color       = "var(--text)";
              el.style.background  = "var(--th-gold-bg-mid)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = "var(--th-border-subtle)";
              el.style.color       = "var(--text-muted)";
              el.style.background  = "var(--th-gold-bg)";
            }}
          >
            <Search size={11} />
            <span className="hidden lg:inline">Search stocks</span>
            <kbd className="px-1.5 py-0.5 rounded text-[9px]"
              style={{
                background: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.04)",
                border: isLight ? "1px solid rgba(0,0,0,0.10)" : "1px solid rgba(255,255,255,0.07)",
              }}>
              ⌘K
            </kbd>
          </button>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Live indicator */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all duration-200"
            style={{
              background: "var(--th-green-bg)",
              border: "1px solid rgba(var(--positive), 0.15)",
              borderColor: isLight ? "rgba(10,122,80,0.20)" : "rgba(0,255,156,0.18)",
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full animate-live-dot"
              style={{ background: "var(--positive)" }} />
            <span className="text-[9px] font-mono uppercase tracking-[0.12em]"
              style={{ color: "var(--positive)" }}>
              Live
            </span>
          </div>

          {/* User Auth Area */}
          {mounted && status !== "loading" && (
            session?.user ? (
              /* ── Logged in: avatar + dropdown ── */
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-200"
                  style={{
                    background: userMenuOpen ? "var(--th-gold-bg-mid)" : "var(--th-gold-bg)",
                    border: `1px solid ${userMenuOpen ? "var(--gold-border-soft)" : "var(--th-border-subtle)"}`,
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,215,0,0.25), rgba(201,162,39,0.12))",
                      color: "var(--gold)",
                    }}
                  >
                    {session.user.name?.[0]?.toUpperCase() ?? session.user.email?.[0]?.toUpperCase() ?? "U"}
                  </div>
                  <span className="hidden sm:block text-[11px] font-mono max-w-[80px] truncate"
                    style={{ color: "var(--text-muted)" }}>
                    {session.user.name?.split(" ")[0] ?? "Account"}
                  </span>
                  <ChevronDown size={10} className={`transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}
                    style={{ color: "var(--text-muted)" }} />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.97 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 mt-1.5 w-48 rounded-xl overflow-hidden z-50"
                      style={{
                        background: isLight ? "rgba(255,252,245,0.99)" : "rgba(12,12,12,0.98)",
                        border: "1px solid var(--gold-border-soft)",
                        boxShadow: isLight ? "0 8px 32px rgba(100,80,20,0.12)" : "0 8px 40px rgba(0,0,0,0.8)",
                        backdropFilter: "blur(20px)",
                      }}
                    >
                      {/* User info */}
                      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--th-border-subtle)" }}>
                        <div className="text-[11px] font-medium truncate" style={{ color: "var(--th-text-primary)" }}>
                          {session.user.name ?? "Account"}
                        </div>
                        <div className="text-[10px] font-mono truncate" style={{ color: "var(--th-text-faint)" }}>
                          {session.user.email}
                        </div>
                      </div>

                      {/* Menu items */}
                      {[
                        { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
                        { icon: PieChart,        label: "Portfolio",  href: "/portfolio"  },
                        { icon: Star,            label: "Watchlist",  href: "/watchlist"  },
                        { icon: User,            label: "Profile",    href: "/profile"    },
                      ].map(({ icon: Icon, label, href }) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-[12px] transition-all duration-150"
                          style={{ color: "var(--th-text-muted)" }}
                          onMouseEnter={e => {
                            const el = e.currentTarget as HTMLAnchorElement;
                            el.style.color      = "var(--gold)";
                            el.style.background = "var(--th-gold-bg)";
                          }}
                          onMouseLeave={e => {
                            const el = e.currentTarget as HTMLAnchorElement;
                            el.style.color      = "var(--th-text-muted)";
                            el.style.background = "transparent";
                          }}
                        >
                          <Icon size={12} />
                          {label}
                        </Link>
                      ))}

                      <div style={{ borderTop: "1px solid var(--th-border-subtle)" }}>
                        <button
                          onClick={() => { setUserMenuOpen(false); signOut({ callbackUrl: "/" }); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] transition-all duration-150 text-left"
                          style={{ color: "var(--th-text-muted)" }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.color      = "#FF4D4D";
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,77,77,0.06)";
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.color      = "var(--th-text-muted)";
                            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                          }}
                        >
                          <LogOut size={12} /> Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* ── Not logged in: Sign In button ── */
              <Link
                href="/auth/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, rgba(198,162,42,0.18), rgba(232,195,69,0.12))",
                  border: "1px solid var(--gold-border-soft)",
                  color: "var(--gold)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "linear-gradient(135deg, rgba(198,162,42,0.26), rgba(232,195,69,0.18))";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "linear-gradient(135deg, rgba(198,162,42,0.18), rgba(232,195,69,0.12))";
                }}
              >
                <User size={11} /> Sign In
              </Link>
            )
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-1.5 transition-colors"
            style={{ color: "var(--text-muted)" }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* ── Mobile Menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="md:hidden overflow-hidden px-4 py-3 flex flex-col gap-1"
            style={{
              background: isLight ? "rgba(244,240,232,0.99)" : "rgba(5,5,5,0.98)",
              borderTop: "1px solid var(--gold-border)",
            }}
          >
            {navLinks.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] transition-all"
                style={{
                  color: "var(--text-muted)",
                  border: "1px solid transparent",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background  = "var(--th-gold-bg-mid)";
                  el.style.borderColor = "var(--gold-border)";
                  el.style.color       = "var(--text)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background  = "transparent";
                  el.style.borderColor = "transparent";
                  el.style.color       = "var(--text-muted)";
                }}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={14} />
                {label}
                {label === "Watchlist" && mounted && count > 0 && (
                  <span
                    className="ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                    style={{
                      background: "var(--gold-dim)",
                      border: "1px solid var(--gold-border-soft)",
                      color: "var(--gold)",
                    }}
                  >
                    {count}
                  </span>
                )}
              </Link>
            ))}

            {/* Theme toggle inside mobile menu too */}
            <div className="pt-2 pb-1 flex items-center gap-2 px-3">
              <span className="text-[9px] font-mono uppercase tracking-wider"
                style={{ color: "var(--text-dim)" }}>
                Theme
              </span>
              <ThemeToggle />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
