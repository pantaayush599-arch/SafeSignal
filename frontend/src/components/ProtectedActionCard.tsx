import { Card, CardHeader, CardBody } from "./ui/Card";
import type { RequestStateOut } from "../api/types";
import { formatCurrency } from "../lib/format";
import { relationLabel } from "../lib/relations";
import { Lock, AlertTriangle, ShieldCheck, HelpCircle, ArrowUpRight } from "lucide-react";

export function ProtectedActionCard({ state }: { state: RequestStateOut }) {
  const locked = state.request_status === "STAYS-PAUSED" || state.request_status === "TIMED-OUT";
  const unlocked = state.request_status === "VERIFIED";
  const overridden = state.request_status === "MANUAL-OVERRIDE";
  const advisory = state.request_status === "PENDING" && state.decision === "REVIEW";

  let statusTitle: string;
  let statusSubtitle: string;
  let bannerStyle: string;
  let IconComponent = HelpCircle;

  if (unlocked) {
    statusTitle = "Transfer Authorized & Unlocked";
    statusSubtitle = "Independent verification confirmed genuine identity. Transaction may proceed safely.";
    bannerStyle = "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/20";
    IconComponent = ShieldCheck;
  } else if (overridden) {
    statusTitle = "Manually Overridden";
    statusSubtitle = "Bypassed verification protocol via user manual override. Logged for security audit.";
    bannerStyle = "border-purple-500/40 bg-purple-500/10 text-purple-800 dark:text-purple-300 ring-1 ring-purple-500/20";
    IconComponent = AlertTriangle;
  } else if (state.request_status === "TIMED-OUT") {
    statusTitle = "Verification Timed Out · Action Locked";
    statusSubtitle = "No trusted contact responded within the time window. Funds remain protected.";
    bannerStyle = "border-slate-500/40 bg-slate-500/10 text-slate-800 dark:text-slate-300";
    IconComponent = Lock;
  } else if (advisory) {
    statusTitle = "Advisory Warning · Transfer Not Locked";
    statusSubtitle = "Moderate threat indicators present. Review carefully before authorizing funds manually.";
    bannerStyle = "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-300 ring-1 ring-sky-500/20";
    IconComponent = AlertTriangle;
  } else if (locked) {
    statusTitle = "HIGH RISK DETECTED · ACTION PAUSED & LOCKED";
    statusSubtitle = "High-risk deepfake/scam signals intercepted. SafeSignal has locked this financial action pending independent family verification.";
    bannerStyle = "border-rose-500/60 bg-gradient-to-r from-rose-500/15 via-amber-500/10 to-rose-500/15 text-rose-950 dark:text-rose-200 ring-2 ring-rose-500/30 animate-pulse";
    IconComponent = Lock;
  } else {
    statusTitle = "Awaiting Analysis";
    statusSubtitle = "Evaluating request parameters against family threat model.";
    bannerStyle = "border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]";
    IconComponent = HelpCircle;
  }

  return (
    <Card className={`overflow-hidden transition-all duration-300 ${
      locked
        ? "border-rose-500/40 shadow-xl shadow-rose-950/15 dark:shadow-rose-950/40"
        : unlocked
        ? "border-emerald-500/40 shadow-lg shadow-emerald-950/10"
        : ""
    }`}>
      <CardHeader
        title={
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight">Protected Financial Action</span>
            <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-muted)] uppercase">
              UPI / WALLET
            </span>
          </div>
        }
        subtitle="Simulated wallet transaction — no real money moves in this prototype."
      />

      <CardBody className="flex flex-col gap-4">
        {/* Status Alert Banner */}
        <div className={`flex items-start gap-3 rounded-xl border p-3.5 ${bannerStyle}`}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/10 dark:bg-black/30">
            <IconComponent className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider">{statusTitle}</p>
            <p className="mt-0.5 text-xs opacity-90 leading-relaxed">{statusSubtitle}</p>
          </div>
        </div>

        {/* Transaction Details Box */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 divide-y divide-[var(--color-border)]">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs text-[var(--color-text-muted)]">Claimed Recipient</span>
            <span className="text-sm font-bold text-[var(--color-text)]">
              {relationLabel(state.claimed_identity)}
            </span>
          </div>

          <div className="flex items-center justify-between py-3">
            <span className="text-xs text-[var(--color-text-muted)]">Requested Amount</span>
            <span className="font-mono text-xl font-extrabold text-[var(--color-text)] tracking-tight">
              {formatCurrency(state.amount)}
            </span>
          </div>

          <div className="flex items-center justify-between pt-3">
            <span className="text-xs text-[var(--color-text-muted)]">Action Type</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-brand)]">
              <span>Immediate Wire / Instant Pay</span>
              <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
