import { Moon, Sun } from "lucide-react";
import { useTheme } from "../state/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-brand)]/50 transition-all duration-200 cursor-pointer shadow-sm ${className}`}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-cyan-600 transition-transform duration-200 hover:-rotate-12" />
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
