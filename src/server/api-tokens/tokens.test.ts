import { describe, expect, it, vi } from "vitest";

import { effectiveApiTokenScopes, normalizeApiTokenScopes } from "./scopes";
import {
  API_TOKEN_LIMITS,
  API_TOKEN_PREFIX,
  ApiTokenError,
  createApiToken,
  generateApiTokenSecret,
  hashApiToken,
  listApiTokens,
  resolveApiTokenExpiry,
  revokeAllApiTokensForMember,
  revokeApiToken,
  type ApiTokenDb,
} from "./tokens";

const NOW = new Date("2026-11-10T12:00:00.000Z");

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: "token-1",
    memberId: "member-1",
    name: "Invoice script",
    tokenPrefix: "sh_pat_AbCd1234",
    scopes: ["hours:read"],
    createdAt: new Date("2026-11-01T08:00:00.000Z"),
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    ...overrides,
  };
}

function createDb(
  options: {
    member?: Record<string, unknown> | null;
    activeCount?: number;
    existing?: Record<string, unknown> | null;
  } = {},
) {
  const tx = {
    member: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          options.member === undefined
            ? { id: "member-1", role: "MEMBER", status: "ACTIVE", deletedAt: null }
            : options.member,
        ),
    },
    apiToken: {
      count: vi.fn().mockResolvedValue(options.activeCount ?? 0),
      create: vi.fn(async (args: { data: Record<string, unknown> }) =>
        record({ ...args.data, tokenPrefix: args.data.tokenPrefix, createdAt: NOW }),
      ),
      findFirst: vi
        .fn()
        .mockResolvedValue(options.existing === undefined ? record() : options.existing),
      update: vi.fn(async () => record({ revokedAt: NOW })),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  const db = {
    $transaction: vi.fn((callback: (t: typeof tx) => unknown) => callback(tx)),
    apiToken: { findMany: vi.fn().mockResolvedValue([]) },
  };

  return { db: db as unknown as ApiTokenDb & typeof db, tx };
}

describe("token secrets", () => {
  it("generates a prefixed 256-bit secret whose hash is the only stored form", () => {
    const secret = generateApiTokenSecret();

    expect(secret.token.startsWith(API_TOKEN_PREFIX)).toBe(true);
    expect(secret.token.length).toBe(API_TOKEN_PREFIX.length + 43);
    expect(secret.prefix).toBe(
      secret.token.slice(0, API_TOKEN_PREFIX.length + API_TOKEN_LIMITS.visibleSecretChars),
    );
    expect(secret.hash).toBe(hashApiToken(secret.token));
    expect(secret.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(secret.hash).not.toContain(secret.token.slice(API_TOKEN_PREFIX.length));
  });

  it("never generates the same token twice", () => {
    expect(generateApiTokenSecret().token).not.toBe(generateApiTokenSecret().token);
  });
});

describe("resolveApiTokenExpiry", () => {
  it.each([
    ["30", "2026-12-10T12:00:00.000Z"],
    ["90", "2027-02-08T12:00:00.000Z"],
    ["365", "2027-11-10T12:00:00.000Z"],
  ])("adds %s days", (option, expected) => {
    expect(resolveApiTokenExpiry(option, NOW)?.toISOString()).toBe(expected);
  });

  it("allows no expiry", () => {
    expect(resolveApiTokenExpiry("never", NOW)).toBeNull();
  });

  it("refuses anything else", () => {
    expect(() => resolveApiTokenExpiry("7", NOW)).toThrow(ApiTokenError);
  });
});

describe("scopes", () => {
  it("keeps canonical order and drops unknown stored values", () => {
    expect(normalizeApiTokenScopes(["hours:read:all", "admin:write", "hours:read"])).toEqual([
      "hours:read",
      "hours:read:all",
    ]);
  });

  it("drops admin scopes for a member who is not an admin any more", () => {
    expect([...effectiveApiTokenScopes(["hours:read", "hours:read:all"], "MEMBER")]).toEqual([
      "hours:read",
    ]);
    expect([...effectiveApiTokenScopes(["hours:read", "hours:read:all"], "ADMIN")]).toEqual([
      "hours:read",
      "hours:read:all",
    ]);
  });
});

describe("createApiToken", () => {
  const generate = () => ({
    token: "sh_pat_secretsecret",
    prefix: "sh_pat_secretse",
    hash: "hash-1",
  });

  it("stores the hash and prefix, audits, and returns the plaintext once", async () => {
    const { db, tx } = createDb();

    const result = await createApiToken(
      {
        memberId: "member-1",
        name: "  Invoice   script ",
        scopes: ["timesheets:write", "hours:read"],
        expiry: "30",
        requestMetadata: { ipAddress: "10.0.0.1", userAgent: "vitest" },
      },
      { db, now: NOW, generate },
    );

    expect(result.token).toBe("sh_pat_secretsecret");
    expect(tx.apiToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          memberId: "member-1",
          name: "Invoice script",
          tokenPrefix: "sh_pat_secretse",
          tokenHash: "hash-1",
          scopes: ["hours:read", "timesheets:write"],
          expiresAt: new Date("2026-12-10T12:00:00.000Z"),
        },
      }),
    );
    const created = JSON.stringify(tx.apiToken.create.mock.calls[0]);
    expect(created).not.toContain("sh_pat_secretsecret");
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "api_token.created",
        targetType: "api_token",
        ipAddress: "10.0.0.1",
        after: expect.objectContaining({ prefix: "sh_pat_secretse" }),
      }),
    });
    expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toContain("sh_pat_secretsecret");
    expect(result.apiToken.status).toBe("active");
  });

  it("refuses an admin scope for a non-admin", async () => {
    const { db, tx } = createDb();

    await expect(
      createApiToken(
        { memberId: "member-1", name: "x", scopes: ["hours:read:all"], expiry: "never" },
        { db, now: NOW, generate },
      ),
    ).rejects.toMatchObject({ code: "ADMIN_SCOPE_FORBIDDEN" });
    expect(tx.apiToken.create).not.toHaveBeenCalled();
  });

  it("allows an admin scope for an admin", async () => {
    const { db, tx } = createDb({
      member: { id: "member-1", role: "ADMIN", status: "ACTIVE", deletedAt: null },
    });

    await createApiToken(
      { memberId: "member-1", name: "x", scopes: ["hours:read:all"], expiry: "never" },
      { db, now: NOW, generate },
    );

    expect(tx.apiToken.create).toHaveBeenCalled();
  });

  it.each([
    [{ name: " ", scopes: ["hours:read"], expiry: "30" }, "NAME_REQUIRED"],
    [{ name: "x".repeat(81), scopes: ["hours:read"], expiry: "30" }, "NAME_TOO_LONG"],
    [{ name: "x", scopes: [], expiry: "30" }, "SCOPES_REQUIRED"],
    [{ name: "x", scopes: ["admin:write"], expiry: "30" }, "SCOPE_INVALID"],
    [{ name: "x", scopes: ["hours:read"], expiry: "14" }, "EXPIRY_INVALID"],
  ])("validates %o", async (input, code) => {
    const { db } = createDb();

    await expect(
      createApiToken({ memberId: "member-1", ...input }, { db, now: NOW, generate }),
    ).rejects.toMatchObject({ code });
  });

  it("refuses an inactive member", async () => {
    const { db } = createDb({
      member: { id: "member-1", role: "MEMBER", status: "INACTIVE", deletedAt: null },
    });

    await expect(
      createApiToken(
        { memberId: "member-1", name: "x", scopes: ["hours:read"], expiry: "30" },
        { db, now: NOW, generate },
      ),
    ).rejects.toMatchObject({ code: "MEMBER_NOT_FOUND" });
  });

  it("caps live tokens per member", async () => {
    const { db } = createDb({ activeCount: API_TOKEN_LIMITS.maxActivePerMember });

    await expect(
      createApiToken(
        { memberId: "member-1", name: "x", scopes: ["hours:read"], expiry: "30" },
        { db, now: NOW, generate },
      ),
    ).rejects.toMatchObject({ code: "TOO_MANY_TOKENS" });
  });
});

describe("listApiTokens", () => {
  it("lists unrevoked tokens and marks expired ones", async () => {
    const { db } = createDb();
    db.apiToken.findMany.mockResolvedValue([
      record({ id: "a", expiresAt: new Date("2026-11-09T00:00:00.000Z") }),
      record({ id: "b", expiresAt: new Date("2026-12-01T00:00:00.000Z") }),
    ]);

    const tokens = await listApiTokens({ memberId: "member-1", now: NOW }, { db });

    expect(db.apiToken.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { memberId: "member-1", revokedAt: null } }),
    );
    expect(tokens.map((token) => [token.id, token.status])).toEqual([
      ["a", "expired"],
      ["b", "active"],
    ]);
  });
});

describe("revokeApiToken", () => {
  it("revokes only the owner's live token and audits it", async () => {
    const { db, tx } = createDb();

    await revokeApiToken({ memberId: "member-1", tokenId: "token-1" }, { db, now: NOW });

    expect(tx.apiToken.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "token-1", memberId: "member-1", revokedAt: null } }),
    );
    expect(tx.apiToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "token-1" }, data: { revokedAt: NOW } }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "api_token.revoked", targetId: "token-1" }),
    });
  });

  it("reports another member's or an already revoked token as not found", async () => {
    const { db, tx } = createDb({ existing: null });

    await expect(
      revokeApiToken({ memberId: "member-2", tokenId: "token-1" }, { db, now: NOW }),
    ).rejects.toMatchObject({ code: "TOKEN_NOT_FOUND" });
    expect(tx.apiToken.update).not.toHaveBeenCalled();
  });
});

describe("revokeAllApiTokensForMember", () => {
  it("revokes every live token of the member", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 3 });

    await expect(
      revokeAllApiTokensForMember(
        { memberId: "member-1", now: NOW },
        { db: { apiToken: { updateMany } } },
      ),
    ).resolves.toBe(3);
    expect(updateMany).toHaveBeenCalledWith({
      where: { memberId: "member-1", revokedAt: null },
      data: { revokedAt: NOW },
    });
  });
});
