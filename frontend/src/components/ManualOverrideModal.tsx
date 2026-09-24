import { useState } from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { ErrorBanner } from "./ui/Feedback";
import { describeError } from "../lib/errors";
import { ShieldOff } from "lucide-react";

export function ManualOverrideModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [step, setStep] = useState<"warn" | "reason">("warn");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  function reset() {
    setReason("");
    setStep("warn");
    setError(null);
    setSubmitting(false);
  }

  function close() {
    reset();
    onClose();
  }

  async function handleConfirm() {
    if (!reason.trim()) {
      setError({ title: "Reason required", message: "Explain how you verified this is a genuine emergency." });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
      close();
    } catch (err) {
      setError(describeError(err));
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={close} title="Manual Emergency Override">
      {step === "warn" ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400">
              <ShieldOff className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-950 dark:text-rose-200 uppercase tracking-wider">
                Bypasses Trusted Contact Verification
              </p>
              <p className="mt-1 text-xs text-rose-800 dark:text-rose-300/90 leading-relaxed">
                Manual override permanently unlocks the paused transaction without confirmation from your trusted contact. Only use this if you have personally verified the caller&apos;s identity via another reliable channel.
              </p>
            </div>
          </div>

          <p className="text-xs text-[var(--color-text-muted)] italic">
            Notice: All manual overrides are cryptographically timestamped and recorded in the permanent audit trail.
          </p>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-[var(--color-border)]">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setStep("reason")}>
              I Understand, Proceed
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <label htmlFor="override-reason" className="text-xs font-semibold text-[var(--color-text)]">
            <span className="mb-1.5 block">Why are you overriding the security pause?</span>
            <textarea
              id="override-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              autoFocus
              placeholder="e.g. I called my son directly on his known number and confirmed this myself."
              className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-3 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-brand)] leading-relaxed"
            />
          </label>
          {error && <ErrorBanner title={error.title} message={error.message} />}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-[var(--color-border)]">
            <Button variant="secondary" onClick={close} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirm} loading={submitting}>
              Confirm Manual Override
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
