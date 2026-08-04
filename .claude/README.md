# `.claude/`

Harness configuration. Three of the entries in `settings.json` are load-bearing
enough to deserve their reason written down.

## Why these denials exist

**`Read(./.env)`** — it now holds a Supabase **service key**, which grants full
database access and bypasses RLS. A denied read means it can never land in a
transcript. To check which variables are set, read the **names** only:

```bash
cut -d= -f1 .env
```

**`Read(./public/demos/**)` and `Read(./src/HTML/**)`** — these are 5.7 MB HTML
build artifacts on a handful of enormous lines. `AGENTS.md` states the rule in
prose; this makes it mechanical, because "never read that file" is exactly the
kind of instruction an agent skips when it is looking for one string.

**`supabase db push`, `supabase db reset`, `psql`** — this is what makes *"the
agent authors migrations, a human applies them"* an enforced boundary rather than
a hopeful sentence in a prompt. Schema changes against a live database with real
client proposals are not something to discover after the fact.

`git commit` and `git push` are denied for the same reason: the human reviews the
diff.

## Personal overrides

`settings.local.json` is gitignored. Put your own allowances there — do not
loosen the shared file.

## `launch.json`

`deck-dev` runs `npm run dev` on port 3005 with `autoPort`. Use the preview tool
with this config rather than running the dev server in a shell — `CLAUDE.md`
explains why.
