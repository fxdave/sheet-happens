// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ContractorInvoiceUploadError } from "@/src/server/invoices";
import { fakeApiTokenActor } from "@/src/server/rest-api/test-actor";
import { ObjectStorageConfigurationError } from "@/src/server/storage";

const authenticateApiToken = vi.fn();
const uploadContractorInvoice = vi.fn();

vi.mock("@/src/server/api-tokens", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/server/api-tokens")>()),
  authenticateApiToken: (input: unknown) => authenticateApiToken(input),
  apiTokenRateLimit: { check: () => ({ allowed: true }), reset: () => {} },
}));

vi.mock("@/src/server/invoices", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/server/invoices")>()),
  uploadContractorInvoice: (input: unknown) => uploadContractorInvoice(input),
}));

const { POST } = await import("./route");

const PDF = Buffer.from("%PDF-1.4\n%%EOF\n");

function form(
  fields: Record<string, string>,
  file: File | null = new File([PDF], "inv.pdf", { type: "application/pdf" }),
) {
  const body = new FormData();

  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  if (file) body.set("file", file);

  return body;
}

const validFields = { invoiceNumber: "INV-7", declaredAmount: "4000.00", currencyCode: "eur" };

function upload(body: BodyInit, month = "2026-09", headers: Record<string, string> = {}) {
  return POST(
    new Request(`http://localhost/api/v1/timesheets/${month}/invoice`, {
      method: "POST",
      headers: { Authorization: "Bearer sh_pat_test", ...headers },
      body,
    }),
    { params: Promise.resolve({ month }) },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  authenticateApiToken.mockResolvedValue(fakeApiTokenActor());
  uploadContractorInvoice.mockResolvedValue({
    invoiceId: "invoice-1",
    documentId: "document-1",
    timesheetId: "timesheet-1",
    timesheetRevisionId: "revision-1",
    invoiceNumber: "INV-7",
    invoiceRole: "ORIGINAL",
    status: "UPLOADED",
  });
});

describe("POST /api/v1/timesheets/{month}/invoice", () => {
  it("uploads the PDF with the same metadata the UI collects", async () => {
    const response = await upload(form(validFields));

    expect(response.status).toBe(201);
    const input = uploadContractorInvoice.mock.calls[0]?.[0];
    expect(input).toMatchObject({
      memberId: "11111111-1111-4111-8111-111111111111",
      actorMemberId: "11111111-1111-4111-8111-111111111111",
      periodStart: new Date("2026-09-01T00:00:00.000Z"),
      invoiceNumber: "INV-7",
      declaredAmount: "4000.00",
      currencyCode: "EUR",
      file: { originalFilename: "inv.pdf", contentType: "application/pdf", byteSize: PDF.length },
      requestMetadata: { channel: "API", clientId: "api_token:token-1" },
    });
    expect(input).not.toHaveProperty("invoiceRole");
    expect(Buffer.compare(input.file.bytes, PDF)).toBe(0);
    await expect(response.json()).resolves.toMatchObject({
      month: "2026-09",
      invoiceId: "invoice-1",
      invoiceRole: "ORIGINAL",
      status: "UPLOADED",
    });
  });

  it("passes an explicit invoice role through", async () => {
    await upload(form({ ...validFields, invoiceRole: "CANCELLATION", declaredAmount: "-4000" }));

    expect(uploadContractorInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ invoiceRole: "CANCELLATION", declaredAmount: "-4000" }),
    );
  });

  it("needs timesheets:write", async () => {
    authenticateApiToken.mockResolvedValue(fakeApiTokenActor({ scopes: ["hours:read"] }));

    expect((await upload(form(validFields))).status).toBe(403);
    expect(uploadContractorInvoice).not.toHaveBeenCalled();
  });

  it("tells an employee that invoices are contractor-only", async () => {
    authenticateApiToken.mockResolvedValue(fakeApiTokenActor({ profile: "EMPLOYEE" }));

    const response = await upload(form(validFields));

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("CONTRACTOR_REQUIRED");
  });

  it("refuses a non-multipart body with 415", async () => {
    const response = await upload(JSON.stringify(validFields), "2026-09", {
      "Content-Type": "application/json",
    });

    expect(response.status).toBe(415);
  });

  it("refuses an oversized body before reading it", async () => {
    const response = await upload(form(validFields), "2026-09", {
      "Content-Length": String(20 * 1024 * 1024),
    });

    expect(response.status).toBe(413);
    expect(uploadContractorInvoice).not.toHaveBeenCalled();
  });

  it("refuses a file over the UI's 10 MB limit with 413", async () => {
    const big = new File([Buffer.alloc(10 * 1024 * 1024 + 1)], "big.pdf", {
      type: "application/pdf",
    });

    const response = await upload(form(validFields, big));

    expect(response.status).toBe(413);
    expect((await response.json()).error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it.each([
    ["no file", form(validFields, null), "file"],
    ["no invoice number", form({ ...validFields, invoiceNumber: "" }), "invoiceNumber"],
    ["a malformed amount", form({ ...validFields, declaredAmount: "4,000" }), "declaredAmount"],
    ["a bad currency", form({ ...validFields, currencyCode: "EURO" }), "currencyCode"],
    ["an unknown role", form({ ...validFields, invoiceRole: "CORRECTED" }), "invoiceRole"],
  ])("answers 400 for %s", async (_label, body, field) => {
    const response = await upload(body);

    expect(response.status).toBe(400);
    expect((await response.json()).error.details.fields).toHaveProperty(field);
    expect(uploadContractorInvoice).not.toHaveBeenCalled();
  });

  it.each([
    ["Timesheet must be approved before invoice upload.", 409, "TIMESHEET_NOT_APPROVED"],
    ["Invoice already uploaded for this timesheet.", 409, "INVOICE_ALREADY_UPLOADED"],
    ["Cancellation invoice is required before replacement invoice.", 409, "INVOICE_STEP_MISMATCH"],
    ["Invoice must be a PDF.", 415, "UNSUPPORTED_MEDIA_TYPE"],
    ["Invoice currency must match the approved timesheet currency.", 400, "VALIDATION"],
  ])("maps %s", async (message, status, code) => {
    uploadContractorInvoice.mockRejectedValue(new ContractorInvoiceUploadError(message));

    const response = await upload(form(validFields));

    expect(response.status).toBe(status);
    expect((await response.json()).error).toMatchObject({ code, message });
  });

  it("maps missing storage to 503", async () => {
    uploadContractorInvoice.mockRejectedValue(new ObjectStorageConfigurationError("S3 missing"));

    expect((await upload(form(validFields))).status).toBe(503);
  });
});
