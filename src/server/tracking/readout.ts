import "server-only";

import type { SlideNode } from "@/deck/types";

/* The read-out side of tracking. `record.ts` is the write side.
 *
 * Reads go through the admin client because both tables are RLS-enabled with no
 * grant to `authenticated` at all — they are service-role only, which is what
 * makes "the client's attention data is not reachable from a browser" a grant
 * rather than a policy anyone has to get right.
 *
 * Aggregation happens in JavaScript rather than in SQL. That is a volume
 * judgement, stated so the next person can overturn it with a number: a proposal
 * is read by a handful of people at one construtora, so this is tens of rows,
 * and a `group by` here would mean a migration — hand-authored, forward-only,
 * permanent — to save a loop. If a proposal ever accumulates thousands of
 * sessions, move it into a function and delete this comment. */

export type SlideAttention = {
  anchorId: string;
  /** The slide's label, or the raw anchor id when the config no longer has it. */
  label: string;
  dwellMs: number;
  enterCount: number;
  /** Share of the highest dwell in this proposal, 0..1. Drives the CSS bar. */
  share: number;
};

export type ProposalAttention = {
  sessionCount: number;
  firstOpenAt: string | null;
  lastSeenAt: string | null;
  totalActiveMs: number;
  slides: SlideAttention[];
};

const EMPTY: ProposalAttention = {
  sessionCount: 0,
  firstOpenAt: null,
  lastSeenAt: null,
  totalActiveMs: 0,
  slides: [],
};

/**
 * What the client actually read, and for how long.
 *
 * `is_internal = false` throughout: a salesperson opening the client's own link
 * to check it must not appear in the client's numbers. The admin list already
 * counts opens the same way.
 */
export async function proposalAttention(
  proposalId: string,
  slides: SlideNode[],
): Promise<ProposalAttention> {
  /* Lazy, like everywhere else that touches this client: it reads its
     environment at module load and throws without it. */
  const { supabaseAdmin } = await import("@/server/supabase/adminClient");

  const { data: sessions, error } = await supabaseAdmin
    .from("proposal_view_sessions")
    .select("id, started_at, last_seen_at, active_ms")
    .eq("proposal_id", proposalId)
    .eq("is_internal", false)
    .order("started_at", { ascending: true });

  if (error) throw new Error(`Could not read the view sessions: ${error.message}`);
  if (!sessions?.length) return EMPTY;

  /* Two queries, not a join: `proposal_slide_views` keys on `session_id` and
     carries no proposal_id — deliberately, so that re-configuring a proposal
     cannot re-attribute recorded attention. */
  const { data: views, error: viewsError } = await supabaseAdmin
    .from("proposal_slide_views")
    .select("anchor_id, dwell_ms, enter_count")
    .in(
      "session_id",
      sessions.map((s) => s.id),
    );

  if (viewsError) throw new Error(`Could not read the slide views: ${viewsError.message}`);

  const totals = new Map<string, { dwellMs: number; enterCount: number }>();
  for (const view of views ?? []) {
    const current = totals.get(view.anchor_id) ?? { dwellMs: 0, enterCount: 0 };
    totals.set(view.anchor_id, {
      dwellMs: current.dwellMs + view.dwell_ms,
      enterCount: current.enterCount + view.enter_count,
    });
  }

  /* Labels resolve from the proposal's own config. An anchor with no match is
     kept and shown by its raw id rather than dropped: `anchor_id` is a text
     snapshot taken at the moment of the visit precisely so a later reorder
     cannot rewrite history, and hiding the rows that prove it would undo the
     point of storing it that way. */
  const labels = new Map(slides.map((node) => [node.id, node.label]));
  const peak = Math.max(...[...totals.values()].map((t) => t.dwellMs), 0);

  return {
    sessionCount: sessions.length,
    firstOpenAt: sessions[0].started_at,
    lastSeenAt: sessions.reduce(
      (latest, s) => (s.last_seen_at > latest ? s.last_seen_at : latest),
      sessions[0].last_seen_at,
    ),
    totalActiveMs: sessions.reduce((sum, s) => sum + s.active_ms, 0),
    slides: [...totals.entries()]
      .map(([anchorId, t]) => ({
        anchorId,
        label: labels.get(anchorId) ?? anchorId,
        dwellMs: t.dwellMs,
        enterCount: t.enterCount,
        share: peak > 0 ? t.dwellMs / peak : 0,
      }))
      /* Dwell descending. The question a salesperson is actually asking is
         "where did they stop", so that has to be the first row — not the slide
         that happens to come first in the deck. */
      .sort((a, b) => b.dwellMs - a.dwellMs),
  };
}
