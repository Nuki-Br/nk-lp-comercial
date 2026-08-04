---
audience: both
status: current
verified_against: next.config.ts, .env.example, supabase CLI 2.109.1
size: 175
---

# Deployment

Vercel, from `main`. No `vercel.json` — redirects and headers live in
`next.config.ts`, where they are typed and also apply in `next dev`.

Supabase provides Postgres and Auth. Migrations are files on disk, applied over
`DIRECT_URL`; the Supabase MCP is a convenience, never a dependency.

## Environment

**`.env.example` is the list.** It is not repeated here — a second copy is a
second thing to go stale, and this repo has already lost that bet.

What this file adds is the property that matters: **the server/client split is a
security boundary, not a naming convention.**

- Anything `NEXT_PUBLIC_*` is **inlined into the client bundle**. Putting a
  Supabase secret key behind that prefix is a security incident, not a bug.
- Everything else is server-only and has **no fallback**. A missing
  `PROPOSAL_COOKIE_SECRET` throws at module load, deliberately.

That last point inverts how this repo used to behave. `NEXT_PUBLIC_DECK_PASSWORD`
falls back to a literal, so a forgotten variable ships the wrong password
silently. That fallback survives **only** for `/fast`, whose gate is a speed bump
by design. Nothing else gets one.

This design uses **no `NEXT_PUBLIC_*` Supabase variables at all** — admin auth
runs entirely through server actions and `proxy.ts`, so the publishable key never
reaches a browser. If a client component ever needs a browser Supabase client,
adding the prefixed variables means re-auditing every RLS policy at that moment,
because the key genuinely becomes public.

### Preview deployments

**Vercel previews inherit production environment variables by default.** Left
alone, a preview URL creates and serves real proposals against the production
database, and its traffic lands in a real client's tracking numbers.

At minimum, give Preview a **different `PROPOSAL_COOKIE_SECRET`**, so a cookie
minted in preview is worthless in production. Better: point Preview at a Supabase
branch or a second project.

Decide this before the proposal surface ships, not after.

## Migrations

Files on disk, forward-only, one concern per file, **never edit an applied
migration**. The Supabase CLI owns the timestamp — do not hand-name a file.

```bash
supabase migration new proposals_foundation
supabase db push --db-url "$DIRECT_URL"
supabase db lint --db-url "$DIRECT_URL" --level warning
supabase gen types typescript --db-url "$DIRECT_URL" --schema public \
  > src/server/supabase/database.types.ts
```

None of this needs OAuth, `supabase link`, or Docker. That matters: the Supabase
**MCP server needs an interactive OAuth flow that a headless agent session cannot
complete**, so no part of the build may depend on it.

⚠ The connection string **must be percent-encoded**. Supabase-generated passwords
routinely contain `@ : / ? #`, and a `db push` failing with an opaque parse error
is almost always this.

**Hand-authored SQL, not `db diff`.** Diff-generated SQL strips every comment,
and in this schema the comments are the design — why cents and not `numeric`, why
`ordinal` and not `position`. Hand-authored files are also deterministic in an
agent session: no local Postgres, no shadow database.

**No down migrations.** The Supabase CLI does not run them; the recovery path is
a new forward migration. Do not write one and trust it.

**The agent writes migrations; a human applies them.** `.claude/settings.json`
denies `supabase db push` and `psql`, so this is enforced rather than requested.

## Redirects

| From | To | Why |
|---|---|---|
| `/` | `/admin` | the root is the composer now |
| `/comercial` | `/fast` | the deck's old home, from before the split |

Both are **307, not 308** — browsers cache permanent redirects aggressively and a
wrong one is painful to undo.

The 307 preserves the `#hash`, so `/comercial#planner` still lands on the Planner
slide. The seven anchors renamed to English do not survive (`#calculadora` →
`#calculator`, and friends): the fragment arrives, matches nothing, and the page
opens at the top rather than erroring. ADR 5.

> **This does not rescue links people already shared.** Those point at
> `nukibr.com/comercial`, still served by `nk-lp`. Until someone adds a redirect
> on that project or deletes its `/comercial` route, both URLs serve a deck and
> they will drift apart. It is the one migration step that cannot be done from
> inside this repo.

## Not indexable

Every surface is `noindex, nofollow` three ways: the `robots` field in each root
layout's metadata, an `X-Robots-Tag` header matching `/(.*)` in `next.config.ts`,
and `public/robots.txt`.

This matters most for `/fast`, whose gate is client-side: a crawler fetching the
HTML receives the entire deck, pricing included, without ever seeing the password
form. Do not remove any of the three.

`/p/[slug]` does not have that weakness — its content never leaves the server
without a valid cookie — but it stays `noindex` anyway.

## The Inspetor demo artifact

`public/demos/inspetor/index.html` (5.7 MB) is **committed**, not generated at
build time. `scripts/prepare-inspetor-demo.mjs` does not run in the Vercel build.

If you change the patch script, regenerate and commit the output:

```bash
node scripts/prepare-inspetor-demo.mjs
```

Check the patch counters it prints — a `0` means a regex went stale and the demo
shipped unpatched. See `demo-embedding.md`.

## Checklist for a fresh deploy

1. Vercel project points at `Nuki-Br/nk-lp-comercial`, branch `main`.
2. Every variable in `.env.example` is set in Vercel, with Preview scoped
   separately per the warning above.
3. Migrations applied; `supabase db lint` clean.
4. At least one `admin_users` row exists, and **email sign-ups and anonymous
   sign-ins are disabled in the Supabase dashboard.** Without that, the whole
   authorization design leaks.
5. Domain assigned.
6. Run the three checklists in `testing.md` against the deployed URL.
7. Network tab on a full scroll-through of `/fast` shows **zero** third-party
   requests. That is the whole reason this repo exists — if anything appears,
   something reintroduced analytics.
