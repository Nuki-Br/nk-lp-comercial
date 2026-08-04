# Architecture

## Render tree

```
app/layout.tsx        html/body, Manrope, metadata, noindex
  └ AccessGate        password gate over the whole app (localStorage flag)
      └ app/page.tsx
          ├ ProgressNav              12 dots, right edge
          ├ main
          │   ├ CoverSlide … CasesSlide
          │   └ EstimateProvider     wraps the three slides that share numbers
          │       ├ PricingSlide     edits months + billing cycle
          │       ├ CalculatorSlide  publishes image count + cost
          │       └ EstimatedTotalSlide  read-only closing frame
          ├ Footer
          └ DeckBehaviors            all imperative DOM behavior, renders null
```

`EstimateProvider` exists so three sibling sections can share derived numbers
without prop drilling through `page.tsx`. It is the one piece of cross-slide
state.

## The slide contract

Every slide renders a section shaped like this:

```jsx
<section className="cm-section <name>" id="<anchor>" data-tone="dark" data-reveal-group="">
  <div className="cm-wrap">
    …children with className="reveal" animate in with a stagger…
  </div>
</section>
```

- `id` must match an entry in `deckNav` (`src/content/deck.ts`) or the progress
  nav silently loses a dot.
- `data-tone="dark"` flips the progress nav to its light palette while the
  section is centered. Omit it for light sections.
- `data-reveal-group=""` marks the container whose `.reveal` children stagger in.

Adding a slide means: create the component in `src/components/slides/`, export it
from `slides/index.ts`, render it in `app/page.tsx` in the right order, add its
`deckNav` entry, and add its CSS.

## DeckBehaviors — the DOM contract

`DeckBehaviors` is a client component that renders `null` and owns every
imperative behavior. It is the only place that reaches into the DOM, and it is
coupled by name to markup and CSS. Change one side, change the other.

| It reads / writes | Behavior |
|---|---|
| `[data-reveal-group]`, `.reveal` → `.in` | stagger-in on scroll, 90 ms apart |
| `.cm-section`, `[data-tone]`, `.progress a[data-t]` | active-section tracking + palette flip |
| `.cm-section` ids, in DOM order | the walkable list for keyboard navigation |
| `.modulo-demo-slide[data-back-target]` | demo focus lock |
| `html.demo-locked` | CSS scroll lock while a demo is open |
| `postMessage` type `nuki-demo:esc` | ESC pressed *inside* the demo iframe |
| `[data-parallax]` | background-numeral parallax fallback |
| `.cm-hint` | the ← → hint, shown ~800 ms, hidden after ~5 s |

Two details worth knowing:

**The walkable list is derived from the DOM, not from `deckNav`.** That is
deliberate: `#inspetor-demo` is reachable with the arrow keys but invisible in
the progress nav, because it is a `.cm-section` with an id that has no `deckNav`
entry. `deckNav` is the source of truth for the nav only.

**The ESC bridge is a two-part contract.** The iframe cannot bubble key events to
the parent, so `scripts/prepare-inspetor-demo.mjs` injects a keydown listener
into the demo HTML that posts `{type:'nuki-demo:esc'}` to the parent. The string
is baked into the committed artifact — renaming it here without regenerating that
file breaks ESC with no error. See `docs/demo-embedding.md`.

**Dead selector to be aware of:** the section observers also query `.module`, a
leftover from when the module slides reused nk-lp's `JourneyModule`. Nothing in
this repo renders `.module`; the selector matches nothing and can go.

## The estimate

`CalculatorSlide` computes and publishes; `PricingSlide` edits the plan side;
`EstimatedTotalSlide` only reads.

```
unit types × rooms × components × options  ──► image count
image count × price per image             ──► image cost      ─┐
                                                                ├─► grand total
months per plan × discounted monthly price ──► platform cost   ─┘
```

At the default state this is **42 images / R$ 1.176** — the fastest smoke test
that the calculator and the context wiring both still work.

`pricePerImage` (R$ 28) is not editable in the client-facing UI. It is behind a
hidden admin panel on `Ctrl+Alt+K`, so a salesperson can adjust it live during a
pitch. The handler matches on `e.code === "KeyK"`, not `e.key`, because Option on
macOS rewrites `e.key` to a dead key.

`CalculatorSlide` publishes into context from a `useEffect`. That is a deliberate
sync of derived state between sibling sections; the alternative was lifting the
whole calculator state into the provider, which is a bigger refactor than it is
worth right now. If you do it, delete the effect and derive in the provider.

## Animation

`useCountUp` drives every animated number with `requestAnimationFrame`. **rAF
does not fire in a hidden tab**, so in a headless or backgrounded browser every
counted value freezes at its initial state — the calculator shows its first
computed number and the closing frame shows R$ 0. That is not a bug. Read raw
state, or make the pane visible.

## Styling

Three layers:

1. `src/styles/globals.css` — Tailwind v4 (`@import "tailwindcss"`) plus the
   `@theme inline` block with the brand tokens. No `tailwind.config` file; v4 is
   CSS-first.
2. `src/styles/deck.css` — the shell and the module-slide design system, all
   scoped under `.jornada`.
3. `src/styles/slides.css` — per-slide styling, scoped under `.comercial`.

The deck's root element carries both classes. The double scope is inherited from
`nk-lp`, where these sheets were shared with the landing page's journey page; in
a deck-only repo it collapses to a single scope. That collapse is not done yet —
see `docs/decisions.md`.

Both sheets are sectioned with `/* ===== SECTION ===== */` headers that map to
slides, so they split cleanly per component when someone wants to. The calculator
alone is roughly half of `slides.css`.
