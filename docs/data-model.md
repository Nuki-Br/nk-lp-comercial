---
audience: agent
status: current
verified_against: src/deck/types.ts, src/content/deck.ts, src/lib/estimateTypes.ts, Supabase Vault docs (fetched), ADR 13
size: 172
---

# Data model

**The schema itself lives in `supabase/migrations/`, and those files are the
authority.** This document is a projection of them: what each table is *for*, and
the handful of column decisions that are expensive to reverse. When the two
disagree, the migration wins and this file is the bug.

Access rules — who may read what, and why RLS is not the control that matters
here — are in `security.md`. This file is about shape.

> Written at the design gate, before any SQL was authored. Every claim about
> Postgres or Supabase below was checked in the session that wrote it; every
> claim about this repo's types was read out of the files named in the
> front matter.

## The dividing line: entities are tables, the deck is a document

ADR 13 already settled this. Clients, proposals, credentials, sessions and
attention are **entities** and get tables. The deck's configuration is one
`DeckConfig` value and gets a JSONB column, because the *type* is the contract
between the three build stages — a normalized config schema would make the
database the contract instead, and stage 1 could no longer define the shape by
proving it renders.

Concretely, nothing in `src/deck/types.ts` becomes a column. `SlideNode`,
`EstimateConfig`, `RichText` and the label bags all round-trip as JSON.

## The seven tables

### `admin_users`

| Column | Notes |
|---|---|
| `id` | PK, FK → `auth.users(id)`, `on delete cascade` |
| `email` | for display in the composer; never the authorization key |
| `role` | `owner` \| `member`. Stage 2 uses neither — it exists so stage 3 does not migrate |
| `is_active` | the deactivation switch `requireAdmin()` reads on every call |
| `created_at` | |

**This is a table and not `auth.users` metadata, deliberately.**
`raw_user_meta_data` is editable by the user it describes, which makes it the
most common Supabase privilege-escalation bug; `raw_app_meta_data` is safe to
write but is carried in the JWT and therefore stale until the token refreshes.
An authorization fact that a deactivation must invalidate *now* cannot live in
either.

**There is no trigger that creates this row.** An `auth.users` account with no
`admin_users` row is denied. That is the correct failure mode: a leaked or
self-served sign-up produces an account that can authenticate and do nothing.

### `clients`

One construtora, many proposals over time. `name`, `slug`, contact fields,
`created_by`, timestamps. Nothing subtle.

### `proposals`

| Column | Notes |
|---|---|
| `id` | PK, `gen_random_uuid()` — core Postgres since 13, no extension |
| `client_id` | FK → `clients` |
| `slug` | **unique**; this is the public URL segment in `/p/[slug]` |
| `title` | admin-facing label, not the rendered document title |
| `status` | `draft` \| `published` \| `archived`, checked |
| `expires_at` | nullable. Null means no expiry, not "expired" |
| `access_epoch` | integer, starts at 1. Bumping it invalidates every cookie already issued, with no cookie-side bookkeeping |
| `config_override` | jsonb, the delta |
| `config_snapshot` | jsonb, null until published |
| `published_at`, `created_by`, `created_at`, `updated_at` | |

### `proposal_access`

The credential, kept separate from the proposal so that rotating a password is
an insert and not an update to the document.

`password_hash` (scrypt, self-describing encoding), `vault_secret_id`,
`expires_at`, `revoked_at`, `created_by`. A partial unique index enforces at most
one live credential per proposal.

`vault_secret_id` points at Supabase Vault, which is where the **plaintext**
lives so a salesperson can re-read a password months later — the product
decision recorded in ADR 14. Verified against the Vault docs: secrets are created
with `vault.create_secret(secret, name, description)` and read back through the
`vault.decrypted_secrets` view, whose `decrypted_secret` column is the plaintext.
The docs are explicit that this view has no protection of its own — "anyone that
has access to the view has access to decrypted secrets" — so the grant is the
whole control. `authenticated` never gets one. See `security.md`.

**Verification never touches the plaintext.** It runs against `password_hash`.

### `proposal_access_attempts`

`proposal_id`, `visitor_hash`, `succeeded`, `attempted_at`. This is both the
audit trail and the rate limiter — an indexed `count(*)` over a time window is
the whole mechanism, which is why `@upstash/ratelimit` is on Rule 3's ban list.

The index that makes it work is `(proposal_id, visitor_hash, attempted_at desc)`.
Without it the rate-limit check degrades to a sequential scan on the one table
that grows fastest under attack.

### `proposal_view_sessions`

One visit. `proposal_id`, `visitor_hash`, `started_at`, `last_seen_at`,
`active_ms`, `flush_seq`, `is_internal`.

`flush_seq` is the replay guard: the ingest RPC accepts a flush only when the
client's `seq` is strictly greater, so a retried or duplicated beacon adds
nothing. `is_internal` marks a salesperson's own dry-run so it does not pollute
the client's numbers.

### `proposal_slide_views`

`session_id`, **`anchor_id` text**, `dwell_ms`, `enter_count`, unique on
`(session_id, anchor_id)` so the RPC can upsert.

**`anchor_id` is a text snapshot, not a foreign key to a slide row.** There is no
slide table to point at — slides live inside the JSONB — but the reason is
stronger than that: reordering or re-configuring a proposal must never
retroactively re-attribute a millisecond of recorded attention. A text key
recorded at the moment of the visit cannot be re-pointed by a later edit.

## Money never becomes a column

All prices in this system live inside the config document:
`estimate.plans[].monthlyPrice` (an integer, in reais — `1599`),
`estimate.imagePrices.base` / `.option`, and `estimate.billingCycles[].discount`
(a fraction, `0.1`, not basis points). JSONB gives those back as JSON numbers, so
the existing shape is safe and stage 2 does not touch it.

**The rule binds the first money column anyone adds: integer cents, and discounts
in integer basis points — never `numeric`.** PostgREST serializes `numeric` as a
JSON *string*, so a `numeric(12,2)` column arrives in JavaScript as `"1599.00"`,
and the first arithmetic on it produces `NaN` rather than an error. The failure
surfaces as a zero on the closing frame during a live pitch.

## Two config columns, and why both

- **`config_override` is a delta** over `buildDefaultDeck()`, keyed by node id.
  A draft renders `resolveDeckConfig(buildDefaultDeck(), config_override)`, so a
  copy fix in `src/content/` reaches every unpublished draft for free, and an
  untouched proposal *is* the deck by the identity `resolve(base, null) === base`.
- **`config_snapshot` is the resolved config, frozen at publish.** A sent
  proposal is a commercial document. It must not change because somebody edited a
  default price two months later.

Two fields of `DeckConfig` are **not** in `DeckOverride` and cannot be: `key` and
`chrome.allowPriceOverride`. They are set at the render site. `/p/[slug]` renders
with `allowPriceOverride: false`, and the publish path must write the snapshot
with `false` too — otherwise `/fast`'s `true` freezes into the document and every
published link ships the `Ctrl+Alt+K` cost panel to a client.

`RoomAreaType` values reach JSONB as `"dry"` / `"wet"`. They were pt-BR until the
commit immediately before this schema was designed, precisely so that this
document would not be the thing that made them permanent.

## Conventions

- `uuid` primary keys via `gen_random_uuid()`; `bigint` identity for the two
  append-only tables.
- `timestamptz` everywhere. Never `timestamp`.
- Migrations are numbered, forward-only, one concern per file, and
  **hand-authored with comments** — `supabase db diff` strips comments, and in
  this schema the comments are the design.
- **No down migrations.** The CLI does not run them; recovery is a new forward
  migration.
