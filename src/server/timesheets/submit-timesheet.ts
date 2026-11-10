import { prisma } from "@/src/server/db/client";
import { formatDateOnly, getMonthStart, normalizeDateOnly } from "@/src/server/time-tracking";

import {
  calculateLineAmountCents,
  centsToMoney,
  getTimesheetMonthEnd,
  resolveTimesheetLineRate,
  type TimesheetPreviewRatePeriod,
  type TimesheetPreviewRateSource,
} from "./monthly-preview";

type TimesheetStatusRecord =
  "SUBMITTED" | "REJECTED" | "APPROVED" | "INVOICED" | "INVOICE_REJECTED" | "ACCEPTED" | "PAID";

type TimesheetEventTypeRecord = "SUBMITTED" | "RESUBMITTED";

export type TimesheetSubmissionRequestMetadata = {
  ipAddress?: string | null;
  userAgent?: string | null;
  channel?: "WEB" | "API";
  clientId?: string;
};

export type SubmitContractorTimesheetInput = {
  memberId: string;
  actorMemberId: string;
  periodStart: Date;
  requestMetadata?: TimesheetSubmissionRequestMetadata;
};

export type SubmitContractorTimesheetResult = {
  timesheetId: string;
  revisionId: string;
  revisionNumber: number;
  entryCount: number;
  totalMinutes: number;
  totalAmount: string;
  currencyCode: string;
};

export class TimesheetSubmissionError extends Error {
  /**
   * The projects a refusal is about, when naming them is what makes it actionable.
   *
   * Carried beside the message rather than interpolated into it, so the action layer keeps looking
   * the message up in one table of stable keys — the same shape `TrackingModeSwitchError` uses for
   * its conflicts.
   */
  readonly projectNames: string[];

  constructor(message: string, projectNames: string[] = []) {
    super(message);
    this.name = "TimesheetSubmissionError";
    this.projectNames = projectNames;
  }
}

type TimesheetSubmissionDb = {
  $transaction<T>(callback: (tx: TimesheetSubmissionTransaction) => Promise<T>): Promise<T>;
};

type SubmissionDeclarationRecord = {
  minutes: number;
  proofDocumentId: string | null;
  project: { name: string };
};

type TimesheetSubmissionTransaction = {
  monthlyHourDeclaration: {
    findMany(args: {
      where: {
        memberId: string;
        periodStart: Date;
      };
      select: {
        minutes: true;
        proofDocumentId: true;
        project: { select: { name: true } };
      };
    }): Promise<SubmissionDeclarationRecord[]>;
  };
  member: {
    findUnique(args: {
      where: { id: string };
      select: {
        id: true;
        currentProfile: true;
        deletedAt: true;
      };
    }): Promise<MemberRecord | null>;
  };
  periodLock: {
    findFirst(args: {
      where: {
        memberId: string;
        periodStart: Date;
        unlockedAt: null;
      };
      select: { id: true };
    }): Promise<{ id: string } | null>;
    create(args: {
      data: {
        memberId: string;
        periodStart: Date;
        timesheetId: string;
        timesheetRevisionId: string;
        lockedAt: Date;
        lockedByMemberId: string;
      };
      select: { id: true };
    }): Promise<{ id: string }>;
  };
  timesheet: {
    findUnique(args: {
      where: {
        contractorMemberId_periodStart: {
          contractorMemberId: string;
          periodStart: Date;
        };
      };
      select: TimesheetSelect;
    }): Promise<TimesheetRecord | null>;
    create(args: {
      data: {
        contractorMemberId: string;
        periodStart: Date;
        periodEnd: Date;
        currencyCode: string;
        status: "SUBMITTED";
        submittedAt: Date;
        createdByMemberId: string;
        updatedByMemberId: string;
      };
      select: TimesheetSelect;
    }): Promise<TimesheetRecord>;
    update(args: {
      where: { id: string };
      data: {
        currencyCode: string;
        status: "SUBMITTED";
        currentRevisionId: string;
        currentRevisionNumber: number;
        submittedAt: Date;
        approvedAt: null;
        acceptedAt: null;
        paidAt: null;
        updatedByMemberId: string;
      };
      select: { id: true };
    }): Promise<{ id: string }>;
  };
  memberDefaultRatePeriod: {
    findMany(args: {
      where: {
        memberId: string;
        validFrom: { lte: Date };
        OR: Array<{ validTo: null } | { validTo: { gt: Date } }>;
      };
      orderBy: Array<{ validFrom: "asc" }>;
      select: RatePeriodSelect;
    }): Promise<TimesheetPreviewRatePeriod[]>;
  };
  timeEntry: {
    findMany(args: {
      where: {
        memberId: string;
        deletedAt: null;
        localDate: {
          gte: Date;
          lte: Date;
        };
      };
      orderBy: Array<{ localDate: "asc" } | { createdAt: "asc" }>;
      select: TimeEntrySelect;
    }): Promise<SubmissionTimeEntryRecord[]>;
    updateMany(args: {
      where: {
        id: { in: string[] };
        memberId: string;
        deletedAt: null;
        lockedByTimesheetRevisionId: null;
      };
      data: {
        lockedByTimesheetRevisionId: string;
        updatedByMemberId: string;
      };
    }): Promise<{ count: number }>;
  };
  timesheetRevision: {
    create(args: {
      data: {
        timesheetId: string;
        revisionNumber: number;
        status: "SUBMITTED";
        createdFromRevisionId: string | null;
        submittedAt: Date;
        currencyCode: string;
        totalMinutes: number;
        totalAmount: string;
        createdByMemberId: string;
      };
      select: { id: true; revisionNumber: true };
    }): Promise<{ id: string; revisionNumber: number }>;
    update(args: {
      where: { id: string };
      data: { supersededByRevisionId: string };
      select: { id: true };
    }): Promise<{ id: string }>;
  };
  timesheetSnapshotLine: {
    createMany(args: { data: TimesheetSnapshotLineInsert[] }): Promise<{ count: number }>;
  };
  timesheetEvent: {
    create(args: {
      data: {
        timesheetId: string;
        timesheetRevisionId: string;
        eventType: TimesheetEventTypeRecord;
        actorMemberId: string;
        reason: null;
        metadata: Record<string, unknown>;
        createdAt: Date;
      };
    }): Promise<unknown>;
  };
  auditLog: {
    create(args: {
      data: {
        actorMemberId: string;
        action: string;
        targetType: "timesheet";
        targetId: string;
        after: Record<string, unknown>;
        ipAddress?: string | null;
        userAgent?: string | null;
      };
    }): Promise<unknown>;
  };
};

type MemberRecord = {
  id: string;
  currentProfile: "EMPLOYEE" | "CONTRACTOR";
  deletedAt: Date | null;
};

type TimesheetSelect = {
  id: true;
  status: true;
  currentRevisionId: true;
  currentRevisionNumber: true;
};

type TimesheetRecord = {
  id: string;
  status: TimesheetStatusRecord;
  currentRevisionId: string | null;
  currentRevisionNumber: number;
};

type RatePeriodSelect = {
  id: true;
  validFrom: true;
  validTo: true;
  hourlyRate: true;
  currencyCode: true;
};

type TimeEntrySelect = {
  id: true;
  memberId: true;
  projectId: true;
  projectAssignmentId: true;
  localDate: true;
  description: true;
  durationMinutes: true;
  lockedByTimesheetRevisionId: true;
  projectAssignment: {
    select: {
      overrideRates: {
        where: {
          validFrom: { lte: Date };
          OR: Array<{ validTo: null } | { validTo: { gt: Date } }>;
        };
        orderBy: Array<{ validFrom: "asc" }>;
        select: RatePeriodSelect;
      };
    };
  };
};

type SubmissionTimeEntryRecord = {
  id: string;
  memberId: string;
  projectId: string;
  projectAssignmentId: string;
  localDate: Date;
  description: string;
  durationMinutes: number;
  lockedByTimesheetRevisionId: string | null;
  projectAssignment: {
    overrideRates: TimesheetPreviewRatePeriod[];
  };
};

type ResolvedSubmissionLine = {
  sourceTimeEntryId: string;
  memberId: string;
  projectId: string;
  projectAssignmentId: string;
  localDate: Date;
  description: string;
  durationMinutes: number;
  rateSource: TimesheetPreviewRateSource;
  sourceRatePeriodId: string;
  hourlyRate: string;
  currencyCode: string;
  lineAmount: string;
  lineAmountCents: number;
};

type TimesheetSnapshotLineInsert = {
  timesheetRevisionId: string;
  sourceTimeEntryId: string;
  memberId: string;
  projectId: string;
  projectAssignmentId: string;
  localDate: Date;
  description: string;
  durationMinutes: number;
  rateSource: TimesheetPreviewRateSource;
  sourceRatePeriodId: string;
  hourlyRate: string;
  currencyCode: string;
  lineAmount: string;
};

const timesheetSelect = {
  id: true,
  status: true,
  currentRevisionId: true,
  currentRevisionNumber: true,
} satisfies TimesheetSelect;

const ratePeriodSelect = {
  id: true,
  validFrom: true,
  validTo: true,
  hourlyRate: true,
  currencyCode: true,
} satisfies RatePeriodSelect;

export async function submitContractorTimesheet(
  input: SubmitContractorTimesheetInput,
  deps: { db?: TimesheetSubmissionDb; now?: Date } = {},
): Promise<SubmitContractorTimesheetResult> {
  const db = deps.db ?? (prisma as unknown as TimesheetSubmissionDb);
  const now = deps.now ?? new Date();
  const periodStart = getMonthStart(normalizeDateOnly(input.periodStart));
  const periodEnd = getTimesheetMonthEnd(periodStart);

  return db.$transaction(async (tx) => {
    const member = await tx.member.findUnique({
      where: {
        id: input.memberId,
      },
      select: {
        id: true,
        currentProfile: true,
        deletedAt: true,
      },
    });

    if (!member || member.deletedAt) {
      throw new TimesheetSubmissionError("Member not found.");
    }

    if (member.currentProfile !== "CONTRACTOR") {
      throw new TimesheetSubmissionError("Contractor profile required.");
    }

    const [activeLock, existingTimesheet, memberRates, entries, declarations] = await Promise.all([
      tx.periodLock.findFirst({
        where: {
          memberId: member.id,
          periodStart,
          unlockedAt: null,
        },
        select: {
          id: true,
        },
      }),
      tx.timesheet.findUnique({
        where: {
          contractorMemberId_periodStart: {
            contractorMemberId: member.id,
            periodStart,
          },
        },
        select: timesheetSelect,
      }),
      tx.memberDefaultRatePeriod.findMany({
        where: {
          memberId: member.id,
          validFrom: {
            lte: periodEnd,
          },
          OR: [{ validTo: null }, { validTo: { gt: periodStart } }],
        },
        orderBy: [{ validFrom: "asc" }],
        select: ratePeriodSelect,
      }),
      tx.timeEntry.findMany({
        where: {
          memberId: member.id,
          deletedAt: null,
          localDate: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        orderBy: [{ localDate: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          memberId: true,
          projectId: true,
          projectAssignmentId: true,
          localDate: true,
          description: true,
          durationMinutes: true,
          lockedByTimesheetRevisionId: true,
          projectAssignment: {
            select: {
              overrideRates: {
                where: {
                  validFrom: {
                    lte: periodEnd,
                  },
                  OR: [{ validTo: null }, { validTo: { gt: periodStart } }],
                },
                orderBy: [{ validFrom: "asc" }],
                select: ratePeriodSelect,
              },
            },
          },
        },
      }),
      /* The proof is what replaces the per-day detail a declared project does not have. Without
         it there is nothing for an admin to check, so a contractor cannot submit the month — a new
         guard beside the existing missing-description and missing-rate ones. Employees have no
         submission gate at all, so for them a missing proof stays a warning on `/time`. */
      tx.monthlyHourDeclaration.findMany({
        where: {
          memberId: member.id,
          periodStart,
        },
        select: {
          minutes: true,
          proofDocumentId: true,
          project: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    if (activeLock) {
      throw new TimesheetSubmissionError("This month is already locked by a submitted timesheet.");
    }

    if (existingTimesheet && existingTimesheet.status !== "REJECTED") {
      throw new TimesheetSubmissionError("This month is not open for submission.");
    }

    assertDeclaredHoursHaveProof(declarations);

    const lines = resolveSubmissionLines({
      entries,
      memberRates,
    });
    const totals = getSubmissionTotals(lines);
    const eventType: TimesheetEventTypeRecord = existingTimesheet ? "RESUBMITTED" : "SUBMITTED";
    const auditAction = existingTimesheet ? "timesheet.resubmitted" : "timesheet.submitted";

    const timesheet =
      existingTimesheet ??
      (await tx.timesheet.create({
        data: {
          contractorMemberId: member.id,
          periodStart,
          periodEnd,
          currencyCode: totals.currencyCode,
          status: "SUBMITTED",
          submittedAt: now,
          createdByMemberId: input.actorMemberId,
          updatedByMemberId: input.actorMemberId,
        },
        select: timesheetSelect,
      }));

    const revisionNumber = timesheet.currentRevisionNumber + 1;
    const revision = await tx.timesheetRevision.create({
      data: {
        timesheetId: timesheet.id,
        revisionNumber,
        status: "SUBMITTED",
        createdFromRevisionId: existingTimesheet?.currentRevisionId ?? null,
        submittedAt: now,
        currencyCode: totals.currencyCode,
        totalMinutes: totals.totalMinutes,
        totalAmount: totals.totalAmount,
        createdByMemberId: input.actorMemberId,
      },
      select: {
        id: true,
        revisionNumber: true,
      },
    });

    if (existingTimesheet?.currentRevisionId) {
      await tx.timesheetRevision.update({
        where: {
          id: existingTimesheet.currentRevisionId,
        },
        data: {
          supersededByRevisionId: revision.id,
        },
        select: {
          id: true,
        },
      });
    }

    await tx.timesheetSnapshotLine.createMany({
      data: lines.map((line) => ({
        timesheetRevisionId: revision.id,
        sourceTimeEntryId: line.sourceTimeEntryId,
        memberId: line.memberId,
        projectId: line.projectId,
        projectAssignmentId: line.projectAssignmentId,
        localDate: line.localDate,
        description: line.description,
        durationMinutes: line.durationMinutes,
        rateSource: line.rateSource,
        sourceRatePeriodId: line.sourceRatePeriodId,
        hourlyRate: line.hourlyRate,
        currencyCode: line.currencyCode,
        lineAmount: line.lineAmount,
      })),
    });

    await tx.timesheet.update({
      where: {
        id: timesheet.id,
      },
      data: {
        currencyCode: totals.currencyCode,
        status: "SUBMITTED",
        currentRevisionId: revision.id,
        currentRevisionNumber: revision.revisionNumber,
        submittedAt: now,
        approvedAt: null,
        acceptedAt: null,
        paidAt: null,
        updatedByMemberId: input.actorMemberId,
      },
      select: {
        id: true,
      },
    });

    await tx.periodLock.create({
      data: {
        memberId: member.id,
        periodStart,
        timesheetId: timesheet.id,
        timesheetRevisionId: revision.id,
        lockedAt: now,
        lockedByMemberId: input.actorMemberId,
      },
      select: {
        id: true,
      },
    });

    const entryIds = lines.map((line) => line.sourceTimeEntryId);
    const lockedEntries = await tx.timeEntry.updateMany({
      where: {
        id: {
          in: entryIds,
        },
        memberId: member.id,
        deletedAt: null,
        lockedByTimesheetRevisionId: null,
      },
      data: {
        lockedByTimesheetRevisionId: revision.id,
        updatedByMemberId: input.actorMemberId,
      },
    });

    if (lockedEntries.count !== entryIds.length) {
      throw new TimesheetSubmissionError(
        "Timesheet source entries changed during submission. Try again.",
      );
    }

    const eventMetadata = buildSubmissionMetadata({
      periodStart,
      periodEnd,
      revisionNumber: revision.revisionNumber,
      entryCount: lines.length,
      projectCount: countUnique(lines.map((line) => line.projectId)),
      totals,
    });

    await tx.timesheetEvent.create({
      data: {
        timesheetId: timesheet.id,
        timesheetRevisionId: revision.id,
        eventType,
        actorMemberId: input.actorMemberId,
        reason: null,
        metadata: eventMetadata,
        createdAt: now,
      },
    });

    await tx.auditLog.create({
      data: {
        actorMemberId: input.actorMemberId,
        action: auditAction,
        targetType: "timesheet",
        targetId: timesheet.id,
        after: {
          ...eventMetadata,
          status: "SUBMITTED",
          revisionId: revision.id,
        },
        ...input.requestMetadata,
      },
    });

    return {
      timesheetId: timesheet.id,
      revisionId: revision.id,
      revisionNumber: revision.revisionNumber,
      entryCount: lines.length,
      totalMinutes: totals.totalMinutes,
      totalAmount: totals.totalAmount,
      currencyCode: totals.currencyCode,
    };
  });
}

/**
 * Every declared figure in the month has its proof, or the month does not submit.
 *
 * Only a declaration with **hours** blocks: a declared assignment nobody declared against is a
 * project with no work this month, not a missing document. Names the projects, because "upload the
 * proof" with nothing to point at is the kind of error that sends someone back to the screen to
 * guess which row it meant.
 */
function assertDeclaredHoursHaveProof(declarations: SubmissionDeclarationRecord[]) {
  const missing = declarations
    .filter((declaration) => declaration.minutes > 0 && !declaration.proofDocumentId)
    .map((declaration) => declaration.project.name)
    .sort();

  if (missing.length > 0) {
    throw new TimesheetSubmissionError("Declared hours are missing their proof.", missing);
  }
}

function resolveSubmissionLines(input: {
  entries: SubmissionTimeEntryRecord[];
  memberRates: TimesheetPreviewRatePeriod[];
}): ResolvedSubmissionLine[] {
  if (input.entries.length === 0) {
    throw new TimesheetSubmissionError("No time entries exist for this month.");
  }

  if (input.entries.some((entry) => entry.lockedByTimesheetRevisionId)) {
    throw new TimesheetSubmissionError(
      "Timesheet has entries already locked by another timesheet.",
    );
  }

  if (input.entries.some((entry) => !entry.projectId || !entry.projectAssignmentId)) {
    throw new TimesheetSubmissionError("Timesheet has entries without a project assignment.");
  }

  if (input.entries.some((entry) => entry.durationMinutes <= 0)) {
    throw new TimesheetSubmissionError("Timesheet has entries with invalid durations.");
  }

  if (input.entries.some((entry) => !entry.description.trim())) {
    throw new TimesheetSubmissionError("Timesheet has entries with missing descriptions.");
  }

  return input.entries.map((entry) => {
    const rate = resolveTimesheetLineRate({
      localDate: entry.localDate,
      memberRates: input.memberRates,
      assignmentRates: entry.projectAssignment.overrideRates,
    });

    if (!rate) {
      throw new TimesheetSubmissionError("Missing rates for one or more entries.");
    }

    const lineAmountCents = calculateLineAmountCents(entry.durationMinutes, rate.hourlyRate);

    return {
      sourceTimeEntryId: entry.id,
      memberId: entry.memberId,
      projectId: entry.projectId,
      projectAssignmentId: entry.projectAssignmentId,
      localDate: entry.localDate,
      description: entry.description.trim(),
      durationMinutes: entry.durationMinutes,
      rateSource: rate.source,
      sourceRatePeriodId: rate.sourceRatePeriodId,
      hourlyRate: rate.hourlyRate,
      currencyCode: rate.currencyCode,
      lineAmount: centsToMoney(lineAmountCents),
      lineAmountCents,
    };
  });
}

function getSubmissionTotals(lines: ResolvedSubmissionLine[]) {
  const currencies = new Set(lines.map((line) => line.currencyCode));

  if (currencies.size !== 1) {
    throw new TimesheetSubmissionError("Timesheet month contains multiple currencies.");
  }

  const totalMinutes = lines.reduce((total, line) => total + line.durationMinutes, 0);
  const totalAmountCents = lines.reduce((total, line) => total + line.lineAmountCents, 0);
  const currencyCode = [...currencies][0] ?? "";

  return {
    currencyCode,
    totalMinutes,
    totalAmount: centsToMoney(totalAmountCents),
  };
}

function buildSubmissionMetadata(input: {
  periodStart: Date;
  periodEnd: Date;
  revisionNumber: number;
  entryCount: number;
  projectCount: number;
  totals: {
    currencyCode: string;
    totalMinutes: number;
    totalAmount: string;
  };
}) {
  return {
    periodStart: formatDateOnly(input.periodStart),
    periodEnd: formatDateOnly(input.periodEnd),
    revisionNumber: input.revisionNumber,
    entryCount: input.entryCount,
    projectCount: input.projectCount,
    currencyCode: input.totals.currencyCode,
    totalMinutes: input.totals.totalMinutes,
    totalAmount: input.totals.totalAmount,
  };
}

function countUnique(values: string[]) {
  return new Set(values).size;
}
