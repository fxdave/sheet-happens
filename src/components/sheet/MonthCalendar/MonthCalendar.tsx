"use client";

import { Lock, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, type CSSProperties } from "react";

import { formatDateLabel, formatHoursWithUnit, formatWeekdayLabel } from "@/src/lib/formatting";
import { cn } from "@/src/lib/utils";
import { Skeleton } from "../../ui/Skeleton";
import { buildListWeeks, isNothingLogged, MAX_VISIBLE_ENTRIES } from "./MonthCalendar.model";
import type {
  MonthCalendarDay,
  MonthCalendarEntry,
  MonthCalendarProps,
  MonthCalendarWeek,
} from "./MonthCalendar.types";
import { monthCalendarCellVariants, monthCalendarRowVariants } from "./MonthCalendar.variants";

/**
 * Weekdays share the room and the week total is a slim column. The weekend pair is narrow while
 * it is empty, and widens once it holds entries so their words still fit a line.
 */
const GRID_COLUMNS = {
  emptyWeekend:
    "grid-cols-[repeat(5,minmax(0,1fr))_repeat(2,minmax(0,0.55fr))_minmax(3.25rem,4.75rem)]",
  busyWeekend:
    "grid-cols-[repeat(5,minmax(0,1fr))_repeat(2,minmax(0,0.8fr))_minmax(3.25rem,4.75rem)]",
};

/**
 * The Weeks level of `/time`: a calendar month whose rows are ISO weeks. From 768px it is the
 * classic 7-column grid with a week-total column; below that, a newest-first list of weeks that
 * asks for earlier ones through `onReachEnd` as its bottom comes into view.
 */
export function MonthCalendar({ layout, ...props }: MonthCalendarProps) {
  if (layout === "grid") return <MonthGrid {...props} />;
  if (layout === "list") return <WeekList {...props} />;

  // Both, switched in CSS, so the server render is already right on a phone: no grid flash.
  return (
    <>
      <div className="hidden min-w-0 md:block">
        <MonthGrid {...props} />
      </div>
      <div className="min-w-0 md:hidden">
        <WeekList {...props} />
      </div>
    </>
  );
}

type InnerProps = Omit<MonthCalendarProps, "layout">;

function useDayFormatting(
  locale: string,
  durationDisplayFormat: InnerProps["durationDisplayFormat"],
) {
  const t = useTranslations("TimeWeeksView");

  return useMemo(() => {
    const longDate = new Intl.DateTimeFormat(locale, {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
    const hours = (minutes: number) => formatHoursWithUnit(minutes, locale, durationDisplayFormat);

    /** Unique per day, e.g. "Tuesday, November 10, 8 hours, locked". */
    const dayName = (day: MonthCalendarDay, gap: boolean) => {
      const date = longDate.format(new Date(`${day.isoDate}T00:00:00.000Z`));
      const name =
        day.totalMinutes > 0
          ? t("dayName", {
              date,
              hours: t("hours", { hours: Math.round((day.totalMinutes / 60) * 100) / 100 }),
            })
          : day.onLeave
            ? t("dayNameOnLeave", { date })
            : gap
              ? t("dayNameNothingLogged", { date })
              : date;

      return day.locked ? t("dayNameLocked", { name }) : name;
    };

    return { t, hours, dayName };
  }, [durationDisplayFormat, locale, t]);
}

function MonthGrid({
  calendar,
  durationDisplayFormat,
  locale,
  onSelectDay,
  className,
}: InnerProps) {
  const { t, hours, dayName } = useDayFormatting(locale, durationDisplayFormat);
  const headerDays = calendar.weeks[0]?.days ?? [];
  const busyWeekend = calendar.weeks.some((week) =>
    week.days.some((day) => day.isWeekend && day.entries.length > 0),
  );

  return (
    <div
      role="group"
      aria-label={t("calendarLabel", {
        month: new Intl.DateTimeFormat(locale, {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(`${calendar.monthStart}T00:00:00.000Z`)),
      })}
      className={cn(
        "grid min-w-0",
        busyWeekend ? GRID_COLUMNS.busyWeekend : GRID_COLUMNS.emptyWeekend,
        className,
      )}
    >
      <div aria-hidden className="col-span-full grid grid-cols-subgrid border-b border-border">
        {headerDays.map((day) => (
          <span
            key={day.isoDate}
            className="truncate px-2 py-2 font-ui text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
          >
            {formatWeekdayLabel(day.isoDate, locale)}
          </span>
        ))}
        <span className="truncate px-2 py-2 text-right font-ui text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {t("week")}
        </span>
      </div>

      {calendar.weeks.map((week) => (
        <div
          key={week.weekStart}
          role="group"
          aria-label={t("weekGroup", {
            week: week.isoWeek,
            total: week.totalMinutes ? hours(week.totalMinutes) : t("noHours"),
          })}
          className="col-span-full grid grid-cols-subgrid last:[&>*]:border-b-0"
        >
          {week.days.map((day) => (
            <DayCell
              key={day.isoDate}
              day={day}
              locale={locale}
              name={dayName(day, day.inMonth && isNothingLogged(day))}
              hours={hours}
              onSelectDay={onSelectDay}
            />
          ))}
          <div className="min-w-0 border-b border-border bg-surface-inset px-2 py-2 text-right">
            <div className="truncate font-ui text-[11px] font-semibold text-muted-foreground">
              {t("weekNumber", { week: week.isoWeek })}
            </div>
            <div className="truncate font-ui text-base font-semibold tabular-nums">
              {week.totalMinutes ? hours(week.totalMinutes) : t("noHours")}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DayCell({
  day,
  locale,
  name,
  hours,
  onSelectDay,
}: {
  day: MonthCalendarDay;
  locale: string;
  name: string;
  hours: (minutes: number) => string;
  onSelectDay: (isoDate: string) => void;
}) {
  const t = useTranslations("TimeWeeksView");
  const visible = day.entries.slice(0, MAX_VISIBLE_ENTRIES);
  const more = day.entries.length - visible.length;
  const dayOfMonth = Number(day.isoDate.slice(8));
  const faded = !day.inMonth && "opacity-50";

  return (
    <button
      type="button"
      aria-label={name}
      onClick={() => onSelectDay(day.isoDate)}
      className={monthCalendarCellVariants({
        period: day.inMonth ? "current" : "adjacent",
        weekend: day.isWeekend,
        today: day.isToday,
      })}
    >
      <span className={cn("flex min-w-0 flex-wrap items-center justify-between gap-x-1", faded)}>
        <span className="flex min-w-0 items-center gap-1">
          <span
            className={cn(
              "truncate font-ui text-[13px] font-semibold tabular-nums",
              day.isToday &&
                "rounded-[var(--radius-pill)] bg-primary px-[7px] text-primary-foreground",
              day.isFuture && !day.isToday && "text-subtle-foreground",
            )}
          >
            {dayOfMonth === 1
              ? formatDateLabel(day.isoDate, locale, { style: "short" })
              : dayOfMonth}
          </span>
          {day.locked ? (
            <Lock aria-hidden className="size-3 shrink-0 text-subtle-foreground" />
          ) : null}
        </span>
        {day.totalMinutes > 0 ? (
          <span className="whitespace-nowrap font-ui text-[11px] font-semibold tabular-nums text-muted-foreground">
            {hours(day.totalMinutes)}
          </span>
        ) : null}
      </span>

      {day.onLeave ? (
        <span
          className={cn(
            "truncate rounded-[var(--radius-xs)] bg-verified-soft px-1.5 py-0.5 text-[11px] font-semibold text-foreground",
            faded,
          )}
        >
          {t("onLeave")}
        </span>
      ) : null}

      {visible.length ? (
        <span className={cn("grid min-w-0 gap-[3px]", faded)}>
          {visible.map((entry) => (
            <EntryChip key={entry.id} entry={entry} hours={hours} density="cell" />
          ))}
        </span>
      ) : null}

      {more > 0 ? (
        <span className={cn("truncate pl-1 font-ui text-[11px] font-semibold text-primary", faded)}>
          {t("moreEntries", { count: more })}
        </span>
      ) : null}

      {day.inMonth && isNothingLogged(day) ? <NothingLogged /> : null}
    </button>
  );
}

function NothingLogged() {
  const t = useTranslations("TimeWeeksView");

  return (
    <span className="flex min-w-0 items-start gap-1 pl-1 font-ui text-[11px] font-semibold leading-snug text-warning">
      <TriangleAlert aria-hidden className="mt-px size-3 shrink-0" />
      <span className="min-w-0 break-words">{t("nothingLogged")}</span>
    </span>
  );
}

function EntryChip({
  entry,
  hours,
  density,
}: {
  entry: MonthCalendarEntry;
  hours: (minutes: number) => string;
  density: "cell" | "row";
}) {
  const label = entry.description.trim() || entry.projectName;

  return (
    <span
      title={`${entry.projectName} · ${label}`}
      style={
        {
          "--chip": entry.projectColor,
          background: "color-mix(in srgb, var(--chip) 13%, transparent)",
        } as CSSProperties
      }
      className={cn(
        "grid min-w-0 grid-cols-[3px_minmax(0,1fr)] gap-1 rounded-[var(--radius-xs)] px-1 py-[3px] leading-[1.3] xl:gap-[5px] xl:px-[5px]",
        density === "cell" ? "text-[11.5px]" : "text-[13px]",
      )}
    >
      <span aria-hidden className="rounded-full bg-[var(--chip)]" />
      <span className="@container min-w-0">
        <span className="line-clamp-2 [overflow-wrap:normal] @max-[6.5rem]:line-clamp-3 @max-[6.5rem]:break-words">
          <span className="float-right ml-1.5 whitespace-nowrap @max-[6.5rem]:float-none @max-[6.5rem]:ml-0 @max-[6.5rem]:block @max-[3.5rem]:hidden font-ui font-semibold tabular-nums text-muted-foreground">
            {hours(entry.durationMinutes)}
          </span>
          <WrappedText text={label} />
        </span>
        {density === "row" ? (
          <span className="block truncate text-[11.5px] text-muted-foreground">
            {entry.projectName}
          </span>
        ) : null}
      </span>
    </span>
  );
}

/** Longest run a chip can hold beside its floated hours without breaking it. */
const UNBREAKABLE_RUN = 14;

/*
 * Beside a float Chrome splits any word that does not fit the shortened line, even under
 * `overflow-wrap: break-word`. So normal words wrap only at spaces, and only runs too long for a
 * whole line may break anywhere.
 */
function WrappedText({ text }: { text: string }) {
  return text.split(/(\s+)/).map((token, index) =>
    token.split(/[-‐–—/]/).some((run) => run.length > UNBREAKABLE_RUN) ? (
      <span key={index} className="[overflow-wrap:anywhere]">
        {token}
      </span>
    ) : (
      token
    ),
  );
}

function WeekList({
  calendar,
  earlierCalendars = [],
  durationDisplayFormat,
  locale,
  onSelectDay,
  onReachEnd,
  loadingMore = false,
  hasMore = true,
  className,
}: InnerProps) {
  const { t, hours, dayName } = useDayFormatting(locale, durationDisplayFormat);
  const weeks = useMemo(
    () => buildListWeeks([calendar, ...earlierCalendars]),
    [calendar, earlierCalendars],
  );

  return (
    <div aria-label={t("listLabel")} role="region" className={cn("grid min-w-0 gap-4", className)}>
      {weeks.length ? (
        <ol className="grid min-w-0 gap-4">
          {weeks.map((week) => (
            <li key={week.weekStart} className="min-w-0">
              <WeekSection
                week={week}
                locale={locale}
                hours={hours}
                dayName={dayName}
                onSelectDay={onSelectDay}
              />
            </li>
          ))}
        </ol>
      ) : !loadingMore ? (
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">{t("emptyList")}</p>
      ) : null}

      {loadingMore ? (
        <div className="grid gap-2" aria-busy="true">
          <span className="sr-only" role="status">
            {t("loadingMore")}
          </span>
          <Skeleton variant="line" className="h-3 w-1/3" />
          <Skeleton variant="block" className="h-20" />
        </div>
      ) : null}

      {onReachEnd && hasMore ? (
        <EndSentinel onReachEnd={onReachEnd} disabled={loadingMore} />
      ) : null}
    </div>
  );
}

function WeekSection({
  week,
  locale,
  hours,
  dayName,
  onSelectDay,
}: {
  week: MonthCalendarWeek;
  locale: string;
  hours: (minutes: number) => string;
  dayName: (day: MonthCalendarDay, gap: boolean) => string;
  onSelectDay: (isoDate: string) => void;
}) {
  const t = useTranslations("TimeWeeksView");
  const sunday = new Date(`${week.weekStart}T00:00:00.000Z`);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  const range = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" })
    .formatRange(new Date(`${week.weekStart}T00:00:00.000Z`), sunday)
    // Node and Chrome disagree on the thin space around the dash; see `formatDateRangeLabel`.
    .replace(/[  ]/g, " ");
  const total = week.totalMinutes ? hours(week.totalMinutes) : t("noHours");

  return (
    <section
      aria-label={t("weekGroup", { week: week.isoWeek, total })}
      className="grid min-w-0 gap-2"
    >
      <h2 className="flex min-w-0 items-baseline justify-between gap-3 px-1 font-ui text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <span className="min-w-0 truncate">
          {t("weekRange", { week: t("weekNumber", { week: week.isoWeek }), range })}
        </span>
        <span className="whitespace-nowrap text-sm normal-case tracking-normal text-foreground tabular-nums">
          {total}
        </span>
      </h2>
      <ul className="grid min-w-0 divide-y divide-border overflow-hidden rounded-[var(--radius-md)] border border-border bg-card">
        {week.days.map((day) => (
          <li key={day.isoDate} className="min-w-0">
            <DayRow
              day={day}
              locale={locale}
              name={dayName(day, isNothingLogged(day))}
              hours={hours}
              onSelectDay={onSelectDay}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function DayRow({
  day,
  locale,
  name,
  hours,
  onSelectDay,
}: {
  day: MonthCalendarDay;
  locale: string;
  name: string;
  hours: (minutes: number) => string;
  onSelectDay: (isoDate: string) => void;
}) {
  const t = useTranslations("TimeWeeksView");
  const visible = day.entries.slice(0, MAX_VISIBLE_ENTRIES);
  const more = day.entries.length - visible.length;
  const label = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day.isoDate}T00:00:00.000Z`));

  return (
    <button
      type="button"
      aria-label={name}
      onClick={() => onSelectDay(day.isoDate)}
      className={monthCalendarRowVariants({ today: day.isToday })}
    >
      <span className="flex min-w-0 items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-ui text-sm font-semibold">{label}</span>
          {day.isToday ? (
            <span className="whitespace-nowrap rounded-[var(--radius-pill)] bg-accent-soft px-2 py-0.5 font-ui text-[11px] font-semibold text-foreground">
              {t("today")}
            </span>
          ) : null}
          {day.locked ? (
            <Lock aria-hidden className="size-3.5 shrink-0 text-subtle-foreground" />
          ) : null}
        </span>
        {day.totalMinutes > 0 ? (
          <span className="whitespace-nowrap font-ui text-sm font-semibold tabular-nums">
            {hours(day.totalMinutes)}
          </span>
        ) : null}
      </span>

      {day.onLeave ? (
        <span className="w-fit max-w-full truncate rounded-[var(--radius-xs)] bg-verified-soft px-1.5 py-0.5 text-xs font-semibold text-foreground">
          {t("onLeave")}
        </span>
      ) : null}

      {visible.length ? (
        <span className="grid min-w-0 gap-1">
          {visible.map((entry) => (
            <EntryChip key={entry.id} entry={entry} hours={hours} density="row" />
          ))}
        </span>
      ) : null}

      {more > 0 ? (
        <span className="truncate pl-1 font-ui text-xs font-semibold text-primary">
          {t("moreEntries", { count: more })}
        </span>
      ) : null}

      {isNothingLogged(day) ? <NothingLogged /> : null}
    </button>
  );
}

/** Calls `onReachEnd` whenever the bottom of the list scrolls within reach. */
function EndSentinel({ onReachEnd, disabled }: { onReachEnd: () => void; disabled: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onReachEnd);

  useEffect(() => {
    callback.current = onReachEnd;
  }, [onReachEnd]);

  useEffect(() => {
    const node = ref.current;
    if (!node || disabled || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (records) => {
        if (records.some((record) => record.isIntersecting)) callback.current();
      },
      { rootMargin: "0px 0px 400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [disabled]);

  return <div ref={ref} aria-hidden className="h-px" />;
}
