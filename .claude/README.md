# `.claude/`

Harness configuration.

## What `settings.json` actually denies

Three reads, and nothing else:

**`Read(./public/demos/**)` and `Read(./src/HTML/**)`** — 5.7 MB HTML build
artifacts on a handful of enormous lines. `AGENTS.md` states the rule in prose;
this makes it mechanical, because "never read that file" is exactly the kind of
instruction an agent skips when it is looking for one string.

**`Read(./package-lock.json)`** — same shape of problem, no information an agent
needs.

## Personal overrides

`settings.local.json` is gitignored. Put your own allowances there — do not
loosen the shared file.

## `launch.json`

`deck-dev` runs `npm run dev` on port 3005 with `autoPort`. Use the preview tool
with this config rather than running the dev server in a shell — `CLAUDE.md`
explains why.
