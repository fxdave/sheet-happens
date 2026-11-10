import { isoWeekNumber } from "@/src/lib/date-values";
import { prisma } from "@/src/server/db/client";

import {
  addDays,
  buildWeekDays,
  formatDateOnly,
  getMonday,
  getTodayIsoInTimezone,
  getWeekEnd,
  parseDateOnly,
} from "./dates";
import type { TimeGridDay } from "./dates";
import {
  loadRangeEntries,
  loadTrackingMember,
  loadTrackingRangeContext,
  type RunningTimerView,
  type TimeEntryDraftView,
  type TimeGridAssignedProject,
  type TimeGridEntry,
} from "./time-entries";
import type { DescriptionSuggestion } from "./description-suggestions";

/** How many ISO weeks one page of the day log covers. */
export const TIME_DAYS_PAGE_WEEKS = 2;

export type TimeDaysDay = TimeGridDay & {
  totalMinutes: number;
  /** Newest first: timed entries by start time, then duration-only ones. */
  entries: TimeGridEntry[];
};

export type TimeDaysWeek = {
  weekStart: string;
  weekEnd: string;
  isoWeek: number;
  totalMinutes: number;
  /** Newest first, future days left out. */
  days: TimeDaysDay[];
};

export type MemberTimeDays = {
  memberId: string;
  timezone: string;
  todayIso: string;
  thisWeek: string;
  /** The day the window ends on (clamped to today), which the `day` URL param names. */
  anchorDay: string;
  rangeStart: string;
  rangeEnd: string;
  /** The anchor one page back, and one page forward — `null` when the window already holds today. */
  previousAnchor: string;
  nextAnchor: string | null;
  totalMinutes: number;
  weeks: TimeDaysWeek[];
  /** Whether anything was logged before `rangeStart`, which is what keeps the scroll going. */
  hasEarlier: boolean;
  lockedMonthStarts: string[];
  projects: TimeGridAssignedProject[];
  recentProjects: TimeGridAssignedProject[];
  runningTimer: RunningTimerView | null;
  entryDraft: TimeEntryDraftView | null;
  descriptionSuggestions: DescriptionSuggestion[];
};

/**
 * The day log behind `/time?view=days`: `weeks` ISO weeks ending with the week that holds
 * `endDay` (default today), newest first, each with its days newest first.
 */
export async function getMemberTimeDays(input: {
  memberId: string;
  endDay?: Date | null;
  weeks?: number;
  now?: Date;
}): Promise<MemberTimeDays> {
  const member = await loadTrackingMember(input.memberId);
  const todayIso = getTodayIsoInTimezone(member.timezone, input.now);
  const today = parseDateOnly(todayIso);
  const weekCount = Math.max(1, Math.floor(input.weeks ?? TIME_DAYS_PAGE_WEEKS));
  // A future anchor has nothing to show; it reads as today.
  const anchor = input.endDay && input.endDay < today ? input.endDay : today;
  const lastWeekStart = getMonday(anchor);
  const firstWeekStart = addDays(lastWeekStart, -7 * (weekCount - 1));
  const rangeEnd = getWeekEnd(lastWeekStart);

  const [context, entries, earlier] = await Promise.all([
    loadTrackingRangeContext({ member, from: firstWeekStart, to: rangeEnd }),
    loadRangeEntries({ memberId: member.id, from: firstWeekStart, to: rangeEnd }),
    prisma.timeEntry.findFirst({
      where: {
        memberId: member.id,
        deletedAt: null,
        source: { not: "DECLARED" },
        localDate: { lt: firstWeekStart },
      },
      select: { id: true },
    }),
  ]);

  const weekStarts = Array.from({ length: weekCount }, (_, index) =>
    addDays(lastWeekStart, -7 * index),
  );
  const weeks = buildTimeDaysWeeks({
    weekStarts,
    todayIso,
    lockedMonthStarts: context.lockedMonthStarts,
    leaveDates: context.leaveDates,
    entries,
  });
  const thisWeek = getMonday(today);
  const nextAnchor = lastWeekStart >= thisWeek ? null : addDays(anchor, 7 * weekCount);

  return {
    memberId: member.id,
    timezone: member.timezone,
    todayIso,
    thisWeek: formatDateOnly(thisWeek),
    anchorDay: formatDateOnly(anchor),
    rangeStart: formatDateOnly(firstWeekStart),
    rangeEnd: formatDateOnly(rangeEnd),
    previousAnchor: formatDateOnly(addDays(anchor, -7 * weekCount)),
    nextAnchor: nextAnchor ? formatDateOnly(nextAnchor < today ? nextAnchor : today) : null,
    totalMinutes: weeks.reduce((sum, week) => sum + week.totalMinutes, 0),
    weeks,
    hasEarlier: earlier !== null,
    lockedMonthStarts: [...context.lockedMonthStarts],
    projects: context.projects,
    recentProjects: context.recentProjects,
    runningTimer: context.runningTimer,
    entryDraft: context.entryDraft,
    descriptionSuggestions: context.descriptionSuggestions,
  };
}

/** The pure half: weeks and days newest first, future days dropped, entries grouped per day. */
export function buildTimeDaysWeeks(input: {
  weekStarts: readonly Date[];
  todayIso: string;
  lockedMonthStarts: Set<string>;
  leaveDates: Set<string>;
  entries: readonly TimeGridEntry[];
}): TimeDaysWeek[] {
  const entriesByDay = new Map<string, TimeGridEntry[]>();

  for (const entry of input.entries) {
    entriesByDay.set(entry.localDate, [...(entriesByDay.get(entry.localDate) ?? []), entry]);
  }

  return [...input.weekStarts]
    .sort((a, b) => b.getTime() - a.getTime())
    .map((weekStart) => {
      const days = buildWeekDays({
        weekStart,
        todayIso: input.todayIso,
        lockedMonthStarts: input.lockedMonthStarts,
        leaveDates: input.leaveDates,
      })
        .filter((day) => day.state !== "future")
        .reverse()
        .map((day): TimeDaysDay => {
          const dayEntries = sortNewestFirst(entriesByDay.get(day.isoDate) ?? []);

          return {
            ...day,
            totalMinutes: dayEntries.reduce((sum, entry) => sum + entry.durationMinutes, 0),
            entries: dayEntries,
          };
        });
      const weekStartIso = formatDateOnly(weekStart);

      return {
        weekStart: weekStartIso,
        weekEnd: formatDateOnly(getWeekEnd(weekStart)),
        isoWeek: isoWeekNumber(weekStartIso),
        totalMinutes: days.reduce((sum, day) => sum + day.totalMinutes, 0),
        days,
      };
    });
}

/** Input order is creation order; reversing it first keeps duration-only entries newest first. */
function sortNewestFirst(entries: readonly TimeGridEntry[]) {
  return [...entries].reverse().sort((a, b) => {
    if (a.startTime && b.startTime) return b.startTime.localeCompare(a.startTime);
    if (a.startTime) return -1;
    if (b.startTime) return 1;
    return 0;
  });
}
