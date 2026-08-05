import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  proposalCookieName,
  sessionCookieName,
  verifyProposalSession,
} from "@/server/auth/proposalSession";
import { supabaseAdmin } from "@/server/supabase/adminClient";
import { looksAutomated, recordViewFlush } from "@/server/tracking/record";

/* Parse, authorize, delegate. No SQL and no policy here — src/server/ holds
   both. AGENTS.md's layer table is what keeps this file boring. */

export const dynamic = "force-dynamic";

const flush = z.object({
  seq: z.number().int().positive(),
  activeMsDelta: z.number().int().min(0),
  final: z.boolean().optional(),
  slides: z
    .array(
      z.object({
        anchorId: z.string().min(1).max(64),
        dwellMs: z.number().int().min(0),
        enterCount: z.number().int().min(0),
      }),
    )
    .max(64),
});

/** 204 with no body. Used for every "we are not recording this" outcome, so a
    caller cannot tell a bot filter from a missing session from a stale cookie —
    and so a broken client cannot enter a retry loop against an error. */
const noContent = () => new NextResponse(null, { status: 204 });

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  if (looksAutomated(request.headers.get("user-agent"))) return noContent();

  const { slug } = await context.params;

  const { data: row } = await supabaseAdmin
    .from("proposals")
    .select("id, status, access_epoch")
    .eq("slug", slug)
    .maybeSingle();

  if (!row || row.status !== "published") return noContent();

  /* The access cookie is re-verified here, not assumed from the session cookie.
     Tracking is only ever collected from a visitor who unlocked — a session id
     alone must not be enough, or a forwarded cookie jar becomes a way to write
     into someone else's engagement record. */
  const access = verifyProposalSession(
    request.cookies.get(proposalCookieName(row.id))?.value,
    { proposalId: row.id, accessEpoch: row.access_epoch },
    Date.now(),
  );

  if (!access.ok) return noContent();

  const sessionId = request.cookies.get(sessionCookieName(row.id))?.value;
  if (!sessionId) return noContent();

  const parsed = flush.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return noContent();

  const applied = await recordViewFlush({
    sessionId,
    seq: parsed.data.seq,
    activeMsDelta: parsed.data.activeMsDelta,
    slides: parsed.data.slides,
  });

  /* 200 whether or not the sequence was fresh. The client clears its
     accumulator on any 2xx, and a stale flush is by definition one whose
     numbers are already recorded — there is nothing for it to keep. */
  return NextResponse.json({ applied }, { headers: { "Cache-Control": "private, no-store" } });
}
