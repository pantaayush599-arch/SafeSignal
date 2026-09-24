import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "confirm" | "reject";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-sm border border-cyan-400/30 active:scale-[0.98]",
  secondary:
    "bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-overlay)] text-[var(--color-text)] border border-[var(--color-border-strong)] hover:border-[var(--color-brand)]/50 shadow-sm active:scale-[0.98]",
  danger:
    "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-sm border border-rose-400/30 active:scale-[0.98]",
  ghost:
    "bg-transparent hover:bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] active:scale-[0.98]",
  confirm:
    "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm border border-emerald-400/30 active:scale-[0.98]",
  reject:
    "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 hover:border-rose-500/50 active:scale-[0.98]",
};

export function Button({
  variant = "primary",
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold tracking-tight
        transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none cursor-pointer select-none
        ${fullWidth ? "w-full" : ""} ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
