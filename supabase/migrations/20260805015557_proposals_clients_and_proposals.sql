-- Stage 2 · 2/4 — clients and proposals.
--
-- Design: docs/data-model.md. The deck's configuration is a DOCUMENT, not a set
-- of tables (ADR 13): `DeckConfig` is the contract between the three build
-- stages, and normalizing it into columns would make this file the contract
-- instead of the TypeScript type.

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
-- A trigger rather than an application concern, because "the app remembers to
-- set it" is a promise and a trigger is a guarantee.
--
-- `search_path = ''` is deliberate: without it a function resolves unqualified
-- names against the caller's search_path, which is how a privileged function
-- gets tricked into calling somebody else's `now()`. Supabase's own advisor
-- flags functions that omit it.

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
-- One construtora, many proposals over time.

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  contact_name text,
  contact_email text,
  contact_phone text,
  created_by uuid references public.admin_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- proposals
-- ---------------------------------------------------------------------------

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  slug text not null unique,
  title text not null,
  status text not null default 'draft',
  expires_at timestamptz,
  access_epoch integer not null default 1,
  config_override jsonb not null default '{}'::jsonb,
  config_snapshot jsonb,
  published_at timestamptz,
  created_by uuid references public.admin_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint proposals_status_check
    check (status in ('draft', 'published', 'archived')),

  -- The URL segment reaches a stranger over WhatsApp. Keep it boring: lowercase,
  -- no leading or trailing hyphen, long enough not to be guessable by hand.
  constraint proposals_slug_format
    check (slug ~ '^[a-z0-9][a-z0-9-]{6,61}[a-z0-9]$'),

  constraint proposals_access_epoch_positive
    check (access_epoch >= 1),

  -- ADR 13, enforced rather than remembered: a published proposal renders its
  -- frozen snapshot. Publishing without one would silently fall back to live
  -- defaults, which is the exact failure this design exists to prevent.
  constraint proposals_published_has_snapshot
    check (status <> 'published' or config_snapshot is not null),

  constraint proposals_published_has_timestamp
    check (status <> 'published' or published_at is not null)
);

create trigger proposals_set_updated_at
  before update on public.proposals
  for each row execute function public.set_updated_at();

-- The admin list groups by client; the unique index on slug already covers the
-- /p/[slug] lookup, which is the hot path.
create index proposals_client_id_idx on public.proposals (client_id);

comment on column public.proposals.access_epoch is
  'Bumping this invalidates every access cookie ever issued for this proposal, '
  'with no cookie-side bookkeeping: the cookie payload carries the epoch it was '
  'minted under and the DAL compares them on every render.';

comment on column public.proposals.expires_at is
  'NULL means no expiry, not expired. This is the document clock; the cookie has '
  'its own, and both are checked - docs/security.md.';

comment on column public.proposals.config_override is
  'A DELTA over buildDefaultDeck(), keyed by slide node id. A copy fix in '
  'src/content/ therefore reaches every unpublished draft for free.';

comment on column public.proposals.config_snapshot is
  'The RESOLVED config, frozen at publish. A sent proposal is a commercial '
  'document and must not change because someone edited a default months later. '
  'Must be written with chrome.allowPriceOverride = false.';

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- anon reaches nothing. The public proposal read does NOT go through this role:
-- it goes through the DAL with the secret key, after cookie verification.

revoke all on public.clients from anon;
revoke all on public.clients from authenticated;
revoke all on public.proposals from anon;
revoke all on public.proposals from authenticated;

grant select, insert, update on public.clients to authenticated;
grant select, insert, update on public.proposals to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- Every policy is `to authenticated` PLUS a predicate. `to authenticated` on its
-- own is authentication without authorization - it would let any signed-in
-- Supabase user read every client's proposals.
--
-- `auth.role()` is deprecated and is not used anywhere here. Beyond deprecation
-- it breaks silently if anonymous sign-ins are ever enabled, because an
-- anonymous user carries the `authenticated` role and would pass the check.
--
-- UPDATE policies carry BOTH `using` and `with check`. Without the second, a row
-- can be rewritten into a state the policy would never have selected. UPDATE
-- also needs a SELECT policy to find the row at all, or it returns zero rows
-- with no error.

alter table public.clients enable row level security;
alter table public.proposals enable row level security;

create policy "clients: active admins read"
  on public.clients for select to authenticated
  using (
    exists (
      select 1 from public.admin_users au
      where au.id = (select auth.uid()) and au.is_active
    )
  );

create policy "clients: active admins insert"
  on public.clients for insert to authenticated
  with check (
    exists (
      select 1 from public.admin_users au
      where au.id = (select auth.uid()) and au.is_active
    )
  );

create policy "clients: active admins update"
  on public.clients for update to authenticated
  using (
    exists (
      select 1 from public.admin_users au
      where au.id = (select auth.uid()) and au.is_active
    )
  )
  with check (
    exists (
      select 1 from public.admin_users au
      where au.id = (select auth.uid()) and au.is_active
    )
  );

create policy "proposals: active admins read"
  on public.proposals for select to authenticated
  using (
    exists (
      select 1 from public.admin_users au
      where au.id = (select auth.uid()) and au.is_active
    )
  );

create policy "proposals: active admins insert"
  on public.proposals for insert to authenticated
  with check (
    exists (
      select 1 from public.admin_users au
      where au.id = (select auth.uid()) and au.is_active
    )
  );

create policy "proposals: active admins update"
  on public.proposals for update to authenticated
  using (
    exists (
      select 1 from public.admin_users au
      where au.id = (select auth.uid()) and au.is_active
    )
  )
  with check (
    exists (
      select 1 from public.admin_users au
      where au.id = (select auth.uid()) and au.is_active
    )
  );

-- No DELETE policy and no delete grant, on purpose. A proposal is archived
-- (`status = 'archived'`), never deleted: the tracking rows hanging off it are
-- the record of a real client's real attention.
