-- Stage 2 · 1/4 — the authorization source of truth.
--
-- Design: docs/data-model.md, docs/security.md. Hand-authored, comments and all:
-- `supabase db diff` strips them, and in this schema the comments ARE the design.
-- Forward-only. There is no down migration; the CLI does not run them.

-- ---------------------------------------------------------------------------
-- admin_users
-- ---------------------------------------------------------------------------
-- Authorization lives in a TABLE, not in auth.users metadata. Two reasons, both
-- of which have bitten other Supabase projects:
--
--   * raw_user_meta_data is editable by the user it describes. Reading a role
--     out of it is the single most common privilege-escalation bug on this
--     platform.
--   * raw_app_meta_data is safe to write but travels in the JWT, so it is stale
--     until the token refreshes. A deactivation that must take effect NOW cannot
--     live there.
--
-- A row here is read on every requireAdmin() call, so is_active denies on the
-- next page load rather than whenever a token happens to expire.

create table public.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'member',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  constraint admin_users_role_check check (role in ('owner', 'member'))
);

comment on table public.admin_users is
  'Who may use /admin. An auth.users account with no row here is denied - there '
  'is deliberately NO trigger creating rows, so a leaked sign-up produces an '
  'account that can authenticate and do nothing.';

comment on column public.admin_users.role is
  'Unused in stage 2. Present so stage 3 does not need a migration to add it.';

comment on column public.admin_users.is_active is
  'The deactivation switch. Read on every requireAdmin() call, never cached in a '
  'token claim.';

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- Supabase's default privileges can grant new public tables to anon and
-- authenticated. Revoking explicitly is cheap, is auditable in the diff, and
-- does not depend on which Data API defaults this project was created with.
--
-- Table exposure and RLS are SEPARATE axes: RLS decides which rows are visible
-- once a role can reach the table at all. anon can reach nothing here.

revoke all on public.admin_users from anon;
revoke all on public.admin_users from authenticated;
grant select on public.admin_users to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- Defense in depth, not the primary control - docs/security.md says so plainly.
-- The primary control is requireAdmin() plus the DAL.
--
-- An admin may read their OWN row and nothing else. That is exactly the row the
-- policies on every other table need in order to evaluate their `exists (...)`
-- check, which is why no SECURITY DEFINER helper is required here. Adding one
-- would silently remove access control to fix a problem that does not exist.
--
-- Nobody writes this table through PostgREST. Rows are created by a human in the
-- dashboard or by scripts/seed-admin.mjs with the secret key, which bypasses RLS.

alter table public.admin_users enable row level security;

-- `(select auth.uid())` rather than a bare call: the subquery form is evaluated
-- once per statement instead of once per row.
create policy "admin_users: read own row"
  on public.admin_users
  for select
  to authenticated
  using ((select auth.uid()) = id);
