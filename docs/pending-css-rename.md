# Pending: CSS class and token rename

The English-identifier pass covered TypeScript — components, types, object keys,
locals, and the slide anchor ids. **CSS class names, custom properties and design
tokens are still Portuguese**, and so are most code comments. This document
specifies the remaining work so it can be executed mechanically.

Nothing here is user-visible; it is purely a consistency debt.

## Scope

| Surface | Where |
|---|---|
| Class names, custom properties | `src/styles/deck.css` (974 l), `src/styles/slides.css` (2242 l) |
| Design tokens | `src/styles/globals.css` (`@theme inline`) |
| `className` / `data-*` strings | the 15 files under `src/components/` |
| Selector strings | `src/components/deck/DeckBehaviors.tsx` |
| Tailwind utilities | `src/app/layout.tsx` (1 line), `src/components/layout/Footer.tsx` (~14) |
| Comments | throughout `src/` |

## How to do it safely

CSS files can be rewritten wholesale — there is no user-facing text in them
(verified: no `content:` property carries copy).

**TSX cannot.** `className="cm-section capa"` and `"O problema"` are both string
literals, and the copy contains the very words being renamed. Target JSX
attributes through the TypeScript AST — `ts.isJsxAttribute` with name `className`
or `data-*`, then rewrite only its `StringLiteral` initializer. A blanket
string replace will corrupt the copy; this already happened once, see
`docs/decisions.md` §4.

Apply longest-match-first so prefixes never clobber their supersets
(`comercial-gate` before `comercial`; `modulo-demo-slide` before `modulo-slide`).

## Root scope

The deck root is `<div className="jornada comercial">` and the sheets are scoped
`.jornada` / `.comercial`. That double scope only existed because these sheets
were shared with nk-lp's journey page. Collapse both to a single **`.deck`**.

**Keep the scope.** `slides.css` defines `.card`, `.grid`, `.item`, `.step`,
`.tag`, `.lead`, `.n`, `.d`, `.t` — unscoped, those collide with anything added
later and leak into the Tailwind-styled footer.

## Mapping

| Current | New |
|---|---|
| `.jornada` + `.comercial` (root) | `.deck` |
| `.cm-section` / `.cm-wrap` / `.cm-head` | `.slide` / `.slide-inner` / `.section-head` |
| `.cm-back` / `.cm-back-icon` / `.cm-hint` | `.back-link` / `.back-link-icon` / `.keyboard-hint` |
| `.comercial-gate*` | `.gate*` |
| `.modulo-slide-*` / `.modulo-demo-*` | `.module-slide-*` / `.module-demo-*` |
| `.bgnum` | `.bg-numeral` |
| `.progress` / `.progress .d` / `.progress .t` | `.progress-nav` / `.progress-nav-dot` / `.progress-nav-label` |
| `.capa` `.problema` `.o-que-e` `.diferenciais` `.publico` `.calculadora` `.cta` `.total-estimado` | `.cover` `.problem` `.what-is-nuki` `.differentiators` `.audience` `.calculator` `.pricing` `.estimated-total` |
| `.in` / `.ativa` / `.zerada` / `.on` | `.is-visible` / `.is-active` / `.is-empty` / `.is-active` |
| `.calc-metragem-*` / `.calc-ambient-*` / `.calc-add-ambient-*` | `.calc-unit-type-*` / `.calc-room-*` / `.calc-add-room-*` |
| `.tipologia-card*` / `.ambient-tile` / `.peso-{leve,medio,pesado}` | `.variant-card*` / `.room-tile` / `.weight-{light,medium,heavy}` |
| `.planos` / `.plano` / `.destaque` / `.preco*` | `.plans` / `.plan` / `.is-featured` / `.price*` |
| `.ciclo-toggle*` / `.cta-plano-simulador*` | `.billing-cycle-toggle*` / `.plan-simulator*` |
| `--cm-pad` / `--cm-max` | `--slide-pad` / `--slide-max` |
| `--jr-pad` / `--jr-gutter` / `--jr-edge` | drop — no surviving consumer |
| `data-t` | `data-section-id` (and `dataset.t` → `dataset.sectionId`) |

Already English, leave alone: `.kicker`, `.lead`, `.meta`, `.shot`, `.reveal`,
`.demo-locked`, `.is-fullscreen`, `.has-error`, `.device-*`.

## Design tokens

`preto→black` · `branco→white` · `cinza→gray` · `cinza-claro→gray-light` ·
`cinza-divisor→gray-divider` · `cinza-borda→gray-border` · `cinza-medio→gray-mid` ·
`cinza-7→gray-7` · `verde-02/03/08→green-02/03/08` · `verde-suave→green-soft` ·
`laranja→orange` · `laranja-suave→orange-soft`.

Keep the numeric suffixes — they are the brand scale, not Portuguese.

**Five tokens are unused** and should be deleted rather than renamed:
`--color-nuki-cinza-12` and the four `--color-nuki-status-*`. Zero references
across CSS and TSX.

> **Silent-failure trap.** Every `var(--color-nuki-*, #hex)` in the deck CSS
> carries a hex fallback, so a missed rename produces **no visual diff** while
> silently dropping the token. Guard afterwards with:
> ```bash
> grep -rn -- '--color-nuki-' src/ | grep -vE 'black|white|gray|green|orange'
> ```
> It must return nothing.

## Dead CSS worth deleting while in there

- `.module`, `.module.alt`, `.module.reverse` — never rendered here; the leftover
  `.module` selector in `DeckBehaviors` goes with them
- `.device-*` and the sticky-device block in `DeckBehaviors` (~20 lines TS,
  ~110 CSS) — only nk-lp's `JourneyModule` ever emitted those
- `.wrap`, `.outro`, `.scrolldot`, the hero block, `.beat*`/`.shot` media rules —
  landing-page-only survivors of the port
- `.calc-toggle*`, `.calc-money*`, `.calc-hint`, `.calc-field-inline`,
  `.fluxo .arrow` — roughly 90 lines with no markup behind them

## Verification

`npm run check && npm run build`, then load the deck and compare against the
current appearance. Class renames have no typecheck coverage — a missed one is
invisible to the compiler and shows up only as unstyled markup. Check every slide
at 1440 / 900 / 375 px, plus the gate, the demo slide and the calculator's
sub-states (add/remove room, the Ctrl+Alt+K panel).

## While you are there

Comments and JSDoc are still Portuguese. They are substantial and genuinely
useful — the rationale in `EstimateProvider`, the hydration note in `AccessGate`,
the CSS section headers — so translate them rather than dropping them.
