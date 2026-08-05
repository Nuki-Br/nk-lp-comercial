import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/server/supabase/database.types";

/* The RLS-BYPASSING client. It holds the secret key.

   This is the only way to reach `proposal_access`, `proposal_access_attempts`
   and the tracking tables, none of which grant anything to anon or authenticated
   — that is deliberate, and supabase/tests/rls.sql asserts it.

   It is also how /p/[slug] reads a proposal, but only ever AFTER
   loadProposalForVisitor has verified the cookie. Calling this from anywhere
   that has not done that check re-opens the leak the DAL exists to close, so
   there is exactly one caller in the public path and it is the DAL.

   `import "server-only"` on line 1 is what makes a mistake here a build error
   rather than a security incident. CI additionally greps .next/static/ for the
   variable name. */

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

const SUPABASE_URL = requiredEnv("SUPABASE_URL");
const SUPABASE_SECRET_KEY = requiredEnv("SUPABASE_SECRET_KEY");

/** Module-level singleton. There is no per-request state to carry: this client
    authenticates as the service role and never as a user. */
export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: {
    /* No session to persist and nothing to refresh — this is a machine
       identity. Leaving these on makes the client try to write auth state that
       has no home on a server. */
    persistSession: false,
    autoRefreshToken: false,
  },
});
