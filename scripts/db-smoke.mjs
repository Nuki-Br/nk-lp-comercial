#!/usr/bin/env node
/* Post-migration smoke test. Run it right after a human applies the migrations,
   before writing any code against the schema.

   Two questions, both of which have wasted sessions when nobody asked them:

     1. Is every table actually there, under the name the code expects?
     2. Is the public role locked out of them?

   The second one is the point. A migration that creates the tables but leaves
   `anon` able to read `proposals` is a migration that "worked".

   Run: node scripts/db-smoke.mjs        (exits 1 on any failure)

   ---------------------------------------------------------------------------
   Why this talks to PostgREST and not to DATABASE_URL

   The stage brief and .env.example both say this script reads the catalog over
   DATABASE_URL. It cannot, and the reason is structural rather than a
   preference: Node ships no Postgres driver, `pg` would be a runtime dependency
   that Rule 3 does not allow, and `psql` is denied in .claude/settings.json on
   purpose so that agents cannot touch the database directly.

   What is left is the Data API, over global fetch, with zero dependencies - and
   it answers a better question anyway. The catalog would tell us a table exists;
   PostgREST tells us who can reach it, which is the thing the schema is trying
   to control. */

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

for (const file of [".env.local", ".env"]) {
  const path = join(ROOT, file);
  if (existsSync(path)) process.loadEnvFile(path);
}

const URL_BASE = process.env.SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const PUBLISHABLE = process.env.SUPABASE_PUBLISHABLE_KEY;

/* Names only, never values. This script prints what it prints into terminals and
   transcripts. */
const missing = Object.entries({ SUPABASE_URL: URL_BASE, SUPABASE_SECRET_KEY: SECRET })
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length) {
  console.error(`db-smoke: missing ${missing.join(", ")} — set them in .env`);
  process.exit(1);
}

/* Every table the code will name, and who is allowed to reach it. `service` is
   the secret key, which bypasses RLS; `public` is the publishable key acting as
   anon. See docs/security.md. */
const TABLES = [
  { name: "admin_users", anon: "denied" },
  { name: "clients", anon: "denied" },
  { name: "proposals", anon: "denied" },
  { name: "proposal_access", anon: "denied" },
  { name: "proposal_access_attempts", anon: "denied" },
  { name: "proposal_view_sessions", anon: "denied" },
  { name: "proposal_slide_views", anon: "denied" },
];

const failures = [];
const rest = (path) => `${URL_BASE.replace(/\/$/, "")}/rest/v1/${path}`;

/** One row, zero columns of interest: we want the status code and, when it is a
    refusal, the reason. PostgREST puts a Postgres SQLSTATE in the body, and the
    difference between "this role may not touch this table" (42501) and "this key
    is not valid" (PGRST301 and friends) is the difference between a passing test
    and a test that proves nothing. */
async function probe(table, key) {
  const res = await fetch(rest(`${table}?select=*&limit=0`), {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  let code = null;
  if (!res.ok) {
    try {
      code = (await res.json())?.code ?? null;
    } catch {
      /* Not every refusal has a JSON body. Status alone will have to do. */
    }
  }
  return { status: res.status, code };
}

/** Proves the publishable key is a real key before any conclusion is drawn from
    it being refused. An invalid key is refused by everything, which would make
    the whole lockout section below read as a pass. */
async function keyIsLive(key) {
  const res = await fetch(`${URL_BASE.replace(/\/$/, "")}/auth/v1/settings`, {
    headers: { apikey: key },
  });
  return res.ok;
}

/* ---- 1. Every table exists and the service key can reach it ---- */

console.log("\ntables, as the service key sees them\n");

for (const { name } of TABLES) {
  const { status, code } = await probe(name, SECRET);
  if (status === 200) {
    console.log(`  ok       ${name}`);
  } else {
    console.log(`  MISSING  ${name}  (HTTP ${status}${code ? `, ${code}` : ""})`);
    failures.push(`${name} is not reachable with the secret key (HTTP ${status})`);
  }
}

/* ---- 2. The publishable key reaches none of them ---- */

if (!PUBLISHABLE) {
  console.log("\nSUPABASE_PUBLISHABLE_KEY not set — skipping the anon lockout check");
  console.log("This is the half of the smoke test that matters. Set it and re-run.\n");
  failures.push("anon lockout unverified (SUPABASE_PUBLISHABLE_KEY not set)");
} else if (!(await keyIsLive(PUBLISHABLE))) {
  /* Without this gate the section below is worthless: a typo'd key is refused by
     every table and prints seven reassuring `locked` lines. */
  console.log("\nSUPABASE_PUBLISHABLE_KEY is refused by /auth/v1/settings — the key");
  console.log("itself is invalid, so nothing can be concluded from anon being denied.\n");
  failures.push("anon lockout unverified (SUPABASE_PUBLISHABLE_KEY is not a live key)");
} else {
  console.log("\nsame tables, as the publishable key sees them\n");

  for (const { name } of TABLES) {
    const { status, code } = await probe(name, PUBLISHABLE);
    /* 42501 is Postgres saying "permission denied for table", which is the
       revoke doing its job. PGRST205 is PostgREST refusing to admit the table is
       in its schema cache — also a locked door.

       200 is a leak even with zero rows: it means the table is exposed and only
       a policy is holding the line.

       Anything else is not a pass. An unexplained refusal is a result nobody can
       act on, and this script exists to be actionable. */
    if (status === 200) {
      console.log(`  LEAK     ${name}  (HTTP 200)`);
      failures.push(`${name} is readable by the publishable key`);
    } else if (code === "42501" || code === "PGRST205") {
      console.log(`  locked   ${name}  (${code})`);
    } else {
      console.log(`  ?        ${name}  (HTTP ${status}${code ? `, ${code}` : ""})`);
      failures.push(`${name} refused anon for an unrecognised reason (${code ?? status})`);
    }
  }
}

/* ---- 3. Columns, best effort ---- */
/* PostgREST publishes an OpenAPI document describing what the calling role can
   see. It is the closest thing to "list the columns" available over HTTP, and it
   is best-effort on purpose: a project can have the OpenAPI output turned off,
   and that is not a schema failure. */

try {
  const res = await fetch(rest(""), {
    headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}` },
  });
  const spec = await res.json();
  const defs = spec?.definitions ?? {};

  if (Object.keys(defs).length) {
    console.log("\ncolumns\n");
    for (const { name } of TABLES) {
      const cols = Object.keys(defs[name]?.properties ?? {});
      if (cols.length) console.log(`  ${name}\n    ${cols.join(", ")}`);
    }
  } else {
    console.log("\ncolumns: OpenAPI output empty or disabled — skipped");
  }
} catch {
  console.log("\ncolumns: OpenAPI document unavailable — skipped");
}

/* ---- Report ---- */

if (failures.length) {
  console.error(`\ndb-smoke: ${failures.length} failure(s)\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error("");
  process.exit(1);
}

console.log(`\ndb-smoke: ${TABLES.length} tables present, none reachable by anon.\n`);
