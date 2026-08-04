---
audience: both
status: current
verified_against: the stage files in this directory
size: 110
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
| 0 | Commit the working tree (see below) | **required first** | — |
| 1 | [Foundation](1-foundation.md) — `/fast`, `DeckConfig`, docs, tooling | not started | — |
| 2 | [Proposals](2-proposals.md) — Supabase, `/admin` login, `/p/[slug]`, tracking | not started | — |
| 3 | [Composer](3-composer.md) — the editing UI and the tracking read-out | not started | — |

## Before stage 1 — do this yourself

The working tree has uncommitted changes to `AGENTS.md`, `docs/architecture.md`
and `src/content/deck.ts` that **fix the calculator preset compositions**. The
committed `AGENTS.md` claims preset totals of 208 / 678 / 1.544; the code now
produces 284 / 507 / 738.

```bash
git status --short
```

Commit or stash them before starting. Stage 1 refuses to run on a dirty tree, and
losing that work reintroduces the stale numbers.

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
5. **Do not use the Supabase MCP server.** It requires an interactive OAuth flow
   an agent session cannot complete. The CLI over `DIRECT_URL` needs no OAuth and
   is the supported path. If MCP tools appear in your tool list, ignore them.
6. **Agents author migrations; humans apply them.** `.claude/settings.json`
   enforces this by denying `supabase db push` and `psql`.
7. **Do not commit or push unless asked.** Report what you did and let the human
   review the diff.

## Never read these files

They will blow your context window or waste a large fraction of it:

| Path | Why |
|---|---|
| `public/demos/inspetor/index.html` | 5.7 MB on a handful of enormous lines |
| `src/HTML/**` | the 5.7 MB source of the above |
| `package-lock.json` | no information you need |
| `.env` | holds a service key; check names with `cut -d= -f1`, never values |

`docs/context/modulo-*.md` are 170–630 lines each. Read one only if your task is
about that module's screens.
