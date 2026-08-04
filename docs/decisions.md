# Decisions

Short records of why things are the way they are, so nobody has to re-litigate
them from scratch.

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

**Context.** The deck previously fired Clarity events (`comercial_unlocked`,
`demo_opened`) and Vercel pageviews.

**Decision.** Strip all of it. No GA, no Clarity, no Vercel Analytics, no
replacement.

**Consequence.** No funnel data on the deck itself. Runtime dependencies are
exactly `next`, `react`, `react-dom`, which makes any reintroduction a visible
`package.json` diff. If measurement is ever wanted, it must use a *separate*
property from the landing page — otherwise this whole migration was pointless.

## 3. The deck is the root route

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

## 5. Anchor ids stay Portuguese

**Decision.** Class names and identifiers went English; the `#capa`, `#problema`,
`#o-que-e` anchors did not.

**Rationale.** A URL fragment is user-facing surface, closer to copy than to
code, and salespeople deep-link `#calculadora` mid-pitch. Three of the twelve
(`#planner`, `#personaliza`, `#inspetor`) are product names and were never
Portuguese in the first place. No CSS keys off an id, so keeping them costs
nothing structurally.

**Status.** This contradicts the original migration plan, which called for
renaming them. Revisit deliberately if at all.

## 6. `.deck` scope collapse — not done

The root element still carries `className="jornada comercial"`, and the two
stylesheets are still scoped `.jornada` / `.comercial`. That double scope only
existed because these sheets were shared with the landing page's journey page.

Here it should collapse to a single `.deck`. **Keep the scope — do not drop it
entirely:** `slides.css` defines classes named `.card`, `.grid`, `.item`,
`.step`, `.tag`, `.lead`, `.n`, `.d`, `.t`. Unscoped, those would collide with
anything added later and would leak into the Tailwind-styled footer.

## 7. No test framework

**Decision.** No Vitest, no Jest, no Playwright.

**Rationale.** A static deck whose only logic is the estimate calculator has
near-zero unit-test ROI, and the parts most likely to break — reveal observers,
keyboard nav, the demo iframe's ESC bridge — are browser behavior that unit tests
would not catch anyway. `npm run check` plus the manual checklist in `AGENTS.md`
is the guard.

**The one exception worth revisiting:** if the pricing math is ever disputed in a
sales call, extract it from `CalculatorSlide.tsx` into a pure module and test
that single file. Not before.

## 8. Committed demo artifact

`public/demos/inspetor/index.html` (2.3 MB) is committed rather than generated
during the build, because `scripts/prepare-inspetor-demo.mjs` is a manual step
that patches a Claude Design export and would be fragile in CI. The cost is repo
size; the benefit is that a stale patch regex cannot silently break a deploy.
