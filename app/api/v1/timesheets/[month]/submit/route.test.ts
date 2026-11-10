import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiTokenAuthError } from "@/src/server/api-tokens";
import { fakeApiTokenActor } from "@/src/server/rest-api/test-actor";
import { TimesheetSubmissionError } from "@/src/server/timesheets";

const authenticateApiToken = vi.fn();
const submitContractorTimesheet = vi.fn();
const getContractorTimesheetStatus = vi.fn();

vi.mock("@/src/server/api-tokens", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/server/api-tokens")>()),
  authenticateApiToken: (input: unknown) => authenticateApiToken(input),
  apiTokenRateLimit: { check: () => ({ allowed: true }), reset: () => {} },
}));

vi.mock("@/src/server/timesheets", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/server/timesheets")>()),
  submitContractorTimesheet: (input: unknown) => submitContractorTimesheet(input),
  getContractorTimesheetStatus: (input: unknown) => getContractorTimesheetStatus(input),
}));

const { POST } = await import("./route");

const STATUS_AFTER = "submitted";

function submit(month: string) {
  return POST(
    new Request(`http://localhost/api/v1/timesheets/${month}/submit`, {
      method: "POST",
      headers: { Authorization: "Bearer sh_pat_test" },
    }),
    { params: Promise.resolve({ month }) },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getContractorTimesheetStatus.mockImplementation(async (input: { periodStart: Date }) => ({
    month: input.periodStart.toISOString().slice(0, 7),
    status: STATUS_AFTER,
  }));
  authenticateApiToken.mockResolvedValue(fakeApiTokenActor());
  submitContractorTimesheet.mockResolvedValue({
    timesheetId: "timesheet-1",
    revisionId: "revision-1",
    revisionNumber: 1,
    entryCount: 12,
    totalMinutes: 4800,
    totalAmount: "4000.00",
    currencyCode: "EUR",
  });
});

describe("POST /api/v1/timesheets/{month}/submit", () => {
  it("submits the caller's own month through the domain function the UI uses", async () => {
    const response = await submit("2026-06");

    expect(response.status).toBe(201);
    expect(submitContractorTimesheet).toHaveBeenCalledWith({
      memberId: "11111111-1111-4111-8111-111111111111",
      actorMemberId: "11111111-1111-4111-8111-111111111111",
      periodStart: new Date("2026-06-01T00:00:00.000Z"),
      requestMetadata: {
        ipAddress: "10.0.0.1",
        userAgent: "vitest",
        channel: "API",
        clientId: "api_token:token-1",
      },
    });
    await expect(response.json()).resolves.toEqual({
      month: "2026-06",
      status: "SUBMITTED",
      timesheetId: "timesheet-1",
      revisionId: "revision-1",
      revisionNumber: 1,
      entryCount: 12,
      totalMinutes: 4800,
      totalAmount: "4000.00",
      currencyCode: "EUR",
      timesheet: { month: "2026-06", status: "submitted" },
    });
    expect(getContractorTimesheetStatus).toHaveBeenCalledWith({
      memberId: "11111111-1111-4111-8111-111111111111",
      periodStart: new Date("2026-06-01T00:00:00.000Z"),
    });
  });

  it("answers 401 without a valid token", async () => {
    authenticateApiToken.mockRejectedValue(
      new ApiTokenAuthError("Token has been revoked.", "REVOKED_TOKEN"),
    );

    const response = await submit("2026-06");

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("TOKEN_REVOKED");
  });

  it("needs timesheets:write", async () => {
    authenticateApiToken.mockResolvedValue(fakeApiTokenActor({ scopes: ["hours:read"] }));

    const response = await submit("2026-06");

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("INSUFFICIENT_SCOPE");
    expect(submitContractorTimesheet).not.toHaveBeenCalled();
  });

  it("tells an employee that timesheets are contractor-only", async () => {
    authenticateApiToken.mockResolvedValue(fakeApiTokenActor({ profile: "EMPLOYEE" }));

    const response = await submit("2026-06");

    expect(response.status).toBe(403);
    expect((await response.json()).error).toMatchObject({
      code: "CONTRACTOR_REQUIRED",
      message: expect.stringContaining("contractor-only"),
    });
    expect(submitContractorTimesheet).not.toHaveBeenCalled();
  });

  it.each(["2026-6", "2026-13", "june", "2026-06-01"])(
    "answers 400 for month %s",
    async (month) => {
      const response = await submit(month);

      expect(response.status).toBe(400);
      expect((await response.json()).error.details.fields).toHaveProperty("month");
    },
  );

  it.each([
    ["This month is already locked by a submitted timesheet.", 409, "MONTH_LOCKED"],
    ["This month is not open for submission.", 409, "MONTH_NOT_OPEN"],
    [
      "Timesheet source entries changed during submission. Try again.",
      409,
      "TIMESHEET_ENTRIES_CHANGED",
    ],
    ["No time entries exist for this month.", 422, "TIMESHEET_NOT_SUBMITTABLE"],
    ["Missing rates for one or more entries.", 422, "TIMESHEET_NOT_SUBMITTABLE"],
  ])("maps %s", async (message, status, code) => {
    submitContractorTimesheet.mockRejectedValue(new TimesheetSubmissionError(message));

    const response = await submit("2026-10");

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ error: { code, message } });
  });

  it("names the projects a missing proof is about", async () => {
    submitContractorTimesheet.mockRejectedValue(
      new TimesheetSubmissionError("Declared hours are missing their proof.", ["Atlas"]),
    );

    const response = await submit("2026-10");

    expect(response.status).toBe(422);
    expect((await response.json()).error.details).toEqual({ projects: ["Atlas"] });
  });
});
