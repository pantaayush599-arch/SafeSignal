import type { RequestStatus, RiskLevel, VerificationStatus } from "../../api/types";

function Badge({
  label,
  dotClassName,
  className = "",
  pulse = false,
}: {
  label: string;
  dotClassName: string;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider select-none ${className}`}
    >
      <span className="relative flex h-2 w-2 items-center justify-center">
        {pulse && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dotClassName}`} />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dotClassName}`} aria-hidden="true" />
      </span>
      <span>{label}</span>
    </span>
  );
}

export function RiskBadge({ level }: { level: RiskLevel | null | undefined }) {
  if (!level) {
    return (
      <Badge
        label="Unscored"
        dotClassName="bg-slate-400"
        className="border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]"
      />
    );
  }
  const map: Record<RiskLevel, { label: string; dot: string; style: string }> = {
    LOW: {
      label: "Low risk",
      dot: "bg-emerald-500",
      style: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
    MEDIUM: {
      label: "Medium risk",
      dot: "bg-amber-500",
      style: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    },
    HIGH: {
      label: "High risk",
      dot: "bg-rose-500",
      style: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    },
  };
  const m = map[level];
  return <Badge label={m.label} dotClassName={m.dot} className={m.style} />;
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const map: Record<RequestStatus, { label: string; dot: string; style: string; pulse: boolean }> = {
    PENDING: {
      label: "Pending",
      dot: "bg-sky-500",
      style: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      pulse: true,
    },
    VERIFIED: {
      label: "Verified · Unlocked",
      dot: "bg-emerald-500",
      style: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      pulse: false,
    },
    "STAYS-PAUSED": {
      label: "Action Paused",
      dot: "bg-amber-500",
      style: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      pulse: true,
    },
    "TIMED-OUT": {
      label: "Timed Out · Locked",
      dot: "bg-slate-400",
      style: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
      pulse: false,
    },
    "MANUAL-OVERRIDE": {
      label: "Manual Override",
      dot: "bg-purple-500",
      style: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
      pulse: false,
    },
  };
  const m = map[status];
  return <Badge label={m.label} dotClassName={m.dot} className={m.style} pulse={m.pulse} />;
}

export function VerificationStatusBadge({ status }: { status: VerificationStatus }) {
  const map: Record<VerificationStatus, { label: string; dot: string; style: string; pulse: boolean }> = {
    PENDING: {
      label: "Awaiting Response",
      dot: "bg-sky-500",
      style: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      pulse: true,
    },
    CONFIRMED: {
      label: "Confirmed Genuine",
      dot: "bg-emerald-500",
      style: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      pulse: false,
    },
    REJECTED: {
      label: "Rejected (Fake)",
      dot: "bg-rose-500",
      style: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      pulse: false,
    },
    TIMED_OUT: {
      label: "Timed Out",
      dot: "bg-slate-400",
      style: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
      pulse: false,
    },
  };
  const m = map[status];
  return <Badge label={m.label} dotClassName={m.dot} className={m.style} pulse={m.pulse} />;
}
