#!/usr/bin/env node
/* Create the first admin, when the Supabase dashboard is not at hand.

   Two steps, and the second is the one people forget: an auth account alone can
   authenticate and do NOTHING. Authorization is the `admin_users` row, and there
   is deliberately no trigger creating it — see the comment in the first
   migration. This script does both.

   Run: node scripts/seed-admin.mjs <email> <senha>

   Zero dependencies: global fetch against the Auth admin API and PostgREST, both
   with the secret key.

   ---------------------------------------------------------------------------
   STILL A HUMAN STEP, and this script does not do it for you:

   Disable email sign-ups and anonymous sign-ins in the Supabase dashboard
   (Authentication -> Providers / Sign In). Without that, anyone can create an
   account. They would land with no admin_users row and therefore no access —
   the design holds — but you would be running an open registration endpoint on
   a sales tool for no reason. */

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

for (const file of [".env.local", ".env"]) {
  const path = join(ROOT, file);
  if (existsSync(path)) process.loadEnvFile(path);
}

const URL_BASE = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SECRET = process.env.SUPABASE_SECRET_KEY;

const [email, password] = process.argv.slice(2);

if (!URL_BASE || !SECRET) {
  console.error("seed-admin: SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env");
  process.exit(1);
}

if (!email || !password) {
  console.error("seed-admin: usage — node scripts/seed-admin.mjs <email> <senha>");
  process.exit(1);
}

if (password.length < 8) {
  console.error("seed-admin: use a password of at least 8 characters");
  process.exit(1);
}

const headers = {
  apikey: SECRET,
  Authorization: `Bearer ${SECRET}`,
  "Content-Type": "application/json",
};

/* ---- 1. The auth account ---- */

const created = await fetch(`${URL_BASE}/auth/v1/admin/users`, {
  method: "POST",
  headers,
  /* Confirmed immediately: there is no mail configured on this project, and an
     unconfirmed account cannot sign in. */
  body: JSON.stringify({ email, password, email_confirm: true }),
});

let userId;

if (created.ok) {
  ({ id: userId } = await created.json());
  console.log(`auth account created for ${email}`);
} else {
  /* Already exists is the common case on a re-run. Look the account up rather
     than failing, so this script is idempotent in the way people expect. */
  const body = await created.text();
  const lookup = await fetch(
    `${URL_BASE}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
    { headers },
  );

  const found = lookup.ok ? (await lookup.json())?.users?.find((u) => u.email === email) : null;

  if (!found) {
    console.error(`seed-admin: could not create or find the account (HTTP ${created.status})`);
    console.error(body.slice(0, 300));
    process.exit(1);
  }

  userId = found.id;
  console.log(`auth account already existed for ${email}`);
}

/* ---- 2. The authorization row ---- */

const row = await fetch(`${URL_BASE}/rest/v1/admin_users`, {
  method: "POST",
  headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
  body: JSON.stringify({ id: userId, email, role: "owner", is_active: true }),
});

if (!row.ok) {
  console.error(`seed-admin: auth account exists but admin_users failed (HTTP ${row.status})`);
  console.error((await row.text()).slice(0, 300));
  console.error("Without that row the account can sign in and do nothing.");
  process.exit(1);
}

console.log(`admin_users row in place, role owner`);
console.log("\nNow disable email sign-ups and anonymous sign-ins in the Supabase dashboard.\n");
