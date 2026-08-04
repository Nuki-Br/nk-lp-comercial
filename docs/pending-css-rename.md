# Pending: dead CSS cleanup

> **The class and token rename is done.** CSS class names, custom properties,
> design tokens, `data-*` attributes and keyframe names are all English, and the
> `.jornada` / `.comercial` double scope has collapsed to a single `.deck`. What
> remains is deleting rules that no longer have markup behind them, and
> translating the Portuguese comments.

## What is left

### 1. Dead CSS inherited from nk-lp

`deck.css` was written for the landing page's journey page and carries a large
block that nothing in this repo renders. Verified dead — none of these classes
appear in the rendered DOM, and the only component that ever emitted them
(`JourneyModule`) stayed in nk-lp:

- `.hero`, `.scrolldot`, `@keyframes bob`
- `.module`, `.module.alt`, `.module.reverse`
- `.head`, `.beats`, `.beat`, `.beat-text`, `.dsc`, `.lnk`
- `.highlights`, `.hi`, `.num`, `.lbl`
- `.shot`, `.device`, `@keyframes float`, `@keyframes float-phone`
- `.device-grid`, `.device-col`, `.device-step`, `.device-steps`,
  `.device-screen`, `.device-screens`, `.phone-inline`
- `.outro`, `.wrap`
- the `--deck-pad` / `--deck-gutter` / `--deck-edge` custom properties, whose
  only consumers are the rules above

In `slides.css`: `.calc-toggle`, `.calc-toggle-thumb`, `.calc-money`,
`.calc-money-prefix`, `.calc-hint`, `.calc-field-inline`, and `.arrow`
(`.flow .arrow` — the flow renders no arrow element).

**Care required.** `.tag`, `.kicker`, `.lead` and `.step` *are* rendered, and some
of them are also styled inside the dead blocks (e.g. `.deck .head .tag`).
Deleting a dead block must not remove the only rule that styles a live class.
Check each one has surviving coverage before deleting.

Roughly 400 lines across the two files.

### 2. Matching dead JavaScript

`DeckBehaviors.tsx` still contains the sticky-device block (~20 lines) that
queries `.device-grid` / `.device-step` / `.device-screen`, and `.module` appears
in two selector lists. All match nothing. They go with the CSS above.

### 3. Portuguese comments

Comments and JSDoc are still pt-BR throughout `src/`. They are substantial and
genuinely useful — the rationale in `EstimateProvider`, the hydration note in
`AccessGate`, the CSS section headers — so translate rather than drop them.

### 4. Optional: split the stylesheets

`slides.css` is 2242 lines and the calculator alone is about half of it. Both
files are sectioned with `/* ===== SECTION ===== */` headers that map cleanly to
components, so a one-file-per-slide split under `src/styles/slides/` is close to
mechanical. Worth doing for agent ergonomics — an agent changing a pill radius
currently loads 2200 lines.

## How to verify any of this

The rename was verified with a class-coverage invariant, and the same method
works for deletions:

1. Collect every class name appearing in a CSS selector.
2. Collect every class the page actually renders (`document.querySelectorAll('*')`
   → `classList`), filtering out Tailwind utilities.
3. Every rendered class must appear in the CSS set.

Before this rename: 157 rendered, 156 styled, 1 orphan (`tipologia-card-base`).
After: 155 rendered, 154 styled, 1 orphan (`variant-card-base` — the same class).
The drop of 2 is exact and expected: `jornada`+`comercial` collapsed to `deck`,
and `on`+`ativa` collapsed to `is-active`.

Then confirm styling is genuinely applied, not just present — read
`getComputedStyle` on a few landmarks (`.slide` min-height, `.progress-nav`
position, `#cover` background, `.module-slide-grid` display) rather than trusting
that the class name merely exists.

Finally check the states that do not render on load: the access gate (clear
`localStorage.nuki-comercial-unlocked`), the calculator's add-room form and its
`Ctrl+Alt+K` panel, and the demo slide.
