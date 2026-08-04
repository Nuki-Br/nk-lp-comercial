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
grep -n "device-grid\|\.module" src/components/deck/DeckBehaviors.tsx
```

`DeckBehaviors.tsx` contains a sticky-device block (~20 lines) querying
`.device-grid` / `.device-step` / `.device-screen`, and `.module` appears in two
selector lists. All match nothing in this repo.

`.module` disappears for free when the keyboard walk list moves to config — see
`deck-runtime.md`.

## 3. Portuguese identifiers in `CalculatorSlide.tsx`

Violates `AGENTS.md` Rule 1, in the largest file in the repo.

```bash
grep -coE "Opcoes|Metragens|Metragem|Ambiente" src/components/slides/CalculatorSlide.tsx
```

`setOpcoesSecas`, `setOpcoesMolhadas`, `setMetragens`, `setMetragemAtiva`,
`addMetragem`, `removeMetragem`, `selectMetragem`, `addingAmbiente`,
`setAddingAmbiente` and friends.

**Deliberately deferred**, and it must not be fixed opportunistically inside
another change: this file is 870 lines and a rename would drown any diff it rides
along with. When it happens, it happens alone — and it goes through the
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
wc -l src/styles/*.css                        # 967 + 26 + 2373 = 3366
```

Separately shippable: enable it, review the diff once, commit alone. Do it after
entry 1, so ~400 fewer lines are in the diff.

## 6. Two dead progress-nav dots — the invariant, currently firing

```bash
grep -n "DifferentiatorsSlide\|AudienceSlide" src/app/page.tsx
grep -n "differentiators\|audience" src/content/deck.ts | head -2
```

Commit `e49dd8e` ("Chore: Hidden slides") commented `<DifferentiatorsSlide />`
and `<AudienceSlide />` out of the page. **`deckNav` still lists both.** The
progress nav therefore renders two dots whose anchors do not exist: clicking them
does nothing, and the nav's active-section tracking skips them silently.

This is `AGENTS.md`'s "every nav entry needs a rendered element with that id"
invariant, live, in the repo, right now — which is the most honest possible
argument for the data-driven refactor. Hiding a slide becomes a config flag, the
nav derives from the same array, and this bug becomes **impossible to construct**
rather than merely documented.

**Do not fix it by un-hiding the slides.** That was a deliberate content
decision. Until stage 1 lands, the correct minimal fix is to remove the two
`deckNav` entries — but stage 1 makes it moot, so leave it unless the dead dots
are actually bothering someone in a pitch.

## 7. Optional: split the stylesheets

`slides.css` is **2373** lines and the calculator alone is roughly half of it
(lines ~636–1834). Both sheets are sectioned with `/* ===== SECTION ===== */`
headers that map cleanly to components, so a one-file-per-slide split under
`src/styles/slides/` is close to mechanical.

Worth doing for agent ergonomics: an agent changing a pill radius currently loads
2,373 lines to find the rule.

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
