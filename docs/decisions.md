---
audience: agent
status: current
verified_against: the decisions themselves; ADRs 9-18 record the proposal-app build, 20 the stage-2 gate split
size: 453
---

# Decisions

Short records of why things are the way they are, so nobody has to re-litigate
them from scratch.

**Amending, not rewriting.** When a decision is superseded, the original body
stays exactly as written and gains an `> **Amended by ADR N**` line. An ADR is a
record of what was believed and why at a point in time; editing the body destroys
the only thing it was for.

| # | Decision | Status |
|---|---|---|
| 1 | Split out of nk-lp | current |
| 2 | No analytics at all | amended by 10 |
| 3 | The deck is the root route | amended by 9 |
| 4 | English identifiers, pt-BR copy | current |
| 5 | Anchor ids are English | current |
| 6 | One `.deck` scope | current |
| 7 | No test framework | amended by 12 |
| 8 | Committed demo artifact | current |
| 9 | The deck moves to `/fast` and stays code-driven | current |
| 10 | First-party tracking is not analytics | current |
| 11 | A dependency allowlist replaces the fixed three | current |
| 12 | Tests return, scoped to money, passwords and time | current |
| 13 | Config is one JSONB delta plus a publish snapshot | current |
| 14 | `node:crypto` over an auth library | current |
| 15 | Proxy is optimistic; the DAL is authoritative | current |
| 16 | Biome for format and lint, ESLint kept for Next rules | current |
| 17 | Two root layouts | current |
| 18 | V2 is typed in V1 and built later | current |
| 19 | The billing cycle is derived, not selected | current |
| 20 | The shared-password gate is scoped to `/fast` | current |

## 1. Split out of nk-lp

**Context.** The landing page and the sales deck were one Next.js app. The root
layout mounted Google Analytics, Microsoft Clarity and Vercel Analytics
unconditionally, so every pitch session landed in the same properties as
marketing traffic.

**Decision.** Extract the deck into its own repo and its own deployment.

**Consequence.** Some code is now duplicated across the two repos — the footer,
the module screenshots, the module slide design system. That duplication is the
price of clean analytics and is expected to drift. Do not add a shared package
to "fix" it.

## 2. No analytics at all

> **Amended by ADR 10.** The ban on third-party telemetry stands and is absolute.
> First-party proposal tracking is carved out.

**Context.** The deck previously fired Clarity events (`comercial_unlocked`,
`demo_opened`) and Vercel pageviews.

**Decision.** Strip all of it. No GA, no Clarity, no Vercel Analytics, no
replacement.

**Consequence.** No funnel data on the deck itself. Runtime dependencies are
exactly `next`, `react`, `react-dom`, which makes any reintroduction a visible
`package.json` diff. If measurement is ever wanted, it must use a *separate*
property from the landing page — otherwise this whole migration was pointless.

## 3. The deck is the root route

> **Amended by ADR 9.** The deck now lives at `/fast`; `/` redirects to `/admin`.
> The 307-not-308 reasoning below still applies to both redirects.

**Context.** It lived at `/comercial`.

**Decision.** Serve it at `/`, redirect `/comercial` → `/` with a 307.

**Consequence.** Links shared before the split point at `nukibr.com/comercial`,
which `nk-lp` still serves. The redirect here only covers this deployment's own
`/comercial`. See `docs/deployment.md`.

## 4. English identifiers, pt-BR copy

**Decision.** Code is English; every user-visible string is pt-BR.

**Consequence, learned the hard way.** The copy contains the exact words that
look like identifiers — "ciclo", "meses", "imagens", "dor", "título". A bulk
rename with word-boundary regex rewrote text inside string literals and comments,
and turned `Intl`'s own `currency` option key into `formatCurrency`, which
silently produced malformed output.

**The rule that came out of it:** bulk renames go through the TypeScript AST and
touch only `Identifier` nodes. String literals, template text, JSX text and
comments are then structurally untouchable. Object-literal *keys* are still
identifiers, so third-party option bags (`Intl`, `fetch`, React props) need a
denylist.

## 5. Anchor ids are English, except product names

**Decision.** `#capa` → `#cover`, `#problema` → `#problem`, `#o-que-e` →
`#what-is-nuki`, `#diferenciais` → `#differentiators`, `#publico` → `#audience`,
`#calculadora` → `#calculator`, `#cta` → `#pricing`.

`#planner`, `#personaliza`, `#inspetor`, `#inspetor-demo`, `#cases` and `#total`
are unchanged — they are product names or already English.

**Consequence.** Deep links shared before the split (`/comercial#calculadora`)
land on the deck but do not scroll to the section. Nothing keys off an id in
CSS, so the rename was structurally free; the only cost is those stale
fragments.

**Counter-argument, considered and rejected:** a URL fragment is user-facing
surface and closer to copy than to code, which would argue for pt-BR. Consistency
with the rest of the codebase won.

## 6. One `.deck` scope, and the scope stays

**Context.** The root element carried `className="jornada comercial"` and the two
stylesheets were scoped `.jornada` / `.comercial` — a double scope that existed
only because these sheets were shared with the landing page's journey page.

**Decision.** Collapse both to a single `.deck`, but **keep the scope rather than
dropping it.** `slides.css` defines classes named `.card`, `.grid`, `.item`,
`.step`, `.tag`, `.lead` and `.n`. Unscoped, those would collide with anything
added later and would leak into the Tailwind-styled footer.

**Consequence.** One rule became unsatisfiable and was deleted:
`.jornada:not(.comercial) .modulo-slide-pearl { display: none }` hid the
decorative pearl on the landing page. There is no landing page here, so the rule
never matched even before the collapse — the pearl always showed, and still does.

**How the rename was verified.** Class-coverage invariant: every class the page
renders must appear in a CSS selector. Before, 157 rendered / 156 styled / 1
orphan; after, 155 rendered / 154 styled / the same orphan, renamed. The drop of
exactly 2 is accounted for — `jornada`+`comercial` collapsed to `deck`, and
`on`+`ativa` collapsed to `is-active`. Method written up in
`docs/tech-debt.md`.

## 7. No test framework

> **Amended by ADR 12.** This decision was right and its premise expired. The
> insight that browser behavior is not worth unit-testing survives verbatim.

**Decision.** No Vitest, no Jest, no Playwright.

**Rationale.** A static deck whose only logic is the estimate calculator has
near-zero unit-test ROI, and the parts most likely to break — reveal observers,
keyboard nav, the demo iframe's ESC bridge — are browser behavior that unit tests
would not catch anyway. `npm run check` plus the manual checklist in `AGENTS.md`
is the guard.

**The extraction happened; the tests did not.** When the calculator gained a
second tariff (base image vs option image), the math moved out of
`CalculatorSlide.tsx` into `src/lib/estimate.ts` — pure, React-free, and small
enough to read in one sitting. That was for legibility, not for testability: the
slide was already 850 lines. If the pricing is ever disputed in a sales call,
that single file is now the thing to test, and it is the only file in the repo
worth a test at all.

## 8. Committed demo artifact

`public/demos/inspetor/index.html` (5.7 MB) is committed rather than generated
during the build, because `scripts/prepare-inspetor-demo.mjs` is a manual step
that patches a Claude Design export and would be fragile in CI. The cost is repo
size; the benefit is that a stale patch regex cannot silently break a deploy.

---

The records below cover the move from a single static deck to a proposal app —
with one exception, ADR 19, which is a deck-era decision that lost its number and
was given the next free one rather than displacing a cited record.

## 9. The deck moves to `/fast` and stays code-driven

**Context.** `/` has to become the admin panel, but the team still needs a deck
they can open in thirty seconds for an unplanned pitch.

**Decision.** The existing deck moves to `/fast`, keeps its current
`AccessGate` — shared password, client-side, `localStorage` — and stays driven by
`src/content/` with **no database dependency at all**.

**Consequence.** `/fast` works when Supabase is down, which is the point: a live
client meeting is the worst possible moment to discover a hosted dependency is
unavailable. The cost is that `/fast` keeps the known weakness — the gate is
client-side, so the full HTML including pricing is in the payload for anyone who
fetches the page. That was accepted knowingly. It stays `noindex` three ways
(`next.config.ts` header, layout metadata, `public/robots.txt`); keep all three.

`/comercial` now redirects to `/fast` rather than `/`, or shared pitch links
would land prospects on a login screen.

**Rejected:** putting `/fast` behind admin auth. It closes the leak and costs the
offline guarantee. The guarantee won.

## 10. First-party tracking is not analytics

**Context.** The product needs to know when a client opened a proposal, how often
and where their attention went. ADR 2 bans telemetry in absolute language, and
`AGENTS.md` named `sendBeacon` specifically.

**Decision.** Narrow the rule to what it always meant. Third-party telemetry
stays banned without exception. First-party engagement data, written to our own
Postgres, from our own origin, about a proposal we issued to a named client, is
allowed — and only inside the `/p/[slug]` render path.

The test is three questions, not an API list: does the request leave our origin;
is the collector reachable from `/fast` or `/admin`; does it add a vendor SDK.

**Consequence.** `sendBeacon` stays banned by name — honouring the letter of the
old rule costs nothing, because `fetch(url, {keepalive: true})` is the same
underlying mechanism and is strictly better here: it can set a JSON content type
and **read the response**, which the sequence-acknowledgement protocol needs.

The verification ADR 2 implied still holds exactly: a full scroll-through shows
zero third-party requests. CI greps the built client chunks for non-allowlisted
origins so the promise is mechanical rather than remembered.

## 11. A dependency allowlist replaces the fixed three

**Context.** "Runtime dependencies are exactly `next`, `react`, `react-dom`" was
stated as an absolute. Its own rationale in ADR 2 gives the real purpose: it
makes any reintroduction of analytics *a visible `package.json` diff*.

**Decision.** Replace the count with a table: an allowlist, a ban list, and the
requirement that any addition ships an ADR in the same commit.

**Consequence.** Three additions — `@supabase/supabase-js`, `@supabase/ssr`,
`zod`. Everything a library would normally be reached for is instead in the
standard library or the database, and the ban list says so by name so the
question is not re-opened: `node:crypto` for scrypt and HMAC, `Intl` for dates
and currency, `crypto.randomUUID()`, a table and an indexed `count(*)` for rate
limiting, a table and CSS bars for charts.

`zod` is confined to `src/server/schemas/`, every file opening with
`import "server-only"`, so it can never enter a client bundle — a build error if
anyone tries.

**The tripwire is unaffected.** Adding an analytics SDK is still a one-line diff
that a reviewer cannot miss.

## 12. Tests return, scoped to money, passwords and time

**Context.** ADR 7 reasoned from "a static deck whose only logic is the estimate
calculator". The repo now contains pricing driven by database config, password
hashing, signed-cookie expiry, and an access-control boundary.

**The evidence is in this repo's own history.** `AGENTS.md` asserted preset
totals of 208 / 678 / 1.544 while the code produced 284 / 507 / 738, and the same
numbers were restated in two other files. A ten-line test would have caught it
the day the preset compositions changed.

**Decision.** Vitest, dev-dependency, with a written ceiling. Tested: the
estimate math (the four canonical scenarios, count and cost), the `DeckConfig`
JSON round trip, password hash/verify, cookie validity and tampering, and the
DAL decision table with its fetcher injected so CI needs no database.

**Consequence.** `npm run check` gains a test run. Slide components, snapshots,
`DeckBehaviors`, the demo iframe, keyboard nav and reveal observers stay untested
— ADR 7's real insight, that these are browser behaviors unit tests would not
catch, is correct and survives.

**RLS is the honest gap.** Vitest cannot cover it. Rather than fake a test, the
posture is stated: RLS is defense in depth, not the primary control — public
proposal reads go through the DAL with the service key *after* cookie
verification. `supabase/tests/rls.sql` is checked in to run against a branch by
hand. If RLS ever becomes the primary control, it needs a real harness and this
ADR needs revisiting.

## 13. Config is one JSONB delta plus a publish snapshot

**Context.** Per-proposal customization could be normalized tables (a row per
slide, per plan, per billing cycle) or a JSON document.

**Decision.** `DeckConfig` is a single TypeScript type and the contract between
all three build stages. `proposals.config_override` stores a **delta** over the
defaults; `proposals.config_snapshot` stores the **resolved config, frozen at
publish**. Only entities — clients, proposals, credentials, sessions — get tables.

**Why a delta.** An untouched proposal *is* `buildDefaultDeck()`, so "renders
identically to the deck" becomes the identity `resolve(base, null) === base`
rather than a property maintained by hand. Copy fixes in `src/content/` reach
unpublished drafts for free.

**Why also a snapshot.** A sent proposal is a commercial document. It must not
change because someone edited a default price two months later. The delta is what
the admin edits; the snapshot is what the client sees.

**Why not normalized config tables.** They would make the schema the contract
instead of the type, which breaks the staged build: stage 1 could no longer
define the shape by proving it renders. They also bring transactional reorders
with deferrable constraints — real surface for an agent to get subtly wrong.

**Consequence, accepted.** Cross-proposal reporting on plan prices is a JSONB
query rather than a `SELECT` over a column. At this volume that is fine. Deltas
are keyed by node **id**, never by array index, so reordering cannot scramble
patches; unknown ids are dropped rather than throwing, so a rollback does not 500
a live pitch.

## 14. `node:crypto` over an auth library

**Decision.** scrypt (N=16384, r=8, explicit 64 MiB `maxmem`) for password
hashing, `timingSafeEqual` for comparison, and HMAC-SHA256 for the access cookie.
No bcrypt, no argon2, no JWT package.

**Rationale.** The Edge constraint that would have forced Web Crypto does not
exist: Next 16 Proxy runs on Node and cannot be configured otherwise. scrypt is
memory-hard and in the standard library. bcrypt silently truncates at 72 bytes.
argon2 means a native binary in a Vercel bundle for a marginal gain. `pgcrypto`
would send the plaintext to the database, where an error can log it.

The cookie is signed, not encrypted — the payload is not secret, only
unforgeable — and there is no third party to interoperate with, so a JWT library
would be twenty lines of `createHmac` wrapped in a dependency.

**Consequence.** `maxmem` must be set explicitly: N=16384/r=8 needs 16 MiB and
Node's 32 MiB default is close enough to trip `ERR_CRYPTO_INVALID_SCRYPT_PARAMS`
under concurrency. Passwords are `.normalize("NFKC")`-ed before hashing, or an
accented character typed on iOS will not match the same character typed on macOS.

**Password recall.** The product decision is that a salesperson can re-read a
proposal's password months later, so the plaintext is stored in Supabase Vault,
readable only by the service client. Verification still runs against the scrypt
hash, never against the stored plaintext. The trade is explicit: a database dump
exposes client passwords. Show-once-and-reroll was offered and declined.

## 15. Proxy is optimistic; the DAL is authoritative

**Context.** The obvious design is "check the session in middleware".

**Decision.** Two things make that wrong here. First, in Next 16 the file is
`proxy.ts`, not `middleware.ts` — a `middleware.ts` file is silently never
executed. Second, Next's own guide states that Proxy "should not be used as a
full session management or authorization solution", and that Proxy matchers skip
Server Functions, so a matcher edit can remove coverage from an action with no
error.

Proxy therefore covers `/admin/**` only, does a cheap `getClaims()` for token
refresh and an optimistic redirect, and decides nothing about content.
`/p/[slug]` is not proxied at all: a database round-trip there would double every
request's latency and still have to be re-checked in the page.

**Consequence.** `requireAdmin()` is called at the top of every admin page,
action and route handler — layout-only gating is a known hole. It uses
`getUser()`, wrapped in React `cache()`, because a deactivated teammate must lose
access on the next page load rather than whenever their token happens to expire.
Authorization reads the `admin_users` table, never `user_metadata`, which the
user can edit themselves.

## 16. Biome for format and lint, ESLint kept for Next rules

**Decision.** Biome owns formatting, import organization and the fast lint pass.
`eslint.config.mjs` is stripped to `eslint-config-next/core-web-vitals` only,
with every stylistic and TypeScript rule off so the two never fight.

**Rationale, including what is lost.** Biome 2.x covers the hooks rules and some
Next rules, but does not reimplement `no-html-link-for-pages`, `no-sync-scripts`,
`no-unwanted-polyfillio` or several core-web-vitals rules. Dropping ESLint
entirely loses them silently. Revisit when Biome's Next domain matures.

**Consequence.** Two landmines, both configured rather than remembered:
`files.includes` must exclude `public/demos/**`, `src/HTML/**` and `.next/**`, or
the formatter is pointed at a 5.7 MB single-line artifact; and CSS formatting is
**off**, because reformatting 3,366 lines of stylesheet produces a diff nobody
can review against a requirement of "visual identity preserved exactly". Both are
recorded in `tech-debt.md` as separately shippable.

## 17. Two root layouts

**Decision.** `src/app/(deck)/layout.tsx` and `src/app/(admin)/layout.tsx` are
both root layouts. `src/app/layout.tsx` and `src/app/page.tsx` are deleted; `/`
becomes a redirect in `next.config.ts`.

**Rationale.** Next uses React's stylesheet support and does not remove
stylesheets on client-side navigation. With one root layout, navigating from a
proposal to `/admin` leaves `slides.css` attached — including the `<html>`-level
`scroll-snap-type` rule and the unscoped `.gate*` block. Separate roots force a
full page load at the boundary, which makes the isolation provable instead of
hoped for.

**Consequence.** Tailwind's preflight compiles into both layout chunks; only one
loads per route. Manrope is extracted to a single module so two `next/font` calls
do not produce two font instances. `favicon.ico` stays at the top level of
`src/app/` — route groups do not relocate it. Deleting the old root layout and
page must happen in one commit: a page with no root layout above it is a build
error.

## 18. V2 is typed in V1 and built later

**Context.** V2 is per-slide copy overrides and bespoke client-specific slides.
Building it now would double the admin surface before anyone has used V1.

**Decision.** Make V2 additive by construction, then do not build it. Concretely,
these must be true in V1: the slide union is open and the registry's `default`
arm returns `null` rather than throwing, so a config written by a newer deploy
degrades instead of 500-ing a live pitch; overrides are keyed by stable node ids;
nothing outside the registry switches on `kind`; and slide metadata carries an
admin-facing field schema rather than just a label.

**The one V1 cost worth paying.** Every human-visible string should move into
config in V1 — including the ones the V1 admin never exposes. If `CasesSlide`'s
logo list and `CalculatorSlide`'s inline labels are still module imports when V1
ships, V2 has to re-open all ten slide files. One pass now, two passes later.

## 19. The billing cycle is derived, not selected

> **Renumbered, not new.** This ADR was written as number 8 and never appeared in
> the table above; the number it was using had been given to "Committed demo
> artifact", and a second ADR had ended up numbered 9. Of the two self-consistent
> repairs, this is the one that breaks no citation: `.env.example` and
> `src/app/(deck)/fast/layout.tsx` both cite ADR 9 meaning "the deck moves to
> `/fast`", and nothing anywhere cites ADR 8. The body below is untouched.

**Decision.** `EstimateProvider` has no `cycle` state. The cycle is computed from
the contracted months (`cycleForMonths` in `src/lib/pricing.ts`, thresholds in
`billingCycles[].minMonths`), and the toggle in `PricingSlide` renders that
result. Clicking a cycle writes months, not cycle.

**Rationale.** The discount is the counterpart of the commitment, so the two were
never independent. As separate state they could disagree — 12 months contracted
while the toggle said "Mensal", quoting full price for a commitment that earns
−10% — and the prospect sees both numbers on the same frame. Deriving one from
the other makes that state unrepresentable instead of merely unlikely.

**Consequence.** `selectCycle` only writes `months[0]`. That is correct while
`plans` has a single entry; if the tiers come back, the distribution across tiers
has to be decided before the toggle means anything again.

## 20. The shared-password gate is scoped to `/fast`, not to the deck group

**Context.** `AccessGate` was mounted in `src/app/(deck)/layout.tsx`, which was
correct while `/fast` was the only route in the `(deck)` group. Stage 2 adds
`/p/[slug]` to that same group, because a proposal is a deck and needs the deck
stylesheets and the `deck-root` class.

**Decision.** Move the gate down into `src/app/(deck)/fast/layout.tsx`. Keep
`gate.css` imported by the root layout.

**Rationale.** Left where it was, the root layout would have put the Nuki team's
own shared password in front of every client link, and a client holding a valid
proposal cookie would have been shown a form asking for a password nobody gave
them. The two gates are not variants of one idea, they are opposites: ADR 9's
gate is a client-side speed bump that must keep working with Supabase down, and
the proposal gate is a server-verified boundary that must never emit content it
has not authorized. Only the first kind belongs in a layout.

`gate.css` stays in the root layout because `ProposalGate` reuses the `.gate*`
markup — the same CSS, deliberately, so the two surfaces look like one product
while sharing none of the logic.

**Consequence.** `/fast` gains a one-line nested layout, which looks like
indirection until you know why it exists. That is what this record is for.
