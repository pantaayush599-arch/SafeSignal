import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardBody } from "../../components/ui/Card";
import { EmptyState, Spinner } from "../../components/ui/Feedback";
import { Button } from "../../components/ui/Button";
import { useIdentity } from "../../state/identity";
import { getRequestState } from "../../api/client";
import { RequestStatusBadge, RiskBadge } from "../../components/ui/Badge";
import type { RequestStateOut } from "../../api/types";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { History, PlusCircle, ArrowRight, Clock } from "lucide-react";
import { formatDateTime } from "../../lib/format";

export function requestHistoryKey(requesterId: string) {
  return `safesignal.history.${requesterId}`;
}

export function recordRequestId(requesterId: string, requestId: string) {
  try {
    const key = requestHistoryKey(requesterId);
    const existing: string[] = JSON.parse(window.localStorage.getItem(key) || "[]");
    if (!existing.includes(requestId)) {
      window.localStorage.setItem(key, JSON.stringify([requestId, ...existing].slice(0, 20)));
    }
  } catch {
    /* best-effort only */
  }
}

export function RequestHistory() {
  useDocumentTitle("Protected Incidents — SafeSignal");
  const { identity } = useIdentity();
  const [items, setItems] = useState<RequestStateOut[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!identity) return;
    let ids: string[] = [];
    try {
      ids = JSON.parse(window.localStorage.getItem(requestHistoryKey(identity.id)) || "[]");
    } catch {
      ids = [];
    }
    Promise.all(ids.map((id) => getRequestState(identity.token, id).catch(() => null))).then((results) => {
      setItems(results.filter((r): r is RequestStateOut => r !== null));
      setLoaded(true);
    });
  }, [identity]);

  if (!identity || identity.role !== "requester") return null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--color-brand)] mb-1">
            <History className="h-3.5 w-3.5" />
            <span>Incident Logs</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-text)]">
            Protected Requests &amp; Intercepts
          </h1>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Live audit of incoming communications analyzed and paused for {identity.name}.
          </p>
        </div>
        <Link to="/requester">
          <Button variant="primary" className="text-xs">
            <PlusCircle className="h-3.5 w-3.5 mr-1" />
            New Simulation
          </Button>
        </Link>
      </div>

      {!loaded && (
        <div className="flex justify-center py-8">
          <Spinner label="Loading incident logs…" />
        </div>
      )}

      {loaded && items.length === 0 && (
        <EmptyState
          title="No logged incidents yet"
          message="Requests you analyze will appear here with live verification progress and security audit trail."
        />
      )}

      {loaded && items.length > 0 && (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <Link key={item.request_id} to={`/requester/requests/${item.request_id}`}>
              <Card className="group transition-all hover:border-[var(--color-brand)]/50">
                <CardBody className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-[var(--color-text)] group-hover:text-[var(--color-brand)] transition-colors">
                        {item.request_id}
                      </span>
                      {item.amount && (
                        <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-1.5 py-0.5 text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                          ₹{item.amount.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors">
                      {item.transcript_or_text || "Speech audio upload recording"}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--color-text-faint)]">
                      <Clock className="h-3 w-3" />
                      <span>{formatDateTime(item.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--color-border)]">
                    <RiskBadge level={item.risk_level} />
                    <RequestStatusBadge status={item.request_status} />
                    <ArrowRight className="hidden sm:block h-4 w-4 text-[var(--color-text-faint)] group-hover:text-[var(--color-brand)] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
