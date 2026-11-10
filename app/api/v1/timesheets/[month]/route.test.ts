import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiTokenAuthError } from "@/src/server/api-tokens";
import { fakeApiTokenActor } from "@/src/server/rest-api/test-actor";
import { TimesheetPreviewError } from "@/src/server/timesheets";

const authenticateApiToken = vi.fn();
const getContractorTimesheetStatus = vi.fn();

vi.mock("@/src/server/api-tokens", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/server/api-tokens")>()),
  authenticateApiToken: (input: unknown) => authenticateApiToken(input),
  apiTokenRateLimit: { check: () => ({ allowed: true }), reset: () => {} },
}));

vi.mock("@/src/server/timesheets", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/server/timesheets")>()),
  getContractorTimesheetStatus: (input: unknown) => getContractorTimesheetStatus(input),
}));

const { GET } = await import("./route");

const approved = {
  month: "2026-09",
  status: "approved",
  revisionNumber: 1,
  submittedAt: "2026-10-01T08:00:00.000Z",
  approvedAt: "2026-10-03T08:00:00.000Z",
  rejectedAt: null,
  acceptedAt: null,
  paidAt: null,
  rejectionReason: null,
  totals: { source: "snapshot", minutes: 9150, amount: "9150.00", currencyCode: "EUR" },
  invoice: { status: "none", invoiceNumber: null, role: null, rejectionReason: null },
};

function get(month: string) {
  return GET(
    new Request(`http://localhost/api/v1/timesheets/${month}`, {
      headers: { Authorization: "Bearer sh_pat_test" },
    }),
    { params: Promise.resolve({ month }) },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  authenticateApiToken.mockResolvedValue(fakeApiTokenActor({ scopes: ["timesheets:read"] }));
  getContractorTimesheetStatus.mockResolvedValue(approved);
});

describe("GET /api/v1/timesheets/{month}", () => {
  it("returns the caller's own month", async () => {
    const response = await get("2026-09");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(approved);
    expect(getContractorTimesheetStatus).toHaveBeenCalledWith({
      memberId: "11111111-1111-4111-8111-111111111111",
      periodStart: new Date("2026-09-01T00:00:00.000Z"),
    });
  });

  it("answers 401 without a token", async () => {
    authenticateApiToken.mockRejectedValue(new ApiTokenAuthError("x", "MISSING_TOKEN"));

    expect((await get("2026-09")).status).toBe(401);
  });

  it("needs timesheets:read, which existing write tokens do not imply", async () => {
    authenticateApiToken.mockResolvedValue(
      fakeApiTokenActor({ scopes: ["hours:read", "timesheets:write"] }),
    );

    const response = await get("2026-09");

    expect(response.status).toBe(403);
    expect((await response.json()).error.details).toEqual({ requiredScope: "timesheets:read" });
  });

  it("tells an employee that timesheets are contractor-only", async () => {
    authenticateApiToken.mockResolvedValue(
      fakeApiTokenActor({ scopes: ["timesheets:read"], profile: "EMPLOYEE" }),
    );

    const response = await get("2026-09");

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("CONTRACTOR_REQUIRED");
    expect(getContractorTimesheetStatus).not.toHaveBeenCalled();
  });

  it("answers 400 for a bad month", async () => {
    expect((await get("2026-9")).status).toBe(400);
  });

  it("maps the domain's contractor refusal", async () => {
    getContractorTimesheetStatus.mockRejectedValue(
      new TimesheetPreviewError("Contractor profile required."),
    );

    expect((await get("2026-09")).status).toBe(403);
  });
});
