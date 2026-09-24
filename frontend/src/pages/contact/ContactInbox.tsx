import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardBody } from "../../components/ui/Card";
import { EmptyState, ErrorBanner, Spinner } from "../../components/ui/Feedback";
import { VerificationStatusBadge, RiskBadge } from "../../components/ui/Badge";
import { Countdown } from "../../components/ui/Countdown";
import { useIdentity } from "../../state/identity";
import { getContactInbox } from "../../api/client";
import type { ContactInboxItem } from "../../api/types";
import { describeError } from "../../lib/errors";
import { formatCurrency } from "../../lib/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { Inbox, ArrowRight, History, AlertCircle } from "lucide-react";

const TIER_TITLE: Record<number, string> = {
  1: "Tier 1: Fast Family Authorization",
  2: "Tier 2: Escalated Contact Review",
  3: "Tier 3: Relay Code Handshake",
};

export function ContactInbox() {
  useDocumentTitle("Verification Inbox — SafeSignal");
  const { identity } = useIdentity();
  const [items, setItems] = useState<ContactInboxItem[] | null>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  const load = useCallback(() => {
    if (!identity) return;
    getContactInbox(identity.token, identity.id)
      .then(setItems)
      .catch((e) => setError(describeError(e)));
  }, [identity]);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 5000);
    return () => window.clearInterval(id);
  }, [load]);

  if (!identity || identity.role !== "contact") {
    return (
      <ErrorBanner
        title="No trusted-contact persona selected"
        message="Go to the home page and pick a trusted-contact persona."
      />
    );
  }

  const pending = items?.filter((i) => i.status === "PENDING") ?? [];
  const resolved = items?.filter((i) => i.status !== "PENDING") ?? [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--color-brand)] mb-1">
            <Inbox className="h-3.5 w-3.5" />
            <span>Trusted Contact Console</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-text)]">
            Verification Queue
          </h1>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Review incoming verification requests for <span className="font-semibold text-[var(--color-text)]">{identity.name}</span> on an independent channel.
          </p>
        </div>
        {pending.length > 0 && (
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            <span>{pending.length} Action Required</span>
          </div>
        )}
      </div>

      {error && <ErrorBanner title={error.title} message={error.message} />}
      {!items && !error && <Spinner label="Loading verification queue…" />}

      {items && pending.length === 0 && (
        <EmptyState
          title="No pending requests"
          message="Your queue is clear. Whenever high-risk emergency transfers are paused, independent verification requests will appear here immediately."
        />
      )}

      {pending.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <span>Awaiting Your Decision ({pending.length})</span>
          </div>

          {pending.map((item) => (
            <Link key={item.verification_id} to={`/contact/verifications/${item.verification_id}`}>
              <Card className="group overflow-hidden border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-[var(--color-surface)] to-[var(--color-surface)] hover:border-amber-500 transition-all shadow-sm">
                <CardBody>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        {TIER_TITLE[item.tier] ?? `Tier ${item.tier}`}
                      </span>
                      <h3 className="mt-0.5 text-sm font-bold text-[var(--color-text)] group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors truncate">
                        Claimed caller identity:{" "}
                        <span className="underline decoration-amber-500/50">
                          {item.claimed_identity ?? "Unknown caller"}
                        </span>
                      </h3>
                      <div className="mt-1 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                        <span>Requested sum: <strong className="text-[var(--color-text)] font-mono">{formatCurrency(item.amount)}</strong></span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--color-border)]">
                      <RiskBadge level={item.risk_level} />
                      <Countdown expiresAt={item.expires_at} />
                      <ArrowRight className="h-4 w-4 text-[var(--color-text-faint)] group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-faint)]">
            <History className="h-3.5 w-3.5" />
            <span>Resolved Verifications ({resolved.length})</span>
          </div>

          <div className="flex flex-col gap-2">
            {resolved.map((item) => (
              <Link key={item.verification_id} to={`/contact/verifications/${item.verification_id}`}>
                <Card className="opacity-80 transition-all hover:opacity-100 hover:border-[var(--color-border-strong)]">
                  <CardBody className="flex items-center justify-between py-3">
                    <div className="min-w-0 pr-2">
                      <p className="truncate text-xs font-semibold text-[var(--color-text)]">
                        {TIER_TITLE[item.tier] ?? `Tier ${item.tier}`} · Claim: {item.claimed_identity ?? "unknown"}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)] font-mono">
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                    <VerificationStatusBadge status={item.status} />
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
