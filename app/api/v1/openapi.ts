/**
 * The hand-written OpenAPI 3.1 description of `/api/v1`, served at `/api/v1/openapi.json`.
 * `openapi.test.ts` fails when a route under `app/api/v1` is missing here, or listed here but gone.
 */

const error = { $ref: "#/components/responses/Error" } as const;

const monthParam = {
  name: "month",
  in: "path",
  required: true,
  description: "Calendar month as YYYY-MM.",
  schema: { type: "string", pattern: "^\\d{4}-\\d{2}$", examples: ["2026-10"] },
} as const;

export function buildOpenApiDocument(baseUrl: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Sheet Happens REST API",
      version: "1.0.0",
      description:
        "Read hours, follow and submit contractor timesheets, and upload invoices with a personal access token created under Settings → API tokens. Every rule of the web app applies: period locks, the timesheet state machine and invoice validation.",
    },
    servers: [{ url: baseUrl }],
    security: [{ bearerAuth: [] }],
    paths: {
      "/hours": {
        get: {
          operationId: "listHours",
          summary: "List time entries in a date range",
          description:
            "Own entries need `hours:read`. Other members (`memberId`) need `hours:read:all` and a live admin role. At most 92 days per request; page with `cursor`.",
          parameters: [
            dateParam("from"),
            dateParam("to"),
            {
              name: "memberId",
              in: "query",
              description:
                "Member UUIDs (repeat or comma-separate) or `all`. Omitted: the token owner.",
              schema: { type: "array", items: { type: "string" } },
              style: "form",
              explode: true,
            },
            { name: "projectId", in: "query", schema: { type: "string", format: "uuid" } },
            {
              name: "includeDeclared",
              in: "query",
              schema: { type: "string", enum: ["true", "false"], default: "false" },
            },
            { name: "cursor", in: "query", schema: { type: "string" } },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 200, default: 100 },
            },
          ],
          responses: {
            "200": json("A page of entries.", { $ref: "#/components/schemas/HoursPage" }),
            "400": error,
            "401": error,
            "403": error,
            "404": error,
            "429": error,
          },
        },
      },
      "/timesheets": {
        get: {
          operationId: "listTimesheets",
          summary: "Status of every month of a year",
          description: "Scope `timesheets:read`. Contractors only. Newest month first.",
          parameters: [
            {
              name: "year",
              in: "query",
              description: "Defaults to the current year in the member's timezone.",
              schema: { type: "integer", minimum: 2000, maximum: 2100 },
            },
          ],
          responses: {
            "200": json("Twelve months.", {
              type: "object",
              required: ["year", "months"],
              properties: {
                year: { type: "integer" },
                months: {
                  type: "array",
                  items: { $ref: "#/components/schemas/TimesheetStatus" },
                },
              },
            }),
            "400": error,
            "401": error,
            "403": error,
            "429": error,
          },
        },
      },
      "/timesheets/{month}": {
        get: {
          operationId: "getTimesheet",
          summary: "Status of one month",
          description:
            "Scope `timesheets:read`. Contractors only. `not_submitted` months report live totals from current entries.",
          parameters: [monthParam],
          responses: {
            "200": json("The month's status.", {
              $ref: "#/components/schemas/TimesheetStatus",
            }),
            "400": error,
            "401": error,
            "403": error,
            "429": error,
          },
        },
      },
      "/timesheets/{month}/submit": {
        post: {
          operationId: "submitTimesheet",
          summary: "Submit the month for approval",
          description:
            "Scope `timesheets:write`. Contractors only. Snapshots the month into an immutable revision and locks it.",
          parameters: [monthParam],
          responses: {
            "201": json("Submitted.", {
              type: "object",
              properties: {
                month: { type: "string" },
                status: { const: "SUBMITTED" },
                timesheetId: { type: "string", format: "uuid" },
                revisionId: { type: "string", format: "uuid" },
                revisionNumber: { type: "integer" },
                entryCount: { type: "integer" },
                totalMinutes: { type: "integer" },
                totalAmount: { type: "string" },
                currencyCode: { type: "string" },
                timesheet: { $ref: "#/components/schemas/TimesheetStatus" },
              },
            }),
            "400": error,
            "401": error,
            "403": error,
            "409": error,
            "422": error,
            "429": error,
          },
        },
      },
      "/timesheets/{month}/invoice": {
        post: {
          operationId: "uploadInvoice",
          summary: "Upload the invoice PDF for an approved month",
          description:
            "Scope `timesheets:write`. Contractors only. Same validation as the upload form; at most 10 MB.",
          parameters: [monthParam],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["file", "invoiceNumber", "declaredAmount", "currencyCode"],
                  properties: {
                    file: { type: "string", contentMediaType: "application/pdf" },
                    invoiceNumber: { type: "string", minLength: 1, maxLength: 120 },
                    declaredAmount: { type: "string", pattern: "^-?\\d+(\\.\\d{1,2})?$" },
                    currencyCode: { type: "string", minLength: 3, maxLength: 3 },
                    invoiceRole: {
                      type: "string",
                      enum: ["ORIGINAL", "CANCELLATION", "REPLACEMENT"],
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": json("Uploaded.", {
              type: "object",
              properties: {
                month: { type: "string" },
                invoiceId: { type: "string", format: "uuid" },
                documentId: { type: "string", format: "uuid" },
                timesheetId: { type: "string", format: "uuid" },
                timesheetRevisionId: { type: "string", format: "uuid" },
                invoiceNumber: { type: "string" },
                invoiceRole: { type: "string" },
                status: { const: "UPLOADED" },
                timesheet: { $ref: "#/components/schemas/TimesheetStatus" },
              },
            }),
            "400": error,
            "401": error,
            "403": error,
            "409": error,
            "413": error,
            "415": error,
            "429": error,
          },
        },
      },
      "/openapi.json": {
        get: {
          operationId: "getOpenApi",
          summary: "This document",
          security: [],
          responses: { "200": json("OpenAPI 3.1 document.", { type: "object" }) },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "A personal access token (`sh_pat_…`) from Settings → API tokens.",
        },
      },
      responses: {
        Error: {
          description: "Error envelope; branch on `error.code`.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["error"],
                properties: {
                  error: {
                    type: "object",
                    required: ["code", "message"],
                    properties: {
                      code: { type: "string" },
                      message: { type: "string" },
                      details: { type: "object" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      schemas: {
        HoursEntry: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            date: { type: "string", format: "date" },
            projectId: { type: "string", format: "uuid" },
            projectName: { type: "string" },
            durationMinutes: { type: "integer" },
            startTime: { type: ["string", "null"] },
            endTime: { type: ["string", "null"] },
            description: { type: "string" },
            source: { type: "string", enum: ["GRID", "FORM", "TIMER", "MCP", "DECLARED"] },
            locked: { type: "boolean" },
            updatedAt: { type: "string", format: "date-time" },
            memberId: { type: "string", format: "uuid" },
            memberName: { type: "string" },
          },
        },
        HoursPage: {
          type: "object",
          properties: {
            range: {
              type: "object",
              properties: { from: { type: "string" }, to: { type: "string" } },
            },
            entries: { type: "array", items: { $ref: "#/components/schemas/HoursEntry" } },
            totals: {
              type: "object",
              properties: {
                page: { $ref: "#/components/schemas/Totals" },
                range: { $ref: "#/components/schemas/Totals" },
              },
            },
            nextCursor: { type: ["string", "null"] },
          },
        },
        Totals: {
          type: "object",
          properties: { minutes: { type: "integer" }, entryCount: { type: "integer" } },
        },
        TimesheetStatus: {
          type: "object",
          properties: {
            month: { type: "string" },
            status: {
              type: "string",
              enum: [
                "not_submitted",
                "submitted",
                "rejected",
                "approved",
                "invoiced",
                "invoice_rejected",
                "accepted",
                "paid",
              ],
            },
            revisionNumber: { type: ["integer", "null"] },
            submittedAt: nullableDateTime,
            approvedAt: nullableDateTime,
            rejectedAt: nullableDateTime,
            acceptedAt: nullableDateTime,
            paidAt: nullableDateTime,
            rejectionReason: { type: ["string", "null"] },
            totals: {
              type: "object",
              properties: {
                source: { type: "string", enum: ["snapshot", "live", "none"] },
                minutes: { type: "integer" },
                amount: { type: ["string", "null"] },
                currencyCode: { type: ["string", "null"] },
              },
            },
            invoice: {
              type: "object",
              properties: {
                status: {
                  type: "string",
                  enum: [
                    "none",
                    "uploaded",
                    "accepted",
                    "rejected",
                    "replaced",
                    "cancelled",
                    "deleted",
                  ],
                },
                invoiceNumber: { type: ["string", "null"] },
                role: { type: ["string", "null"] },
                rejectionReason: { type: ["string", "null"] },
              },
            },
          },
        },
      },
    },
  };
}

const nullableDateTime = { type: ["string", "null"], format: "date-time" } as const;

function dateParam(name: string) {
  return {
    name,
    in: "query",
    required: true,
    schema: { type: "string", format: "date" },
  } as const;
}

function json(description: string, schema: unknown) {
  return { description, content: { "application/json": { schema } } };
}
