import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The deck used to live at `/comercial` inside the nk-lp repo, then at `/`
   * here. It now lives at `/fast`, so both older links keep working.
   *
   * Temporary (307) on purpose: browsers cache 308s aggressively and a wrong
   * permanent redirect is painful to undo. A 307 also preserves the `#hash`,
   * so `/comercial#cases` still lands on the right slide.
   *
   * `/` now points at `/admin`, which is what AGENTS.md's route table has always
   * said. It pointed at `/fast` only while the admin was a stub; stage 2 gave it
   * a login, a proposal list and a detail page, so the team's bookmark lands
   * somewhere useful. An unauthenticated visitor is bounced to `/admin/login`
   * by proxy.ts.
   *
   * `/comercial` still goes to `/fast`, not to `/admin`: those are pitch links
   * that were shared with prospects, and landing a prospect on a login screen
   * would be worse than any tidiness gained.
   *
   * These redirects run before filesystem routing, which is what lets both root
   * layouts live inside route groups with no page at `/`. See ADR 17.
   */
  async redirects() {
    return [
      { source: "/", destination: "/admin", permanent: false },
      { source: "/comercial", destination: "/fast", permanent: false },
    ];
  },

  /**
   * Private sales material. The password gate is client-side, so a crawler
   * fetching the HTML would see the whole deck. Keep the whole app out of
   * search indexes.
   */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      /**
       * A proposal is one named client's document. `force-dynamic` alone gets
       * `no-cache, must-revalidate`, which permits a shared cache to hold the
       * response as long as it revalidates — and the thing being held would be
       * one client's proposal. `private` says "browser only", `no-store`
       * says "not even there". testing.md checklist B asserts this exact string.
       *
       * The tracking route sets its own on the response; this covers the page.
       */
      {
        source: "/p/:slug",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      /**
       * The composer's preview renders the same document, before it is even
       * published — same reasoning, same header. It is admin-gated, but "only
       * an admin can fetch it" says nothing about who may hold the response.
       */
      {
        source: "/preview/:id",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};

export default nextConfig;
