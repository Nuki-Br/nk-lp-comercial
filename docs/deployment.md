# Deployment

Vercel, from `main`. No `vercel.json` — redirects and headers live in
`next.config.ts`, where they are typed and also apply in `next dev`.

## Environment

One variable:

| Name | Notes |
|---|---|
| `NEXT_PUBLIC_DECK_PASSWORD` | Shared team password for the access gate. |

**Set it in the Vercel project before the first deploy.** If it is missing the
app still builds and runs — the code falls back to the literal `"nuki2026"` — so
a forgotten variable does not fail loudly, it just silently ships the wrong
password.

`NEXT_PUBLIC_*` is inlined into the client bundle. This is a speed bump to keep
the deck off the open web, not a real secret.

## Redirect from the old path

The deck used to live at `/comercial` inside `nk-lp`. `next.config.ts` redirects
`/comercial` → `/` with **307, not 308** — browsers cache permanent redirects
aggressively and a wrong one is painful to undo. A 307 also preserves the
`#hash`, so `/comercial#calculadora` lands on the right slide.

> **This does not rescue links people already shared.** Those point at
> `nukibr.com/comercial`, which is still served by `nk-lp`. Until someone adds a
> redirect on that project or deletes its `/comercial` route, both URLs serve a
> deck and they will drift apart. This is the one migration step that cannot be
> done from inside this repo.

## Not indexable

The deck is `noindex, nofollow` three ways: the `robots` field in the root
layout's metadata, an `X-Robots-Tag` header on every route, and
`public/robots.txt`.

This matters more than it did in `nk-lp`. The gate is client-side, so a crawler
fetching the HTML receives the entire deck — pricing included — without ever
seeing the password form. Do not remove any of the three.

Preview deployments are equally exposed, and equally protected only by the
password.

## The Inspetor demo artifact

`public/demos/inspetor/index.html` (2.3 MB) is **committed**, not generated at
build time. `scripts/prepare-inspetor-demo.mjs` does not run in the Vercel build.

If you change the patch script, regenerate and commit the output:

```bash
node scripts/prepare-inspetor-demo.mjs
```

Check the patch counters it prints — a `0` means a regex went stale and the demo
shipped unpatched. See `docs/demo-embedding.md`.

## Checklist for a fresh deploy

1. Vercel project points at `Nuki-Br/nk-lp-comercial`, branch `main`.
2. `NEXT_PUBLIC_DECK_PASSWORD` is set.
3. Domain assigned.
4. On the deployed URL: the gate appears; the password unlocks and survives a
   reload; arrow keys walk all 13 anchors; the Inspetor demo iframe loads and
   ESC pressed *inside* it exits; the estimate reads 42 imagens / R$ 1.176 at
   defaults.
5. Network tab on a full scroll-through shows **zero** third-party requests. That
   is the whole reason this repo exists — if anything appears, something
   reintroduced analytics.
