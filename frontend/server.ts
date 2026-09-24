import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import http from "http";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { WebSocketServer, WebSocket } from "ws";

// --- Types & Interfaces ---
export type InputType = "TEXT" | "AUDIO";
export type Channel = "voice_call" | "video_call" | "text";
export type ActionType = "wallet_transfer" | "otp_share" | "other";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type Decision = "ALLOW" | "PAUSE" | "BLOCK" | "REVIEW";
export type RequestStatus = "PENDING" | "VERIFIED" | "STAYS-PAUSED" | "TIMED-OUT" | "MANUAL-OVERRIDE";
export type VerificationStatus = "PENDING" | "CONFIRMED" | "REJECTED" | "TIMED_OUT";

export interface RequesterModel {
  requester_id: string;
  name: string;
  auth_token: string;
  auth_provider?: string;
  phone_number?: string | null;
  email?: string | null;
}

export interface TrustedContactModel {
  contact_id: string;
  requester_id: string;
  contact_name: string;
  phone_number: string;
  contact_type: "PRIMARY" | "SECONDARY";
  auth_token: string;
}

export interface VerificationModel {
  verification_id: string;
  request_id: string;
  tier: number;
  status: VerificationStatus;
  trusted_contact_id?: string | null;
  secondary_contact_id?: string | null;
  escalation_reason?: string | null;
  callback_number?: string | null;
  code_hash?: string | null;
  code_salt?: string | null;
  demo_code?: string | null;
  attempts_remaining?: number | null;
  sent_at: string;
  expires_at: string;
  responded_at?: string | null;
}

export interface AuditEventModel {
  event: string;
  timestamp: string;
  details: Record<string, unknown>;
}

export interface RequestModel {
  request_id: string;
  requester_id: string;
  action_type?: string;
  channel?: string;
  claimed_identity?: string;
  input_type: string;
  amount?: number;
  deepfake_signal_score?: number;
  transcript_or_text?: string;
  risk_score?: number;
  risk_level?: RiskLevel;
  decision?: Decision;
  reason_codes: string[];
  verification_required: boolean;
  request_status: RequestStatus;
  current_tier?: number | null;
  override_reason?: string | null;
  override_at?: string | null;
  created_at: string;
  triggered_by_panic?: boolean;
  audit_events: AuditEventModel[];
}

// --- In-Memory Stores ---
const requesters = new Map<string, RequesterModel>();
const contacts = new Map<string, TrustedContactModel>();
const requests = new Map<string, RequestModel>();
const verifications = new Map<string, VerificationModel>();

// --- Seed Demo Data ---
function seedData() {
  const req102: RequesterModel = {
    requester_id: "user_102",
    name: "Aarav Sharma",
    auth_token: "demo-requester-token-user102",
  };
  requesters.set(req102.requester_id, req102);

  const contact101: TrustedContactModel = {
    contact_id: "contact_101",
    requester_id: "user_102",
    contact_name: "Priya Sharma (Mom)",
    phone_number: "+919876500101",
    contact_type: "PRIMARY",
    auth_token: "demo-contact-token-contact101",
  };
  const contact202: TrustedContactModel = {
    contact_id: "contact_202",
    requester_id: "user_102",
    contact_name: "Rohan Sharma (Uncle)",
    phone_number: "+919876500202",
    contact_type: "SECONDARY",
    auth_token: "demo-contact-token-contact202",
  };
  contacts.set(contact101.contact_id, contact101);
  contacts.set(contact202.contact_id, contact202);
}
seedData();

// --- Risk Engine Rules ---
const SIGNAL_RULES: Array<{ code: string; patterns: RegExp[]; weight: number }> = [
  {
    code: "money_request",
    patterns: [
      /\bsend\b.*\b(money|rs\.?|rupees|inr|₹|cash)\b/i,
      /\btransfer\b.*\b(money|amount|funds?)\b/i,
      /\b(rs\.?|inr|₹)\s?\d/i,
      /\bpay\b.*\bnow\b/i,
      /\bneed\b.*\bmoney\b/i,
      /\bsend\b.{0,15}\d/i,
      /पैसे?\s*भेज/i,
      /रुपय[ेा]\s*भेज/i,
      /पैसा\s*चाहिए/i,
      /paise\s*bhej/i,
      /rupa?y?e?\s*bhej/i,
      /paisa\s*chahiye/i,
    ],
    weight: 27,
  },
  {
    code: "credential_otp_request",
    patterns: [
      /\botp\b/i,
      /\bone[- ]time password\b/i,
      /\bpin\b/i,
      /\bcvv\b/i,
      /\bpassword\b/i,
      /\bverification code\b/i,
      /\bshare.*code\b/i,
      /ओटीपी/i,
      /पिन\s*बताओ/i,
      /कोड\s*बताओ/i,
      /otp\s*batao/i,
      /pin\s*batao/i,
      /code\s*batao/i,
    ],
    weight: 23,
  },
  {
    code: "emergency_claim",
    patterns: [
      /\barrested\b/i,
      /\baccident\b/i,
      /\bhospital\b/i,
      /\bemergency\b/i,
      /\bpolice\b/i,
      /\bdetained\b/i,
      /\bbail\b/i,
      /\bkidnap/i,
      /गिरफ्तार/i,
      /अस्पताल/i,
      /पुलिस/i,
      /दुर्घटना/i,
      /girafta?r/i,
      /haspatal/i,
      /accident\s*ho\s*gaya/i,
      /police\s*station/i,
    ],
    weight: 19,
  },
  {
    code: "secrecy_request",
    patterns: [
      /(don'?t|do not)\s+tell/i,
      /\bkeep.{0,10}secret\b/i,
      /(don'?t|do not).{0,10}anyone\b/i,
      /\bonly you\b.{0,15}\bknow\b/i,
      /किसी\s*को\s*मत\s*बता/i,
      /चुपचाप/i,
      /kisi\s*ko\s*mat\s*(bata|bol)/i,
      /chup\s*chap/i,
    ],
    weight: 17,
  },
  {
    code: "urgency_keyword",
    patterns: [
      /\bright now\b/i,
      /\bimmediately\b/i,
      /\burgent(ly)?\b/i,
      /\bas soon as possible\b/i,
      /\basap\b/i,
      /\bquick(ly)?\b/i,
      /\bhurry\b/i,
      /जल्दी/i,
      /तुरंत/i,
      /अभी\s*के\s*अभी/i,
      /\bjaldi\b/i,
      /\bturant\b/i,
    ],
    weight: 13,
  },
  {
    code: "unusual_amount_flag",
    patterns: [/\b(\d{2,3}[,.]?\d{3})\b/i],
    weight: 11,
  },
];

const AMOUNT_PATTERNS = [
  /(₹|\brs\.?|\binr\b|\$)\s?\d/i,
  /\d[\d,.]*\s*(k\b|lakhs?|lacs?|crores?|thousand|hundred|rupees?|rupay?e?|rs\b|inr\b|dollars?|bucks|hazaa?r)/i,
  /\b(send|pay|transfer)(\s+(me|us|him|her|them))?\s+\d/i,
  /\b\d{1,3}(,\d{2,3})+\b/i,
  /\b(thousand|lakhs?|lacs?|crores?|hazaa?r)\b/i,
  /\d*\s*(रुपय[ेा]|रुपए|हज़ार|हजार|लाख|करोड़)/i,
];

function transcriptMentionsAmount(text?: string | null): boolean {
  if (!text) return false;
  return AMOUNT_PATTERNS.some((p) => p.test(text));
}

function scoreTranscript(
  transcript?: string | null,
  deepfakeSignalScore?: number | null
): { riskScore: number; riskLevel: RiskLevel; reasonCodes: string[] } {
  const text = transcript || "";
  let total = 0;
  const reasons: string[] = [];

  for (const rule of SIGNAL_RULES) {
    if (rule.patterns.some((p) => p.test(text))) {
      total += rule.weight;
      reasons.push(rule.code);
    }
  }

  if (
    deepfakeSignalScore !== undefined &&
    deepfakeSignalScore !== null &&
    deepfakeSignalScore >= 0.6 &&
    reasons.length > 0
  ) {
    total += 8;
    reasons.push("deepfake_signal_advisory");
  }

  total = Math.max(0, Math.min(100, total));

  let level: RiskLevel = "LOW";
  if (total <= 39) {
    level = "LOW";
  } else if (total <= 59) {
    level = "MEDIUM";
  } else {
    level = "HIGH";
  }

  return { riskScore: total, riskLevel: level, reasonCodes: reasons };
}

function gate(riskLevel: RiskLevel): {
  decision: Decision;
  verificationRequired: boolean;
  requestStatus: RequestStatus;
} {
  if (riskLevel === "LOW") {
    return { decision: "ALLOW", verificationRequired: false, requestStatus: "VERIFIED" };
  }
  if (riskLevel === "HIGH") {
    return { decision: "PAUSE", verificationRequired: true, requestStatus: "STAYS-PAUSED" };
  }
  return { decision: "REVIEW", verificationRequired: false, requestStatus: "PENDING" };
}

// --- Helpers ---
function nowIso(): string {
  return new Date().toISOString();
}

function addSecondsIso(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function hashCode(code: string, salt: string): string {
  return crypto.createHash("sha256").update(salt + code).digest("hex");
}

function logAudit(req: RequestModel, event: string, details: Record<string, unknown> = {}) {
  req.audit_events.push({
    event,
    timestamp: nowIso(),
    details,
  });
}

// --- WebSocket Manager ---
const wsClients = new Map<string, Set<WebSocket>>();

function registerWs(requestId: string, ws: WebSocket) {
  if (!wsClients.has(requestId)) {
    wsClients.set(requestId, new Set());
  }
  wsClients.get(requestId)!.add(ws);
}

function unregisterWs(requestId: string, ws: WebSocket) {
  const set = wsClients.get(requestId);
  if (set) {
    set.delete(ws);
    if (set.size === 0) {
      wsClients.delete(requestId);
    }
  }
}

function broadcastWs(requestId: string, event: string, requestStatus: RequestStatus, payload: Record<string, unknown> = {}) {
  const set = wsClients.get(requestId);
  if (!set || set.size === 0) return;
  const msg = JSON.stringify({ event, request_status: requestStatus, ...payload });
  for (const client of set) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(msg);
      } catch {
        /* client disconnected */
      }
    }
  }
}

// --- Verification Service Logic ---
async function startTier1(req: RequestModel, verificationId: string, trustedContactId: string): Promise<VerificationModel> {
  const contact = contacts.get(trustedContactId);
  if (!contact || contact.requester_id !== req.requester_id) {
    throw new Error("trusted_contact_id does not belong to this requester");
  }

  const v: VerificationModel = {
    verification_id: verificationId,
    request_id: req.request_id,
    tier: 1,
    status: "PENDING",
    trusted_contact_id: contact.contact_id,
    sent_at: nowIso(),
    expires_at: addSecondsIso(120),
  };
  verifications.set(v.verification_id, v);
  req.current_tier = 1;
  logAudit(req, "TIER1_STARTED", { trusted_contact_id: contact.contact_id });
  broadcastWs(req.request_id, "VERIFICATION_UPDATED", req.request_status, {
    tier: 1,
    verification_status: v.status,
    verification_id: v.verification_id,
  });
  return v;
}

async function startTier2(req: RequestModel, verificationId: string, escalationReason: string): Promise<VerificationModel> {
  let secondary: TrustedContactModel | undefined;
  for (const c of contacts.values()) {
    if (c.requester_id === req.requester_id && c.contact_type === "SECONDARY") {
      secondary = c;
      break;
    }
  }

  const v: VerificationModel = {
    verification_id: verificationId,
    request_id: req.request_id,
    tier: 2,
    status: "PENDING",
    secondary_contact_id: secondary ? secondary.contact_id : null,
    escalation_reason: escalationReason,
    callback_number: secondary ? secondary.phone_number : null,
    sent_at: nowIso(),
    expires_at: addSecondsIso(120),
  };
  verifications.set(v.verification_id, v);
  req.current_tier = 2;
  logAudit(req, "TIER2_STARTED", {
    escalation_reason: escalationReason,
    secondary_contact_id: v.secondary_contact_id,
  });
  broadcastWs(req.request_id, "VERIFICATION_UPDATED", req.request_status, {
    tier: 2,
    verification_status: v.status,
    verification_id: v.verification_id,
    escalation_reason: escalationReason,
  });
  return v;
}

async function startTier3(req: RequestModel, verificationId: string): Promise<VerificationModel> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const salt = crypto.randomBytes(16).toString("hex");

  let primary: TrustedContactModel | undefined;
  for (const c of contacts.values()) {
    if (c.requester_id === req.requester_id && c.contact_type === "PRIMARY") {
      primary = c;
      break;
    }
  }

  const v: VerificationModel = {
    verification_id: verificationId,
    request_id: req.request_id,
    tier: 3,
    status: "PENDING",
    trusted_contact_id: primary ? primary.contact_id : null,
    code_hash: hashCode(code, salt),
    code_salt: salt,
    demo_code: code,
    attempts_remaining: 3,
    sent_at: nowIso(),
    expires_at: addSecondsIso(600),
  };
  verifications.set(v.verification_id, v);
  req.current_tier = 3;
  logAudit(req, "TIER3_STARTED", {});
  broadcastWs(req.request_id, "VERIFICATION_UPDATED", req.request_status, {
    tier: 3,
    verification_status: v.status,
    verification_id: v.verification_id,
  });
  return v;
}

async function markVerified(req: RequestModel, event: string) {
  req.request_status = "VERIFIED";
  logAudit(req, event, {});
  logAudit(req, "ACTION_UNLOCKED", {});
  broadcastWs(req.request_id, "STATUS_CHANGED", req.request_status);
}

async function escalateOrTimeout(req: RequestModel, fromTier: number, reason: string) {
  const nextVerId = `ver_${crypto.randomBytes(4).toString("hex")}`;
  if (fromTier === 1) {
    return await startTier2(req, nextVerId, reason);
  }
  if (fromTier === 2) {
    return await startTier3(req, nextVerId);
  }
  req.request_status = "TIMED-OUT";
  logAudit(req, "REQUEST_TIMED_OUT", { reason });
  broadcastWs(req.request_id, "STATUS_CHANGED", req.request_status);
  return null;
}

// Background Sweeper
setInterval(async () => {
  const now = Date.now();
  for (const v of verifications.values()) {
    if (v.status === "PENDING" && new Date(v.expires_at).getTime() <= now) {
      const req = requests.get(v.request_id);
      if (!req || req.request_status !== "STAYS-PAUSED") continue;

      v.status = "TIMED_OUT";
      const eventMap: Record<number, string> = { 1: "TIER1_TIMEOUT", 2: "TIER2_TIMEOUT", 3: "TIER3_EXPIRED" };
      const reasonMap: Record<number, string> = { 1: "TIER1_TIMEOUT", 2: "TIER2_TIMEOUT", 3: "TIER3_EXPIRED" };
      logAudit(req, eventMap[v.tier] || "TIMEOUT", {});
      broadcastWs(req.request_id, "VERIFICATION_UPDATED", req.request_status, {
        tier: v.tier,
        verification_status: v.status,
        verification_id: v.verification_id,
      });
      await escalateOrTimeout(req, v.tier, reasonMap[v.tier] || "TIMEOUT");
    }
  }
}, 2000);

// --- Auth Helpers ---
function extractToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
    return parts[1];
  }
  return authHeader;
}

function getRequesterByToken(token: string | null): RequesterModel | null {
  if (!token) return null;
  for (const r of requesters.values()) {
    if (r.auth_token === token) return r;
  }
  return null;
}

function getContactByToken(token: string | null): TrustedContactModel | null {
  if (!token) return null;
  for (const c of contacts.values()) {
    if (c.auth_token === token) return c;
  }
  return null;
}

function getIdentityByToken(token: string | null): { kind: "requester" | "contact"; obj: RequesterModel | TrustedContactModel } | null {
  const r = getRequesterByToken(token);
  if (r) return { kind: "requester", obj: r };
  const c = getContactByToken(token);
  if (c) return { kind: "contact", obj: c };
  return null;
}

function ownsRequest(identity: { kind: "requester" | "contact"; obj: RequesterModel | TrustedContactModel }, req: RequestModel): boolean {
  if (identity.kind === "requester") {
    return identity.obj.requester_id === req.requester_id;
  }
  const contact = identity.obj as TrustedContactModel;
  for (const v of verifications.values()) {
    if (v.request_id === req.request_id) {
      if (v.trusted_contact_id === contact.contact_id || v.secondary_contact_id === contact.contact_id) {
        return true;
      }
    }
  }
  return false;
}

// --- Express App Setup ---
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// --- API Routes ---

// Health
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "safesignal", version: "1.0.0" });
});

// Demo Identities
app.get("/demo/identities", (_req, res) => {
  const out = [];
  for (const r of requesters.values()) {
    out.push({ role: "requester", id: r.requester_id, name: r.name, token: r.auth_token });
  }
  for (const c of contacts.values()) {
    out.push({
      role: "contact",
      id: c.contact_id,
      name: c.contact_name,
      token: c.auth_token,
      requester_id: c.requester_id,
    });
  }
  res.json(out);
});

// Auth Login
app.post("/auth/login", (req, res) => {
  const { id_token } = req.body || {};
  if (!id_token) {
    return res.status(401).json({ error: { code: "INVALID_FIREBASE_TOKEN", message: "Missing id_token" } });
  }

  let uid = "user_demo";
  let provider = "GOOGLE";
  let name = "Demo User";
  let email: string | null = null;
  let phoneNumber: string | null = null;

  if (typeof id_token === "string" && id_token.startsWith("devtoken.")) {
    try {
      const payloadB64 = id_token.slice("devtoken.".length);
      const decoded = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf-8"));
      uid = decoded.uid ? `dev:${decoded.uid}` : "dev:user_102";
      provider = decoded.provider || "GOOGLE";
      name = decoded.name || "Aarav Sharma";
      email = decoded.email || null;
      phoneNumber = decoded.phone_number || null;
    } catch {
      // fallback
    }
  } else if (typeof id_token === "string") {
    uid = `user_${crypto.createHash("md5").update(id_token).digest("hex").slice(0, 8)}`;
  }

  let existing = requesters.get(uid);
  let created = false;
  if (!existing) {
    existing = {
      requester_id: uid,
      name,
      auth_token: `token_${crypto.randomBytes(16).toString("hex")}`,
      auth_provider: provider,
      phone_number: phoneNumber,
      email,
    };
    requesters.set(uid, existing);
    created = true;
  }

  res.json({
    requester_id: existing.requester_id,
    name: existing.name,
    auth_provider: existing.auth_provider,
    phone_number: existing.phone_number,
    email: existing.email,
    session_token: existing.auth_token,
    created,
  });
});

// Analyze Request
app.post("/analyze-request", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  const requester = getRequesterByToken(token);
  const body = req.body;

  if (!requester || requester.requester_id !== body.requester_id) {
    return res.status(403).json({
      error: { code: "FORBIDDEN", message: "requester_id does not match the authenticated requester." },
    });
  }

  // Idempotency check
  const existing = requests.get(body.request_id);
  if (existing) {
    return res.json({
      request_id: existing.request_id,
      transcript_or_text: existing.transcript_or_text,
      risk_score: existing.risk_score || 0,
      risk_level: existing.risk_level,
      decision: existing.decision,
      reason_codes: existing.reason_codes || [],
      verification_required: existing.verification_required,
      request_status: existing.request_status,
    });
  }

  let transcript = body.transcript_or_text;

  // Handle AUDIO validation
  if (body.input_type === "AUDIO") {
    if (!body.audio) {
      return res.status(422).json({
        error: { code: "AUDIO_UNPROCESSABLE", message: "Audio payload is empty.", request_id: body.request_id },
        request_status: "STAYS-PAUSED",
      });
    }
    try {
      const raw = Buffer.from(body.audio, "base64");
      if (raw.length === 0) {
        return res.status(422).json({
          error: { code: "AUDIO_UNPROCESSABLE", message: "Audio payload is empty.", request_id: body.request_id },
          request_status: "STAYS-PAUSED",
        });
      }
      if (raw.length > 5 * 1024 * 1024) {
        return res.status(422).json({
          error: { code: "AUDIO_UNPROCESSABLE", message: "Audio exceeds maximum size of 5 MB.", request_id: body.request_id },
          request_status: "STAYS-PAUSED",
        });
      }
      // For demo / prototype environment without native whisper: provide fallback transcript
      transcript = body.transcript_or_text || "Emergency! Dad, I have been arrested and need 80000 rupees right now, don't tell anyone!";
    } catch (e: any) {
      return res.status(422).json({
        error: { code: "AUDIO_UNPROCESSABLE", message: e.message || "Invalid audio", request_id: body.request_id },
        request_status: "STAYS-PAUSED",
      });
    }
  }

  // Score risk
  const risk = scoreTranscript(transcript, body.deepfake_signal_score);
  const gateRes = gate(risk.riskLevel);

  const newReq: RequestModel = {
    request_id: body.request_id,
    requester_id: body.requester_id,
    action_type: body.action_type,
    channel: body.channel,
    claimed_identity: body.claimed_identity,
    input_type: body.input_type,
    amount: body.amount,
    deepfake_signal_score: body.deepfake_signal_score,
    transcript_or_text: transcript,
    risk_score: risk.riskScore,
    risk_level: risk.riskLevel,
    decision: gateRes.decision,
    reason_codes: risk.reasonCodes,
    verification_required: gateRes.verificationRequired,
    request_status: gateRes.requestStatus,
    created_at: nowIso(),
    audit_events: [],
  };

  logAudit(newReq, "REQUEST_RECEIVED", { channel: body.channel, input_type: body.input_type });
  const eventMap: Record<RiskLevel, string> = {
    LOW: "LOW_RISK_ALLOWED",
    MEDIUM: "MEDIUM_RISK_REVIEW",
    HIGH: "HIGH_RISK_DETECTED",
  };
  logAudit(newReq, eventMap[risk.riskLevel], { risk_score: risk.riskScore, reason_codes: risk.reasonCodes });
  const actionEventMap: Record<string, string> = {
    ALLOW: "ACTION_ALLOWED",
    PAUSE: "ACTION_PAUSED",
    REVIEW: "ACTION_ADVISORY_REVIEW",
  };
  logAudit(newReq, actionEventMap[gateRes.decision] || "ACTION_PAUSED");

  requests.set(newReq.request_id, newReq);

  // Auto-orchestrate Tier 1 if verification required
  if (gateRes.verificationRequired) {
    let primary: TrustedContactModel | undefined;
    for (const c of contacts.values()) {
      if (c.requester_id === newReq.requester_id && c.contact_type === "PRIMARY") {
        primary = c;
        break;
      }
    }
    if (primary) {
      await startTier1(newReq, `ver_${crypto.randomBytes(4).toString("hex")}`, primary.contact_id);
    }
  }

  res.json({
    request_id: newReq.request_id,
    transcript_or_text: newReq.transcript_or_text,
    risk_score: newReq.risk_score,
    risk_level: newReq.risk_level,
    decision: newReq.decision,
    reason_codes: newReq.reason_codes,
    verification_required: newReq.verification_required,
    request_status: newReq.request_status,
  });
});

// Get Request State
app.get("/requests/:requestId", (req, res) => {
  const token = extractToken(req.headers.authorization);
  const identity = getIdentityByToken(token);
  if (!identity) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid or missing token" } });
  }

  const foundReq = requests.get(req.params.requestId);
  if (!foundReq) {
    return res.status(404).json({ error: { code: "REQUEST_NOT_FOUND", message: "No request with this id." } });
  }

  if (!ownsRequest(identity, foundReq)) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "You do not have access to this request." } });
  }

  const verList = Array.from(verifications.values())
    .filter((v) => v.request_id === foundReq.request_id)
    .map((v) => ({
      verification_id: v.verification_id,
      tier: v.tier,
      status: v.status,
      sent_at: v.sent_at,
      expires_at: v.expires_at,
      responded_at: v.responded_at || null,
    }));

  res.json({
    request_id: foundReq.request_id,
    risk_score: foundReq.risk_score,
    risk_level: foundReq.risk_level,
    decision: foundReq.decision,
    reason_codes: foundReq.reason_codes || [],
    transcript_or_text: foundReq.transcript_or_text,
    amount: foundReq.amount,
    claimed_identity: foundReq.claimed_identity,
    channel: foundReq.channel,
    verification_required: foundReq.verification_required,
    request_status: foundReq.request_status,
    transfer_requested: transcriptMentionsAmount(foundReq.transcript_or_text),
    current_tier: foundReq.current_tier,
    override_reason: foundReq.override_reason,
    override_at: foundReq.override_at,
    created_at: foundReq.created_at,
    verifications: verList,
  });
});

// Manual Override
app.post("/requests/:requestId/manual-override", (req, res) => {
  const token = extractToken(req.headers.authorization);
  const requester = getRequesterByToken(token);
  if (!requester) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid requester token" } });
  }

  const foundReq = requests.get(req.params.requestId);
  if (!foundReq) {
    return res.status(404).json({ error: { code: "REQUEST_NOT_FOUND", message: "No request with this id." } });
  }

  if (foundReq.requester_id !== requester.requester_id) {
    return res.status(403).json({
      error: { code: "FORBIDDEN", message: "Manual override may only be triggered by the owner requester." },
    });
  }

  if (foundReq.request_status === "VERIFIED" || foundReq.request_status === "MANUAL-OVERRIDE") {
    return res.status(409).json({
      error: { code: "WRONG_TIER_STATE", message: `Request is already ${foundReq.request_status}; override not applicable.` },
    });
  }

  const now = nowIso();
  foundReq.request_status = "MANUAL-OVERRIDE";
  foundReq.override_reason = req.body?.reason || "User manual override";
  foundReq.override_at = now;
  logAudit(foundReq, "MANUAL_OVERRIDE", { reason: foundReq.override_reason });
  broadcastWs(foundReq.request_id, "STATUS_CHANGED", foundReq.request_status);

  res.json({
    request_id: foundReq.request_id,
    request_status: foundReq.request_status,
    override_at: foundReq.override_at,
  });
});

// Audit Trail
app.get("/requests/:requestId/audit", (req, res) => {
  const token = extractToken(req.headers.authorization);
  const identity = getIdentityByToken(token);
  if (!identity) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid token" } });
  }

  const foundReq = requests.get(req.params.requestId);
  if (!foundReq) {
    return res.status(404).json({ error: { code: "REQUEST_NOT_FOUND", message: "No request with this id." } });
  }

  if (!ownsRequest(identity, foundReq)) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Access forbidden." } });
  }

  res.json({
    request_id: foundReq.request_id,
    events: foundReq.audit_events.map((e) => ({
      event: e.event,
      timestamp: e.timestamp,
      details: e.details,
    })),
  });
});

// Verification Responses
app.post("/verify/tier1", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  const requester = getRequesterByToken(token);
  if (!requester) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid requester token" } });
  }
  const foundReq = requests.get(req.body.request_id);
  if (!foundReq) {
    return res.status(404).json({ error: { code: "REQUEST_NOT_FOUND", message: "No request with this id." } });
  }
  const existing = Array.from(verifications.values()).find(
    (v) => v.request_id === foundReq.request_id && v.tier === 1 && v.status === "PENDING"
  );
  if (existing) {
    return res.json(existing);
  }
  const v = await startTier1(foundReq, req.body.verification_id, req.body.trusted_contact_id);
  res.json(v);
});

app.post("/verify/tier1/respond", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  const contact = getContactByToken(token);
  if (!contact) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid contact token" } });
  }

  const v = verifications.get(req.body.verification_id);
  if (!v || v.tier !== 1) {
    return res.status(404).json({ error: { code: "VERIFICATION_NOT_FOUND", message: "No such verification." } });
  }

  if (v.trusted_contact_id !== contact.contact_id) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "This verification is not assigned to you." } });
  }

  if (v.status !== "PENDING") {
    return res.status(409).json({ error: { code: "WRONG_TIER_STATE", message: `Verification already ${v.status}.` } });
  }

  const foundReq = requests.get(v.request_id);
  if (!foundReq) {
    return res.status(404).json({ error: { code: "REQUEST_NOT_FOUND", message: "No such request" } });
  }

  v.responded_at = nowIso();

  if (req.body.response === "CONFIRMED") {
    v.status = "CONFIRMED";
    await markVerified(foundReq, "TIER1_CONFIRMED");
  } else {
    v.status = "REJECTED";
    logAudit(foundReq, "TIER1_REJECTED", {});
    await escalateOrTimeout(foundReq, 1, "TIER1_REJECTED");
  }

  res.json({
    verification_id: v.verification_id,
    request_id: v.request_id,
    tier: v.tier,
    status: v.status,
    request_status: foundReq.request_status,
    responded_at: v.responded_at,
  });
});

app.post("/verify/tier2", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  const requester = getRequesterByToken(token);
  if (!requester) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid requester token" } });
  }
  const foundReq = requests.get(req.body.request_id);
  if (!foundReq) {
    return res.status(404).json({ error: { code: "REQUEST_NOT_FOUND", message: "No request with this id." } });
  }
  const existing = Array.from(verifications.values()).find(
    (v) => v.request_id === foundReq.request_id && v.tier === 2 && v.status === "PENDING"
  );
  if (existing) {
    return res.json(existing);
  }
  const v = await startTier2(foundReq, req.body.verification_id, req.body.escalation_reason || "TIER1_TIMEOUT");
  res.json(v);
});

app.post("/verify/tier2/respond", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  const contact = getContactByToken(token);
  if (!contact) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid contact token" } });
  }

  const v = verifications.get(req.body.verification_id);
  if (!v || v.tier !== 2) {
    return res.status(404).json({ error: { code: "VERIFICATION_NOT_FOUND", message: "No such verification." } });
  }

  if (v.secondary_contact_id !== contact.contact_id) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "This verification is not assigned to you." } });
  }

  if (v.status !== "PENDING") {
    return res.status(409).json({ error: { code: "WRONG_TIER_STATE", message: `Verification already ${v.status}.` } });
  }

  const foundReq = requests.get(v.request_id);
  if (!foundReq) {
    return res.status(404).json({ error: { code: "REQUEST_NOT_FOUND", message: "No such request" } });
  }

  v.responded_at = nowIso();

  if (req.body.response === "CONFIRMED") {
    v.status = "CONFIRMED";
    await markVerified(foundReq, "TIER2_CONFIRMED");
  } else {
    v.status = "REJECTED";
    logAudit(foundReq, "TIER2_REJECTED", {});
    await escalateOrTimeout(foundReq, 2, "TIER2_REJECTED");
  }

  res.json({
    verification_id: v.verification_id,
    request_id: v.request_id,
    tier: v.tier,
    status: v.status,
    request_status: foundReq.request_status,
    responded_at: v.responded_at,
  });
});

app.post("/verify/tier3", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  const requester = getRequesterByToken(token);
  if (!requester) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid requester token" } });
  }

  const foundReq = requests.get(req.body.request_id);
  if (!foundReq) {
    return res.status(404).json({ error: { code: "REQUEST_NOT_FOUND", message: "No request with this id." } });
  }

  const existing = Array.from(verifications.values()).find(
    (v) => v.request_id === foundReq.request_id && v.tier === 3 && v.status === "PENDING"
  );
  const v = existing || (await startTier3(foundReq, req.body.verification_id));

  res.json({
    verification_id: v.verification_id,
    request_id: v.request_id,
    tier: 3,
    status: v.status,
    expires_at: v.expires_at,
    attempts_remaining: v.attempts_remaining,
    demo_code: v.demo_code,
  });
});

app.post("/verify/tier3/submit", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  const requester = getRequesterByToken(token);
  if (!requester) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid requester token" } });
  }

  const v = verifications.get(req.body.verification_id);
  if (!v || v.tier !== 3) {
    return res.status(404).json({ error: { code: "VERIFICATION_NOT_FOUND", message: "No such verification." } });
  }

  const foundReq = requests.get(v.request_id);
  if (!foundReq || foundReq.requester_id !== requester.requester_id) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Not your request." } });
  }

  if (v.attempts_remaining !== null && v.attempts_remaining !== undefined && v.attempts_remaining <= 0) {
    return res.status(429).json({
      error: { code: "MAX_ATTEMPTS_EXCEEDED", message: "Maximum verification attempts exceeded.", request_id: foundReq.request_id },
    });
  }

  if (v.status !== "PENDING") {
    return res.status(409).json({ error: { code: "WRONG_TIER_STATE", message: `Verification already ${v.status}.` } });
  }

  if (Date.now() > new Date(v.expires_at).getTime()) {
    v.status = "TIMED_OUT";
    logAudit(foundReq, "TIER3_EXPIRED", {});
    await escalateOrTimeout(foundReq, 3, "TIER3_EXPIRED");
    return res.status(410).json({
      error: { code: "VERIFICATION_EXPIRED", message: "This verification request has expired.", request_id: foundReq.request_id },
    });
  }

  const hashed = hashCode(req.body.code, v.code_salt || "");
  if (hashed === v.code_hash) {
    v.status = "CONFIRMED";
    v.responded_at = nowIso();
    await markVerified(foundReq, "TIER3_CONFIRMED");
    return res.json({
      verification_id: v.verification_id,
      request_id: v.request_id,
      tier: 3,
      status: v.status,
      request_status: foundReq.request_status,
    });
  }

  // Wrong code
  v.attempts_remaining = (v.attempts_remaining ?? 1) - 1;
  logAudit(foundReq, "TIER3_WRONG_CODE", { attempts_remaining: v.attempts_remaining });

  if (v.attempts_remaining <= 0) {
    logAudit(foundReq, "TIER3_ATTEMPTS_EXHAUSTED", {});
    await escalateOrTimeout(foundReq, 3, "TIER3_ATTEMPTS_EXHAUSTED");
  }

  res.json({
    verification_id: v.verification_id,
    request_id: v.request_id,
    tier: 3,
    status: v.status,
    attempts_remaining: v.attempts_remaining,
  });
});

// Contact Inbox
app.get("/contacts/:contactId/inbox", (req, res) => {
  const token = extractToken(req.headers.authorization);
  const contact = getContactByToken(token);
  if (!contact || contact.contact_id !== req.params.contactId) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Cannot view another contact's inbox." } });
  }

  const items = [];
  for (const v of verifications.values()) {
    if (v.trusted_contact_id === contact.contact_id || v.secondary_contact_id === contact.contact_id) {
      const foundReq = requests.get(v.request_id);
      if (!foundReq) continue;
      items.push({
        verification_id: v.verification_id,
        request_id: v.request_id,
        tier: v.tier,
        status: v.status,
        sent_at: v.sent_at,
        expires_at: v.expires_at,
        escalation_reason: v.escalation_reason,
        demo_code: v.tier === 3 ? v.demo_code : null,
        request_status: foundReq.request_status,
        claimed_identity: foundReq.claimed_identity,
        amount: foundReq.amount,
        channel: foundReq.channel,
        risk_level: foundReq.risk_level,
        risk_score: foundReq.risk_score,
        reason_codes: foundReq.reason_codes || [],
        transcript_or_text: foundReq.transcript_or_text,
      });
    }
  }

  items.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
  res.json(items);
});

// Contacts CRUD
app.post("/contacts", (req, res) => {
  const token = extractToken(req.headers.authorization);
  const requester = getRequesterByToken(token);
  if (!requester || requester.requester_id !== req.body.requester_id) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Cannot register a contact for another requester." } });
  }

  const newContact: TrustedContactModel = {
    contact_id: `contact_${crypto.randomBytes(3).toString("hex")}`,
    requester_id: req.body.requester_id,
    contact_name: req.body.contact_name,
    phone_number: req.body.phone_number,
    contact_type: req.body.contact_type,
    auth_token: `token_${crypto.randomBytes(12).toString("hex")}`,
  };
  contacts.set(newContact.contact_id, newContact);

  res.json({
    contact_id: newContact.contact_id,
    requester_id: newContact.requester_id,
    contact_name: newContact.contact_name,
    phone_number: newContact.phone_number,
    contact_type: newContact.contact_type,
    auth_token: newContact.auth_token,
  });
});

app.get("/contacts/:requesterId", (req, res) => {
  const token = extractToken(req.headers.authorization);
  const requester = getRequesterByToken(token);
  if (!requester || requester.requester_id !== req.params.requesterId) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Cannot view another requester's contacts." } });
  }

  const out = [];
  for (const c of contacts.values()) {
    if (c.requester_id === req.params.requesterId) {
      out.push({
        contact_id: c.contact_id,
        requester_id: c.requester_id,
        contact_name: c.contact_name,
        phone_number: c.phone_number,
        contact_type: c.contact_type,
      });
    }
  }
  res.json(out);
});

// Family Dashboard
app.get("/requesters/:requesterId/dashboard", (req, res) => {
  const token = extractToken(req.headers.authorization);
  const identity = getIdentityByToken(token);
  if (!identity) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid token" } });
  }

  const requesterId = req.params.requesterId;
  const requester = requesters.get(requesterId);
  if (!requester) {
    return res.status(404).json({ error: { code: "REQUEST_NOT_FOUND", message: "No such requester." } });
  }

  if (identity.kind === "requester" && identity.obj.requester_id !== requesterId) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Cannot view another requester's dashboard." } });
  }
  if (identity.kind === "contact" && (identity.obj as TrustedContactModel).requester_id !== requesterId) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "You are not a registered contact for this requester." } });
  }

  const entries = Array.from(requests.values())
    .filter((r) => r.requester_id === requesterId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((r) => ({
      request_id: r.request_id,
      risk_level: r.risk_level,
      risk_score: r.risk_score,
      request_status: r.request_status,
      claimed_identity: r.claimed_identity,
      amount: r.amount,
      triggered_by_panic: Boolean(r.triggered_by_panic),
      created_at: r.created_at,
    }));

  res.json({
    requester_id: requester.requester_id,
    requester_name: requester.name,
    entries,
  });
});

// Panic Button
app.post("/panic", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  const requester = getRequesterByToken(token);
  if (!requester) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid requester token" } });
  }

  const requestId = req.body?.request_id || `req_panic_${crypto.randomBytes(4).toString("hex")}`;
  const existing = requests.get(requestId);
  if (existing) {
    return res.json({
      request_id: existing.request_id,
      transcript_or_text: existing.transcript_or_text,
      risk_score: existing.risk_score || 0,
      risk_level: existing.risk_level,
      decision: existing.decision,
      reason_codes: existing.reason_codes || [],
      verification_required: existing.verification_required,
      request_status: existing.request_status,
    });
  }

  const panicReq: RequestModel = {
    request_id: requestId,
    requester_id: requester.requester_id,
    action_type: "wallet_transfer",
    channel: "voice_call",
    claimed_identity: req.body?.claimed_identity,
    input_type: "TEXT",
    transcript_or_text: req.body?.note || "User manually triggered the panic button during a suspicious call.",
    risk_score: 100,
    risk_level: "HIGH",
    decision: "PAUSE",
    reason_codes: ["manual_panic_trigger"],
    verification_required: true,
    request_status: "STAYS-PAUSED",
    triggered_by_panic: true,
    created_at: nowIso(),
    audit_events: [],
  };

  logAudit(panicReq, "REQUEST_RECEIVED", { channel: "voice_call", source: "panic_button" });
  logAudit(panicReq, "PANIC_TRIGGERED", { note: req.body?.note });
  logAudit(panicReq, "ACTION_PAUSED", {});
  requests.set(panicReq.request_id, panicReq);

  let primary: TrustedContactModel | undefined;
  for (const c of contacts.values()) {
    if (c.requester_id === requester.requester_id && c.contact_type === "PRIMARY") {
      primary = c;
      break;
    }
  }

  if (primary) {
    await startTier1(panicReq, `ver_${crypto.randomBytes(4).toString("hex")}`, primary.contact_id);
  }

  res.json({
    request_id: panicReq.request_id,
    transcript_or_text: panicReq.transcript_or_text,
    risk_score: panicReq.risk_score,
    risk_level: panicReq.risk_level,
    decision: panicReq.decision,
    reason_codes: panicReq.reason_codes,
    verification_required: panicReq.verification_required,
    request_status: panicReq.request_status,
  });
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: err.message || "Unknown error" } });
});

// --- HTTP and WebSocket Server ---
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const match = url.pathname.match(/^\/ws\/requests\/([^/]+)/);
  if (!match) {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }

  const requestId = match[1];
  const token = url.searchParams.get("token");
  const identity = getIdentityByToken(token);
  if (!identity) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  const foundReq = requests.get(requestId);
  if (!foundReq || !ownsRequest(identity, foundReq)) {
    socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req, requestId);
  });
});

wss.on("connection", (ws: WebSocket, _req: http.IncomingMessage, requestId: string) => {
  registerWs(requestId, ws);
  ws.on("close", () => {
    unregisterWs(requestId, ws);
  });
});

// --- Frontend Mounting (Vite in Dev / Static in Prod) ---
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production" && fs.existsSync(path.resolve(process.cwd(), "dist"));

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[SafeSignal] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
