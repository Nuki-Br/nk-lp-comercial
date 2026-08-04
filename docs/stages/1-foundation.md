---
audience: agent
status: current
verified_against: src/app/, src/components/, src/content/deck.ts, next.config.ts
size: 300
---

# Stage 1 — Foundation

> Paste this whole file into a fresh agent session. It is self-contained.

## Read this first

This repo is a password-gated sales deck: one Next.js page, 13 slides, pt-BR
copy, Nuki branding. It is becoming a proposal app where a salesperson composes a
customized deck per client and sends a tracked link. You are stage 1 of 3.

**This is not the Next.js in your training data.** It is Next **16**. Before
writing any routing or config code, read the relevant file under
`node_modules/next/dist/docs/`. The single highest-value fact: **`middleware.ts`
does not exist — it was renamed to `proxy.ts`.** A `middleware.ts` file is
silently never executed. You do not need it in this stage, but do not create one.

Read, in this order, and stop there:

1. `AGENTS.md` — the contract. It has already been amended for this work; do not
   revert it.
2. `docs/README.md` — the doc router.
3. `docs/deck-runtime.md` — the DOM contract you must not break.
4. `docs/estimate.md` — the math and the canonical numbers.
5. `docs/stages/README.md` — the rules that apply to every stage.

Four hard rules for this stage:

- **Zero visual change.** A rendered deck must be byte-identical in the DOM.
- **Zero new runtime dependencies.** Still exactly `next`, `react`, `react-dom`
  when you are done.
- **Zero database.** No Supabase, no `src/server/`, no `proxy.ts`.
- **Never `Read` `public/demos/inspetor/index.html`** (5.7 MB) or `src/HTML/**`.

## Goal

Move the deck to `/fast`, make it render from a single JSON-serializable
`DeckConfig` with no visual change, and rebuild the repo's tooling — so stages 2
and 3 have a contract to persist and edit.

## Preconditions — run these, stop on any failure

```bash
# 1. Clean tree. If dirty, STOP and ask the human to commit.
git status --short

# 2. Next 16. If not, the proxy/routing guidance in these docs is wrong.
node -p "require('next/package.json').version"

# 3. The local Next docs exist.
test -f node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md && echo ok

# 4. Baseline green. If red, STOP — you must not inherit a broken tree.
npm run check && npm run build
```

**5. Re-derive the canonical numbers from code. Trust no markdown.** Write a
throwaway script in your scratchpad that imports `computeEstimate` +
`estimateCost` from `src/lib/estimate.ts` and `ESTIMATE_DEFAULTS` +
`PROJECT_SIZE_PRESETS` from `src/content/deck.ts`, and run it with
`npx tsx`. Expected:

| Scenario | Images | Cost |
|---|---|---|
| Defaults | 45 (3 base · 42 option) | R$ 1.428 |
| Studio | 284 (14 base · 270 option) | R$ 8.736 |
| Padrão | 507 (30 base · 477 option) | R$ 15.876 |
| Alto padrão | 738 (45 base · 693 option) | R$ 23.184 |

If they differ, **stop and report** — the presets changed under you and every
number in `docs/estimate.md` and in your tests needs re-deriving first.

## Out of scope — belongs to stage 2 or 3

Do not build, do not scaffold, do not "prepare":

- Supabase, `@supabase/*`, any database, `src/server/`, `proxy.ts`, `/admin`,
  `/p/[slug]`, any tracking
- CSS reformatting, and the dead-CSS deletion in `docs/tech-debt.md` §1–2 —
  it stays queued
- Any copy change, any change to the math in `src/lib/estimate.ts`
- **Renaming the Portuguese identifiers in `CalculatorSlide.tsx`.** Rule 1 is
  already violated there. It is queued in `docs/tech-debt.md` §3 because doing it
  here would drown the pixel-identity diff, which is this stage's whole proof.

## Reading budget

**Read:** every file in `src/components/slides/`, `src/components/deck/`,
`src/app/`, `src/content/deck.ts`, `src/content/modules.ts`, `src/lib/*`,
`next.config.ts`, `package.json`.

**Skim, do not read whole:** `src/styles/slides.css` (2373 lines) — grep for the
section banner you need.

**Never read:** `public/demos/inspetor/index.html`, `src/HTML/**`,
`package-lock.json`, `docs/context/modulo-*.md`.

## Work items, in order

### 1. Amend nothing in AGENTS.md — verify it

`AGENTS.md` was already rewritten for this build. Confirm it does not contradict
your work:

```bash
grep -n "no analytics, ever\|exactly \`next\`, \`react\`\|add a router (single page)" AGENTS.md
```

Must return nothing. If it returns anything, you are on an old checkout — stop.

### 2. Move the deck, and move the gate with it

`AccessGate` currently wraps the **entire app** from `src/app/layout.tsx`. Leave
it there and `/admin` renders the deck's password form in stage 2.

Do the whole move in **one commit** — a `page.tsx` with no root layout above it
is a build error.

1. `src/styles/fonts.ts` — extract the single `Manrope(...)` instance so two root
   layouts do not create two font instances.
2. `src/styles/globals.css` → `src/styles/tokens.css`, content unchanged.
3. Move the `.gate*` block out of `slides.css` into `src/styles/gate.css`. Keep
   it **unprefixed** — the gate renders outside `<div className="deck">`, so
   adding a `.deck` prefix would stop it matching.
4. Narrow the `<html>`-level `scroll-snap-type` rule to `html.deck-root`.
5. Create `src/app/(deck)/layout.tsx` — today's root layout, plus `deck-root` on
   `<html>`, plus `<AccessGate>` moved here, plus the new CSS imports.
6. Create `src/app/(deck)/fast/page.tsx` — today's `page.tsx` body verbatim.
7. Create `src/app/(admin)/layout.tsx` and a stub `src/app/(admin)/admin/page.tsx`
   that renders a single "em construção" heading. Tokens CSS only, no deck CSS.
8. Delete `src/app/layout.tsx` and `src/app/page.tsx`.
9. Leave `src/app/favicon.ico` where it is — route groups do not relocate it.
10. `next.config.ts`: `/comercial` → `/fast`, and `/` → **`/fast`** (307 both).

> **`/` points at `/fast` in this stage, not `/admin`.** The admin is a stub;
> pointing `/` at it would 307 the team's bookmark into an empty page. Stage 2
> flips it when there is something there.

11. `rm -rf .next` and restart the dev server. After a bulk move Next serves
    stale modules and you will chase regressions that do not exist.

### 3. Define `DeckConfig`

New layer `src/deck/`, React-free above the registry so the admin and the DAL can
import types without pulling slide components into their bundle.

```
src/deck/
  types.ts        SlideKind, SlideNode, DeckConfig, EstimateConfig   React-free
  meta.ts         SLIDE_META — label, tone, admin-facing field schema
  defaults.ts     buildDefaultDeck(): DeckConfig                      React-free
  overrides.ts    DeckOverride + parseDeckOverride(unknown)           React-free
  resolve.ts      resolveDeckConfig(base, override) + normalizeDeck() React-free
  anchors.ts      anchorsOf(slides): Anchor[]                         React-free
  registry.tsx    renderSlide(node) — server module, imports every slide
```

**The hard requirement: `DeckConfig` must survive `JSON.parse(JSON.stringify(x))`
deep-equal.** `ESTIMATE_DEFAULTS.initialUnitTypes` and
`PROJECT_SIZE_PRESETS[].buildUnitTypes` are **factory functions** today —
deliberately, because `UnitTypeState` is mutated in place. Convert them to plain
data plus a `materializeUnitTypes()` helper that deep-clones on use, moving the
cloning responsibility to the consumer.

Getting this wrong forces a rewrite in stage 2. There is a test for it (item 6).

Shape (adjust names if the code argues, keep the properties):

```ts
export type DeckConfig = {
  key: string;                       // "fast" or a proposal slug
  document: { title: string; description: string };
  slides: SlideNode[];               // array order IS render order
  estimate: EstimateConfig;
  chrome: { showFooter: boolean; keyboardHint: string; allowPriceOverride: boolean };
};

export type EstimateConfig = {
  plans: Plan[];                     // drop `priceLabel` — see below
  billingCycles: BillingCycle[];
  maxMonths: number;                 // was MAX_MONTHS in PricingSlide.tsx
  imagePrices: { base: number; option: number };
  defaults: { dryOptions: number; wetOptions: number; unitTypes: UnitTypeState[] };
  projectSizePresets: ProjectSizePresetConfig[];
};

export type DeckOverride = {
  order?: string[];                  // node ids; unknown ids dropped, not thrown
  hidden?: string[];
  slides?: Record<string, unknown>;  // V2 copy overrides land here, no migration
  estimate?: Partial<EstimateConfig>;
  document?: Partial<DeckConfig["document"]>;
};
```

**Delete `Plan.priceLabel`.** It duplicates `monthlyPrice`, nothing renders it
(`PricingSlide` formats from `monthlyPrice`), and an admin editing one field but
not the other is a guaranteed live-pitch bug. Derive it.

`resolveDeckConfig(base, null)` must deep-equal `base` — that identity is what
makes "a proposal with no customization looks exactly like the deck" a fact
rather than a chore. In `mergeEstimate`, **arrays replace, they do not
concatenate**: a partial `plans` override must not append to the default plan.

`normalizeDeck` recomputes cross-node facts *after* ordering and hiding: assert id
uniqueness (throw in dev, dedupe and warn in prod); renumber module ordinals; set
the demo anchor on a module only if its demo node survived; drop demo nodes whose
parent module was hidden.

**V2 hooks — type them, build neither:** an optional `copy?` field on the slide
node, and room in the union for a future `custom` kind whose registry arm returns
`null` rather than throwing. Comment them as V2.

**Two slides are currently hidden and this is your acceptance case.**
`DifferentiatorsSlide` and `AudienceSlide` are commented out in `page.tsx`
(commit `e49dd8e`) while `deckNav` still lists both — so the nav renders two dead
dots today. In `buildDefaultDeck()`, model them as **present with `enabled: false`**
rather than absent, and let `anchorsOf` skip disabled nodes. The two dead dots
then disappear as a *consequence of the architecture*, not as a separate fix.

Do **not** un-hide the slides — that was a deliberate content decision. Getting
this right is the smallest possible proof that the config drives the nav.

### 4. Thread it through

`src/components/deck/Deck.tsx` takes `config` and renders: `ProgressNav` from
`anchorsOf(config.slides)`, the slides in config order via the registry, `Footer`,
`DeckBehaviors`, the keyboard hint.

`fast/page.tsx` becomes `<Deck config={resolveDeckConfig(buildDefaultDeck(), null)} />`.

Convert every zero-prop slide to take its config as props. **No slide may import
from `src/content/` any more** — config comes in.

The inline section heads (tag / h2 / lead) exist in eight slides and the cover's
h1 embeds `<em>`. Move them into config. Per ADR 18, move **every** human-visible
string into config now, including ones the V1 admin will never expose
(`CasesSlide`'s logo list, `AudienceSlide`'s `fitList`, `CalculatorSlide`'s
labels) — otherwise V2 has to re-open all ten slide files.

Two more:

- `EstimateProvider` currently wraps exactly three children. Wrap the whole slide
  list instead — harmless and order-independent. Do not try to detect the trio.
- **Publish the keyboard walk list from config**, through a small client context.
  `ModuleDemoSlide.navigate()` rebuilds the identical DOM query by hand today;
  make it consume the shared list. Keep the mount-once `useEffect(…, [])` and
  read ids through a ref so the listener identity never changes.
- Gate the `Ctrl+Alt+K` price panel behind `chrome.allowPriceOverride` — `true`
  for `/fast`.

### 5. Prove the DOM is unchanged

The server HTML is only the gate (`getServerSnapshot` returns `false`), so a curl
diff proves nothing.

Method: in the browser, **before** your changes and **after**, capture
`document.querySelector('.deck').outerHTML` into your scratchpad and diff the two.
**An empty diff is the acceptance bar.** Then run the class-coverage check in
`docs/tech-debt.md` § "How to verify a CSS deletion".

### 6. Tooling

- `biome.json`. **CSS formatting off** and `files.includes` excluding
  `public/demos/**`, `src/HTML/**`, `.next/**` — pointing a formatter at a 5.7 MB
  single-line artifact hangs, and formatting it destroys a committed build output.
  The blanket format pass is **its own isolated commit**.
- Strip `eslint.config.mjs` to `eslint-config-next/core-web-vitals` only, every
  stylistic and TS rule off so it never fights Biome. Script: `lint:next`.
- Vitest. `src/lib/estimate.test.ts` asserting all four canonical scenarios,
  **count and cost**, plus the `DeckConfig` JSON round-trip test.
- `npm run check` = `typecheck && biome ci && eslint && check:docs && vitest run`.
- `.github/workflows/ci.yml`: `npm ci`, `npm run check`, `npm run build`.
- `scripts/check-docs.mjs` **already exists** and passes. As you create the files
  it currently lists in `FUTURE_FILES` and `FUTURE_DIRS`, **remove them from those
  lists** — that is how the check tightens as the build progresses. Do not add
  entries to `PATH_ALLOWLIST` to silence it; fix the doc instead.

### 7. Docs — last, so they describe what you built

Update `docs/architecture.md`, `docs/deck-runtime.md` and `docs/estimate.md` to
match what now exists. Update `README.md` for the new routes and scripts. Add
ADRs to `docs/decisions.md` only if you made a decision the existing ADRs 9–18 do
not already cover.

Mark stage 1 done in `docs/stages/README.md`.

## Human steps

None. This stage needs no credentials and touches no external service. If you
think you need one, you have gone out of scope — re-read "Out of scope".

## Acceptance checklist

```bash
npm run check && npm run build                              # green
npx vitest run                                              # green
grep -rn 'from "@/content/' src/components/slides/          # must be empty
git diff --stat -- src/styles/ public/                      # zero CSS/asset changes
node -e "const p=require('./package.json');console.log(Object.keys(p.dependencies))"
                                                            # exactly next, react, react-dom
node scripts/check-docs.mjs                                 # green
curl -sI localhost:3000/ | grep -i location                 # → /fast
curl -sI localhost:3000/comercial | grep -i location        # → /fast
```

Plus checklist **A** in `docs/testing.md`, in a **visible** browser pane, with
the four canonical values. And the before/after `.deck` outerHTML diff must be
empty.

> `useCountUp` uses `requestAnimationFrame`, which **does not fire in a hidden
> tab**. In a headless or backgrounded pane every animated number freezes at its
> initial value. That is not a bug — make the pane visible or read raw state.

The dependency check is the cheap, mechanical proof that this stage stayed in its
lane. If it fails, you built stage 2's work.

## Done

Commit in the sequence the work items imply — the route move as one commit, the
Biome format pass isolated, the config refactor as its own. Message style matches
the repo: `Refactor(Deck): ...`, `Chore: ...`, `Feat: ...`.

**Do not push.**

Report: the four canonical numbers you derived, whether the outerHTML diff was
empty, the final `dependencies` list, and anything you found that contradicts
these docs — that last one is the most valuable thing you can hand the next agent.
