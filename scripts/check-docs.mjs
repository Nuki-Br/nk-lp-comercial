#!/usr/bin/env node
/* Catches the one failure mode this repo has actually suffered: a doc that
   confidently names a file or a CSS class that a rename deleted months earlier.
   An agent trusts the doc, greps for something that does not exist, and wastes a
   session — or worse, "restores" it.

   Two checks, both zero-false-positive by construction:

   1. Every backticked token that LOOKS like a repo path must name a file that
      exists. Would have caught `modulos.data.ts` on day one.
   2. In docs/deck-runtime.md only, every backticked CSS class and `data-*`
      attribute must appear somewhere in src/styles/ or src/components/. This is
      the one that catches `.cm-section`.

   Run: node scripts/check-docs.mjs        (exits 1 on any failure) */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* Names that are prose, not claims that a file exists here and now. Each needs a
   reason, or this list becomes the hole the check was built to close. */
const PATH_ALLOWLIST = new Map([
  // Named precisely BECAUSE it must not exist — the Next 16 rename invariant.
  ["middleware.ts", "the trap: Next 16 renamed it to proxy.ts"],
  // Naming conventions, not files.
  ["PascalCase.tsx", "naming convention"],
  ["camelCase.ts", "naming convention"],
  // Registered gaps. docs/context/README.md and AGENTS.md both say, on purpose,
  // that this file does not exist and no agent should invent it.
  ["modulo-personaliza-produto.md", "a registered gap, deliberately unwritten"],
  // Gitignored or intentionally absent from the tree.
  [".env", "gitignored; holds a service key"],
  [".env.local", "gitignored"],
  ["settings.local.json", "gitignored personal overrides"],
  // Retired with the Planner demo; referenced only as history.
  ["scripts/prepare-planner-demo.mjs", "removed when the Planner demo was retired"],
  ["public/demos/planner/", "removed when the Planner demo was retired"],
  // Deliberately absent — documented as such.
  ["vercel.json", "absent on purpose; config lives in next.config.ts"],
]);

/* Files a later build stage creates. docs/stages/README.md is the status board;
   these are expected to be missing until their stage merges. */
const FUTURE_FILES = new Set([
  "data-model.md",
  "security.md",
  "tracking.md",
  "admin-guide.md",
  "proxy.ts",
  "biome.json",
  "dal.ts",
  "validate.ts",
  "password.ts",
  "proposalSession.ts",
  "record.ts",
  "database.types.ts",
  "serverClient.ts",
  "types.ts",
  "defaults.ts",
  "estimate.test.ts",
  "tokens.css",
  "gate.css",
  "fonts.ts",
  "Deck.tsx",
  "DeckTracking.tsx",
  "seed.sql",
  "rls.sql",
  "db-smoke.mjs",
  "seed-admin.mjs",
  "check-no-third-party-origins.mjs",
  "ci.yml",
]);

/* Directory prefixes a later stage creates. */
const FUTURE_DIRS = [
  "src/server/",
  "src/deck/",
  "src/components/admin/",
  "src/app/(deck)",
  "src/app/(admin)",
  "src/app/api/",
  "src/styles/slides/",
  "supabase/",
  ".github/",
];

/* Every file basename in the repo, so a bare `slides.css` in prose resolves the
   way a reader resolves it — "is there a file called that?" — instead of being
   treated as a path from the repo root. */
const basenames = new Set();
const allPaths = new Set();

/* Classes named in docs that describe markup in another repo, or that the doc
   names precisely because it is dead and about to be deleted. */
const CLASS_ALLOWLIST = new Set([
  "deck-root", // added by stage 1's root layout
]);

const mdFiles = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const full = join(dir, entry);
    const rel = full.slice(ROOT.length + 1);
    if (statSync(full).isDirectory()) {
      allPaths.add(`${rel}/`);
      allPaths.add(rel);
      walk(full);
    } else {
      allPaths.add(rel);
      basenames.add(entry);
      if (entry.endsWith(".md")) mdFiles.push(full);
    }
  }
})(ROOT);

/** Resolve the way a human reader does: as a repo path, as a path relative to
    the doc's own directory, or as "a file by that name somewhere". */
function resolves(token, docDir) {
  const clean = token.replace(/\/$/, "");
  if (allPaths.has(clean) || allPaths.has(token)) return true;
  if (basenames.has(clean)) return true;
  const relToDoc = join(docDir, clean).slice(ROOT.length + 1);
  if (allPaths.has(relToDoc)) return true;
  return false;
}

const failures = [];

/* ---- Check 1: backticked path-shaped tokens name real files ---- */

// Matches `src/...`, `docs/...`, `scripts/...`, `public/...`, `supabase/...`,
// `.claude/...`, or a bare `something.ts|tsx|mjs|css|json|sql|md` filename.
const PATH_RE =
  /`((?:src|docs|scripts|public|supabase|\.claude|\.github)\/[\w./[\]()-]+|[\w.-]+\.(?:ts|tsx|mjs|js|css|json|sql|md|ico))`/g;

for (const file of mdFiles) {
  const rel = file.slice(ROOT.length + 1);
  const docDir = dirname(file);
  const text = readFileSync(file, "utf8");
  for (const [, raw] of text.matchAll(PATH_RE)) {
    const p = raw.replace(/\/$/, "");
    const base = p.split("/").pop();
    if (PATH_ALLOWLIST.has(p) || PATH_ALLOWLIST.has(raw) || PATH_ALLOWLIST.has(base)) continue;
    if (FUTURE_FILES.has(p) || FUTURE_FILES.has(raw) || FUTURE_FILES.has(base)) continue;
    if (FUTURE_DIRS.some((d) => raw.startsWith(d) || p.startsWith(d))) continue;
    // Wildcards and placeholders are prose, not claims about one file.
    if (p.includes("*") || p.includes("<")) continue;
    if (!resolves(raw, docDir)) failures.push(`${rel}: \`${raw}\` does not exist`);
  }
}

/* ---- Check 2: deck-runtime.md's selectors are real ---- */

const RUNTIME_DOC = join(ROOT, "docs/deck-runtime.md");

function readTree(dir) {
  let out = "";
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out += readTree(full);
    else out += readFileSync(full, "utf8");
  }
  return out;
}

/** Comments do not count as evidence a selector is real. This is not
    hypothetical: two stale `.cm-section` comments in DeckBehaviors.tsx are
    exactly what kept docs/architecture.md's wrong selectors looking correct. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

try {
  const doc = readFileSync(RUNTIME_DOC, "utf8");
  const source = stripComments(
    readTree(join(ROOT, "src/styles")) + readTree(join(ROOT, "src/components")),
  );

  // `.some-class` and `data-some-attr`
  const SELECTOR_RE = /`(\.[a-z][a-z0-9-]*|data-[a-z-]+)`/g;
  const seen = new Set();
  for (const [, sel] of doc.matchAll(SELECTOR_RE)) {
    if (seen.has(sel)) continue;
    seen.add(sel);
    const needle = sel.startsWith(".") ? sel.slice(1) : sel;
    if (CLASS_ALLOWLIST.has(needle)) continue;
    // Whole-token match. A bare `includes` lets `.n` pass against any letter n
    // in the corpus, which makes the check worthless for short class names.
    const re = new RegExp(`(^|[^a-zA-Z0-9_-])${needle}(?![a-zA-Z0-9_-])`);
    if (!re.test(source)) {
      failures.push(`docs/deck-runtime.md: \`${sel}\` appears in no source file`);
    }
  }
} catch (err) {
  failures.push(`could not run the selector check: ${err.message}`);
}

/* ---- Check 3: the canonical estimate numbers are quoted consistently ----

   docs/estimate.md is their only home, but two files legitimately need concrete
   values or they are useless: the manual checklist, and stage 1's precondition
   (which an agent must verify BEFORE it can trust any doc). Those copies are the
   exact duplication that let 208 / 678 / 1.544 survive in three places while the
   code produced something else. So: guard them mechanically. */

const MIRRORS = ["docs/testing.md", "docs/stages/1-foundation.md"];
const MONEY_RE = /R\$ [\d.]+/g;

try {
  const home = readFileSync(join(ROOT, "docs/estimate.md"), "utf8");
  const canonical = new Set(home.match(MONEY_RE) ?? []);
  if (canonical.size === 0) {
    failures.push("docs/estimate.md quotes no R$ values — the canonical table is gone");
  }
  for (const mirror of MIRRORS) {
    const text = readFileSync(join(ROOT, mirror), "utf8");
    for (const money of new Set(text.match(MONEY_RE) ?? [])) {
      if (!canonical.has(money)) {
        failures.push(
          `${mirror}: quotes ${money}, which docs/estimate.md does not. ` +
            `Re-derive from code, fix estimate.md first, then this file.`,
        );
      }
    }
  }
} catch (err) {
  failures.push(`could not run the canonical-number check: ${err.message}`);
}

/* ---- Report ---- */

if (failures.length) {
  console.error(`\ncheck-docs: ${failures.length} stale reference(s)\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error("\nFix the doc, or add the path to PATH_ALLOWLIST with a reason.\n");
  process.exit(1);
}

console.log(`check-docs: ${mdFiles.length} files, no stale references.`);
