import type { z } from "zod";

import { ApiTokenAuthError, ApiTokenScopeError } from "@/src/server/api-tokens";
import { Prisma } from "@/src/server/db/generated/client";
import { ContractorInvoiceUploadError } from "@/src/server/invoices";
import { ObjectStorageConfigurationError } from "@/src/server/storage";
import { TimeTrackingDateError, TimeTrackingError } from "@/src/server/time-tracking";
import { TimesheetSubmissionError } from "@/src/server/timesheets";

/**
 * The REST API's wire errors. English and stable — a client branches on `code`, so renaming one is
 * a breaking change and adding one is not.
 */
export type RestErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "TOKEN_REVOKED"
  | "INSUFFICIENT_SCOPE"
  | "ADMIN_REQUIRED"
  | "CONTRACTOR_REQUIRED"
  | "VALIDATION"
  | "RANGE_TOO_LARGE"
  | "CURSOR_INVALID"
  | "NOT_FOUND"
  | "MONTH_LOCKED"
  | "MONTH_NOT_OPEN"
  | "TIMESHEET_ENTRIES_CHANGED"
  | "TIMESHEET_NOT_SUBMITTABLE"
  | "TIMESHEET_NOT_APPROVED"
  | "INVOICE_ALREADY_UPLOADED"
  | "INVOICE_STEP_MISMATCH"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "RATE_LIMITED"
  | "STORAGE_UNAVAILABLE"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL";

export type RestErrorBody = {
  error: { code: RestErrorCode; message: string; details?: Record<string, unknown> };
};

export class RestApiError extends Error {
  readonly status: number;
  readonly code: RestErrorCode;
  readonly details?: Record<string, unknown>;
  readonly headers: Record<string, string>;

  constructor(
    status: number,
    code: RestErrorCode,
    message: string,
    options: { details?: Record<string, unknown>; headers?: Record<string, string> } = {},
  ) {
    super(message);
    this.name = "RestApiError";
    this.status = status;
    this.code = code;
    this.details = options.details;
    this.headers = options.headers ?? {};
  }
}

export const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

export function restErrorResponse(error: RestApiError) {
  const body: RestErrorBody = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  };

  return Response.json(body, {
    status: error.status,
    headers: { ...NO_STORE_HEADERS, ...error.headers },
  });
}

/** Zod issues as `{ fields: { path: [messages] } }`, so a client can point at the bad input. */
export function validationError(error: z.ZodError, message = "The request is invalid.") {
  const fields: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_";
    (fields[key] ??= []).push(issue.message);
  }

  return new RestApiError(400, "VALIDATION", message, { details: { fields } });
}

const BEARER_CHALLENGE = 'Bearer realm="sheet-happens"';

const AUTH_ERRORS: Record<ApiTokenAuthError["code"], { code: RestErrorCode; challenge: string }> = {
  MISSING_TOKEN: { code: "UNAUTHORIZED", challenge: BEARER_CHALLENGE },
  INVALID_TOKEN: { code: "INVALID_TOKEN", challenge: `${BEARER_CHALLENGE}, error="invalid_token"` },
  EXPIRED_TOKEN: { code: "TOKEN_EXPIRED", challenge: `${BEARER_CHALLENGE}, error="invalid_token"` },
  REVOKED_TOKEN: { code: "TOKEN_REVOKED", challenge: `${BEARER_CHALLENGE}, error="invalid_token"` },
  INACTIVE_MEMBER: {
    code: "INVALID_TOKEN",
    challenge: `${BEARER_CHALLENGE}, error="invalid_token"`,
  },
};

type DomainMapping = { status: number; code: RestErrorCode; field?: string };

/** Keyed on the domain's sentences, like the Server Actions' tables; the test pins every key. */
export const TIMESHEET_SUBMISSION_ERRORS: Record<string, DomainMapping> = {
  "Member not found.": { status: 404, code: "NOT_FOUND" },
  "Contractor profile required.": { status: 403, code: "CONTRACTOR_REQUIRED" },
  "This month is already locked by a submitted timesheet.": { status: 409, code: "MONTH_LOCKED" },
  "This month is not open for submission.": { status: 409, code: "MONTH_NOT_OPEN" },
  "Timesheet source entries changed during submission. Try again.": {
    status: 409,
    code: "TIMESHEET_ENTRIES_CHANGED",
  },
  "Timesheet has entries already locked by another timesheet.": {
    status: 409,
    code: "MONTH_LOCKED",
  },
  "No time entries exist for this month.": { status: 422, code: "TIMESHEET_NOT_SUBMITTABLE" },
  "Timesheet has entries without a project assignment.": {
    status: 422,
    code: "TIMESHEET_NOT_SUBMITTABLE",
  },
  "Timesheet has entries with invalid durations.": {
    status: 422,
    code: "TIMESHEET_NOT_SUBMITTABLE",
  },
  "Timesheet has entries with missing descriptions.": {
    status: 422,
    code: "TIMESHEET_NOT_SUBMITTABLE",
  },
  "Missing rates for one or more entries.": { status: 422, code: "TIMESHEET_NOT_SUBMITTABLE" },
  "Timesheet month contains multiple currencies.": {
    status: 422,
    code: "TIMESHEET_NOT_SUBMITTABLE",
  },
  "Declared hours are missing their proof.": { status: 422, code: "TIMESHEET_NOT_SUBMITTABLE" },
};

export const INVOICE_UPLOAD_ERRORS: Record<string, DomainMapping> = {
  "Member not found.": { status: 404, code: "NOT_FOUND" },
  "Contractor profile required.": { status: 403, code: "CONTRACTOR_REQUIRED" },
  "Approved timesheet not found.": { status: 409, code: "TIMESHEET_NOT_APPROVED" },
  "Timesheet must be approved before invoice upload.": {
    status: 409,
    code: "TIMESHEET_NOT_APPROVED",
  },
  "Timesheet revision changed during upload.": { status: 409, code: "TIMESHEET_NOT_APPROVED" },
  "Invoice already uploaded for this timesheet.": {
    status: 409,
    code: "INVOICE_ALREADY_UPLOADED",
  },
  "Rejected invoice not found.": { status: 409, code: "INVOICE_STEP_MISMATCH" },
  "Cancellation invoice is required before replacement invoice.": {
    status: 409,
    code: "INVOICE_STEP_MISMATCH",
  },
  "Replacement invoice is required after the cancellation invoice.": {
    status: 409,
    code: "INVOICE_STEP_MISMATCH",
  },
  "Invoice upload step is invalid.": { status: 409, code: "INVOICE_STEP_MISMATCH" },
  "Invoice PDF is required.": { status: 400, code: "VALIDATION", field: "file" },
  "Invoice PDF is too large.": { status: 413, code: "PAYLOAD_TOO_LARGE", field: "file" },
  "Invoice must be a PDF.": { status: 415, code: "UNSUPPORTED_MEDIA_TYPE", field: "file" },
  "Invoice number is required.": { status: 400, code: "VALIDATION", field: "invoiceNumber" },
  "Invoice amount is invalid.": { status: 400, code: "VALIDATION", field: "declaredAmount" },
  "Invoice amount must be positive.": {
    status: 400,
    code: "VALIDATION",
    field: "declaredAmount",
  },
  "Cancellation invoice amount must be negative.": {
    status: 400,
    code: "VALIDATION",
    field: "declaredAmount",
  },
  "Cancellation invoice amount must negate the rejected invoice amount.": {
    status: 400,
    code: "VALIDATION",
    field: "declaredAmount",
  },
  "Cancellation invoice currency must match the rejected invoice currency.": {
    status: 400,
    code: "VALIDATION",
    field: "currencyCode",
  },
  "Invoice currency must match the approved timesheet currency.": {
    status: 400,
    code: "VALIDATION",
    field: "currencyCode",
  },
  "Invoice currency is invalid.": { status: 400, code: "VALIDATION", field: "currencyCode" },
};

const TIME_TRACKING_ERRORS: Partial<Record<TimeTrackingError["code"], DomainMapping>> = {
  MEMBER_NOT_FOUND: { status: 404, code: "NOT_FOUND" },
  INVALID_CURSOR: { status: 400, code: "CURSOR_INVALID", field: "cursor" },
  INVALID_DATE: { status: 400, code: "VALIDATION" },
};

/** Anything a handler throws, as the REST error it is. Unknown errors are logged, never echoed. */
export function toRestApiError(error: unknown, logLabel: string): RestApiError {
  if (error instanceof RestApiError) return error;

  if (error instanceof ApiTokenAuthError) {
    const mapped = AUTH_ERRORS[error.code];

    return new RestApiError(401, mapped.code, error.message, {
      headers: { "WWW-Authenticate": mapped.challenge },
    });
  }

  if (error instanceof ApiTokenScopeError) {
    return new RestApiError(403, error.code, error.message, {
      details: { requiredScope: error.scope },
      headers: {
        "WWW-Authenticate": `${BEARER_CHALLENGE}, error="insufficient_scope", scope="${error.scope}"`,
      },
    });
  }

  if (error instanceof TimesheetSubmissionError) {
    const mapped = TIMESHEET_SUBMISSION_ERRORS[error.message];

    if (mapped) {
      return fromMapping(mapped, error.message, {
        ...(error.projectNames.length ? { projects: error.projectNames } : {}),
      });
    }
  }

  if (error instanceof ContractorInvoiceUploadError) {
    const mapped = INVOICE_UPLOAD_ERRORS[error.message];

    if (mapped) return fromMapping(mapped, error.message);
  }

  if (error instanceof TimeTrackingError) {
    const mapped = TIME_TRACKING_ERRORS[error.code];

    if (mapped) return fromMapping(mapped, error.message);
  }

  if (error instanceof TimeTrackingDateError) {
    return new RestApiError(400, "VALIDATION", error.message);
  }

  if (error instanceof ObjectStorageConfigurationError) {
    return new RestApiError(503, "STORAGE_UNAVAILABLE", "File storage is not available.");
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new RestApiError(503, "SERVICE_UNAVAILABLE", "The database is not available.");
  }

  const correlationId = crypto.randomUUID();
  console.error(`${logLabel} (correlation ${correlationId})`, error);

  return new RestApiError(500, "INTERNAL", "Sheet Happens could not complete the request.", {
    details: { correlationId },
  });
}

function fromMapping(
  mapped: DomainMapping,
  message: string,
  extra: Record<string, unknown> = {},
): RestApiError {
  const details = {
    ...(mapped.field ? { fields: { [mapped.field]: [message] } } : {}),
    ...extra,
  };

  return new RestApiError(mapped.status, mapped.code, message, {
    ...(Object.keys(details).length ? { details } : {}),
  });
}
