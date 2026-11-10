import { formatDateRangeLabel, formatMonthLabel } from "@/src/lib/formatting";
import type {
  MemberMonthCalendar,
  MemberMonthOverview,
  MemberTimeDays,
  MemberYearOverview,
} from "@/src/server/time-tracking";

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
  if (data.view === "weeks") return weeksPeriod(data.calendar, t, locale);
  if (data.layout === "year") return yearPeriod(data.year, t);
  return monthsPeriod(data.month, data.frame.todayIso, t, locale);
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

/** One calendar month; › stops at the current one. */
export function weeksPeriod(
  calendar: MemberMonthCalendar,
  t: TimeTrackingTranslator,
  locale: string,
) {
  const currentMonth = resolveMonthStartIso(calendar.todayIso);
  const nextMonth = shiftMonthStartIso(calendar.monthStart, 1);

  return {
    label: formatMonthLabel(calendar.monthStart, locale),
    key: calendar.monthStart,
    previousDay: shiftMonthStartIso(calendar.monthStart, -1),
    nextDay: nextMonth <= currentMonth ? nextMonth : null,
    atToday: calendar.monthStart === currentMonth,
    unit: t("period.unitMonth"),
    month: calendar.monthStart.slice(0, 7),
    dayForMonth: (month: string) => `${month}-01`,
    totalMinutes: calendar.totalMinutes,
    totalCaption: t("total.month"),
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

/** A year, stepped to its 1 January; forward stops at the member's current year. */
export function yearPeriod(year: MemberYearOverview, t: TimeTrackingTranslator) {
  const currentYear = Number.parseInt(year.todayIso.slice(0, 4), 10);
  const atToday = year.year >= currentYear;

  return {
    label: String(year.year),
    key: String(year.year),
    previousDay: `${year.year - 1}-01-01`,
    nextDay: atToday ? null : `${year.year + 1}-01-01`,
    atToday: year.year === currentYear,
    unit: t("period.unitYear"),
    month: `${year.year}-${year.year === currentYear ? year.todayIso.slice(5, 7) : "01"}`,
    dayForMonth: (picked: string) => `${picked}-01`,
    totalMinutes: year.totalMinutes,
    totalCaption: year.year === currentYear ? t("total.year") : t("total.yearPast"),
  } satisfies TimePeriod;
}
