@AGENTS.md

## Start here

`docs/README.md` is the router. Find your task, read the one doc it names, stop.

If you are running a build stage, `docs/stages/README.md` has the status board
and the rules that apply to all three.

## Dev server

Use the preview tool with `.claude/launch.json` (`deck-dev`) rather than running
`npm run dev` in a shell.

After bulk file moves or renames, **restart the dev server and clear `.next`** —
it will otherwise serve stale modules and you will chase regressions that do not
exist.

## Supabase

**The Supabase MCP server needs an interactive OAuth flow you cannot complete in
a headless session.** Do not attempt it; ignore its tools if they appear.

The CLI over `DIRECT_URL` needs no OAuth and is the supported path. You author
migrations; a human applies them — `.claude/settings.json` enforces that by
denying `supabase db push` and `psql`. See `docs/deployment.md`.

## Secrets

Never `Read` `.env` — it holds a service key that bypasses RLS, and a denied read
means it cannot land in a transcript. To see which variables are set:

```bash
cut -d= -f1 .env
```

## Scratch files

Use the session scratchpad directory, never `/tmp` and never the repo.

## Permissions

Read-only and verification commands are pre-allowed in `.claude/settings.json`;
`.claude/README.md` explains why each denial is there. Personal overrides belong
in `.claude/settings.local.json`, which is gitignored.
