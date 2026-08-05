-- RLS assertions, run by hand against a Supabase branch.
--
-- Vitest cannot cover row-level security, and docs/testing.md states the posture
-- rather than faking a test: RLS here is defense in depth, not the primary
-- control. This file is what keeps "defense in depth" from quietly meaning
-- "nothing".
--
-- Run it as a privileged role (the migration role is fine):
--
--   psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
--
-- Every assertion raises an exception on failure, so ON_ERROR_STOP=1 turns the
-- whole file into one pass/fail. It ends in ROLLBACK and writes nothing.

begin;

-- ---------------------------------------------------------------------------
-- 1. anon cannot reach a single proposal row.
-- ---------------------------------------------------------------------------
-- Two outcomes are both correct and the difference is worth printing. This
-- schema revokes the table itself from anon, which produces `permission denied`
-- - strictly stronger than RLS returning an empty set, because it does not
-- depend on a policy being right. docs/testing.md anticipated the weaker of the
-- two; either passes here, data does not.

set local role anon;

do $$
declare
  v_count integer;
begin
  begin
    select count(*) into v_count from public.proposals;
    if v_count = 0 then
      raise notice 'PASS  anon -> public.proposals: empty set';
    else
      raise exception 'FAIL  anon -> public.proposals: % rows leaked', v_count;
    end if;
  exception
    when insufficient_privilege then
      raise notice 'PASS  anon -> public.proposals: permission denied (stronger)';
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. anon errors on the credential table.
-- ---------------------------------------------------------------------------
-- Here an empty set is NOT good enough. This table holds password hashes and
-- the Vault secret ids for plaintext recall; it must be unreachable, not merely
-- filtered.

do $$
declare
  v_count integer;
begin
  begin
    select count(*) into v_count from public.proposal_access;
    raise exception
      'FAIL  anon -> public.proposal_access: reachable (% rows). It must error.',
      v_count;
  exception
    when insufficient_privilege then
      raise notice 'PASS  anon -> public.proposal_access: permission denied';
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. anon cannot reach the tracking tables or the ingest function.
-- ---------------------------------------------------------------------------

do $$
declare
  v_count integer;
begin
  begin
    select count(*) into v_count from public.proposal_view_sessions;
    raise exception
      'FAIL  anon -> public.proposal_view_sessions: reachable (% rows)', v_count;
  exception
    when insufficient_privilege then
      raise notice 'PASS  anon -> public.proposal_view_sessions: permission denied';
  end;
end;
$$;

do $$
declare
  v_ok boolean;
begin
  begin
    select public.record_view_flush(gen_random_uuid(), 1, 0, '[]'::jsonb) into v_ok;
    raise exception
      'FAIL  anon -> record_view_flush: executable. EXECUTE must be revoked '
      'from PUBLIC, which anon inherits.';
  exception
    when insufficient_privilege then
      raise notice 'PASS  anon -> record_view_flush: permission denied';
  end;
end;
$$;

reset role;

-- ---------------------------------------------------------------------------
-- 4. A signed-in user with no admin_users row sees nothing.
-- ---------------------------------------------------------------------------
-- This is the assertion that actually exercises a POLICY rather than a grant,
-- and it is the failure mode that matters most: `to authenticated` on its own
-- would let any Supabase account in the project read every client's proposals.
--
-- The claims GUC is how PostgREST passes the JWT to Postgres; setting it by hand
-- is how `auth.uid()` is impersonated in a test.

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}';

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.proposals;
  if v_count <> 0 then
    raise exception
      'FAIL  authenticated non-admin -> public.proposals: % rows leaked', v_count;
  end if;
  raise notice 'PASS  authenticated non-admin -> public.proposals: empty set';
end;
$$;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.clients;
  if v_count <> 0 then
    raise exception
      'FAIL  authenticated non-admin -> public.clients: % rows leaked', v_count;
  end if;
  raise notice 'PASS  authenticated non-admin -> public.clients: empty set';
end;
$$;

do $$
declare
  v_count integer;
begin
  begin
    select count(*) into v_count from public.proposal_access;
    raise exception
      'FAIL  authenticated -> public.proposal_access: reachable (% rows)', v_count;
  exception
    when insufficient_privilege then
      raise notice 'PASS  authenticated -> public.proposal_access: permission denied';
  end;
end;
$$;

reset role;

rollback;
