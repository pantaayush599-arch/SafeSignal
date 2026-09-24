import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { ErrorBanner } from "./ui/Feedback";
import { triggerPanic } from "../api/client";
import { describeError } from "../lib/errors";
import { useIdentity } from "../state/identity";
import { recordRequestId } from "../pages/requester/RequestHistory";
import { RELATIONS } from "../lib/relations";
import { AlertOctagon, Siren } from "lucide-react";

/**
 * Manual in-call panic button. Independent of
 * automatic risk detection — the user decides they're suspicious right
 * now and jumps straight into the pause-and-verify flow.
 */
export function PanicButton() {
  const { identity } = useIdentity();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [claimedIdentity, setClaimedIdentity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  if (!identity || identity.role !== "requester") return null;

  async function handleTrigger() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await triggerPanic(identity!.token, note.trim() || undefined, claimedIdentity || undefined);
      recordRequestId(identity!.id, result.request_id);
      setOpen(false);
      setNote("");
      setClaimedIdentity("");
      navigate(`/requester/requests/${result.request_id}`);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-4 z-30 group flex items-center gap-2.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-rose-950/40 dark:shadow-rose-950/70 border border-rose-400/40 transition-all duration-200 hover:scale-105 hover:from-red-500 hover:to-rose-500 sm:bottom-6 sm:right-6 cursor-pointer select-none"
        aria-label="Emergency Panic — pause and verify now"
      >
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-80" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
        </span>
        <AlertOctagon className="h-4 w-4" />
        <span className="hidden sm:inline">Emergency Pause &amp; Verify</span>
        <span className="sm:hidden">Pause Now</span>
      </button>

      <Modal open={open} onClose={() => !submitting && setOpen(false)} title="Emergency Intercept: Pause & Verify">
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400">
              <Siren className="h-4 w-4" />
            </div>
            <p className="text-xs text-rose-950 dark:text-rose-200/90 leading-relaxed">
              This immediately pauses whatever action you are worried about and alerts your trusted contact, regardless of automatic risk detection.
            </p>
          </div>

          <label htmlFor="panic-claimed" className="text-xs font-semibold text-[var(--color-text)]">
            <span className="mb-1.5 block">Who is the caller claiming to be? (Optional)</span>
            <select
              id="panic-claimed"
              value={claimedIdentity}
              onChange={(e) => setClaimedIdentity(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-3 py-2 text-xs font-medium text-[var(--color-text)] outline-none focus:border-[var(--color-brand)]"
            >
              <option value="">Not sure / Unknown</option>
              {RELATIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="panic-note" className="text-xs font-semibold text-[var(--color-text)]">
            <span className="mb-1.5 block">What is happening? (Optional context)</span>
            <textarea
              id="panic-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Received urgent call claiming to be family member in distress asking for cash."
              className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-3 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-brand)] placeholder:text-[var(--color-text-faint)] leading-relaxed"
            />
          </label>

          {error && <ErrorBanner title={error.title} message={error.message} />}

          <div className="flex justify-end gap-2.5 pt-2 border-t border-[var(--color-border)]">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleTrigger} loading={submitting}>
              Engage Emergency Pause
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
