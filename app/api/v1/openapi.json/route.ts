import { authUrls } from "@/src/server/auth/auth-urls";

import { buildOpenApiDocument } from "../openapi";

/** Public on purpose: the spec holds no data, and clients need it before they have a token. */
export function GET() {
  return Response.json(buildOpenApiDocument(authUrls.restApi), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
