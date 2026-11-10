# REST API (`/api/v1`)

**Status:** implemented 2026-11-10.
**Surface:** `app/api/v1/**` (route handlers), `src/server/api-tokens` (personal access tokens,
scopes, authentication), `src/server/rest-api` (the shared request envelope and error mapping), the
"API tokens" section of `/settings`.

A small, versioned JSON API for scripts and integrations: read hours, follow a contractor
timesheet's status, submit it for approval, upload its invoice. It authenticates with **personal access tokens** (PATs) only. Every rule the web
app enforces — period locks, the 24-hour cap, tracking modes, the timesheet state machine, invoice
validation — applies here unchanged, because the handlers call the same `src/server/*` functions
the Server Actions call. The handlers themselves only authenticate, check the scope, validate with
Zod and map results and errors to JSON.

**Where people find it:** the in-app _Help → REST API_ tab (`/help?tab=api`, `app/help/ApiPanel.tsx`)
shows this deployment's base URL with a copy button, the token steps, the scopes, a curl example per
endpoint and the error codes, in HU and EN. _Settings → API tokens_ repeats the base URL, links to
that tab and to the spec, and shows a ready-to-copy curl call next to a new token's one-time secret.
The machine-readable spec is served unauthenticated at **`GET /api/v1/openapi.json`** (OpenAPI 3.1,
hand-written in `app/api/v1/openapi.ts`, `servers[0].url` = `authUrls.restApi`, i.e.
`<BETTER_AUTH_URL>/api/v1`). `app/api/v1/openapi.test.ts` fails if a route under `app/api/v1` is
missing from it or it lists one that no longer exists.

For AI agents, prefer the MCP server (`docs/mcp-server.md`): it uses OAuth and consent instead of a
pasted secret.

## 1. Tokens

### Creating and revoking

_Settings → API tokens → Create token_. Give it a name, choose scopes and an expiry (30, 90 or 365
days, or none). The full token is shown **once**, right after creation, with a copy button; only its
SHA-256 hash is stored, so nobody — including admins — can show it again. Lose it and you revoke it
and create another. A member can hold at most 20 live tokens.

The list shows each token's name, visible prefix (`sh_pat_` plus eight characters), scopes, creation
date, last use (updated at most once a minute) and expiry. _Revoke_ asks for confirmation and takes
effect on the very next request.

Tokens look like `sh_pat_` followed by 43 URL-safe characters (256 random bits). The fixed prefix is
there so secret scanners and log reviews can recognise a leaked one.

### Scopes

| Scope              | Grants                                                                 | Who can grant it |
| ------------------ | ---------------------------------------------------------------------- | ---------------- |
| `hours:read`       | `GET /api/v1/hours` for the token owner's own entries                  | any member       |
| `timesheets:read`  | `GET /api/v1/timesheets` and `GET /api/v1/timesheets/{month}` (own)    | any member       |
| `timesheets:write` | submit the owner's own contractor timesheet and upload its invoice PDF | any member       |
| `hours:read:all`   | `GET /api/v1/hours` for other members, several members or everyone     | admins only      |

Only admins are offered `hours:read:all`, and creating a token with it also passes the same
authenticator-app (TOTP) gate as other admin actions (`requireAdminAppMemberForAction`; skipped only
by the local-dev `AUTH_SECURITY_SETUP_MODE="optional"`). Reading your own hours needs `hours:read`
even on an admin token: `hours:read:all` covers cross-member reads only. Scopes are never implied:
`timesheets:write` does not include `timesheets:read`, and a token created before
`timesheets:read` existed does not gain it — create a new token.

### What is checked on every request

A token is not a session, so nothing about its owner is cached. Each call re-reads the token row and
its member:

- unknown, revoked or expired token → `401`;
- owner `INACTIVE`, `DELETED`, `INVITED` or soft-deleted → `401` (`INVALID_TOKEN`);
- **admin scopes are re-evaluated against the owner's live role**: a token created by an admin who
  has since been demoted keeps its non-admin scopes, and every `hours:read:all` call answers `403
ADMIN_REQUIRED`.

Deactivating or deleting a member also revokes all of their tokens in the same transaction
(`member.api_tokens_revoked` in the audit log), so a later reactivation does not bring old tokens
back.

### Sessions and tokens do not mix

`/api/v1` reads only the `Authorization` header and never a cookie, so a signed-in browser cannot
call it (and a cross-site request has nothing to ride on). The other way round, every existing route
authenticates with the Better Auth session cookie and ignores a bearer PAT — `GET /api/notifications`
with a PAT answers `401`.

### Audit

| Action                        | When                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| `api_token.created`           | token created (name, prefix, scopes, expiry — never the secret)                     |
| `api_token.revoked`           | token revoked from Settings                                                         |
| `api_token.used`              | first use of a token in any hour, then at most once an hour                         |
| `api_token.cross_member_read` | every `hours:read:all` read (member ids or `all`, range, project)                   |
| _domain actions_              | `timesheet.submitted`, `invoice.uploaded` … exactly as from the UI, written by them |

Every audit row an API call writes carries `channel = "API"` and `client_id = "api_token:<token id>"`,
so a scripted submission is distinguishable from a click. Usage is sampled hourly rather than per
request because own-data reads are low-risk and a polling script would otherwise flood the table;
writes are already audited individually by the domain, and cross-member reads — the sensitive ones —
are audited every time.

## 2. Conventions

- Base URL: `<BETTER_AUTH_URL>/api/v1`, e.g. `https://app.example.com/api/v1`.
- `Authorization: Bearer sh_pat_…` on every request.
- JSON responses with `Cache-Control: no-store`. Dates are `YYYY-MM-DD` (the entry's own local day),
  months `YYYY-MM`, durations integer minutes, timestamps ISO 8601 UTC.
- Errors are always:

```json
{
  "error": {
    "code": "MONTH_LOCKED",
    "message": "This month is already locked by a submitted timesheet."
  }
}
```

with an optional `details` object (`fields` for validation errors: `{ "fields": { "from": ["Use YYYY-MM-DD."] } }`).
Messages are English and meant for developers; branch on `code`.

| Status | Codes                                                                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 400    | `VALIDATION`, `RANGE_TOO_LARGE`, `CURSOR_INVALID`                                                                                                |
| 401    | `UNAUTHORIZED` (no bearer token), `INVALID_TOKEN`, `TOKEN_EXPIRED`, `TOKEN_REVOKED` — with `WWW-Authenticate: Bearer realm="sheet-happens", …`   |
| 403    | `INSUFFICIENT_SCOPE` (`details.requiredScope`, plus `error="insufficient_scope"` in `WWW-Authenticate`), `ADMIN_REQUIRED`, `CONTRACTOR_REQUIRED` |
| 404    | `NOT_FOUND` (e.g. an unknown `memberId`)                                                                                                         |
| 409    | `MONTH_LOCKED`, `MONTH_NOT_OPEN`, `TIMESHEET_ENTRIES_CHANGED`, `TIMESHEET_NOT_APPROVED`, `INVOICE_ALREADY_UPLOADED`, `INVOICE_STEP_MISMATCH`     |
| 413    | `PAYLOAD_TOO_LARGE`                                                                                                                              |
| 415    | `UNSUPPORTED_MEDIA_TYPE` (not multipart, or the file is not a PDF)                                                                               |
| 422    | `TIMESHEET_NOT_SUBMITTABLE` (no entries, missing descriptions/rates/assignments, mixed currency, declared hours without proof)                   |
| 429    | `RATE_LIMITED`, with `Retry-After` in seconds                                                                                                    |
| 500    | `INTERNAL` (`details.correlationId` matches the server log line)                                                                                 |
| 503    | `STORAGE_UNAVAILABLE`, `SERVICE_UNAVAILABLE`                                                                                                     |

### Limits

- **Rate limit:** 120 requests per minute **per token**, sliding window, in memory (the MCP limiter,
  keyed by token id). One instance per environment today; behind several instances the limit is per
  instance.
- **Hours range:** at most 92 days per request (inclusive). Page through a longer period instead.
- **Page size:** `limit` 1–200, default 100. Up to 50 `memberId` values per request.
- **Invoice upload:** the same 10 MB PDF limit as the upload form. A larger `Content-Length` is
  refused before the body is read.

### Pagination

Cursor-based (keyset), shared with the MCP `time_list_entries` tool. Entries are ordered by date,
then start time (untimed entries last), then id. A response carries `nextCursor`; pass it back as
`cursor` with the **same** filters until it is `null`. Cursors are opaque; a mangled one is refused
with `400 CURSOR_INVALID` rather than silently restarting. Keyset paging means an entry added while
you page is either seen once or not at all — never twice.

## 3. Endpoints

All examples use `TOKEN=sh_pat_…` and `BASE=https://app.example.com/api/v1`.

### `GET /api/v1/hours`

Time entries in a date range. Scope `hours:read` for your own entries; `hours:read:all` (and a live
admin role) for anyone else.

| Query             | Required | Description                                                                                                                                  |
| ----------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `from`, `to`      | yes      | `YYYY-MM-DD`, inclusive, `to ≥ from`, at most 92 days apart.                                                                                 |
| `memberId`        | no       | Omitted: your own entries. A member UUID, several (repeat the parameter or comma-separate), or `all`. Only your own id needs no admin scope. |
| `projectId`       | no       | Only entries on this project (UUID).                                                                                                         |
| `includeDeclared` | no       | `true` to include declared-month entries (`source: "DECLARED"`, one per project on the 1st). Default `false`, as in the MCP tool.            |
| `cursor`, `limit` | no       | See pagination.                                                                                                                              |

Soft-deleted entries are never returned.

```bash
curl -s "$BASE/hours?from=2026-11-01&to=2026-11-10&limit=2" -H "Authorization: Bearer $TOKEN"
```

```json
{
  "range": { "from": "2026-11-01", "to": "2026-11-10" },
  "entries": [
    {
      "id": "2694ec24-ee63-4c3d-b89c-6320bf7c4356",
      "date": "2026-11-02",
      "projectId": "243ab132-a6b8-4f6f-aff9-2efdb88eae1d",
      "projectName": "Nimbus Mobile App",
      "durationMinutes": 420,
      "startTime": null,
      "endTime": null,
      "description": "UI polish",
      "source": "GRID",
      "locked": false,
      "updatedAt": "2026-11-09T21:26:00.712Z",
      "memberId": "2c41a4dc-711b-453f-82b3-d6c90681a378",
      "memberName": "Contractor Example"
    }
  ],
  "totals": {
    "page": { "minutes": 900, "entryCount": 2 },
    "range": { "minutes": 1710, "entryCount": 5 }
  },
  "nextCursor": "eyJkYXRlIjoiMjAyNi0xMS0wMyIsInN0YXJ0ZWRBdCI6bnVsbCwiaWQiOiI3YjQ1…"
}
```

- `startTime`/`endTime` are `HH:mm` in the timezone the entry was recorded in, or `null` for a
  duration-only entry. `source` is `GRID`, `FORM`, `TIMER`, `MCP` or `DECLARED`.
- `locked` is `true` when a submitted timesheet revision holds the entry (the month is locked).
- `totals.page` sums the returned page; `totals.range` sums the whole filtered range in one database
  aggregate, so you do not have to page to the end just to get a total.

Admin, every member, with an audit row per call:

```bash
curl -s "$BASE/hours?from=2026-11-01&to=2026-11-10&memberId=all" -H "Authorization: Bearer $TOKEN"
```

### Timesheet status object

`GET /timesheets/{month}`, every entry of `GET /timesheets`, and the `timesheet` field of the submit
and invoice responses share one shape (`ContractorTimesheetStatus`, `src/server/timesheets/status.ts`):

| Field                                                         | Meaning                                                                                                                                                                                                                                         |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `month`                                                       | `YYYY-MM`                                                                                                                                                                                                                                       |
| `status`                                                      | `not_submitted` (no timesheet row yet — the UI's derived `not_created`), or the domain status: `submitted`, `rejected`, `approved`, `invoiced`, `invoice_rejected`, `accepted`, `paid`                                                          |
| `revisionNumber`                                              | current revision, `null` when not submitted                                                                                                                                                                                                     |
| `submittedAt` `approvedAt` `rejectedAt` `acceptedAt` `paidAt` | ISO timestamps of the current revision, `null` when not reached                                                                                                                                                                                 |
| `rejectionReason`                                             | the reviewer's reason when the hours were rejected                                                                                                                                                                                              |
| `totals`                                                      | `{ source, minutes, amount, currencyCode }`. `source: "snapshot"` is the revision's frozen total; `"live"` sums current entries of a not-yet-submitted month (single-month read only); `"none"` in the year list for months without a timesheet |
| `invoice`                                                     | latest non-cancellation invoice: `{ status, invoiceNumber, role, rejectionReason }`, `status` one of `none`, `uploaded`, `accepted`, `rejected`, `replaced`, `cancelled`, `deleted`                                                             |

"Is it approved yet?" is `status` in `approved`, `invoiced`, `invoice_rejected`, `accepted` or `paid`.

### `GET /api/v1/timesheets/{month}`

Scope `timesheets:read`; contractors only (`403 CONTRACTOR_REQUIRED` otherwise). Reads through
`getContractorTimesheetMonthlyPreview`, the function behind `/timesheets`, so the figures match
the page.

```bash
curl -s "$BASE/timesheets/2026-09" -H "Authorization: Bearer $TOKEN"
```

```json
{
  "month": "2026-09",
  "status": "approved",
  "revisionNumber": 1,
  "submittedAt": "2026-10-01T09:15:00.000Z",
  "approvedAt": "2026-10-02T11:15:00.000Z",
  "rejectedAt": null,
  "acceptedAt": null,
  "paidAt": null,
  "rejectionReason": null,
  "totals": { "source": "snapshot", "minutes": 9150, "amount": "9981.00", "currencyCode": "EUR" },
  "invoice": { "status": "none", "invoiceNumber": null, "role": null, "rejectionReason": null }
}
```

### `GET /api/v1/timesheets?year=YYYY`

Scope `timesheets:read`; contractors only. All twelve months of `year` (default: the current year
in the member's timezone), newest first, in one query — the call to poll. `year` must be 2000–2100.

```bash
curl -s "$BASE/timesheets?year=2026" -H "Authorization: Bearer $TOKEN"
```

```json
{
  "year": 2026,
  "months": [
    {
      "month": "2026-12",
      "status": "not_submitted",
      "totals": { "source": "none", "minutes": 0, "amount": null, "currencyCode": null },
      "…": "…"
    },
    { "month": "2026-10", "status": "submitted", "…": "…" },
    {
      "month": "2026-08",
      "status": "paid",
      "invoice": {
        "status": "accepted",
        "invoiceNumber": "CE-202608-01",
        "role": "original",
        "rejectionReason": null
      },
      "…": "…"
    }
  ]
}
```

### `POST /api/v1/timesheets/{month}/submit`

Submits the token owner's contractor timesheet for `month` (`YYYY-MM`) through
`submitContractorTimesheet`, the function behind the Submit button on `/timesheets`: it snapshots
the month into an immutable revision, resolves rates, locks the period and notifies admins. Scope
`timesheets:write`. Employees get `403 CONTRACTOR_REQUIRED`. No body.

```bash
curl -s -X POST "$BASE/timesheets/2026-07/submit" -H "Authorization: Bearer $TOKEN"
```

`201`:

```json
{
  "month": "2026-07",
  "status": "SUBMITTED",
  "timesheetId": "df34d54d-2629-4739-8c6b-3cca78977f51",
  "revisionId": "e12f0cda-8542-4736-8765-cd5b9d0096cd",
  "revisionNumber": 1,
  "entryCount": 20,
  "totalMinutes": 8070,
  "totalAmount": "8062.00",
  "currencyCode": "EUR",
  "timesheet": { "month": "2026-07", "status": "submitted", "revisionNumber": 1, "…": "…" }
}
```

A month that is already submitted, approved, invoiced or paid answers `409 MONTH_LOCKED`; a rejected
month is resubmitted as a new revision exactly as in the UI. Data problems (no entries, missing
descriptions or rates, declared hours without proof — `details.projects` names them) answer `422`.

### `POST /api/v1/timesheets/{month}/invoice`

Uploads the contractor invoice PDF for an approved (or invoice-rejected) month through
`uploadContractorInvoice`, with the same validation as the upload form. Scope `timesheets:write`.
`multipart/form-data` fields:

| Field            | Required | Description                                                                                                                                           |
| ---------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `file`           | yes      | The PDF, at most 10 MB. Must be `application/pdf` (or a `.pdf` name), have a `.pdf` filename and start with `%PDF-`.                                  |
| `invoiceNumber`  | yes      | 1–120 characters.                                                                                                                                     |
| `declaredAmount` | yes      | Decimal with up to two places, e.g. `8062.00`. Positive, except a cancellation invoice, which must exactly negate the rejected invoice.               |
| `currencyCode`   | yes      | ISO 4217, must match the approved timesheet's currency (case-insensitive).                                                                            |
| `invoiceRole`    | no       | `ORIGINAL`, `CANCELLATION` or `REPLACEMENT`. Omitted, the workflow's next step is used; given, it must match it (`409 INVOICE_STEP_MISMATCH` if not). |

```bash
curl -s "$BASE/timesheets/2026-07/invoice" -H "Authorization: Bearer $TOKEN" \
  -F invoiceNumber=INV-2026-07 -F declaredAmount=8062.00 -F currencyCode=EUR \
  -F file=@invoice-2026-07.pdf
```

`201`:

```json
{
  "month": "2026-07",
  "invoiceId": "63d7280c-2b7c-4590-bbc4-43d92f6152e3",
  "documentId": "66c7b085-7d31-4436-96fd-1fe161c7b4fe",
  "timesheetId": "df34d54d-2629-4739-8c6b-3cca78977f51",
  "timesheetRevisionId": "e12f0cda-8542-4736-8765-cd5b9d0096cd",
  "invoiceNumber": "INV-2026-07",
  "invoiceRole": "ORIGINAL",
  "status": "UPLOADED",
  "timesheet": { "month": "2026-07", "status": "invoiced", "…": "…" }
}
```

A month that is not approved, or whose invoice is already uploaded, answers `409`.

**No presigned upload.** A two-step flow (request a presigned PUT URL, upload to object storage,
then post the metadata) was considered and left out: the 10 MB limit fits comfortably in a route
handler body (route handlers are not bound by the 12 MB Server Action limit); `ObjectStorage` has no
upload-URL primitive, and the S3 endpoint is often not reachable by clients at all (`http://minio:9000`
in the dev compose); and the domain validates the bytes themselves (`%PDF-` magic, SHA-256 checksum),
so the server would have to download the object again and also garbage-collect abandoned uploads.
Revisit if the file limit ever grows past what a single request should carry.

## 4. Module layout

```
src/server/api-tokens/
  scopes.ts         API_TOKEN_SCOPES, admin scopes, live-role filtering (import-free: the Settings UI uses it)
  tokens.ts         generate/hash, create, list, revoke, revokeAllApiTokensForMember
  authenticate.ts   bearer parsing, authenticateApiToken (live member + role checks, lastUsedAt, sampled audit),
                    requireApiTokenScope, recordApiTokenCrossMemberRead
  rate-limit.ts     per-token limiter (createMcpRateLimiter keyed by token id)
src/server/rest-api/
  handler.ts        handleApiRequest: token → rate limit → handler → error mapping
  errors.ts         RestApiError, error codes, domain-error tables, toRestApiError
  index.ts          HOURS_QUERY_LIMITS, month/day helpers
app/api/v1/hours/route.ts
app/api/v1/timesheets/route.ts                 year list
app/api/v1/timesheets/[month]/route.ts         one month
app/api/v1/timesheets/[month]/submit/route.ts
app/api/v1/timesheets/[month]/invoice/route.ts
app/api/v1/openapi.ts                          the OpenAPI 3.1 document (+ openapi.json/route.ts, openapi.test.ts)
src/server/timesheets/status.ts                getContractorTimesheetStatus, listContractorTimesheetStatuses
app/help/ApiPanel.tsx                          the Help → REST API tab
app/settings/ApiTokensClient.tsx      the Settings section; actions in app/settings/actions.ts
prisma/api-tokens.prisma              ApiToken → api_tokens
```

Domain additions made for this API: `listTimeEntriesAcrossMembers` and `sumTimeEntries` in
`src/server/time-tracking/queries.ts` (sharing the member-scoped list's filter, order and cursor),
`contractorInvoiceFieldsSchema` and `normalizeInvoiceContentType` in `src/server/invoices` (now used
by the upload form's action too), an optional `invoiceRole` on `uploadContractorInvoice`, the
supported-currency check moved into the invoice domain, and `channel`/`clientId` on the timesheet
and invoice request metadata.

Adding an endpoint: a route file under `app/api/v1` that calls `handleApiRequest`, a scope in
`scopes.ts` (plus its HU/EN wording under `Settings.apiTokens.scopes`), any missing domain function
in `src/server/<domain>`, a colocated `route.test.ts`, the operation in `app/api/v1/openapi.ts`
(the drift test enforces it), the Help tab's endpoint list, and a section here.
