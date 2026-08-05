import "server-only";

import { cookies } from "next/headers";
import type { DeckConfig } from "@/deck/types";
import { proposalCookieName, verifyProposalSession } from "@/server/auth/proposalSession";
import { parseStoredDeckConfig } from "@/server/schemas/deckConfig";

/* THE TRUST BOUNDARY.

   Not proxy.ts, not the page, not RLS. Next's own auth guide calls Proxy an
   optimistic check and puts the real boundary in a data access layer; ADR 15
   agrees and /p/[slug] is deliberately not proxied at all.

   `loadProposalForVisitor` is the ONLY path to proposal content. A second path
   re-opens the leak this file exists to close — if you find yourself reaching
   for supabaseAdmin from a page, that is the mistake. */

/** Only what the decision needs. Notably absent: the title and anything else
    that could be rendered before the visitor has unlocked. */
export type ProposalAccessRow = {
  id: string;
  status: string;
  expires_at: string | null;
  access_epoch: number;
  config_snapshot: unknown;
};

export type LockReason =
  | "no-cookie"
  | "bad-signature"
  | "expired-cookie"
  | "wrong-proposal"
  | "stale-epoch";

/**
 * `reason` is for the server: logs, and the tests below. **Do not render it.**
 * Telling a visitor which of five ways their cookie failed is free information
 * for someone probing the link.
 */
export type VisitorView =
  | { state: "not-found" }
  | { state: "expired" }
  | { state: "locked"; reason: LockReason }
  | { state: "unlocked"; proposalId: string; config: DeckConfig };

export type VisitorDeps = {
  fetchRow: (slug: string) => Promise<ProposalAccessRow | null>;
  readCookie: (name: string) => string | undefined;
  now: number;
};

/**
 * The decision table, with everything injected.
 *
 * Pure by construction, which is what lets `docs/testing.md` require a test for
 * it while keeping CI database-free. That constraint is not a nuisance to work
 * around — it is why this function has no hidden inputs.
 *
 * The order is the order in docs/security.md, and each step is a gate:
 *
 *   1. published and not archived
 *   2. not past expires_at
 *   3. cookie present
 *   4. signature verifies, constant-time
 *   5. payload names THIS proposal
 *   6. payload's epoch still matches the row
 */
export async function resolveVisitorView(slug: string, deps: VisitorDeps): Promise<VisitorView> {
  const row = await deps.fetchRow(slug);

  /* A draft is not-found rather than locked. A visitor must not learn that a
     proposal is being prepared for them, and the only document we are willing
     to render is the frozen snapshot — never live defaults. */
  if (!row || row.status !== "published") return { state: "not-found" };

  /* The document clock. Checked BEFORE the cookie, so an expired proposal reads
     as expired even to someone holding a perfectly valid cookie — that is the
     point of having two clocks rather than one. */
  if (row.expires_at !== null && Date.parse(row.expires_at) <= deps.now) {
    return { state: "expired" };
  }

  const token = deps.readCookie(proposalCookieName(row.id));
  if (!token) return { state: "locked", reason: "no-cookie" };

  const verdict = verifyProposalSession(
    token,
    { proposalId: row.id, accessEpoch: row.access_epoch },
    deps.now,
  );

  if (!verdict.ok) {
    return { state: "locked", reason: lockReasonFor(verdict.reason) };
  }

  const config = parseStoredDeckConfig(row.config_snapshot);

  /* Can't-happen: a CHECK constraint forbids publishing without a snapshot. If
     it happens anyway — a hand-edited row, a restore from an older schema — the
     honest answer is "nothing", not the live defaults. Rendering defaults here
     would quietly show the client a different commercial document from the one
     they were sent, which is the failure ADR 13 exists to prevent. */
  if (!config) return { state: "not-found" };

  return {
    state: "unlocked",
    proposalId: row.id,
    config: forVisitor(config, slug),
  };
}

function lockReasonFor(
  reason: "malformed" | "bad-signature" | "expired" | "wrong-proposal" | "stale-epoch",
): LockReason {
  switch (reason) {
    case "expired":
      return "expired-cookie";
    case "wrong-proposal":
      return "wrong-proposal";
    case "stale-epoch":
      return "stale-epoch";
    default:
      return "bad-signature";
  }
}

/**
 * The two fields that are decided at the render site and never persisted.
 *
 * `allowPriceOverride` is the security-relevant one: it is absent from
 * `DeckOverride` precisely so `/fast`'s `true` cannot ride into a snapshot, and
 * forcing it false here is the second belt. A published link must never ship the
 * Ctrl+Alt+K cost panel to a client.
 */
export function forVisitor(config: DeckConfig, slug: string): DeckConfig {
  return {
    ...config,
    key: slug,
    chrome: { ...config.chrome, allowPriceOverride: false },
  };
}

async function fetchProposalRow(slug: string): Promise<ProposalAccessRow | null> {
  /* Imported lazily, and this is load-bearing rather than a style choice.
     `adminClient` reads SUPABASE_URL and SUPABASE_SECRET_KEY at module load and
     throws without them — correct for the real client, and fatal for a static
     import here, because it would make the pure decision table above impossible
     to load without a configured environment. The stage brief asks for an
     injectable fetcher precisely so CI needs no database; a top-level import of
     the client would have quietly taken that back.

     The loud failure still happens, one step later: the first request through
     this path throws if the environment is not configured. */
  const { supabaseAdmin } = await import("@/server/supabase/adminClient");

  /* supabaseAdmin bypasses RLS. That is safe HERE and only here, because this
     function is unreachable except through the decision table above. */
  const { data } = await supabaseAdmin
    .from("proposals")
    .select("id, status, expires_at, access_epoch, config_snapshot")
    .eq("slug", slug)
    .maybeSingle();

  return data ?? null;
}

/** The real entry point. Everything above it is testable without a database;
    everything this adds is the two impure inputs. */
export async function loadProposalForVisitor(slug: string): Promise<VisitorView> {
  const cookieStore = await cookies();

  return resolveVisitorView(slug, {
    fetchRow: fetchProposalRow,
    readCookie: (name) => cookieStore.get(name)?.value,
    now: Date.now(),
  });
}
