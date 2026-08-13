<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# nk-lp-comercial — agent guide

**This file holds rules, not explanations.** Every "why" lives in exactly one doc
under `docs/`. If you find yourself explaining here, you are drifting — and a
drifting summary is how the estimate numbers in this very file went stale.

Router: **`docs/README.md`** — read it, then read the one doc it points you at.

## What this repo is

A sales tool with three surfaces:

| Route | What it is | Gate |
|---|---|---|
| `/` | 307 → `/admin` | — |
| `/admin/**` | proposal composer, for the Nuki team | Supabase Auth session |
| `/p/[slug]` | one client's customized proposal | per-proposal password, server-verified |
| `/fast` | the code-driven quick-pitch deck | shared password, client-side (deliberate) |
| `/preview/[id]` | the composer's live preview of one proposal | Supabase Auth session |
| `/comercial` | 307 → `/fast` | — |
| `/api/**` | route handlers | per route |

It was split out of `nk-lp` (the public landing page) for one reason: both lived
in the same Next.js app, so every pitch session landed in the same GA / Clarity /
Vercel Analytics properties as marketing traffic and contaminated the funnel.

> **Build in progress.** Not every surface above exists yet. `docs/stages/README.md`
> is the authoritative status — check it before assuming a route, table or module
> is there. Never build ahead of your stage.

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
`Intl`'s own `currency` option key. See `docs/decisions.md` ADR 4.

Known violation, do not fix opportunistically: `CalculatorSlide.tsx` carries
`setOpcoesSecas`, `setMetragens`, `addAmbiente` and friends. It is queued in
`docs/tech-debt.md` because renaming it inside another change drowns that
change's diff.

## Rule 2 — no third-party analytics, ever

No `@vercel/analytics`, no `@microsoft/clarity`, no `gtag`, no pixel, no tag
manager, no session replay, no error-reporting SaaS. **Zero third-party network
requests from any page.** This is the reason the repo exists — `docs/decisions.md` ADR 2.

**First-party proposal tracking is not analytics and is allowed.** `/p/[slug]`
records view sessions and per-slide dwell time into our own Postgres, for a
proposal we issued to a named client. The rule is not "which API is used" — it is
these three tests:

1. Does the request leave our origin? → forbidden.
2. Is the collecting code reachable from `/fast`, `/admin` or `/preview/[id]`?
   → forbidden. Tracking mounts **only** inside the `/p/[slug]` render path.
   `/preview/[id]` renders the same `<Deck>` and passes no `behaviors`, which is
   how it stays out — an admin rehearsing a pitch is not a client reading one.
3. Does it add a vendor SDK to `package.json`? → forbidden.

`navigator.sendBeacon` stays banned by name; the sanctioned transport is
`fetch(url, { keepalive: true })` to our own origin. Same mechanism, and it can
read the response, which the dedup protocol needs. See `docs/tracking.md`.

## Rule 3 — dependency discipline

The runtime dependency list is a reviewed artifact. Adding to it requires an ADR
in `docs/decisions.md` **in the same commit**.

| Package | Why it is here |
|---|---|
| `next`, `react`, `react-dom` | the framework |
| `@supabase/supabase-js`, `@supabase/ssr` | Supabase Auth for `/admin`, cookie-based server sessions |
| `zod` | one validator, server-only, shared by the admin write path and the DAL read path |

Banned outright, no ADR available:

| Not adding | Because |
|---|---|
| `bcryptjs`, `argon2` | `node:crypto.scrypt` + `timingSafeEqual` |
| `jose`, `jsonwebtoken` | `node:crypto.createHmac`, ~20 lines |
| `uuid` | `crypto.randomUUID()` / `gen_random_uuid()` |
| Prisma, Drizzle, any ORM | supabase-js is already here; `DIRECT_URL` is for migrations only |
| `@upstash/ratelimit` and friends | `proposal_access_attempts` + one indexed `count(*)` |
| `date-fns`, `dayjs` | `Intl` and ISO strings |
| shadcn/Radix, MUI, Chakra, Headless UI | ~15 packages and a second token layer that forks the Nuki palette |
| any chart library | a table and CSS bars |
| any analytics or telemetry SDK | Rule 2 |

The point was never "three dependencies". It was that every dependency shows up
in a `package.json` diff and someone wrote down why.

## Rule 4 — the surfaces are enumerated; the deck is still one page

The route table at the top is the whole list. A surface that is not in it needs
an ADR — `/preview/[id]` is the one that has one (ADR 22), and it is a render of
an existing document for the team, not a new product surface.

**The deck itself is still a single scrolling page.** `/fast`, `/p/[slug]` and
`/preview/[id]` each render one document with N sections and no client-side
navigation between slides — arrow keys scroll, they do not route. Do not introduce `/p/[slug]/[n]`,
a slide-level router, or any client routing library. That is what "no router"
meant, and it still holds.

## Layers

| Path | Holds | Never holds |
|---|---|---|
| `src/app/(deck)/` | root layout #1 + `/fast` + `/p/[slug]` + `/preview/[id]` | SQL, secrets, business logic |
| `src/app/(admin)/` | root layout #2 + the composer | SQL, password logic, deck CSS |
| `src/app/api/` | route handlers — parse, authorize, delegate | business logic, SQL |
| `src/deck/` | `DeckConfig` types, defaults, override merge, slide registry | pt-BR copy (re-exports `content/`), DB access |
| `src/server/` | SQL, DAL, auth, crypto, tracking, Zod schemas. **`import "server-only"` on line 1 of every file** | React, JSX, any `NEXT_PUBLIC_*` |
| `src/components/deck/` | chrome: gate, progress nav, behaviors, providers | slide content, DB types |
| `src/components/slides/` | one file per slide kind; props in, no fetching | imports from `src/server/` or `src/content/` |
| `src/components/admin/` | admin-only UI and forms | deck CSS class names |
| `src/components/ui/` | primitives with no domain knowledge | imports from `content/` |
| `src/components/layout/` | footer | |
| `src/content/` | pt-BR copy + **default** config constants | JSX, React, DB reads, **functions in exported config** |
| `src/hooks/` | shared client behavior | |
| `src/lib/` | pure, React-free, importable from both sides | `process.env`, DB, `next/headers` |
| `src/styles/` | all CSS | |
| `proxy.ts` (repo root) | coarse `/admin` gating only | DB queries, content decisions |
| `supabase/migrations/` | numbered, forward-only SQL | anything applied by hand without a file |

`src/server/**` must be unreachable from any `"use client"` module. `server-only`
turns a leak into a build error; do not work around it.

Components are `PascalCase.tsx`; everything else is `camelCase.ts`.

## Invariants that break silently

- **`middleware.ts` is not a thing here.** Next 16 renamed it to `proxy.ts` (repo
  root, Node runtime; setting `runtime` throws). A `middleware.ts` file is never
  executed and there is no error.
  `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
- **`proxy.ts` is not the authorization boundary.** Next's own guide calls it an
  optimistic check. Proposal content is gated in `src/server/proposals/dal.ts`,
  the only path to it. A second path re-opens the leak.
- **`DeckConfig` must stay JSON-serializable.** It round-trips through JSONB. No
  functions, no `Date`, no `Map`. A test asserts the round trip; if it fails, the
  config is wrong, not the test.
- **A published proposal renders its snapshot, never the live defaults.** Editing
  `src/content/` must not change a document a client already received.
- **The demo slide borrows another slide's nav dot** (`data-nav-id="inspetor"`).
  A config that hides the `inspetor` module but keeps its demo blanks the progress
  nav. Config validation rejects it.
- **`calculator` must come before `total`.** The closing frame reads what the
  calculator publishes.
- **Every nav entry needs a rendered element with that `id`,** and ids must be
  unique. Duplicates make `getElementById` pick the first, light two dots, and
  double an entry in the keyboard walk list — all silently.
- **`DeckBehaviors` owns the DOM contract.** It queries `.slide`,
  `[data-reveal-group]`, `[data-tone]`, `[data-parallax]`, `[data-section-id]`
  and `[data-nav-id]`. Renaming any of those means changing both the component
  and the CSS. Full table: `docs/deck-runtime.md`.
- **The demo slide snaps; it does not lock.** `.module-demo-slide` carries
  `scroll-snap-align: start` and the root carries `scroll-snap-type: y proximity`
  — they are a pair: drop one and the snap dies silently. The previous
  `html.demo-locked` (`overflow: hidden`) froze the deck at whatever offset the
  observer happened to fire on. Do not bring it back.
- **The demo iframe is inert until activated.** `.module-demo-slide` without
  `.is-active` sets `pointer-events: none` on the frame. This is load-bearing:
  the embedded document has `overscroll-behavior: none` and no internal
  scroller, so a live iframe swallows the wheel and the deck reads as frozen.
- **`nuki-demo:esc` must not be renamed.** The postMessage type is baked into the
  committed 6.0 MB `public/demos/inspetor/index.html`. Renaming the listener
  without regenerating that file silently kills ESC-from-inside-the-iframe.
  `DeckBehaviors` re-emits it as the window event `nuki-demo:exit`.
- **Asset basenames are verbatim**, typo included (`vizualizador-planner`).
- **`public/demos/inspetor/index.html` is a committed build artifact.** The patch
  script does not run in the Vercel build. Regenerate with
  `node scripts/prepare-inspetor-demo.mjs`; never hand-edit it, and never `Read`
  it — it is 6.0 MB on a handful of enormous lines.

## Verify before claiming done

```bash
npm run check && npm run build
```

`check` = typecheck + Biome + ESLint + Vitest.

**There are no tests for the deck, deliberately. There are tests for money,
passwords and time, mandatorily.** ADR 7 decided against a test framework and its
reasoning — "a static deck whose only logic is the calculator" — stopped being
true. Slide components, snapshots, `DeckBehaviors`, the iframe, keyboard nav and
observers stay untested; unit tests would not catch those failures anyway. Scope
and rationale: `docs/testing.md`, ADR 12.

Most of this repo is browser behavior that typecheck cannot see. The three manual
checklists — one per surface — are in `docs/testing.md`. The canonical estimate
numbers live in **`docs/estimate.md`** and nowhere else; they are wrong in three
places in this repo's history precisely because they were copied around.

> Note for browser-driving agents: `useCountUp` animates with
> `requestAnimationFrame`, which does not fire in a hidden tab. In a headless or
> backgrounded pane every animated number freezes at its initial value — that is
> not a bug. Read the raw values, or make the pane visible.

## Do not

- add a slide-level router, a CMS, or a second styling system
- reintroduce any coupling to `nk-lp`
- make any surface indexable — everything is `noindex` on purpose
- write `docs/context/modulo-personaliza-produto.md`. It does not exist because
  nobody has written down the facts; an agent filling that gap invents them about
  the one module validated in production.
- propagate the figures **60% / 100% / 10x / 95%** used on the module slides.
  `docs/context/README.md` registers them as having no traceable source.
- document something you did not verify in the same session. A confidently wrong
  doc costs more than a missing one.
