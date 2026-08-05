---
audience: agent
status: current
verified_against: package.json scripts, ADR 7 and ADR 12
size: 145
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
| `src/server/proposals/dal.ts` | the decision table `(row, cookie, now) → ok \| locked \| expired \| not-found`, fetcher injected |
| `src/server/config/validate.ts` | rejects demo-without-module, total-without-calculator, negative price, discount ≥ 1 |

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

`supabase/tests/rls.sql` is checked in to run by hand against a Supabase branch.
It asserts that the `anon` role selects zero rows from `proposals` and errors on
`proposal_access`. If RLS ever becomes the primary control, it needs a real
harness and ADR 12 needs revisiting.

## Two CI assertions that mechanize the founding promise

```bash
grep -r "SUPABASE_SECRET_KEY\|service_role" .next/static/   # must find nothing
node scripts/check-no-third-party-origins.mjs                # no non-allowlisted https:// in client chunks
```

The first proves the service key never reached a browser. The second proves Rule
2 holds without anyone remembering to open a network tab.

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
curl -s http://localhost:3000/p/<slug> | grep -c "1.599"   # must be 0
```

- [ ] **Before unlocking**, the raw HTML contains no price and no slide copy
- [ ] Wrong password rejected; correct password sets an **HttpOnly** cookie and
      the content appears
- [ ] With `expires_at` in the past: expired view, and curl still shows nothing
- [ ] A one-byte-tampered cookie is rejected
- [ ] Proposal A's cookie presented for proposal B is rejected
- [ ] The rendered slide subset and order match the stored config
- [ ] The progress nav has exactly the enabled dots; arrow keys walk exactly the
      enabled slides
- [ ] Exactly one tracking beacon per slide transition; **none before unlock**
- [ ] The response carries `Cache-Control: private, no-store`
- [ ] `Ctrl+Alt+K` does **nothing** here

## C — `/admin`

- [ ] `/` redirects to `/admin`
- [ ] Unauthenticated `/admin` redirects to the login page
- [ ] An `auth.users` account with no `admin_users` row is denied
- [ ] A deactivated admin loses access on the next page load
- [ ] Create → configure → copy link → open in a private window round-trips
- [ ] The dwell numbers for that session appear on the proposal detail page
- [ ] No deck CSS on the page: `getComputedStyle(document.documentElement).scrollSnapType`
      is `none`
