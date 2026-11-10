import { requireApiTokenScope } from "@/src/server/api-tokens";
import {
  CONTRACTOR_INVOICE_MAX_BYTES,
  contractorInvoiceFieldsSchema,
  normalizeInvoiceContentType,
  uploadContractorInvoice,
} from "@/src/server/invoices";
import {
  apiJson,
  handleApiRequest,
  parseMonthPathParam,
  RestApiError,
  validationError,
} from "@/src/server/rest-api";
import { formatDateOnly } from "@/src/server/time-tracking";

type UploadInvoiceRouteContext = { params: Promise<{ month: string }> };

/** Room for the multipart boundaries and text fields around a maximum-size PDF. */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

const fieldsSchema = contractorInvoiceFieldsSchema.extend({
  invoiceRole: contractorInvoiceFieldsSchema.shape.invoiceRole.optional(),
});

export async function POST(request: Request, { params }: UploadInvoiceRouteContext) {
  return handleApiRequest(request, "[api/v1] invoice upload failed", async (actor) => {
    requireApiTokenScope(actor, "timesheets:write");

    const periodStart = parseMonthPathParam((await params).month);

    if (actor.member.currentProfile !== "CONTRACTOR") {
      throw new RestApiError(
        403,
        "CONTRACTOR_REQUIRED",
        "Contractor invoices are contractor-only; this token belongs to an employee.",
      );
    }

    const declaredLength = Number(request.headers.get("content-length"));

    // Refused before the body is buffered; the file itself is checked again below.
    if (declaredLength > CONTRACTOR_INVOICE_MAX_BYTES + MULTIPART_OVERHEAD_BYTES) {
      throw tooLarge();
    }

    if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
      throw new RestApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Send multipart/form-data.");
    }

    let form: FormData;

    try {
      form = await request.formData();
    } catch {
      throw new RestApiError(400, "VALIDATION", "The multipart body could not be read.");
    }

    const parsed = fieldsSchema.safeParse({
      invoiceRole: textField(form, "invoiceRole"),
      invoiceNumber: textField(form, "invoiceNumber"),
      declaredAmount: textField(form, "declaredAmount"),
      currencyCode: textField(form, "currencyCode"),
    });

    if (!parsed.success) throw validationError(parsed.error);

    const file = form.get("file");

    if (!(file instanceof File) || file.size <= 0) {
      throw new RestApiError(400, "VALIDATION", "Invoice PDF is required.", {
        details: { fields: { file: ["Attach the invoice PDF as `file`."] } },
      });
    }

    if (file.size > CONTRACTOR_INVOICE_MAX_BYTES) throw tooLarge();

    const result = await uploadContractorInvoice({
      memberId: actor.member.id,
      actorMemberId: actor.member.id,
      periodStart,
      ...(parsed.data.invoiceRole ? { invoiceRole: parsed.data.invoiceRole } : {}),
      invoiceNumber: parsed.data.invoiceNumber,
      declaredAmount: parsed.data.declaredAmount,
      currencyCode: parsed.data.currencyCode.toUpperCase(),
      file: {
        bytes: Buffer.from(await file.arrayBuffer()),
        originalFilename: file.name || "invoice.pdf",
        contentType: normalizeInvoiceContentType(file),
        byteSize: file.size,
      },
      requestMetadata: actor.requestMetadata,
    });

    return apiJson(
      {
        month: formatDateOnly(periodStart).slice(0, 7),
        invoiceId: result.invoiceId,
        documentId: result.documentId,
        timesheetId: result.timesheetId,
        timesheetRevisionId: result.timesheetRevisionId,
        invoiceNumber: result.invoiceNumber,
        invoiceRole: result.invoiceRole,
        status: result.status,
      },
      201,
    );
  });
}

function textField(form: FormData, name: string) {
  const value = form.get(name);

  return typeof value === "string" ? value : undefined;
}

function tooLarge() {
  return new RestApiError(
    413,
    "PAYLOAD_TOO_LARGE",
    `Invoice PDF must be at most ${CONTRACTOR_INVOICE_MAX_BYTES / (1024 * 1024)} MB.`,
    { details: { maxBytes: CONTRACTOR_INVOICE_MAX_BYTES } },
  );
}
