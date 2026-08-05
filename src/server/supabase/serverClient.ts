import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/server/supabase/database.types";

/* The RLS-enforcing client, bound to the request's cookies. This is what /admin
   uses. It carries the signed-in admin's identity, so every query it makes is
   subject to the policies in supabase/migrations/.

   The publishable key is used here and still never reaches a browser: auth runs
   entirely through server actions and proxy.ts. docs/deployment.md explains why
   there is no NEXT_PUBLIC_ variant and what adding one would cost. */

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

const SUPABASE_URL = requiredEnv("SUPABASE_URL");
const SUPABASE_PUBLISHABLE_KEY = requiredEnv("SUPABASE_PUBLISHABLE_KEY");

/**
 * For a **Server Component render**, where cookies are read-only.
 *
 * Swallowing the write is correct here and only here: `cookies()` throws on
 * `.set()` during a render, and `proxy.ts` has already refreshed the session for
 * this request, so the write it is attempting is redundant rather than lost.
 *
 * Using this in an action or a route handler would silently drop a real token
 * refresh and log the admin out at an arbitrary moment — which is why the
 * mutable version below is a separate function rather than a boolean argument.
 */
export async function createReadOnlyServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          /* Read-only render. See the note above — this is the ONE place where
             ignoring this is right. */
        }
      },
    },
  });
}

/**
 * For a **Server Action or Route Handler**, where cookies are writable.
 *
 * Deliberately does not catch. If the write fails here, something is wrong that
 * a swallowed exception would turn into an intermittent logout with no trace.
 *
 * NOTE on the second `setAll` argument: `@supabase/ssr` also hands over cache
 * headers (`Cache-Control: private, no-store` and friends) that must be applied
 * to the HTTP response, or a CDN can serve one admin's refreshed token to
 * another. `next/headers` gives no response object to apply them to — the place
 * that owns a response is `proxy.ts`, and that is where they are applied.
 */
export async function createMutableServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}
