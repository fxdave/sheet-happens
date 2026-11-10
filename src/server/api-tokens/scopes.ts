/**
 * Personal access token scopes. Import-free so the settings page, the route handlers and the unit
 * tests can share them without pulling Prisma in.
 */
export const API_TOKEN_SCOPES = [
  "hours:read",
  "timesheets:read",
  "timesheets:write",
  "hours:read:all",
] as const;

export type ApiTokenScope = (typeof API_TOKEN_SCOPES)[number];

/** Scopes only an admin may grant, and that only work while the owner is still an admin. */
export const ADMIN_API_TOKEN_SCOPES = [
  "hours:read:all",
] as const satisfies readonly ApiTokenScope[];

export function isApiTokenScope(value: string): value is ApiTokenScope {
  return (API_TOKEN_SCOPES as readonly string[]).includes(value);
}

export function isAdminApiTokenScope(scope: ApiTokenScope) {
  return (ADMIN_API_TOKEN_SCOPES as readonly string[]).includes(scope);
}

/** Stored scopes in canonical order; an unknown stored value never widens access. */
export function normalizeApiTokenScopes(values: readonly string[]): ApiTokenScope[] {
  return API_TOKEN_SCOPES.filter((scope) => values.includes(scope));
}

/** The scopes a token may actually use right now, given its owner's live role. */
export function effectiveApiTokenScopes(
  granted: readonly string[],
  role: "ADMIN" | "MEMBER",
): ReadonlySet<ApiTokenScope> {
  return new Set(
    normalizeApiTokenScopes(granted).filter(
      (scope) => role === "ADMIN" || !isAdminApiTokenScope(scope),
    ),
  );
}

export const API_TOKEN_EXPIRY_OPTIONS = ["30", "90", "365", "never"] as const;

export type ApiTokenExpiryOption = (typeof API_TOKEN_EXPIRY_OPTIONS)[number];
