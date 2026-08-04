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
`docs/pending-css-rename.md`.

## 7. No test framework

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

## 8. The billing cycle is derived, not selected

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

## 9. Committed demo artifact

`public/demos/inspetor/index.html` (5.7 MB) is committed rather than generated
during the build, because `scripts/prepare-inspetor-demo.mjs` is a manual step
that patches a Claude Design export and would be fragile in CI. The cost is repo
size; the benefit is that a stale patch regex cannot silently break a deploy.
