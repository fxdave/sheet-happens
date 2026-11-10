import {
  apiTokenRateLimit,
  authenticateApiToken,
  type ApiTokenActor,
} from "@/src/server/api-tokens";
import type { McpRateLimiter } from "@/src/server/mcp/rate-limit";

import { NO_STORE_HEADERS, RestApiError, restErrorResponse, toRestApiError } from "./errors";

export type RestHandlerDeps = {
  authenticate?: typeof authenticateApiToken;
  rateLimit?: McpRateLimiter;
};

/**
 * Every `/api/v1` handler: bearer token → rate limit → handler → JSON errors. Cookies are never read,
 * so a browser session can neither authenticate here nor be ridden cross-site.
 */
export async function handleApiRequest(
  request: Request,
  logLabel: string,
  handler: (actor: ApiTokenActor) => Promise<Response>,
  deps: RestHandlerDeps = {},
): Promise<Response> {
  try {
    const actor = await (deps.authenticate ?? authenticateApiToken)({
      authorization: request.headers.get("authorization"),
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });
    const verdict = (deps.rateLimit ?? apiTokenRateLimit).check(actor.tokenId);

    if (!verdict.allowed) {
      throw new RestApiError(
        429,
        "RATE_LIMITED",
        `Rate limit exceeded. Retry in ${verdict.retryAfterSeconds}s.`,
        { headers: { "Retry-After": String(verdict.retryAfterSeconds) } },
      );
    }

    return await handler(actor);
  } catch (error) {
    return restErrorResponse(toRestApiError(error, logLabel));
  }
}

export function apiJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: NO_STORE_HEADERS });
}
