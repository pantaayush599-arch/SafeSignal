import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ErrorBanner, Spinner, SuccessBanner } from "../../components/ui/Feedback";
import { VerificationStatusBadge, RiskBadge } from "../../components/ui/Badge";
import { Countdown } from "../../components/ui/Countdown";
import { useIdentity } from "../../state/identity";
import { getContactInbox, respondTier1, respondTier2 } from "../../api/client";
import type { ContactInboxItem } from "../../api/types";
import { describeError } from "../../lib/errors";
import { formatCurrency, reasonLabel } from "../../lib/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { ArrowLeft, Check, X, ShieldAlert, KeyRound, Clock, MessageSquare, AlertTriangle } from "lucide-react";

export function VerificationDetail() {
  useDocumentTitle("Identity Verification Review — SafeSignal");
  const { verificationId } = useParams<{ verificationId: string }>();
  const { identity } = useIdentity();
  const [item, setItem] = useState<ContactInboxItem | null>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [responding, setResponding] = useState<"CONFIRMED" | "REJECTED" | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!identity) return;
    getContactInbox(identity.token, identity.id)
      .then((items) => {
        const found = items.find((i) => i.verification_id === verificationId);
        if (!found) {
          setError({ title: "Not found", message: "This verification request isn't assigned to you, or no longer exists." });
        } else {
          setItem(found);
        }
      })
      .catch((e) => setError(describeError(e)));
  }, [identity, verificationId]);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 4000);
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
  if (error && !item) return <ErrorBanner title={error.title} message={error.message} />;
  if (!item) return <Spinner label="Loading verification details…" />;

  const isPending = item.status === "PENDING";
  const isTier3 = item.tier === 3;

  async function respond(response: "CONFIRMED" | "REJECTED") {
    if (!identity || !item || responding) return;
    setResponding(response);
    setError(null);
    try {
      const fn = item.tier === 1 ? respondTier1 : respondTier2;
      const result = await fn(identity.token, item.verification_id, response);
      setSuccess(
        response === "CONFIRMED"
          ? "Confirmed. The recipient's transaction has been authorized and released."
          : "Rejected. The transfer remains securely paused and escalated."
      );
      setItem({ ...item, status: result.status });
    } catch (err) {
      setError(describeError(err));
    } finally {
      setResponding(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {/* Back button */}
      <div>
        <Link
          to="/contact"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-brand)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Verification Queue</span>
        </Link>
      </div>

      {/* Main Review Card */}
      <Card className="overflow-hidden">
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[var(--color-brand)]" />
              <span>Independent Verification (Tier {item.tier})</span>
            </div>
          }
          subtitle="Delivered via independent secure channel."
          right={<VerificationStatusBadge status={item.status} />}
        />
        <CardBody className="flex flex-col gap-5">
          {/* Main Question Box */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">
              Intercepted Situation
            </p>
            <p className="mt-1.5 text-sm text-[var(--color-text)] leading-relaxed">
              A high-risk request to transfer <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{formatCurrency(item.amount)}</span> was initiated. The caller claimed to be your family member:{" "}
              <span className="font-bold text-[var(--color-text)] uppercase">{item.claimed_identity ?? "Unknown"}</span>.
            </p>
          </div>

          {/* Risk assessment indicators */}
          <div className="flex flex-wrap items-center gap-3">
            <RiskBadge level={item.risk_level} />
            {item.risk_score !== null && item.risk_score !== undefined && (
              <span className="font-mono text-xs text-[var(--color-text-muted)]">
                Threat Score: <strong className="text-[var(--color-text)]">{item.risk_score}/100</strong>
              </span>
            )}
          </div>

          {/* Reason chips */}
          {item.reason_codes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.reason_codes.map((c) => (
                <span
                  key={c}
                  className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-muted)]"
                >
                  {reasonLabel(c)}
                </span>
              ))}
            </div>
          )}

          {/* Intercepted Transcript */}
          {item.transcript_or_text && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3.5">
              <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-faint)] mb-1">
                <MessageSquare className="h-3 w-3" />
                <span>Captured Caller Transcript</span>
              </div>
              <p className="text-xs italic text-[var(--color-text)] leading-relaxed">
                “{item.transcript_or_text}”
              </p>
            </div>
          )}

          {/* Escalation Notice */}
          {item.escalation_reason && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
              <span>Escalated because: {item.escalation_reason.replace(/_/g, " ").toLowerCase()}</span>
            </div>
          )}

          {/* Countdown timer */}
          {isPending && (
            <div className="flex items-center justify-between rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]">
                <Clock className="h-3.5 w-3.5 text-[var(--color-brand)]" />
                <span>Verification Decision Window</span>
              </div>
              <Countdown expiresAt={item.expires_at} />
            </div>
          )}
        </CardBody>
      </Card>

      {/* Tier 3: One-time relay code */}
      {isTier3 ? (
        <Card className="overflow-hidden border-[var(--color-brand)]/40">
          <CardHeader
            title={
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[var(--color-brand)]" />
                <span>Out-of-Band Relay Code</span>
              </div>
            }
            subtitle="Share this verbal PIN with the requester only after independent direct phone confirmation."
          />
          <CardBody className="flex flex-col gap-4">
            {isPending ? (
              <>
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  Call your family member on a known, pre-saved phone number to verify their voice in person. Read this PIN to them to finalize authorization:
                </p>
                <div className="rounded-xl border border-[var(--color-brand)]/40 bg-[var(--color-surface-raised)] py-5 text-center font-mono text-4xl font-extrabold tracking-[0.4em] text-[var(--color-brand)] shadow-inner">
                  {item.demo_code}
                </div>
              </>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)]">This relay code authorization has concluded.</p>
            )}
          </CardBody>
        </Card>
      ) : (
        isPending && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              variant="confirm"
              fullWidth
              loading={responding === "CONFIRMED"}
              disabled={!!responding}
              onClick={() => respond("CONFIRMED")}
              className="py-3 text-xs uppercase tracking-wider"
            >
              <Check className="h-4 w-4 mr-1.5 inline" />
              Confirm — Request is Genuine
            </Button>
            <Button
              variant="reject"
              fullWidth
              loading={responding === "REJECTED"}
              disabled={!!responding}
              onClick={() => respond("REJECTED")}
              className="py-3 text-xs uppercase tracking-wider"
            >
              <X className="h-4 w-4 mr-1.5 inline" />
              Reject — Scam or Suspicious
            </Button>
          </div>
        )
      )}

      {success && <SuccessBanner message={success} />}
      {error && item && <ErrorBanner title={error.title} message={error.message} />}
    </div>
  );
}
