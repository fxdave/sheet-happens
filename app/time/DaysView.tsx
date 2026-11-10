"use client";

import type { Route } from "next";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  DayLog,
  type DayLogEntry,
  type DayLogRunningTimer,
  type DayLogWeek,
} from "@/src/components/sheet/DayLog";
import { TimerComposer, type TimerComposerValue } from "@/src/components/sheet/TimerComposer";
import {
  formatDateLabel,
  formatDayCardLabel,
  formatShortDateRangeLabel,
} from "@/src/lib/formatting";
import { DAILY_SOFT_WARNING_MINUTES } from "@/src/lib/time-entry-limits";
import { useElapsedLabel } from "@/src/lib/use-elapsed-label";
import type {
  MemberTimeDays,
  TimeDaysWeek,
  TimeGridAssignedProject,
  TimeGridEntry,
} from "@/src/server/time-tracking";

import { loadEarlierTimeDaysAction, switchRunningTimerAction } from "./actions";
import type { TimeViewActions } from "./TimePageClient";
import { useDescriptionSuggestions } from "./use-description-suggestions";
import { useDurationFormatting } from "./use-duration-formatting";
import { buildTimeHref, isWeekendIso } from "./view";

type DaysViewProps = {
  days: MemberTimeDays;
  actions: TimeViewActions;
};

/**
 * The Days tab: the composer, then the log. The first page comes from the server; earlier weeks
 * are fetched as the end of the log scrolls into view and re-read after every write, because a
 * refresh only re-renders the server's page.
 */
export function DaysView({ days, actions }: DaysViewProps) {
  const t = useTranslations("TimeTracking");
  const locale = useLocale();
  const { durationDisplayFormat, formatMinutesWithUnit } = useDurationFormatting();
  const descriptionSuggestions = useDescriptionSuggestions(days.descriptionSuggestions);
  const [earlier, setEarlier] = useState<TimeDaysWeek[]>([]);
  const [earlierProjects, setEarlierProjects] = useState<TimeGridAssignedProject[]>([]);
  const [loadingMore, startLoading] = useTransition();
  const [composer, setComposer] = useState<TimerComposerValue>({ projectId: "", description: "" });
  const [composerError, setComposerError] = useState<string | null>(null);
  const [starting, startStarting] = useTransition();

  const tracked = useMemo(
    () => days.projects.filter((project) => project.trackingMode === "TRACKED"),
    [days.projects],
  );
  const declared = days.projects.filter((project) => project.trackingMode === "DECLARED");
  const projectsById = useMemo(
    () =>
      new Map(
        [...earlierProjects, ...days.projects].map((project) => [project.projectId, project]),
      ),
    [days.projects, earlierProjects],
  );
  const allWeeks = useMemo(() => [...days.weeks, ...earlier], [days.weeks, earlier]);
  const entriesById = useMemo(
    () =>
      new Map(
        allWeeks.flatMap((week) =>
          week.days.flatMap((day) => day.entries.map((entry) => [entry.id, entry] as const)),
        ),
      ),
    [allWeeks],
  );

  /* After a write the server re-sends the first page; the pages scrolled in are re-read with it. */
  const seenPage = useRef(days);
  useEffect(() => {
    if (seenPage.current === days) return;
    seenPage.current = days;

    const count = earlier.length;
    if (count === 0) return;

    let cancelled = false;
    void loadEarlierTimeDaysAction({ before: days.rangeStart, weeks: count }).then((result) => {
      if (cancelled || result.status !== "success") return;
      setEarlier(result.weeks);
      setEarlierProjects(result.projects);
    });
    return () => {
      cancelled = true;
    };
  }, [days, earlier.length]);

  function loadMore() {
    const oldest = allWeeks.at(-1)?.weekStart ?? days.rangeStart;

    startLoading(async () => {
      const result = await loadEarlierTimeDaysAction({ before: oldest });

      if (result.status !== "success") {
        actions.notifyResult({ status: "error", message: t("days.loadFailed") });
        return;
      }
      setEarlier((current) =>
        current.some((week) => week.weekStart === result.weeks[0]?.weekStart)
          ? current
          : [...current, ...result.weeks],
      );
      setEarlierProjects((current) => [...current, ...result.projects]);
    });
  }

  /* ------------------------------------------------------------------------------------------ */
  /* Composer                                                                                   */
  /* ------------------------------------------------------------------------------------------ */

  const recentIds = new Set(days.recentProjects.map((project) => project.projectId));
  const composerProjects = [
    ...days.recentProjects.filter((project) => project.trackingMode === "TRACKED"),
    ...tracked.filter((project) => !recentIds.has(project.projectId)),
  ].map((project) => ({
    projectId: project.projectId,
    name: project.name,
    color: project.color,
    recent: recentIds.has(project.projectId),
  }));
  const composerValue: TimerComposerValue = {
    ...composer,
    projectId: composerProjects.some((project) => project.projectId === composer.projectId)
      ? composer.projectId
      : (composerProjects[0]?.projectId ?? ""),
  };

  function startFromComposer(value: TimerComposerValue) {
    startStarting(async () => {
      const result = await switchRunningTimerAction(value);

      if (result.status !== "success") {
        setComposerError(result.message);
        return;
      }
      descriptionSuggestions.remember(value.projectId, value.description);
      setComposer({ projectId: value.projectId, description: "" });
      setComposerError(null);
      actions.notifyResult(result);
    });
  }

  /* ------------------------------------------------------------------------------------------ */
  /* View-model                                                                                 */
  /* ------------------------------------------------------------------------------------------ */

  const logWeeks: DayLogWeek[] = allWeeks.map((week) => ({
    weekStart: week.weekStart,
    heading: t("days.weekHeading", {
      week: week.isoWeek,
      range: formatShortDateRangeLabel(week.weekStart, week.weekEnd, locale),
    }),
    totalMinutes: week.totalMinutes,
    days: week.days.map((day) => ({
      isoDate: day.isoDate,
      label: formatDayCardLabel(day.isoDate, locale),
      fullLabel: formatDateLabel(day.isoDate, locale, { style: "full" }),
      today: day.state === "today",
      weekend: isWeekendIso(day.isoDate),
      locked: day.locked,
      onLeave: day.onLeave,
      totalMinutes: day.totalMinutes,
      entries: day.entries.map(describeEntry),
    })),
  }));

  function describeEntry(entry: TimeGridEntry): DayLogEntry {
    const project = projectsById.get(entry.projectId);

    return {
      id: entry.id,
      description: entry.description,
      projectName: project?.name ?? t("labels.archivedProject"),
      projectColor: project?.color ?? "var(--muted-foreground)",
      startTime: entry.startTime,
      endTime: entry.endTime,
      durationMinutes: entry.durationMinutes,
      locked: entry.locked,
    };
  }

  const elapsedLabel = useElapsedLabel(days.runningTimer?.startedAt ?? null);
  const runningTimer: DayLogRunningTimer | null = days.runningTimer
    ? {
        description: days.runningTimer.description,
        projectName: days.runningTimer.projectName,
        projectColor: days.runningTimer.projectColor,
        startTime: new Intl.DateTimeFormat(locale, {
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
          timeZone: days.timezone,
        }).format(new Date(days.runningTimer.startedAt)),
        elapsedLabel,
      }
    : null;

  const scope = {
    entries: [...entriesById.values()],
    weekStart: allWeeks.at(-1)?.weekStart ?? days.rangeStart,
    weekEnd: days.rangeEnd,
  };
  const target = formatMinutesWithUnit(DAILY_SOFT_WARNING_MINUTES);
  const monthsLink = (chunks: React.ReactNode) => (
    <Link
      href={buildTimeHref("months", days.anchorDay) as Route}
      className="font-medium text-accent underline underline-offset-2"
    >
      {chunks}
    </Link>
  );

  const header = (
    <div className="grid min-w-0 gap-2 px-2.5 pt-3 sm:px-4 sm:pt-3.5">
      {tracked.length ? (
        <TimerComposer
          projects={composerProjects}
          value={composerValue}
          suggestions={descriptionSuggestions.optionsFor(composerValue.projectId)}
          pending={starting}
          error={composerError}
          labels={{
            description: t("timerComposer.description"),
            project: (project) => t("timerComposer.project", { project }),
            recent: t("timerComposer.recent"),
            allProjects: t("timerComposer.allProjects"),
            start: t("timerComposer.start"),
            descriptionRequired: t("timerComposer.descriptionRequired"),
            suggestions: descriptionSuggestions.labels,
          }}
          onValueChange={(value) => {
            setComposer(value);
            setComposerError(null);
          }}
          onStart={startFromComposer}
        />
      ) : null}
      {declared.length && tracked.length ? (
        <p className="min-w-0 px-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
          {declared.length === 1
            ? t.rich("days.declaredElsewhere", {
                project: declared[0]?.name ?? "",
                link: monthsLink,
              })
            : t.rich("days.declaredElsewhereMany", { count: declared.length, link: monthsLink })}
        </p>
      ) : null}
    </div>
  );

  return (
    <DayLog
      weeks={logWeeks}
      runningTimer={runningTimer}
      capacityMinutes={DAILY_SOFT_WARNING_MINUTES}
      locale={locale}
      durationDisplayFormat={durationDisplayFormat}
      header={header}
      disabled={actions.pending}
      hasMore
      loadingMore={loadingMore}
      onLoadMore={loadMore}
      labels={{
        today: t("header.today"),
        addEntry: (day) => t("days.addEntry", { day: day.fullLabel }),
        progress: (day) =>
          t("days.progress", { logged: formatMinutesWithUnit(day.totalMinutes), target }),
        edit: (entry) => t("week.editEntryNamed", { entry: entry.description }),
        delete: (entry) => t("week.deleteEntryNamed", { entry: entry.description }),
        continue: (entry) => t("card.continue", { description: entry.description }),
        more: (entry) => t("card.more", { description: entry.description }),
        locked: t("card.locked"),
        onLeave: t("days.onLeave"),
        nothingLogged: t("days.nothingLogged"),
        nothingLoggedWorkday: t("days.nothingLoggedWorkday"),
        nothingLoggedToday: t("days.nothingLoggedToday"),
        now: t("days.now"),
        stopTimer: t("timer.stopTimer"),
        running: t("card.live"),
        loadEarlier: t("days.loadEarlier"),
        loadingEarlier: t("days.loadingEarlier"),
        empty: t("days.empty"),
      }}
      onAddEntry={(day) =>
        actions.openEntry(
          {
            mode: "create",
            source: "FORM",
            projectId: composerValue.projectId,
            localDate: day.isoDate,
            durationMinutes: 60,
          },
          scope,
        )
      }
      onEditEntry={(entry) => {
        const source = entriesById.get(entry.id);
        if (source) actions.openEntry({ mode: "edit", entry: source }, scope);
      }}
      onDeleteEntry={(entry) => actions.deleteEntry(entry.id)}
      onContinueEntry={(entry) => {
        const source = entriesById.get(entry.id);
        if (source) actions.continueEntry(source);
      }}
      onStopTimer={actions.stopTimer}
    />
  );
}
