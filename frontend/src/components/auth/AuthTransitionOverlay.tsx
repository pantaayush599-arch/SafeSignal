import { useEffect, useState } from "react";
import { ShieldCheck, Lock, Activity, CheckCircle2 } from "lucide-react";

interface AuthTransitionOverlayProps {
  active: boolean;
  onComplete: () => void;
  targetRole?: "requester" | "contact";
}

export function AuthTransitionOverlay({
  active,
  onComplete,
  targetRole = "requester",
}: AuthTransitionOverlayProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    if (!active) return;

    // Step 2: Verifying protection... (420ms -> 880ms)
    const t1 = setTimeout(() => {
      setStep(2);
      setProgress(72);
    }, 420);

    // Step 3: Loading SafeSignal... (880ms -> 1300ms)
    const t2 = setTimeout(() => {
      setStep(3);
      setProgress(100);
    }, 880);

    // Complete transition
    const t3 = setTimeout(() => {
      onComplete();
    }, 1320);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Securing authentication session"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg)]/85 backdrop-blur-md transition-opacity duration-300"
    >
      <div className="relative mx-auto flex w-full max-w-sm flex-col items-center rounded-2xl border border-[var(--color-brand)]/40 bg-[var(--color-surface)] p-6 text-center shadow-2xl">
        {/* Animated Cyber Shield Enclave Icon */}
        <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
          {/* Outer rotating pulse ring */}
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-dashed border-[var(--color-brand)]/40 [animation-duration:6s]" />
          {/* Middle pulsing glow */}
          <div className="absolute inset-1 animate-pulse rounded-full bg-[var(--color-brand-subtle)]" />
          {/* Inner Icon */}
          <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-brand)] text-white shadow-lg">
            {step === 3 ? (
              <CheckCircle2 className="h-6 w-6 animate-bounce" />
            ) : step === 2 ? (
              <ShieldCheck className="h-6 w-6" />
            ) : (
              <Lock className="h-5 w-5" />
            )}
          </div>
        </div>

        {/* Dynamic Transition Messaging */}
        <h3 className="font-mono text-base font-extrabold tracking-tight text-[var(--color-text)]">
          {step === 1 && "Securing connection..."}
          {step === 2 && "Verifying protection..."}
          {step === 3 && "Loading SafeSignal..."}
        </h3>

        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {step === 1 && "Establishing isolated cryptographic enclave"}
          {step === 2 && "Validating family multi-tier defense protocols"}
          {step === 3 && `Launching ${targetRole === "requester" ? "Emergency Threat Simulator" : "Verification Console"}`}
        </p>

        {/* Telemetry Progress Bar */}
        <div className="mt-5 w-full">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-brand)] to-teal-400 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-[var(--color-text-faint)]">
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3 text-[var(--color-brand)]" />
              <span>TLS 1.3 / E2EE</span>
            </span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
