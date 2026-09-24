import { useState } from "react";
import { Card, CardHeader, CardBody } from "./ui/Card";
import { VerificationStatusBadge } from "./ui/Badge";
import { Countdown } from "./ui/Countdown";
import { Button } from "./ui/Button";
import { ErrorBanner, SuccessBanner } from "./ui/Feedback";
import { describeError } from "../lib/errors";
import { submitTier3 } from "../api/client";
import type { RequestStateOut, VerificationSummary } from "../api/types";
import { ShieldCheck, PhoneForwarded, KeyRound } from "lucide-react";

const TIER_META: Record<number, { title: string; description: string; Icon: typeof ShieldCheck }> = {
  1: {
    title: "Tier 1 — Primary Trusted Contact",
    description: "Instant push/SMS verification dispatched to your pre-registered family contact.",
    Icon: ShieldCheck,
  },
  2: {
    title: "Tier 2 — Secondary Escalation",
    description: "Backup family contact or direct known-number verification callback.",
    Icon: PhoneForwarded,
  },
  3: {
    title: "Tier 3 — Rotating Secret Passphrase",
    description: "Fail-safe cryptographic challenge: single-use code relayed over out-of-band channel.",
    Icon: KeyRound,
  },
};

function TierRow({ v, _isLast }: { v: VerificationSummary; _isLast: boolean }) {
  const meta = TIER_META[v.tier] ?? {
    title: `Tier ${v.tier}`,
    description: "",
    Icon: ShieldCheck,
  };
  const Icon = meta.Icon;

  const isPending = v.status === "PENDING";
  const isConfirmed = v.status === "CONFIRMED";
  const isRejected = v.status === "REJECTED";

  return (
    <div className="relative flex items-start gap-3.5 py-3.5">
      {/* Step icon */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
          isConfirmed
            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            : isRejected
            ? "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300"
            : isPending
            ? "border-[var(--color-brand)]/50 bg-[var(--color-brand-subtle)] text-[var(--color-brand)] shadow-sm animate-pulse-subtle"
            : "border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] text-[var(--color-text-faint)]"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <p className="text-xs font-bold text-[var(--color-text)] tracking-tight">{meta.title}</p>
          <div className="flex shrink-0 items-center gap-2">
            {isPending && <Countdown expiresAt={v.expires_at} />}
            <VerificationStatusBadge status={v.status} />
          </div>
        </div>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)] leading-relaxed">{meta.description}</p>
      </div>
    </div>
  );
}

export function VerificationProgress({
  state,
  token,
  onChanged,
}: {
  state: RequestStateOut;
  token: string;
  onChanged: () => void;
}) {
  const tier3 = state.verifications.find((v) => v.tier === 3 && v.status === "PENDING");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

  async function handleSubmitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!tier3 || submitting) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await submitTier3(token, tier3.verification_id, code.trim());
      if (result.status === "CONFIRMED") {
        setSuccess("Code confirmed — action unlocked.");
        setCode("");
        onChanged();
      } else {
        setAttemptsLeft(result.attempts_remaining ?? null);
        setError({
          title: "Incorrect code",
          message:
            result.attempts_remaining && result.attempts_remaining > 0
              ? `That code didn't match. ${result.attempts_remaining} attempt${result.attempts_remaining === 1 ? "" : "s"} remaining.`
              : "That code didn't match and no attempts remain. The request has timed out.",
        });
        onChanged();
      }
    } catch (err) {
      setError(describeError(err));
      onChanged();
    } finally {
      setSubmitting(false);
    }
  }

  if (state.verifications.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--color-brand)]" />
            <span>Independent Verification Protocol</span>
          </div>
        }
        subtitle="Independent verification required on a channel the caller does not control."
      />
      <CardBody className="pt-2">
        <div className="divide-y divide-[var(--color-border)]">
          {state.verifications.map((v, i) => (
            <TierRow key={v.verification_id} v={v} _isLast={i === state.verifications.length - 1} />
          ))}
        </div>

        {tier3 && (
          <div className="mt-4 rounded-xl border border-[var(--color-brand)]/30 bg-[var(--color-surface-raised)] p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-brand)] mb-1">
              <KeyRound className="h-4 w-4" />
              <span>Tier 3 Rotating Code Required</span>
            </div>
            <p className="mb-3 text-xs text-[var(--color-text-muted)] leading-relaxed">
              Your trusted contact has a single-use verification code for this request. Call them directly on their known phone number, get the 6-digit code, and enter it below.
              {attemptsLeft !== null && ` ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining.`}
            </p>
            <form onSubmit={handleSubmitCode} className="flex flex-col gap-3 sm:flex-row">
              <label htmlFor="tier3-code" className="sr-only">
                One-time code
              </label>
              <input
                id="tier3-code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="min-w-0 flex-1 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2.5 font-mono text-center text-xl font-black tracking-[0.4em] outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-all placeholder:text-[var(--color-text-faint)]"
              />
              <Button type="submit" loading={submitting} disabled={code.length !== 6}>
                Verify Code
              </Button>
            </form>
            {success && (
              <div className="mt-3">
                <SuccessBanner message={success} />
              </div>
            )}
            {error && (
              <div className="mt-3">
                <ErrorBanner title={error.title} message={error.message} />
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
