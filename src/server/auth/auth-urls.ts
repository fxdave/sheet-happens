/**
 * The one place the app's own origin is derived. `auth.ts` used to keep this module-private, but the
 * MCP layer needs the same values — the OAuth issuer, the JWKS URL and the protected-resource
 * identifier are all built from them, and re-deriving them from `process.env` in a second place is
 * how they drift apart.
 *
 * These are deliberately *static* strings. Better Auth's `baseURL` is a dynamic config outside
 * production (see `authBaseURLConfig` in `auth.ts`), which leaves `(await auth.$context).baseURL`
 * empty there — so anything that needs a URL at module scope has to come from here instead.
 */

const authBaseUrl =
  process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const parsedAuthUrl = new URL(authBaseUrl);

/** Better Auth's default `basePath`; not configured in `auth.ts`, so the default is the truth. */
export const authBasePath = "/api/auth";

/** The MCP endpoint's path. Doubles as the RFC 8707 resource identifier's path. */
export const mcpBasePath = "/api/mcp";

export const authOrigin = parsedAuthUrl.origin;
export const authHost = parsedAuthUrl.host;
export const authHostname = parsedAuthUrl.hostname;

export const authUrls = {
  origin: authOrigin,
  /** OAuth 2.1 / OIDC issuer. Has a path, because `basePath` does. */
  issuer: `${authOrigin}${authBasePath}`,
  jwks: `${authOrigin}${authBasePath}/jwks`,
  /**
   * The MCP protected-resource identifier. This exact string is what a user pastes into Claude, what
   * `mcp({ resource })` audience-binds tokens to, and what the protected-resource metadata must
   * echo back character for character — no trailing slash.
   */
  mcpResource: `${authOrigin}${mcpBasePath}`,
  /** The REST API base URL (`docs/rest-api.md`). */
  restApi: `${authOrigin}/api/v1`,
} as const;

export function getAuthOrigin() {
  return authOrigin;
}
