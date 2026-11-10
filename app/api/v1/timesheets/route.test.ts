import { beforeEach, describe, expect, it, vi } from "vitest";

import { fakeApiTokenActor } from "@/src/server/rest-api/test-actor";

const authenticateApiToken = vi.fn();
const listContractorTimesheetStatuses = vi.fn();

vi.mock("@/src/server/api-tokens", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/server/api-tokens")>()),
  authenticateApiToken: (input: unknown) => authenticateApiToken(input),
  apiTokenRateLimit: { check: () => ({ allowed: true }), reset: () => {} },
}));

vi.mock("@/src/server/timesheets", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/server/timesheets")>()),
  listContractorTimesheetStatuses: (input: unknown) => listContractorTimesheetStatuses(input),
}));

const { GET } = await import("./route");

function get(query = "") {
  return GET(
    new Request(`http://localhost/api/v1/timesheets${query}`, {
      headers: { Authorization: "Bearer sh_pat_test" },
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  authenticateApiToken.mockResolvedValue(fakeApiTokenActor({ scopes: ["timesheets:read"] }));
  listContractorTimesheetStatuses.mockResolvedValue([
    { month: "2026-12", status: "not_submitted" },
  ]);
});

describe("GET /api/v1/timesheets", () => {
  it("lists the requested year", async () => {
    const response = await get("?year=2025");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      year: 2025,
      months: [{ month: "2026-12", status: "not_submitted" }],
    });
    expect(listContractorTimesheetStatuses).toHaveBeenCalledWith({
      memberId: "11111111-1111-4111-8111-111111111111",
      year: 2025,
    });
  });

  it("defaults to the current year in the member's timezone", async () => {
    vi.useFakeTimers({ now: new Date("2026-12-31T23:30:00.000Z"), toFake: ["Date"] });

    await get();

    // 00:30 on 1 January in Budapest.
    expect(listContractorTimesheetStatuses).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2027 }),
    );
    vi.useRealTimers();
  });

  it.each(["?year=26", "?year=abc", "?year=1999"])("answers 400 for %s", async (query) => {
    const response = await get(query);

    expect(response.status).toBe(400);
    expect((await response.json()).error.details.fields).toHaveProperty("year");
  });

  it("needs timesheets:read", async () => {
    authenticateApiToken.mockResolvedValue(fakeApiTokenActor({ scopes: ["timesheets:write"] }));

    expect((await get()).status).toBe(403);
  });

  it("tells an employee that timesheets are contractor-only", async () => {
    authenticateApiToken.mockResolvedValue(
      fakeApiTokenActor({ scopes: ["timesheets:read"], profile: "EMPLOYEE" }),
    );

    const response = await get();

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("CONTRACTOR_REQUIRED");
  });
});
