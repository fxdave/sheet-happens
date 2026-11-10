import type { MonthCalendarData, MonthCalendarDay, MonthCalendarWeek } from "./MonthCalendar.types";

/** Chips a cell shows before it folds the rest into "+N more". */
export const MAX_VISIBLE_ENTRIES = 3;

/** A past workday with nothing on it and no leave: the gap worth pointing at. */
export function isNothingLogged(day: MonthCalendarDay) {
  return (
    !day.isFuture &&
    !day.isToday &&
    !day.isWeekend &&
    !day.onLeave &&
    day.totalMinutes === 0 &&
    day.entries.length === 0
  );
}

/**
 * The phone list: every loaded month's weeks merged by Monday (a boundary week arrives once per
 * month), newest week first and newest day first, without future days or empty weekend days.
 */
export function buildListWeeks(calendars: readonly MonthCalendarData[]): MonthCalendarWeek[] {
  const byStart = new Map<string, MonthCalendarWeek>();

  for (const calendar of calendars) {
    for (const week of calendar.weeks) {
      if (!byStart.has(week.weekStart)) byStart.set(week.weekStart, week);
    }
  }

  return [...byStart.values()]
    .sort((left, right) => right.weekStart.localeCompare(left.weekStart))
    .map((week) => ({
      ...week,
      days: week.days.filter(isListedDay).reverse(),
    }))
    .filter((week) => week.days.length > 0);
}

function isListedDay(day: MonthCalendarDay) {
  if (day.isFuture) return false;
  if (day.isWeekend && day.entries.length === 0 && !day.isToday) return false;
  return true;
}
