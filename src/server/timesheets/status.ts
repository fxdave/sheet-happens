import { prisma } from "@/src/server/db/client";
import { formatDateOnly } from "@/src/server/time-tracking";

import {
  getContractorTimesheetMonthlyPreview,
  TimesheetPreviewError,
  type ContractorTimesheetMonthlyPreview,
} from "./monthly-preview";

/** `not_submitted` stands for the preview's derived `not_created`/`missing`: no timesheet row yet. */
export type ContractorTimesheetStatusValue =
  | "not_submitted"
  | "submitted"
  | "rejected"
  | "approved"
  | "invoiced"
  | "invoice_rejected"
  | "accepted"
  | "paid";

export type ContractorTimesheetInvoiceStatusValue =
  "none" | "uploaded" | "accepted" | "rejected" | "replaced" | "cancelled" | "deleted";

/** One contractor month as a polling client sees it. */
export type ContractorTimesheetStatus = {
  month: string;
  status: ContractorTimesheetStatusValue;
  revisionNumber: number | null;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  acceptedAt: string | null;
  paidAt: string | null;
  /** The reviewer's reason on the current revision, when hours were rejected. */
  rejectionReason: string | null;
  /** `snapshot`: the revision's frozen totals; `live`: current entries; `none`: not computed (lists). */
  totals: {
    source: "snapshot" | "live" | "none";
    minutes: number;
    amount: string | null;
    currencyCode: string | null;
  };
  invoice: {
    status: ContractorTimesheetInvoiceStatusValue;
    invoiceNumber: string | null;
    role: "original" | "replacement" | "cancellation" | "corrected" | null;
    rejectionReason: string | null;
  };
};

/** One month through the same read the `/timesheets` page renders, reshaped for the API. */
export async function getContractorTimesheetStatus(input: {
  memberId: string;
  periodStart: Date;
  now?: Date;
}): Promise<ContractorTimesheetStatus> {
  const preview = await getContractorTimesheetMonthlyPreview({
    memberId: input.memberId,
    monthStart: input.periodStart,
    ...(input.now ? { now: input.now } : {}),
  });

  return fromPreview(preview);
}

export function fromPreview(preview: ContractorTimesheetMonthlyPreview): ContractorTimesheetStatus {
  const status = toStatusValue(preview.status);

  return {
    month: preview.selectedMonth,
    status,
    revisionNumber: status === "not_submitted" ? null : preview.revisionNumber,
    submittedAt: preview.submittedAt,
    approvedAt: preview.approvedAt,
    rejectedAt: preview.rejectedAt,
    acceptedAt: preview.acceptedAt,
    paidAt: preview.paidAt,
    rejectionReason: preview.rejectionReason,
    totals: {
      source: preview.source === "timesheet_snapshot" ? "snapshot" : "live",
      minutes: preview.totalMinutes,
      amount: preview.totalAmount,
      currencyCode: preview.currencyCode,
    },
    invoice: preview.invoice
      ? {
          status: preview.invoice.status,
          invoiceNumber: preview.invoice.invoiceNumber,
          role: preview.invoice.role,
          rejectionReason: preview.invoice.rejectionReason,
        }
      : NO_INVOICE,
  };
}

const NO_INVOICE: ContractorTimesheetStatus["invoice"] = {
  status: "none",
  invoiceNumber: null,
  role: null,
  rejectionReason: null,
};

type StatusRecord = {
  periodStart: Date;
  status: string;
  currentRevisionNumber: number;
  submittedAt: Date | null;
  approvedAt: Date | null;
  acceptedAt: Date | null;
  paidAt: Date | null;
  currentRevision: {
    revisionNumber: number;
    submittedAt: Date;
    approvedAt: Date | null;
    acceptedAt: Date | null;
    paidAt: Date | null;
    rejectedAt: Date | null;
    rejectionReason: string | null;
    totalMinutes: number;
    totalAmount: { toString(): string };
    currencyCode: string;
  } | null;
  invoices: {
    status: string;
    role: string;
    invoiceNumber: string;
    rejectionReason: string | null;
  }[];
};

export type TimesheetStatusListClient = {
  member: {
    findUnique: (args: unknown) => Promise<{
      id: string;
      currentProfile: string;
      deletedAt: Date | null;
    } | null>;
  };
  timesheet: { findMany: (args: unknown) => Promise<StatusRecord[]> };
};

/**
 * Every month of `year`, newest first, in one read. A month without a timesheet reports
 * `totals.source: "none"` rather than re-summing live entries for twelve months.
 */
export async function listContractorTimesheetStatuses(
  input: { memberId: string; year: number },
  deps: { db?: TimesheetStatusListClient } = {},
): Promise<ContractorTimesheetStatus[]> {
  const db = deps.db ?? (prisma as unknown as TimesheetStatusListClient);
  const member = await db.member.findUnique({
    where: { id: input.memberId },
    select: { id: true, currentProfile: true, deletedAt: true },
  });

  if (!member || member.deletedAt) throw new TimesheetPreviewError("Member not found.");

  if (member.currentProfile !== "CONTRACTOR") {
    throw new TimesheetPreviewError("Contractor profile required.");
  }

  const yearStart = new Date(Date.UTC(input.year, 0, 1));
  const yearEnd = new Date(Date.UTC(input.year, 11, 1));

  const records = await db.timesheet.findMany({
    where: { contractorMemberId: member.id, periodStart: { gte: yearStart, lte: yearEnd } },
    select: {
      periodStart: true,
      status: true,
      currentRevisionNumber: true,
      submittedAt: true,
      approvedAt: true,
      acceptedAt: true,
      paidAt: true,
      currentRevision: {
        select: {
          revisionNumber: true,
          submittedAt: true,
          approvedAt: true,
          acceptedAt: true,
          paidAt: true,
          rejectedAt: true,
          rejectionReason: true,
          totalMinutes: true,
          totalAmount: true,
          currencyCode: true,
        },
      },
      invoices: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { status: true, role: true, invoiceNumber: true, rejectionReason: true },
      },
    },
  });
  const byMonth = new Map(records.map((record) => [formatDateOnly(record.periodStart), record]));

  return Array.from({ length: 12 }, (_, index) => {
    const monthStart = new Date(Date.UTC(input.year, 11 - index, 1));
    const record = byMonth.get(formatDateOnly(monthStart));

    return record ? fromRecord(record) : notSubmitted(monthStart);
  });
}

function fromRecord(record: StatusRecord): ContractorTimesheetStatus {
  const revision = record.currentRevision;
  // Same pick as the preview: the newest non-cancellation invoice, else the newest of any role.
  const invoice =
    record.invoices.find((candidate) => candidate.role !== "CANCELLATION") ??
    record.invoices.at(0) ??
    null;

  return {
    month: formatDateOnly(record.periodStart).slice(0, 7),
    status: record.status.toLowerCase() as ContractorTimesheetStatusValue,
    revisionNumber: revision?.revisionNumber ?? record.currentRevisionNumber,
    submittedAt: iso(revision?.submittedAt ?? record.submittedAt),
    approvedAt: iso(revision?.approvedAt ?? record.approvedAt),
    rejectedAt: iso(revision?.rejectedAt ?? null),
    acceptedAt: iso(revision?.acceptedAt ?? record.acceptedAt),
    paidAt: iso(revision?.paidAt ?? record.paidAt),
    rejectionReason: revision?.rejectionReason ?? null,
    totals: {
      source: "snapshot",
      minutes: revision?.totalMinutes ?? 0,
      amount: revision ? revision.totalAmount.toString() : null,
      currencyCode: revision?.currencyCode ?? null,
    },
    invoice: invoice
      ? {
          status: invoice.status.toLowerCase() as ContractorTimesheetInvoiceStatusValue,
          invoiceNumber: invoice.invoiceNumber,
          role: invoice.role.toLowerCase() as ContractorTimesheetStatus["invoice"]["role"],
          rejectionReason: invoice.rejectionReason,
        }
      : NO_INVOICE,
  };
}

function notSubmitted(monthStart: Date): ContractorTimesheetStatus {
  return {
    month: formatDateOnly(monthStart).slice(0, 7),
    status: "not_submitted",
    revisionNumber: null,
    submittedAt: null,
    approvedAt: null,
    rejectedAt: null,
    acceptedAt: null,
    paidAt: null,
    rejectionReason: null,
    totals: { source: "none", minutes: 0, amount: null, currencyCode: null },
    invoice: NO_INVOICE,
  };
}

function toStatusValue(status: ContractorTimesheetMonthlyPreview["status"]) {
  return status === "not_created" || status === "missing"
    ? "not_submitted"
    : (status as ContractorTimesheetStatusValue);
}

function iso(value: Date | null) {
  return value?.toISOString() ?? null;
}
