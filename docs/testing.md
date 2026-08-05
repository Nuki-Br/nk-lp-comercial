---
audience: agent
status: current
verified_against: package.json scripts, ADR 7 and ADR 12, src/server/**/*.test.ts
size: 269
---

# Testing

## The policy, in one sentence

**There are no tests for the deck, deliberately. There are tests for money,
passwords and time, mandatorily.**

ADR 7 decided against a test framework and was right. Its premise — "a static
deck whose only logic is the estimate calculator" — expired when the repo gained
pricing driven by database config, password hashing, signed-cookie expiry and an
access-control boundary. ADR 12 records the change and what survived from ADR 7.

The evidence that this was needed is in the repo's own history: `AGENTS.md`
asserted preset totals of 208 / 678 / 1.544 while the code produced 284 / 507 /
738, restated in two other files.

## What is tested

Vitest, dev-dependency only. No database in CI — which is a design constraint
that pays back, because it forces the DAL to take an injectable fetcher, and that
is what makes its decision table testable at all.

| File | Assertions |
|---|---|
| `src/lib/estimate.ts` | the four canonical scenarios, image count **and** cost — the table in `estimate.md`; the materialize/aliasing guards; `formatCurrency`'s NBSP |
| `src/deck/defaults.ts` | JSON round trip; `resolve(base, null) === base`; `normalizeDeck` idempotence; disabled slides skipped by `anchorsOf`; orphan-demo drop; ordinal renumbering; arrays replace in `mergeEstimate`; `parseDeckOverride` never throws |
| `src/server/auth/password.ts` | hash/verify round trip; wrong password fails; comparison is timing-safe |
| `src/server/auth/proposalSession.ts` | valid cookie accepted; expired-by-1s rejected; one-byte-tampered rejected; proposal A's cookie rejected for proposal B |
| `src/server/proposals/dal.ts` | the decision table `(row, cookie, now) → ok \| locked \| expired \| not-found`, fetcher injected; drafts are not-found; a stale `access_epoch` locks out; `allowPriceOverride` is forced false; the `locked` result has exactly two keys |
| `src/server/config/validate.ts` | rejects demo-without-module, total-without-calculator, negative price, discount ≥ 1, an empty or non-ascending cycle list — and accepts the shipped default deck, which is what stops a validator that rejects everything from passing every other case; warns without blocking on total-without-pricing |
| `src/server/proposals/config.ts` | the delta merge (`estimate` merges one level so two forms cannot overwrite each other); `enabledDelta` against the shipped defaults; `isSnapshotStale` deep-compares and survives reordered keys |
| `src/deck/v2Hooks.test.ts` | the ADR 18 hooks: the union stays open, `slideMetaOf` degrades, `copy` round-trips unread, `custom` is the only addable kind |

## What is not tested, and why

Slide components, snapshots, `DeckBehaviors`, the demo iframe, keyboard
navigation, reveal observers.

These are browser behaviors that unit tests would not catch. Testing them buys
false confidence, which is worse than no confidence because it stops you running
the manual checklist. This is ADR 7's real insight and it is still correct.

## RLS is the honest gap

Vitest cannot cover row-level security. Rather than fake a test, state the
posture: **RLS is defense in depth, not the primary control.** Public proposal
reads never touch the anon key — they go through the DAL with the service key
*after* cookie verification.

`supabase/tests/rls.sql` is checked in to run by hand against a Supabase branch,
because it needs `psql`. Four assertions, and the third is the one that
exercises a POLICY rather than a grant:

1. `anon` cannot reach a single `proposals` row.
2. `anon` **errors** on `proposal_access` and on the tracking tables.
3. A signed-in user with **no `admin_users` row** selects zero proposals.
4. `anon` cannot execute `record_view_flush`.

> The schema went further than this file originally anticipated. It revokes the
> tables from `anon` outright, so the first assertion sees `permission denied`
> rather than an empty set — strictly stronger, because it does not depend on a
> policy being correct. The script accepts either and fails on data.

The grant half of this was additionally verified over HTTP against the real
project, which `scripts/db-smoke.mjs` now does on every run. The policy half —
assertion 3 — has only ever been checked by reading. If RLS ever becomes the
primary control, it needs a real harness and ADR 12 needs revisiting.

## Two CI assertions that mechanize the founding promise

Both run in `.github/workflows/ci.yml`, after `npm run build`:

```bash
! grep -rq "SUPABASE_SECRET_KEY\|service_role" .next/static/   # must find nothing
node scripts/check-no-third-party-origins.mjs                  # no third-party origin in client chunks
```

The first proves the service key never reached a browser. The second proves Rule
2 holds without anyone remembering to open a network tab: it greps the built
client chunks for absolute origins and fails on anything not allowlisted, with a
written reason per entry.

**What the second one cannot do** is prove no request is made at runtime — a
fetch to a computed URL is invisible to it. It closes the realistic hole,
somebody adding an SDK whose origin lands in a bundle as a literal, not the
adversarial one.

**CI needs placeholder environment variables.** Every file in `src/server/` reads
its variable at module load and throws without it, deliberately, so `npm run
build` fails in CI with no `.env`. The workflow supplies obviously-fake values.
They are enough only because every route that touches the database is dynamic —
the build instantiates the modules and never opens a connection. If one of those
routes ever becomes static, the build starts needing a real database, and this is
where it will surface first.

---

# The three manual checklists

One per surface. Most of this is browser behavior that typecheck cannot see —
but note how much of checklist B is `curl`, which matters because agents usually
cannot see a screen.

> **rAF does not fire in a hidden tab.** `useCountUp` animates every number, so
> in a headless or backgrounded pane the calculator freezes at its first computed
> value and the closing frame shows R$ 0. **That is not a failure.** Read raw
> values, or make the pane visible. Agents report this as a bug constantly.

### What an automated pane cannot tell you

Stage 1 lost time to four separate measurement artifacts. All four look exactly
like regressions and none of them are:

| Symptom | Cause | Tell |
|---|---|---|
| Closing frame reads zero; animated numbers stale after a preset click | rAF frozen | the **non**-animated readouts (`738 imagens estimadas`, the `N base · M de opção` line) are correct |
| No progress-nav dot ever lights; arrow keys do nothing; `scrollIntoView` does nothing | `window.innerHeight === 0`, so a `-50%` rootMargin observer can never fire and the document cannot scroll | check `window.innerHeight` first; a **direct** `scrollIntoView` failing proves it is the pane, not the handler |
| `.gate` computes `min-height: 0px` | `100dvh` against a zero-height viewport | `offsetHeight` is correct anyway |
| Nested `<html>`/`<body>`, "mounting a new html component" | stale HMR in a tab left open across a layout edit | `curl` the route: one `<html>`. A fresh tab is clean |

Clearing `.next` is **not** enough after a layout move — the browser tab holds
stale HMR state too. Open a new tab.

To prove the keyboard handler ran without a scrollable viewport: dispatch the
`keydown` and read `event.defaultPrevented`. `DeckBehaviors` calls
`preventDefault()` on the arrow branch, so `true` means the handler reached it.

### Comparing the DOM between two runs

Raw `outerHTML` is **not stable between two loads of the same code** —
`DeckBehaviors` mutates the DOM through observers and timers, so which classes
are present depends on scroll position, tab age and wall clock. Normalise first:
strip `.is-visible`, `.is-active`, `.progress-nav[data-tone]` and inline
`transform` on `[data-parallax]`, and nothing else. Everything authored —
`data-tone` on sections, `data-nav-id`, ids, real classes — must still compare
byte-for-byte. Then poll until the closing frame stops reading zero before
trusting the capture.

## A — `/fast` regression

The standing pixel-identity guard. **Run it in every stage**, not just the one
that touches the deck.

- [ ] The gate appears; the password unlocks; the unlock survives a reload
- [ ] Arrow keys walk every rendered anchor, in order, including `#inspetor-demo`
- [ ] Every progress-nav dot scrolls somewhere — **10 dots**, not 12.
      `differentiators` and `audience` are `enabled: false` nodes, so `anchorsOf`
      skips them and no dead dot can be rendered. Do not "fix" this by un-hiding
      the slides; that was a deliberate content decision.
- [ ] The reveal stagger fires on each section
- [ ] The Inspetor iframe loads; **ESC pressed inside it exits**; scrolling passes
      through while the frame is inert
- [ ] The estimate reads **45 imagens (3 base · 42 de opção) / R$ 1.428** at defaults
- [ ] The three presets read **Studio 284 (R$ 8.736) · Padrão 507 (R$ 15.876) ·
      Alto padrão 738 (R$ 23.184)**
- [ ] `Ctrl+Alt+K` opens the price panel
- [ ] Network shows **zero** third-party requests on a full scroll-through
- [ ] Zero tracking requests — `/fast` must never emit one

Canonical numbers live in `estimate.md`. If they changed, re-derive from code and
update that file only.

## B — `/p/[slug]`

The first item is the one that actually proves the trust boundary, and it is a
one-liner:

```bash
curl -s http://localhost:3000/p/<slug> | grep -c "1.599"          # must be 0
curl -s http://localhost:3000/p/<slug> | grep -ci "planejamento"  # must be 0
```

> **Run the header and body checks against a production build.** In `next dev`,
> Next overrides `Cache-Control` on every route — `/fast`, which is static and
> cacheable in production, returns the same `no-cache, must-revalidate` string
> there. A dev reading of that header proves nothing in either direction.

- [ ] **Before unlocking**, the raw HTML contains no price and no slide copy
- [ ] **…including the `<head>`.** Page metadata is shallow-merged, so a page
      that does not override `description` and `openGraph` inherits the deck's
      marketing copy from the `(deck)` root layout — which is why the second
      grep above exists. It caught exactly this on its first run.
- [ ] Wrong password rejected; correct password sets an **HttpOnly** cookie and
      the content appears
- [ ] Failed attempts are rate limited: 8 per visitor or 60 per proposal in 15
      minutes returns the "muitas tentativas" message
- [ ] Every attempt takes ~300 ms, right and wrong alike
- [ ] With `expires_at` in the past: expired view, and curl still shows nothing
- [ ] A one-byte-tampered cookie is rejected
- [ ] Proposal A's cookie presented for proposal B is rejected
- [ ] Bumping `access_epoch` locks out an already-issued cookie
- [ ] The rendered slide subset and order match the stored config
- [ ] The progress nav has exactly the enabled dots; arrow keys walk exactly the
      enabled slides
- [ ] Exactly one tracking beacon per slide transition; **none before unlock**
- [ ] The response carries `Cache-Control: private, no-store`
- [ ] `Ctrl+Alt+K` does **nothing** here

## C — `/admin`

Access:

- [ ] `/` redirects to `/admin`
- [ ] Unauthenticated `/admin` **and every composer sub-route** redirect to login
- [ ] An `auth.users` account with no `admin_users` row is denied
- [ ] A deactivated admin loses access on the next page load
- [ ] Unauthenticated `/preview/[id]` redirects to login too — it renders the
      live proposal, and `proxy.ts` does not cover it
- [ ] No deck CSS on the page: `getComputedStyle(document.documentElement).scrollSnapType`
      is `none`. **Run it on the panel document, not on the preview frame** — the
      preview is an iframe and its document is supposed to have the deck's CSS
- [ ] Slides tab: the network panel shows no request to `/api/p/*/track` while
      the preview is open and scrolling. The preview mounts no tracking (Rule 2)

The composer, end to end. Create → configure → publish → open in a private
window, and confirm each change reached `/p/[slug]`:

- [ ] Three disabled slides are gone; the nav has exactly the enabled dots, and
      arrow keys walk exactly those, in the configured order
- [ ] A reordered pair renders in the new order; module numerals renumber
      01/02/03 with no gap. Reorder it by **dragging** and again with the grip
      focused and ↑/↓ — the two paths write the same delta
- [ ] The preview reloads itself after a save, and the "prévia desatualizada"
      note is present before it and gone after
- [ ] Clicking a rail row scrolls the preview to that slide; a row that is
      switched off scrolls nowhere, because it renders nothing
- [ ] Unticking a module's demo removes the demo **and** its "▷ Explorar" button —
      a leftover button would scroll to nothing
- [ ] A changed plan price and cycle discount show; a discount typed as `10`
      reads as −10%, never −1000%
- [ ] An added plan reaches the published deck as a card of its own; removing it
      takes the card away. The floor holds at one plan and the ceiling at six —
      and after removing the plan in the MIDDLE, the surviving cards still carry
      their own price and items, which is what the row keys exist for
- [ ] Planos e preços: dragging the months slider in "O que o cliente vê" crosses
      each `minMonths` floor at the right month and quotes the same price the
      published deck does at that month — the panel runs `cycleForMonths`, so a
      disagreement means the ORDER of the stored cycles is wrong (ADR 19)
- [ ] Calculadora: the live panel's image count matches what the client's
      calculator opens with, and the per-room "Imagens" column sums to the
      per-metragem subtotal
- [ ] Image tariffs move the calculator's cost, and `Ctrl+Alt+K` does **nothing**
- [ ] Two preloaded unit types are there when the calculator opens
- [ ] With every size preset unticked, the whole preset block is absent — not an
      empty one

Validation and the freeze (ADR 13):

- [ ] Total-before-calculator and an all-disabled deck are refused, each with a
      sentence a salesperson could act on
- [ ] Disabling `pricing` while `total` survives **warns and still saves**
- [ ] Editing a published proposal banners Planos and Calculadora at the top,
      Slides inside the rail under its title, and Visão geral inside the publish
      block next to the button that fixes it — and leaves the client's link on
      the old version; republishing clears them
- [ ] Changing a default in `src/content/deck.ts` and reloading the published
      proposal changes **nothing**

The read-out:

- [ ] A real session's dwell appears on the detail page, longest first
- [ ] Opening the client's link while signed in to `/admin` does **not** move it
