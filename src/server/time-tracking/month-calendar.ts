import { isoWeekNumber } from "@/src/lib/date-values";
import { isProjectColorToken, projectColorValues } from "@/src/lib/project-colors";
import { prisma } from "@/src/server/db/client";

import {
  addDays,
  formatDateOnly,
  formatTimeInTimezone,
  getMonday,
  getMonthEnd,
  getMonthStart,
  getMonthStartsInRange,
  getTodayIsoInTimezone,
  parseDateOnly,
} from "./dates";
import { findFullDayLeaveDates } from "./leave-guard";
import { loadLockedMonthStarts } from "./assignments";
import { TimeTrackingError } from "./time-entries";

/**
 * The Weeks level of `/time`: one calendar month laid out as Monday-first ISO weeks, each day
 * listing its entries. The grid runs from the Monday on or before the 1st to the Sunday on or after
 * the last day, so the adjacent months' days carry their own entries (shown faded).
 *
 * Declared entries are excluded, as in `getMemberWeeklyTimeGrid` and the month overview's tracked
 * band: a declaration is one month-sized figure on the 1st and belongs to the Months view.
 */

export type MonthCalendarEntry = {
  id: string;
  description: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  durationMinutes: number;
  /** `HH:mm` in the entry's own timezone, `null` for a duration-only entry. */
  startTime: string | null;
};

export type MonthCalendarDay = {
  isoDate: string;
  /** Inside the requested month; the leading and trailing days belong to its neighbours. */
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  isWeekend: boolean;
  /** The day's month has an active period lock. */
  locked: boolean;
  /** A full-day leave covers the day; see `leave-guard.ts`. */
  onLeave: boolean;
  totalMinutes: number;
  entries: MonthCalendarEntry[];
};

export type MonthCalendarWeek = {
  /** The Monday, `YYYY-MM-DD`. */
  weekStart: string;
  isoWeek: number;
  /** All seven days, including those outside the month: a week total is a week's. */
  totalMinutes: number;
  days: MonthCalendarDay[];
};

export type MemberMonthCalendar = {
  /** The first of the month, `YYYY-MM-DD`. */
  monthStart: string;
  todayIso: string;
  timezone: string;
  /** Tracked minutes inside the month — the month overview's `trackedMinutes`. */
  totalMinutes: number;
  weeks: MonthCalendarWeek[];
  /** Whether anything was logged before the grid's first Monday: the phone list's stop. */
  hasEarlier: boolean;
};

/** An entry as the query returns it, already flattened. */
export type MonthCalendarEntryRow = MonthCalendarEntry & {
  localDate: string;
  /** ISO instants, for ordering only. */
  startedAt: string | null;
  createdAt: string;
};

export type BuildMonthCalendarInput = {
  monthStart: string;
  todayIso: string;
  timezone: string;
  lockedMonthStarts: ReadonlySet<string>;
  leaveDates: ReadonlySet<string>;
  entries: readonly MonthCalendarEntryRow[];
  hasEarlier?: boolean;
};

/** The calendar, assembled from rows the caller has already fetched. */
export function buildMonthCalendar(input: BuildMonthCalendarInput): MemberMonthCalendar {
  const monthStart = getMonthStart(parseDateOnly(input.monthStart));
  const monthEnd = getMonthEnd(monthStart);
  const monthKey = input.monthStart.slice(0, 7);
  const gridStart = getMonday(monthStart);
  const gridEnd = addDays(getMonday(monthEnd), 6);

  const rowsByDate = new Map<string, MonthCalendarEntryRow[]>();
  for (const row of input.entries) {
    const rows = rowsByDate.get(row.localDate);
    if (rows) rows.push(row);
    else rowsByDate.set(row.localDate, [row]);
  }

  const weeks: MonthCalendarWeek[] = [];
  let totalMinutes = 0;

  for (let weekStart = gridStart; weekStart <= gridEnd; weekStart = addDays(weekStart, 7)) {
    const days = Array.from({ length: 7 }, (_, index): MonthCalendarDay => {
      const isoDate = formatDateOnly(addDays(weekStart, index));
      const rows = [...(rowsByDate.get(isoDate) ?? [])].sort(byStartThenCreation);
      const dayMinutes = rows.reduce((total, row) => total + row.durationMinutes, 0);

      return {
        isoDate,
        inMonth: isoDate.startsWith(monthKey),
        isToday: isoDate === input.todayIso,
        isFuture: isoDate > input.todayIso,
        isWeekend: index >= 5,
        locked: input.lockedMonthStarts.has(`${isoDate.slice(0, 7)}-01`),
        onLeave: input.leaveDates.has(isoDate),
        totalMinutes: dayMinutes,
        entries: rows.map(toEntry),
      };
    });

    for (const day of days) if (day.inMonth) totalMinutes += day.totalMinutes;

    const weekStartIso = formatDateOnly(weekStart);
    weeks.push({
      weekStart: weekStartIso,
      isoWeek: isoWeekNumber(weekStartIso),
      totalMinutes: days.reduce((total, day) => total + day.totalMinutes, 0),
      days,
    });
  }

  return {
    monthStart: formatDateOnly(monthStart),
    todayIso: input.todayIso,
    timezone: input.timezone,
    totalMinutes,
    weeks,
    hasEarlier: input.hasEarlier ?? false,
  };
}

/**
 * One member's month as a calendar. Five indexed queries whatever the month's size: the member,
 * the grid's entries, its period locks, its full-day leaves and whether anything is older.
 */
export async function getMemberMonthCalendar(input: {
  memberId: string;
  monthStart: Date;
  now?: Date;
}): Promise<MemberMonthCalendar> {
  const member = await prisma.member.findUnique({
    where: { id: input.memberId },
    select: { id: true, timezone: true, deletedAt: true },
  });

  if (!member || member.deletedAt) {
    throw new TimeTrackingError("Member not found.", "MEMBER_NOT_FOUND");
  }

  const monthStart = getMonthStart(input.monthStart);
  const gridStart = getMonday(monthStart);
  const gridEnd = addDays(getMonday(getMonthEnd(monthStart)), 6);

  const [entries, lockedMonthStarts, leaveDates, earlier] = await Promise.all([
    prisma.timeEntry.findMany({
      where: {
        memberId: member.id,
        deletedAt: null,
        source: { not: "DECLARED" },
        localDate: { gte: gridStart, lte: gridEnd },
      },
      select: {
        id: true,
        localDate: true,
        description: true,
        durationMinutes: true,
        startedAt: true,
        timezone: true,
        createdAt: true,
        project: { select: { id: true, name: true, colorToken: true } },
      },
    }),
    loadLockedMonthStarts({
      memberId: member.id,
      monthStarts: getMonthStartsInRange(gridStart, gridEnd),
    }),
    findFullDayLeaveDates(prisma, member.id, formatDateOnly(gridStart), formatDateOnly(gridEnd)),
    prisma.timeEntry.findFirst({
      where: {
        memberId: member.id,
        deletedAt: null,
        source: { not: "DECLARED" },
        localDate: { lt: gridStart },
      },
      select: { id: true },
    }),
  ]);

  return buildMonthCalendar({
    monthStart: formatDateOnly(monthStart),
    todayIso: getTodayIsoInTimezone(member.timezone, input.now),
    timezone: member.timezone,
    lockedMonthStarts,
    leaveDates,
    hasEarlier: Boolean(earlier),
    entries: entries.map((entry) => ({
      id: entry.id,
      localDate: formatDateOnly(entry.localDate),
      description: entry.description,
      projectId: entry.project.id,
      projectName: entry.project.name,
      projectColor:
        projectColorValues[
          isProjectColorToken(entry.project.colorToken) ? entry.project.colorToken : "teal"
        ],
      durationMinutes: entry.durationMinutes,
      startTime: entry.startedAt ? formatTimeInTimezone(entry.startedAt, entry.timezone) : null,
      startedAt: entry.startedAt?.toISOString() ?? null,
      createdAt: entry.createdAt.toISOString(),
    })),
  });
}

/** Timed entries first, by start; duration-only entries after them, in the order they were made. */
function byStartThenCreation(left: MonthCalendarEntryRow, right: MonthCalendarEntryRow) {
  if (left.startedAt !== right.startedAt) {
    if (left.startedAt === null) return 1;
    if (right.startedAt === null) return -1;
    return left.startedAt < right.startedAt ? -1 : 1;
  }

  return left.createdAt.localeCompare(right.createdAt);
}

function toEntry(row: MonthCalendarEntryRow): MonthCalendarEntry {
  return {
    id: row.id,
    description: row.description,
    projectId: row.projectId,
    projectName: row.projectName,
    projectColor: row.projectColor,
    durationMinutes: row.durationMinutes,
    startTime: row.startTime,
  };
}
