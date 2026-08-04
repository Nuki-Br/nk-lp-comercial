---
audience: agent
status: current
verified_against: src/components/deck/DeckBehaviors.tsx, src/components/slides/*.tsx, src/styles/*.css
size: 150
---

# Deck runtime

Everything about how a rendered deck behaves in a browser. Applies identically to
`/fast` and `/p/[slug]` — there is one render path, not two.

Every selector below was read out of the source, not out of an older doc. If you
change one side of a contract, change the other; `scripts/check-docs.mjs` asserts
that every class named here still exists somewhere in `src/styles/` or
`src/components/`.

## The slide contract

Every slide renders a section shaped like this:

```jsx
<section className="slide <name>" id="<anchor>" data-tone="dark" data-reveal-group="">
  <div className="slide-inner">
    …children with className="reveal" animate in with a stagger…
  </div>
</section>
```

- `id` is the anchor **and** the nav id. It must be unique across the deck, and
  something in the nav must reference it, or a dot silently vanishes.
- `data-tone="dark"` flips the progress nav to its light palette while the
  section is centered. Omit it on light sections. Today: cover, differentiators,
  pricing.
- `data-reveal-group=""` marks the container whose `.reveal` children stagger in.
- `slide-inner` is the width-constrained wrapper — `--slide-max` / `--slide-pad`.

Fullscreen variant: add `is-fullscreen`, which drops the padding and switches the
section from flex-centered to block. Only the demo slide uses it.

## DeckBehaviors — the DOM contract

`DeckBehaviors` is a client component that renders `null` and owns every
imperative behavior in one mount effect. It is the only place that reaches into
the DOM, and it is coupled **by name** to markup and CSS.

| # | Reads / writes | Behavior |
|---|---|---|
| 1 | `[data-reveal-group]`, descendant `.reveal` → `.is-visible` | stagger-in on scroll, `i × 90 ms`, one-shot (unobserves after firing) |
| 2 | `.slide, .module`, `section.dataset.navId \|\| section.id`, `.progress-nav a` → `.is-active` matched on `dataset.sectionId` | active-section tracking, `rootMargin: "-50% 0px -50% 0px"` |
| 3 | `section.dataset.tone` → `.progress-nav[data-tone]` | palette flip, `"dark"` or `"light"` |
| 4 | `.slide, .module` filtered by having an `id` | the walkable list for keyboard nav |
| 5 | `postMessage` type `nuki-demo:esc` → window event `nuki-demo:exit` | ESC pressed *inside* the demo iframe |
| 6 | `[data-parallax]` → inline `transform` | background-numeral parallax **fallback** |
| 7 | `.keyboard-hint` → `.is-visible` | the ← → hint, shown at 800 ms, hidden at 5000 ms |
| 8 | `.device-grid`, `.device-step`, `.device-screen` | **dead** — nothing renders these. See `tech-debt.md`. |

Keyboard bindings: `←` / `PageUp` / `Shift+Space` back; `→` / `PageDown` / `Space`
forward; `Home` / `End` to the ends. Suppressed while typing (`INPUT`,
`TEXTAREA`, `SELECT`, `contentEditable`).

`document.documentElement.style.scrollBehavior` is set to `smooth` unless the
user prefers reduced motion.

### The walkable list should come from config, not the DOM

Historically it was derived from the DOM, which is order-agnostic and survives a
data-driven refactor by accident. Derive it from `DeckConfig.slides` instead and
publish it through a small client context, because:

- it makes the order authoritative rather than incidental;
- it lets a slide opt out of the walk without a DOM hack;
- it deletes the dead `.module` selector;
- **it removes a duplicated contract.** `ModuleDemoSlide.navigate()` rebuilds the
  identical query by hand today, so two places encode "what is walkable" and they
  will drift the first time someone adds a `.slide` without an `id`.

Keep the mount-once `useEffect(…, [])` and read ids through a ref so the listener
identity never changes.

### The ESC bridge is a two-part contract

The iframe cannot bubble key events to the parent, so
`scripts/prepare-inspetor-demo.mjs` injects a keydown listener into the demo HTML
that posts `{type:'nuki-demo:esc'}` to the parent. **The string is baked into the
committed 5.7 MB artifact.** Renaming the listener without regenerating that file
breaks ESC with no error. See `demo-embedding.md`.

## The demo slide

`#inspetor-demo` is reachable with the arrow keys but has **no dot of its own**.
It carries `data-nav-id="inspetor"` so the module's dot stays lit while the demo
is on screen — without it the nav goes blank there.

That borrowing is a live invariant: a config that hides the `inspetor` module but
keeps its demo points `data-nav-id` at a dot that no longer exists. Model the
demo as a checkbox on the module in the admin, so the orphan cannot be
constructed, and have config normalization drop orphaned demos as a backstop.

**It snaps; it does not lock.** `.module-demo-slide` carries
`scroll-snap-align: start` and the root carries `scroll-snap-type: y proximity`.
They are a pair — drop one and the snap dies silently. The previous
`html.demo-locked` (`overflow: hidden`) froze the deck at whatever offset the
observer happened to fire on. Do not bring it back.

**The iframe is inert until activated.** `.module-demo-slide` without
`.is-active` sets `pointer-events: none` on the frame. This is load-bearing: the
embedded document has `overscroll-behavior: none` and no internal scroller, so a
live iframe swallows the wheel and the deck reads as frozen. The `▷ Explorar` CTA
dispatches `nuki-demo:activate` so the pitch path costs no extra click.

The CTA branch must key off resolved config, not off `demoUrl` being present —
otherwise a deck whose demo slide was dropped still renders a button that scrolls
to nothing.

## Styling

Four layers, and a hard scope rule.

| File | Holds |
|---|---|
| `src/styles/tokens.css` | `@import "tailwindcss"` + the `@theme inline` brand tokens + `body` base |
| `src/styles/deck.css` | shell, `.reveal`, `.progress-nav`, the `.slide` foundation, the module-slide design system |
| `src/styles/slides.css` | per-slide, sectioned with `/* ===== NAME ===== */` banners |
| `src/styles/gate.css` | the `.gate*` block — renders *outside* `.deck`, so it is deliberately unscoped |

No `tailwind.config` file; Tailwind v4 is CSS-first. The 15 `--color-nuki-*`
tokens in `@theme inline` also generate utilities (`bg-nuki-green-02`,
`text-nuki-gray-mid`, …), which is what lets the admin panel look like Nuki with
no component library.

**Everything deck-related is scoped under a single `.deck`.** Keep that scope:
`slides.css` defines classes named `.card`, `.grid`, `.item`, `.step`, `.tag`,
`.lead` and `.n`, which would collide with anything added later. ADR 6.

Two rules genuinely cannot live under `.deck`:

- `scroll-snap-type` must sit on `<html>` — that is the scroll container, and
  `.deck` is not a scroller. Scope it to `html.deck-root` so it cannot leak into
  the admin surface.
- The `.gate*` block styles markup rendered outside `<div className="deck">`.
  Do not "fix" it by adding a `.deck` prefix; it would stop matching.

Stylesheets are imported per **root layout**, and Next does not remove
stylesheets on client-side navigation. Two root layouts — one per route group —
is what makes "deck CSS provably absent from `/admin`" true rather than hoped for.

## Adding a slide kind

1. Component in `src/components/slides/`, taking config as props. Never import
   from `src/content/` — the config comes in.
2. Register it in the slide registry, and add its kind to the union.
3. Add its entry to the slide metadata so the admin picker and the nav can label
   it without switching on `kind`.
4. Add its CSS section to `slides.css`.
5. Add config validation if it has invariants (ordering, dependencies on other
   slides).

Nothing outside the registry may switch on `kind`. The moment `ProgressNav` or
the admin grows an `if (kind === "module")`, bespoke slides break it somewhere
nobody is looking.
