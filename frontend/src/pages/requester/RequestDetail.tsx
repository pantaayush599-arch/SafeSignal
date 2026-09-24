import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { manualOverride } from "../../api/client";
import { useIdentity } from "../../state/identity";
import { useRequestState } from "../../hooks/useRequestState";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { describeError } from "../../lib/errors";
import { Card, CardBody } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { RequestStatusBadge } from "../../components/ui/Badge";
import { Spinner, ErrorBanner, SuccessBanner } from "../../components/ui/Feedback";
import { RiskAnalysisCard } from "../../components/RiskAnalysisCard";
import { ProtectedActionCard } from "../../components/ProtectedActionCard";
import { VerificationProgress } from "../../components/VerificationProgress";
import { AuditTrail } from "../../components/AuditTrail";
import { FraudReportCard } from "../../components/FraudReportCard";
import { ManualOverrideModal } from "../../components/ManualOverrideModal";
import { ArrowLeft, Shield, AlertTriangle } from "lucide-react";

export function RequestDetail() {
  const { requestId } = useParams<{ requestId: string }>();
  const { identity } = useIdentity();
  useDocumentTitle(`Incident ${requestId ?? ""} — SafeSignal`);

  const { state, error: apiError, loading, wsState, refresh } = useRequestState(identity?.token, requestId);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const error = apiError ? describeError(apiError) : null;

  if (!identity || identity.role !== "requester") {
    return (
      <ErrorBanner
        title="Requester persona required"
        message="Switch to the requester persona on the home page to inspect this security incident."
      />
    );
  }

  if (loading) {
    return <Spinner label="Loading security incident telemetry…" />;
  }

  if (error || !state) {
    return (
      <div className="flex flex-col gap-4">
        {error && <ErrorBanner title={error.title} message={error.message} />}
        <Link to="/requester" className="text-xs text-[var(--color-brand)] hover:underline">
          ← Return to Threat Simulator
        </Link>
      </div>
    );
  }

  const canOverride = state.request_status === "STAYS-PAUSED" || state.request_status === "TIMED-OUT";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {/* Breadcrumb Navigation & Real-time Indicator */}
      <div className="flex items-center justify-between">
        <Link
          to="/requester/history"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Request History</span>
        </Link>

        {/* Real-time Connection Indicator */}
        <div className="flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-mono shadow-sm">
          <Shield className="h-3 w-3 text-[var(--color-brand)]" />
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              wsState === "open"
                ? "bg-emerald-500 animate-pulse"
                : wsState === "connecting"
                ? "bg-amber-500 animate-ping"
                : "bg-slate-400"
            }`}
          />
          <span className="text-[10px] uppercase text-[var(--color-text-muted)]">
            {wsState === "open" ? "LIVE SYNC" : wsState === "connecting" ? "CONNECTING" : "RECONNECTING"}
          </span>
        </div>
      </div>

      {/* Incident Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] pb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-faint)]">
            SECURITY INCIDENT INTERCEPT
          </span>
          <h1 className="mt-0.5 text-2xl font-black tracking-tight text-[var(--color-text)] font-mono">
            {state.request_id}
          </h1>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Registered on {new Date(state.created_at).toLocaleString()}
          </p>
        </div>
        <RequestStatusBadge status={state.request_status} />
      </div>

      {/* Status Notifications */}
      {state.request_status === "VERIFIED" && (
        <SuccessBanner
          title="Verification Successful"
          message="Independent family contact verification has confirmed identity. The financial transfer has been authorized and unlocked."
        />
      )}
      {state.request_status === "MANUAL-OVERRIDE" && (
        <ErrorBanner
          title="Manual Override Active"
          message={`This request bypassed standard verification. Audit justification logged: "${state.override_reason}"`}
        />
      )}
      {state.request_status === "TIMED-OUT" && (
        <ErrorBanner
          title="Verification Window Expired"
          message="No trusted contact authorized this request within the timeout limit. Financial action remains safely locked."
        />
      )}
      {state.request_status === "PENDING" && state.decision === "REVIEW" && (
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-sky-950 dark:text-sky-300">
                Medium Risk Warning — Review Carefully
              </p>
              <p className="mt-1 text-xs text-sky-800 dark:text-sky-200/90 leading-relaxed">
                Elevated signals detected, but below automatic pause threshold. The transfer is not locked, but exercise extreme caution and contact the recipient directly before transferring any funds.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Risk Analysis Card */}
      <RiskAnalysisCard state={state} />

      {/* Protected Financial Action Card */}
      {state.transfer_requested && (
        <AnimatePresence mode="wait">
          <motion.div
            key={state.request_status}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <ProtectedActionCard state={state} />
          </motion.div>
        </AnimatePresence>
      )}

      {/* Verification Protocol Progress */}
      {state.verification_required && (
        <VerificationProgress
          state={state}
          token={identity.token}
          onChanged={() => {
            refresh();
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {/* Manual Override Option */}
      {canOverride && (
        <Card className="border-[var(--color-border-strong)] bg-[var(--color-surface)]">
          <CardBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                Genuine Emergency with No Contact Reachable?
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)] leading-relaxed">
                Manual override bypasses verification tiers. It is permanently logged to prevent unauthorized misuse.
              </p>
            </div>
            <Button variant="danger" onClick={() => setOverrideOpen(true)} className="shrink-0">
              Manual Override
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Fraud Report Helpline */}
      {canOverride && <FraudReportCard />}

      {/* Audit Log */}
      <AuditTrail token={identity.token} requestId={state.request_id} refreshKey={refreshKey} />

      {/* Manual Override Dialog */}
      <ManualOverrideModal
        open={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        onConfirm={async (reason) => {
          await manualOverride(identity.token, state.request_id, reason);
          refresh();
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}
