---
audience: agent
status: current
verified_against: src/components/deck/DeckTracking.tsx, src/app/api/p/[slug]/track/route.ts, src/server/tracking/readout.ts
size: 151
---

# Tracking

Which slides a named client actually read, and for how long. Table shapes are in
`data-model.md`; who is allowed to write them is in `security.md`.

## Why this is not the thing Rule 2 bans

ADR 2 banned telemetry in absolute language. ADR 10 narrowed it to what it always
meant, with a three-question test that is about the request and not about the
API:

1. **Does it leave our origin?** No. Same-origin `fetch` to our own route.
2. **Is the collector reachable from `/fast` or `/admin`?** No — and this is
   enforced structurally, not by convention. See "The bundle boundary" below.
3. **Does it add a vendor SDK?** No. There is no dependency.

`navigator.sendBeacon` stays banned **by name**, and honouring the letter of the
old rule costs nothing: `fetch(url, { keepalive: true })` is the same underlying
mechanism, sets a JSON content type, and — decisively — can read the response,
which the acknowledgement protocol needs.

## The bundle boundary

`DeckTracking` is passed into `<Deck>` as the `behaviors` prop from
`/p/[slug]`'s page. **`Deck.tsx` does not import it.**

That is not style. An import inside `Deck.tsx` would place the collector in the
chunk `/fast` loads, and question 2 above would be false at the bundle level even
though the code never ran. Both components return `null`, so the `.deck` DOM is
byte-identical either way.

It is measured rather than asserted: after a build, the collector appears in
exactly one client chunk, and none of the chunks `/fast` loads is that chunk.

## What is collected

Per session: `active_ms`, `started_at`, `last_seen_at`, `is_internal`.
Per slide: `anchor_id`, `dwell_ms`, `enter_count`.

**What is not stored anywhere: the IP and the user agent.** Both are inputs to
`visitorHash` and exist nowhere else — not a column, not a log line. The key
rotates by UTC day, so two visits on different days do not correlate, and the
proposal id is inside the message, so the same visitor hashes differently for
every client.

## "The active slide" has one definition

The observer is `rootMargin: "-50% 0px -50% 0px"`, `threshold: 0`, over the
walkable ids from `DeckNavigation` — **the same geometry `DeckBehaviors` uses for
the progress nav**, deliberately reused rather than re-derived.

Two definitions would drift, and the drift would be invisible: a salesperson
would read dwell numbers that disagree with the dot the client actually saw.

Time accrues only while `document.visibilityState === "visible"`. A proposal left
open in a background tab overnight is not eight hours of attention.

## Three guards against double counting

Engagement numbers are read by a human deciding how to run a sales call, so an
overcount is worse than an undercount: it is invisible and it is believed.

1. **The session id lives in a cookie**, set by the unlock action. A refresh does
   not create a second session, and a session cannot exist without a successful
   password POST.
2. **A monotonic `seq`** in `sessionStorage`. The RPC applies a flush only when
   `p_seq > flush_seq`.
3. **Deltas, never totals**, and the accumulator is cleared only on a 2xx.

Together they make a lost response cost a few seconds of dwell instead of
doubling it: the retry carries the *same* seq with a superset of the deltas, and
the RPC rejects it.

> **`flush_seq` starts at 0 and the client's first flush must carry `seq = 1`.**
> A client counting from zero has every flush rejected, silently, and the
> proposal reads as never opened. This is the failure mode most likely to be
> reintroduced by someone rewriting the collector.

## Flush triggers

- `visibilitychange → hidden`. Fires reliably before iOS freezes a page, which
  `beforeunload` does not.
- A 15 s interval, skipped when the delta is zero.
- `pagehide`, with `final: true`.

## Both writes in one RPC

`record_view_flush(p_session_id, p_seq, p_active_ms_delta, p_slides)` updates the
session and upserts the slide rows in a single call, so the sequence check and
the dwell accumulation cannot diverge. Two round trips could interleave with a
concurrent flush, or bump the sequence and then fail to apply the deltas.

`SECURITY INVOKER`, `EXECUTE` revoked from `PUBLIC` **and explicitly from `anon`
and `authenticated`** — Supabase's default privileges grant it to those roles by
name, and revoking from `PUBLIC` alone left the function callable. That was found
by calling it, not by reading the migration; the fifth migration closes it.

The function clamps every delta. These numbers arrive from a browser, and a
negative or absurd value is a bug or an attack — neither should be able to write
a fictional number into a client's engagement record.

## Bot filter

The structural defence does most of the work: a session requires a successful
password POST, so a crawler must guess a password first. On top of that the
ingest route returns **204 without writing** for an empty or automated user
agent.

The denylist is short on purpose. A long one catches marginally more and starts
rejecting real browsers with unusual strings.

## Internal traffic

A tracking request that also carries a valid admin session sets `is_internal` on
the session, so a salesperson opening the client's own link to check it does not
pollute the client's numbers. The admin list counts only `is_internal = false`.

## The read-out

`src/server/tracking/readout.ts` aggregates it; `AttentionTable` renders it on
the proposal detail page. Sessions where `is_internal` is true are excluded from
every number, the same way the admin list already counts opens.

**Sorted by dwell descending.** The question is "where did they stop", so that is
the first row rather than whichever slide comes first in the deck.

**A table and CSS bars** — a column of divs with a percentage width, per Rule 3.
The bar is `aria-hidden`, because the duration beside it is the same fact.

**An anchor the config no longer contains is kept, labelled by its raw id.**
That is the payoff of `anchor_id` being a text snapshot: the row proves the
client read a slide that has since been removed, and dropping it would undo the
reason the column is not a foreign key.

Aggregation is a JavaScript loop over two queries rather than a `group by`. It is
two queries because `proposal_slide_views` carries no `proposal_id` — by design —
and a loop because a proposal is read by a handful of people at one construtora.
If one ever accumulates thousands of sessions, that becomes a function and a
migration; the file says so at the top.

## What is not built yet

Nothing in this document. Tracking is complete as specified — collection in
stage 2, read-out in stage 3. Anything beyond dwell was out of scope for both.
