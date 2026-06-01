"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <motion.button
      onClick={toggleTheme}
      className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg overflow-hidden"
      style={{
        background: isLight
          ? "rgba(184,150,46,0.08)"
          : "rgba(255,215,0,0.06)",
        border: isLight
          ? "1px solid rgba(150,120,45,0.22)"
          : "1px solid rgba(255,215,0,0.14)",
        cursor: "pointer",
      }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.95 }}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
    >
      {/* Glow fill on hover */}
      <motion.div
        className="absolute inset-0 rounded-lg pointer-events-none"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        style={{
          background: isLight
            ? "radial-gradient(circle at center, rgba(184,150,46,0.12) 0%, transparent 70%)"
            : "radial-gradient(circle at center, rgba(255,215,0,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Track */}
      <div
        className="relative w-9 h-5 rounded-full flex items-center px-0.5"
        style={{
          background: isLight
            ? "linear-gradient(135deg, rgba(184,150,46,0.15), rgba(150,120,45,0.25))"
            : "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.08))",
          border: isLight
            ? "1px solid rgba(150,120,45,0.30)"
            : "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <motion.div
          className="w-4 h-4 rounded-full flex items-center justify-center"
          animate={{ x: isLight ? 16 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
          style={{
            background: isLight
              ? "linear-gradient(135deg, #C9A227, #B8962E)"
              : "linear-gradient(135deg, #2A2A2A, #1A1A1A)",
            boxShadow: isLight
              ? "0 1px 6px rgba(184,150,46,0.45), 0 0 0 1px rgba(150,120,45,0.25)"
              : "0 1px 6px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isLight ? (
              <motion.div
                key="sun"
                initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                animate={{ opacity: 1, rotate: 0,   scale: 1 }}
                exit={{   opacity: 0, rotate:  90,  scale: 0.5 }}
                transition={{ duration: 0.18 }}
              >
                <Sun size={8} style={{ color: "#FFF8E7" }} />
              </motion.div>
            ) : (
              <motion.div
                key="moon"
                initial={{ opacity: 0, rotate: 90,  scale: 0.5 }}
                animate={{ opacity: 1, rotate: 0,   scale: 1 }}
                exit={{   opacity: 0, rotate: -90,  scale: 0.5 }}
                transition={{ duration: 0.18 }}
              >
                <Moon size={8} style={{ color: "#FFD700" }} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Label */}
      <span
        className="text-[9px] font-mono uppercase tracking-[0.12em] select-none"
        style={{
          color: isLight ? "var(--gold)" : "rgba(255,215,0,0.55)",
          minWidth: "22px",
        }}
      >
        {isLight ? "Day" : "Night"}
      </span>
    </motion.button>
  );
}
