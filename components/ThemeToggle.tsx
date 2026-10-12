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
        background: "var(--primary-muted)",
        border: "1px solid var(--border-accent-faint)",
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
          background: "radial-gradient(circle at center, var(--primary-muted) 0%, transparent 70%)",
        }}
      />

      {/* Track */}
      <div
        className="relative w-9 h-5 rounded-full flex items-center px-0.5"
        style={{
          background: "var(--bg-accent-faint)",
          border: "1px solid var(--border-accent-faint)",
        }}
      >
        <motion.div
          className="w-4 h-4 rounded-full flex items-center justify-center"
          animate={{ x: isLight ? 16 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
          style={{
            background: "var(--border-accent)",
            boxShadow: "0 1px 6px var(--shadow-sm)",
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
                <Sun size={8} style={{ color: "var(--th-bg-base)" }} />
              </motion.div>
            ) : (
              <motion.div
                key="moon"
                initial={{ opacity: 0, rotate: 90,  scale: 0.5 }}
                animate={{ opacity: 1, rotate: 0,   scale: 1 }}
                exit={{   opacity: 0, rotate: -90,  scale: 0.5 }}
                transition={{ duration: 0.18 }}
              >
                <Moon size={8} style={{ color: "var(--th-bg-base)" }} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Label */}
      <span
        className="text-[9px] font-mono uppercase tracking-[0.12em] select-none"
        style={{
          color: "var(--border-accent)",
          minWidth: "22px",
        }}
      >
        {isLight ? "Day" : "Night"}
      </span>
    </motion.button>
  );
}
