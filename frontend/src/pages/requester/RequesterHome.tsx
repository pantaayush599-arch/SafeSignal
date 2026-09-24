import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ErrorBanner } from "../../components/ui/Feedback";
import { useIdentity } from "../../state/identity";
import { analyzeRequest } from "../../api/client";
import { ApiError } from "../../api/types";
import { describeError } from "../../lib/errors";
import { AudioValidationError, fileToBase64, validateAudioFile } from "../../lib/audio";
import { recordRequestId } from "./RequestHistory";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { RELATIONS } from "../../lib/relations";
import {
  FileText,
  Mic,
  ShieldAlert,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";

type Channel = "voice_call" | "video_call" | "text";
type InputMode = "TEXT" | "AUDIO";

const SCENARIOS = [
  {
    label: "High-Risk: “Dad, I've been arrested”",
    badge: "CRITICAL THREAT",
    badgeColor: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    channel: "voice_call" as Channel,
    claimed_identity: "son",
    amount: "80000",
    text: "Dad, I've been arrested. Send ₹80,000 right now. Please don't tell anyone.",
  },
  {
    label: "Low-Risk: Everyday Message",
    badge: "BENIGN",
    badgeColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    channel: "text" as Channel,
    claimed_identity: "friend",
    amount: "",
    text: "Hey, are we still on for lunch tomorrow at 1pm?",
  },
];

type AudioState =
  | { kind: "none" }
  | { kind: "validating"; name: string }
  | { kind: "invalid"; name: string; message: string }
  | { kind: "ready"; name: string; sizeLabel: string };

export function RequesterHome() {
  useDocumentTitle("Simulate Request — SafeSignal");
  const { identity } = useIdentity();
  const navigate = useNavigate();

  const [inputMode, setInputMode] = useState<InputMode>("TEXT");
  const [text, setText] = useState("");
  const [channel, setChannel] = useState<Channel>("voice_call");
  const [claimedIdentity, setClaimedIdentity] = useState("");
  const [amount, setAmount] = useState("");
  const [deepfakeScore, setDeepfakeScore] = useState(0);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioState, setAudioState] = useState<AudioState>({ kind: "none" });
  const [submitting, setSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState<string>("");
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!identity || identity.role !== "requester") {
    return (
      <ErrorBanner
        title="No requester persona selected"
        message="Go to the home page and pick the requester persona to simulate an incoming request."
      />
    );
  }
  const requester = identity;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setAudioFile(null);
      setAudioState({ kind: "none" });
      return;
    }
    setAudioState({ kind: "validating", name: file.name });
    try {
      await validateAudioFile(file);
      setAudioFile(file);
      setAudioState({ kind: "ready", name: file.name, sizeLabel: `${(file.size / 1024).toFixed(0)} KB` });
    } catch (err) {
      setAudioFile(null);
      const message = err instanceof AudioValidationError ? err.message : "Could not validate this audio file.";
      setAudioState({ kind: "invalid", name: file.name, message });
    }
  }

  function fillScenario(s: (typeof SCENARIOS)[number]) {
    setInputMode("TEXT");
    setText(s.text);
    setChannel(s.channel);
    setClaimedIdentity(s.claimed_identity);
    setAmount(s.amount);
    setAudioFile(null);
    setAudioState({ kind: "none" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (inputMode === "TEXT" && !text.trim()) {
      setError({ title: "Missing transcript", message: "Enter the message or call transcript to analyze." });
      return;
    }

    if (inputMode === "AUDIO" && !audioFile) {
      setError({ title: "Missing audio recording", message: "Upload an audio recording to analyze, or switch to Text mode." });
      return;
    }

    const numericAmount = amount.trim() ? Number(amount) : undefined;
    if (numericAmount !== undefined && (Number.isNaN(numericAmount) || numericAmount < 0)) {
      setError({ title: "Invalid amount", message: "Amount must be a positive number or left blank." });
      return;
    }

    setSubmitting(true);
    setSubmitStage("Encoding payload…");

    try {
      let audioBase64: string | undefined;
      let audioMimeType: string | undefined;

      if (inputMode === "AUDIO" && audioFile) {
        setSubmitStage("Converting audio to base64…");
        audioBase64 = await fileToBase64(audioFile);
        audioMimeType = audioFile.type || "audio/wav";
      }

      setSubmitStage("Running multi-signal analysis…");
      const res = await analyzeRequest(requester.token, {
        requester_id: requester.id,
        raw_text: inputMode === "TEXT" ? text : undefined,
        audio_base64: audioBase64,
        audio_mime_type: audioMimeType,
        channel,
        claimed_identity: claimedIdentity || undefined,
        requested_amount: numericAmount,
        deepfake_signal_score: deepfakeScore > 0 ? deepfakeScore : undefined,
      });

      recordRequestId(requester.id, res.request_id);
      navigate(`/requester/requests/${res.request_id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError({
          title: "Session Expired",
          message: "Your session token has expired or is invalid. Please re-select your persona.",
        });
      } else {
        setError(describeError(err));
      }
    } finally {
      setSubmitting(false);
      setSubmitStage("");
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="flex h-2 w-2 rounded-full bg-[var(--color-brand)]" />
          <p className="text-xs font-mono uppercase tracking-wider text-[var(--color-brand)] font-bold">
            Simulate Incoming Threat
          </p>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl text-[var(--color-text)]">
          Threat Interception Simulator
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
          Simulate a high-stress call or text to experience SafeSignal&apos;s multimodal risk analysis, automated action pausing, and trusted contact verification escalation.
        </p>
      </div>

      {/* Quick Scenario Fill Buttons */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          <span>Quick Preset Scenarios</span>
        </span>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => fillScenario(s)}
              className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-3 text-left transition-all hover:border-[var(--color-brand)]/50 hover:bg-[var(--color-surface-raised)] cursor-pointer shadow-sm"
            >
              <div className="min-w-0 pr-2">
                <span className="block text-xs font-bold text-[var(--color-text)] truncate">{s.label}</span>
                <span className="block text-[11px] text-[var(--color-text-muted)] truncate">{s.text}</span>
              </div>
              <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase border ${s.badgeColor}`}>
                {s.badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Analysis Card */}
      <Card className="overflow-hidden">
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[var(--color-brand)]" />
              <span>Communication &amp; Transaction Parameters</span>
            </div>
          }
          subtitle="Direct payload input evaluated by SafeSignal's multi-signal risk engine."
        />
        <CardBody>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Input Mode Tabs */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Input Type
              </label>
              <div
                className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-1"
                role="tablist"
                aria-label="Input type"
              >
                {(["TEXT", "AUDIO"] as InputMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={inputMode === mode}
                    onClick={() => setInputMode(mode)}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      inputMode === mode
                        ? "bg-[var(--color-brand)] text-white shadow-sm font-bold"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    {mode === "TEXT" ? (
                      <>
                        <FileText className="h-3.5 w-3.5" />
                        <span>Text / Transcript</span>
                      </>
                    ) : (
                      <>
                        <Mic className="h-3.5 w-3.5" />
                        <span>Speech Audio (STT)</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Transcript or Audio Upload */}
            {inputMode === "TEXT" ? (
              <div>
                <label htmlFor="transcript" className="mb-1.5 block text-xs font-semibold text-[var(--color-text)]">
                  Message or Call Transcript
                </label>
                <textarea
                  id="transcript"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-3.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-brand)] placeholder:text-[var(--color-text-faint)] leading-relaxed"
                  placeholder="e.g. Dad, I've been arrested. Send ₹80,000 right now. Don't tell mom..."
                />
              </div>
            ) : (
              <div>
                <label htmlFor="audio-upload" className="mb-1.5 block text-xs font-semibold text-[var(--color-text)]">
                  Audio Speech Recording
                </label>
                <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-raised)]/60 p-4 text-center">
                  <UploadCloud className="mx-auto h-8 w-8 text-[var(--color-brand)] mb-2 opacity-80" />
                  <input
                    ref={fileInputRef}
                    id="audio-upload"
                    type="file"
                    accept=".wav,.mp3,.webm,audio/wav,audio/mpeg,audio/webm"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-[var(--color-text-muted)] file:mr-3 file:rounded-lg file:border file:border-[var(--color-border-strong)] file:bg-[var(--color-surface)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--color-brand)] hover:file:bg-[var(--color-surface-overlay)] cursor-pointer"
                  />
                  <p className="mt-2 text-[11px] text-[var(--color-text-faint)] font-mono">
                    WAV, MP3, or WebM · max 5 MB · max 60 seconds
                  </p>
                </div>

                <div className="mt-2 min-h-5 text-xs">
                  {audioState.kind === "validating" && (
                    <span className="text-[var(--color-text-muted)]">Verifying audio format for {audioState.name}…</span>
                  )}
                  {audioState.kind === "invalid" && (
                    <span className="flex items-center gap-1.5 text-rose-500 font-medium">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {audioState.message}
                    </span>
                  )}
                  {audioState.kind === "ready" && (
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Ready: {audioState.name} ({audioState.sizeLabel})
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Grid of parameters */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-[var(--color-border)]">
              <div>
                <label htmlFor="channel" className="mb-1.5 block text-xs font-semibold text-[var(--color-text)]">
                  Communication Channel
                </label>
                <select
                  id="channel"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as Channel)}
                  className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-3 py-2 text-xs font-medium text-[var(--color-text)] outline-none focus:border-[var(--color-brand)]"
                >
                  <option value="voice_call">Voice call (Cellular / VoIP)</option>
                  <option value="video_call">Video call</option>
                  <option value="text">Instant message / SMS</option>
                </select>
              </div>

              <div>
                <label htmlFor="claimed" className="mb-1.5 block text-xs font-semibold text-[var(--color-text)]">
                  Claimed Identity / Relation
                </label>
                <select
                  id="claimed"
                  value={claimedIdentity}
                  onChange={(e) => setClaimedIdentity(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-3 py-2 text-xs font-medium text-[var(--color-text)] outline-none focus:border-[var(--color-brand)]"
                >
                  <option value="">Not stated / Unknown</option>
                  {RELATIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="amount" className="mb-1.5 block text-xs font-semibold text-[var(--color-text)]">
                  Requested Amount (₹, optional)
                </label>
                <input
                  id="amount"
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="80000"
                  className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-3 py-2 text-xs font-mono font-bold text-[var(--color-text)] outline-none focus:border-[var(--color-brand)]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="deepfake" className="text-xs font-semibold text-[var(--color-text)]">
                    Deepfake Signal Score
                  </label>
                  <span className="font-mono text-xs font-bold text-[var(--color-brand)]">
                    {deepfakeScore.toFixed(2)}
                  </span>
                </div>
                <input
                  id="deepfake"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={deepfakeScore}
                  onChange={(e) => setDeepfakeScore(Number(e.target.value))}
                  className="w-full accent-[var(--color-brand)] cursor-pointer"
                />
                <p className="mt-1 text-[10px] text-[var(--color-text-faint)]">
                  Advisory synthetic voice likelihood (never sole pause trigger).
                </p>
              </div>
            </div>

            {error && <ErrorBanner title={error.title} message={error.message} />}

            <Button type="submit" loading={submitting} fullWidth>
              {submitting ? submitStage || "Analyzing with SafeSignal…" : "Run Security Analysis & Evaluate Threat"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
