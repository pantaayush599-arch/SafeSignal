import { useEffect, useState } from "react";
import { Card, CardBody } from "./ui/Card";
import { Spinner, ErrorBanner, EmptyState } from "./ui/Feedback";
import { getAuditTrail } from "../api/client";
import type { AuditEventOut } from "../api/types";
import { describeError } from "../lib/errors";
import { eventLabel, formatDateTime } from "../lib/format";
import { ChevronDown, ChevronUp, History } from "lucide-react";

export function AuditTrail({
  token,
  requestId,
  refreshKey,
}: {
  token: string;
  requestId: string;
  refreshKey: unknown;
}) {
  const [events, setEvents] = useState<AuditEventOut[] | null>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getAuditTrail(token, requestId)
      .then((r) => !cancelled && setEvents(r.events))
      .catch((e) => !cancelled && setError(describeError(e)));
    return () => {
      cancelled = true;
    };
  }, [token, requestId, open, refreshKey]);

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[var(--color-surface-raised)] cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-[var(--color-brand)]" />
          <span className="text-sm font-bold text-[var(--color-text)] tracking-tight">Security Audit Log</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <span>{open ? "Collapse log" : "View complete event timeline"}</span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <CardBody className="border-t border-[var(--color-border)] pt-4">
          {error && <ErrorBanner title={error.title} message={error.message} />}
          {!error && events === null && <Spinner label="Retrieving cryptographic audit trail…" />}
          {events && events.length === 0 && (
            <EmptyState title="No audit events" message="Nothing has been recorded for this request yet." />
          )}
          {events && events.length > 0 && (
            <div className="relative pl-3">
              {/* Timeline bar */}
              <div className="absolute left-4 top-2 bottom-2 w-px bg-[var(--color-border-strong)]" />

              <ol className="flex flex-col gap-4">
                {events.map((e, i) => (
                  <li key={i} className="relative flex items-start gap-3.5 text-xs">
                    <span className="mt-1 flex h-2.5 w-2.5 shrink-0 rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-brand)] shadow-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[var(--color-text)]">{eventLabel(e.event)}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-[var(--color-text-faint)]">
                        {formatDateTime(e.timestamp)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </CardBody>
      )}
    </Card>
  );
}
