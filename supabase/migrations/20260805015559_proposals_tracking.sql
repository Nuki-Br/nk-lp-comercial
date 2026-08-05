-- Stage 2 · 4/4 — first-party attention tracking.
--
-- Design: docs/security.md, ADR 10. This is NOT analytics: it is first-party
-- data, written to our own Postgres, from our own origin, about a proposal we
-- issued to a named client, and it is reachable only from the /p/[slug] render
-- path. /fast never emits a single row here.

-- ---------------------------------------------------------------------------
-- proposal_view_sessions
-- ---------------------------------------------------------------------------
-- One visit. A session already requires a successful password POST, which is
-- most of the bot defence: a crawler cannot reach this table without guessing a
-- password first.

create table public.proposal_view_sessions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  visitor_hash text not null,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  active_ms integer not null default 0,

  -- The replay guard. The ingest function accepts a flush only when the client's
  -- seq is STRICTLY greater than this, so a retried beacon, a double-fired
  -- pagehide, or a restored bfcache page adds nothing.
  --
  -- Starts at 0, so THE CLIENT'S FIRST FLUSH MUST CARRY seq = 1. A client that
  -- counts from 0 has every one of its flushes rejected, silently, and the
  -- symptom is a proposal that reads as never opened.
  flush_seq integer not null default 0,

  -- A salesperson's own dry-run, so it does not pollute the client's numbers.
  -- Set when the tracking request also carries a valid admin session.
  is_internal boolean not null default false,

  constraint proposal_view_sessions_active_ms_sane
    check (active_ms >= 0),
  constraint proposal_view_sessions_flush_seq_sane
    check (flush_seq >= 0)
);

create index proposal_view_sessions_by_proposal
  on public.proposal_view_sessions (proposal_id, started_at desc);

-- ---------------------------------------------------------------------------
-- proposal_slide_views
-- ---------------------------------------------------------------------------

create table public.proposal_slide_views (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.proposal_view_sessions (id) on delete cascade,

  -- TEXT, and deliberately not a foreign key to a slide row. There is no slide
  -- table - slides live inside the config document - but the real reason is
  -- stronger: reordering or re-configuring a proposal must never retroactively
  -- re-attribute a millisecond of recorded attention. A string captured at the
  -- moment of the visit cannot be re-pointed by a later edit.
  anchor_id text not null,

  dwell_ms integer not null default 0,
  enter_count integer not null default 0,

  constraint proposal_slide_views_dwell_sane check (dwell_ms >= 0),
  constraint proposal_slide_views_enter_sane check (enter_count >= 0),
  constraint proposal_slide_views_unique_anchor unique (session_id, anchor_id)
);

-- ---------------------------------------------------------------------------
-- record_view_flush
-- ---------------------------------------------------------------------------
-- BOTH writes in one function, so the sequence check and the dwell accumulation
-- cannot diverge. Two round trips could interleave with a concurrent flush and
-- double-count, or bump the sequence and then fail to apply the deltas.
--
-- The client sends DELTAS, not totals, and zeroes its accumulator only on a 2xx.
-- Combined with the seq check, a lost response costs nothing: the same delta
-- arrives again under the same seq and is rejected, or under a higher seq
-- carrying the merged total.
--
-- Returns true when the flush was applied, false when it was stale. The route
-- handler needs that answer, which is why the transport is
-- fetch(url, { keepalive: true }) and not sendBeacon - sendBeacon cannot read a
-- response, and is banned by name in AGENTS.md besides.

create function public.record_view_flush(
  p_session_id uuid,
  p_seq integer,
  p_active_ms_delta integer,
  p_slides jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_applied integer;
begin
  -- Clamp rather than trust. These deltas come from a browser: the flush
  -- interval is 15s and the largest legitimate one is a pagehide after a long
  -- idle, so ten minutes is generous. A negative or absurd value is a bug or an
  -- attack, and neither should be able to write a fictional number into a
  -- client's engagement record.
  p_active_ms_delta := least(greatest(coalesce(p_active_ms_delta, 0), 0), 600000);

  update public.proposal_view_sessions
     set active_ms    = active_ms + p_active_ms_delta,
         last_seen_at = pg_catalog.now(),
         flush_seq    = p_seq
   where id = p_session_id
     and p_seq > flush_seq;

  get diagnostics v_applied = row_count;

  -- Stale, replayed, or an unknown session. Say so; do not touch the slides.
  if v_applied = 0 then
    return false;
  end if;

  -- Aliased as `v` so the DO UPDATE arm has an unambiguous name for the target
  -- row. Without the alias the only way to name it is the bare table name, which
  -- reads as if it were a fresh scan of the table rather than the conflicting
  -- row, and invites someone to "fix" it into a subquery.
  insert into public.proposal_slide_views as v (session_id, anchor_id, dwell_ms, enter_count)
  select p_session_id,
         slide->>'anchorId',
         least(greatest(coalesce((slide->>'dwellMs')::integer, 0), 0), 600000),
         least(greatest(coalesce((slide->>'enterCount')::integer, 0), 0), 1000)
    from pg_catalog.jsonb_array_elements(coalesce(p_slides, '[]'::jsonb)) as slide
   where slide->>'anchorId' is not null
      on conflict (session_id, anchor_id) do update
     set dwell_ms    = v.dwell_ms + excluded.dwell_ms,
         enter_count = v.enter_count + excluded.enter_count;

  return true;
end;
$$;

comment on function public.record_view_flush(uuid, integer, integer, jsonb) is
  'Applies one tracking flush atomically. Returns false when p_seq is not newer '
  'than the stored flush_seq, which is how a replayed beacon is rejected.';

-- ---------------------------------------------------------------------------
-- Grants and RLS
-- ---------------------------------------------------------------------------
-- Postgres grants EXECUTE on new functions to PUBLIC by default, and anon and
-- authenticated inherit from PUBLIC. A function left alone in `public` is
-- therefore a public API endpoint. Revoke first, then grant narrowly.
--
-- SECURITY INVOKER, so the function has no privileges of its own: it runs as
-- service_role, which is the only role that may call it.

revoke all on function public.record_view_flush(uuid, integer, integer, jsonb) from public;
grant execute on function public.record_view_flush(uuid, integer, integer, jsonb) to service_role;

revoke all on public.proposal_view_sessions from anon;
revoke all on public.proposal_view_sessions from authenticated;
revoke all on public.proposal_slide_views from anon;
revoke all on public.proposal_slide_views from authenticated;

-- Stage 3 reads these for the composer's read-out, through the server. Stage 2
-- shows only a raw open count, also through the server. Neither needs a
-- PostgREST grant, so neither gets one.
alter table public.proposal_view_sessions enable row level security;
alter table public.proposal_slide_views enable row level security;
