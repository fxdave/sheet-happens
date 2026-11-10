import { eachDateValue } from "@/src/lib/leave-days";
import { prisma } from "@/src/server/db/client";

import { loadLockedMonthStarts } from "./assignments";
import { formatDateOnly, getTodayIsoInTimezone, parseDateOnly } from "./dates";
import type { MonthOverviewDayTotal } from "./month-overview";
import { TimeTrackingError } from "./time-entries";

/**
 * The `/time` Months level: a whole year of per-day tracked totals, month totals and timesheet
 * statuses, in a fixed handful of queries rather than twelve month overviews.
 *
 * Figures follow `getMemberMonthOverview`: tracked minutes exclude `DECLARED` entries (the
 * declaration rows report those), and a month total is tracked plus declared.
 */

/** Persisted timesheet statuses, lowercased to match `StatusPill`. */
export type YearOverviewTimesheetStatus =
  "submitted" | "rejected" | "approved" | "invoiced" | "invoice_rejected" | "accepted" | "paid";

export type YearOverviewProfile = "CONTRACTOR" | "EMPLOYEE";

export type YearOverviewDeclared = {
  projectId: string;
  projectName: string;
  minutes: number;
};

export type YearOverviewMonth = {
  /** `YYYY-MM-01`. */
  monthStart: string;
  trackedMinutes: number;
  declaredMinutes: number;
  totalMinutes: number;
  /** Declarations with a figure, ordered by project name. */
  declared: YearOverviewDeclared[];
  /** `null` when no timesheet exists for the month, which is always the case for employees. */
  timesheetStatus: YearOverviewTimesheetStatus | null;
  /** An active period lock holds the month. */
  locked: boolean;
};

export type YearOverviewLeaveDay = {
  isoDate: string;
  dayPart: "FULL" | "MORNING" | "AFTERNOON";
};

export type MemberYearOverview = {
  year: number;
  /** The member's local today, `YYYY-MM-DD`. */
  todayIso: string;
  timezone: string;
  profile: YearOverviewProfile;
  totalMinutes: number;
  /** Tracked minutes per day, only for days that have any. */
  days: MonthOverviewDayTotal[];
  /** Live leave, one row per covered date inside the year. */
  leaveDays: YearOverviewLeaveDay[];
  /** Always twelve, January first. */
  months: YearOverviewMonth[];
  /** Whether any entry predates this year, which is what keeps the year stack loading. */
  hasEarlier: boolean;
};

export type BuildYearOverviewInput = {
  year: number;
  todayIso: string;
  timezone: string;
  profile: YearOverviewProfile;
  dayTotals: readonly MonthOverviewDayTotal[];
  declarations: readonly {
    periodStart: string;
    projectId: string;
    projectName: string;
    minutes: number;
  }[];
  timesheets: readonly { periodStart: string; status: YearOverviewTimesheetStatus }[];
  lockedMonthStarts: ReadonlySet<string>;
  hasEarlier?: boolean;
  leaves: readonly {
    startDate: string;
    endDate: string;
    dayPart: YearOverviewLeaveDay["dayPart"];
  }[];
};

export function yearMonthStarts(year: number) {
  return Array.from(
    { length: 12 },
    (_, index) => `${year}-${String(index + 1).padStart(2, "0")}-01`,
  );
}

/** The year, assembled from rows the caller has already fetched. */
export function buildYearOverview(input: BuildYearOverviewInput): MemberYearOverview {
  const yearStart = `${input.year}-01-01`;
  const yearEnd = `${input.year}-12-31`;
  const days = input.dayTotals
    .filter((day) => day.minutes > 0 && day.isoDate >= yearStart && day.isoDate <= yearEnd)
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  const months = yearMonthStarts(input.year).map((monthStart): YearOverviewMonth => {
    const prefix = monthStart.slice(0, 7);
    const trackedMinutes = days
      .filter((day) => day.isoDate.startsWith(prefix))
      .reduce((total, day) => total + day.minutes, 0);
    const declared = input.declarations
      .filter((row) => row.periodStart === monthStart && row.minutes > 0)
      .map(({ projectId, projectName, minutes }) => ({ projectId, projectName, minutes }))
      .sort((a, b) => a.projectName.localeCompare(b.projectName));
    const declaredMinutes = declared.reduce((total, row) => total + row.minutes, 0);

    return {
      monthStart,
      trackedMinutes,
      declaredMinutes,
      totalMinutes: trackedMinutes + declaredMinutes,
      declared,
      timesheetStatus:
        input.timesheets.find((timesheet) => timesheet.periodStart === monthStart)?.status ?? null,
      locked: input.lockedMonthStarts.has(monthStart),
    };
  });

  // A full day wins over a half day when two leaves overlap the same date.
  const leaveByDay = new Map<string, YearOverviewLeaveDay["dayPart"]>();
  for (const leave of input.leaves) {
    const start = leave.startDate < yearStart ? yearStart : leave.startDate;
    const end = leave.endDate > yearEnd ? yearEnd : leave.endDate;
    for (const isoDate of eachDateValue(start, end)) {
      if (leaveByDay.get(isoDate) !== "FULL") leaveByDay.set(isoDate, leave.dayPart);
    }
  }

  return {
    year: input.year,
    todayIso: input.todayIso,
    timezone: input.timezone,
    profile: input.profile,
    totalMinutes: months.reduce((total, month) => total + month.totalMinutes, 0),
    days,
    leaveDays: [...leaveByDay]
      .map(([isoDate, dayPart]) => ({ isoDate, dayPart }))
      .sort((a, b) => a.isoDate.localeCompare(b.isoDate)),
    months,
    hasEarlier: input.hasEarlier ?? false,
  };
}

export type YearOverviewClient = {
  member: {
    findUnique: (args: unknown) => Promise<{
      timezone: string;
      currentProfile: YearOverviewProfile;
      deletedAt: Date | null;
    } | null>;
  };
  timeEntry: {
    findFirst: (args: unknown) => Promise<{ id: string } | null>;
    groupBy: (args: unknown) => Promise<
      Array<{
        localDate: Date;
        _sum: { durationMinutes: number | null };
        _count: { _all: number };
      }>
    >;
  };
  monthlyHourDeclaration: {
    findMany: (
      args: unknown,
    ) => Promise<
      Array<{ periodStart: Date; projectId: string; minutes: number; project: { name: string } }>
    >;
  };
  timesheet: {
    findMany: (args: unknown) => Promise<Array<{ periodStart: Date; status: string }>>;
  };
  periodLock: {
    findMany: (args: unknown) => Promise<Array<{ periodStart: Date }>>;
  };
  leave: {
    findMany: (
      args: unknown,
    ) => Promise<
      Array<{ startDate: Date; endDate: Date; dayPart: YearOverviewLeaveDay["dayPart"] }>
    >;
  };
};

/** One member's year, in the member's timezone. Unknown or deleted members are refused. */
export async function getMemberYearOverview(
  input: { memberId: string; year: number; now?: Date },
  deps: { db?: YearOverviewClient } = {},
): Promise<MemberYearOverview> {
  const db = deps.db ?? (prisma as unknown as YearOverviewClient);

  const member = await db.member.findUnique({
    where: { id: input.memberId },
    select: { timezone: true, currentProfile: true, deletedAt: true },
  });

  if (!member || member.deletedAt) {
    throw new TimeTrackingError("Member not found.", "MEMBER_NOT_FOUND");
  }

  const yearStart = parseDateOnly(`${input.year}-01-01`);
  const yearEnd = parseDateOnly(`${input.year}-12-31`);
  const monthStarts = yearMonthStarts(input.year);

  const [daySums, declarations, timesheets, lockedMonthStarts, leaves, earlier] = await Promise.all(
    [
      db.timeEntry.groupBy({
        by: ["localDate"],
        where: {
          memberId: input.memberId,
          deletedAt: null,
          // Same exclusion as the month overview: declarations are reported by their own rows.
          source: { not: "DECLARED" },
          localDate: { gte: yearStart, lte: yearEnd },
        },
        _sum: { durationMinutes: true },
        _count: { _all: true },
      }),
      db.monthlyHourDeclaration.findMany({
        where: { memberId: input.memberId, periodStart: { gte: yearStart, lte: yearEnd } },
        select: {
          periodStart: true,
          projectId: true,
          minutes: true,
          project: { select: { name: true } },
        },
      }),
      // Timesheets only ever exist for contractors, so an employee's months come back `null`.
      db.timesheet.findMany({
        where: {
          contractorMemberId: input.memberId,
          periodStart: { gte: yearStart, lte: yearEnd },
        },
        select: { periodStart: true, status: true },
      }),
      loadLockedMonthStarts({
        memberId: input.memberId,
        monthStarts: monthStarts.map((monthStart) => parseDateOnly(monthStart)),
        db,
      }),
      db.leave.findMany({
        where: {
          memberId: input.memberId,
          deletedAt: null,
          startDate: { lte: yearEnd },
          endDate: { gte: yearStart },
        },
        select: { startDate: true, endDate: true, dayPart: true },
      }),
      // Declared months materialize entries too, so this covers both kinds of history.
      db.timeEntry.findFirst({
        where: { memberId: input.memberId, deletedAt: null, localDate: { lt: yearStart } },
        select: { id: true },
      }),
    ],
  );

  return buildYearOverview({
    year: input.year,
    todayIso: getTodayIsoInTimezone(member.timezone, input.now),
    timezone: member.timezone,
    profile: member.currentProfile,
    dayTotals: daySums.map((row) => ({
      isoDate: formatDateOnly(row.localDate),
      minutes: row._sum.durationMinutes ?? 0,
      entryCount: row._count._all,
    })),
    declarations: declarations.map((row) => ({
      periodStart: formatDateOnly(row.periodStart),
      projectId: row.projectId,
      projectName: row.project.name,
      minutes: row.minutes,
    })),
    timesheets: timesheets.map((row) => ({
      periodStart: formatDateOnly(row.periodStart),
      status: row.status.toLowerCase() as YearOverviewTimesheetStatus,
    })),
    lockedMonthStarts,
    hasEarlier: earlier !== null,
    leaves: leaves.map((leave) => ({
      startDate: formatDateOnly(leave.startDate),
      endDate: formatDateOnly(leave.endDate),
      dayPart: leave.dayPart,
    })),
  });
}
