<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# nk-lp-comercial — agent guide

## What this repo is

One password-gated sales deck, served at `/`. A salesperson walks a prospect
through it live. It is not a marketing site and not a multi-page app.

It was split out of `nk-lp` (the public landing page) for one reason: both lived
in the same Next.js app, so every pitch session landed in the same GA / Clarity /
Vercel Analytics properties as marketing traffic and contaminated the funnel.

## Rule 1 — English code, pt-BR copy

Identifiers, types, object keys, file names, CSS class names, `data-*`
attributes and comments are **English**. Every string a human reads in the
browser is **pt-BR**.

```ts
// wrong — Portuguese key
export const problemCards = [{ titulo: "Planejamento", dor: "Consome 3 a 4 meses" }];
// right — English key, Portuguese value
export const problemCards = [{ title: "Planejamento", pain: "Consome 3 a 4 meses" }];
```

The copy contains the very words that look like identifiers ("ciclo", "meses",
"imagens", "dor"). If you rename in bulk, drive it off the TypeScript AST and
touch only `Identifier` nodes — a word-boundary regex will corrupt the copy and
`Intl`'s own `currency` option key. See `docs/decisions.md`.

## Rule 2 — no analytics, ever

No `@vercel/analytics`, no `@microsoft/clarity`, no `gtag`, no pixel, no
`sendBeacon`, no custom telemetry. This is the reason the repo exists.
Runtime dependencies are exactly `next`, `react`, `react-dom` — keep it that way.

## Layers

| Path | Holds | Never holds |
|---|---|---|
| `src/app/` | routing, metadata, layout composition | logic, copy |
| `src/components/deck/` | chrome: access gate, progress nav, global behavior, estimate provider | slide content |
| `src/components/slides/` | one file per slide | anything reusable |
| `src/components/ui/` | primitives with no domain knowledge | imports from `content/` |
| `src/components/layout/` | footer | |
| `src/content/` | pt-BR copy + config constants | JSX, React imports |
| `src/hooks/`, `src/lib/` | shared behavior; `lib/` is pure and React-free | |
| `src/styles/` | all CSS | |

Components are `PascalCase.tsx`; everything else is `camelCase.ts`.

## Invariants that break silently

- **Every `deckNav` entry needs a rendered element with that `id`.** Miss one and
  the progress nav loses a dot with no error. `src/content/deck.ts`.
- **`DeckBehaviors` owns the DOM contract.** It queries `.slide`,
  `[data-reveal-group]`, `[data-tone]`, `[data-parallax]`, `[data-back-target]`,
  `[data-section-id]`, `.module-demo-slide`, and toggles `html.demo-locked`. Renaming any
  of those means changing both the component and the CSS.
- **`nuki-demo:esc` must not be renamed.** The postMessage type is baked into the
  committed 2.3 MB `public/demos/inspetor/index.html`. Renaming the listener
  without regenerating that file silently kills ESC-from-inside-the-iframe.
- **Asset basenames are verbatim**, typo included (`vizualizador-planner`).
- **`public/demos/inspetor/index.html` is a committed build artifact.** The patch
  script does not run in the Vercel build. Regenerate with
  `node scripts/prepare-inspetor-demo.mjs`; never hand-edit it, and never `Read`
  it — it is 2.3 MB on a handful of enormous lines.
- Copy lives in `src/content/`, not in JSX. `CoverSlide` and `CasesSlide` still
  have inline copy; moving them out is welcome.

## Verify before claiming done

```bash
npm run check && npm run build
```

`check` = typecheck + lint. There are no tests, deliberately — a static deck
whose only logic is the estimate calculator has near-zero unit-test ROI. Do not
scaffold a test framework. (The pricing math already lives in a pure module,
`src/lib/estimate.ts` — if it is ever disputed in a sales call, that one file is
the thing to test.)

Most of this deck is browser behavior that typecheck cannot see. After any change
to `DeckBehaviors`, the calculator or the demo slide, load `localhost:3000` and
check: the gate, arrow-key navigation across all 13 anchors, the reveal stagger,
the Inspetor iframe (including ESC from inside it), and the estimate propagating
to the closing frame. At defaults it must read **45 imagens (3 base · 42 de
opção) / R$ 1.428**. Also click each of the three porte presets — Studio 208,
Padrão 678, Alto padrão 1.544 imagens.

> Note for browser-driving agents: `useCountUp` animates with
> `requestAnimationFrame`, which does not fire in a hidden tab. In a headless or
> backgrounded pane every animated number freezes at its initial value — that is
> not a bug. Read the raw values, or make the pane visible.

## Where to look

| Task | Read |
|---|---|
| change slide copy or pricing | `docs/content-guide.md` |
| add or reorder a slide | `docs/architecture.md` |
| embed a module demo | `docs/demo-embedding.md` |
| product facts, claims, positioning | `docs/context/README.md` |
| deploy, env vars, redirects | `docs/deployment.md` |
| why something is the way it is | `docs/decisions.md` |

## Do not

- add a router (single page), a CMS, or a test framework
- reintroduce any coupling to `nk-lp`
- make the deck indexable — it is `noindex` on purpose, pricing is in the bundle
