import type { ApiTokenActor } from "@/src/server/api-tokens/authenticate";
import { effectiveApiTokenScopes, normalizeApiTokenScopes } from "@/src/server/api-tokens/scopes";

/** A route-test actor whose effective scopes follow the same live-role rule as production. */
export function fakeApiTokenActor(
  overrides: {
    scopes?: string[];
    role?: "ADMIN" | "MEMBER";
    profile?: "CONTRACTOR" | "EMPLOYEE";
    memberId?: string;
  } = {},
): ApiTokenActor {
  const scopes = overrides.scopes ?? ["hours:read", "timesheets:write"];
  const role = overrides.role ?? "MEMBER";

  return {
    tokenId: "token-1",
    tokenPrefix: "sh_pat_AbCd1234",
    member: {
      id: overrides.memberId ?? "11111111-1111-4111-8111-111111111111",
      displayName: "Casey Contractor",
      role,
      currentProfile: overrides.profile ?? "CONTRACTOR",
      timezone: "Europe/Budapest",
    },
    grantedScopes: normalizeApiTokenScopes(scopes),
    scopes: effectiveApiTokenScopes(scopes, role),
    requestMetadata: {
      ipAddress: "10.0.0.1",
      userAgent: "vitest",
      channel: "API",
      clientId: "api_token:token-1",
    },
  };
}
