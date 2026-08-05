---
audience: agent
status: current
verified_against: src/app/, src/components/, next.config.ts
size: 194
---

# Architecture

The system map. Deck internals are in `deck-runtime.md`; the math is in
`estimate.md`; the route table is in `../AGENTS.md` Rule 4. This file is about
what runs where and where the trust boundary sits.

> Stage status: `stages/README.md`. As of stage 2 every surface below exists.

## Three surfaces, two root layouts

```
src/app/
  favicon.ico              stays at the top level — the convention requires it
  (deck)/
    layout.tsx             ROOT #1 — html/body, Manrope, tokens + deck CSS, deck-root
    fast/layout.tsx        AccessGate lives HERE, not in the root — see below
    fast/page.tsx          → /fast    code-driven, no database
    p/[slug]/page.tsx      → /p/:slug DB-driven, server-verified password
    p/[slug]/actions.ts    the unlock server action
  (admin)/
    layout.tsx             ROOT #2 — html/body, Manrope, tokens only
    admin/**               → /admin   Supabase Auth
  api/
    p/[slug]/track         dwell flushes
proxy.ts                   repo root. /admin only. Coarse. Not the boundary.
```

**The unlock is a server action, not a route handler.** `api/p/[slug]/unlock`
was planned and is not there: the gate is a form, a form posts to an action, and
a route handler would have been a second way to do the same thing.

**`AccessGate` is scoped to `/fast`.** It was in the root layout while `/fast`
was the only route in the group; `/p/[slug]` joined that group in stage 2, and
leaving it there would have put the Nuki team's shared password in front of every
client link. `gate.css` stays in the root layout, because `ProposalGate` reuses
the same `.gate*` markup and shares none of the logic. ADR 20.

There is no `src/app/layout.tsx` and no `src/app/page.tsx`. `/` is a redirect in
`next.config.ts`, which runs before filesystem routing — that is what lets both
root layouts live inside route groups.

**Why two root layouts.** Next does not remove stylesheets on client-side
navigation. With one root layout, navigating from `/p/abc` to `/admin` would
leave `slides.css` attached to the document. Separate roots force a full page
load at the boundary — a documented caveat, here a feature.

## One render path

```
src/content/*  ──► buildDefaultDeck() ──┐
                                        ├─► resolveDeckConfig() ─► DeckConfig ─► <Deck/>
proposal row   ──► parseDeckOverride() ─┘         (server)                        (server)
```

`/fast` resolves against `null`. `/p/[slug]` resolves against the stored
override — or renders the frozen snapshot, if published. Nothing else differs.

"A proposal with no customization looks exactly like the deck" is therefore not a
property to maintain by hand: it is the identity `resolve(base, null) === base`,
which is one assertion. `resolveDeckConfig` always runs `normalizeDeck`, even
with no override — a `if (!override) return base` short-circuit would make that
identity true by vacuity and hide `buildDefaultDeck()` drifting out of normal form.

```
src/deck/
  types.ts      the SlideNode union, DeckConfig, EstimateConfig, RichText   React-free
  meta.ts       SLIDE_META — admin field schema; labels from src/content/   React-free
  defaults.ts   buildDefaultDeck() — returns an already-normalized config   React-free
  overrides.ts  DeckOverride + parseDeckOverride(), which never throws      React-free
  resolve.ts    resolveDeckConfig / normalizeDeck / mergeEstimate           React-free
  anchors.ts    anchorsOf / walkableIdsOf / visibleSlides                   React-free
  registry.tsx  renderSlide(node, ctx) — the only switch on `kind`
```

`src/deck/` is React-free above the registry, so the admin, the validator and the
DAL can import the types without pulling a single slide component into their
bundle.

**Nothing outside `registry.tsx` switches on `kind`.** Everything the chrome
needs — is it rendered, does it get a dot, is it arrow-navigable, what ordinal,
does it have a surviving child — lives on `SlideNodeBase` as `enabled`, `inNav`,
`walkable`, `ordinal`, `childId`. That is what keeps a future bespoke slide from
breaking `ProgressNav` somewhere nobody is looking.

`normalizeDeck` recomputes every derived fact from scratch after ordering and
hiding, which makes it idempotent: id uniqueness (throws in dev), orphan drop by
`parentId`, `navId`/`childId` derivation, ordinal renumbering. Optional fields are
**omitted rather than set to `undefined`** — `JSON.stringify` drops undefined
keys, so an explicit `undefined` silently breaks the JSONB round trip. There is a
test that names the offending field.

## The trust boundary

**`proxy.ts` is not it.** Next's own auth guide calls Proxy an *optimistic*
check and puts the real boundary in a data access layer. Proxy also skips Server
Functions on excluded paths, silently — so a matcher change can remove coverage
from an action without any error.

The boundary is **`src/server/proposals/dal.ts`**. It is the only path to
proposal content, and it re-reads the proposal on every request, which is what
makes revocation immediate:

```
loadProposalForVisitor(slug) → not-found | expired | locked | unlocked
```

Checked in order: published and not archived → not past `expires_at` → cookie
present → HMAC verifies (constant-time) → payload names this proposal → payload's
access epoch still matches.

`/p/[slug]` is deliberately **not** proxied: a DB round-trip in Proxy would
double the latency and still have to be re-checked in the page.

Admin authorization is `requireAdmin()`, called at the top of every admin page,
server action and route handler — **not just in the layout**. It reads the
`admin_users` table, never `user_metadata` (user-editable) and never
`app_metadata` (stale until the token refreshes).

## Cross-slide state

`EstimateProvider` is the one piece of cross-slide state. `CalculatorSlide`
computes and publishes `{imageCount, imageCost}` into it from an effect;
`PricingSlide` reads and writes months + billing cycle; `EstimatedTotalSlide`
only reads.

With a data-driven slide order the provider wraps the whole slide list rather
than a hand-picked trio. Harmless and order-independent — do not try to detect
which slides need it.

The publish-from-`useEffect` is a deliberate sync of derived state between
siblings. The alternative was lifting the entire calculator state into the
provider, which is a bigger refactor than it is worth. If you ever do it, delete
the effect and derive in the provider.

## Data

Entities are normalized; **deck configuration is one JSONB column.**

| Table | Holds |
|---|---|
| `admin_users` | authorization source of truth, FK'd to `auth.users` |
| `clients` | one construtora, many proposals over time |
| `proposals` | slug, status, expiry, `config_override`, `config_snapshot` |
| `proposal_access` | password hash + credential lifecycle |
| `proposal_access_attempts` | rate limiting and audit |
| `proposal_view_sessions` | one visit |
| `proposal_slide_views` | dwell per slide, keyed by anchor id |

`config_override` is a **delta** over the defaults, keyed by node id, so a copy
fix in `src/content/` reaches unpublished drafts. `config_snapshot` is the
resolved config frozen at publish, because a sent proposal is a commercial
document that must not change when someone edits a default months later.

Tracking keys on the **anchor id**, a stable string snapshotted into the row —
not a foreign key to a slide record. Reordering a proposal then cannot
misattribute a single millisecond of recorded attention.

Details: `data-model.md`, `security.md`, `tracking.md`.

## The server layer

```
src/server/
  supabase/serverClient.ts   two factories: read-only for a render, mutable for an action
  supabase/adminClient.ts    the secret key. Bypasses RLS. One caller in the public path
  supabase/database.types.ts generated; excluded from Biome
  auth/password.ts           scrypt hash / verify
  auth/proposalSession.ts    HMAC sign / verify, and both cookie names
  auth/requireAdmin.ts       getUser() in React cache(), reads admin_users
  config/validate.ts         the validator that REJECTS
  schemas/deckConfig.ts      zod over the stored JSONB, loose on purpose
  proposals/dal.ts           THE BOUNDARY
  proposals/access.ts        unlock, rate limit, session open
  proposals/admin.ts         admin-side writes, including publish
  tracking/record.ts         the RPC call and the bot filter
  tracking/visitor.ts        the daily-rotating visitor hash
```

Every file opens with `import "server-only"`, which is **not** a dependency:
Next's bundler aliases it to a copy it ships, and `next/types/global.d.ts`
declares it. A `"use client"` module importing any of these fails the build with
the import chain printed.

`serverClient` is two functions rather than one with a flag. Swallowing a failed
cookie write is right in a Server Component render, where cookies are read-only
and the proxy has already refreshed, and is a silent intermittent logout
anywhere else. Two names make that a choice you have to spell.
