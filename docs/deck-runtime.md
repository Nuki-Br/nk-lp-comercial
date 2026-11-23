---
audience: agent
status: current
verified_against: src/components/deck/DeckBehaviors.tsx, src/components/slides/*.tsx, src/styles/*.css
size: 254
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
  section is centered. Omit it on light sections. Today: cover, value,
  differentiators.
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
| 2 | the walkable ids from config → `getElementById`, `section.dataset.navId \|\| section.id`, `.progress-nav a` → `.is-active` matched on `dataset.sectionId` | active-section tracking, `rootMargin: "-50% 0px -50% 0px"` |
| 3 | `section.dataset.tone` → `.progress-nav[data-tone]` | palette flip, `"dark"` or `"light"` |
| 4 | `walkableIdsOf(config.slides)` via `DeckNavigationProvider` | the walkable list for keyboard nav |
| 5 | `postMessage` type `nuki-demo:esc` → window event `nuki-demo:exit` | ESC pressed *inside* the demo iframe |
| 6 | `[data-parallax]` → inline `transform` | background-numeral parallax **fallback** |
| 7 | `.keyboard-hint` → `.is-visible` | the ← → hint, shown at 800 ms, hidden at 5000 ms |
| 8 | `.device-grid`, `.device-step`, `.device-screen` | **dead** — nothing renders these. See `tech-debt.md`. |

Keyboard bindings: `←` / `PageUp` / `Shift+Space` back; `→` / `PageDown` / `Space`
forward; `Home` / `End` to the ends. Suppressed while typing (`INPUT`,
`TEXTAREA`, `SELECT`, `contentEditable`).

`document.documentElement.style.scrollBehavior` is set to `smooth` unless the
user prefers reduced motion.

### The walkable list comes from config, not the DOM

**Done in stage 1.** `walkableIdsOf(config.slides)` is published through
`DeckNavigationProvider` (`src/components/deck/DeckNavigation.tsx`) and consumed
by both `DeckBehaviors` and `ModuleDemoSlide.navigate()`. That:

- makes the order authoritative rather than incidental;
- lets a slide opt out of the walk via `walkable: false`, with no DOM hack;
- deleted the dead `.module` selector from both query sites;
- **removed a duplicated contract.** `ModuleDemoSlide.navigate()` used to rebuild
  the identical query by hand, so two places encoded "what is walkable".

The provider exposes a stable **function**, not the array — an array prop changes
identity every render and invites a consumer to put it in a dependency array. The
value is created once with a `useState` initializer (not `useRef`: reading
`ref.current` during render is a React rule violation and `eslint-config-next`
rejects it), and the ids are read through a ref at keypress time. `DeckBehaviors`
lists `getWalkableIds` in its dependency array and still mounts exactly once,
because that identity never changes.

`DeckNavigationProvider` renders no DOM node. Anything else would break the
`.deck` identity the stage had to prove.

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
keeps its demo points `data-nav-id` at a dot that no longer exists.

**Both halves exist now.** In the config the demo is its own node — it needs an
id of its own, because it is arrow-navigable, stage 2's tracking keys on the
anchor id, and `DeckOverride.order` is keyed by id. What makes it a *checkbox* is
`SLIDE_META.module.fields` carrying `hasDemo`, with `module-demo` marked
`addable: false` — so the admin cannot construct the orphan. `normalizeDeck` is
the backstop for configs written by hand or by an older deploy: any node whose
`parentId` names an absent-or-disabled node is dropped, and `navId` is derived
rather than authored, so it cannot point at a dot that is gone.

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

The CTA branch keys off **`node.childId`** — set by `normalizeDeck` only when the
demo node survived — not off `demoUrl` being present. A deck whose demo was
dropped would otherwise still render a button that scrolls to nothing. The
precedence is `links` → demo → `learnMore`; `planner` and `personaliza` have
`links`, so only `inspetor` reaches the demo branch.

## PDF export

`.pdf-download` (`src/components/deck/DownloadPdfButton.tsx`) calls
`window.print()` — the browser's own "Save as PDF" destination does the export,
so this needed no dependency (Rule 3). It renders unconditionally from `Deck.tsx`,
same as `.keyboard-hint`, so it is present on `/fast`, `/p/[slug]` and
`/preview/[id]` alike.

`src/styles/print.css` is the other half of that contract. It is **imported
last** in `src/app/(deck)/layout.tsx`, after `slides.css`, and that is not
cosmetic: the rules it needs to beat — `.deck .pdf-download` in `slides.css`,
`.deck .slide.is-fullscreen` in `deck.css` — sit at the same specificity, so the
print sheet only wins by source order. The block this replaced lived at the end
of `deck.css` and lost exactly that fight, which is why the export shipped with
the download pill, the back chevron and the demo iframe stamped on every page.
Selectors that hide chrome are over-qualified on top of that (`.deck button.pdf-download`,
`.deck .cover a.back-link`, `.deck .slide.is-fullscreen.module-demo-slide`) so
they do not depend on order alone. Do not put a `@media print` block anywhere
else.

What it does:

- Sets `@page { size: 1436px 808px; margin: 0 }` — a 16:9 landscape sheet, not
  A4. A deck laid out for a widescreen viewport has to letterbox or crop on
  1.41:1 paper. The width is also deliberately above the 1280px breakpoint, so
  the print layout resolves the same media queries a ≥1280px screen does; the
  measuring pass below depends on that equality. Zero margin is also what
  suppresses Chrome's page header/footer — there is no CSS to switch those off,
  only a margin box to deny them.
- Hides `.progress-nav`, `.keyboard-hint`, `.pdf-download`, the cover's
  `.back-link`, the footer, and — per product requirement — `.module-demo-slide`.
  The inspector iframe is never in the PDF, so the export is one page shorter
  than the deck has sections.
- Forces `.reveal` to `opacity: 1` — it starts at `0` and only flips on
  `IntersectionObserver`, which a slide the visitor never scrolled to (or that
  is printed cold, straight after load) never fires.
- Forces `print-color-adjust: exact` so dark-tone sections keep their
  background instead of printing white.
- Makes each `.slide` **exactly one page box**: fixed height, `overflow: hidden`,
  `break-before: page` on all but the first (`break-before`, not `break-after` —
  a hidden trailing slide would otherwise ask for a page with nothing on it).

### Fitting a slide to its page

A page box alone would crop: the sections were laid out for a viewport they are
free to overflow, and a tall one does. So
`DownloadPdfButton.tsx` registers a `beforeprint` listener that measures each
slide and writes a per-slide `--print-scale`, which the sheet applies to
`.slide-inner`.

The measuring pass adds `.is-print-fitting` to `<html>`, which reproduces the
print box's width on screen with the height left free, reads
`getBoundingClientRect()`, and removes the class — all in one synchronous task,
so layout is forced but nothing is ever painted and the reader sees no flash.

Two things follow from measuring on screen rather than in paged media:

- It is only faithful at viewport widths **≥ 1280px**, where the screen and the
  1436px page resolve the same media queries. Below that the numbers drift; a
  `0.98` safety factor and `overflow: hidden` bound the damage.
- Without JS the property falls back to `1` and tall slides crop. The page
  geometry still holds — only the overflow is lost.

`.slide-inner` is what scales, not `.slide`. That keeps each slide's background
and its page-edge decorations (the module numeral, the pearl) filling the sheet
while the copy shrinks inside it.

The px constants in `DownloadPdfButton.tsx` mirror the `@page` box and slide
padding in `print.css`. Nothing enforces the pairing at build time; the two files
name each other in comments.

## Styling

Five layers for the deck, and a hard scope rule.

| File | Holds |
|---|---|
| `src/styles/tokens.css` | `@import "tailwindcss"` + the `@theme inline` brand tokens + `body` base |
| `src/styles/deck.css` | shell, `.reveal`, `.progress-nav`, the `.slide` foundation, the module-slide design system |
| `src/styles/slides.css` | per-slide, sectioned with `/* ===== NAME ===== */` banners |
| `src/styles/gate.css` | the `.gate*` block — renders *outside* `.deck`, so it is deliberately unscoped |
| `src/styles/print.css` | the whole print surface — imported **last**, see "PDF export" above |

A fifth sheet, `src/styles/admin.css`, belongs to the other root layout and never
loads on a deck route — it is the panel's design system and is documented in
ADR 21, not here. `tokens.css` used to be imported by both layouts; it is now
deck-only.

No `tailwind.config` file; Tailwind v4 is CSS-first. The 15 `--color-nuki-*`
tokens in `@theme inline` also generate utilities (`bg-nuki-green-02`,
`text-nuki-gray-mid`, …). `admin.css` redeclares that same ramp, so the panel
still speaks the Nuki palette with no component library.

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
