import { describe, expect, it, vi } from "vitest";

import type { ContractorTimesheetMonthlyPreview } from "./monthly-preview";
import { fromPreview, listContractorTimesheetStatuses } from "./status";

function preview(overrides: Partial<ContractorTimesheetMonthlyPreview>) {
  return {
    selectedMonth: "2026-07",
    status: "not_created",
    source: "current_time_entries",
    revisionNumber: null,
    submittedAt: null,
    approvedAt: null,
    acceptedAt: null,
    paidAt: null,
    rejectedAt: null,
    rejectionReason: null,
    totalMinutes: 8070,
    totalAmount: "8062.00",
    currencyCode: "EUR",
    invoice: null,
    ...overrides,
  } as ContractorTimesheetMonthlyPreview;
}

describe("fromPreview", () => {
  it("reports a month without a timesheet as not_submitted with live totals", () => {
    expect(fromPreview(preview({}))).toMatchObject({
      month: "2026-07",
      status: "not_submitted",
      revisionNumber: null,
      totals: { source: "live", minutes: 8070, amount: "8062.00", currencyCode: "EUR" },
      invoice: { status: "none" },
    });
  });

  it("carries the rejection reason and the latest invoice", () => {
    const status = fromPreview(
      preview({
        status: "invoice_rejected",
        source: "timesheet_snapshot",
        revisionNumber: 2,
        rejectionReason: null,
        invoice: {
          id: "i1",
          invoiceNumber: "INV-1",
          status: "rejected",
          role: "original",
          declaredAmount: "1.00",
          currencyCode: "EUR",
          originalFilename: "a.pdf",
          uploadedAt: "2026-08-02T00:00:00.000Z",
          rejectionReason: "Wrong bank account",
          referencesInvoiceId: null,
          replacedByInvoiceId: null,
        },
      }),
    );

    expect(status).toMatchObject({
      status: "invoice_rejected",
      revisionNumber: 2,
      totals: { source: "snapshot" },
      invoice: {
        status: "rejected",
        invoiceNumber: "INV-1",
        rejectionReason: "Wrong bank account",
      },
    });
  });
});

describe("listContractorTimesheetStatuses", () => {
  function db(profile = "CONTRACTOR", records: unknown[] = []) {
    return {
      member: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: "m1", currentProfile: profile, deletedAt: null }),
      },
      timesheet: { findMany: vi.fn().mockResolvedValue(records) },
    };
  }

  it("returns all twelve months newest first, filling the gaps", async () => {
    const client = db("CONTRACTOR", [
      {
        periodStart: new Date("2026-10-01T00:00:00.000Z"),
        status: "REJECTED",
        currentRevisionNumber: 1,
        submittedAt: new Date("2026-11-01T00:00:00.000Z"),
        approvedAt: null,
        acceptedAt: null,
        paidAt: null,
        currentRevision: {
          revisionNumber: 1,
          submittedAt: new Date("2026-11-01T00:00:00.000Z"),
          approvedAt: null,
          acceptedAt: null,
          paidAt: null,
          rejectedAt: new Date("2026-11-02T00:00:00.000Z"),
          rejectionReason: "Missing Friday",
          totalMinutes: 8040,
          totalAmount: { toString: () => "8040.00" },
          currencyCode: "EUR",
        },
        invoices: [],
      },
    ]);

    const months = await listContractorTimesheetStatuses(
      { memberId: "m1", year: 2026 },
      { db: client },
    );

    expect(months.map((month) => month.month)).toEqual([
      "2026-12",
      "2026-11",
      "2026-10",
      "2026-09",
      "2026-08",
      "2026-07",
      "2026-06",
      "2026-05",
      "2026-04",
      "2026-03",
      "2026-02",
      "2026-01",
    ]);
    expect(months[0]).toMatchObject({ status: "not_submitted", totals: { source: "none" } });
    expect(months[2]).toMatchObject({
      status: "rejected",
      rejectedAt: "2026-11-02T00:00:00.000Z",
      rejectionReason: "Missing Friday",
      totals: { source: "snapshot", minutes: 8040, amount: "8040.00" },
    });
    expect(client.timesheet.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          contractorMemberId: "m1",
          periodStart: {
            gte: new Date("2026-01-01T00:00:00.000Z"),
            lte: new Date("2026-12-01T00:00:00.000Z"),
          },
        },
      }),
    );
  });

  it("refuses an employee", async () => {
    await expect(
      listContractorTimesheetStatuses({ memberId: "m1", year: 2026 }, { db: db("EMPLOYEE") }),
    ).rejects.toThrow("Contractor profile required.");
  });
});
