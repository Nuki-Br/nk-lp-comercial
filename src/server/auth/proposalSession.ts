import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/* The proposal access cookie: signed, not encrypted. The payload is not secret —
   it only has to be unforgeable. ADR 14, and docs/security.md for the flags.

   Twenty lines of createHmac instead of a JWT library, because there is no third
   party to interoperate with and `jose` would be a dependency wrapping exactly
   this. */

/** No fallback, and it throws at module load. `deployment.md` makes this a
    property of the whole server layer: a missing secret must break the app on
    startup, not silently sign cookies with an empty key. */
const SECRET = requiredEnv("PROPOSAL_COOKIE_SECRET");

/** Rotation without logging anyone out: move the old value here, publish the
    new one, wait out the TTL, delete. Verification accepts either; signing only
    ever uses the current secret. */
const PREVIOUS_SECRET = process.env.PROPOSAL_COOKIE_SECRET_PREVIOUS || null;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. It signs the proposal access cookie; there is no default.`,
    );
  }
  return value;
}

/** Seven days. Long enough that a client who reads the proposal over a weekend
    is not re-prompted, short enough that a forwarded laptop is not a permanent
    grant. The document's own `expires_at` is a separate clock and is checked
    even when this one is still valid — docs/security.md, "two clocks". */
export const PROPOSAL_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export type ProposalSessionPayload = {
  /** Proposal id. Present so a cookie minted for A is worthless for B. */
  pid: string;
  /** The `access_epoch` this cookie was minted under. */
  epoch: number;
  /** Expiry, epoch SECONDS (not milliseconds). */
  exp: number;
};

export type ProposalSessionVerdict =
  | { ok: true; payload: ProposalSessionPayload }
  | {
      ok: false;
      reason: "malformed" | "bad-signature" | "expired" | "wrong-proposal" | "stale-epoch";
    };

/** `nk_pa_<first 8 of the proposal id>`.

    Per-proposal, so opening a second proposal does not evict the first. Not
    `__Host-` prefixed: that requires `Secure`, which breaks local http, and a
    cookie whose NAME differs between dev and production is a footgun that
    outlives the benefit. */
export const proposalCookieName = (proposalId: string): string =>
  `nk_pa_${proposalId.replace(/-/g, "").slice(0, 8)}`;

const b64url = (input: string | Buffer): string => Buffer.from(input).toString("base64url");

const signature = (body: string, secret: string): Buffer =>
  createHmac("sha256", secret).update(body).digest();

/** Signs over the ENCODED body rather than the object, so there is no second
    serialization to disagree with the first. */
export function signProposalSession(
  payload: Omit<ProposalSessionPayload, "exp">,
  nowMs: number,
  ttlSeconds: number = PROPOSAL_SESSION_TTL_SECONDS,
): string {
  const full: ProposalSessionPayload = {
    ...payload,
    exp: Math.floor(nowMs / 1000) + ttlSeconds,
  };
  const body = b64url(JSON.stringify(full));
  return `${body}.${signature(body, SECRET).toString("base64url")}`;
}

function signatureMatches(body: string, provided: Buffer): boolean {
  for (const secret of [SECRET, PREVIOUS_SECRET]) {
    if (!secret) continue;
    const expected = signature(body, secret);
    /* Length is checked first because timingSafeEqual THROWS on a mismatch, and
       an exception is itself a side channel. Both are 32 bytes whenever the
       token came from us, so this only rejects garbage. */
    if (expected.length === provided.length && timingSafeEqual(expected, provided)) return true;
  }
  return false;
}

function parsePayload(body: string): ProposalSessionPayload | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof parsed !== "object" || parsed === null) return null;

    const { pid, epoch, exp } = parsed as Record<string, unknown>;
    if (typeof pid !== "string" || pid.length === 0) return null;
    if (!Number.isInteger(epoch) || !Number.isInteger(exp)) return null;

    return { pid, epoch: epoch as number, exp: exp as number };
  } catch {
    return null;
  }
}

/**
 * The order here is the order in `docs/security.md`, and it is not arbitrary:
 * the signature is checked before the payload is trusted for anything at all,
 * including its own expiry.
 */
export function verifyProposalSession(
  token: string | undefined | null,
  expected: { proposalId: string; accessEpoch: number },
  nowMs: number,
): ProposalSessionVerdict {
  if (!token) return { ok: false, reason: "malformed" };

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: "malformed" };

  const [body, provided] = parts;
  if (!signatureMatches(body, Buffer.from(provided, "base64url"))) {
    return { ok: false, reason: "bad-signature" };
  }

  const payload = parsePayload(body);
  if (!payload) return { ok: false, reason: "malformed" };

  if (payload.exp * 1000 <= nowMs) return { ok: false, reason: "expired" };
  if (payload.pid !== expected.proposalId) return { ok: false, reason: "wrong-proposal" };
  if (payload.epoch !== expected.accessEpoch) return { ok: false, reason: "stale-epoch" };

  return { ok: true, payload };
}

/** The flags, in one place, so a second call site cannot drift from the first.

    `sameSite: "lax"` because a proposal link arrives over WhatsApp as a
    top-level GET; `strict` drops the cookie on that navigation and re-prompts
    the client every single time. `secure` only in production, because local
    development is http. */
export const proposalCookieOptions = (maxAgeSeconds: number = PROPOSAL_SESSION_TTL_SECONDS) =>
  ({
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  }) as const;
