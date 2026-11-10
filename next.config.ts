import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
    /**
     * Reuse a visited dynamic page for 30 s, so going back to a `/time` tab is instant. A full
     * prefetch lives for `static`, shortened from 5 min so a view warmed in the background is never
     * long out of date. Every mutation here calls `revalidatePath`, which evicts both at once.
     */
    staleTimes: {
      dynamic: 30,
      static: 60,
    },
  },
  output: "standalone",
  /**
   * The Typst templates and bundled fonts are read from disk at render time, so the tracer has
   * to copy them into `.next/standalone`. Next's standalone server `chdir()`s into that
   * directory, which is what `resolveTypstTemplatesDir` anchors on.
   */
  outputFileTracingIncludes: {
    "/admin/reports/export": ["./src/server/pdf/templates/**/*", "./src/server/pdf/fonts/**/*"],
    "/admin/reports/export/preview": [
      "./src/server/pdf/templates/**/*",
      "./src/server/pdf/fonts/**/*",
    ],
    "/admin/system": ["./src/server/pdf/templates/**/*", "./src/server/pdf/fonts/**/*"],
    "/api/admin/system-check": ["./src/server/pdf/templates/**/*", "./src/server/pdf/fonts/**/*"],
  },
  reactStrictMode: true,
  typedRoutes: true,
};

export default withNextIntl(nextConfig);
