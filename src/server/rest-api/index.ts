import { parseDateOnly } from "@/src/server/time-tracking";
import { parseTimesheetMonthParam } from "@/src/server/timesheets";

import { RestApiError } from "./errors";

export { apiJson, handleApiRequest } from "./handler";
export type { RestHandlerDeps } from "./handler";
export {
  INVOICE_UPLOAD_ERRORS,
  NO_STORE_HEADERS,
  RestApiError,
  restErrorResponse,
  TIMESHEET_SUBMISSION_ERRORS,
  toRestApiError,
  validationError,
} from "./errors";
export type { RestErrorBody, RestErrorCode } from "./errors";

/** `GET /api/v1/hours` bounds; the same as the MCP `time_list_entries` tool. */
export const HOURS_QUERY_LIMITS = {
  rangeDays: 92,
  pageSize: 100,
  pageSizeMax: 200,
  maxMemberIds: 50,
} as const;

export function inclusiveDaySpan(from: string, to: string) {
  return Math.floor((parseDateOnly(to).getTime() - parseDateOnly(from).getTime()) / 86_400_000) + 1;
}

/** `YYYY-MM` from the path, as the first day of that month, or a 400. */
export function parseMonthPathParam(value: string) {
  const periodStart = parseTimesheetMonthParam(value);

  if (!periodStart) {
    throw new RestApiError(400, "VALIDATION", "Month must be YYYY-MM.", {
      details: { fields: { month: ["Use YYYY-MM."] } },
    });
  }

  return periodStart;
}
