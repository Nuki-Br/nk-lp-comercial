---
audience: both
status: current
verified_against: the stage files in this directory, and git log 1ef10b6..06308b7
size: 193
---

# Build stages

Three sequential stages that turn the static deck into the proposal app. Each
file is a **prompt**: paste it into a fresh agent session with no prior context.

These are the only files under `docs/` that are instructions. Everything else is
reference — do not treat a reference doc as a task list.

## Status

Update the row when a stage merges. Never delete one; this table becomes the
build's history.

| # | Stage | Status | Merged |
|---|---|---|---|
| 0 | Commit the working tree | done | 5240a71 |
| 1 | [Foundation](1-foundation.md) — `/fast`, `DeckConfig`, docs, tooling | **done** | 1ef10b6 |
| 2 | [Proposals](2-proposals.md) — Supabase, `/admin` login, `/p/[slug]`, tracking | **done** | 4731d4b |
| 3 | [Composer](3-composer.md) — the editing UI and the tracking read-out | **done** | cdebbd4 |

Stage 1 merged to `main` as nine commits, fast-forward, `006c510..1ef10b6`. The
route move, the estimate-defaults conversion and the `DeckConfig` layer are each
their own commit, so `git show` on any one of them is reviewable on its own.

Stage 2 landed as twelve commits, `1ef10b6..4731d4b`, one per work item. Five
migrations, applied. `npm run check`, `npm run build` and 97 tests green; both CI
assertions live in the workflow; `supabase/tests/rls.sql` run and passing 7/7;
checklist A and checklist B walked end to end.

**Three things it did not do, recorded here rather than discovered later:**

- **Password recall through Supabase Vault is not built.** ADR 14 promises a
  salesperson can re-read a proposal's password months later. The column
  (`proposal_access.vault_secret_id`) exists and stays null: `vault.*` is outside
  the exposed schema, so it needs a `public` wrapper function granted to
  `service_role` only. The admin UI says so where a password is set, rather than
  implying a recall that does not exist.
- **"Exactly one tracking beacon per slide transition" was never observed.** The
  ingest contract was verified end to end — three identical flushes, one applied,
  totals exact — but an automated pane reports `visibilityState: hidden` and
  `innerHeight: 0`, so the collector correctly accrues nothing and the observer
  never fires. That item needs a human with a visible tab.
- **`npm audit` reports high-severity advisories against `next@16.2.9`** and its
  transitive `postcss` / `sharp`, including unauthenticated disclosure of
  internal Server Function endpoints. None come from the three dependencies this
  stage added. The fix is `next@16.3.0`, outside the pinned range, and it is a
  deck-rendering risk — deliberately left as a decision, not taken quietly.

Stage 3 landed as nine commits, `4731d4b..cdebbd4`, one per work item plus one
deck-layer fix that the composer's design uncovered. No migration — the composer
writes a column stage 2 created. **V1 is complete at this point.**

**What stage 3 found that these docs had wrong:**

- **`Ctrl+Alt+K` on `/p/[slug]` needed no human confirmation.** The brief lists
  it as a human step; `forVisitor` already forces `allowPriceOverride` false at
  publish and at render, and `dal.test.ts` already asserted it.
- **`childId` survived a disabled child.** Found while designing the "tem demo"
  checkbox: `ModuleSlide` renders its "▷ Explorar" CTA off `node.childId`, so
  disabling only the demo left a button pointing at an anchor that renders
  nothing. The docs anticipated the opposite orphan and not this one.

**What stage 3 did not do:**

- **Nobody has walked the composer in a browser.** Every server path was
  exercised against the real database — the delta write, the cross-form
  `estimate` merge, a refused invalid config leaving the row untouched,
  staleness in both directions, and the read-out over rows written through the
  real ingest RPC — and `/fast` was re-verified against checklist A. But
  `requireAdmin()` needs a Supabase session, and the agent that built this could
  not sign in. **Checklist C is unrun.**
- **Password recall through Vault is still not built.** Unchanged from stage 2.
- **`npm audit` still reports highs against `next@16.2.9`.** Unchanged, and still
  a decision rather than an oversight.

## What stage 3 left for V2

- **Per-slide copy overrides and bespoke slides**, ADR 18. Typed, validated,
  unbuilt — `src/deck/v2Hooks.test.ts` is what stops the hooks rotting. V2 needs
  a form driven by `SLIDE_META[kind].fields` writing into `DeckOverride.slides`,
  and a `custom` renderer in the registry.
- **`SLIDE_META.fields` is still only half-read.** The composer uses `hasDemo`,
  `addable`, `description` and `label`; the `text`/`richtext`/`textarea`/`list`
  specs exist for V2's copy editor and nothing consumes them yet.
- **The dead-CSS cleanup**, still queued in `tech-debt.md`.
- **`CalculatorSlide.tsx`'s Portuguese identifiers**, still queued there too. This
  stage touched that file in one place and deliberately did not rename around it.

## What stage 2 left for stage 3

- **`config_override` is untouched.** Every proposal ships `{}`, so each one *is*
  `buildDefaultDeck()`. Stage 3 is the first code to write into that column, and
  `resolveDeckConfig` / `parseDeckOverride` already handle whatever it writes.
- **`src/server/config/validate.ts` exists and rejects.** Call it before every
  write. `normalizeDeck` is the tolerant half and must stay that way.
- **`SLIDE_META` has never been read by anything.** It was built in stage 1 as
  the composer's field schema (ADR 18) and stage 2 had no use for it. If it is
  wrong, stage 3 is where that surfaces.
- **Publishing already freezes the snapshot** through `forVisitor()`, so
  `allowPriceOverride` cannot reach a client. Do not add a second publish path.
- **The tracking read-out is stage 3's.** Stage 2 stores dwell per anchor and
  shows only a raw open count. `docs/tracking.md` describes the data; Rule 3
  still bans the chart library.
- **`docs/admin-guide.md` does not exist.** `scripts/check-docs.mjs` already
  lists it as a future file.

## What stage 1 left for stage 2

> **History, kept rather than deleted.** Stage 2 is done, so every item below is
> discharged — the first one reads like a live instruction and is not: `/` points
> at `/admin` now. The bullets stay because they record what was decided and why,
> which is the same reason an ADR body is never rewritten.

Read these before starting stage 2; they are contract decisions, not trivia.

- **`/` redirects to `/fast`, not `/admin`.** The admin is a stub. Flip it in
  `next.config.ts` once there is something there. `AGENTS.md`'s route table
  already says `/admin`; that divergence is deliberate and temporary.
- **`chrome.allowPriceOverride` is deliberately absent from `DeckOverride`.** It
  is decided at the render site and never persisted, because `config_snapshot`
  stores the *resolved* config — if it were in the delta, `/fast`'s `true` would
  freeze into every published proposal and ship the `Ctrl+Alt+K` cost panel to
  clients. `/p/[slug]` must resolve with `false`.
- **`DeckOverride.shown` exists** alongside `hidden`, so a proposal can re-enable
  a slide that ships disabled (today: `differentiators`, `audience`).
- **`normalizeDeck` is tolerant, not rejecting** — it warns and repairs. The
  validator that *rejects* is stage 2's `src/server/config/validate.ts`.
- **`RoomAreaType` is `"dry" | "wet"`.** It was `"seca" | "molhada"`; stage 2
  renamed it in its own commit *before* authoring any migration, because these
  values land in JSONB and a later rename would be a data migration over live
  proposals. The pt-BR tags rendered next to them did not move — `tech-debt.md` §9.

## Why the stages are cut this way

**`DeckConfig` is the contract between all three, and it is defined by the agent
that can see all thirteen slides and nothing else.**

- Stage 1 **defines** it — validated by rendering the real deck from it, pixel-identical.
- Stage 2 **persists** it — the migration is a mechanical projection of a type that already renders.
- Stage 3 **edits** it — forms over a shape two stages have already proven.

The alternative orderings were considered and rejected:

**Layer-first** (infra → rendering → UI) ships nothing verifiable in stage 1, and
designs the storage shape with no consumer to validate it. The concrete landmine:
`initialUnitTypes` and `buildUnitTypes` are factory functions today, so a schema
designed before anyone tried to serialize the config would be wrong on contact.
It also pairs the highest-risk refactor with new infrastructure, so when the deck
breaks the agent cannot tell which half broke it.

**Vertical-slice** (thin end-to-end → customization → tracking) is the right
instinct but does not divide into three. Stage 1 would have to hold auth, schema,
migrations, the `/fast` move, the data-driven refactor and an admin skeleton.
That is an excellent five-stage plan and a bad three-stage one.

**Risk-first** — chosen. The pixel-identity refactor goes alone, with docs and
tooling fused in because stage 1 is already reading every slide component and
`DeckBehaviors` in order to make them config-driven. It is the only stage that
will hold the ground truth needed to keep those docs honest, and stages 2 and 3
depend on them being right.

## Rules that apply to every stage

1. **Verify preconditions before trusting them.** Each stage starts with
   executable commands and expected output. Any failure means STOP and report —
   not improvise.
2. **Each stage ends shippable.** `npm run check && npm run build` green, and the
   acceptance checklist self-run.
3. **Never build ahead.** Every stage names what belongs to the next one. Scope
   creep here means the next agent inherits half-finished work with no record of
   what state it is in.
4. **Each stage writes only the docs it can verify.** Nobody documents something
   that does not exist yet. This is why `data-model.md` is absent until stage 2.

## Never read these files

They will blow your context window or waste a large fraction of it:

| Path | Why |
|---|---|
| `public/demos/inspetor/index.html` | 5.7 MB on a handful of enormous lines |
| `src/HTML/**` | the 5.7 MB source of the above |
| `package-lock.json` | no information you need |

`docs/context/modulo-*.md` are 170–630 lines each. Read one only if your task is
about that module's screens.
