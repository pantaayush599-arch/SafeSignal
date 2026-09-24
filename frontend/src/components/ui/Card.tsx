import type { HTMLAttributes, ReactNode } from "react";

export function Card({ children, className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--card-shadow)] transition-all duration-200 ${className}`}
      {...rest}
    >
      {/* Top subtle highlight rim */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--card-highlight)] to-transparent rounded-t-xl" />
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, right }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-base font-bold tracking-tight text-[var(--color-text)]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-[var(--color-text-muted)] leading-relaxed">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}
