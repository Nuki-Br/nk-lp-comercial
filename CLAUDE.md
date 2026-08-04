@AGENTS.md

## Dev server

Use the preview tool with `.claude/launch.json` (`deck-dev`) rather than running
`npm run dev` in a shell.

After bulk file moves or renames, **restart the dev server and clear `.next`** —
it will otherwise serve stale modules and you will chase regressions that do not
exist.

## Scratch files

Use the session scratchpad directory, never `/tmp` and never the repo.

## Permissions

Read-only and verification commands are pre-allowed in `.claude/settings.json`.
Personal overrides belong in `.claude/settings.local.json`, which is gitignored.
