import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The deck used to live at `/comercial` inside the nk-lp repo. It is now the
   * root route of this app, so links shared before the split keep working.
   * Temporary (307) on purpose: browsers cache 308s aggressively and a wrong
   * permanent redirect is painful to undo. A 307 also preserves the `#hash`,
   * so `/comercial#calculadora` still lands on the right slide.
   */
  async redirects() {
    return [{ source: "/comercial", destination: "/", permanent: false }];
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
