import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardBody } from "../components/ui/Card";
import { Spinner, ErrorBanner } from "../components/ui/Feedback";
import { getDemoIdentities } from "../api/client";
import type { DemoIdentity } from "../api/types";
import { describeError } from "../lib/errors";
import { useIdentity } from "../state/identity";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { FirebaseLoginPanel } from "../components/FirebaseLoginPanel";
import { AuthTransitionOverlay } from "../components/auth/AuthTransitionOverlay";
import { Shield, User, UserCheck, ArrowRight } from "lucide-react";

export function RolePicker() {
  useDocumentTitle("SafeSignal — Deepfake & Voice Scam Intercept");
  const [identities, setIdentities] = useState<DemoIdentity[] | null>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [pendingChoice, setPendingChoice] = useState<DemoIdentity | null>(null);
  const [transitionActive, setTransitionActive] = useState(false);

  const { setIdentity } = useIdentity();
  const navigate = useNavigate();

  useEffect(() => {
    getDemoIdentities()
      .then(setIdentities)
      .catch((e) => setError(describeError(e)));
  }, []);

  // When a test persona is clicked, run the 1.2s frontend transition before navigating
  function handleSelectPersona(identity: DemoIdentity) {
    setPendingChoice(identity);
    setTransitionActive(true);
  }

  function handleTransitionComplete() {
    if (!pendingChoice) return;
    setIdentity(pendingChoice);
    navigate(pendingChoice.role === "requester" ? "/requester" : "/contact");
  }

  const requesters = identities?.filter((i) => i.role === "requester") ?? [];
  const contacts = identities?.filter((i) => i.role === "contact") ?? [];

  return (
    <>
      <AuthTransitionOverlay
        active={transitionActive}
        targetRole={pendingChoice?.role ?? "requester"}
        onComplete={handleTransitionComplete}
      />

      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        {/* Top Hero Brand Header */}
        <div className="text-center relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-brand)]/30 bg-[var(--color-brand-subtle)] px-3.5 py-1 text-xs font-semibold text-[var(--color-brand-strong)] mb-3 shadow-sm">
            <Shield className="h-3.5 w-3.5 text-[var(--color-brand)] animate-pulse" />
            <span>REAL-TIME MULTIMODAL SCAM &amp; DEEPFAKE DEFENSE</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl text-[var(--color-text)]">
            SafeSignal Defense Enclave
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
            Protecting vulnerable family members against AI-synthesized voice scams, cloned distress calls, and high-urgency unauthorized transfers through automatic out-of-band contact verification.
          </p>
        </div>

        {/* 4-Step Protocol Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)]/80 p-3 shadow-sm">
          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 font-mono text-xs font-bold">
              1
            </div>
            <div>
              <p className="text-[11px] font-bold text-[var(--color-text)] uppercase tracking-wider">DETECT</p>
              <p className="text-[10px] text-[var(--color-text-muted)] leading-tight">Multimodal audio distress signals</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold">
              2
            </div>
            <div>
              <p className="text-[11px] font-bold text-[var(--color-text)] uppercase tracking-wider">PAUSE</p>
              <p className="text-[10px] text-[var(--color-text-muted)] leading-tight">Instant financial intercept</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 font-mono text-xs font-bold">
              3
            </div>
            <div>
              <p className="text-[11px] font-bold text-[var(--color-text)] uppercase tracking-wider">VERIFY</p>
              <p className="text-[10px] text-[var(--color-text-muted)] leading-tight">Independent contact escalation</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold">
              4
            </div>
            <div>
              <p className="text-[11px] font-bold text-[var(--color-text)] uppercase tracking-wider">DECIDE</p>
              <p className="text-[10px] text-[var(--color-text-muted)] leading-tight">Cryptographic release / fraud report</p>
            </div>
          </div>
        </div>

        {/* Two-Column Grid: Login & Sign Up Gate on Left, Verified Personas on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Column: Visual Login & Sign Up Form */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-brand)] font-bold">
                ENCLAVE AUTHENTICATION
              </span>
            </div>
            <FirebaseLoginPanel />
          </div>

          {/* Right Column: Instant Verified Test Personas */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-faint)] font-bold">
                SIMULATED FAMILY TEST PERSONAS
              </span>
            </div>

              {error && <ErrorBanner title={error.title} message={error.message} />}

              {!identities && !error && (
                <div className="flex justify-center py-4">
                  <Spinner label="Loading simulated test personas…" />
                </div>
              )}

              {identities && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Requesters Column */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 px-1">
                      <User className="h-3.5 w-3.5 text-amber-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                        Protected Requesters
                      </h3>
                    </div>

                    <div className="flex flex-col gap-2">
                      {requesters.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleSelectPersona(r)}
                          className="group text-left cursor-pointer transition-transform duration-150 hover:-translate-y-0.5"
                        >
                          <Card className="transition-all group-hover:border-amber-500/50 bg-[var(--color-surface)]/90">
                            <CardBody className="p-3 flex items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-xs font-mono">
                                  {r.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-xs text-[var(--color-text)] group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                                    {r.name}
                                  </p>
                                  <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                                    Target of urgent call / wallet
                                  </p>
                                </div>
                              </div>
                              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-faint)] group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                            </CardBody>
                          </Card>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Trusted Contacts Column */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 px-1">
                      <UserCheck className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                        Trusted Contacts
                      </h3>
                    </div>

                    <div className="flex flex-col gap-2">
                      {contacts.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectPersona(c)}
                          className="group text-left cursor-pointer transition-transform duration-150 hover:-translate-y-0.5"
                        >
                          <Card className="transition-all group-hover:border-teal-500/50 bg-[var(--color-surface)]/90">
                            <CardBody className="p-3 flex items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-700 dark:text-teal-300 font-bold text-xs font-mono">
                                  {c.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-xs text-[var(--color-text)] group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors truncate">
                                    {c.name}
                                  </p>
                                  <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                                    Independent authorizer
                                  </p>
                                </div>
                              </div>
                              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-faint)] group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all" />
                            </CardBody>
                          </Card>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
    </>
  );
}
