import { createHash, randomUUID } from "node:crypto";

import { z } from "zod";

import { isSupportedCurrencyCode } from "@/src/lib/member-preferences";
import { prisma } from "@/src/server/db/client";
import type { Prisma } from "@/src/server/db/generated/client";
import { getObjectStorage, type ObjectStorage } from "@/src/server/storage";
import { formatDateOnly, getMonthStart, normalizeDateOnly } from "@/src/server/time-tracking";

export const CONTRACTOR_INVOICE_MAX_BYTES = 10 * 1024 * 1024;

/** The human-entered review metadata, shared by the upload form's action and the REST API. */
export const contractorInvoiceFieldsSchema = z.object({
  invoiceRole: z.enum(["ORIGINAL", "CANCELLATION", "REPLACEMENT"]),
  invoiceNumber: z.string().trim().min(1).max(120),
  declaredAmount: z
    .string()
    .trim()
    .regex(/^-?\d+(\.\d{1,2})?$/),
  currencyCode: z.string().trim().min(3).max(3),
});

/** Browsers send an empty or generic type for some PDFs; the name is the fallback signal. */
export function normalizeInvoiceContentType(file: { type: string; name: string }) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    ? "application/pdf"
    : file.type;
}

export type ContractorInvoiceUploadRequestMetadata = {
  ipAddress?: string | null;
  userAgent?: string | null;
  channel?: "WEB" | "API";
  clientId?: string;
};

export type UploadContractorInvoiceInput = {
  memberId: string;
  actorMemberId: string;
  periodStart: Date;
  /** The step the caller expects; omitted, the workflow's next step is taken. */
  invoiceRole?: ContractorInvoiceUploadRole;
  invoiceNumber: string;
  declaredAmount: string;
  currencyCode: string;
  file: {
    bytes: Buffer;
    originalFilename: string;
    contentType: string;
    byteSize: number;
  };
  requestMetadata?: ContractorInvoiceUploadRequestMetadata;
};

export type UploadContractorInvoiceResult = {
  invoiceId: string;
  documentId: string;
  timesheetId: string;
  timesheetRevisionId: string;
  invoiceNumber: string;
  invoiceRole: ContractorInvoiceUploadRole;
  status: "UPLOADED";
};

export type ContractorInvoiceUploadRole = "ORIGINAL" | "CANCELLATION" | "REPLACEMENT";

export class ContractorInvoiceUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractorInvoiceUploadError";
  }
}

export async function uploadContractorInvoice(
  input: UploadContractorInvoiceInput,
  deps: { storage?: ObjectStorage; now?: Date } = {},
): Promise<UploadContractorInvoiceResult> {
  const now = deps.now ?? new Date();
  const storage = deps.storage ?? getObjectStorage();
  const periodStart = getMonthStart(normalizeDateOnly(input.periodStart));
  const invoiceNumber = input.invoiceNumber.trim();
  const currencyCode = input.currencyCode.trim().toUpperCase();
  const checksumSha256 = createHash("sha256").update(input.file.bytes).digest("hex");

  validateInvoiceUploadInput({
    invoiceNumber,
    declaredAmount: input.declaredAmount,
    currencyCode,
    file: input.file,
  });

  const uploadContext = await getApprovedTimesheetForInvoiceUpload({
    memberId: input.memberId,
    periodStart,
  });

  const objectKey = buildContractorInvoiceObjectKey({
    memberId: input.memberId,
    periodStart,
    revisionNumber: uploadContext.revisionNumber,
    originalFilename: input.file.originalFilename,
  });

  const objectRef = await storage.putObject({
    key: objectKey,
    body: input.file.bytes,
    contentType: input.file.contentType,
    byteSize: input.file.byteSize,
  });

  try {
    return await prisma.$transaction(async (tx) => {
      const timesheet = await tx.timesheet.findUnique({
        where: {
          id: uploadContext.timesheetId,
        },
        select: {
          id: true,
          status: true,
          currentRevisionId: true,
          currentRevision: {
            select: {
              id: true,
              revisionNumber: true,
              totalMinutes: true,
              totalAmount: true,
              currencyCode: true,
            },
          },
          invoices: {
            where: {
              timesheetRevisionId: uploadContext.timesheetRevisionId,
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select: {
              id: true,
              role: true,
              status: true,
              declaredAmount: true,
              currencyCode: true,
              referencesInvoiceId: true,
              replacedByInvoiceId: true,
            },
          },
        },
      });

      if (!timesheet || !timesheet.currentRevision) {
        throw new ContractorInvoiceUploadError("Approved timesheet not found.");
      }

      if (timesheet.status !== "APPROVED" && timesheet.status !== "INVOICE_REJECTED") {
        throw new ContractorInvoiceUploadError("Timesheet must be approved before invoice upload.");
      }

      if (timesheet.currentRevisionId !== uploadContext.timesheetRevisionId) {
        throw new ContractorInvoiceUploadError("Timesheet revision changed during upload.");
      }

      const workflow = resolveInvoiceUploadWorkflow({
        status: timesheet.status,
        invoices: timesheet.invoices,
      });

      if (input.invoiceRole && input.invoiceRole !== workflow.invoiceRole) {
        throw new ContractorInvoiceUploadError(getInvoiceRoleMismatchMessage(workflow.invoiceRole));
      }

      validateInvoiceWorkflowInput({
        invoiceRole: workflow.invoiceRole,
        declaredAmount: input.declaredAmount,
        currencyCode,
        revisionCurrencyCode: timesheet.currentRevision.currencyCode,
        targetInvoice: workflow.targetInvoice,
      });

      const document = await tx.document.create({
        data: {
          type: "CONTRACTOR_INVOICE",
          status: "AVAILABLE",
          ownerMemberId: input.memberId,
          storageBucket: objectRef.bucket,
          storageKey: objectRef.key,
          originalFilename: input.file.originalFilename,
          contentType: input.file.contentType,
          byteSize: BigInt(input.file.byteSize),
          checksumSha256,
          uploadedByMemberId: input.actorMemberId,
        },
        select: {
          id: true,
        },
      });

      const invoice = await tx.contractorInvoice.create({
        data: {
          timesheetId: timesheet.id,
          timesheetRevisionId: timesheet.currentRevision.id,
          documentId: document.id,
          role: workflow.invoiceRole,
          status: "UPLOADED",
          invoiceNumber,
          declaredAmount: input.declaredAmount,
          currencyCode,
          referencesInvoiceId: workflow.referencesInvoiceId,
          uploadedByMemberId: input.actorMemberId,
        },
        select: {
          id: true,
          invoiceNumber: true,
        },
      });

      if (workflow.replacedInvoiceId) {
        await tx.contractorInvoice.update({
          where: {
            id: workflow.replacedInvoiceId,
          },
          data: {
            status: "REPLACED",
            replacedByInvoiceId: invoice.id,
          },
          select: {
            id: true,
          },
        });
      }

      if (workflow.movesTimesheetToInvoiced) {
        await tx.timesheet.update({
          where: {
            id: timesheet.id,
          },
          data: {
            status: "INVOICED",
            updatedByMemberId: input.actorMemberId,
          },
          select: {
            id: true,
          },
        });

        await tx.timesheetRevision.update({
          where: {
            id: timesheet.currentRevision.id,
          },
          data: {
            status: "INVOICED",
          },
          select: {
            id: true,
          },
        });
      }

      const eventMetadata = buildInvoiceUploadMetadata({
        invoiceId: invoice.id,
        documentId: document.id,
        documentStorageKey: objectRef.key,
        invoiceNumber: invoice.invoiceNumber,
        declaredAmount: input.declaredAmount,
        currencyCode,
        invoiceRole: workflow.invoiceRole,
        replacedInvoiceId: workflow.replacedInvoiceId,
        referencesInvoiceId: workflow.referencesInvoiceId,
        byteSize: input.file.byteSize,
        checksumSha256,
        revision: timesheet.currentRevision,
      });

      await tx.timesheetEvent.create({
        data: {
          timesheetId: timesheet.id,
          timesheetRevisionId: timesheet.currentRevision.id,
          eventType: "INVOICE_UPLOADED",
          actorMemberId: input.actorMemberId,
          reason: null,
          metadata: eventMetadata,
          createdAt: now,
        },
      });

      await tx.auditLog.create({
        data: {
          actorMemberId: input.actorMemberId,
          action: "invoice.uploaded",
          targetType: "contractor_invoice",
          targetId: invoice.id,
          after: {
            ...eventMetadata,
            timesheetId: timesheet.id,
            timesheetRevisionId: timesheet.currentRevision.id,
            status: "UPLOADED",
          },
          ...input.requestMetadata,
        },
      });

      return {
        invoiceId: invoice.id,
        documentId: document.id,
        timesheetId: timesheet.id,
        timesheetRevisionId: timesheet.currentRevision.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceRole: workflow.invoiceRole,
        status: "UPLOADED" as const,
      };
    });
  } catch (error) {
    await storage.deleteObject(objectRef).catch(() => undefined);
    throw error;
  }
}

async function getApprovedTimesheetForInvoiceUpload(input: {
  memberId: string;
  periodStart: Date;
}) {
  const [member, timesheet] = await Promise.all([
    prisma.member.findUnique({
      where: {
        id: input.memberId,
      },
      select: {
        id: true,
        currentProfile: true,
        deletedAt: true,
      },
    }),
    prisma.timesheet.findUnique({
      where: {
        contractorMemberId_periodStart: {
          contractorMemberId: input.memberId,
          periodStart: input.periodStart,
        },
      },
      select: {
        id: true,
        status: true,
        currentRevisionId: true,
        currentRevision: {
          select: {
            id: true,
            revisionNumber: true,
          },
        },
        invoices: {
          select: {
            id: true,
            role: true,
            status: true,
            referencesInvoiceId: true,
          },
        },
      },
    }),
  ]);

  if (!member || member.deletedAt) {
    throw new ContractorInvoiceUploadError("Member not found.");
  }

  if (member.currentProfile !== "CONTRACTOR") {
    throw new ContractorInvoiceUploadError("Contractor profile required.");
  }

  if (!timesheet || !timesheet.currentRevisionId || !timesheet.currentRevision) {
    throw new ContractorInvoiceUploadError("Approved timesheet not found.");
  }

  if (timesheet.status !== "APPROVED" && timesheet.status !== "INVOICE_REJECTED") {
    throw new ContractorInvoiceUploadError("Timesheet must be approved before invoice upload.");
  }

  if (
    timesheet.invoices.some(
      (invoice) =>
        isMainInvoiceRole(invoice.role) &&
        (invoice.status === "UPLOADED" || invoice.status === "ACCEPTED"),
    )
  ) {
    throw new ContractorInvoiceUploadError("Invoice already uploaded for this timesheet.");
  }

  return {
    timesheetId: timesheet.id,
    timesheetRevisionId: timesheet.currentRevision.id,
    revisionNumber: timesheet.currentRevision.revisionNumber,
  };
}

function validateInvoiceUploadInput(input: {
  invoiceNumber: string;
  declaredAmount: string;
  currencyCode: string;
  file: UploadContractorInvoiceInput["file"];
}) {
  if (!input.invoiceNumber) {
    throw new ContractorInvoiceUploadError("Invoice number is required.");
  }

  const amountCents = parseMoneyToCents(input.declaredAmount);

  if (amountCents === null || amountCents === 0) {
    throw new ContractorInvoiceUploadError("Invoice amount is invalid.");
  }

  if (!isSupportedCurrencyCode(input.currencyCode)) {
    throw new ContractorInvoiceUploadError("Invoice currency is invalid.");
  }

  if (input.file.byteSize <= 0) {
    throw new ContractorInvoiceUploadError("Invoice PDF is required.");
  }

  if (input.file.byteSize > CONTRACTOR_INVOICE_MAX_BYTES) {
    throw new ContractorInvoiceUploadError("Invoice PDF is too large.");
  }

  if (input.file.contentType !== "application/pdf") {
    throw new ContractorInvoiceUploadError("Invoice must be a PDF.");
  }

  if (!input.file.originalFilename.toLowerCase().endsWith(".pdf")) {
    throw new ContractorInvoiceUploadError("Invoice must be a PDF.");
  }

  if (!input.file.bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throw new ContractorInvoiceUploadError("Invoice must be a PDF.");
  }
}

type InvoiceWorkflowRecord = {
  id: string;
  role: "ORIGINAL" | "REPLACEMENT" | "CANCELLATION" | "CORRECTED";
  status: "UPLOADED" | "ACCEPTED" | "REJECTED" | "REPLACED" | "CANCELLED" | "DELETED";
  declaredAmount: Prisma.Decimal;
  currencyCode: string;
  referencesInvoiceId: string | null;
  replacedByInvoiceId: string | null;
};

type InvoiceUploadWorkflow = {
  invoiceRole: ContractorInvoiceUploadRole;
  targetInvoice: InvoiceWorkflowRecord | null;
  referencesInvoiceId: string | null;
  replacedInvoiceId: string | null;
  movesTimesheetToInvoiced: boolean;
};

function resolveInvoiceUploadWorkflow(input: {
  status: "APPROVED" | "INVOICE_REJECTED" | string;
  invoices: InvoiceWorkflowRecord[];
}): InvoiceUploadWorkflow {
  const activeMainInvoice = input.invoices.find(
    (invoice) =>
      isMainInvoiceRole(invoice.role) &&
      (invoice.status === "UPLOADED" || invoice.status === "ACCEPTED"),
  );

  if (activeMainInvoice) {
    throw new ContractorInvoiceUploadError("Invoice already uploaded for this timesheet.");
  }

  if (input.status === "APPROVED") {
    return {
      invoiceRole: "ORIGINAL",
      targetInvoice: null,
      referencesInvoiceId: null,
      replacedInvoiceId: null,
      movesTimesheetToInvoiced: true,
    };
  }

  if (input.status !== "INVOICE_REJECTED") {
    throw new ContractorInvoiceUploadError("Timesheet must be approved before invoice upload.");
  }

  const rejectedInvoice = input.invoices.find(
    (invoice) => isMainInvoiceRole(invoice.role) && invoice.status === "REJECTED",
  );

  if (!rejectedInvoice) {
    throw new ContractorInvoiceUploadError("Rejected invoice not found.");
  }

  const cancellationInvoice = input.invoices.find(
    (invoice) =>
      invoice.role === "CANCELLATION" &&
      invoice.referencesInvoiceId === rejectedInvoice.id &&
      invoice.status !== "DELETED",
  );

  if (!cancellationInvoice) {
    return {
      invoiceRole: "CANCELLATION",
      targetInvoice: rejectedInvoice,
      referencesInvoiceId: rejectedInvoice.id,
      replacedInvoiceId: null,
      movesTimesheetToInvoiced: false,
    };
  }

  return {
    invoiceRole: "REPLACEMENT",
    targetInvoice: rejectedInvoice,
    referencesInvoiceId: null,
    replacedInvoiceId: rejectedInvoice.id,
    movesTimesheetToInvoiced: true,
  };
}

function validateInvoiceWorkflowInput(input: {
  invoiceRole: ContractorInvoiceUploadRole;
  declaredAmount: string;
  currencyCode: string;
  revisionCurrencyCode: string;
  targetInvoice: InvoiceWorkflowRecord | null;
}) {
  const amountCents = parseMoneyToCents(input.declaredAmount);

  if (amountCents === null || amountCents === 0) {
    throw new ContractorInvoiceUploadError("Invoice amount is invalid.");
  }

  if (input.invoiceRole === "CANCELLATION") {
    if (!input.targetInvoice) {
      throw new ContractorInvoiceUploadError("Rejected invoice not found.");
    }

    if (amountCents >= 0) {
      throw new ContractorInvoiceUploadError("Cancellation invoice amount must be negative.");
    }

    const rejectedAmountCents = parseMoneyToCents(input.targetInvoice.declaredAmount.toString());

    if (rejectedAmountCents === null || amountCents !== -rejectedAmountCents) {
      throw new ContractorInvoiceUploadError(
        "Cancellation invoice amount must negate the rejected invoice amount.",
      );
    }

    if (input.currencyCode !== input.targetInvoice.currencyCode) {
      throw new ContractorInvoiceUploadError(
        "Cancellation invoice currency must match the rejected invoice currency.",
      );
    }

    return;
  }

  if (amountCents <= 0) {
    throw new ContractorInvoiceUploadError("Invoice amount must be positive.");
  }

  if (input.currencyCode !== input.revisionCurrencyCode) {
    throw new ContractorInvoiceUploadError(
      "Invoice currency must match the approved timesheet currency.",
    );
  }
}

function getInvoiceRoleMismatchMessage(expectedRole: ContractorInvoiceUploadRole) {
  if (expectedRole === "CANCELLATION") {
    return "Cancellation invoice is required before replacement invoice.";
  }

  if (expectedRole === "REPLACEMENT") {
    return "Replacement invoice is required after the cancellation invoice.";
  }

  return "Invoice upload step is invalid.";
}

function isMainInvoiceRole(role: InvoiceWorkflowRecord["role"]) {
  return role === "ORIGINAL" || role === "REPLACEMENT" || role === "CORRECTED";
}

function parseMoneyToCents(value: string) {
  const normalized = value.trim();
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);

  if (!match) return null;

  const [, sign, whole, fraction = ""] = match;
  const cents = Number.parseInt(whole, 10) * 100 + Number.parseInt(fraction.padEnd(2, "0"), 10);

  return sign === "-" ? -cents : cents;
}

function buildContractorInvoiceObjectKey(input: {
  memberId: string;
  periodStart: Date;
  revisionNumber: number;
  originalFilename: string;
}) {
  const safeFilename = sanitizeFilename(input.originalFilename);

  return [
    "contractor-invoices",
    input.memberId,
    formatDateOnly(input.periodStart),
    `revision-${input.revisionNumber}`,
    `${randomUUID()}-${safeFilename}`,
  ].join("/");
}

function sanitizeFilename(filename: string) {
  const normalized = filename.trim().replaceAll(/[^a-zA-Z0-9._-]/g, "-");
  return normalized || "invoice.pdf";
}

function buildInvoiceUploadMetadata(input: {
  invoiceId: string;
  documentId: string;
  documentStorageKey: string;
  invoiceNumber: string;
  declaredAmount: string;
  currencyCode: string;
  invoiceRole: ContractorInvoiceUploadRole;
  replacedInvoiceId: string | null;
  referencesInvoiceId: string | null;
  byteSize: number;
  checksumSha256: string;
  revision: {
    id: string;
    revisionNumber: number;
    totalMinutes: number;
    totalAmount: Prisma.Decimal;
    currencyCode: string;
  };
}): Prisma.InputJsonObject {
  return {
    invoiceId: input.invoiceId,
    documentId: input.documentId,
    documentStorageKey: input.documentStorageKey,
    invoiceNumber: input.invoiceNumber,
    declaredAmount: input.declaredAmount,
    invoiceCurrencyCode: input.currencyCode,
    invoiceRole: input.invoiceRole,
    replacedInvoiceId: input.replacedInvoiceId,
    referencesInvoiceId: input.referencesInvoiceId,
    byteSize: input.byteSize,
    checksumSha256: input.checksumSha256,
    revisionId: input.revision.id,
    revisionNumber: input.revision.revisionNumber,
    timesheetTotalMinutes: input.revision.totalMinutes,
    timesheetTotalAmount: input.revision.totalAmount.toString(),
    timesheetCurrencyCode: input.revision.currencyCode,
  };
}
