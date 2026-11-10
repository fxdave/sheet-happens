import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/src/server/db/client";

import {
  API_TOKEN_EXPIRY_OPTIONS,
  isAdminApiTokenScope,
  isApiTokenScope,
  normalizeApiTokenScopes,
  type ApiTokenExpiryOption,
  type ApiTokenScope,
} from "./scopes";

/** Every token starts with this, so a leaked one is recognisable to secret scanners and to us. */
export const API_TOKEN_PREFIX = "sh_pat_";

export const API_TOKEN_LIMITS = {
  nameMaxLength: 80,
  /** Live (unrevoked, unexpired) tokens per member. */
  maxActivePerMember: 20,
  /** Characters of the secret kept visible after the prefix, e.g. `sh_pat_AbCd1234`. */
  visibleSecretChars: 8,
} as const;

export type ApiTokenRequestMetadata = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type ApiTokenErrorCode =
  | "NAME_REQUIRED"
  | "NAME_TOO_LONG"
  | "SCOPES_REQUIRED"
  | "SCOPE_INVALID"
  | "ADMIN_SCOPE_FORBIDDEN"
  | "EXPIRY_INVALID"
  | "TOO_MANY_TOKENS"
  | "TOKEN_NOT_FOUND"
  | "MEMBER_NOT_FOUND";

export class ApiTokenError extends Error {
  readonly code: ApiTokenErrorCode;

  constructor(message: string, code: ApiTokenErrorCode) {
    super(message);
    this.name = "ApiTokenError";
    this.code = code;
  }
}

export type ApiTokenStatus = "active" | "expired";

export type ApiTokenView = {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiTokenScope[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  status: ApiTokenStatus;
};

type ApiTokenRecord = {
  id: string;
  memberId: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
};

type MemberRecord = {
  id: string;
  role: "ADMIN" | "MEMBER";
  status: string;
  deletedAt: Date | null;
};

type AuditWrite = { data: Record<string, unknown> };

export type ApiTokenTransaction = {
  member: { findUnique: (args: unknown) => Promise<MemberRecord | null> };
  apiToken: {
    count: (args: unknown) => Promise<number>;
    create: (args: unknown) => Promise<ApiTokenRecord>;
    findFirst: (args: unknown) => Promise<ApiTokenRecord | null>;
    update: (args: unknown) => Promise<ApiTokenRecord>;
  };
  auditLog: { create: (args: AuditWrite) => Promise<unknown> };
};

export type ApiTokenDb = {
  $transaction: <T>(callback: (tx: ApiTokenTransaction) => Promise<T>) => Promise<T>;
  apiToken: { findMany: (args: unknown) => Promise<ApiTokenRecord[]> };
};

const tokenViewSelect = {
  id: true,
  memberId: true,
  name: true,
  tokenPrefix: true,
  scopes: true,
  createdAt: true,
  lastUsedAt: true,
  expiresAt: true,
  revokedAt: true,
} as const;

/** A fresh secret, its visible prefix and the hash that is the only thing stored. */
export function generateApiTokenSecret() {
  const token = `${API_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;

  return {
    token,
    prefix: token.slice(0, API_TOKEN_PREFIX.length + API_TOKEN_LIMITS.visibleSecretChars),
    hash: hashApiToken(token),
  };
}

/** SHA-256 is enough here: the secret is 256 random bits, so there is nothing to brute-force. */
export function hashApiToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function resolveApiTokenExpiry(option: string, now: Date): Date | null {
  if (!(API_TOKEN_EXPIRY_OPTIONS as readonly string[]).includes(option)) {
    throw new ApiTokenError("Token expiry is invalid.", "EXPIRY_INVALID");
  }

  if ((option as ApiTokenExpiryOption) === "never") return null;

  return new Date(now.getTime() + Number(option) * 24 * 60 * 60 * 1000);
}

export async function createApiToken(
  input: {
    memberId: string;
    name: string;
    scopes: readonly string[];
    expiry: string;
    requestMetadata?: ApiTokenRequestMetadata;
  },
  deps: { db?: ApiTokenDb; now?: Date; generate?: typeof generateApiTokenSecret } = {},
): Promise<{ token: string; apiToken: ApiTokenView }> {
  const db = deps.db ?? (prisma as unknown as ApiTokenDb);
  const now = deps.now ?? new Date();
  const name = input.name.trim().replace(/\s+/g, " ");

  if (!name) throw new ApiTokenError("Token name is required.", "NAME_REQUIRED");

  if (name.length > API_TOKEN_LIMITS.nameMaxLength) {
    throw new ApiTokenError("Token name is too long.", "NAME_TOO_LONG");
  }

  if (input.scopes.length === 0) {
    throw new ApiTokenError("Choose at least one scope.", "SCOPES_REQUIRED");
  }

  if (!input.scopes.every(isApiTokenScope)) {
    throw new ApiTokenError("Unknown token scope.", "SCOPE_INVALID");
  }

  const scopes = normalizeApiTokenScopes(input.scopes);
  const expiresAt = resolveApiTokenExpiry(input.expiry, now);
  const secret = (deps.generate ?? generateApiTokenSecret)();

  const record = await db.$transaction(async (tx) => {
    const member = await tx.member.findUnique({
      where: { id: input.memberId },
      select: { id: true, role: true, status: true, deletedAt: true },
    });

    if (!member || member.deletedAt || member.status !== "ACTIVE") {
      throw new ApiTokenError("Member not found.", "MEMBER_NOT_FOUND");
    }

    if (member.role !== "ADMIN" && scopes.some(isAdminApiTokenScope)) {
      throw new ApiTokenError("Only admins can grant admin scopes.", "ADMIN_SCOPE_FORBIDDEN");
    }

    const activeCount = await tx.apiToken.count({
      where: { memberId: member.id, ...liveTokenWhere(now) },
    });

    if (activeCount >= API_TOKEN_LIMITS.maxActivePerMember) {
      throw new ApiTokenError("Too many active tokens.", "TOO_MANY_TOKENS");
    }

    const created = await tx.apiToken.create({
      data: {
        memberId: member.id,
        name,
        tokenPrefix: secret.prefix,
        tokenHash: secret.hash,
        scopes,
        expiresAt,
      },
      select: tokenViewSelect,
    });

    await tx.auditLog.create({
      data: {
        actorMemberId: member.id,
        action: "api_token.created",
        targetType: "api_token",
        targetId: created.id,
        after: {
          name,
          prefix: secret.prefix,
          scopes,
          expiresAt: expiresAt?.toISOString() ?? null,
        },
        ...input.requestMetadata,
      },
    });

    return created;
  });

  return { token: secret.token, apiToken: toApiTokenView(record, now) };
}

/** The member's tokens that still mean something: live or expired, never revoked. */
export async function listApiTokens(
  input: { memberId: string; now?: Date },
  deps: { db?: ApiTokenDb } = {},
): Promise<ApiTokenView[]> {
  const db = deps.db ?? (prisma as unknown as ApiTokenDb);
  const now = input.now ?? new Date();

  const records = await db.apiToken.findMany({
    where: { memberId: input.memberId, revokedAt: null },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: tokenViewSelect,
  });

  return records.map((record) => toApiTokenView(record, now));
}

/** Scoped by owner: another member's token id is simply not found. */
export async function revokeApiToken(
  input: { memberId: string; tokenId: string; requestMetadata?: ApiTokenRequestMetadata },
  deps: { db?: ApiTokenDb; now?: Date } = {},
): Promise<ApiTokenView> {
  const db = deps.db ?? (prisma as unknown as ApiTokenDb);
  const now = deps.now ?? new Date();

  const revoked = await db.$transaction(async (tx) => {
    const token = await tx.apiToken.findFirst({
      where: { id: input.tokenId, memberId: input.memberId, revokedAt: null },
      select: tokenViewSelect,
    });

    if (!token) throw new ApiTokenError("Token not found.", "TOKEN_NOT_FOUND");

    const updated = await tx.apiToken.update({
      where: { id: token.id },
      data: { revokedAt: now },
      select: tokenViewSelect,
    });

    await tx.auditLog.create({
      data: {
        actorMemberId: input.memberId,
        action: "api_token.revoked",
        targetType: "api_token",
        targetId: token.id,
        before: { name: token.name, prefix: token.tokenPrefix, scopes: token.scopes },
        after: { revokedAt: now.toISOString() },
        ...input.requestMetadata,
      },
    });

    return updated;
  });

  return toApiTokenView(revoked, now);
}

export type ApiTokenRevocationWriter = {
  apiToken: {
    updateMany: (args: {
      where: { memberId: string; revokedAt: null };
      data: { revokedAt: Date };
    }) => Promise<{ count: number }>;
  };
};

/** Called on deactivation/deletion so a later reactivation does not revive old tokens. */
export async function revokeAllApiTokensForMember(
  input: { memberId: string; now?: Date },
  deps: { db?: ApiTokenRevocationWriter } = {},
) {
  const db = deps.db ?? (prisma as unknown as ApiTokenRevocationWriter);
  const result = await db.apiToken.updateMany({
    where: { memberId: input.memberId, revokedAt: null },
    data: { revokedAt: input.now ?? new Date() },
  });

  return result.count;
}

export function liveTokenWhere(now: Date) {
  return { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
}

function toApiTokenView(record: ApiTokenRecord, now: Date): ApiTokenView {
  return {
    id: record.id,
    name: record.name,
    prefix: record.tokenPrefix,
    scopes: normalizeApiTokenScopes(record.scopes),
    createdAt: record.createdAt.toISOString(),
    lastUsedAt: record.lastUsedAt?.toISOString() ?? null,
    expiresAt: record.expiresAt?.toISOString() ?? null,
    status: record.expiresAt && record.expiresAt <= now ? "expired" : "active",
  };
}
