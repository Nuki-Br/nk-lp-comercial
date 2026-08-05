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