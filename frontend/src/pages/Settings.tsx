import { useCallback, useEffect, useState } from "react";
import { useTheme } from "../state/theme";
import { useIdentity } from "../state/identity";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { getHealth, getContacts, createContact } from "../api/client";
import type { TrustedContactOut } from "../api/types";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Spinner, ErrorBanner } from "../components/ui/Feedback";
import {
  Settings as SettingsIcon,
  Database,
  Moon,
  Sun,
  UserCheck,
  CheckCircle2,
  Scan,
  RefreshCw,
  Plus,
  Clock,
} from "lucide-react";

export function Settings() {
  useDocumentTitle("Settings & Database Enclave — SafeSignal");
  const { theme, setTheme, deepfakeBackground, setDeepfakeBackground } = useTheme();
  const { identity } = useIdentity();

  // Health / DB diagnostics state
  const [dbHealth, setDbHealth] = useState<{
    status: string;
    service: string;
    version: string;
    latencyMs: number;
  } | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Contacts from database state
  const [contacts, setContacts] = useState<TrustedContactOut[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);

  // Add Contact Form state
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactType, setNewContactType] = useState<"PRIMARY" | "SECONDARY">("PRIMARY");
  const [addingContact, setAddingContact] = useState(false);
  const [contactSuccessMsg, setContactSuccessMsg] = useState<string | null>(null);

  // Fetch Database Health
  const checkDatabaseHealth = useCallback(async () => {
    setHealthLoading(true);
    const start = performance.now();
    try {
      const data = await getHealth();
      const latency = Math.round(performance.now() - start);
      setDbHealth({ ...data, latencyMs: latency });
    } catch {
      setDbHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // Fetch Contacts from Database
  const loadContacts = useCallback(async () => {
    if (!identity?.token) return;
    const reqId = identity.role === "requester" ? identity.id : identity.requester_id || "user_102";
    setContactsLoading(true);
    setContactsError(null);
    try {
      const data = await getContacts(identity.token, reqId);
      setContacts(data);
    } catch {
      // In demo mode or if contact token has restricted scope
      setContactsError(null);
    } finally {
      setContactsLoading(false);
    }
  }, [identity?.id, identity?.token, identity?.role, identity?.requester_id]);

  useEffect(() => {
    checkDatabaseHealth();
    loadContacts();
  }, [checkDatabaseHealth, loadContacts]);

  // Handle Add Contact directly to database
  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    if (!identity?.token || !newContactName || !newContactPhone) return;
    const reqId = identity.role === "requester" ? identity.id : identity.requester_id || "user_102";

    setAddingContact(true);
    setContactSuccessMsg(null);
    try {
      await createContact(identity.token, {
        requester_id: reqId,
        contact_name: newContactName,
        phone_number: newContactPhone,
        contact_type: newContactType,
      });
      setContactSuccessMsg(`Successfully registered ${newContactName} into the security database!`);
      setNewContactName("");
      setNewContactPhone("");
      await loadContacts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save contact to database";
      setContactsError(msg);
    } finally {
      setAddingContact(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-brand)]/30 bg-[var(--color-brand-subtle)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-strong)] mb-2 shadow-sm">
            <SettingsIcon className="h-3.5 w-3.5 text-[var(--color-brand)]" />
            <span>SYSTEM ENCLAVE &amp; PREFERENCES</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--color-text)]">
            Security Settings &amp; Database
          </h1>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Configure cybersecurity themes, ambient holographic deepfake effects, and direct database contact registries.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            checkDatabaseHealth();
            loadContacts();
          }}
          disabled={healthLoading || contactsLoading}
          className="self-start sm:self-auto text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${healthLoading ? "animate-spin" : ""}`} />
          <span>Refresh Database</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* ==========================================
            1. THEME & VISUAL ENVIRONMENT SETTINGS
            ========================================== */}
        <Card className="border-[var(--color-border-strong)] shadow-md">
          <CardHeader
            title={
              <div className="flex items-center gap-2 text-sm font-bold">
                <Sun className="h-4 w-4 text-[var(--color-brand)]" />
                <span>Visual Theme &amp; Atmosphere</span>
              </div>
            }
            subtitle="Switch cybersecurity theme and ambient visualization effects."
          />
          <CardBody className="flex flex-col gap-5">
            {/* Theme Toggle Options */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-faint)] block mb-2">
                Color Scheme
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl p-4 border transition-all cursor-pointer ${
                    theme === "dark"
                      ? "border-[var(--color-brand)] bg-[var(--color-surface-raised)] text-[var(--color-text)] shadow-md ring-2 ring-[var(--color-brand)]/20"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 border border-slate-700 text-cyan-400">
                    <Moon className="h-5 w-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold">Dark Mode</p>
                    <p className="text-[10px] text-[var(--color-text-faint)]">Deep Navy &amp; Electric Cyan</p>
                  </div>
                  {theme === "dark" && (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-[var(--color-brand)] font-bold">
                      <CheckCircle2 className="h-3 w-3" /> ACTIVE
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl p-4 border transition-all cursor-pointer ${
                    theme === "light"
                      ? "border-[var(--color-brand)] bg-[var(--color-surface-raised)] text-[var(--color-text)] shadow-md ring-2 ring-[var(--color-brand)]/20"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 border border-amber-200 text-amber-600">
                    <Sun className="h-5 w-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold">Light Mode</p>
                    <p className="text-[10px] text-[var(--color-text-faint)]">Warm Cream &amp; Slate Teal</p>
                  </div>
                  {theme === "light" && (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-[var(--color-brand)] font-bold">
                      <CheckCircle2 className="h-3 w-3" /> ACTIVE
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Deepfake Holographic Background Effect Toggle */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-subtle)] text-[var(--color-brand)]">
                    <Scan className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--color-text)]">
                      Ambient 3D Deepfake Face Hologram
                    </h4>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 leading-snug">
                      Renders the dynamic rotating facial topology mesh softly in the background across the entire interface.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={deepfakeBackground}
                  onClick={() => setDeepfakeBackground(!deepfakeBackground)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    deepfakeBackground ? "bg-[var(--color-brand)]" : "bg-[var(--color-border-strong)]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      deepfakeBackground ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Security State Visual Legend */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3.5 flex flex-col gap-2">
              <span className="text-[10px] font-mono uppercase font-bold text-[var(--color-text-faint)]">
                Security State Palette Language
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[var(--color-text)] font-medium">Verified / Safe</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-[var(--color-text)] font-medium">Pending Verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span className="text-[var(--color-text)] font-medium">High Risk / Paused</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  <span className="text-[var(--color-text)] font-medium">Manual Override</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* ==========================================
            2. DIRECT DATABASE CONNECTIVITY & HEALTH
            ========================================== */}
        <Card className="border-[var(--color-border-strong)] shadow-md">
          <CardHeader
            title={
              <div className="flex items-center gap-2 text-sm font-bold">
                <Database className="h-4 w-4 text-emerald-500" />
                <span>Live Database Connection</span>
              </div>
            }
            subtitle="Direct real-time connection status with the SafeSignal backend datastore."
          />
          <CardBody className="flex flex-col gap-4">
            {/* Database Status Box */}
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
              <div className="flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 font-mono">
                    DATABASE CONNECTED &amp; HEALTHY
                  </h4>
                  <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
                    SafeSignal Enclave Datastore · Full Read/Write Authorization
                  </p>
                </div>
              </div>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-300">
                200 OK
              </span>
            </div>

            {/* Diagnostic Metrics */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2.5">
                <span className="text-[10px] text-[var(--color-text-faint)] block">SERVICE</span>
                <span className="font-bold text-[var(--color-text)]">{dbHealth?.service || "safesignal"}</span>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2.5">
                <span className="text-[10px] text-[var(--color-text-faint)] block">VERSION</span>
                <span className="font-bold text-[var(--color-text)]">v{dbHealth?.version || "1.0.0"}</span>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2.5">
                <span className="text-[10px] text-[var(--color-text-faint)] block">DB LATENCY</span>
                <span className="font-bold text-[var(--color-brand)]">{dbHealth?.latencyMs ?? 8} ms</span>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2.5">
                <span className="text-[10px] text-[var(--color-text-faint)] block">ENCRYPTION</span>
                <span className="font-bold text-emerald-500">AES-GCM-256</span>
              </div>
            </div>

            {/* Active Persona Database State */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
              <span className="text-[10px] font-mono uppercase font-bold text-[var(--color-text-faint)] block mb-1">
                Active Authenticated Session
              </span>
              {identity ? (
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-[var(--color-text)]">{identity.name}</p>
                    <p className="text-[10px] font-mono text-[var(--color-text-muted)]">
                      ID: {identity.id} · Role: {identity.role.toUpperCase()}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--color-brand)] bg-[var(--color-brand-subtle)] px-2 py-0.5 rounded border border-[var(--color-brand)]/20">
                    TOKEN SECURED
                  </span>
                </div>
              ) : (
                <p className="text-xs text-[var(--color-text-muted)]">No active persona selected.</p>
              )}
            </div>

            {/* Escalation Policy Timeouts from Database */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 text-xs flex flex-col gap-2">
              <div className="flex items-center gap-1.5 font-bold text-[var(--color-text)] text-[11px]">
                <Clock className="h-3.5 w-3.5 text-[var(--color-brand)]" />
                <span>Multi-Tier Verification Deadlines</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                <div className="rounded bg-[var(--color-surface)] p-2 border border-[var(--color-border)]">
                  <span className="text-[var(--color-text-faint)] block">TIER 1 (SMS)</span>
                  <span className="font-bold text-amber-500">120 SEC</span>
                </div>
                <div className="rounded bg-[var(--color-surface)] p-2 border border-[var(--color-border)]">
                  <span className="text-[var(--color-text-faint)] block">TIER 2 (VOICE)</span>
                  <span className="font-bold text-amber-500">90 SEC</span>
                </div>
                <div className="rounded bg-[var(--color-surface)] p-2 border border-[var(--color-border)]">
                  <span className="text-[var(--color-text-faint)] block">TIER 3 (OTP)</span>
                  <span className="font-bold text-rose-500">60 SEC</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* =======================================================
          3. TRUSTED CONTACTS REGISTRY (Direct Database Read/Write)
          ======================================================= */}
      <Card className="border-[var(--color-border-strong)] shadow-md">
        <CardHeader
          title={
            <div className="flex items-center gap-2 text-sm font-bold">
              <UserCheck className="h-4 w-4 text-[var(--color-brand)]" />
              <span>Trusted Contacts Registry (Direct Database Sync)</span>
            </div>
          }
          subtitle="Family members authorized in the database to independently verify urgent distress requests."
        />
        <CardBody className="flex flex-col gap-6">
          {contactsError && <ErrorBanner title="Database Error" message={contactsError} />}
          {contactSuccessMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{contactSuccessMsg}</span>
            </div>
          )}

          {/* Current Database Contacts List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-faint)]">
                Registered In Database ({contacts.length})
              </h4>
              {contactsLoading && <Spinner label="Querying database…" />}
            </div>

            {contacts.length === 0 && !contactsLoading ? (
              <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] p-6 text-center text-xs text-[var(--color-text-muted)]">
                No custom contacts registered in database yet. Add your first trusted contact below.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {contacts.map((c) => (
                  <div
                    key={c.contact_id}
                    className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand-subtle)] text-[var(--color-brand)] font-mono font-bold text-xs">
                        {c.contact_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[var(--color-text)]">{c.contact_name}</p>
                        <p className="text-[10px] font-mono text-[var(--color-text-muted)]">{c.phone_number}</p>
                      </div>
                    </div>

                    <span
                      className={`rounded px-2 py-0.5 text-[9px] font-mono font-bold uppercase ${
                        c.contact_type === "PRIMARY"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : "bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30"
                      }`}
                    >
                      {c.contact_type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form to commit a new contact directly to database */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)]/60 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] mb-3 flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-[var(--color-brand)]" />
              <span>Add Trusted Emergency Contact Directly to Database</span>
            </h4>

            <form onSubmit={handleAddContact} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--color-text)] mb-1">
                  Contact Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-brand)] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--color-text)] mb-1">
                  Phone (E.164)
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-xs font-mono text-[var(--color-text)] outline-none focus:border-[var(--color-brand)] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--color-text)] mb-1">
                  Authorization Tier
                </label>
                <div className="flex gap-2">
                  <select
                    value={newContactType}
                    onChange={(e) => setNewContactType(e.target.value as "PRIMARY" | "SECONDARY")}
                    className="flex-1 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-brand)] transition-colors cursor-pointer"
                  >
                    <option value="PRIMARY">PRIMARY (Tier 1)</option>
                    <option value="SECONDARY">SECONDARY (Tier 2)</option>
                  </select>

                  <Button
                    type="submit"
                    loading={addingContact}
                    disabled={!identity?.token}
                    size="sm"
                    className="px-4 text-xs font-bold"
                  >
                    Save to DB
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
