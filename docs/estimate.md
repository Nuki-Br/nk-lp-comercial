---
audience: both
status: current
verified_against: src/lib/estimate.ts + src/content/deck.ts, re-derived by running the code
size: 130
---

# The estimate

The image calculator and the plan simulator. This file is the **sole home of the
canonical numbers** — they are not repeated in `AGENTS.md`, `README.md` or
`deployment.md`, because that is exactly how they went stale before.

## Canonical numbers

Re-derived by executing `computeEstimate` + `estimateCost`, not copied from any
document. At the shipped defaults — image tariffs **R$ 84** base / **R$ 28**
option, 3 dry options / 3 wet options:

| Scenario | Images | Breakdown | Cost |
|---|---|---|---|
| Defaults (one unit type, as loaded) | **45** | 3 base · 42 option | **R$ 1.428** |
| Preset **Studio** | **284** | 14 base · 270 option | **R$ 8.736** |
| Preset **Padrão** | **507** | 30 base · 477 option | **R$ 15.876** |
| Preset **Alto padrão** | **738** | 45 base · 693 option | **R$ 23.184** |

These are the assertions in `src/lib/estimate.test.ts`. If a preset's room
composition changes, the test fails, you re-derive, and you update **this table
only**. If you find these numbers written anywhere else in the repo, that copy is
a bug — delete it and link here.

To re-derive without trusting anything:

```bash
npx vitest run src/lib/estimate.test.ts
```

## Two tiers, because production has two steps

Modelling a room in 3D yields one **base image** per room unit. Every finish
option after that is a material crop over that render, so it is much cheaper.
This is the whole reason there are two tariffs.

```
per room unit:  baseImages   = BASE_IMAGES_PER_ROOM_UNIT (1)
                optionImages = components × (areaType === "seca" ? dryOptions : wetOptions)

unit type:      mainVariant   = Σ over all room units          (Variação 01)
                perExtraVar   = Σ over impacted room units only (Variação 02+)
                total         = mainVariant + perExtraVar × (variants − 1)

cost:           base × baseImagePrice + option × optionImagePrice
platform:       Σ months per plan × discountedMonthlyPrice(plan, cycle.discount)
grand total     = image cost + platform cost
```

The math lives in `src/lib/estimate.ts` — pure, React-free, no `process.env`.
`CalculatorSlide` only renders it. Keep it that way: it is the one file in this
repo that would be disputed in front of a client.

## The word "base" means two things

`ImageMix.base` is the **3D-render tier**. A variant card's `mode: "main"` is
**Variação 01**, the first floor-plan variant. They are orthogonal axes and older
code called both of them "base". The comment at the top of `estimate.ts` says so
too; do not collapse them.

## Where each input lives

| Input | Source | Per-proposal? |
|---|---|---|
| `baseImagePrice` (R$ 84), `optionImagePrice` (R$ 28) | `ESTIMATE_DEFAULTS` | yes |
| `dryOptions` / `wetOptions` (3 / 3) | `ESTIMATE_DEFAULTS` | yes |
| initial unit types | `ESTIMATE_DEFAULTS.initialUnitTypes` | yes |
| `PROJECT_SIZE_PRESETS` | `src/content/deck.ts` | yes — prunable per client |
| min/max for every field | `ESTIMATE_RANGES` | no, code-only |
| `plans`, `billingCycles` | `src/content/deck.ts` | yes |
| `maxMonths` (36) | was `PricingSlide.tsx`, now `EstimateConfig` | yes |

`ESTIMATE_RANGES` stays in code on purpose. It is the clamp that keeps an admin
typo from producing an absurd quote, so it is not something an admin edits.

## The hidden price panel

`Ctrl+Alt+K` opens a live editor for the two image tariffs, so a salesperson can
adjust them mid-pitch. The handler matches `e.code === "KeyK"`, **not** `e.key`,
because Option on macOS rewrites `e.key` to a dead key.

It is gated by `DeckConfig.chrome.allowPriceOverride`: **true on `/fast`, false
on `/p/[slug]`.** On a link that stays with the client, a hidden panel exposing
cost basis is a discoverable leak — and the salesperson sets those numbers in
`/admin` anyway.

## Serialization: no functions in config

`ESTIMATE_DEFAULTS.initialUnitTypes` and `PROJECT_SIZE_PRESETS[].buildUnitTypes`
are **factories**, not data — deliberately, because `UnitTypeState` is mutated in
place and each application needs fresh objects.

A config carrying functions can never reach JSONB. The conversion is: store the
factory's **output**, plus a `materializeUnitTypes()` helper that deep-clones on
use, so the cloning responsibility moves to the consumer.

Store the output, never a reference to the factory. `{"preset": "studio"}` would
look tidier and would be wrong: re-tuning `studioRooms()` in code would
retroactively change the numbers in a proposal a client already received and
screenshotted.

## Presets are a commercial target, not a derivation

Studio / Padrão / Alto padrão are calibrated to land near R$ 9k / 16k / 23k.
That is a price point someone chose, then the room compositions were tuned to
hit it.

At exactly 3 options per component and a base image priced at exactly 3× an
option image, the cost happens to collapse to:

```
84 × unitTypes × [(Σcomponents + rooms) + extras × (Σimpacted + |impacted|)]
```

Handy for re-calibrating. It stops holding the moment either of those two
conditions changes, so do not build anything on it.

Preset rooms are unlocked and repeats collapse into `units` — "Quartos ×3", not
three "Quarto 0N" rows. Same image count either way; the left panel has to stay
readable in a live meeting. `variants` counts the base plan, so `variants: 3` is
base plus two extras.

## Animated numbers freeze in a hidden tab

`useCountUp` drives every displayed number with `requestAnimationFrame`, and
**rAF does not fire in a hidden tab.** In a headless or backgrounded pane the
calculator shows its first computed value and the closing frame shows R$ 0. That
is not a bug. Read raw state, or make the pane visible.
