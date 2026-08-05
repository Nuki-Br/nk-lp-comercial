import "server-only";

import { verifyPassword } from "@/server/auth/password";
import { supabaseAdmin } from "@/server/supabase/adminClient";

/* The unlock path. Everything here runs for an anonymous visitor holding only a
   link and a password, which makes it the most exposed code in the repo.

   docs/security.md is the design; the numbers below are the ones it states. */

/** 15 minutes. Long enough to be a real deterrent, short enough that a client
    who fat-fingers their password four times is not locked out over lunch. */
const WINDOW_MS = 15 * 60 * 1000;

/** Per visitor: the ordinary case. */
const MAX_FAILURES_PER_VISITOR = 8;

/** Per proposal, across every visitor: what catches a guess spread over many
    addresses, which the per-visitor cap alone would never see. */
const MAX_FAILURES_PER_PROPOSAL = 60;

export type UnlockOutcome =
  | { ok: true }
  /* One shape for every failure that is not rate limiting. The visitor is never
     told whether the proposal exists, whether it has a password, or whether the
     password was close — all of that is free information for someone probing a
     link they were forwarded. */
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "rate-limited" };

/**
 * Counts recent failures. Cheap by construction: two indexed `count(*)` queries
 * over a table designed for exactly this, which is why `@upstash/ratelimit` is
 * on Rule 3's ban list rather than in package.json.
 */
export async function isRateLimited(
  proposalId: string,
  visitorHash: string,
  now: number,
): Promise<boolean> {
  const since = new Date(now - WINDOW_MS).toISOString();

  const [byVisitor, byProposal] = await Promise.all([
    supabaseAdmin
      .from("proposal_access_attempts")
      .select("id", { count: "exact", head: true })
      .eq("proposal_id", proposalId)
      .eq("visitor_hash", visitorHash)
      .eq("succeeded", false)
      .gte("attempted_at", since),
    supabaseAdmin
      .from("proposal_access_attempts")
      .select("id", { count: "exact", head: true })
      .eq("proposal_id", proposalId)
      .eq("succeeded", false)
      .gte("attempted_at", since),
  ]);

  return (
    (byVisitor.count ?? 0) >= MAX_FAILURES_PER_VISITOR ||
    (byProposal.count ?? 0) >= MAX_FAILURES_PER_PROPOSAL
  );
}

async function recordAttempt(proposalId: string, visitorHash: string, succeeded: boolean) {
  await supabaseAdmin
    .from("proposal_access_attempts")
    .insert({ proposal_id: proposalId, visitor_hash: visitorHash, succeeded });
}

/**
 * Verify a submitted password against the live credential.
 *
 * The rate limit is checked BEFORE the scrypt work, deliberately: scrypt is
 * memory-hard, and an attacker who can force one derivation per guess has been
 * handed a denial of service along with their guessing.
 */
export async function attemptUnlock(input: {
  proposalId: string;
  password: string;
  visitorHash: string;
  now: number;
}): Promise<UnlockOutcome> {
  if (await isRateLimited(input.proposalId, input.visitorHash, input.now)) {
    return { ok: false, reason: "rate-limited" };
  }

  const { data: credential } = await supabaseAdmin
    .from("proposal_access")
    .select("password_hash, expires_at")
    .eq("proposal_id", input.proposalId)
    .is("revoked_at", null)
    .maybeSingle();

  /* No credential at all is indistinguishable from a wrong password, and it is
     recorded as a failed attempt so that probing a passwordless proposal still
     burns rate-limit budget. */
  if (!credential) {
    await recordAttempt(input.proposalId, input.visitorHash, false);
    return { ok: false, reason: "invalid" };
  }

  if (credential.expires_at !== null && Date.parse(credential.expires_at) <= input.now) {
    await recordAttempt(input.proposalId, input.visitorHash, false);
    return { ok: false, reason: "invalid" };
  }

  const ok = await verifyPassword(input.password, credential.password_hash);
  await recordAttempt(input.proposalId, input.visitorHash, ok);

  return ok ? { ok: true } : { ok: false, reason: "invalid" };
}

/**
 * Opens the tracking session for a visit that just unlocked.
 *
 * Created here rather than in the browser so a session cannot exist without a
 * successful password POST — that structural fact is most of the bot defence,
 * and it is why the tracking tables need no CAPTCHA and no heuristics.
 */
export async function openViewSession(input: {
  proposalId: string;
  visitorHash: string;
  isInternal: boolean;
}): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("proposal_view_sessions")
    .insert({
      proposal_id: input.proposalId,
      visitor_hash: input.visitorHash,
      is_internal: input.isInternal,
    })
    .select("id")
    .single();

  return data?.id ?? null;
}
