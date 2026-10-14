"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light";

interface ThemeContextValue {
  theme:       Theme;
  toggleTheme: () => void;
  setTheme:    (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme:       "dark",
  toggleTheme: () => {},
  setTheme:    () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme,   setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted]    = useState(false);

  useEffect(() => {
    setMounted(true);
    // Prefer data-theme set by no-FOUC inline script, then localStorage, then dark default
    const htmlAttr = document.documentElement.getAttribute("data-theme") as Theme | null;
    let stored: Theme | null = null;
    try { stored = localStorage.getItem("equitylens-theme") as Theme | null; } catch { /**/ }
    const initial = stored ?? htmlAttr ?? "dark";
    setThemeState(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const setTheme = (t: Theme) => {
    // Brief transition class so color changes animate smoothly
    document.documentElement.classList.add("theme-transitioning");
    document.documentElement.setAttribute("data-theme", t);
    setThemeState(t);
    try { localStorage.setItem("equitylens-theme", t); } catch { /**/ }
    // Update mobile browser chrome color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "dark" ? "#050505" : "#F0EBE0");
    window.setTimeout(() => {
      document.documentElement.classList.remove("theme-transitioning");
    }, 280);
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  // Always render children — theme is applied via data-theme attribute
  return (
    <ThemeContext.Provider value={{ theme: mounted ? theme : "dark", toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
