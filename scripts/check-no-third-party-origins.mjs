#!/usr/bin/env node
/* Rule 2, mechanised.

   "Zero third-party network requests from any page" is the reason this repo
   exists — it was split out of nk-lp because analytics from marketing traffic
   was contaminating the pitch funnel. ADR 2 states it and ADR 10 narrows it.

   A rule that is only checked by someone remembering to open a network tab is a
   rule that lasts until the first busy week. This greps the built CLIENT chunks
   for any absolute origin that is not on the allowlist below.

   What it does NOT do, and cannot: prove that no request is made at runtime. A
   fetch to a variable URL is invisible here. It closes the realistic hole —
   somebody adds an SDK and the origin lands in a bundle as a literal — not the
   adversarial one.

   Run: node scripts/check-no-third-party-origins.mjs      (exits 1 on a hit) */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLIENT_DIR = join(ROOT, ".next/static");

/* Every entry needs a reason, or this list becomes the hole the check exists to
   close. None of these is a request: they are documentation links inside error
   messages, and schema URLs that are only ever compared as strings. */
const ALLOWED = new Map([
  ["https://nextjs.org", "Next's own error and docs links"],
  ["https://react.dev", "React's error decoder links"],
  ["https://reactjs.org", "React's older error links"],
  ["https://developer.mozilla.org", "MDN links inside warnings"],
  ["https://nukibr.com", "our own canonical origin, in metadata"],
  /* Namespace URIs. They look like URLs and are never fetched by anything —
     `http` is not a typo, the SVG namespace is literally http. */
  ["http://www.w3.org", "SVG / MathML / xlink namespace URIs"],
  ["https://www.w3.org", "same, when a tool normalises the scheme"],
  /* core-js ships a metadata object with its own license and repository URLs.
     It arrives through Next's browserslist polyfilling, not through us, and the
     strings sit in an object nothing reads at runtime. Verified by reading the
     surrounding bytes: `copyright: "© 2014-2024 Denis Pushkarev (zloirock.ru)",
     license: "https://github.com/zloirock/core-js/...` */
  ["https://github.com", "core-js banner metadata, never fetched"],
]);

if (!safeStat(CLIENT_DIR)) {
  console.error(
    "check-origins: .next/static not found — run `npm run build` first.\n" +
      "An unbuilt tree is not a passing result.",
  );
  process.exit(1);
}

function safeStat(path) {
  try {
    return statSync(path);
  } catch {
    return null;
  }
}

const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(js|mjs|css)$/.test(entry)) files.push(full);
  }
})(CLIENT_DIR);

/* Origin only — the path is noise for this question, and collapsing to the
   origin keeps the report short enough to read.

   The host must be DOTTED, with a 2+ character last label. Without that,
   minified concatenation produces phantom hits: `"https://" + a` matches as
   `https://a`, and a check that cries wolf on its own regex gets muted. A real
   third-party endpoint has a hostname. */
const ORIGIN_RE = /https?:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?::\d+)?/gi;

const found = new Map();

for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(ORIGIN_RE)) {
    const origin = match[0].toLowerCase();
    /* localhost and 127.* only ever appear in dev-time branches that are
       compiled out or never taken in production. They are not a third party. */
    if (/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(origin)) continue;
    if (ALLOWED.has(origin)) continue;

    const where = found.get(origin) ?? new Set();
    where.add(file.slice(ROOT.length + 1));
    found.set(origin, where);
  }
}

if (found.size > 0) {
  console.error(`\ncheck-origins: ${found.size} non-allowlisted origin(s) in the client bundle\n`);
  for (const [origin, where] of found) {
    console.error(`  ${origin}`);
    for (const file of [...where].slice(0, 3)) console.error(`      ${file}`);
  }
  console.error(
    "\nIf this is analytics or telemetry, it is banned outright — AGENTS.md Rule 2.\n" +
      "If it is genuinely never fetched, add it to ALLOWED with a reason.\n",
  );
  process.exit(1);
}

console.log(`check-origins: ${files.length} client files, no third-party origins.`);
