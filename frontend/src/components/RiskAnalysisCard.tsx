import { Card, CardHeader, CardBody } from "./ui/Card";
import { RiskBadge } from "./ui/Badge";
import type { RequestStateOut } from "../api/types";
import { reasonLabel } from "../lib/format";
import { Activity, AlertTriangle, Quote, ShieldAlert } from "lucide-react";

export function RiskAnalysisCard({ state }: { state: RequestStateOut }) {
  const score = state.risk_score ?? 0;
  const isHigh = score >= 70;
  const isMedium = score >= 30 && score < 70;

  const scoreColor = isHigh
    ? "text-rose-600 dark:text-rose-400"
    : isMedium
    ? "text-amber-600 dark:text-amber-400"
    : "text-emerald-600 dark:text-emerald-400";

  const barColor = isHigh
    ? "from-amber-500 to-rose-500"
    : isMedium
    ? "from-emerald-500 to-amber-500"
    : "from-teal-500 to-emerald-500";

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--color-brand)]" />
            <span>Risk Analysis</span>
          </div>
        }
        subtitle="Rule-based signal detection. A deepfake/authenticity score, if present, is advisory only."
        right={<RiskBadge level={state.risk_level} />}
      />
      <CardBody className="flex flex-col gap-5">
        {/* Risk Score Meter */}
        <div className="rounded-xl border border-[var(--color-border-strong)] bg-gradient-to-b from-[var(--color-surface-raised)] to-[var(--color-surface)] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-faint)]">
                AGGREGATE THREAT SCORE
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className={`font-mono text-3xl font-black tabular tracking-tight ${scoreColor}`}>
                  {score}
                </span>
                <span className="text-xs text-[var(--color-text-muted)] font-mono">/ 100</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-[var(--color-text)]">
                {isHigh ? "High-Risk Request" : isMedium ? "Review Advised" : "Low Risk Profile"}
              </span>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {isHigh ? "Automated pause triggered" : isMedium ? "Manual verification suggested" : "Standard verification"}
              </p>
            </div>
          </div>

          {/* Progress Bar Gauge */}
          <div className="mt-3.5 relative h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out`}
              style={{ width: `${Math.max(score, 4)}%` }}
            />
          </div>

          {/* Scale Markings */}
          <div className="mt-1.5 flex justify-between text-[10px] font-mono text-[var(--color-text-faint)]">
            <span>0 SAFE</span>
            <span>30 REVIEW</span>
            <span>70 CRITICAL PAUSE</span>
            <span>100</span>
          </div>
        </div>

        {/* Detected Signals */}
        <div>
          <div className="mb-2.5 flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-[var(--color-brand)]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Detected Risk Signals ({state.reason_codes.length})
            </span>
          </div>

          {state.reason_codes.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)] italic">
              No elevated threat signals identified in this communication.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {state.reason_codes.map((code) => {
                const label = reasonLabel(code);
                return (
                  <div
                    key={code}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)]"
                  >
                    <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Transcript Box */}
        {state.transcript_or_text && (
          <div className="relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3.5">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                <Quote className="h-3.5 w-3.5 text-[var(--color-brand)]" />
                <span>Captured Communication Transcript</span>
              </div>
              <span className="text-[10px] font-mono text-[var(--color-text-faint)]">VERBATIM</span>
            </div>
            <p className="text-xs text-[var(--color-text)] leading-relaxed italic border-l-2 border-[var(--color-brand)] pl-2.5 py-0.5">
              “{state.transcript_or_text}”
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
