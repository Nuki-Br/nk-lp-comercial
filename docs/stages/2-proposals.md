---
audience: agent
status: current
verified_against: next 16.2.9 local docs, supabase CLI 2.109.1, @supabase/ssr contract
size: 357
---

# Stage 2 — Proposals

> Paste this whole file into a fresh agent session. It is self-contained.
> **Stage 1 must be merged and green.** Verify it; do not assume it.

## Read this first

This repo is a sales deck becoming a proposal app. Stage 1 moved the deck to
`/fast` and made it render from a JSON-serializable `DeckConfig`. You are stage 2:
stand up Supabase, the admin login, the password-gated public proposal surface,
and per-slide dwell tracking.

**This is not the Next.js in your training data.** It is Next **16**, and your
training data is wrong here in both *naming* and *architecture*:

1. **`middleware.ts` does not exist.** It was renamed to **`proxy.ts`** (repo
   root, exported function `proxy`, Node runtime — setting `runtime` throws).
   A `middleware.ts` file is silently never executed and there is no error.
2. **Proxy is not an authorization boundary.** Next's own guide says it "should
   not be used as a full session management or authorization solution", and that
   Proxy matchers **skip Server Functions**, so a matcher edit can silently
   remove coverage from a server action.

**Before writing any auth code, read these three local files.** Non-negotiable:

- `node_modules/next/dist/docs/01-app/02-guides/authentication.md` — especially
  §Data Access Layer and §optimistic checks
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md` —
  `cookies()` is async, and `.set()` only works in a Server Function or Route
  Handler, never during a Server Component render

Then read, and stop there: `AGENTS.md`, `docs/README.md`, `docs/architecture.md`,
`docs/deck-runtime.md`, `docs/stages/README.md`.

## Goal

Supabase-backed proposals: schema, a server-only data access layer, admin login,
`/p/[slug]` rendering a stage-1 `DeckConfig` out of Postgres behind a
server-verified per-proposal password, and per-slide dwell tracking.

## Preconditions — run these, stop on any failure

```bash
# 1. Baseline green.
npm run check && npm run build && npx vitest run

# 2. Stage 1 actually landed.
test -f src/deck/types.ts && test -f src/deck/defaults.ts && \
  test -d "src/app/(deck)/fast" && test -d "src/app/(admin)" && echo ok

# 3. Next 16 and the proxy convention.
node -p "require('next/package.json').version"
test -f node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md && echo ok

# 4. Env var NAMES only. Never print values — .env holds a service key.
cut -d= -f1 .env | grep -v '^$'

# 5. The tooling that replaces the MCP.
supabase --version && psql --version
```

**6. The stage-1 contract holds.** `buildDefaultDeck()` must survive
`JSON.parse(JSON.stringify(...))` deep-equal — run the existing test. **If it
fails, STOP.** That is stage 1's job; fixing it here couples two risky changes and
you will not be able to tell which one broke the deck.

**7. Do not use the Supabase MCP server.** It needs an interactive OAuth flow you
cannot complete. If its tools appear in your tool list, ignore them. The CLI over
`DIRECT_URL` needs no OAuth and is the supported path.

## Out of scope — belongs to stage 3

- **Every form that edits `config`.** Slide picker, ordering, price editor,
  estimator defaults. Stage 3 owns all of it.
- The tracking read-out UI beyond a raw open-count on the proposal list.
- V2 copy overrides and bespoke slides.
- Email, roles beyond owner/member, PDF export, any CSS work.

Your `/admin` is: log in, list proposals, create one from defaults, set client
name / password / expiry, copy the link. Nothing more.

## Reading budget

**Read:** the three Next doc files above, `src/deck/*`, `src/content/deck.ts`,
`src/components/deck/DeckBehaviors.tsx` (you must reuse its observer geometry),
`src/components/deck/AccessGate.tsx` (to reuse its `.gate*` markup — **not** its
logic), `next.config.ts`.

**Never read:** `public/demos/inspetor/index.html`, `src/HTML/**`, `.env` values,
`package-lock.json`, `docs/context/modulo-*.md`.

## Work items, in order

### 0. HUMAN STEP — reconcile env, then wait

`.env` has `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` **without** a
`NEXT_PUBLIC_` prefix. That is almost certainly fine: this design uses **no
`NEXT_PUBLIC_*` Supabase variables at all**, because auth runs entirely through
server actions and `proxy.ts`, so the publishable key never reaches a browser.

Confirm that with the human, and ask them to generate two secrets:

```bash
openssl rand -base64 32   # PROPOSAL_COOKIE_SECRET
openssl rand -base64 32   # TRACKING_IP_SALT
```

Do not rename their existing variables.

### 1. HUMAN STEP — design review before code

Write `docs/data-model.md` and `docs/security.md` **first**, then **stop and ask
for review.** A schema is expensive to change after code depends on it.

Content to cover:

**Tables** — entities normalized, deck config as JSONB:

| Table | Key columns |
|---|---|
| `admin_users` | `id` → `auth.users`, `email`, `role`, `is_active` |
| `clients` | `name`, `slug`, contact fields |
| `proposals` | `slug` unique, `client_id`, `status`, `expires_at`, `access_epoch`, `config_override` jsonb, `config_snapshot` jsonb |
| `proposal_access` | `password_hash`, `vault_secret_id`, `expires_at`, `revoked_at` |
| `proposal_access_attempts` | `visitor_hash`, `succeeded`, `attempted_at` |
| `proposal_view_sessions` | `started_at`, `last_seen_at`, `active_ms`, `flush_seq`, `is_internal` |
| `proposal_slide_views` | `session_id`, **`anchor_id` text**, `dwell_ms`, `enter_count` |

Design notes that must survive into the file:

- **Money in integer cents, discounts in integer basis points.** PostgREST
  serializes `numeric` as a JSON **string**, so `numeric(12,2)` arrives as
  `"84.00"` and silently produces `NaN` in the first arithmetic on it.
- **`config_override` is a delta; `config_snapshot` is frozen at publish.** A
  draft renders `resolveDeckConfig(buildDefaultDeck(), config_override)`; a
  published proposal renders the snapshot. A sent proposal is a commercial
  document and must not change because someone edited a default later. ADR 13.
- **Tracking keys on `anchor_id`, a stable text snapshot — not a foreign key to a
  slide row.** Reordering must never misattribute recorded attention.
- **`admin_users` is a table, not `auth.users` metadata.** `raw_user_meta_data` is
  user-editable and is the most common Supabase privilege-escalation bug;
  `raw_app_meta_data` is stale until the token refreshes. There is **no** trigger
  auto-creating the row: an auth account without an `admin_users` row is denied,
  which is the correct failure mode.
- **RLS on every table**, `auth.uid()`-scoped for admins, **no anon policy on
  `proposals`.** Say plainly in `security.md` that RLS is defense in depth, not
  the primary control: public reads go through the DAL with the service key
  *after* cookie verification.
- **`node:crypto` scrypt** (N=16384, r=8, explicit `maxmem: 64 * 1024 * 1024` —
  the 32 MiB default trips `ERR_CRYPTO_INVALID_SCRYPT_PARAMS` under concurrency)
  and `timingSafeEqual`. Normalize passwords with `.normalize("NFKC")` or an
  accented character typed on iOS will not match the same one typed on macOS.
- **Cookie** `nk_pa_<proposalId8>`, HttpOnly, `secure` in production only,
  `sameSite: "lax"` (a WhatsApp link is a top-level GET; `strict` re-prompts
  every time), `path: "/"`, value `base64url(JSON).base64url(HMAC-SHA256)`.
  Skip `__Host-` — it requires `Secure`, which breaks local http, and a cookie
  name that differs between dev and prod is a footgun.
- **Two clocks, both checked on every render:** cookie `exp` re-prompts;
  `expires_at` shows "proposta expirou" **even with a valid cookie**. Bumping
  `access_epoch` invalidates every issued cookie with no cookie-side bookkeeping.
- **Password recall.** The human decided a salesperson must re-read a password
  months later, so the plaintext goes in Supabase Vault, readable **only** by the
  service client. `authenticated` never gets a grant on `vault.decrypted_secrets`.
  **Verification still runs against the scrypt hash**, never the stored plaintext.
- **Visitor hash**: HMAC of `proposalId|ip|ua` under a key derived from the UTC
  day. The raw IP is never a column and never a log line. Including `proposalId`
  means the same visitor hashes differently per proposal, so nothing correlates
  across clients.

### 2. Migrations — author, do not apply

Numbered files under `supabase/migrations/`, one concern per file, forward-only,
**hand-authored SQL with comments** (`db diff` strips them, and in this schema the
comments are the design). Let the CLI own the timestamp:

```bash
supabase migration new proposals_foundation
```

Plus `supabase/seed.sql` (idempotent) and `supabase/tests/rls.sql` asserting the
`anon` role selects zero rows from `proposals`.

**No down migrations** — the CLI does not run them; recovery is a new forward
migration.

### 3. HUMAN STEP — apply the migrations

Print the exact file paths and both application routes, then **stop**:

```bash
supabase db push --db-url "$DIRECT_URL"     # connection string must be percent-encoded
supabase db lint --db-url "$DIRECT_URL" --level warning
```

⚠ Supabase passwords routinely contain `@ : / ? #`. A `db push` failing with an
opaque parse error is almost always missing percent-encoding.

Resume by running `node scripts/db-smoke.mjs` (write it — it lists tables and
columns over `DATABASE_URL` and prints nothing sensitive), then:

```bash
supabase gen types typescript --db-url "$DIRECT_URL" --schema public \
  > src/server/supabase/database.types.ts
```

### 4. `src/server/` — every file opens with `import "server-only"`

```
src/server/supabase/serverClient.ts   createServerClient bound to next/headers — RLS enforced
src/server/supabase/adminClient.ts    createClient with the SECRET key — RLS bypassed
src/server/auth/requireAdmin.ts       getUser() in React cache(), reads admin_users
src/server/proposals/password.ts      scrypt hash / verify
src/server/proposals/cookie.ts        HMAC sign / verify
src/server/proposals/dal.ts           THE BOUNDARY
src/server/tracking/record.ts
src/server/schemas/*.ts               zod
```

`loadProposalForVisitor(slug)` returns `not-found | expired | locked | unlocked`
and is **the only path to proposal content**. Adding a second path re-opens the
leak. Take its row-fetcher as a parameter so the decision table is testable
without a database — that is also what keeps CI database-free.

Check order: published and not archived → not past `expires_at` → cookie present
→ HMAC verifies constant-time → payload names this proposal → payload epoch
matches.

`requireAdmin()` is called at the top of **every** admin page, server action and
route handler — not just the layout. Use `getUser()` (authoritative on
deactivation) wrapped in React `cache()`, not `getSession()` (no signature
verification, never for authorization).

In `serverClient.ts`, swallowing the `cookieStore.set` failure is correct **only**
inside a Server Component render, where cookies are read-only and the proxy has
already refreshed. Never swallow it in an action or route handler.

### 5. `proxy.ts` at the repo root

Matcher `/admin/:path*` **only**. `/p/[slug]` is deliberately not proxied — a
database round-trip there would double every request's latency and still have to
be re-checked in the page.

Coarse only: `getClaims()` for token refresh plus an optimistic redirect to
`/admin/login`. Put a comment at the top saying it is optimistic and the DAL is
authoritative.

Two traps: carry the refreshed cookies onto the redirect response or the next
request arrives with a stale refresh token and you get a login loop; and apply the
headers `setAll` hands you — `@supabase/ssr` 0.12+ passes `Cache-Control: private,
no-store` there, and dropping it lets a CDN serve one admin's refreshed token to
another.

### 6. `/p/[slug]`

Server component, dynamic, `Cache-Control: private, no-store`. Calls the DAL and
renders one of four states. The locked branch emits **zero** content — no price,
no slide copy.

**Do not reuse `AccessGate` here.** It compares a password in the browser against
a value inlined into the bundle. That is the right pattern for `/fast` and exactly
the wrong one here. Write `ProposalGate` reusing the `.gate*` markup and CSS, but
submitting to a server action.

Unlock action: timing-safe compare, a fixed ~300 ms delay, sets both the access
cookie and a session-id cookie, records an attempt row. Rate-limit on
`proposal_access_attempts` — a proposal password is short and this is the only
place it can be guessed. Do not defer it silently.

### 7. `/admin`, minimal

Login (Supabase Auth email + password via a server action), proposals list,
create-from-defaults seeded by `buildDefaultDeck()` — that is stage 1's payoff —
and a detail page for client name, password, expiry and copy-link.

Plain Tailwind on the existing `--color-nuki-*` tokens. **No component library**
(Rule 3). Native `<dialog>` gives focus trapping, ESC and `::backdrop` for free.

**HUMAN STEP:** the human creates the first account in the Supabase dashboard and
**disables email sign-ups and anonymous sign-ins**. Without that the whole
authorization design leaks. Provide `scripts/seed-admin.mjs` (zero dependencies,
global `fetch` against the Auth admin API) as the alternative.

Then flip `/` → `/admin` in `next.config.ts`. `/fast` and `/comercial` unchanged.

### 8. Tracking

`DeckTracking.tsx`, mounted **only** inside the `/p/[slug]` render path — never
from `/fast`. Reuse `DeckBehaviors`' exact IntersectionObserver geometry
(`rootMargin: "-50% 0px -50% 0px"`) rather than inventing a second definition of
"active slide".

Transport is `fetch(url, { keepalive: true })`. **`navigator.sendBeacon` is banned
by name in `AGENTS.md`** — and it is genuinely the wrong tool here anyway, because
it cannot set a JSON content type and cannot read the response, which the
acknowledgement protocol needs.

Three guards against double counting: the session id lives in a cookie so a
refresh does not create a session; a monotonic `seq` persisted in `sessionStorage`
(the server accepts only `seq > flush_seq`); and the client sends **deltas, not
totals**, zeroing its accumulator on a 2xx.

Both writes in one Postgres RPC so the sequence check and the dwell accumulation
cannot diverge. `SECURITY INVOKER`, `EXECUTE` revoked from `PUBLIC`, granted only
to `service_role`.

Flush on `visibilitychange → hidden` (fires reliably before freeze on iOS), a 15 s
interval skipped when the delta is zero, and `pagehide` with `final: true`.

Bot filter: the structural defence already does the work, since a session requires
a successful password POST. Add a UA denylist returning 204 without writing. If
the request also carries a valid admin session, set `is_internal` so a
salesperson's dry-run does not pollute the client's numbers.

### 9. Tests and docs

Tests, no database: password round trip; cookie valid / expired-by-1s / tampered /
wrong-proposal; the DAL decision table.

Docs: finalize `data-model.md`, `security.md`, `tracking.md`. Update
`architecture.md` (the surfaces are real now), `deployment.md` (**the
preview-deployments-hit-production-Postgres warning**), `testing.md` checklist B,
and `.env.example`. Mark stage 2 done in `docs/stages/README.md`.

## Acceptance checklist

The first one is what actually proves the trust boundary, and it is a one-liner:

```bash
curl -s http://localhost:3000/p/<slug> | grep -c "Estime o setup" # must be 0
curl -s http://localhost:3000/p/<slug> | grep -ci "planejamento"  # must be 0
```

```bash
npm run check && npm run build && npx vitest run            # green
grep -r "SUPABASE_SECRET_KEY\|service_role" .next/static/   # must find nothing
curl -sI localhost:3000/ | grep -i location                 # → /admin
```

Plus checklist **B** and **C** in `docs/testing.md`, and **checklist A on `/fast`
must still pass with the same four canonical numbers** — 45 / 284 / 507 / 738.

Runtime dependencies must be exactly the Rule 3 allowlist: `next`, `react`,
`react-dom`, `@supabase/supabase-js`, `@supabase/ssr`, `zod`.

## Done

Commit per work item. **Do not push.** Report: the migration files you authored,
what the human had to apply, the curl output proving the locked page is empty, and
anything in these docs you found to be wrong.
