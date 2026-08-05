---
audience: agent
status: current
verified_against: the decisions themselves; ADRs 9-18 record the proposal-app build, 20 the stage-2 gate split, 21 the admin UI pass, 22 the composer preview, 23 unpublish and delete, 24 the panel's motion and layout tokens
size: 682
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
| 21 | The panel gets its own token sheet, not a component library | current |
| 22 | The composer previews the deck in an iframe, on its own route | current |
| 23 | Unpublish is a fourth status; delete is the existing archive | current |
| 24 | The panel's motion and its sticky ruler are tokens, not literals | current |

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

## 21. The panel gets its own token sheet, not a component library

**Context.** The `/admin` panel was built in stage 2 as plain Tailwind on the
`--color-nuki-*` utilities — correct for a stub, and visibly unfinished once it
had five screens, nine forms and two tables. The brief was "modern, Vercel-like,
on the Nuki identity", and it came with an offer to use shadcn/ui.

**Decision.** No shadcn, no Radix, no new runtime dependency. Instead:

1. `src/styles/admin.css`, a second token sheet — the shadcn/ui *vocabulary*
   (`--background`, `--card`, `--primary`, `--muted-foreground`, `--ring`,
   `--radius`) with light and dark values, imported by `src/app/(admin)/layout.tsx`
   **in place of** `tokens.css`. `--primary` is the Nuki green 02, in oklch. The
   `--color-nuki-*` ramp is redeclared alongside it.
2. `src/components/admin/ui/` — Button, Card, Field, Badge, Alert, Spinner,
   SubmitButton, ThemeToggle, NukiLogo. Written here, ~450 lines total.
3. Geist and Geist Mono in `src/styles/fonts.ts`, used only by the panel's root
   layout. Manrope stays the deck's font, and the brand's.

**Rationale.** Rule 3 bans shadcn/Radix outright, and its stated reason —
"~15 packages and a second token layer that forks the Nuki palette" — is only
half about packages. A forked palette is the real cost: two sources of truth for
the same green, drifting. Taking the *names* without the packages gets the whole
benefit and pays neither price. `--primary` is not "close to" the Nuki green, it
is `#047676` written in oklch, and the ramp sits in the same `@theme` block.

The sheet is separate from `tokens.css` because `tokens.css` was imported by both
root layouts. A `--background`, a `body` rule and a `border-color` reset added
there would have leaked into the deck, which has its own palette, no dark theme,
and a `scroll-snap-type` invariant that `testing.md` checklist C asserts by hand.
Two sheets for two roots is the same argument as ADR 17, one layer down.

The theme is class-based (`.dark` on `<html>`) rather than
`prefers-color-scheme`, and a blocking inline script in `<head>` applies it
before the first paint. An effect would run after paint and flash white on every
navigation between panel routes. `ThemeToggle` therefore reads the DOM through
`useSyncExternalStore` rather than owning the state — the `classList` is the
truth, and it was written before React existed on the page.

**Consequence.** A fifth stylesheet and a `ui/` subdirectory under
`src/components/admin/`. Two font families in the repo, one per root layout —
ADR 17's rule was one *instance* per family, and it still holds. The panel now
has a dark theme that the deck does not, which is correct: one is a tool the team
stares at all day, the other is a document a client opens once.

The `--color-nuki-*` ramp is now declared in two files. That is a real
duplication and the one thing in this ADR worth watching: if the brand green
moves, both sheets move. The alternative — a third shared file imported by both —
buys one edit at the cost of a layer that exists to hold fourteen hex values.

## 22. The composer previews the deck in an iframe, on its own route

**Context.** The Slides tab was a checklist: a column of rows with a checkbox and
two arrow buttons. Everything it decides — what the client sees, and in what
order — was invisible until the proposal was published and opened. The brief was
to make the tab a preview with a drag-and-drop rail beside it.

**Decision.** A fifth route, `/preview/[id]`, inside the `(deck)` route group,
gated by `requireAdmin()` at the top of the page like every other admin surface.
It renders `loadProposalConfig(id).resolved` through the same `<Deck>` component
`/fast` and `/p/[slug]` use, and the composer embeds it in a same-origin iframe.

**Rationale.** The alternative was rendering `<Deck>` directly inside the
composer, and it fails on the layer table: `src/app/(admin)/` must never hold
deck CSS. `deck.css` and `slides.css` would have to be imported on the panel
side, including a `scroll-snap-type` rule with no scope and a `.slide`
`min-height: 100vh` that would fight the panel's own layout. That is the leak ADR
17 closed with two root layouts, re-opened one directory down. An iframe keeps
the two sheets in the two documents that already own them, and because it is
same origin the rail still scrolls the preview with `getElementById` — no
message protocol to keep in sync, no new DOM contract.

Rule 4 says a new surface needs an ADR, and this is it. Three properties keep it
from being a fourth *product* surface:

- **It mounts no tracking.** `<Deck>` takes `behaviors` and this route passes
  none, so the collector is not in the route's chunk. Rule 2's second test is
  answered by construction, exactly as it is for `/fast`.
- **It is not a visitor path.** `/p/[slug]` still renders the frozen snapshot
  through the DAL, and still is the only door a client has. This route reads the
  *live* delta — which is the entire point, since a salesperson previews what
  they have not published — and therefore may only ever be reachable by an admin.
- **It shows what a client would see.** `resolveForProposal` already runs the
  config through `forVisitor`, so `allowPriceOverride` is false here too. The
  `Ctrl+Alt+K` cost panel is as absent from the preview as it is from the link.

`proxy.ts` is deliberately not extended to `/preview`. Its matcher is `/admin`
and its own header says it decides nothing; the authority is the `requireAdmin()`
call in the page, and adding a path there would suggest otherwise. `next.config.ts`
does get a `Cache-Control: private, no-store` for the route, for the reason
`/p/:slug` has one: admin-gated says who may fetch it, not who may hold it.

**Consequence.** `/preview/[id]` joins the route table in `AGENTS.md`. The
preview shows the **saved** config, not the rail's pending edits, and reloads
itself after a successful save. Mirroring unsaved state live was rejected on
honesty grounds rather than cost: reordering renumbers the modules `01/02/03` and
re-anchors the nav dots, both in `normalizeDeck` on the server, so a DOM shuffled
from the panel would show a presentation that does not exist.

## 23. Unpublish is a fourth status; delete is the existing archive

**Context.** The brief was "let an admin take a proposal offline, and let an
admin delete one." Neither had a mutation, but the schema already had opinions
that made the naive version of each wrong.

For unpublish: `dal.ts`'s decision table already collapses `draft` into
`not-found`, on purpose — a draft is a document being prepared, and a visitor
must not learn it exists. Reusing `draft` for "this was live and got taken down"
would have put a proposal the client already opened behind the same wall built
to hide one they never received, and the two cases call for opposite messages.

For delete: the proposals migration already ends with the schema forbidding it —
no `DELETE` grant, no `DELETE` policy, and a comment naming `archived` as this
schema's stand-in, because the tracking rows hanging off a proposal are the
record of a real client's real attention. A "delete" that ran `DELETE FROM
proposals` would reverse that decision silently, from a feature commit that
never meant to touch it.

**Decision.**

- **Unpublish** adds a fourth `status`: `'unpublished'`, alongside `draft`,
  `published`, `archived` (migration `20260805204117`). `resolveVisitorView`
  gets its own branch for it, distinct from `not-found`, rendering "esta
  proposta não está disponível no momento" instead of "não encontrada." It sits
  between the not-found checks and the expiry check in the decision table's
  order, and `config_snapshot` / `published_at` are left untouched on
  unpublish — nothing reads them for a non-published status, so a later
  `publishProposal` simply overwrites them, which is the whole republish flow.
- **Delete** reuses `archived`. `deleteProposal` sets `status = 'archived'` and
  nothing else. `listProposals` and `getProposal` both `.neq("status",
  "archived")`, so a deleted proposal disappears from the list and its own
  detail page 404s like any other missing id — there is no "it's gone" screen
  to build, and no restore path exposed from the admin UI. `resolveVisitorView`
  needed no change: `archived` already fell into `not-found`, before this ADR,
  because nothing had ever set it.

**Rationale.** A new status is more machinery than reusing `draft` with a side
signal (e.g. "draft, but `published_at` is set"), and it was chosen anyway
because the alternative makes the DAL's decision table stop being a single
column read — every future reader of `resolveVisitorView` would need to know
that `draft` means two different things depending on a second field. `docs/
testing.md` requires that table stay enumerable by a human in one pass; a
fourth status keeps it that way, a hidden signal would not.

Delete deliberately does not get a confirmation-proof undo. The composer's
`DeleteProposalForm` is a native `<dialog>` confirmation, which stops a
misclick, not a change of mind ten minutes later — recovering a wrongly deleted
proposal means an operator flipping `status` back in the database, which is the
one appropriate cost model for the tracking rows are meant to protect. Building
a restore screen for a path with no delete grant to abuse in the first place
would be effort spent on a failure mode the schema had already made non-fatal.

**Consequence.** `proposals_status_check` now allows four values; any code that
pattern-matches on `status` and assumes three (there was exactly one:
`resolveVisitorView`) needed a new branch, and got one. `docs/security.md`'s
decision-order table and `docs/data-model.md`'s status column both gained the
fourth value. A proposal that is unpublished keeps showing in the admin list —
the checklist and pill on its detail page say why the link is down — while an
archived one does not, because "come back later" and "gone" are different facts
and the two screens now say so.

## 24. The panel's motion and its sticky ruler are tokens, not literals

**Context.** Two unrelated-looking complaints turned out to be the same one.

The composer's sticky stack — the 3.5rem panel bar plus the 7rem title-and-tabs
ruler — was written as four different literals in four files: `top-14` in the
composer layout, `lg:top-[10.5rem]` in three sticky asides, `scroll-mt-[12rem]`
in `src/components/admin/ui/Section.tsx`, and `calc(100dvh-13.75rem)` in
`src/components/admin/SlidesWorkspace.tsx`. Nothing linked them. They agreed by
memory, and the two that did not agree — 12rem against 10.5rem — differed for a
reason nobody had written down. The same held for the column itself: the list
opened with `py-8` and the composer with `py-6`, and `AdminTopBar` took the width
as a prop whose default (`max-w-5xl`) no caller passed.

Separately, the panel had no motion at all. Every state change was a jump: the
tab underline blinked from one tab to another, an alert appeared fully formed,
the theme button swapped one icon for another in the same frame in which the
whole page changed colour. A tool that is crossed dozens of times per proposal
reads as a series of reloads rather than one application.

**Decision.**

- **The stack is measured once.** `src/styles/admin.css` declares `--admin-bar`
  and `--admin-ruler`; `--admin-sticky`, `--admin-anchor` and `--admin-workspace`
  are arithmetic on them. Every sticky offset in the panel now reads a variable.
- **The column is one component.** `src/components/admin/ui/Page.tsx` exports
  `ADMIN_COLUMN` (the width plus the gutter, for full-bleed strips like the top
  bar) and `PageShell` (the `<main>`, with the padding and the brand wash).
  `AdminTopBar` lost its width prop.
- **Motion is two curves and four animations,** declared in a second `@theme`
  block in `admin.css`: `--ease-out-quart` for anything that moves or enters,
  `--ease-out-back` for what appears in place, and `rise` / `fade` / `pop` /
  `sweep` as the only entry animations the panel has. Components spend them as
  ordinary Tailwind utilities (`animate-rise`, `ease-out-quart`).

**Rationale.** Naming the two measured heights and deriving the rest is what
makes "the ruler grew by a line" a one-line edit instead of a hunt. It is the
same argument `docs/estimate.md` won for the estimate figures, applied to
layout: the repo has already lost the same number in three places once.

Four animations and two curves, rather than a per-component judgement call, is
the part that keeps this from becoming decoration. A panel where each screen
invents its own duration is how motion ages badly; a shared set means a new
screen is either `rise` or it is not animated, and there is nothing to tune.

The `@keyframes` live inside `@theme` on purpose — Tailwind only emits the ones
whose `animate-*` utility is actually used, so an animation that stops being
used stops shipping.

**Consequence.** `prefers-reduced-motion` is handled in exactly one place, the
blanket rule at the end of `admin.css`, and it now also covers `scroll-behavior`.
Any animation added to the panel later is covered by it without having to
declare anything — which is the only way that rule survives contact with a
codebase.

Two colour values moved as part of the same pass, and they are the reason the
depth reads at all: `--card` in the dark theme (0.14 → 0.165) and `--background`
in the light one (0.99 → 0.974). In both cases a card and its page were within a
hair of each other and the border was doing all the work of separating them. The
shadow ramp was rebuilt at the same time, in two layers instead of one, with a
separate and much more opaque set under `.dark` — a single-layer shadow at 1px
and 8px is a displaced grey border, not depth, and at the light theme's opacity
it is invisible over black.
