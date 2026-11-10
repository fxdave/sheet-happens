import fs from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ApiTokenAuthError, ApiTokenScopeError } from "@/src/server/api-tokens";
import { ContractorInvoiceUploadError } from "@/src/server/invoices";
import { ObjectStorageConfigurationError } from "@/src/server/storage";
import { TimeTrackingError } from "@/src/server/time-tracking";
import { TimesheetSubmissionError } from "@/src/server/timesheets";

import {
  INVOICE_UPLOAD_ERRORS,
  RestApiError,
  restErrorResponse,
  TIMESHEET_SUBMISSION_ERRORS,
  toRestApiError,
  validationError,
} from "./errors";

function source(relative: string) {
  return fs.readFileSync(path.resolve(__dirname, "..", relative), "utf8");
}

describe("domain message tables", () => {
  // A reworded domain sentence would otherwise degrade silently to a 500.
  it.each(Object.keys(TIMESHEET_SUBMISSION_ERRORS))("submission: %s still exists", (message) => {
    expect(source("timesheets/submit-timesheet.ts")).toContain(JSON.stringify(message));
  });

  it.each(Object.keys(INVOICE_UPLOAD_ERRORS))("invoice: %s still exists", (message) => {
    expect(source("invoices/contractor-invoices.ts")).toContain(JSON.stringify(message));
  });
});

describe("toRestApiError", () => {
  it.each([
    ["MISSING_TOKEN", "UNAUTHORIZED"],
    ["INVALID_TOKEN", "INVALID_TOKEN"],
    ["EXPIRED_TOKEN", "TOKEN_EXPIRED"],
    ["REVOKED_TOKEN", "TOKEN_REVOKED"],
    ["INACTIVE_MEMBER", "INVALID_TOKEN"],
  ] as const)("maps %s to a 401 %s with a bearer challenge", (domainCode, code) => {
    const error = toRestApiError(new ApiTokenAuthError("x", domainCode), "test");

    expect(error).toMatchObject({ status: 401, code });
    expect(error.headers["WWW-Authenticate"]).toMatch(/^Bearer realm="sheet-happens"/);
  });

  it("maps a scope failure to 403 with insufficient_scope", () => {
    const error = toRestApiError(
      new ApiTokenScopeError("x", "INSUFFICIENT_SCOPE", "timesheets:write"),
      "test",
    );

    expect(error).toMatchObject({
      status: 403,
      code: "INSUFFICIENT_SCOPE",
      details: { requiredScope: "timesheets:write" },
    });
    expect(error.headers["WWW-Authenticate"]).toContain('error="insufficient_scope"');
  });

  it("maps submission refusals to conflicts and unprocessable months", () => {
    expect(
      toRestApiError(
        new TimesheetSubmissionError("This month is not open for submission."),
        "test",
      ),
    ).toMatchObject({ status: 409, code: "MONTH_NOT_OPEN" });
    expect(
      toRestApiError(
        new TimesheetSubmissionError("Declared hours are missing their proof.", ["Atlas"]),
        "test",
      ),
    ).toMatchObject({ status: 422, details: { projects: ["Atlas"] } });
  });

  it("maps invoice errors with the offending field", () => {
    expect(
      toRestApiError(new ContractorInvoiceUploadError("Invoice PDF is too large."), "test"),
    ).toMatchObject({ status: 413, code: "PAYLOAD_TOO_LARGE" });
    expect(
      toRestApiError(
        new ContractorInvoiceUploadError(
          "Invoice currency must match the approved timesheet currency.",
        ),
        "test",
      ),
    ).toMatchObject({ status: 400, details: { fields: { currencyCode: [expect.any(String)] } } });
  });

  it("maps a bad cursor and a missing member", () => {
    expect(toRestApiError(new TimeTrackingError("bad", "INVALID_CURSOR"), "test")).toMatchObject({
      status: 400,
      code: "CURSOR_INVALID",
    });
    expect(
      toRestApiError(new TimeTrackingError("Member not found.", "MEMBER_NOT_FOUND"), "test"),
    ).toMatchObject({ status: 404, code: "NOT_FOUND" });
  });

  it("maps missing storage to 503", () => {
    expect(toRestApiError(new ObjectStorageConfigurationError("no s3"), "test")).toMatchObject({
      status: 503,
      code: "STORAGE_UNAVAILABLE",
    });
  });

  it("logs and hides anything unexpected", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const error = toRestApiError(new Error("SELECT * FROM secrets"), "[test]");

    expect(error).toMatchObject({ status: 500, code: "INTERNAL" });
    expect(error.message).not.toContain("secrets");
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe("responses", () => {
  it("renders the error envelope without caching", async () => {
    const response = restErrorResponse(new RestApiError(409, "MONTH_LOCKED", "Locked."));

    expect(response.status).toBe(409);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: { code: "MONTH_LOCKED", message: "Locked." },
    });
  });

  it("lists Zod issues per field", () => {
    const parsed = z.object({ from: z.string(), limit: z.number() }).safeParse({ limit: "x" });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(validationError(parsed.error).details).toEqual({
      fields: { from: [expect.any(String)], limit: [expect.any(String)] },
    });
  });
});
