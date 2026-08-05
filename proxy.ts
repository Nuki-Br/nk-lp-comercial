import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/* OPTIMISTIC ONLY. This file decides nothing about content.
 *
 * Next's own authentication guide calls Proxy an optimistic check and says it
 * "should not be used as a full session management or authorization solution".
 * It also skips Server Functions on excluded paths — silently — so a matcher
 * edit here can remove coverage from a server action with no error anywhere.
 *
 * The authority is `requireAdmin()`, called at the top of every admin page,
 * action and route handler, and `src/server/proposals/dal.ts` for proposals.
 * If you are tempted to add a database read below, that is the signal you are
 * writing authorization in the wrong file. ADR 15.
 *
 * NOT `middleware.ts`. Next 16 renamed the convention; a `middleware.ts` file
 * is silently never executed and there is no warning. Node runtime by default,
 * and setting `runtime` here throws.
 */

export async function proxy(request: NextRequest) {
  /* Captured from `setAll` and applied to whichever response we return.
     Collecting them instead of writing directly is what makes the redirect
     branch and the pass-through branch impossible to treat differently — see
     the two traps below. */
  let refreshedCookies: { name: string; value: string; options?: object }[] = [];
  let cacheHeaders: Record<string, string> = {};

  const supabase = createServerClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          refreshedCookies = cookiesToSet;
          cacheHeaders = headers;
          /* Also on the REQUEST, so anything rendering downstream in this same
             request sees the refreshed session rather than the stale one. */
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        },
      },
    },
  );

  /* getClaims(), not getUser(): local JWT verification, no network call. Stale
     until the token refreshes, which is fine for a redirect and is exactly why
     this is not the boundary. `requireAdmin()` uses getUser() because a
     deactivated teammate must lose access on the next page load.
     getSession() is never used anywhere: the @supabase/ssr guide says not to
     trust it in server code. */
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  const isLoginRoute = request.nextUrl.pathname.startsWith("/admin/login");

  if (!signedIn && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    /* Where they were going, so login can send them back. `nextUrl.pathname`
       only — never a full URL from the request, which would make this an open
       redirect. */
    url.searchParams.set("next", request.nextUrl.pathname);
    return finish(NextResponse.redirect(url));
  }

  /* Already signed in and staring at the login form: send them home. */
  if (signedIn && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return finish(NextResponse.redirect(url));
  }

  return finish(NextResponse.next({ request }));

  /** The two traps, in one place so neither branch can forget one.
   *
   * 1. Cookies must ride along on a REDIRECT too. Drop them and the next
   *    request arrives with a refresh token that was already rotated, which
   *    presents as a login loop and reads like a credentials bug.
   * 2. `setAll`'s second argument is a set of cache headers (`Cache-Control:
   *    private, no-store` and friends) that must reach the response. Drop them
   *    and a CDN may cache one admin's refreshed token and serve it to another.
   */
  function finish(response: NextResponse) {
    for (const { name, value, options } of refreshedCookies) {
      response.cookies.set(name, value, options);
    }
    for (const [key, value] of Object.entries(cacheHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

/* `/admin` and everything under it, and nothing else.
 *
 * `/p/[slug]` is deliberately absent: a database round-trip here would double
 * every proposal request's latency and would still have to be re-checked in the
 * page, because Proxy cannot be the boundary. `/fast` is absent because its
 * gate is client-side by design (ADR 9).
 *
 * `:path*` is zero-or-more, so this matches `/admin` itself as well. */
export const config = {
  matcher: ["/admin/:path*"],
};
