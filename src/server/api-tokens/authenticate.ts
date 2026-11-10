import { prisma } from "@/src/server/db/client";

import {
  effectiveApiTokenScopes,
  isAdminApiTokenScope,
  normalizeApiTokenScopes,
  type ApiTokenScope,
} from "./scopes";
import { API_TOKEN_PREFIX, hashApiToken } from "./tokens";

/** Provenance for every audit row an API call writes: `channel` and `clientId` are AuditLog columns. */
export type ApiTokenRequestProvenance = {
  ipAddress: string | null;
  userAgent: string | null;
  channel: "API";
  clientId: string;
};

export type ApiTokenActor = {
  tokenId: string;
  tokenPrefix: string;
  member: {
    id: string;
    displayName: string;
    role: "ADMIN" | "MEMBER";
    currentProfile: "CONTRACTOR" | "EMPLOYEE";
    timezone: string;
  };
  /** As granted at creation. */
  grantedScopes: ApiTokenScope[];
  /** What works right now: admin scopes drop out the moment the owner stops being an admin. */
  scopes: ReadonlySet<ApiTokenScope>;
  requestMetadata: ApiTokenRequestProvenance;
};

export type ApiTokenAuthErrorCode =
  "MISSING_TOKEN" | "INVALID_TOKEN" | "EXPIRED_TOKEN" | "REVOKED_TOKEN" | "INACTIVE_MEMBER";

export class ApiTokenAuthError extends Error {
  readonly code: ApiTokenAuthErrorCode;

  constructor(message: string, code: ApiTokenAuthErrorCode) {
    super(message);
    this.name = "ApiTokenAuthError";
    this.code = code;
  }
}

export type ApiTokenScopeErrorCode = "INSUFFICIENT_SCOPE" | "ADMIN_REQUIRED";

export class ApiTokenScopeError extends Error {
  readonly code: ApiTokenScopeErrorCode;
  readonly scope: ApiTokenScope;

  constructor(message: string, code: ApiTokenScopeErrorCode, scope: ApiTokenScope) {
    super(message);
    this.name = "ApiTokenScopeError";
    this.code = code;
    this.scope = scope;
  }
}

type TokenWithMember = {
  id: string;
  tokenPrefix: string;
  scopes: string[];
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  member: {
    id: string;
    displayName: string;
    role: "ADMIN" | "MEMBER";
    currentProfile: "CONTRACTOR" | "EMPLOYEE";
    timezone: string;
    status: string;
    deletedAt: Date | null;
  };
};

type AuditWrite = { data: Record<string, unknown> };

type UsageTransaction = {
  apiToken: { updateMany: (args: unknown) => Promise<{ count: number }> };
  auditLog: { create: (args: AuditWrite) => Promise<unknown> };
};

export type ApiTokenAuthDb = {
  apiToken: {
    findUnique: (args: unknown) => Promise<TokenWithMember | null>;
    updateMany: (args: unknown) => Promise<{ count: number }>;
  };
  auditLog: { create: (args: AuditWrite) => Promise<unknown> };
  $transaction: <T>(callback: (tx: UsageTransaction) => Promise<T>) => Promise<T>;
};

/** `lastUsedAt` is written at most this often, so a polling script costs one write a minute. */
export const LAST_USED_RESOLUTION_MS = 60_000;
/** One `api_token.used` audit row per token per hour of use; writes are audited individually. */
export const USAGE_AUDIT_INTERVAL_MS = 60 * 60_000;

export function readBearerToken(authorization: string | null) {
  if (!authorization) return null;

  const match = /^Bearer[ \t]+(\S+)[ \t]*$/i.exec(authorization);

  return match?.[1] ?? null;
}

/**
 * Resolves a bearer token to the member it acts for. Status, deletion and role are read live on
 * every call, so deactivating or demoting a member takes effect on their very next request.
 */
export async function authenticateApiToken(
  input: { authorization: string | null; ipAddress?: string | null; userAgent?: string | null },
  deps: { db?: ApiTokenAuthDb; now?: Date } = {},
): Promise<ApiTokenActor> {
  const db = deps.db ?? (prisma as unknown as ApiTokenAuthDb);
  const now = deps.now ?? new Date();
  const token = readBearerToken(input.authorization);

  if (!token) {
    throw new ApiTokenAuthError("Missing bearer token.", "MISSING_TOKEN");
  }

  if (!token.startsWith(API_TOKEN_PREFIX)) {
    throw new ApiTokenAuthError("Invalid token.", "INVALID_TOKEN");
  }

  const record = await db.apiToken.findUnique({
    where: { tokenHash: hashApiToken(token) },
    select: {
      id: true,
      tokenPrefix: true,
      scopes: true,
      expiresAt: true,
      revokedAt: true,
      lastUsedAt: true,
      member: {
        select: {
          id: true,
          displayName: true,
          role: true,
          currentProfile: true,
          timezone: true,
          status: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!record) throw new ApiTokenAuthError("Invalid token.", "INVALID_TOKEN");
  if (record.revokedAt) throw new ApiTokenAuthError("Token has been revoked.", "REVOKED_TOKEN");

  if (record.expiresAt && record.expiresAt <= now) {
    throw new ApiTokenAuthError("Token has expired.", "EXPIRED_TOKEN");
  }

  if (record.member.deletedAt || record.member.status !== "ACTIVE") {
    throw new ApiTokenAuthError("The token owner's account is not active.", "INACTIVE_MEMBER");
  }

  const requestMetadata: ApiTokenRequestProvenance = {
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    channel: "API",
    clientId: `api_token:${record.id}`,
  };

  await recordApiTokenUse(db, { token: record, now, requestMetadata });

  return {
    tokenId: record.id,
    tokenPrefix: record.tokenPrefix,
    member: {
      id: record.member.id,
      displayName: record.member.displayName,
      role: record.member.role,
      currentProfile: record.member.currentProfile,
      timezone: record.member.timezone,
    },
    grantedScopes: normalizeApiTokenScopes(record.scopes),
    scopes: effectiveApiTokenScopes(record.scopes, record.member.role),
    requestMetadata,
  };
}

/** Throws unless the token holds `scope` right now; an admin scope also needs a live admin role. */
export function requireApiTokenScope(actor: ApiTokenActor, scope: ApiTokenScope) {
  if (actor.scopes.has(scope)) return;

  if (isAdminApiTokenScope(scope) && actor.grantedScopes.includes(scope)) {
    throw new ApiTokenScopeError(
      `The "${scope}" scope requires the token owner to be an admin.`,
      "ADMIN_REQUIRED",
      scope,
    );
  }

  throw new ApiTokenScopeError(
    `This token lacks the "${scope}" scope.`,
    "INSUFFICIENT_SCOPE",
    scope,
  );
}

/** Cross-member reads are sensitive enough to audit on every call, unlike own-data reads. */
export async function recordApiTokenCrossMemberRead(
  actor: ApiTokenActor,
  details: { memberIds: readonly string[] | "all"; from: string; to: string; projectId?: string },
  deps: { db?: Pick<ApiTokenAuthDb, "auditLog"> } = {},
) {
  const db = deps.db ?? (prisma as unknown as ApiTokenAuthDb);

  await db.auditLog.create({
    data: {
      actorMemberId: actor.member.id,
      action: "api_token.cross_member_read",
      targetType: "api_token",
      targetId: actor.tokenId,
      after: {
        memberIds: details.memberIds === "all" ? "all" : [...details.memberIds],
        from: details.from,
        to: details.to,
        projectId: details.projectId ?? null,
      },
      ...actor.requestMetadata,
    },
  });
}

/**
 * Throttled bookkeeping. The conditional `updateMany` doubles as a lock: of two concurrent first
 * uses in a new hour only one matches, so only one audit row is written.
 */
async function recordApiTokenUse(
  db: ApiTokenAuthDb,
  input: { token: TokenWithMember; now: Date; requestMetadata: ApiTokenRequestProvenance },
) {
  const { token, now } = input;
  const lastUsed = token.lastUsedAt?.getTime() ?? null;

  if (lastUsed === null || now.getTime() - lastUsed >= USAGE_AUDIT_INTERVAL_MS) {
    const hourAgo = new Date(now.getTime() - USAGE_AUDIT_INTERVAL_MS);

    await db.$transaction(async (tx) => {
      const claimed = await tx.apiToken.updateMany({
        where: { id: token.id, OR: [{ lastUsedAt: null }, { lastUsedAt: { lte: hourAgo } }] },
        data: { lastUsedAt: now },
      });

      if (claimed.count === 0) return;

      await tx.auditLog.create({
        data: {
          actorMemberId: token.member.id,
          action: "api_token.used",
          targetType: "api_token",
          targetId: token.id,
          after: {
            prefix: token.tokenPrefix,
            previousUseAt: token.lastUsedAt?.toISOString() ?? null,
          },
          ...input.requestMetadata,
        },
      });
    });

    return;
  }

  if (now.getTime() - lastUsed >= LAST_USED_RESOLUTION_MS) {
    await db.apiToken.updateMany({
      where: {
        id: token.id,
        lastUsedAt: { lte: new Date(now.getTime() - LAST_USED_RESOLUTION_MS) },
      },
      data: { lastUsedAt: now },
    });
  }
}
