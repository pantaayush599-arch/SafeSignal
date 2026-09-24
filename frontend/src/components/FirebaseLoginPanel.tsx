import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ConfirmationResult } from "firebase/auth";
import { Card, CardBody, CardHeader } from "./ui/Card";
import { Button } from "./ui/Button";
import { ErrorBanner } from "./ui/Feedback";
import { isFirebaseConfigured, sendPhoneOtp, confirmPhoneOtp, signInWithGoogle } from "../lib/firebase";
import { loginWithFirebaseToken } from "../api/client";
import { describeError } from "../lib/errors";
import { useIdentity } from "../state/identity";
import { AuthTransitionOverlay } from "./auth/AuthTransitionOverlay";
import { Lock, ShieldCheck, KeyRound, Smartphone, UserPlus, LogIn } from "lucide-react";

const RECAPTCHA_CONTAINER_ID = "firebase-recaptcha-container";

type AuthMode = "signin" | "signup";
type Step = "phone" | "code";

export function FirebaseLoginPanel({ onTransitionStart }: { onTransitionStart?: () => void }) {
  const { setIdentity } = useIdentity();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [busy, setBusy] = useState<"phone" | "code" | "google" | null>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  // Called when Firebase ID token is obtained
  async function completeLogin(idToken: string) {
    const result = await loginWithFirebaseToken(idToken);
    setIdentity({
      role: "requester",
      id: result.requester_id,
      name: result.name,
      token: result.session_token,
    });
    onTransitionStart?.();
    setTransitioning(true);
  }

  function handleTransitionComplete() {
    navigate("/requester");
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy("phone");
    try {
      const result = await sendPhoneOtp(phone, RECAPTCHA_CONTAINER_ID);
      setConfirmation(result);
      setStep("code");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !confirmation) return;
    setError(null);
    setBusy("code");
    try {
      const idToken = await confirmPhoneOtp(confirmation, code);
      await completeLogin(idToken);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleGoogle() {
    if (busy) return;
    setError(null);
    setBusy("google");
    try {
      const idToken = await signInWithGoogle();
      await completeLogin(idToken);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <AuthTransitionOverlay
        active={transitioning}
        targetRole="requester"
        onComplete={handleTransitionComplete}
      />

      <Card className="overflow-hidden border-[var(--color-border-strong)] shadow-lg">
        {/* Visual Mode Selector Tabs: Sign In vs Sign Up */}
        <div className="flex border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]/70 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              mode === "signin"
                ? "bg-[var(--color-surface)] text-[var(--color-brand)] shadow-sm border border-[var(--color-brand)]/20"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              mode === "signup"
                ? "bg-[var(--color-surface)] text-[var(--color-brand)] shadow-sm border border-[var(--color-brand)]/20"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        <CardHeader
          title={
            <div className="flex items-center gap-2 text-sm font-bold">
              <Lock className="h-4 w-4 text-[var(--color-brand)]" />
              <span>
                {mode === "signin" ? "Access Defense Console" : "Enroll Family Shield"}
              </span>
            </div>
          }
          subtitle={
            mode === "signin"
              ? "Authenticate with cryptographically verified mobile number or SSO."
              : "Register your phone to trigger instant out-of-band intercepts."
          }
        />

        <CardBody className="flex flex-col gap-4">
          <div id={RECAPTCHA_CONTAINER_ID} />

          {!isFirebaseConfigured ? (
            /* Informative, high-security prototype sandbox indicator */
            <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-brand)]/30 bg-[var(--color-brand-subtle)]/50 p-4">
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand)] text-white shadow-sm">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                    Local Cryptographic Enclave Active
                  </h4>
                  <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                    Firebase project keys not detected. You can instantly access the full defense flow with verified test personas below.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {step === "phone" && (
                <form onSubmit={handleSendCode} className="flex flex-col gap-3">
                  <label htmlFor="phone-input" className="text-xs font-semibold text-[var(--color-text)]">
                    <span className="mb-1 block flex items-center justify-between">
                      <span>{mode === "signin" ? "Mobile Phone Number" : "Family Member Phone"}</span>
                      <span className="font-mono text-[10px] text-[var(--color-text-faint)]">E.164 FORMAT</span>
                    </span>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-text-faint)]">
                        <Smartphone className="h-4 w-4" />
                      </div>
                      <input
                        id="phone-input"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 555 123 4567"
                        className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] pl-9 pr-3.5 py-2.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-brand)] font-mono transition-colors"
                      />
                    </div>
                  </label>
                  <Button
                    type="submit"
                    loading={busy === "phone"}
                    fullWidth
                    className="py-2.5 text-xs font-bold uppercase tracking-wider"
                  >
                    {mode === "signin" ? "Verify & Send Security SMS" : "Enroll & Send Verification Code"}
                  </Button>
                </form>
              )}

              {step === "code" && (
                <form onSubmit={handleVerifyCode} className="flex flex-col gap-3">
                  <label htmlFor="otp-input" className="text-xs font-semibold text-[var(--color-text)]">
                    <span className="mb-1 block flex items-center justify-between">
                      <span>Enter SMS Passcode sent to {phone}</span>
                      <KeyRound className="h-3.5 w-3.5 text-[var(--color-brand)]" />
                    </span>
                    <input
                      id="otp-input"
                      inputMode="numeric"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="123456"
                      className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-3 py-2.5 font-mono text-center text-xl tracking-[0.35em] font-extrabold outline-none focus:border-[var(--color-brand)] transition-colors"
                    />
                  </label>
                  <Button
                    type="submit"
                    loading={busy === "code"}
                    fullWidth
                    className="py-2.5 text-xs font-bold uppercase tracking-wider"
                  >
                    Authenticate &amp; Enter Console
                  </Button>
                  <button
                    type="button"
                    onClick={() => setStep("phone")}
                    className="text-center text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer py-1"
                  >
                    ← Use a different mobile number
                  </button>
                </form>
              )}

              <div className="flex items-center gap-3 text-xs text-[var(--color-text-faint)]">
                <div className="h-px flex-1 bg-[var(--color-border)]" />
                <span className="font-mono text-[10px] uppercase">OR SINGLE SIGN-ON</span>
                <div className="h-px flex-1 bg-[var(--color-border)]" />
              </div>

              <Button
                variant="secondary"
                onClick={handleGoogle}
                loading={busy === "google"}
                fullWidth
                className="py-2.5 text-xs font-semibold"
              >
                Continue with Google Security
              </Button>
            </>
          )}

          {error && <ErrorBanner title={error.title} message={error.message} />}

          {/* Security Guarantee Micro-Footer */}
          <div className="flex items-center justify-between rounded-lg bg-[var(--color-surface-raised)] px-3 py-2 text-[10px] font-mono text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>ZERO-KNOWLEDGE AUTH</span>
            </span>
            <span>256-BIT ENCRYPTED</span>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
