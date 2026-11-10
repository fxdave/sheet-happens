"use client";

import {
  AlertTriangle,
  ArrowDown,
  Lock,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Square,
  Trash2,
} from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { formatHoursWithUnit } from "@/src/lib/formatting";
import { cn } from "@/src/lib/utils";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "../../ui/Dropdown";
import { Skeleton } from "../../ui/Skeleton";
import type {
  DayLogDay,
  DayLogEntry,
  DayLogLabels,
  DayLogProps,
  DayLogRunningTimer,
  DayLogWeek,
} from "./DayLog.types";

/** Phone first; from a 42rem-wide container the project and the range get their own columns. */
const ROW_GRID =
  "grid grid-cols-[4px_minmax(0,1fr)_auto_1.75rem_1.25rem] items-center gap-x-2.5 px-3 py-2 @2xl:grid-cols-[4px_minmax(0,1fr)_minmax(0,11rem)_auto_4rem_1.75rem_1.25rem] @2xl:gap-x-3.5 @2xl:px-3.5";

/**
 * The Days view: ISO weeks newest first, each a heading and its day cards, each card its entries.
 * Every text column can shrink to nothing — descriptions clamp to two lines, project names
 * ellipsize, times and durations never wrap — so no length of either overflows a row.
 */
export function DayLog({
  weeks,
  runningTimer = null,
  capacityMinutes,
  locale,
  durationDisplayFormat,
  labels,
  header,
  disabled = false,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  onAddEntry,
  onEditEntry,
  onDeleteEntry,
  onContinueEntry,
  onStopTimer,
}: DayLogProps) {
  const formatMinutes = (minutes: number) =>
    formatHoursWithUnit(minutes, locale, durationDisplayFormat);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadRef = useRef<{ ready: boolean; load?: () => void }>({ ready: false });

  useEffect(() => {
    loadRef.current = { ready: hasMore && !loadingMore, load: onLoadMore };
  });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (records) => {
        if (records.some((record) => record.isIntersecting) && loadRef.current.ready) {
          loadRef.current.load?.();
        }
      },
      { rootMargin: "480px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
    // Re-armed after each page so a sentinel still in view after a load asks for the next one.
  }, [weeks.length, hasMore, loadingMore]);

  return (
    <div className="@container min-w-0 pb-3">
      {header}

      {weeks.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">{labels.empty}</p>
      ) : (
        weeks.map((week) => (
          <WeekSection
            key={week.weekStart}
            week={week}
            runningTimer={runningTimer}
            capacityMinutes={capacityMinutes}
            formatMinutes={formatMinutes}
            labels={labels}
            disabled={disabled}
            onAddEntry={onAddEntry}
            onEditEntry={onEditEntry}
            onDeleteEntry={onDeleteEntry}
            onContinueEntry={onContinueEntry}
            onStopTimer={onStopTimer}
          />
        ))
      )}

      {hasMore ? (
        <div ref={sentinelRef} className="grid gap-2 px-2.5 pt-3 @2xl:px-4">
          {loadingMore ? (
            <div
              aria-hidden="true"
              className="grid gap-2.5 rounded-[var(--radius-md)] border border-border p-3.5"
            >
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-3" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ) : null}
          <button
            type="button"
            disabled={loadingMore || !onLoadMore}
            className="mx-auto inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-3 py-1.5 font-ui text-[13px] font-semibold text-muted-foreground transition-colors duration-[var(--duration-micro)] hover:bg-secondary hover:text-foreground disabled:hover:bg-transparent"
            onClick={onLoadMore}
          >
            {loadingMore ? null : <ArrowDown className="size-3.5" aria-hidden="true" />}
            <span aria-live="polite">
              {loadingMore ? labels.loadingEarlier : labels.loadEarlier}
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

type SectionProps = {
  runningTimer: DayLogRunningTimer | null;
  capacityMinutes: number;
  formatMinutes: (minutes: number) => string;
  labels: DayLogLabels;
  disabled: boolean;
  onAddEntry: (day: DayLogDay) => void;
  onEditEntry: (entry: DayLogEntry) => void;
  onDeleteEntry: (entry: DayLogEntry) => void;
  onContinueEntry: (entry: DayLogEntry) => void;
  onStopTimer: () => void;
};

function WeekSection({ week, ...props }: SectionProps & { week: DayLogWeek }) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="min-w-0">
      <div className="flex min-w-0 items-baseline justify-between gap-3 px-4 pt-4 pb-1.5 @2xl:px-5">
        <h2
          id={headingId}
          className="min-w-0 truncate font-ui text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase"
        >
          {week.heading}
        </h2>
        <span className="shrink-0 font-ui text-[13px] font-bold whitespace-nowrap tabular-nums text-foreground">
          {props.formatMinutes(week.totalMinutes)}
        </span>
      </div>
      <div className="grid min-w-0 gap-1.5 px-2.5 @2xl:px-4">
        {week.days.map((day) => (
          <DayCard key={day.isoDate} day={day} {...props} />
        ))}
      </div>
    </section>
  );
}

function DayCard({
  day,
  runningTimer,
  capacityMinutes,
  formatMinutes,
  labels,
  disabled,
  onAddEntry,
  onEditEntry,
  onDeleteEntry,
  onContinueEntry,
  onStopTimer,
}: SectionProps & { day: DayLogDay }) {
  const headingId = useId();
  const running = day.today ? runningTimer : null;
  const empty = day.entries.length === 0 && !running;
  const closed = day.locked || day.onLeave;
  const collapsed = empty && day.weekend && !day.today && !day.onLeave;

  const addButton = closed ? null : (
    <button
      type="button"
      disabled={disabled}
      aria-label={labels.addEntry(day)}
      className="relative z-[1] grid size-7 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-dashed border-accent-line text-accent transition-colors duration-[var(--duration-micro)] hover:bg-accent-soft disabled:opacity-50"
      onClick={() => onAddEntry(day)}
    >
      <Plus className="size-3.5" aria-hidden="true" />
    </button>
  );

  const summary = (
    <div className="ml-auto flex shrink-0 items-center gap-2.5">
      {day.locked ? (
        <Lock className="size-3.5 text-muted-foreground" aria-label={labels.locked} role="img" />
      ) : null}
      <span
        className={cn(
          "font-ui text-sm font-semibold whitespace-nowrap tabular-nums",
          collapsed ? "text-subtle-foreground" : "text-foreground",
        )}
      >
        {formatMinutes(day.totalMinutes)}
      </span>
      <ProgressBar
        minutes={day.totalMinutes}
        capacityMinutes={capacityMinutes}
        label={labels.progress(day)}
      />
      {addButton}
    </div>
  );

  if (collapsed) {
    return (
      <section
        aria-labelledby={headingId}
        className="flex min-w-0 items-center gap-2.5 rounded-[var(--radius-md)] border border-border px-3 py-1.5 @2xl:px-3.5"
      >
        <h3
          id={headingId}
          className="min-w-0 truncate text-sm font-medium text-subtle-foreground"
          aria-label={day.fullLabel}
        >
          {day.label}
        </h3>
        {summary}
      </section>
    );
  }

  return (
    <section
      aria-labelledby={headingId}
      className="min-w-0 rounded-[var(--radius-md)] border border-border"
    >
      <div
        className={cn(
          "flex min-w-0 items-center gap-2.5 rounded-t-[var(--radius-md)] bg-surface-inset px-3 py-2 @2xl:px-3.5",
          day.today && "max-sm:sticky max-sm:top-[var(--header-h)] max-sm:z-[5] max-sm:shadow-sm",
        )}
      >
        <h3
          id={headingId}
          aria-label={day.today ? `${day.fullLabel}, ${labels.today}` : day.fullLabel}
          className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground"
        >
          <span className="min-w-0 truncate">{day.label}</span>
          {day.today ? (
            <span className="shrink-0 rounded-[var(--radius-pill)] bg-accent-soft px-2 py-0.5 font-ui text-[11px] font-semibold text-accent">
              {labels.today}
            </span>
          ) : null}
        </h3>
        {summary}
      </div>

      {empty ? (
        <EmptyLine day={day} labels={labels} />
      ) : (
        <ul className="min-w-0">
          {running ? (
            <RunningRow timer={running} labels={labels} disabled={disabled} onStop={onStopTimer} />
          ) : null}
          {day.entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              labels={labels}
              disabled={disabled}
              formatMinutes={formatMinutes}
              onEdit={onEditEntry}
              onDelete={onDeleteEntry}
              onContinue={onContinueEntry}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function EmptyLine({ day, labels }: { day: DayLogDay; labels: DayLogLabels }) {
  const warn = !day.onLeave && !day.today && !day.weekend && !day.locked;
  const text = day.onLeave
    ? labels.onLeave
    : day.today
      ? labels.nothingLoggedToday
      : warn
        ? labels.nothingLoggedWorkday
        : labels.nothingLogged;

  return (
    <p
      className={cn(
        "flex min-w-0 items-center gap-2 border-t border-border px-3 py-2 text-[13px] @2xl:px-3.5",
        warn ? "text-warning" : "text-subtle-foreground",
      )}
    >
      {warn ? <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" /> : null}
      <span className="min-w-0 [overflow-wrap:anywhere]">{text}</span>
    </p>
  );
}

function ProgressBar({
  minutes,
  capacityMinutes,
  label,
}: {
  minutes: number;
  capacityMinutes: number;
  label: string;
}) {
  const ratio = capacityMinutes > 0 ? Math.min(1, minutes / capacityMinutes) : 0;

  return (
    <span
      role="img"
      aria-label={label}
      className="relative hidden h-1 w-12 shrink-0 overflow-hidden rounded-full bg-secondary min-[360px]:block @2xl:w-[70px]"
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 rounded-full",
          minutes > capacityMinutes ? "bg-warning" : "bg-accent",
        )}
        style={{ width: `${ratio * 100}%` }}
      />
    </span>
  );
}

function ColorBar({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="h-full min-h-6 w-1 self-stretch rounded-[3px]"
      style={{ backgroundColor: color }}
    />
  );
}

function formatRange(start: string | null, end: string | null) {
  return start && end ? `${start}–${end}` : null;
}

function EntryRow({
  entry,
  labels,
  disabled,
  formatMinutes,
  onEdit,
  onDelete,
  onContinue,
}: {
  entry: DayLogEntry;
  labels: DayLogLabels;
  disabled: boolean;
  formatMinutes: (minutes: number) => string;
  onEdit: (entry: DayLogEntry) => void;
  onDelete: (entry: DayLogEntry) => void;
  onContinue: (entry: DayLogEntry) => void;
}) {
  const range = formatRange(entry.startTime, entry.endTime);
  const description = (
    <span className="line-clamp-2 text-sm font-medium text-foreground [overflow-wrap:anywhere]">
      {entry.description}
    </span>
  );

  return (
    <li
      className={cn(
        ROW_GRID,
        "relative border-t border-border transition-colors duration-[var(--duration-micro)]",
        !entry.locked && "hover:bg-secondary/40",
      )}
    >
      <ColorBar color={entry.projectColor} />

      <div className="min-w-0">
        {entry.locked ? (
          description
        ) : (
          /* The whole row opens the dialog: the description's hit area stretches over it. */
          <button
            type="button"
            disabled={disabled}
            aria-label={labels.edit(entry)}
            className="block w-full min-w-0 text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-[var(--radius-sm)] focus-visible:after:ring-2 focus-visible:after:ring-ring"
            onClick={() => onEdit(entry)}
          >
            {description}
          </button>
        )}
        <p className="mt-0.5 flex min-w-0 items-center text-xs text-muted-foreground @2xl:hidden">
          <span className="min-w-0 truncate">{entry.projectName}</span>
          <span className="shrink-0 whitespace-nowrap tabular-nums">&nbsp;· {range ?? "—"}</span>
        </p>
      </div>

      <span className="hidden min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground @2xl:flex">
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: entry.projectColor }}
        />
        <span className="min-w-0 truncate">{entry.projectName}</span>
      </span>
      <span className="hidden text-[13px] whitespace-nowrap tabular-nums text-muted-foreground @2xl:block">
        {range ?? "—"}
      </span>
      <span className="text-right text-sm font-semibold whitespace-nowrap tabular-nums text-foreground">
        {formatMinutes(entry.durationMinutes)}
      </span>

      <button
        type="button"
        disabled={disabled}
        aria-label={labels.continue(entry)}
        title={labels.continue(entry)}
        className="relative z-[1] grid size-7 place-items-center rounded-full border border-border bg-card text-accent transition-colors duration-[var(--duration-micro)] hover:border-accent-line hover:bg-accent-soft disabled:opacity-50"
        onClick={() => onContinue(entry)}
      >
        <Play className="size-3 fill-current" aria-hidden="true" />
      </button>

      {entry.locked ? (
        <Lock
          role="img"
          aria-label={labels.locked}
          className="relative z-[1] size-3.5 justify-self-center text-subtle-foreground"
        />
      ) : (
        <Dropdown>
          <DropdownTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label={labels.more(entry)}
              className="relative z-[1] grid size-5 place-items-center rounded-[var(--radius-xs)] text-subtle-foreground transition-colors duration-[var(--duration-micro)] hover:bg-secondary hover:text-foreground disabled:opacity-50"
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>
          </DropdownTrigger>
          <DropdownContent align="end">
            <DropdownItem onSelect={() => onEdit(entry)}>
              <Pencil className="size-4" aria-hidden="true" />
              {labels.edit(entry)}
            </DropdownItem>
            <DropdownItem tone="danger" onSelect={() => onDelete(entry)}>
              <Trash2 className="size-4" aria-hidden="true" />
              {labels.delete(entry)}
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      )}
    </li>
  );
}

function RunningRow({
  timer,
  labels,
  disabled,
  onStop,
}: {
  timer: DayLogRunningTimer;
  labels: DayLogLabels;
  disabled: boolean;
  onStop: () => void;
}) {
  const range = `${timer.startTime}–${labels.now}`;

  return (
    <li className={cn(ROW_GRID, "border-t border-border bg-accent-soft/50")}>
      <ColorBar color={timer.projectColor} />
      <div className="min-w-0">
        <span className="sr-only">{labels.running}: </span>
        <span className="line-clamp-2 text-sm font-medium text-foreground [overflow-wrap:anywhere]">
          {timer.description}
        </span>
        <p className="mt-0.5 flex min-w-0 items-center text-xs text-muted-foreground @2xl:hidden">
          <span className="min-w-0 truncate">{timer.projectName}</span>
          <span className="shrink-0 whitespace-nowrap tabular-nums">&nbsp;· {range}</span>
        </p>
      </div>
      <span className="hidden min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground @2xl:flex">
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: timer.projectColor }}
        />
        <span className="min-w-0 truncate">{timer.projectName}</span>
      </span>
      <span className="hidden text-[13px] whitespace-nowrap tabular-nums text-muted-foreground @2xl:block">
        {range}
      </span>
      <span className="text-right font-ui text-sm font-bold whitespace-nowrap tabular-nums text-accent">
        {timer.elapsedLabel}
      </span>
      <button
        type="button"
        disabled={disabled}
        aria-label={labels.stopTimer}
        title={labels.stopTimer}
        className="grid size-7 place-items-center rounded-full border border-destructive/30 bg-card text-destructive transition-colors duration-[var(--duration-micro)] hover:bg-destructive-soft disabled:opacity-50"
        onClick={onStop}
      >
        <Square className="size-2.5 fill-current" aria-hidden="true" />
      </button>
      <span aria-hidden="true" />
    </li>
  );
}
