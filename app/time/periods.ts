import { isoWeekNumber } from "@/src/lib/date-values";
import { formatDateRangeLabel, formatMonthLabel } from "@/src/lib/formatting";
import type { MemberMonthOverview, MemberTimeDays, TimeGridWeek } from "@/src/server/time-tracking";

import type { TimePageData } from "./TimePageClient";
import type { TimeTrackingTranslator } from "./time-entry-helpers";
import { resolveMonthAnchorIso, resolveMonthStartIso, shiftMonthStartIso } from "./view";

/**
 * The period bar's contents, which each view describes and the frame renders the same way:
 * `‹ label ›` steps to the `previousDay` / `nextDay` anchors, `Today` drops the anchor.
 */
export type TimePeriod = {
  label: string;
  /** Changes with the period; keys the label's slide. */
  key: string;
  /** The `day` param one period back and forward; `null` when forward would pass today. */
  previousDay: string;
  nextDay: string | null;
  atToday: boolean;
  /** What the arrows step, for their names: `2 weeks`, `week`, `month`. */
  unit: string;
  /** The month the label's picker opens on, `YYYY-MM`. */
  month: string;
  /** Where a month picked from the label lands. */
  dayForMonth: (month: string) => string;
  totalMinutes: number;
  /** `2 weeks`, `this week`, `this month`. */
  totalCaption: string;
};

export function resolvePeriod(
  data: TimePageData,
  t: TimeTrackingTranslator,
  locale: string,
): TimePeriod {
  if (data.view === "days") return daysPeriod(data.days, t, locale);
  if (data.view === "weeks") return weeksPeriod(data.week, t, locale);
  return monthsPeriod(data.month, data.week.todayIso, t, locale);
}

export function daysPeriod(days: MemberTimeDays, t: TimeTrackingTranslator, locale: string) {
  return {
    label: formatDateRangeLabel(days.rangeStart, days.rangeEnd, locale),
    key: days.rangeStart,
    previousDay: days.previousAnchor,
    nextDay: days.nextAnchor,
    atToday: days.nextAnchor === null,
    unit: t("period.unitPage"),
    month: days.anchorDay.slice(0, 7),
    dayForMonth: (month: string) => resolveMonthAnchorIso(month, days.todayIso),
    totalMinutes: days.totalMinutes,
    totalCaption: t("days.periodTotal", { count: days.weeks.length }),
  } satisfies TimePeriod;
}

export function weeksPeriod(week: TimeGridWeek, t: TimeTrackingTranslator, locale: string) {
  return {
    label: t("period.week", {
      week: isoWeekNumber(week.weekStart),
      range: formatDateRangeLabel(week.weekStart, week.weekEnd, locale),
    }),
    key: week.weekStart,
    previousDay: week.previousWeek,
    nextDay: week.nextWeek,
    atToday: week.weekStart === week.thisWeek,
    unit: t("period.unitWeek"),
    month: week.weekStart.slice(0, 7),
    dayForMonth: (month: string) => `${month}-01`,
    totalMinutes: week.entries.reduce((sum, entry) => sum + entry.durationMinutes, 0),
    totalCaption: t("total.week"),
  } satisfies TimePeriod;
}

export function monthsPeriod(
  month: MemberMonthOverview,
  todayIso: string,
  t: TimeTrackingTranslator,
  locale: string,
) {
  return {
    label: formatMonthLabel(month.monthStart, locale),
    key: month.monthStart,
    previousDay: shiftMonthStartIso(month.monthStart, -1),
    nextDay: shiftMonthStartIso(month.monthStart, 1),
    atToday: month.monthStart === resolveMonthStartIso(todayIso),
    unit: t("period.unitMonth"),
    month: month.monthStart.slice(0, 7),
    dayForMonth: (picked: string) => `${picked}-01`,
    totalMinutes: month.totalMinutes,
    totalCaption: t("total.month"),
  } satisfies TimePeriod;
}
