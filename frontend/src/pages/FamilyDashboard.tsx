import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { EmptyState, ErrorBanner, Spinner } from "../components/ui/Feedback";
import { RequestStatusBadge, RiskBadge } from "../components/ui/Badge";
import { useIdentity } from "../state/identity";
import { getDashboard } from "../api/client";
import type { DashboardOut } from "../api/types";
import { describeError } from "../lib/errors";
import { formatCurrency, formatDateTime } from "../lib/format";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ArrowRight, Activity, Users } from "lucide-react";

/**
 * Simple family dashboard. Read-only view over
 * GET /requesters/{id}/dashboard.
 */
export function FamilyDashboard() {
  const { requesterId } = useParams<{ requesterId: string }>();
  useDocumentTitle("Family Defense Console — SafeSignal");
  const { identity } = useIdentity();
  const [data, setData] = useState<DashboardOut | null>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    if (!identity || !requesterId) return;
    getDashboard(identity.token, requesterId)
      .then(setData)
      .catch((e) => setError(describeError(e)));
  }, [identity, requesterId]);

  if (!identity) {
    return (
      <div className="mx-auto max-w-md p-6 text-center flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-brand-subtle)] text-[var(--color-brand)] border border-[var(--color-brand)]/30">
          <Activity className="h-6 w-6 animate-pulse" />
        </div>
        <div>
          <h2 className="text-lg font-black text-[var(--color-text)]">Live Defense Dashboard</h2>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Select a verified persona to monitor real-time threat intercepts and verification events.
          </p>
        </div>
        <Link
          to="/"
          className="rounded-xl bg-[var(--color-brand)] px-5 py-2.5 text-xs font-bold text-slate-950 hover:opacity-90 shadow-md transition-all cursor-pointer"
        >
          Select Family Persona →
        </Link>
      </div>
    );
  }
  if (error) return <ErrorBanner title={error.title} message={error.message} />;
  if (!data) return <Spinner label="Loading family defense records…" />;

  const verifiedCount = data.entries.filter((e) => e.request_status === "VERIFIED").length;
  const pausedCount = data.entries.filter(
    (e) => e.request_status === "STAYS-PAUSED" || e.request_status === "PAUSED"
  ).length;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--color-brand)] mb-1">
          <Users className="h-3.5 w-3.5" />
          <span>Family Protection Overview</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-[var(--color-text)]">
          {data.requester_name}&apos;s Defense Activity
        </h1>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          Aggregated security events, scam intercepts, and trusted contact verifications.
        </p>
      </div>

      {/* Summary KPI grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-3 text-center shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
            Total Flagged
          </span>
          <p className="mt-0.5 font-mono text-xl font-bold text-[var(--color-text)]">
            {data.entries.length}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-semibold">
            Verified Safe
          </span>
          <p className="mt-0.5 font-mono text-xl font-bold text-emerald-700 dark:text-emerald-300">
            {verifiedCount}
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-700 dark:text-amber-300 font-semibold">
            Stopped / Paused
          </span>
          <p className="mt-0.5 font-mono text-xl font-bold text-amber-700 dark:text-amber-300">
            {pausedCount}
          </p>
        </div>
      </div>

      {/* Main Events Card */}
      <Card className="overflow-hidden">
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[var(--color-brand)]" />
              <span>Recent Intercepted Incidents</span>
            </div>
          }
          subtitle="Real-time record of multi-signal threat triggers."
        />
        {data.entries.length === 0 ? (
          <CardBody>
            <EmptyState
              title="No flagged requests yet"
              message="Requests that get analyzed will show up here with their threat level and outcome."
            />
          </CardBody>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {data.entries.map((e) => (
              <Link
                key={e.request_id}
                to={identity.role === "requester" ? `/requester/requests/${e.request_id}` : "#"}
                className={
                  identity.role === "requester"
                    ? "block transition-colors hover:bg-[var(--color-surface-raised)]"
                    : "block pointer-events-none"
                }
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {e.triggered_by_panic ? (
                        <span className="rounded bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-700 dark:text-rose-300">
                          EMERGENCY PANIC INTERCEPT
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-[var(--color-text)] truncate">
                          Claiming to be: <strong className="text-[var(--color-text)]">{e.claimed_identity ?? "Unknown"}</strong>
                        </span>
                      )}
                      <span className="font-mono text-[11px] text-[var(--color-text-faint)]">
                        ({e.request_id})
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Sum: <strong className="font-mono text-[var(--color-text)]">{formatCurrency(e.amount)}</strong> · {formatDateTime(e.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--color-border)]">
                    <RiskBadge level={e.risk_level} />
                    <RequestStatusBadge status={e.request_status} />
                    {identity.role === "requester" && (
                      <ArrowRight className="hidden sm:block h-4 w-4 text-[var(--color-text-faint)]" />
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
