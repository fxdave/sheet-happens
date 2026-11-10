import { createMcpRateLimiter, type McpRateLimiter } from "@/src/server/mcp/rate-limit";

/** Per token, in memory: the MCP limiter's sliding window, keyed by token id instead of member. */
export const API_TOKEN_RATE_LIMIT = { windowMs: 60_000, max: 120 } as const;

export function createApiTokenRateLimiter(
  options: { windowMs?: number; max?: number } = {},
): McpRateLimiter {
  return createMcpRateLimiter({ ...API_TOKEN_RATE_LIMIT, ...options });
}

export const apiTokenRateLimit = createApiTokenRateLimiter();
