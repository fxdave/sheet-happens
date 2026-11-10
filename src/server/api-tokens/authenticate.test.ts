import { describe, expect, it, vi } from "vitest";

import {
  ApiTokenAuthError,
  ApiTokenScopeError,
  authenticateApiToken,
  readBearerToken,
  recordApiTokenCrossMemberRead,
  requireApiTokenScope,
  type ApiTokenAuthDb,
} from "./authenticate";
import { hashApiToken } from "./tokens";

const NOW = new Date("2026-11-10T12:00:00.000Z");
const TOKEN = "sh_pat_0123456789abcdefghijklmnopqrstuvwxyzABCDE";

function tokenRecord(
  overrides: Record<string, unknown> = {},
  member: Record<string, unknown> = {},
) {
  return {
    id: "token-1",
    tokenPrefix: "sh_pat_01234567",
    scopes: ["hours:read", "hours:read:all"],
    expiresAt: null,
    revokedAt: null,
    lastUsedAt: new Date("2026-11-10T11:59:30.000Z"),
    ...overrides,
    member: {
      id: "member-1",
      displayName: "Ada Admin",
      role: "ADMIN",
      currentProfile: "EMPLOYEE",
      timezone: "Europe/Budapest",
      status: "ACTIVE",
      deletedAt: null,
      ...member,
    },
  };
}

function createDb(record: ReturnType<typeof tokenRecord> | null, claimed = 1) {
  const tx = {
    apiToken: { updateMany: vi.fn().mockResolvedValue({ count: claimed }) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  const db = {
    apiToken: {
      findUnique: vi.fn().mockResolvedValue(record),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn((callback: (t: typeof tx) => unknown) => callback(tx)),
  };

  return { db: db as unknown as ApiTokenAuthDb & typeof db, tx };
}

function authenticate(db: ApiTokenAuthDb, authorization: string | null = `Bearer ${TOKEN}`) {
  return authenticateApiToken(
    { authorization, ipAddress: "10.0.0.1", userAgent: "curl/8" },
    { db, now: NOW },
  );
}

describe("readBearerToken", () => {
  it.each([
    ["Bearer abc", "abc"],
    ["bearer   abc ", "abc"],
    ["Basic abc", null],
    ["Bearer", null],
    ["Bearer a b", null],
    [null, null],
  ])("%s → %s", (header, expected) => {
    expect(readBearerToken(header)).toBe(expected);
  });
});

describe("authenticateApiToken", () => {
  it("looks the token up by its hash and returns the live actor", async () => {
    const { db } = createDb(tokenRecord());

    const actor = await authenticate(db);

    expect(db.apiToken.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: hashApiToken(TOKEN) } }),
    );
    expect(actor.member.id).toBe("member-1");
    expect([...actor.scopes]).toEqual(["hours:read", "hours:read:all"]);
    expect(actor.requestMetadata).toEqual({
      ipAddress: "10.0.0.1",
      userAgent: "curl/8",
      channel: "API",
      clientId: "api_token:token-1",
    });
  });

  it.each([
    ["no header", null, "MISSING_TOKEN"],
    ["another scheme", `Basic ${TOKEN}`, "MISSING_TOKEN"],
    ["a non-PAT bearer", "Bearer eyJhbGciOi.jwt.token", "INVALID_TOKEN"],
  ])("refuses %s", async (_label, header, code) => {
    const { db } = createDb(tokenRecord());

    await expect(authenticate(db, header)).rejects.toMatchObject({ code });
    expect(db.apiToken.findUnique).not.toHaveBeenCalled();
  });

  it("refuses an unknown token", async () => {
    const { db } = createDb(null);

    await expect(authenticate(db)).rejects.toMatchObject({ code: "INVALID_TOKEN" });
  });

  it("refuses a revoked token", async () => {
    const { db } = createDb(tokenRecord({ revokedAt: new Date("2026-11-09T00:00:00.000Z") }));

    await expect(authenticate(db)).rejects.toMatchObject({ code: "REVOKED_TOKEN" });
  });

  it("refuses a token at its expiry instant", async () => {
    const { db } = createDb(tokenRecord({ expiresAt: NOW }));

    await expect(authenticate(db)).rejects.toMatchObject({ code: "EXPIRED_TOKEN" });
  });

  it("accepts a token before its expiry", async () => {
    const { db } = createDb(tokenRecord({ expiresAt: new Date("2026-11-10T12:00:01.000Z") }));

    await expect(authenticate(db)).resolves.toMatchObject({ tokenId: "token-1" });
  });

  it.each([
    ["inactive", { status: "INACTIVE" }],
    ["deleted", { status: "DELETED", deletedAt: new Date("2026-11-01T00:00:00.000Z") }],
    ["invited", { status: "INVITED" }],
  ])("refuses a token whose owner is %s", async (_label, member) => {
    const { db } = createDb(tokenRecord({}, member));

    await expect(authenticate(db)).rejects.toBeInstanceOf(ApiTokenAuthError);
    await expect(authenticate(db)).rejects.toMatchObject({ code: "INACTIVE_MEMBER" });
  });

  it("drops admin scopes the moment the owner is demoted", async () => {
    const { db } = createDb(tokenRecord({}, { role: "MEMBER" }));

    const actor = await authenticate(db);

    expect([...actor.scopes]).toEqual(["hours:read"]);
    expect(actor.grantedScopes).toEqual(["hours:read", "hours:read:all"]);
  });

  it("touches lastUsedAt at most once a minute and writes no audit inside the hour", async () => {
    const fresh = createDb(tokenRecord());
    await authenticate(fresh.db);
    expect(fresh.db.apiToken.updateMany).not.toHaveBeenCalled();
    expect(fresh.db.$transaction).not.toHaveBeenCalled();

    const stale = createDb(tokenRecord({ lastUsedAt: new Date("2026-11-10T11:58:00.000Z") }));
    await authenticate(stale.db);
    expect(stale.db.apiToken.updateMany).toHaveBeenCalledWith({
      where: { id: "token-1", lastUsedAt: { lte: new Date("2026-11-10T11:59:00.000Z") } },
      data: { lastUsedAt: NOW },
    });
    expect(stale.db.$transaction).not.toHaveBeenCalled();
  });

  it("audits the first use in an hour, once", async () => {
    const { db, tx } = createDb(tokenRecord({ lastUsedAt: null }));

    await authenticate(db);

    expect(tx.apiToken.updateMany).toHaveBeenCalledWith({
      where: {
        id: "token-1",
        OR: [{ lastUsedAt: null }, { lastUsedAt: { lte: new Date("2026-11-10T11:00:00.000Z") } }],
      },
      data: { lastUsedAt: NOW },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "api_token.used",
        targetId: "token-1",
        channel: "API",
        clientId: "api_token:token-1",
      }),
    });
  });

  it("skips the audit when a concurrent request already claimed the hour", async () => {
    const { db, tx } = createDb(tokenRecord({ lastUsedAt: null }), 0);

    await authenticate(db);

    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});

describe("requireApiTokenScope", () => {
  async function actorFor(role: "ADMIN" | "MEMBER", scopes: string[]) {
    const { db } = createDb(tokenRecord({ scopes }, { role }));

    return authenticate(db);
  }

  it("passes a held scope", async () => {
    const actor = await actorFor("MEMBER", ["hours:read"]);

    expect(() => requireApiTokenScope(actor, "hours:read")).not.toThrow();
  });

  it("refuses a scope the token was never given", async () => {
    const actor = await actorFor("ADMIN", ["hours:read"]);

    expect(() => requireApiTokenScope(actor, "timesheets:write")).toThrow(
      expect.objectContaining({ code: "INSUFFICIENT_SCOPE" }),
    );
    expect(() => requireApiTokenScope(actor, "hours:read:all")).toThrow(ApiTokenScopeError);
  });

  it("refuses a granted admin scope once the owner is no longer an admin", async () => {
    const actor = await actorFor("MEMBER", ["hours:read", "hours:read:all"]);

    expect(() => requireApiTokenScope(actor, "hours:read:all")).toThrow(
      expect.objectContaining({ code: "ADMIN_REQUIRED", scope: "hours:read:all" }),
    );
  });
});

describe("recordApiTokenCrossMemberRead", () => {
  it("audits every cross-member read with the filter", async () => {
    const { db } = createDb(tokenRecord());
    const actor = await authenticate(db);

    await recordApiTokenCrossMemberRead(
      actor,
      { memberIds: "all", from: "2026-11-01", to: "2026-11-10" },
      { db },
    );

    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "api_token.cross_member_read",
        targetType: "api_token",
        after: { memberIds: "all", from: "2026-11-01", to: "2026-11-10", projectId: null },
        channel: "API",
      }),
    });
  });
});
