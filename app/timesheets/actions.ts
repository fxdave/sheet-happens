"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";

import { formatList } from "@/src/lib/formatting";
import { isSupportedCurrencyCode, normalizeCurrencyCode } from "@/src/lib/member-preferences";
import { requireActiveAppMemberForAction } from "@/src/server/auth/app-access";
import { AuthenticationError, AuthorizationError } from "@/src/server/auth/session";
import { Prisma } from "@/src/server/db/generated/client";
import {
  CONTRACTOR_INVOICE_MAX_BYTES,
  contractorInvoiceFieldsSchema,
  ContractorInvoiceUploadError,
  normalizeInvoiceContentType,
  uploadContractorInvoice,
  type ContractorInvoiceUploadRequestMetadata,
} from "@/src/server/invoices";
import { ObjectStorageConfigurationError } from "@/src/server/storage";
import {
  parseTimesheetMonthParam,
  submitContractorTimesheet,
  TimesheetSubmissionError,
  type TimesheetSubmissionRequestMetadata,
} from "@/src/server/timesheets";

export type TimesheetActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

type TimesheetActionsTranslator = Awaited<ReturnType<typeof getTranslations>>;

const submitTimesheetSchema = z.object({
  periodStart: z.string().trim().min(1),
});

const uploadInvoiceSchema = contractorInvoiceFieldsSchema.extend({
  periodStart: z.string().trim().min(1),
});

const submissionErrorKeys: Record<string, string> = {
  "Member not found.": "errors.memberNotFound",
  "Contractor profile required.": "errors.contractorRequired",
  "This month is already locked by a submitted timesheet.": "errors.monthLocked",
  "This month is not open for submission.": "errors.monthNotOpen",
  "No time entries exist for this month.": "errors.noEntries",
  "Timesheet has entries already locked by another timesheet.": "errors.entriesAlreadyLocked",
  "Timesheet has entries without a project assignment.": "errors.missingProjectAssignment",
  "Timesheet has entries with invalid durations.": "errors.invalidDurations",
  "Timesheet has entries with missing descriptions.": "errors.missingDescriptions",
  "Missing rates for one or more entries.": "errors.missingRates",
  "Timesheet month contains multiple currencies.": "errors.mixedCurrency",
  "Timesheet source entries changed during submission. Try again.": "errors.entriesChanged",
  "Declared hours are missing their proof.": "errors.declaredProofMissing",
};

const invoiceUploadErrorResults: Record<string, string> = {
  "Member not found.": "memberNotFound",
  "Contractor profile required.": "contractorRequired",
  "Approved timesheet not found.": "invoiceApprovedRequired",
  "Timesheet must be approved before invoice upload.": "invoiceApprovedRequired",
  "Timesheet revision changed during upload.": "invoiceRevisionChanged",
  "Invoice already uploaded for this timesheet.": "invoiceAlreadyUploaded",
  "Rejected invoice not found.": "invoiceRejectedNotFound",
  "Cancellation invoice is required before replacement invoice.": "invoiceCancellationRequired",
  "Replacement invoice is required after the cancellation invoice.": "invoiceReplacementRequired",
  "Invoice upload step is invalid.": "invoiceInvalidStep",
  "Invoice PDF is required.": "invoiceFileRequired",
  "Invoice PDF is too large.": "invoiceFileTooLarge",
  "Invoice must be a PDF.": "invoicePdfRequired",
  "Invoice number is required.": "invoiceNumberRequired",
  "Invoice amount is invalid.": "invoiceAmountInvalid",
  "Invoice amount must be positive.": "invoiceAmountInvalid",
  "Cancellation invoice amount must be negative.": "invoiceCancellationAmountInvalid",
  "Cancellation invoice amount must negate the rejected invoice amount.":
    "invoiceCancellationAmountInvalid",
  "Cancellation invoice currency must match the rejected invoice currency.":
    "invoiceCancellationCurrencyInvalid",
  "Invoice currency must match the approved timesheet currency.": "invoiceCurrencyMismatch",
  "Invoice currency is invalid.": "invoiceCurrencyInvalid",
};

export async function submitTimesheetAction(input: {
  periodStart: string;
}): Promise<TimesheetActionState> {
  const t = await getTranslations("TimesheetActions");
  const parsed = submitTimesheetSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: t("errors.invalidMonth"),
    };
  }

  const periodStart = parseTimesheetMonthParam(parsed.data.periodStart.slice(0, 7));

  if (!periodStart) {
    return {
      status: "error",
      message: t("errors.invalidMonth"),
    };
  }

  try {
    const { member } = await requireActiveAppMemberForAction();

    if (member.currentProfile !== "CONTRACTOR") {
      throw new AuthorizationError("Contractor profile required.");
    }

    await submitContractorTimesheet({
      memberId: member.id,
      actorMemberId: member.id,
      periodStart,
      requestMetadata: await getTimesheetRequestMetadata(),
    });

    revalidatePath("/timesheets");
    revalidatePath("/time");

    return {
      status: "success",
      message: t("success.submitted"),
    };
  } catch (error) {
    return mapTimesheetActionError(error, t, await getLocale());
  }
}

export async function uploadContractorInvoiceAction(formData: FormData): Promise<never> {
  const parsed = uploadInvoiceSchema.safeParse({
    periodStart: formData.get("periodStart"),
    invoiceRole: formData.get("invoiceRole"),
    invoiceNumber: formData.get("invoiceNumber"),
    declaredAmount: formData.get("declaredAmount"),
    currencyCode: formData.get("currencyCode"),
  });
  const rawMonth = String(formData.get("periodStart") ?? "");
  const month = rawMonth.slice(0, 7);

  if (!parsed.success) {
    redirectToTimesheetsWithResult(month, "invoiceInvalidInput");
  }

  const periodStart = parseTimesheetMonthParam(parsed.data.periodStart.slice(0, 7));
  const currencyCode = normalizeCurrencyCode(parsed.data.currencyCode);

  if (!periodStart) {
    redirectToTimesheetsWithResult(month, "invoiceInvalidMonth");
  }

  if (!isSupportedCurrencyCode(currencyCode)) {
    redirectToTimesheetsWithResult(month, "invoiceCurrencyInvalid");
  }

  const file = formData.get("invoiceFile");

  if (!(file instanceof File)) {
    redirectToTimesheetsWithResult(month, "invoiceFileRequired");
  }

  if (file.size <= 0) {
    redirectToTimesheetsWithResult(month, "invoiceFileRequired");
  }

  if (file.size > CONTRACTOR_INVOICE_MAX_BYTES) {
    redirectToTimesheetsWithResult(month, "invoiceFileTooLarge");
  }

  const normalizedContentType = normalizeInvoiceContentType(file);
  let result =
    parsed.data.invoiceRole === "CANCELLATION"
      ? "invoiceCancellationUploaded"
      : parsed.data.invoiceRole === "REPLACEMENT"
        ? "invoiceReplacementUploaded"
        : "invoiceUploaded";

  try {
    const { member } = await requireActiveAppMemberForAction();

    if (member.currentProfile !== "CONTRACTOR") {
      throw new AuthorizationError("Contractor profile required.");
    }

    await uploadContractorInvoice({
      memberId: member.id,
      actorMemberId: member.id,
      periodStart,
      invoiceRole: parsed.data.invoiceRole,
      invoiceNumber: parsed.data.invoiceNumber,
      declaredAmount: parsed.data.declaredAmount,
      currencyCode,
      file: {
        bytes: Buffer.from(await file.arrayBuffer()),
        originalFilename: file.name || "invoice.pdf",
        contentType: normalizedContentType,
        byteSize: file.size,
      },
      requestMetadata: await getInvoiceUploadRequestMetadata(),
    });

    revalidatePath("/timesheets");
    revalidatePath("/admin/timesheets");
    revalidatePath("/time");
  } catch (error) {
    console.error("[timesheets] invoice upload failed", error);

    if (error instanceof ContractorInvoiceUploadError) {
      result = invoiceUploadErrorResults[error.message] ?? "invoiceFailed";
    } else if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      result = "notAllowed";
    } else if (error instanceof ObjectStorageConfigurationError) {
      result = "invoiceStorageMissing";
    } else if (error instanceof Prisma.PrismaClientInitializationError) {
      result = "databaseUnavailable";
    } else {
      result = "invoiceFailed";
    }
  }

  redirectToTimesheetsWithResult(month, result);
}

async function getTimesheetRequestMetadata(): Promise<TimesheetSubmissionRequestMetadata> {
  const requestHeaders = await headers();

  return {
    ipAddress: requestHeaders.get("x-forwarded-for"),
    userAgent: requestHeaders.get("user-agent"),
  };
}

async function getInvoiceUploadRequestMetadata(): Promise<ContractorInvoiceUploadRequestMetadata> {
  const requestHeaders = await headers();

  return {
    ipAddress: requestHeaders.get("x-forwarded-for"),
    userAgent: requestHeaders.get("user-agent"),
  };
}

function redirectToTimesheetsWithResult(month: string, result: string): never {
  const params = new URLSearchParams();

  if (month) {
    params.set("month", month);
  }

  params.set("result", result);

  redirect(`/timesheets?${params.toString()}`);
}

function mapTimesheetActionError(
  error: unknown,
  t: TimesheetActionsTranslator,
  locale: string,
): TimesheetActionState {
  console.error("[timesheets] action failed", error);

  if (error instanceof TimesheetSubmissionError) {
    const key = submissionErrorKeys[error.message] ?? "errors.submitFailed";

    return {
      status: "error",
      /* "Upload the proof" with nothing to point at sends someone back to guess which row it
         meant, so the refusal names the projects it is about. Only this message takes them, and
         `formatList` is what keeps the joining a locale decision rather than a comma. */
      message: error.projectNames.length
        ? t(key, { projects: formatList(error.projectNames, locale) })
        : t(key),
    };
  }

  if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
    return {
      status: "error",
      message: t("errors.notAllowed"),
    };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      status: "error",
      message: t("errors.databaseUnavailable"),
    };
  }

  return {
    status: "error",
    message: t("errors.submitFailed"),
  };
}
