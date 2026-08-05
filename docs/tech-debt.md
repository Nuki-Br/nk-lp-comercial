---
audience: agent
status: current
verified_against: src/styles/*.css, src/components/deck/DeckBehaviors.tsx, src/components/slides/CalculatorSlide.tsx
size: 140
---

# Tech debt

Known-dead code and deferred cleanups. Nothing here is a bug; everything here is
a decision to not do something yet.

**Every entry carries the command that proves it is still true.** This file's
predecessor rotted — it claimed custom properties named `--deck-pad` that never
existed and a line count 131 lines stale. A claim you cannot re-check in one
command is a claim that will be wrong eventually.

> The class and token rename is **done**. CSS class names, custom properties,
> design tokens, `data-*` attributes and keyframe names are English, and the
> `.jornada` / `.comercial` double scope collapsed to a single `.deck`.

## 1. Dead CSS inherited from nk-lp

~400 lines across `deck.css` and `slides.css` that nothing renders. The only
component that ever emitted them (`JourneyModule`) stayed in nk-lp.

```bash
grep -c -- "--jr-" src/styles/deck.css        # 23 — the legacy layout ramp
```

In `deck.css`: `.hero`, `.scrolldot`, `@keyframes bob`; `.module` and its
`.alt` / `.reverse` variants; `.head`, `.beats`, `.beat`, `.beat-text`, `.dsc`,
`.lnk`; `.highlights`, `.hi`, `.num`, `.lbl`; `.shot`, `.device`,
`@keyframes float`, `@keyframes float-phone`; `.device-grid`, `.device-col`,
`.device-step`, `.device-steps`, `.device-screen`, `.device-screens`,
`.phone-inline`; `.outro`, `.wrap`; and the `--jr-pad` / `--jr-gutter` /
`--jr-edge` custom properties, whose only consumers are the rules above.

In `slides.css`: `.calc-toggle`, `.calc-toggle-thumb`, `.calc-money`,
`.calc-money-prefix`, `.calc-hint`, `.calc-field-inline`, and `.arrow`
(`.flow .arrow` — the flow renders no arrow element).

**Care required.** `.tag`, `.kicker`, `.lead` and `.step` *are* rendered, and
some are also styled **inside** the dead blocks (e.g. `.deck .head .tag`).
Deleting a dead block must not remove the only rule that styles a live class.
Verify surviving coverage per class before deleting.

**This is atomic with entry 2** — the CSS and the JS that queries it go together
or the repo is briefly inconsistent.

## 2. Matching dead JavaScript

```bash
grep -n "device-grid" src/components/deck/DeckBehaviors.tsx
```

`DeckBehaviors.tsx` still contains a sticky-device block (~20 lines) querying
`.device-grid` / `.device-step` / `.device-screen`. All match nothing in this
repo. It is atomic with entry 1 — the CSS and the JS that queries it go together.

> **`.module` is gone from the JS.** Stage 1 moved the walkable list to config,
> which deleted both `querySelectorAll(".slide, .module")` sites. The CSS rules
> in entry 1 remain.

## 3. Portuguese identifiers in `CalculatorSlide.tsx`

Violates `AGENTS.md` Rule 1, in the largest file in the repo.

```bash
grep -coE "Opcoes|Metragens|Metragem|Ambiente" src/components/slides/CalculatorSlide.tsx  # 46
```

`setOpcoesSecas`, `setOpcoesMolhadas`, `setMetragens`, `setMetragemAtiva`,
`addMetragem`, `removeMetragem`, `selectMetragem`, `addingAmbiente`,
`setAddingAmbiente` and friends.

**Deliberately deferred**, and it must not be fixed opportunistically inside
another change: this file is 912 lines and a rename would drown any diff it rides
along with. Stage 1 threaded config through it without touching a single
identifier, for exactly that reason. When it happens, it happens alone — and it goes through the
TypeScript AST touching only `Identifier` nodes, per ADR 4. A word-boundary regex
here will corrupt the pt-BR copy, which contains the words `metragem`,
`ambiente`, `opções`.

## 4. Portuguese comments across `src/`

Comments and JSDoc are still pt-BR throughout. They are substantial and genuinely
useful — the rationale in `EstimateProvider`, the hydration note in `AccessGate`,
the CSS section headers. **Translate rather than drop.** Lower priority than
everything above: comments do not mislead a reader the way a stale doc does.

## 5. CSS formatting is excluded from Biome

`biome.json` has the CSS formatter off. Running it over 3,366 lines of stylesheet
produces a diff nobody can review against a requirement of "visual identity
preserved exactly".

```bash
wc -l src/styles/*.css                        # 3386 total, four files
```

Separately shippable: enable it, review the diff once, commit alone. Do it after
entry 1, so ~400 fewer lines are in the diff.

Biome's CSS **linter** is off too, and its **Tailwind 4 parser is on**
(`css.parser.tailwindDirectives`) — without that Biome cannot parse `@theme
inline` in `tokens.css` and `biome ci` fails on a parse error, formatter or not.
The linter is off because `noDescendingSpecificity` fires 14 times and every fix
means reordering rules, i.e. visual risk.

> This entry previously claimed `967 + 26 + 2373 = 3366`. The real total was
> already 3384 when that was written — the kind of drift this file exists to
> catch. The count now covers four files, since stage 1 split `gate.css` out and
> renamed the old tokens sheet to `tokens.css`.

## 6. Two dead progress-nav dots — FIXED by stage 1

```bash
npx vitest run src/deck/defaults.test.ts -t "anchorsOf"
```

Commit `e49dd8e` commented `<DifferentiatorsSlide />` and `<AudienceSlide />` out
of the page while `deckNav` still listed both, so the nav rendered two dots whose
anchors did not exist.

Both slides are now nodes with `enabled: false`, and `anchorsOf` skips disabled
nodes. The dots disappeared as a **consequence of the architecture** — no line
anywhere says "remove these two" — and the state is no longer constructible: nav
and render come from the same array. The slides stay hidden; that was a content
decision, and `shown: ["audience"]` can re-enable one per proposal.

## 7. Optional: split the stylesheets

`slides.css` is **2300** lines and the calculator alone is roughly half of it
(its banner starts at line 641). Both sheets are sectioned with
`/* ===== SECTION ===== */` headers that map cleanly to components, so a
one-file-per-slide split under `src/styles/slides/` is close to mechanical.

Worth doing for agent ergonomics: an agent changing a pill radius currently loads
2,373 lines to find the rule.

## 8. a11y findings, demoted to warnings

```bash
npx @biomejs/biome lint --reporter=json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).diagnostics.filter(d=>d.severity==='warning').length))"
```

Biome's `a11y` domain flags ~24 real issues: `noLabelWithoutControl` (the
calculator's `<label>`s have no associated control), `noSvgWithoutTitle`,
`useFocusableInteractive`, `noAutofocus` on the gate input, and
`useSemanticElements` on several `role=` divs.

They are set to `"warn"` in `biome.json`, **not off** — they stay visible in
every `npm run lint`. They were not fixed in stage 1 because every fix changes
the DOM (adding `htmlFor`/ids, `<title>` elements, `tabindex`), and that stage's
entire proof was DOM identity. `noArrayIndexKey` is warned for a different
reason: at `CalculatorSlide` the list is `Array.from({length: variants})`, purely
positional, so the index *is* the right key.

Whoever fixes these should do it as its own change, with a fresh DOM baseline.

## 9. `RoomAreaType` values are pt-BR strings

```bash
grep -n 'RoomAreaType = ' src/lib/estimateTypes.ts     # "seca" | "molhada"
```

Violates Rule 1 in the one place where it will be expensive to fix later: stage 2
persists these values into JSONB, so renaming them to `dry`/`wet` after that
means a data migration over live proposals. If it is going to happen, it should
happen **before** stage 2 ships.

## How to verify a CSS deletion

The rename was verified with a class-coverage invariant, and the same method
works for deletions:

1. Collect every class name appearing in a CSS selector.
2. Collect every class the page actually renders
   (`document.querySelectorAll('*')` → `classList`), filtering Tailwind utilities.
3. Every rendered class must appear in the CSS set.

Before the rename: 157 rendered, 156 styled, 1 orphan (`variant-card-base`).
After: 155 rendered, 154 styled, the same orphan. The drop of exactly 2 is
accounted for — `jornada`+`comercial` collapsed to `deck`, and `on`+`ativa`
collapsed to `is-active`.

Then confirm styling is genuinely **applied**, not merely present: read
`getComputedStyle` on a few landmarks (`.slide` min-height, `.progress-nav`
position, `#cover` background, `.module-slide-grid` display) rather than trusting
that a class name exists somewhere.

Finally check the states that do not render on load: the access gate (clear
`localStorage.nuki-comercial-unlocked`), the calculator's add-room form and its
`Ctrl+Alt+K` panel, and the demo slide.
