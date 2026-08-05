"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import {
  PROPOSAL_SESSION_TTL_SECONDS,
  proposalCookieName,
  proposalCookieOptions,
  sessionCookieName,
  signProposalSession,
} from "@/server/auth/proposalSession";
import { getAdmin } from "@/server/auth/requireAdmin";
import { attemptUnlock, openViewSession } from "@/server/proposals/access";
import { supabaseAdmin } from "@/server/supabase/adminClient";
import { clientAddress, visitorHash } from "@/server/tracking/visitor";

/* The unlock action. Parse, authorize, delegate — the policy lives in
   src/server/proposals/access.ts and the crypto in src/server/auth/. */

/** Every attempt takes at least this long, accepted or rejected.
 *
 * Flattens the timing difference between "no such proposal" (one query) and
 * "wrong password" (one query plus scrypt), and slows online guessing to a
 * crawl without a lockout a client can trigger on themselves. */
const FIXED_DELAY_MS = 300;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const submission = z.object({
  slug: z.string().min(1).max(80),
  password: z.string().min(1).max(200),
});

export type UnlockState = { error: string | null };

export async function unlockProposalAction(
  _prev: UnlockState,
  formData: FormData,
): Promise<UnlockState> {
  const startedAt = Date.now();

  /* One message for every failure below, chosen once. A visitor must not be
     able to tell "no such proposal" from "wrong password" — that is how a
     forwarded link becomes a directory of who else received one. */
  const generic = "Senha incorreta. Tente novamente.";
  const done = async (state: UnlockState): Promise<UnlockState> => {
    await sleep(Math.max(0, FIXED_DELAY_MS - (Date.now() - startedAt)));
    return state;
  };

  const parsed = submission.safeParse({
    slug: formData.get("slug"),
    password: formData.get("password"),
  });

  if (!parsed.success) return done({ error: generic });

  const { data: row } = await supabaseAdmin
    .from("proposals")
    .select("id, status, expires_at, access_epoch")
    .eq("slug", parsed.data.slug)
    .maybeSingle();

  if (!row || row.status !== "published") return done({ error: generic });

  const now = Date.now();
  if (row.expires_at !== null && Date.parse(row.expires_at) <= now) {
    return done({ error: generic });
  }

  const requestHeaders = await headers();
  const visitor = visitorHash({
    proposalId: row.id,
    ip: clientAddress(requestHeaders),
    userAgent: requestHeaders.get("user-agent") ?? "",
    now,
  });

  const outcome = await attemptUnlock({
    proposalId: row.id,
    password: parsed.data.password,
    visitorHash: visitor,
    now,
  });

  if (!outcome.ok) {
    return done({
      error:
        outcome.reason === "rate-limited"
          ? "Muitas tentativas. Aguarde alguns minutos e tente de novo."
          : generic,
    });
  }

  /* A salesperson opening the client's own link to check it. Marked, so their
     dry-run does not land in the client's numbers. */
  const admin = await getAdmin();
  const sessionId = await openViewSession({
    proposalId: row.id,
    visitorHash: visitor,
    isInternal: Boolean(admin),
  });

  const cookieStore = await cookies();

  cookieStore.set(
    proposalCookieName(row.id),
    signProposalSession({ pid: row.id, epoch: row.access_epoch }, now),
    proposalCookieOptions(),
  );

  /* The tracking session id. HttpOnly, so the collector in the browser never
     sees it — the ingest route reads it from the cookie instead. Not signed:
     forging one names a session row that does not exist and the RPC answers
     false, so there is nothing to gain and nothing to protect. */
  if (sessionId) {
    cookieStore.set(
      sessionCookieName(row.id),
      sessionId,
      proposalCookieOptions(PROPOSAL_SESSION_TTL_SECONDS),
    );
  }

  revalidatePath(`/p/${parsed.data.slug}`);
  return done({ error: null });
}
