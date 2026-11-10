"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef } from "react";

import { formatHoursWithUnit, formatWeekdayLabel } from "@/src/lib/formatting";
import { cn } from "@/src/lib/utils";

import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";
import type {
  YearCalendarDay,
  YearCalendarOverview,
  YearCalendarProps,
} from "./YearCalendar.types";
import { yearDayVariants } from "./YearCalendar.variants";
import { YearCalendarMonth } from "./YearCalendarMonth";

const SKELETON_CARDS = [
  "",
  "hidden @min-[28rem]:block",
  "hidden @min-[40rem]:block",
  "hidden @min-[56rem]:block",
];

const MONTH_GRID =
  "grid grid-cols-1 gap-3 @min-[28rem]:grid-cols-2 @min-[40rem]:grid-cols-3 @min-[56rem]:grid-cols-4";

/**
 * The `/time` Months level: one year as twelve mini calendars, shaded by hours per day, with older
 * years stacked below as they are loaded. Columns follow the panel's own width (container queries),
 * not the viewport's, because the app sidebar takes a varying share of it.
 */
export function YearCalendar({
  years,
  durationDisplayFormat,
  locale,
  onSelectMonth,
  onSelectDay,
  onReachEnd,
  loadingMore = false,
  className,
}: YearCalendarProps) {
  const t = useTranslations("TimeMonthsView");
  const weekdayInitials = useMemo(
    () =>
      // 2026-01-05 is a Monday, so these seven dates give Monday-first initials.
      Array.from({ length: 7 }, (_, index) =>
        formatWeekdayLabel(`2026-01-${String(5 + index).padStart(2, "0")}`, locale, {
          style: "narrow",
        }),
      ),
    [locale],
  );
  const hasLeave = years.some((overview) => (overview.leaveDays?.length ?? 0) > 0);
  const oldestYear = years.at(-1)?.year;
  const nextYear = oldestYear === undefined ? undefined : oldestYear - 1;

  return (
    <div className={cn("@container grid min-w-0 gap-4", className)}>
      {years.map((overview, index) => (
        <div key={overview.year} className="grid min-w-0 gap-4">
          <YearSection
            overview={overview}
            headingVisible={index > 0}
            weekdayInitials={weekdayInitials}
            locale={locale}
            durationDisplayFormat={durationDisplayFormat}
            onSelectMonth={onSelectMonth}
            onSelectDay={onSelectDay}
          />
          {index === 0 ? <Legend showLeave={hasLeave} /> : null}
        </div>
      ))}

      {loadingMore && nextYear !== undefined ? (
        <div role="status" className="grid min-w-0 gap-3">
          <span className="sr-only">{t("loadingYear", { year: nextYear })}</span>
          <Skeleton variant="line" className="mt-4 h-5 w-24" />
          <div className={MONTH_GRID}>
            {/* One row at every column count. */}
            {SKELETON_CARDS.map((visibility, index) => (
              <Skeleton key={index} variant="card" className={cn("h-56", visibility)} />
            ))}
          </div>
        </div>
      ) : null}

      {onReachEnd && nextYear !== undefined ? (
        <EndSentinel
          loadingMore={loadingMore}
          resetKey={years.length}
          label={t("loadYear", { year: nextYear })}
          onReachEnd={onReachEnd}
        />
      ) : null}
    </div>
  );
}

function YearSection({
  overview,
  headingVisible,
  weekdayInitials,
  locale,
  durationDisplayFormat,
  onSelectMonth,
  onSelectDay,
}: {
  overview: YearCalendarOverview;
  headingVisible: boolean;
  weekdayInitials: string[];
  locale: string;
  durationDisplayFormat: YearCalendarProps["durationDisplayFormat"];
  onSelectMonth: YearCalendarProps["onSelectMonth"];
  onSelectDay: YearCalendarProps["onSelectDay"];
}) {
  const headingId = useId();
  const minutesByDay = useMemo(
    () => new Map(overview.days.map((day) => [day.isoDate, day.minutes])),
    [overview.days],
  );
  const leaveByDay = useMemo(
    () =>
      new Map<string, YearCalendarDay["leave"]>(
        (overview.leaveDays ?? []).map((day) => [day.isoDate, day.dayPart]),
      ),
    [overview.leaveDays],
  );

  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-3">
      {/* The first year is named by the shared period bar above, so its heading is for AT only. */}
      <div
        className={
          headingVisible
            ? "flex min-w-0 items-baseline justify-between gap-3 border-t border-border px-1 pt-5"
            : "sr-only"
        }
      >
        <h2 id={headingId} className="m-0 font-ui text-lg font-semibold text-foreground">
          {overview.year}
        </h2>
        <span className="shrink-0 font-ui text-sm font-semibold whitespace-nowrap text-muted-foreground tabular-nums">
          {formatHoursWithUnit(overview.totalMinutes, locale, durationDisplayFormat)}
        </span>
      </div>
      <ul className={cn(MONTH_GRID, "m-0 list-none p-0")}>
        {overview.months.map((month) => (
          <YearCalendarMonth
            key={month.monthStart}
            month={month}
            todayIso={overview.todayIso}
            profile={overview.profile}
            minutesByDay={minutesByDay}
            leaveByDay={leaveByDay}
            weekdayInitials={weekdayInitials}
            locale={locale}
            durationDisplayFormat={durationDisplayFormat}
            onSelectMonth={onSelectMonth}
            onSelectDay={onSelectDay}
          />
        ))}
      </ul>
    </section>
  );
}

function Legend({ showLeave }: { showLeave: boolean }) {
  const t = useTranslations("TimeMonthsView.legend");
  const swatch = "size-3 shrink-0 rounded-[3px] text-[0px]";
  const steps = [
    { level: 0, label: t("none") },
    { level: 1, label: t("short") },
    { level: 2, label: t("medium") },
    { level: 3, label: t("full") },
    { level: 4, label: t("long") },
  ] as const;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5 px-1 font-ui text-xs text-muted-foreground">
      <ul
        aria-label={t("label")}
        className="m-0 flex min-w-0 list-none flex-wrap gap-x-3.5 gap-y-1.5 p-0"
      >
        {steps.map((step) => (
          <li key={step.level} className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span
              aria-hidden="true"
              className={cn(yearDayVariants({ level: step.level }), swatch, "aspect-auto")}
            />
            {step.label}
          </li>
        ))}
        <li className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span
            aria-hidden="true"
            className={cn(yearDayVariants({ level: 0, timing: "future" }), swatch, "aspect-auto")}
          />
          {t("upcoming")}
        </li>
        {showLeave ? (
          <li className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span aria-hidden="true" className="grid size-3 place-items-center">
              <span className="size-[3px] rounded-full bg-current" />
            </span>
            {t("leave")}
          </li>
        ) : null}
      </ul>
      <span className="ms-auto min-w-0">{t("hint")}</span>
    </div>
  );
}

/**
 * Asks for the next year once the end of the stack nears the viewport. A fresh observer per load
 * (`resetKey`) re-checks a sentinel that is still visible; the button is the keyboard fallback.
 */
function EndSentinel({
  loadingMore,
  resetKey,
  label,
  onReachEnd,
}: {
  loadingMore: boolean;
  resetKey: number;
  label: string;
  onReachEnd: () => void;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onReachEndRef = useRef(onReachEnd);

  useEffect(() => {
    onReachEndRef.current = onReachEnd;
  }, [onReachEnd]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loadingMore || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          onReachEndRef.current();
        }
      },
      { rootMargin: "0px 0px 600px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadingMore, resetKey]);

  return (
    <div ref={sentinelRef} className="flex justify-center py-2">
      {loadingMore ? null : (
        <Button variant="ghost" size="sm" onClick={onReachEnd}>
          {label}
        </Button>
      )}
    </div>
  );
}
