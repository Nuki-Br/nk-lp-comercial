---
audience: both
status: current
verified_against: src/lib/estimate.ts + src/lib/quote.ts + src/content/deck.ts, re-derived by running the code
size: 164
---

# The estimate

The image calculator. This file is the **sole home of the
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

### The quote the /admin list shows

`src/lib/quote.ts` composes the same functions into the one figure per row in
the proposals table — the image setup. At the shipped defaults it is the
"Defaults" row above, **45** images and **R$ 1.428**: the calculator's SEED, not
what the client will close on.

Asserted in `src/lib/quote.test.ts`, against `buildDefaultDeck()` rather than a
hand-built config.

**A published proposal is quoted from its snapshot, a draft from defaults + delta.**
The salesperson's later edits are a renegotiation nobody received yet.

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
| min/max for every field | `ESTIMATE_RANGES` in `src/lib/estimateTypes.ts` | no, code-only |

`ESTIMATE_RANGES` stays in code on purpose. It is the clamp that keeps an admin
typo from producing an absurd quote, so it is not something an admin edits.

It lives in `src/lib/estimateTypes.ts` rather than `src/content/` because
`src/lib/estimate.ts` used to import it *from* content — a backwards arrow for a
layer that is supposed to be pure — and because a slide may not import from
`src/content/` at all. Content now imports from `lib`, not the reverse.

## The hidden price panel

`Ctrl+Alt+K` opens a live editor for the two image tariffs, so a salesperson can
adjust them mid-pitch. The handler matches `e.code === "KeyK"`, **not** `e.key`,
because Option on macOS rewrites `e.key` to a dead key.

It is gated by `DeckConfig.chrome.allowPriceOverride`: **true on `/fast`, false
on `/p/[slug]`.** On a link that stays with the client, a hidden panel exposing
cost basis is a discoverable leak — and the salesperson sets those numbers in
`/admin` anyway.

## Serialization: no functions in config

**Done in stage 1.** `ESTIMATE_DEFAULTS.initialUnitTypes` and
`PROJECT_SIZE_PRESETS[].buildUnitTypes` used to be factories; they are plain data
now, and `materializeUnitTypes()` / `materializeRooms()` in
`src/lib/estimateTypes.ts` deep-clone on use, so the cloning responsibility sits
with the consumer.

**The old rationale here was wrong, and the correction matters.** This file used
to say the factories existed "because `UnitTypeState` is mutated in place". It is
not: every updater in `CalculatorSlide` is immutable (`prev.map` + spread). The
real hazard is **aliasing** — with plain data, the N unit types of one preset
would share a single `rooms` array reference, and two applications of the same
preset would move together. That is why the clone is still required, and it is
what `src/deck/defaults.test.ts` pins down.

Store the output, never a reference to the factory. `{"preset": "studio"}` would
look tidier and would be wrong: re-tuning `studioRooms()` in code would
retroactively change the numbers in a proposal a client already received and
screenshotted.

## `Intl` uses a non-breaking space

`formatCurrency` is pt-BR via `Intl`, so the separator between `R$` and the
digits is **U+00A0**, not the space you type. A string comparison against the
table above fails against *correct* values unless you normalise it — this cost
two debugging detours during stage 1, once making all four scenarios report a
false failure. The tests assert on numbers for exactly this reason, and
`formatCurrency`'s own test pins the NBSP.

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
