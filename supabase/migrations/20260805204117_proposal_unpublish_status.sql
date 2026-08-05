-- Stage 2 · 6 — a fourth status: 'unpublished'.
--
-- WHY NOT REUSE 'draft'. dal.ts collapses draft and archived into the same
-- "not-found" response on purpose, because a draft is a document being
-- prepared and a visitor must not learn it exists. An unpublished proposal is
-- the opposite case: the client already has the link and has possibly already
-- opened it, so the anti-enumeration reasoning does not apply. It gets its own
-- honest message instead — "not available right now" — and its own status,
-- so the DAL's decision table stays a single column read rather than a second
-- hidden signal (e.g. "draft, but published_at is set").
--
-- 'archived' is unaffected: that value is this schema's stand-in for delete
-- (see the no-DELETE-grant comment at the end of the previous migration), and
-- an archived proposal must keep reading as gone, not as paused.

alter table public.proposals drop constraint proposals_status_check;

alter table public.proposals add constraint proposals_status_check
  check (status in ('draft', 'published', 'unpublished', 'archived'));
