import "server-only";

import { supabaseAdmin } from "@/server/supabase/adminClient";

/* The ingest side of tracking. One RPC, because the sequence check and the dwell
   accumulation must not be able to diverge — see the comment on
   `record_view_flush` in the migration. */

export type SlideDelta = { anchorId: string; dwellMs: number; enterCount: number };

/**
 * Returns whether the flush was applied. `false` means the sequence was stale —
 * a replayed beacon, a double-fired `pagehide`, or a page restored from bfcache.
 * The route answers 200 either way: the client has nothing useful to do with the
 * difference, and telling it would only invite a retry loop.
 */
export async function recordViewFlush(input: {
  sessionId: string;
  seq: number;
  activeMsDelta: number;
  slides: SlideDelta[];
}): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("record_view_flush", {
    p_session_id: input.sessionId,
    p_seq: input.seq,
    p_active_ms_delta: input.activeMsDelta,
    p_slides: input.slides.map((slide) => ({
      anchorId: slide.anchorId,
      dwellMs: slide.dwellMs,
      enterCount: slide.enterCount,
    })),
  });

  if (error) throw new Error(`Tracking flush failed: ${error.message}`);
  return data === true;
}

/* Bots that get this far are already unusual — a tracking session requires a
   successful password POST, which is most of the defence. This is the cheap
   second layer for link previewers and archivers that follow a shared URL with
   a cookie jar they inherited.

   Deliberately short. A long denylist is a maintenance burden that catches
   marginally more and starts rejecting real browsers with unusual strings. */
const BOT_PATTERN =
  /bot|crawler|spider|crawling|slurp|facebookexternalhit|preview|headless|monitor|curl|wget|python-requests|axios/i;

export const looksAutomated = (userAgent: string | null): boolean =>
  !userAgent || BOT_PATTERN.test(userAgent);
