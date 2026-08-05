-- Seed data. Idempotent: running it twice changes nothing.
--
-- Applied automatically by `supabase db reset` against a local stack. This repo
-- does not run a local stack (no Docker, no `supabase link` - docs/deployment.md),
-- so in practice this file is applied by hand against a branch when someone
-- wants something to click on.
--
-- WHAT IS NOT HERE, and cannot be: admin_users. Its primary key references
-- auth.users, so a row requires an auth account to exist first. That account is
-- created by a human in the Supabase dashboard, or by scripts/seed-admin.mjs.
-- There is no trigger that would create the admin_users row for you either -
-- see the comment in the first migration for why that absence is the design.

insert into public.clients (name, slug, contact_name)
values ('Construtora Exemplo', 'construtora-exemplo', 'Contato Exemplo')
on conflict (slug) do nothing;

-- No seed proposal. A proposal needs a config_snapshot to be publishable and a
-- credential to be openable, and inventing either here would produce a row that
-- looks real and behaves differently from one the composer creates. Create it
-- through /admin instead, which is also how you find out whether /admin works.
