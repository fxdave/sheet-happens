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
     * A full prefetch (the `/time` tabs warm each other) lives for `static`, shortened from 5 min so
     * a view warmed in the background is never long out of date. A mutation's `revalidatePath`
     * evicts it sooner. How long a *visited* page is reused is set per page, in `app/time/page.tsx`.
     */
    staleTimes: {
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
