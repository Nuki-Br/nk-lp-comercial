"use client";

import { useEffect, useRef } from "react";
import { useDeckNavigation } from "@/components/deck/DeckNavigation";

/**
 * Per-slide dwell collection. Mounted ONLY from the `/p/[slug]` render path.
 *
 * It is passed into `<Deck>` as a slot rather than imported by it, and that is
 * load-bearing: an import inside `Deck.tsx` would put this module in the chunk
 * `/fast` loads, and Rule 2's second test — "is the collecting code reachable
 * from /fast or /admin" — would fail at the bundle level even though it never
 * ran. `/fast` must emit zero tracking requests, and the way to guarantee that
 * is for the code not to be there.
 *
 * Returns null, like `DeckBehaviors`, so the `.deck` DOM is byte-identical.
 */

type Accumulated = { dwellMs: number; enterCount: number };

/* The same geometry `DeckBehaviors` uses for the progress nav. Reused rather
   than re-derived: two definitions of "the active slide" would drift, and the
   numbers a salesperson reads would stop matching the dot the client saw. */
const OBSERVER_OPTIONS: IntersectionObserverInit = {
  rootMargin: "-50% 0px -50% 0px",
  threshold: 0,
};

const FLUSH_INTERVAL_MS = 15_000;

export function DeckTracking({ slug }: { slug: string }) {
  const { getWalkableIds } = useDeckNavigation();

  useEffect(() => {
    const endpoint = `/api/p/${encodeURIComponent(slug)}/track`;
    const seqKey = `nk_seq_${slug}`;

    const pending = new Map<string, Accumulated>();
    let activeId: string | null = null;
    let activeMs = 0;
    let lastAt = Date.now();
    let inFlight = false;

    /* Starts at 1, NOT 0. `flush_seq` defaults to 0 and the RPC accepts only a
       strictly greater value, so a client counting from zero would have every
       flush silently rejected and the proposal would read as never opened. */
    const readSeq = (): number => {
      const stored = Number(sessionStorage.getItem(seqKey));
      return Number.isInteger(stored) && stored >= 1 ? stored : 1;
    };

    /** Time is only counted while the tab is actually being looked at. */
    const accrue = () => {
      const now = Date.now();
      const elapsed = now - lastAt;
      lastAt = now;
      if (document.visibilityState !== "visible" || elapsed <= 0) return;

      activeMs += elapsed;
      if (!activeId) return;

      const entry = pending.get(activeId) ?? { dwellMs: 0, enterCount: 0 };
      entry.dwellMs += elapsed;
      pending.set(activeId, entry);
    };

    const setActive = (id: string) => {
      if (id === activeId) return;
      accrue();
      activeId = id;
      const entry = pending.get(id) ?? { dwellMs: 0, enterCount: 0 };
      entry.enterCount += 1;
      pending.set(id, entry);
    };

    /**
     * Deltas, never totals, and the accumulator is cleared only on a 2xx.
     *
     * A lost response therefore resends the SAME seq with a superset of the
     * deltas, which the RPC rejects because `p_seq > flush_seq` is false. The
     * trade is deliberate: a dropped response loses a few seconds of dwell
     * rather than double-counting them. An overcount would be invisible and
     * would make a salesperson believe a client read the proposal twice.
     */
    const flush = (final: boolean) => {
      accrue();
      if (inFlight && !final) return;

      const slides = [...pending].map(([anchorId, value]) => ({ anchorId, ...value }));
      if (!final && activeMs === 0 && slides.length === 0) return;

      const seq = readSeq();
      const body = JSON.stringify({ seq, activeMsDelta: activeMs, slides, final });

      inFlight = true;

      /* keepalive, not sendBeacon. AGENTS.md bans sendBeacon by name, and it is
         the wrong tool anyway: it cannot set a JSON content type and cannot read
         the response, which this acknowledgement protocol needs. */
      fetch(endpoint, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body,
      })
        .then((response) => {
          if (!response.ok) return;
          pending.clear();
          activeMs = 0;
          sessionStorage.setItem(seqKey, String(seq + 1));
        })
        .catch(() => {
          /* Offline, or the page is going away. The accumulator is intact and
             the seq has not advanced, so the next flush retries the same
             payload. Nothing to report to the visitor — this is telemetry, and
             it must never be visible to the person being measured. */
        })
        .finally(() => {
          inFlight = false;
        });
    };

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActive(entry.target.id);
      }
    }, OBSERVER_OPTIONS);

    for (const id of getWalkableIds()) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }

    /* `visibilitychange -> hidden` fires reliably before iOS freezes a page,
       which `beforeunload` does not. `pagehide` is the last word. */
    const onVisibility = () => {
      accrue();
      if (document.visibilityState === "hidden") flush(false);
    };
    const onPageHide = () => flush(true);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    const interval = window.setInterval(() => flush(false), FLUSH_INTERVAL_MS);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      clearInterval(interval);
      flush(true);
    };
  }, [getWalkableIds, slug]);

  return null;
}
