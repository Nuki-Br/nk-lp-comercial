-- Stage 2 · 3/4 — the proposal credential and the attempt log.
--
-- Design: docs/security.md. These two tables are the only ones in the schema
-- that NO PostgREST role can reach. Both are read and written exclusively by the
-- server, through the secret key.

-- ---------------------------------------------------------------------------
-- proposal_access
-- ---------------------------------------------------------------------------
-- Separate from `proposals` so that rotating a password is an insert plus a
-- revoke, not an update to the commercial document.

create table public.proposal_access (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,

  -- scrypt, self-describing: scrypt$N$r$p$<salt-b64>$<hash-b64>. Encoding the
  -- parameters means they can be raised later without a flag day - a hash
  -- verifies against the parameters it was created with.
  password_hash text not null,

  -- Supabase Vault secret id, holding the PLAINTEXT so a salesperson can re-read
  -- a password months later (ADR 14, a product decision taken with the trade
  -- stated: a database dump exposes client passwords).
  --
  -- Not a foreign key: vault.secrets lives in another schema and is managed
  -- through vault.create_secret() / vault.update_secret(), not by us.
  --
  -- VERIFICATION NEVER READS THIS. It runs against password_hash.
  vault_secret_id uuid,

  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references public.admin_users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- At most one live credential per proposal. Partial, so the revoked history
-- stays queryable - "when did we last rotate this" is a real question.
create unique index proposal_access_one_live_per_proposal
  on public.proposal_access (proposal_id)
  where revoked_at is null;

comment on table public.proposal_access is
  'Service-role only. No grant to anon or authenticated, so a stray PostgREST '
  'call errors with permission denied rather than returning an empty set - the '
  'difference matters when you are trying to prove the boundary holds.';

-- ---------------------------------------------------------------------------
-- proposal_access_attempts
-- ---------------------------------------------------------------------------
-- Audit trail and rate limiter in one table. An indexed count(*) over a window
-- is the entire mechanism, which is why @upstash/ratelimit is on Rule 3's ban
-- list rather than in package.json.

create table public.proposal_access_attempts (
  id bigint generated always as identity primary key,
  proposal_id uuid not null references public.proposals (id) on delete cascade,

  -- HMAC of proposalId|ip|ua under a key that rotates by UTC day. The raw IP is
  -- never a column and never a log line. Including the proposal id means the
  -- same visitor hashes differently per proposal, so nothing correlates across
  -- clients.
  visitor_hash text not null,

  succeeded boolean not null,
  attempted_at timestamptz not null default now()
);

-- The two windows in docs/security.md: 8 failures per visitor and 60 per
-- proposal, both in 15 minutes. Without these indexes the rate-limit check is a
-- sequential scan on the one table that grows fastest under attack.
create index proposal_access_attempts_by_visitor
  on public.proposal_access_attempts (proposal_id, visitor_hash, attempted_at desc);

create index proposal_access_attempts_by_proposal
  on public.proposal_access_attempts (proposal_id, attempted_at desc);

-- ---------------------------------------------------------------------------
-- Grants and RLS
-- ---------------------------------------------------------------------------
-- RLS is enabled with NO policies. Enabled-and-empty denies every row to every
-- non-bypassing role; service_role bypasses it. Belt and braces with the
-- revokes below, which deny the table itself rather than its rows.
--
-- supabase/tests/rls.sql asserts the difference: anon gets `permission denied`
-- here, and an empty set on `proposals`.

revoke all on public.proposal_access from anon;
revoke all on public.proposal_access from authenticated;
revoke all on public.proposal_access_attempts from anon;
revoke all on public.proposal_access_attempts from authenticated;

alter table public.proposal_access enable row level security;
alter table public.proposal_access_attempts enable row level security;

-- ---------------------------------------------------------------------------
-- Vault
-- ---------------------------------------------------------------------------
-- The plaintext recall path. Supabase's own documentation is explicit that the
-- decrypted view has no protection of its own - "anyone that has access to the
-- view has access to decrypted secrets" - so the grant is the entire control.
--
-- Revoking from anon and authenticated is stated here rather than assumed,
-- because assuming is how the one table that holds client passwords in the clear
-- ends up readable.
--
-- Wrapped, for two reasons that are not hypothetical: the view belongs to the
-- vault extension rather than to us, so REVOKE can fail on ownership, and the
-- extension may not be enabled on a given project at all. Neither should abort a
-- migration that has nothing else to do with Vault.
--
-- It raises a WARNING rather than passing quietly. A revoke on the one object
-- that holds client passwords in the clear is not something to discover later
-- from a blank log line - if you see this warning, check the grant by hand
-- before shipping the password-recall feature.

do $$
begin
  execute 'revoke all on vault.decrypted_secrets from anon';
  execute 'revoke all on vault.decrypted_secrets from authenticated';
exception
  when insufficient_privilege then
    raise warning
      'Could not revoke on vault.decrypted_secrets (insufficient privilege). '
      'Verify by hand that anon and authenticated have no grant on it.';
  when undefined_table or undefined_object or invalid_schema_name then
    raise warning
      'vault.decrypted_secrets not found - the supabase_vault extension is not '
      'enabled. Enable it before using password recall, then revoke by hand.';
end;
$$;
