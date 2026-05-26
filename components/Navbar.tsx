"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search, TrendingUp, Star, Menu, X, Activity, Brain, Target, Newspaper, BookOpen } from "lucide-react";
import { useWatchlistStore } from "@/store/watchlistStore";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const count = useWatchlistStore((s) => s.items.length);

  const navLinks = [
    { label: "Markets",      href: "/",            icon: TrendingUp },
    { label: "Intelligence", href: "/ai",           icon: Brain      },
    { label: "Analyze",      href: "/ai/analyze",  icon: Target      },
    { label: "News",         href: "/news",         icon: Newspaper  },
    { label: "History",      href: "/history",      icon: BookOpen   },
    { label: "Watchlist",    href: "/watchlist",    icon: Star       },
  ];

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-[rgba(5,5,5,0.97)] backdrop-blur-2xl border-b border-[rgba(255,215,0,0.12)] shadow-[0_4px_40px_rgba(0,0,0,0.7)]"
          : "bg-[rgba(5,5,5,0.6)] backdrop-blur-xl border-b border-[rgba(255,215,0,0.05)]"
      )}
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-3 flex-shrink-0 group">
          <div className="relative">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:shadow-[0_0_16px_rgba(255,215,0,0.25)]"
              style={{
                background: "linear-gradient(135deg, rgba(255,215,0,0.12), rgba(201,162,39,0.06))",
                border: "1px solid rgba(255,215,0,0.25)",
              }}
            >
              <Activity size={14} className="text-[#FFD700]" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#00FF9C] animate-live-dot" />
          </div>

          <div className="flex flex-col leading-none">
            <span
              className="font-bold text-[15px] tracking-wider"
              style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
            >
              <span className="text-[#F5F5F5] group-hover:text-[#FFD700] transition-colors duration-300">
                R.H.T.I.
              </span>
              <span className="text-[#FFD700]">H</span>
            </span>
            <span className="text-[7.5px] font-mono uppercase tracking-[0.18em] text-[#3A3A3A] mt-0.5">
              Equity Intelligence
            </span>
          </div>
        </Link>

        {/* ── Center Nav ── */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-medium transition-all duration-200",
                  active
                    ? "text-[#FFD700]"
                    : "text-[#6A6A6A] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.03)]"
                )}
                style={active ? {
                  background: "rgba(255,215,0,0.07)",
                  border: "1px solid rgba(255,215,0,0.18)",
                } : {
                  border: "1px solid transparent",
                }}
              >
                <Icon size={12} />
                {label}

                {label === "Watchlist" && mounted && count > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 text-[#050505] text-[9px] font-mono font-bold rounded-full flex items-center justify-center"
                    style={{
                      background: "#FFD700",
                      boxShadow: "0 0 8px rgba(255,215,0,0.6)",
                    }}
                  >
                    {count}
                  </span>
                )}

                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute bottom-0.5 left-3 right-3 h-px"
                    style={{ background: "linear-gradient(90deg, transparent, #FFD700, transparent)" }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* ── Right Controls ── */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/")}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono text-[#6A6A6A] hover:text-[#F5F5F5] transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,215,0,0.08)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,215,0,0.25)";
              (e.currentTarget as HTMLButtonElement).style.background   = "rgba(255,215,0,0.04)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,215,0,0.08)";
              (e.currentTarget as HTMLButtonElement).style.background   = "rgba(255,255,255,0.02)";
            }}
          >
            <Search size={11} />
            <span className="hidden lg:inline">Search stocks</span>
            <kbd
              className="px-1.5 py-0.5 rounded text-[9px]"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              ⌘K
            </kbd>
          </button>

          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all duration-200"
            style={{
              background: "rgba(0,255,156,0.05)",
              border: "1px solid rgba(0,255,156,0.15)",
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#00FF9C] animate-live-dot" />
            <span className="text-[9px] font-mono text-[#00FF9C] uppercase tracking-[0.12em]">Live</span>
          </div>

          <button
            className="md:hidden text-[#6A6A6A] hover:text-[#F5F5F5] p-1.5 transition-colors"
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
              background: "rgba(5,5,5,0.98)",
              borderTop: "1px solid rgba(255,215,0,0.08)",
            }}
          >
            {navLinks.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] text-[#6A6A6A] hover:text-[#F5F5F5] transition-all"
                style={{ border: "1px solid transparent" }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background   = "rgba(255,215,0,0.04)";
                  el.style.borderColor  = "rgba(255,215,0,0.12)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background  = "transparent";
                  el.style.borderColor = "transparent";
                }}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={14} />
                {label}
                {label === "Watchlist" && mounted && count > 0 && (
                  <span
                    className="ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                    style={{
                      background: "rgba(255,215,0,0.1)",
                      border: "1px solid rgba(255,215,0,0.3)",
                      color: "#FFD700",
                    }}
                  >
                    {count}
                  </span>
                )}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
