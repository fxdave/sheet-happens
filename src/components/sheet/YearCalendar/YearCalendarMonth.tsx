"use client";

import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";

import {
  formatDateLabel,
  formatHours,
  formatHoursWithUnit,
  formatMonthLabel,
  formatMonthName,
  type DurationDisplayFormat,
} from "@/src/lib/formatting";
import { cn } from "@/src/lib/utils";

import { StatusPill } from "../StatusPill";
import { buildMonthDays, monthBadge, monthTiming, nextDayIndex } from "./YearCalendar.model";
import type {
  YearCalendarDay,
  YearCalendarMonth as YearCalendarMonthData,
  YearCalendarOverview,
} from "./YearCalendar.types";
import { yearDayVariants, yearMonthCardVariants } from "./YearCalendar.variants";

export type YearCalendarMonthProps = {
  month: YearCalendarMonthData;
  todayIso: string;
  profile: YearCalendarOverview["profile"];
  minutesByDay: ReadonlyMap<string, number>;
  leaveByDay: ReadonlyMap<string, YearCalendarDay["leave"]>;
  weekdayInitials: string[];
  locale: string;
  durationDisplayFormat: DurationDisplayFormat;
  onSelectMonth: (monthStart: string) => void;
  onSelectDay: (isoDate: string) => void;
};

/**
 * One month card. The header button is the month's single tab stop and, through a stretched
 * pseudo-element, the whole card's click target; the day squares sit above it as a roving-focus
 * group (one more tab stop, arrows inside) so a specific day stays reachable without the mouse.
 */
export function YearCalendarMonth({
  month,
  todayIso,
  profile,
  minutesByDay,
  leaveByDay,
  weekdayInitials,
  locale,
  durationDisplayFormat,
  onSelectMonth,
  onSelectDay,
}: YearCalendarMonthProps) {
  const t = useTranslations("TimeMonthsView");
  const tTimesheets = useTranslations("Timesheets");
  const timing = monthTiming(month.monthStart, todayIso);
  const { leadingBlanks, days } = useMemo(
    () => buildMonthDays({ monthStart: month.monthStart, todayIso, minutesByDay, leaveByDay }),
    [month.monthStart, todayIso, minutesByDay, leaveByDay],
  );
  const todayIndex = days.findIndex((day) => day.timing === "today");
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const activeIndex = focusIndex ?? Math.max(todayIndex, 0);
  const dayRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const badge = monthBadge(month, profile, timing);
  const badgeLabel =
    badge?.kind === "status"
      ? tTimesheets(`status.${badge.status}`)
      : badge?.kind === "open"
        ? t("open")
        : null;
  const monthLabel = formatMonthLabel(month.monthStart, locale);
  const declaredText = declaredSummary();
  const accessibleName = [
    month.totalMinutes
      ? t("monthLabel", { month: monthLabel, hours: formatHours(month.totalMinutes, locale) })
      : t("monthLabelEmpty", { month: monthLabel }),
    declaredText,
    badgeLabel,
  ]
    .filter(Boolean)
    .join(", ");

  function declaredSummary() {
    const [first] = month.declared;
    if (!first) return null;

    const hours = formatHoursWithUnit(month.declaredMinutes, locale, durationDisplayFormat);
    return month.declared.length === 1
      ? t.markup("declaredOne", { project: first.projectName, hours, name: (chunks) => chunks })
      : t("declaredMany", { hours, count: month.declared.length });
  }

  // Only the project name gives way, so the hours stay readable next to a long name.
  function declaredVisible() {
    const [first] = month.declared;
    if (!first || month.declared.length > 1) return declaredText;

    return t.rich("declaredOne", {
      project: first.projectName,
      hours: formatHoursWithUnit(month.declaredMinutes, locale, durationDisplayFormat),
      name: (chunks) => <span className="min-w-0 truncate">{chunks}</span>,
    });
  }

  function dayLabel(day: YearCalendarDay) {
    const date = formatDateLabel(day.isoDate, locale, { style: "full" });
    const base =
      day.minutes > 0
        ? t("dayHours", { date, hours: formatHours(day.minutes, locale) })
        : day.timing === "future"
          ? t("dayUpcoming", { date })
          : t("dayEmpty", { date });
    const leave = day.leave ? (day.leave === "FULL" ? t("leaveFull") : t("leaveHalf")) : null;

    return [base, leave, day.timing === "today" ? t("today") : null].filter(Boolean).join(", ");
  }

  function handleDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = nextDayIndex(event.key, index, days.length);
    if (next === null) return;

    event.preventDefault();
    setFocusIndex(next);
    dayRefs.current[next]?.focus();
  }

  return (
    <li className="flex min-w-0">
      <article className={cn(yearMonthCardVariants({ timing }), "@container w-full")}>
        <h3 className="m-0 min-w-0">
          <button
            type="button"
            data-month-trigger=""
            aria-label={accessibleName}
            className="flex w-full min-w-0 cursor-pointer items-baseline justify-between gap-2 text-left font-ui text-sm font-semibold text-foreground outline-none after:absolute after:inset-0 after:rounded-[inherit] after:content-['']"
            onClick={() => onSelectMonth(month.monthStart)}
          >
            <span className="min-w-0 truncate first-letter:uppercase">
              {formatMonthName(month.monthStart, locale, { style: "long" })}
            </span>
            <span className="shrink-0 whitespace-nowrap tabular-nums">
              {month.totalMinutes
                ? formatHoursWithUnit(month.totalMinutes, locale, durationDisplayFormat)
                : null}
            </span>
          </button>
        </h3>

        <div aria-hidden="true" className="mt-2 grid grid-cols-7 gap-[3px]">
          {weekdayInitials.map((initial, index) => (
            <span
              key={`${initial}-${index}`}
              className="truncate text-center font-ui text-[9px] font-semibold text-subtle-foreground uppercase"
            >
              {initial}
            </span>
          ))}
        </div>

        <div
          role="group"
          aria-label={t("daysGroup", { month: monthLabel })}
          className="relative z-10 mt-1 grid grid-cols-7 gap-[3px]"
        >
          {Array.from({ length: leadingBlanks }, (_, index) => (
            <span key={`blank-${index}`} aria-hidden="true" />
          ))}
          {days.map((day, index) => (
            <button
              key={day.isoDate}
              ref={(node) => {
                dayRefs.current[index] = node;
              }}
              type="button"
              tabIndex={index === activeIndex ? 0 : -1}
              aria-label={dayLabel(day)}
              data-level={day.level}
              className={cn(
                yearDayVariants({ level: day.level, weekend: day.weekend, timing: day.timing }),
                "cursor-pointer",
              )}
              onClick={() => onSelectDay(day.isoDate)}
              onFocus={() => setFocusIndex(index)}
              onKeyDown={(event) => handleDayKeyDown(event, index)}
            >
              {day.dayNumber}
              {day.leave ? (
                <span
                  aria-hidden="true"
                  data-leave={day.leave}
                  className="absolute bottom-[2px] left-1/2 size-[3px] -translate-x-1/2 rounded-full bg-current opacity-80"
                />
              ) : null}
            </button>
          ))}
        </div>

        <div className="mt-auto flex min-h-6 min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2.5">
          {declaredText ? (
            <span
              data-declared=""
              className={cn(
                "min-w-0 shrink grow basis-28 text-xs text-muted-foreground",
                month.declared.length === 1 ? "flex whitespace-pre" : "truncate",
              )}
            >
              {declaredVisible()}
            </span>
          ) : null}
          {badge && badgeLabel ? (
            <StatusPill
              status={badge.kind === "status" ? badge.status : "missing"}
              label={badgeLabel}
              density="compact"
              className="ms-auto max-w-full min-w-0 shrink-0 whitespace-nowrap"
            />
          ) : null}
        </div>
      </article>
    </li>
  );
}
