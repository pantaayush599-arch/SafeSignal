import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
  deepfakeBackground: boolean;
  setDeepfakeBackground: (enabled: boolean) => void;
  toggleDeepfakeBackground: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "safesignal.theme";
const BG_STORAGE_KEY = "safesignal.bg_deepfake";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "dark" || stored === "light") {
        return stored;
      }
      // If user has system preference for light
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
        return "light";
      }
    } catch {
      // ignore
    }
    return "dark"; // Default to cybersecurity dark theme
  });

  const [deepfakeBackground, setDeepfakeBackgroundState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(BG_STORAGE_KEY);
      if (stored !== null) return stored === "true";
    } catch {
      // ignore
    }
    return true; // Enabled by default
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const setTheme = (next: Theme) => {
    setThemeState(next);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setDeepfakeBackground = (enabled: boolean) => {
    setDeepfakeBackgroundState(enabled);
    try {
      localStorage.setItem(BG_STORAGE_KEY, String(enabled));
    } catch {
      // ignore
    }
  };

  const toggleDeepfakeBackground = () => {
    setDeepfakeBackground(!deepfakeBackground);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isDark: theme === "dark",
        deepfakeBackground,
        setDeepfakeBackground,
        toggleDeepfakeBackground,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
