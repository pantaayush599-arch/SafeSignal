import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Inbox, Loader2 } from "lucide-react";

export function ErrorBanner({ title, message, action }: { title?: string; message: string; action?: ReactNode }) {
  return (
    <div
      role="alert"
      className="relative overflow-hidden rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3.5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          {title && <p className="text-sm font-semibold text-rose-950 dark:text-rose-200">{title}</p>}
          <p className="mt-0.5 text-xs text-rose-800 dark:text-rose-300/90 leading-relaxed">{message}</p>
          {action && <div className="mt-2.5">{action}</div>}
        </div>
      </div>
    </div>
  );
}

export function SuccessBanner({ title, message }: { title?: string; message: string }) {
  return (
    <div
      role="status"
      className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3.5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          {title && <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-200">{title}</p>}
          <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-300/90 leading-relaxed">{message}</p>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)]/50 px-6 py-12 text-center">
      <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border-strong)] text-[var(--color-brand)]">
        {icon || <Inbox className="h-6 w-6 text-[var(--color-text-muted)]" />}
      </div>
      <p className="text-sm font-bold text-[var(--color-text)] tracking-tight">{title}</p>
      <p className="max-w-sm text-xs text-[var(--color-text-muted)] leading-relaxed">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2.5 py-4 text-xs font-medium text-[var(--color-text-muted)]"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--color-brand)]" aria-hidden="true" />
      {label && <span>{label}</span>}
    </div>
  );
}
