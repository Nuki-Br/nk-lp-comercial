import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { createReadOnlyServerClient } from "@/server/supabase/serverClient";

/* ADR 15: proxy.ts is optimistic, this is authoritative. Called at the top of
   EVERY admin page, server action and route handler — not once in a layout.
   Layout-only gating is a known hole, and Next's own guide is explicit that
   Proxy matchers skip Server Functions, so a matcher edit can remove coverage
   from an action with no error at all. */

export type AdminIdentity = {
  id: string;
  email: string;
  role: "owner" | "member";
};

/**
 * `null` when the caller is not an active admin, for any of three reasons that
 * are deliberately not distinguished to the caller: no session, no
 * `admin_users` row, or `is_active = false`.
 *
 * Wrapped in React `cache()`, so a page that asks three times pays once per
 * request. The cache is per-request; it cannot leak one admin's identity into
 * another's render.
 */
export const getAdmin = cache(async (): Promise<AdminIdentity | null> => {
  const supabase = await createReadOnlyServerClient();

  /* getUser(), not getSession(). The @supabase/ssr guide says plainly never to
     trust getSession() in server code because it is not guaranteed to
     revalidate the token. getUser() asks the Auth server, which is what makes a
     deleted or banned account lose access on the next page load rather than
     whenever its token happens to expire.

     proxy.ts uses getClaims() instead — cheap, local, and optimistic, which is
     all a redirect needs to be. */
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  /* Authorization is this row and nothing else. Never user_metadata, which the
     user can edit; never app_metadata, which is stale until the token
     refreshes. is_active denies here, immediately, because it is a database
     read rather than a token claim. */
  const { data: admin } = await supabase
    .from("admin_users")
    .select("id, email, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!admin || !admin.is_active) return null;

  return {
    id: admin.id,
    email: admin.email,
    role: admin.role === "owner" ? "owner" : "member",
  };
});

/**
 * For **pages**: sends an unauthorized visitor to the login screen.
 *
 * `redirect()` throws, so nothing after this line runs — which is the point.
 * Route handlers and actions want a status code rather than a navigation, so
 * they call `getAdmin()` and answer 401 themselves.
 */
export async function requireAdmin(): Promise<AdminIdentity> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
