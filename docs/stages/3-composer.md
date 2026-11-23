---
audience: agent
status: partially-superseded
verified_against: docs/deck-runtime.md, ADR 13 and ADR 18
size: 193
---

# Stage 3 — Composer

> Paste this whole file into a fresh agent session. It is self-contained.
> **Stages 1 and 2 must be merged and green.** Verify; do not assume.

> **Done, and partly removed since.** The plan slide (ADR 26) and the image
> calculator with its closing frame and `Ctrl+Alt+K` panel (ADR 27) left the
> product after this stage; the passages that built them are gone from this
> brief. What remains is the record of the rest.

## Read this first

This repo is a sales deck that became a proposal app. Stage 1 made the deck
render from a `DeckConfig`. Stage 2 persisted it and built the password-gated
public surface. You are stage 3: the editing UI, plus the tracking read-out.

Everything you build **writes the same `DeckConfig` that stage 2 already
renders.** You are adding forms over a proven shape, not designing a new one. If
you find yourself wanting to change `DeckConfig`, stop and think hard — that is a
signal something upstream is wrong, and changing it invalidates two stages of
verification.

**Next 16, not what your training data says.** `middleware.ts` does not exist
(it is `proxy.ts`); proxy is optimistic and the DAL is authoritative. You should
not need to touch either in this stage.

Read, in this order, and stop: `AGENTS.md`, `docs/README.md`,
`docs/architecture.md`, `docs/data-model.md`, `docs/deck-runtime.md`,
`docs/stages/README.md`.

## Goal

A real composer: per-proposal slide selection and order, publish-with-snapshot,
and the per-slide dwell read-out.

## Preconditions — run these, stop on any failure

```bash
# 1. Baseline green.
npm run check && npm run build && npx vitest run

# 2. Stage 2 landed.
test -f src/server/proposals/dal.ts && test -f proxy.ts && \
  test -d "src/app/(deck)/p" && test -f docs/data-model.md && echo ok

# 3. A proposal can be created in /admin and opened at /p/[slug] with a password.
#    Do this by hand in a browser.
```

**4. The round trip is real — this one is load-bearing.** Change `config_override`
for one proposal **directly in SQL** (ask the human to run it, or use
`scripts/db-smoke.mjs`) — for example add a slide id to `hidden` — and confirm
`/p/[slug]` renders differently.

**If editing the JSONB does not change the render, STOP.** Stage 2 is incomplete
and you would spend this entire stage building forms over a dead path, with
nothing failing until a client meeting.

## Out of scope

- **V2: per-slide copy overrides and bespoke slides.** Type them, validate them,
  build neither. ADR 18.
- PDF export, email, orgs, roles beyond what stage 2 built, i18n.
- Any tracking beyond dwell.
- The dead-CSS cleanup — still queued in `docs/tech-debt.md`.

## Reading budget

**Read:** `src/deck/*` (all of it — it is your data model), `src/server/`,
`src/app/(admin)/`, `docs/data-model.md`.

**Never read:** `public/demos/inspetor/index.html`, `src/HTML/**`,
`package-lock.json`, `docs/context/modulo-*.md`.

## Work items

### 1. Validate at both boundaries

`src/server/config/validate.ts`, used on **admin write** and on **DAL read**.
This is what makes a composer safe: the write path stops a bad config being
saved, and the read path stops a bad config — from a hand-edited row, or a
rollback — from 500-ing a live pitch.

Zod, server-only. It is already in the allowlist (ADR 11); no new ADR needed.

### 2. Slide picker and ordering

These invariants become **validation errors with readable messages**, not
discoveries in a client meeting:

- **`inspetor-demo` cannot be enabled while the `inspetor` module slide is
  disabled.** The demo borrows the module's nav dot via `data-nav-id`, so the
  progress nav goes blank across that section. Better: model the demo as a
  **checkbox on the module**, so the orphan cannot be constructed in the UI at
  all, and leave validation as the backstop.

Nav derivation is free: stage 1 made it derive from `config.slides`.

Reordering is **move-up / move-down buttons**. Thirteen items, once per proposal —
that does not pay for a drag-and-drop dependency, and buttons are keyboard- and
screen-reader-accessible without any work.

### 3. Removed

This work item was the plan editor. It left with the plan slide — ADR 26. The
number is kept so the items after it are not renumbered.

### 4 and 5. Removed

These work items were the image prices and the estimator defaults. They left
with the image calculator — ADR 27. The numbers are kept so the items after them
are not renumbered.

### 6. Publish writes the snapshot

Publishing resolves `buildDefaultDeck()` + `config_override` and writes the result
to `config_snapshot`. From then on `/p/[slug]` renders the snapshot.

This is the ADR 13 guarantee: a sent proposal is a commercial document that does
not change because someone edited a default two months later. Make the
admin say so — the publish button needs to read as "congelar e publicar", and
editing a published proposal must visibly require re-publishing.

### 7. Tracking read-out

On the proposal detail page: first open, view count, total active time, and the
per-slide dwell list. Aggregation in `src/server/tracking/`.

A table plus CSS bars. **No chart library** — Rule 3 bans them by name.

Sort by dwell descending, because the question a salesperson is actually asking is
"where did they stop", and that should be the first row.

### 8. V2 hooks — typed, validated, unbuilt

The optional `copy` field on a slide node stays optional and unpopulated. The
`custom` kind stays out of the runtime registry. The registry's `default` arm
returns `null`, never throws — a config written by a newer deploy must degrade,
not 500 a live pitch.

ADR 18 already records this. Do not add a new ADR unless you decided something it
does not cover.

### 9. Docs

- `docs/admin-guide.md` — **pt-BR, human audience.** The salesperson is now a
  user of this system and the first non-engineer reader this repo has had. Match
  the voice of `content-guide.md`, which is the best human-facing doc here.
- Update `docs/data-model.md`'s config section, `docs/testing.md` checklist C,
  `README.md`.
- Mark stage 3 done in `docs/stages/README.md`.

## Human steps

1. Run the SQL round-trip check in precondition 4 if you cannot.

## Acceptance checklist

End to end, in a browser: disable three slides, reorder two → then open
`/p/[slug]` and confirm:

- [ ] Every one of those changes is reflected
- [ ] The progress nav has exactly the enabled dots
- [ ] Arrow keys walk exactly the enabled slides, in the configured order
- [ ] Publishing freezes it: change a default in `src/content/deck.ts`, reload the
      published proposal, and confirm **nothing changed**

Each invalid config is rejected with a message a salesperson could act on — not a stack trace, not "validation failed".

```bash
npm run check && npm run build && npx vitest run     # green, including validation tests
```

Plus checklists **A**, **B** and **C** in `docs/testing.md`. **Checklist A on
`/fast` must still pass.** If `/fast` drifted, you changed something shared that
you should not have.

Runtime dependencies unchanged from stage 2's allowlist.

## Done

Commit per work item. **Do not push.**

Report: what you confirmed with the human, the end-to-end result, and anything in
these docs that turned out wrong. V1 is complete at this point — say so plainly,
and list what V2 would need.
