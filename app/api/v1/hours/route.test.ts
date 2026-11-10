import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiTokenAuthError } from "@/src/server/api-tokens";
import { fakeApiTokenActor } from "@/src/server/rest-api/test-actor";
import { TimeTrackingError } from "@/src/server/time-tracking";

const authenticateApiToken = vi.fn();
const recordApiTokenCrossMemberRead = vi.fn();
const rateLimitCheck = vi.fn();
const listMemberTimeEntries = vi.fn();
const listTimeEntriesAcrossMembers = vi.fn();
const sumTimeEntries = vi.fn();

// Token lookup and the database reads are mocked; scope checks, validation and error mapping are real.
vi.mock("@/src/server/api-tokens", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/server/api-tokens")>()),
  authenticateApiToken: (input: unknown) => authenticateApiToken(input),
  recordApiTokenCrossMemberRead: (...args: unknown[]) => recordApiTokenCrossMemberRead(...args),
  apiTokenRateLimit: { check: (key: string) => rateLimitCheck(key), reset: () => {} },
}));

vi.mock("@/src/server/time-tracking", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/server/time-tracking")>()),
  listMemberTimeEntries: (input: unknown) => listMemberTimeEntries(input),
  listTimeEntriesAcrossMembers: (input: unknown) => listTimeEntriesAcrossMembers(input),
  sumTimeEntries: (input: unknown) => sumTimeEntries(input),
}));

const { GET } = await import("./route");

const OWN_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";

function get(query: string, token = "sh_pat_test") {
  return GET(
    new Request(`http://localhost/api/v1/hours?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  );
}

const entry = {
  id: "entry-1",
  date: "2026-11-03",
  projectId: "project-1",
  projectName: "Atlas",
  durationMinutes: 90,
  startTime: null,
  endTime: null,
  description: "Review",
  source: "GRID",
  locked: false,
  updatedAt: "2026-11-03T10:00:00.000Z",
};

const page = {
  range: { from: "2026-11-01", to: "2026-11-10" },
  entries: [entry],
  totals: { minutes: 90, entryCount: 1 },
  nextCursor: "next",
};

beforeEach(() => {
  vi.clearAllMocks();
  authenticateApiToken.mockResolvedValue(fakeApiTokenActor());
  rateLimitCheck.mockReturnValue({ allowed: true });
  listMemberTimeEntries.mockResolvedValue(page);
  listTimeEntriesAcrossMembers.mockResolvedValue({
    ...page,
    entries: [{ ...entry, memberId: OTHER_ID, memberName: "Bo" }],
  });
  sumTimeEntries.mockResolvedValue({ minutes: 600, entryCount: 7 });
});

describe("GET /api/v1/hours — auth", () => {
  it("answers 401 with a bearer challenge when no token is sent", async () => {
    authenticateApiToken.mockRejectedValue(
      new ApiTokenAuthError("Missing bearer token.", "MISSING_TOKEN"),
    );

    const response = await GET(
      new Request("http://localhost/api/v1/hours?from=2026-11-01&to=2026-11-10"),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe('Bearer realm="sheet-happens"');
    await expect(response.json()).resolves.toEqual({
      error: { code: "UNAUTHORIZED", message: "Missing bearer token." },
    });
    expect(authenticateApiToken).toHaveBeenCalledWith(
      expect.objectContaining({ authorization: null }),
    );
  });

  it("ignores a session cookie: only the Authorization header is read", async () => {
    authenticateApiToken.mockRejectedValue(
      new ApiTokenAuthError("Missing bearer token.", "MISSING_TOKEN"),
    );

    const response = await GET(
      new Request("http://localhost/api/v1/hours?from=2026-11-01&to=2026-11-10", {
        headers: { Cookie: "better-auth.session_token=abc" },
      }),
    );

    expect(response.status).toBe(401);
    expect(authenticateApiToken).toHaveBeenCalledWith(
      expect.objectContaining({ authorization: null }),
    );
  });

  it.each([
    ["EXPIRED_TOKEN", "TOKEN_EXPIRED"],
    ["REVOKED_TOKEN", "TOKEN_REVOKED"],
    ["INVALID_TOKEN", "INVALID_TOKEN"],
    ["INACTIVE_MEMBER", "INVALID_TOKEN"],
  ] as const)("maps %s to 401 %s", async (domainCode, code) => {
    authenticateApiToken.mockRejectedValue(new ApiTokenAuthError("nope", domainCode));

    const response = await get("from=2026-11-01&to=2026-11-10");

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe(code);
  });

  it("answers 429 with Retry-After over the per-token limit", async () => {
    rateLimitCheck.mockReturnValue({ allowed: false, retryAfterSeconds: 12 });

    const response = await get("from=2026-11-01&to=2026-11-10");

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("12");
    expect(rateLimitCheck).toHaveBeenCalledWith("token-1");
    expect(listMemberTimeEntries).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/hours — own hours", () => {
  it("returns the caller's entries with page and range totals", async () => {
    const response = await get("from=2026-11-01&to=2026-11-10&limit=50&cursor=abc");

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(listMemberTimeEntries).toHaveBeenCalledWith({
      memberId: OWN_ID,
      from: new Date("2026-11-01T00:00:00.000Z"),
      to: new Date("2026-11-10T00:00:00.000Z"),
      includeDeclared: false,
      cursor: "abc",
      limit: 50,
    });
    await expect(response.json()).resolves.toEqual({
      range: page.range,
      entries: [{ ...entry, memberId: OWN_ID, memberName: "Casey Contractor" }],
      totals: { page: page.totals, range: { minutes: 600, entryCount: 7 } },
      nextCursor: "next",
    });
    expect(recordApiTokenCrossMemberRead).not.toHaveBeenCalled();
  });

  it("treats memberId equal to the caller as an own read", async () => {
    const response = await get(`from=2026-11-01&to=2026-11-10&memberId=${OWN_ID}`);

    expect(response.status).toBe(200);
    expect(listTimeEntriesAcrossMembers).not.toHaveBeenCalled();
  });

  it("needs hours:read", async () => {
    authenticateApiToken.mockResolvedValue(fakeApiTokenActor({ scopes: ["timesheets:write"] }));

    const response = await get("from=2026-11-01&to=2026-11-10");

    expect(response.status).toBe(403);
    expect(response.headers.get("WWW-Authenticate")).toContain('scope="hours:read"');
    expect((await response.json()).error).toMatchObject({
      code: "INSUFFICIENT_SCOPE",
      details: { requiredScope: "hours:read" },
    });
  });
});

describe("GET /api/v1/hours — other members", () => {
  it("refuses a member token without hours:read:all", async () => {
    const response = await get(`from=2026-11-01&to=2026-11-10&memberId=${OTHER_ID}`);

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("INSUFFICIENT_SCOPE");
    expect(listTimeEntriesAcrossMembers).not.toHaveBeenCalled();
  });

  it("refuses a demoted admin's token that still carries hours:read:all", async () => {
    authenticateApiToken.mockResolvedValue(
      fakeApiTokenActor({ role: "MEMBER", scopes: ["hours:read", "hours:read:all"] }),
    );

    const response = await get("from=2026-11-01&to=2026-11-10&memberId=all");

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("ADMIN_REQUIRED");
  });

  it("lets an admin read several members and audits it", async () => {
    authenticateApiToken.mockResolvedValue(
      fakeApiTokenActor({ role: "ADMIN", scopes: ["hours:read:all"] }),
    );

    const response = await get(
      `from=2026-11-01&to=2026-11-10&memberId=${OTHER_ID},${OWN_ID}&memberId=${OTHER_ID}`,
    );

    expect(response.status).toBe(200);
    expect(listTimeEntriesAcrossMembers).toHaveBeenCalledWith(
      expect.objectContaining({ members: [OTHER_ID, OWN_ID] }),
    );
    expect(sumTimeEntries).toHaveBeenCalledWith(
      expect.objectContaining({ members: [OTHER_ID, OWN_ID] }),
    );
    expect(recordApiTokenCrossMemberRead).toHaveBeenCalledWith(
      expect.objectContaining({ tokenId: "token-1" }),
      { memberIds: [OTHER_ID, OWN_ID], from: "2026-11-01", to: "2026-11-10" },
    );
    const body = await response.json();
    expect(body.entries[0]).toMatchObject({ memberId: OTHER_ID, memberName: "Bo" });
  });

  it("lets an admin read everyone", async () => {
    authenticateApiToken.mockResolvedValue(
      fakeApiTokenActor({ role: "ADMIN", scopes: ["hours:read:all"] }),
    );

    expect((await get("from=2026-11-01&to=2026-11-10&memberId=all")).status).toBe(200);
    expect(listTimeEntriesAcrossMembers).toHaveBeenCalledWith(
      expect.objectContaining({ members: "all" }),
    );
  });

  it("maps an unknown member to 404", async () => {
    authenticateApiToken.mockResolvedValue(
      fakeApiTokenActor({ role: "ADMIN", scopes: ["hours:read:all"] }),
    );
    listTimeEntriesAcrossMembers.mockRejectedValue(
      new TimeTrackingError("Member not found.", "MEMBER_NOT_FOUND"),
    );

    const response = await get(`from=2026-11-01&to=2026-11-10&memberId=${OTHER_ID}`);

    expect(response.status).toBe(404);
    expect(recordApiTokenCrossMemberRead).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/hours — validation", () => {
  it.each([
    ["missing range", "", ["from", "to"]],
    ["bad date", "from=2026-11&to=2026-11-10", ["from"]],
    ["reversed range", "from=2026-11-10&to=2026-11-01", ["to"]],
    ["bad member id", "from=2026-11-01&to=2026-11-10&memberId=bob", ["memberId.0"]],
    ["all mixed with ids", `from=2026-11-01&to=2026-11-10&memberId=all,${OTHER_ID}`, ["memberId"]],
    ["limit too large", "from=2026-11-01&to=2026-11-10&limit=500", ["limit"]],
    ["bad project id", "from=2026-11-01&to=2026-11-10&projectId=x", ["projectId"]],
  ])("answers 400 for %s", async (_label, query, fields) => {
    const response = await get(query);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
    expect(Object.keys(body.error.details.fields)).toEqual(expect.arrayContaining(fields));
  });

  it("answers 400 RANGE_TOO_LARGE past 92 days", async () => {
    const response = await get("from=2026-01-01&to=2026-04-03");

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatchObject({
      code: "RANGE_TOO_LARGE",
      details: { requestedDays: 93, maxDays: 92 },
    });
  });

  it("maps a corrupted cursor to 400 CURSOR_INVALID", async () => {
    listMemberTimeEntries.mockRejectedValue(
      new TimeTrackingError("The page cursor is invalid.", "INVALID_CURSOR"),
    );

    const response = await get("from=2026-11-01&to=2026-11-10&cursor=zzz");

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("CURSOR_INVALID");
  });
});
