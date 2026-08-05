import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The deck used to live at `/comercial` inside the nk-lp repo, then at `/`
   * here. It now lives at `/fast`, so both older links keep working.
   *
   * Temporary (307) on purpose: browsers cache 308s aggressively and a wrong
   * permanent redirect is painful to undo. A 307 also preserves the `#hash`,
   * so `/comercial#calculator` still lands on the right slide.
   *
   * `/` points at `/fast`, NOT at `/admin`, for as long as the admin is a stub —
   * sending the team's bookmark to an empty page would be worse than what it
   * replaced. Stage 2 flips it once there is something there.
   *
   * These redirects run before filesystem routing, which is what lets both root
   * layouts live inside route groups with no page at `/`. See ADR 17.
   */
  async redirects() {
    return [
      { source: "/", destination: "/fast", permanent: false },
      { source: "/comercial", destination: "/fast", permanent: false },
    ];
  },

  /**
   * Private sales material. The password gate is client-side, so a crawler
   * fetching the HTML would see the whole deck — pricing included. Keep the
   * whole app out of search indexes.
   */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
