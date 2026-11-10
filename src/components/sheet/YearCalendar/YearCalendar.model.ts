import { DAILY_LONG_DAY_MINUTES, DAILY_SOFT_WARNING_MINUTES } from "@/src/lib/time-entry-limits";

import type {
  DayTiming,
  HourLevel,
  MonthBadge,
  MonthTiming,
  YearCalendarDay,
  YearCalendarMonth,
  YearCalendarOverview,
} from "./YearCalendar.types";

/** Under this a day reads as a partial one. */
export const SHORT_DAY_MINUTES = 4 * 60;

/** Which shade a day gets: a full day is the soft-warning 8 h, past 10 h is overwork. */
export function hourLevel(minutes: number): HourLevel {
  if (minutes <= 0) return 0;
  if (minutes < SHORT_DAY_MINUTES) return 1;
  if (minutes < DAILY_SOFT_WARNING_MINUTES) return 2;
  if (minutes <= DAILY_LONG_DAY_MINUTES) return 3;
  return 4;
}

export function monthTiming(monthStart: string, todayIso: string): MonthTiming {
  const month = monthStart.slice(0, 7);
  const today = todayIso.slice(0, 7);

  if (month === today) return "current";
  return month < today ? "past" : "future";
}

function dayTiming(isoDate: string, todayIso: string): DayTiming {
  if (isoDate === todayIso) return "today";
  return isoDate < todayIso ? "past" : "future";
}

/** The month's days, plus how many blank slots precede the 1st in a Monday-first row. */
export function buildMonthDays(input: {
  monthStart: string;
  todayIso: string;
  minutesByDay: ReadonlyMap<string, number>;
  leaveByDay?: ReadonlyMap<string, YearCalendarDay["leave"]>;
}): { leadingBlanks: number; days: YearCalendarDay[] } {
  const year = Number.parseInt(input.monthStart.slice(0, 4), 10);
  const month = Number.parseInt(input.monthStart.slice(5, 7), 10);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prefix = input.monthStart.slice(0, 7);
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();

  const days = Array.from({ length: lastDay }, (_, index): YearCalendarDay => {
    const dayNumber = index + 1;
    const isoDate = `${prefix}-${String(dayNumber).padStart(2, "0")}`;
    const weekday = (firstWeekday + index) % 7;
    const minutes = input.minutesByDay.get(isoDate) ?? 0;

    return {
      isoDate,
      dayNumber,
      minutes,
      level: hourLevel(minutes),
      weekend: weekday === 0 || weekday === 6,
      timing: dayTiming(isoDate, input.todayIso),
      leave: input.leaveByDay?.get(isoDate) ?? null,
    };
  });

  return { leadingBlanks: (firstWeekday + 6) % 7, days };
}

/**
 * The footer badge. A stored timesheet always shows; a contractor's current or past month without
 * one reads "Open" once it holds hours (the current month always does), so a forgotten submission
 * is visible. Employees have no timesheets and get no badge.
 */
export function monthBadge(
  month: YearCalendarMonth,
  profile: YearCalendarOverview["profile"],
  timing: MonthTiming,
): MonthBadge {
  if (month.timesheetStatus) return { kind: "status", status: month.timesheetStatus };
  if (profile !== "CONTRACTOR" || timing === "future") return null;
  if (timing === "current" || month.totalMinutes > 0) return { kind: "open" };
  return null;
}

/** The day squares' roving focus: where an arrow key lands, clamped to the month. */
export function nextDayIndex(key: string, index: number, length: number): number | null {
  const target =
    key === "ArrowRight"
      ? index + 1
      : key === "ArrowLeft"
        ? index - 1
        : key === "ArrowDown"
          ? index + 7
          : key === "ArrowUp"
            ? index - 7
            : key === "Home"
              ? 0
              : key === "End"
                ? length - 1
                : null;

  if (target === null || target < 0 || target >= length) return null;
  return target;
}
