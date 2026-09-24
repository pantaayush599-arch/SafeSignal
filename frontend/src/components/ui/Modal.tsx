import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 dark:bg-black/80 backdrop-blur-sm p-4 transition-opacity"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-2xl shadow-slate-950/20 dark:shadow-black/80 outline-none max-h-[90vh] overflow-y-auto"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--card-highlight)] to-transparent" />
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 id="modal-title" className="text-base font-bold text-[var(--color-text)] tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
