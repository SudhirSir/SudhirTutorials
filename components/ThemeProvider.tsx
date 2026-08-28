"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { safeLocalStorage } from "@/lib/safeStorage";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Get initial theme from DOM attribute set by the blocking script, or default to localStorage / dark
    const storedTheme = safeLocalStorage.getItem("theme") as Theme;
    const documentTheme = typeof document !== 'undefined' ? document.documentElement.getAttribute("data-theme") as Theme : null;
    
    if (storedTheme) {
      setTheme(storedTheme);
    } else if (documentTheme) {
      setTheme(documentTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    safeLocalStorage.setItem("theme", nextTheme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute("data-theme", nextTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
