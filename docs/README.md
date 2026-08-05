---
audience: agent
status: current
verified_against: the docs/ tree itself
size: 104
---

# Docs router

**Read one document, not five.** Find your task below, read only what it names,
and stop. Every fact in this repo has exactly one home; other docs link to it
rather than restating it. When two docs disagree, the one named here as the home
wins and the other is a bug.

## I am about to…

| Task | Read only |
|---|---|
| run one of the three build stages | `stages/README.md`, then your stage file |
| add or change a slide kind | `deck-runtime.md` |
| touch pricing or image math | `estimate.md` |
| touch auth, cookies, passwords, expiry | `security.md` |
| add a table or column | `data-model.md` |
| add or change tracking | `tracking.md` |
| change deploy, env vars, redirects | `deployment.md` |
| change deck copy or default prices | `content-guide.md` |
| embed a module demo | `demo-embedding.md` (211 lines — load on demand) |
| understand what runs where | `architecture.md` |
| know what is deliberately broken | `tech-debt.md` |
| know what to test and what not to | `testing.md` |
| make a factual claim about the product | `context/README.md` |
| understand why something is the way it is | `decisions.md` |

All three arrived with stage 2. `security.md` and `data-model.md` were written
at its design gate, before any SQL; `tracking.md` came with the code it
describes.

Rules live in `../AGENTS.md`, not here. It holds no explanations by design.

## Where each fact lives

One home per fact. Restating a fact elsewhere is how it goes stale — this repo
has already lost the estimate numbers that way, in three places at once.

| Fact | Sole home | Kept honest by |
|---|---|---|
| canonical estimate numbers | `estimate.md` | `src/lib/estimate.test.ts` |
| environment variables | `../.env.example` | `deployment.md` explains, never re-lists |
| database schema | `../supabase/migrations/*.sql` | `data-model.md` says it is a projection |
| the route table | `../AGENTS.md` Rule 4 | `architecture.md` links to it |
| DOM contract selectors | `deck-runtime.md` | `scripts/check-docs.mjs` |
| the dependency allowlist | `../AGENTS.md` Rule 3 | CI diffs `package.json` |
| what is tested | `testing.md` | `npm run check` |

## Conventions

**Front-matter, four keys, on every doc.**

```yaml
audience: agent | human | both
status: current | partially-superseded | superseded-by: <path>
verified_against: <the source file or commit these facts came from>
size: <lines>
```

`verified_against` is the one that earns its keep. `architecture.md` once
described selectors that a rename had deleted months earlier; had it carried
`verified_against: DeckBehaviors.tsx@<sha>`, the rename commit would have
visibly invalidated it.

**Size.** Target ≤150 lines, hard cap 250. Exempt and marked *load on demand*:
`demo-embedding.md` and `context/modulo-*.md`. Every long context doc ends with
a ≤10-bullet summary written for an agent, so you can read ten lines instead of
six hundred — the pattern `context/pivot-modelo-negocio.md` §4 invented.

**Staleness is mechanical, not aspirational.** `node scripts/check-docs.mjs`
asserts that every backticked path-shaped token in every `.md` names a file that
exists, and additionally that every backticked CSS class and `data-*` attribute
in `deck-runtime.md` appears somewhere in `src/styles/` or `src/components/`.
It runs in CI. It would have caught both known drifts on the day they happened.

**Who may write a doc.** Only an agent that verified the facts in the same
session. This is why `data-model.md` does not exist before stage 2 — writing it
earlier would be writing fiction with a filename.

## The tree

```
README.md            this router
architecture.md      system map: three surfaces, the trust boundary, data flow
data-model.md        why each table and column is shaped the way it is
security.md          auth, cookies, passwords, expiry, RLS posture
tracking.md          what is collected, the three anti-double-count guards
deck-runtime.md      slide contract + the DeckBehaviors DOM contract + CSS layers
estimate.md          the pricing math and THE canonical numbers
testing.md           test policy + the three manual checklists
deployment.md        Vercel + Supabase, env matrix, migrations
content-guide.md     editing copy and default prices, for non-developers
demo-embedding.md    turning a Claude Design export into an iframe demo
tech-debt.md         known-dead code and deferred cleanups, each with its proof command
decisions.md         ADRs — why, not what
stages/              the three build-stage prompts + status
context/             product, business and module source-of-truth docs
```
