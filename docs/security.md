---
audience: agent
status: current
verified_against: Next 16 authentication.md, @supabase/ssr Next.js guide (fetched), Supabase Vault docs (fetched), ADR 14, ADR 15
size: 230
---

# Security

Everything about auth, cookies, passwords and expiry. Table shapes are in
`data-model.md`; this file is about who gets in.

> Written at the design gate, before the code it describes. Claims about Next and
> Supabase behaviour were checked against the sources in the front matter during
> the session that wrote this. Claims that could not be checked are marked
> **open** rather than asserted.

## The one sentence

**`src/server/proposals/dal.ts` is the trust boundary.** Not `proxy.ts`, not the
page, not RLS. Every other control in this document is depth behind it.

## Three surfaces, three different postures

| Surface | Gate | Where it is enforced |
|---|---|---|
| `/fast` | shared team password, **client-side** | `AccessGate`, in the browser |
| `/p/[slug]` | per-proposal password, **server-verified** | the DAL |
| `/admin` | Supabase Auth session + an `admin_users` row | `requireAdmin()`, per page/action/handler |

`/fast`'s gate is a speed bump and is documented as one (ADR 9): the password is
inlined in the client bundle and the full deck, pricing included, is in the
payload of anyone who fetches the page. That is accepted, because `/fast` must
work with Supabase down. It is **not** a pattern to copy — which is why the gate
now lives in `src/app/(deck)/fast/layout.tsx` and not in the layout above it,
where it would have covered `/p/[slug]` too.

## `/p/[slug]` — the proposal gate

### The decision function

```
loadProposalForVisitor(slug) → not-found | expired | locked | unlocked
```

It is the **only** path to proposal content. A second path re-opens the leak, and
nothing else may query the proposal tables for a visitor request.

Checked in this order, stopping at the first failure:

1. the row exists, `status = 'published'`, not archived
2. `now() < expires_at`, or `expires_at` is null
3. the access cookie is present
4. its HMAC verifies, constant-time
5. its payload names **this** proposal id
6. its payload's `access_epoch` still matches the row

The fetcher is injected, so this table is testable with no database — which is
also what keeps CI database-free (ADR 12).

**`locked` renders zero content.** No price, no slide copy, and a generic
`<title>`: a `generateMetadata` that read the proposal's document title would
leak the client's name into the HTML of a page nobody has unlocked. The `curl`
one-liner in `testing.md` checklist B is what proves this, and it is the single
most valuable check in this repo.

### Passwords

`node:crypto` scrypt, N=16384, r=8, p=1, with **`maxmem` set explicitly to
64 MiB**. Those parameters need ~16 MiB, and Node's 32 MiB default sits close
enough that concurrent verifications trip `ERR_CRYPTO_INVALID_SCRYPT_PARAMS` —
an error that looks like a bug in your code and is not.

Passwords are `.normalize("NFKC")`-ed on both sides of the hash. Without it, an
accented character typed on iOS does not match the same character typed on
macOS, and the failure is invisible to everyone involved.

Comparison is `timingSafeEqual`. The stored form is self-describing
(`scrypt$N$r$p$salt$hash`) so parameters can be raised later without a flag day.

No bcrypt (silently truncates at 72 bytes), no argon2 (a native binary in a
Vercel bundle), no `pgcrypto` (sends the plaintext to the database, where an
error can log it). ADR 14.

### The access cookie

```
nk_pa_<proposalId8>   HttpOnly, sameSite=lax, path=/, secure in production only
value: base64url(JSON payload) "." base64url(HMAC-SHA256(payload))
```

- **Signed, not encrypted.** The payload is not secret; it only has to be
  unforgeable.
- **`sameSite: "lax"`**, because a proposal link arrives over WhatsApp as a
  top-level GET. `strict` would drop the cookie on that navigation and re-prompt
  the client every single time.
- **`secure` only in production.** Local development is http.
- **No `__Host-` prefix**, for the same reason: it requires `Secure`, so the
  cookie name would differ between dev and production, and a name that differs
  by environment is a footgun that outlives the benefit.
- The payload carries the proposal id, the `access_epoch`, and an `exp`.

**Two clocks, both checked on every render.** The cookie's `exp` re-prompts for
the password. The proposal's `expires_at` shows "proposta expirou" *even with a
perfectly valid cookie*. They answer different questions — "is this browser still
trusted" and "is this document still live" — and collapsing them into one loses
the ability to expire a document without re-issuing credentials.

Revocation is `access_epoch`: bump the integer and every cookie ever issued for
that proposal stops verifying, with nothing to clean up.

### Rate limiting — not deferred

A proposal password is short, and the unlock endpoint is the only place it can be
guessed. `proposal_access_attempts` plus one indexed `count(*)` is the mechanism.

| Window | Scope | Limit |
|---|---|---|
| 15 min | `(proposal_id, visitor_hash)` | 8 failures → 429 for the rest of the window |
| 15 min | `proposal_id`, all visitors | 60 failures → 429 |

The per-proposal ceiling is what catches a guess distributed across addresses;
the per-visitor one catches the ordinary case. Successful attempts do not count
against either. The limit is checked **before** the scrypt verify, so an attacker
cannot force the server to burn memory-hard work per guess.

Every unlock attempt — accepted, rejected or rate-limited — takes a fixed ~300 ms
before responding.

### Visitor hash

`HMAC(TRACKING_IP_SALT + UTC date, proposalId | ip | ua)`.

- The raw IP is **never** a column and never a log line. It exists inside this
  function and nowhere else.
- The key rotates by UTC day, so two visits on different days are not
  correlatable.
- `proposalId` is in the message, so the same visitor hashes differently for
  every proposal and nothing correlates across clients.

## `/admin`

`requireAdmin()` runs at the top of **every** admin page, server action and route
handler — not once in the layout. Layout-only gating is a known hole, and Next's
own guide is explicit that Proxy matchers skip Server Functions, so a matcher
edit can remove coverage from an action with no error at all.

It is wrapped in React `cache()` so the per-request cost is one call regardless
of how many components ask.

**Which auth call, and why it differs by layer.** The `@supabase/ssr` Next.js
guide (fetched while writing this) says plainly: *never* trust `getSession()` in
server code, because it is not guaranteed to revalidate the token. That leaves
two:

- `getClaims()` verifies the JWT and returns claims decoded from the token. No
  network call, and therefore stale until the token refreshes. **This is what
  `proxy.ts` uses** — a cheap, optimistic check whose only job is to redirect an
  obviously-signed-out visitor to the login page.
- `getUser()` calls the Auth server for the current user record. **This is what
  `requireAdmin()` uses**, so a deleted or banned account loses access on the
  next page load rather than whenever its token happens to expire.

Authorization itself is neither of those: it is the `admin_users` row, read on
every `requireAdmin()` call. `is_active = false` denies immediately, because it is
a database read and not a token claim. Never `user_metadata` (the user can edit
it) and never `app_metadata` (stale until refresh).

### Two `proxy.ts` traps

Both fail silently, and both were verified as real in the `@supabase/ssr` guide:

1. **Carry the refreshed cookies onto a redirect response.** Drop them and the
   next request arrives with a stale refresh token — a login loop that looks like
   a credentials problem.
2. **Apply the headers `setAll` hands you.** It receives the cookies *and* a
   `headers` object of cache headers that must go onto the response; dropping
   them lets a CDN cache and serve one admin's refreshed session to another.

## RLS is defense in depth, not the primary control

Public proposal reads go through the DAL with the **secret key**, which bypasses
RLS entirely, *after* cookie verification. So RLS is not what protects a
proposal — the DAL is. Saying so plainly is the point; a design that quietly
depends on RLS while routing around it is worse than either choice alone.

RLS is still enabled on **every** table, with policies that match the real access
model:

- **No `anon` policy on `proposals`.** `supabase/tests/rls.sql` asserts that the
  `anon` role selects zero rows.
- Admin policies are `TO authenticated` **plus an ownership or `admin_users`
  predicate**. `TO authenticated` on its own is authentication without
  authorization.
- `auth.role()` is deprecated and is not used. Beyond deprecation, it breaks
  silently if anonymous sign-ins are ever enabled, because an anonymous user
  carries the `authenticated` role.
- `UPDATE` policies carry both `USING` and `WITH CHECK`; without the second, a
  row can be reassigned to another owner. `UPDATE` also needs a `SELECT` policy
  or it returns zero rows with no error.
- The tracking RPC is `SECURITY INVOKER`, with `EXECUTE` **revoked from
  `PUBLIC`** and granted only to `service_role`. Postgres grants `EXECUTE` to
  `PUBLIC` by default, so a function left alone in `public` is a public endpoint.
- `vault.decrypted_secrets` gets no grant to `authenticated`. The Vault docs are
  explicit that the view has no protection of its own; the grant is the control.

Table exposure through the Data API is a separate axis from RLS: a table is only
reachable by `anon` / `authenticated` if those roles were granted access. This
schema grants nothing to `anon`.

## Secrets

`SUPABASE_SECRET_KEY` bypasses RLS and must never reach a browser. Two mechanical
guards, both in CI: a grep of `.next/static/` for the variable name and for
`service_role`, and `src/server/**` opening with `import "server-only"` so a
client import is a build error rather than a leak.

No `NEXT_PUBLIC_*` Supabase variable exists. If a client component ever needs a
browser client, adding one means re-auditing every RLS policy at that moment,
because the key genuinely becomes public then.

## Open questions

- **`SUPABASE_JWKS_URL` is set in `.env` and documented nowhere.** The only
  thing in this design that would need it is asymmetric JWT verification for
  `getClaims()`. Confirm the intent, then either document it in `.env.example` or
  drop the variable.
- **Preview deployments inherit production environment variables.** At minimum
  Preview needs its own `PROPOSAL_COOKIE_SECRET`; better is a Supabase branch.
  `deployment.md` says decide this before the proposal surface ships.
