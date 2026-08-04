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
| `.slide`, `[data-tone]`, `.progress a[data-t]` | active-section tracking + palette flip |
| `[data-nav-id]` | lets a section borrow another's progress dot (the demo slide borrows `inspetor`) |
| `.slide` ids, in DOM order | the walkable list for keyboard navigation |
| `postMessage` type `nuki-demo:esc` | ESC pressed *inside* the demo iframe, re-emitted as the window event `nuki-demo:exit` |
| `[data-parallax]` | background-numeral parallax fallback |
| `.cm-hint` | the ← → hint, shown ~800 ms, hidden after ~5 s |

Two details worth knowing:

**The walkable list is derived from the DOM, not from `deckNav`.** That is
deliberate: `#inspetor-demo` is reachable with the arrow keys but has no dot of
its own, because it is a `.slide` with an id that has no `deckNav` entry. It
carries `data-nav-id="inspetor"` so the module's dot stays lit while the demo is
on screen — without it the nav would go blank there. `deckNav` is the source of
truth for the nav only, and **its order must match the DOM order** in
`src/app/page.tsx`, or the dots walk backwards.

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

Images come in two tiers, because production has two steps. Modelling a room in
3D yields one **base image** per room unit; every finish option after that is a
material crop over that render, so it is much cheaper. The math lives in
`src/lib/estimate.ts` — a pure module, no React — and `CalculatorSlide` only
renders it.

```
unit types × rooms × units                 ──► base images   ─┐
   … × components × options                ──► option images ─┤
base × base price + option × option price  ──► image cost    ─┼─► grand total
months per plan × discounted monthly price ──► platform cost ─┘
```

At the default state this is **45 images (3 base + 42 option) / R$ 1.428** — the
fastest smoke test that the calculator and the context wiring both still work.

Watch the word "base": `ImageMix.base` is the 3D render tier, while a variant
card's `mode: "main"` is the first floor-plan variant (Variação 01). They are
orthogonal axes and the old code called the second one `base` too.

Neither price is editable in the client-facing UI. Both (`baseImagePrice` R$ 84,
`optionImagePrice` R$ 28) are behind a hidden admin panel on `Ctrl+Alt+K`, so a
salesperson can adjust them live during a pitch. The handler matches on
`e.code === "KeyK"`, not `e.key`, because Option on macOS rewrites `e.key` to a
dead key.

`PROJECT_SIZE_PRESETS` (Studio / Padrão / Alto padrão) replace the whole
calculator state in one click. Applying one re-seeds `nextIdRef` past the ids the
preset used; the highlight clears on the first edit, so a lit chip never claims a
state the user has already changed.

Preset rooms are one unit each and unlocked — the list says "Quarto 01" and
"Quarto 02" rather than a "Quartos" with `units: 2`, so each can carry its own
component count. `variants` counts the base plan: `variants: 5` is base plus four
extras. The ceiling lives in `ESTIMATE_RANGES.variants` and the pill selector
derives from it, so raising it again needs no JSX or CSS change.

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
2. `src/styles/deck.css` — the shell and the module-slide design system.
3. `src/styles/slides.css` — per-slide styling.

Everything is scoped under a single `.deck` on the root element. Keep that scope:
`slides.css` defines classes named `.card`, `.grid`, `.item`, `.step`, `.tag`,
`.lead` and `.n`, which would collide with anything added later and would leak
into the Tailwind-styled footer if left unscoped.

Both sheets are sectioned with `/* ===== SECTION ===== */` headers that map to
slides, so they split cleanly per component when someone wants to. The calculator
alone is roughly half of `slides.css`.
