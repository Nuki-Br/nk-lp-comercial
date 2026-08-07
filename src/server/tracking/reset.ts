import "server-only";

import { supabaseAdmin } from "@/server/supabase/adminClient";

/* The third side of tracking. `record.ts` writes it, `readout.ts` reads it, and
   this one reclassifies a rehearsal as a rehearsal after the fact.
 *
 * IT DOES NOT DELETE ANYTHING, and that is the whole design. The obvious
 * implementation of a "reset stats" button is `delete from
 * proposal_view_sessions where proposal_id = $1`, and this schema spent a
 * migration comment forbidding exactly that reasoning for proposals: the rows
 * hanging off a proposal are the record of a real client's real attention, and
 * a salesperson who clicks the wrong button must not be able to erase them.
 *
 * `is_internal` already means "one of ours, do not count it" — it is set at
 * unlock time when the visitor also carries an admin session — and every
 * read-out in the repo already filters on it: `proposalAttention`,
 * `portfolioAttention` and the admin list's `openCounts`. So flipping the flag
 * zeroes every number a salesperson can see, in one UPDATE, with no new grant
 * and nothing lost. The rows stay, marked as what they were. ADR 25.
 */

/**
 * Marks this proposal's real openings as internal tests. Returns how many rows
 * changed, which is what the composer reports back.
 *
 * The `is_internal = false` filter is load-bearing rather than an optimisation:
 * it makes a second click a no-op that honestly reports zero, instead of
 * re-counting sessions that were already excluded.
 */
export async function markProposalAttentionInternal(proposalId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("proposal_view_sessions")
    .update({ is_internal: true }, { count: "exact" })
    .eq("proposal_id", proposalId)
    .eq("is_internal", false);

  if (error) throw new Error(`Could not reset the attention data: ${error.message}`);
  return count ?? 0;
}
