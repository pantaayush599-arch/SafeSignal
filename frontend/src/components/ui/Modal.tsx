import { useEffect, useRef, type ReactNode } from "react";

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
  // Callers usually pass a fresh inline onClose each render. Reading it via a
  // ref keeps the effect below from re-running (and re-focusing the dialog,
  // which stole focus from textareas after every keystroke) on each render.
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
    // Only take focus if nothing inside the dialog (e.g. an autoFocus field) already has it.
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
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
        className="w-full max-w-md rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-2xl outline-none max-h-[90vh] overflow-y-auto"
      >
        <div className="border-b border-[var(--color-border)] px-5 py-4">
          <h2 id="modal-title" className="text-base font-semibold">
            {title}
          </h2>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
