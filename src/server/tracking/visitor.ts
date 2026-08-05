import "server-only";

import { createHmac } from "node:crypto";

/* The privacy-preserving visitor identity, used by both the rate limiter and
   the tracking tables. docs/security.md carries the reasoning; this file is
   where it is true.

   THE RAW IP IS NEVER A COLUMN AND NEVER A LOG LINE. It exists inside this
   function and nowhere else in the codebase. */

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

const SALT = requiredEnv("TRACKING_IP_SALT");

/**
 * `HMAC(salt + UTC day, proposalId | ip | ua)`.
 *
 * Three properties, each deliberate:
 *
 * - **The key rotates by UTC day**, so two visits on different days cannot be
 *   correlated even by us.
 * - **`proposalId` is in the message**, so the same visitor hashes differently
 *   for every proposal. Nothing correlates across clients.
 * - It is a **one-way** function over inputs we never store, so the table can be
 *   dumped without revealing who visited.
 */
export function visitorHash(input: {
  proposalId: string;
  ip: string;
  userAgent: string;
  now: number;
}): string {
  const utcDay = new Date(input.now).toISOString().slice(0, 10);
  return createHmac("sha256", `${SALT}${utcDay}`)
    .update(`${input.proposalId}|${input.ip}|${input.userAgent}`)
    .digest("base64url");
}

/**
 * Best-effort client address from proxy headers.
 *
 * Never trusted for authorization — it is only an input to a hash whose job is
 * to make rate limiting and de-duplication approximately right. A spoofed
 * `x-forwarded-for` costs an attacker a fresh rate-limit bucket, which is why
 * `security.md` also caps failures per PROPOSAL and not only per visitor.
 */
export function clientAddress(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return headers.get("x-real-ip")?.trim() || "unknown";
}
