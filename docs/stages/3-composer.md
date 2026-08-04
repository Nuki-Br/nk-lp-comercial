---
audience: agent
status: current
verified_against: docs/estimate.md, docs/deck-runtime.md, ADR 13 and ADR 18
size: 250
---

# Stage 3 — Composer

> Paste this whole file into a fresh agent session. It is self-contained.
> **Stages 1 and 2 must be merged and green.** Verify; do not assume.

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
`docs/estimate.md`, `docs/stages/README.md`.

## Goal

A real composer: per-proposal slide selection and order, plan and billing-cycle
editing, image prices, estimator defaults, publish-with-snapshot, and the
per-slide dwell read-out.

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
- Any change to `src/lib/estimate.ts`. The math is settled.

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

Validate *shape* here. **Clamping stays in the estimator seed** using the existing
`clamp` and `ESTIMATE_RANGES` — do not express the ranges twice.

### 2. Slide picker and ordering

Three invariants become **validation errors with readable messages**, not
discoveries in a client meeting:

- **`calculator` must come before `total`.** The closing frame reads what the
  calculator publishes; reversed, it shows zero.
- **`inspetor-demo` cannot be enabled while the `inspetor` module slide is
  disabled.** The demo borrows the module's nav dot via `data-nav-id`, so the
  progress nav goes blank across that section. Better: model the demo as a
  **checkbox on the module**, so the orphan cannot be constructed in the UI at
  all, and leave validation as the backstop.
- **Disabling `pricing` while `total` is enabled** produces a total with no
  platform cost. Warn, do not block — it may be intentional.

Nav derivation is free: stage 1 made it derive from `config.slides`.

Reordering is **move-up / move-down buttons**. Thirteen items, once per proposal —
that does not pay for a drag-and-drop dependency, and buttons are keyboard- and
screen-reader-accessible without any work.

### 3. Plan and billing-cycle editor

Plans: name, items, `monthlyPrice`, `featured`, `maxMonths`. Cycles: label and
discount.

**Surface the fraction trap.** `docs/content-guide.md` documents it: the config
stores `0.1` meaning 10%. The UI must take a percentage and convert, or someone
will type `10` and quote a 1000% discount. Show the resulting price next to the
input so the error is visible before saving.

### 4. Image prices per proposal

`imagePrices.base` and `imagePrices.option` — the values behind `Ctrl+Alt+K`.

**Confirm with the human before implementing:** the plan says `Ctrl+Alt+K` stays
on `/fast` and is **absent from `/p/[slug]`**, because a hidden panel exposing
cost basis on a link that stays with the client is a discoverable leak, and the
salesperson now sets those numbers in `/admin`. Stage 1 built
`chrome.allowPriceOverride` for exactly this. Verify it is `false` on the
proposal path.

### 5. Estimator defaults

`dryOptions`, `wetOptions`, and pre-loaded `unitTypes` — so a proposal opens with
the client's development already modelled.

**This is where stage 1's no-functions-in-config decision pays off:** the admin
writes plain `UnitTypeState[]`. No factories, no `buildUnitTypes`.

`PROJECT_SIZE_PRESETS` become a **seeding affordance** in the admin ("começar do
Padrão") and remain in the client-facing calculator only when
`config.estimate.projectSizePresets` is non-empty — so a salesperson can prune
them per client. **Confirm this reading with the human** before building it;
it changes what the client sees.

### 6. Publish writes the snapshot

Publishing resolves `buildDefaultDeck()` + `config_override` and writes the result
to `config_snapshot`. From then on `/p/[slug]` renders the snapshot.

This is the ADR 13 guarantee: a sent proposal is a commercial document that does
not change because someone edited a default price two months later. Make the
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

1. Confirm the `Ctrl+Alt+K` removal from `/p/[slug]` (item 4).
2. Confirm the preset-pruning behaviour (item 5).
3. Run the SQL round-trip check in precondition 4 if you cannot.

## Acceptance checklist

End to end, in a browser: disable three slides, reorder two, change the plan
price and a cycle discount, set image prices, preload two unit types → then open
`/p/[slug]` and confirm:

- [ ] Every one of those changes is reflected
- [ ] The progress nav has exactly the enabled dots
- [ ] Arrow keys walk exactly the enabled slides, in the configured order
- [ ] `Ctrl+Alt+K` does nothing
- [ ] Publishing freezes it: change a default in `src/content/deck.ts`, reload the
      published proposal, and confirm **nothing changed**

Each of the three invalid configs is rejected with a message a salesperson could
act on — not a stack trace, not "validation failed".

```bash
npm run check && npm run build && npx vitest run     # green, including validation tests
```

Plus checklists **A**, **B** and **C** in `docs/testing.md`. **Checklist A on
`/fast` must still pass with the same four canonical numbers** — 45 / 284 / 507 /
738. If `/fast` drifted, you changed something shared that you should not have.

Runtime dependencies unchanged from stage 2's allowlist.

## Done

Commit per work item. **Do not push.**

Report: what you confirmed with the human, the end-to-end result, and anything in
these docs that turned out wrong. V1 is complete at this point — say so plainly,
and list what V2 would need.
