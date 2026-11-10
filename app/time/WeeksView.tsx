"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import type { DayColumnHeaderDay } from "@/src/components/sheet/DayColumnHeader";
import { parseDurationToMinutes } from "@/src/lib/duration";
import { formatWeekdayLabel } from "@/src/lib/formatting";
import { DAILY_HARD_LIMIT_MINUTES } from "@/src/lib/time-entry-limits";
import { useMediaQuery } from "@/src/lib/use-media-query";
import type {
  TimeGridAssignedProject,
  TimeGridDay,
  TimeGridWeek,
} from "@/src/server/time-tracking";

import {
  markInactiveProjectWeekAction,
  unmarkInactiveProjectWeekAction,
  updateTimeEntryAction,
} from "./actions";
import { BreakdownDialog } from "./BreakdownDialog";
import type { TimeViewActions } from "./TimePageClient";
import {
  getCellEntries,
  groupEntriesByCell,
  groupEntriesByDay,
  isSimpleDurationEntry,
} from "./time-entry-helpers";
import type { TimeView } from "./view";
import { WeekGridLens } from "./WeekGridLens";

const DESKTOP_QUERY = "(min-width: 64rem)";

type WeeksViewProps = {
  week: TimeGridWeek;
  actions: TimeViewActions;
  onNavigate: (view: TimeView, day: string | null) => void;
};

/**
 * Placeholder for the Weeks tab: the old project × day grid inside the panel, until the month
 * calendar replaces it.
 */
export function WeeksView({ week, actions, onNavigate }: WeeksViewProps) {
  const t = useTranslations("TimeTracking");
  const locale = useLocale();
  const desktop = useMediaQuery(DESKTOP_QUERY, { serverSnapshot: true });
  const [breakdown, setBreakdown] = useState<{ projectId: string; localDate: string } | null>(null);

  const projectRows = useMemo(
    () => week.projects.filter((project) => project.trackingMode === "TRACKED"),
    [week.projects],
  );
  const declaredProjects = useMemo(
    () => week.projects.filter((project) => project.trackingMode === "DECLARED"),
    [week.projects],
  );
  const inactiveProjectIds = useMemo(
    () => new Set(week.inactiveWeeks.map((inactiveWeek) => inactiveWeek.projectId)),
    [week.inactiveWeeks],
  );
  const entriesByCell = useMemo(() => groupEntriesByCell(week.entries), [week.entries]);
  const entriesByDay = useMemo(() => groupEntriesByDay(week.entries), [week.entries]);

  const dailyTotals = week.days.map((day) =>
    projectRows.reduce((sum, project) => {
      if (inactiveProjectIds.has(project.projectId)) return sum;
      return sum + getCellEntries(entriesByCell, project.projectId, day.isoDate).totalMinutes;
    }, 0),
  );
  const days: DayColumnHeaderDay[] = week.days.map((day, index) => ({
    isoDate: day.isoDate,
    label: capitalize(formatWeekdayLabel(day.isoDate, locale, { style: "long" })),
    shortLabel: capitalize(formatWeekdayLabel(day.isoDate, locale, { style: "short" })),
    dayNumber: day.dayNumber,
    state: day.state,
    locked: day.locked,
    onLeave: day.onLeave,
    totalMinutes: dailyTotals[index] ?? 0,
  }));

  function createInCell(projectId: string, localDate: string, durationMinutes = 60) {
    actions.openEntry(
      { mode: "create", source: "GRID", projectId, localDate, durationMinutes, prefill: true },
      week,
    );
  }

  function commitCell(project: TimeGridAssignedProject, day: TimeGridDay, rawValue: string) {
    const minutes = parseDurationToMinutes(rawValue);
    const cell = getCellEntries(entriesByCell, project.projectId, day.isoDate);

    if (minutes === null) {
      actions.notifyResult({ status: "error", message: t("errors.invalidDurationFormat") });
      return;
    }
    if (minutes <= 0) {
      if (cell.entries.length === 1 && !cell.entries[0].locked) {
        actions.deleteEntry(cell.entries[0].id);
      }
      return;
    }
    if (minutes > DAILY_HARD_LIMIT_MINUTES) {
      actions.notifyResult({ status: "error", message: t("warnings.durationOver24Blocked") });
      return;
    }
    if (cell.entries.length === 0) {
      createInCell(project.projectId, day.isoDate, minutes);
      return;
    }

    const entry = cell.entries[0];
    if (cell.entries.length === 1 && isSimpleDurationEntry(entry) && !entry.locked) {
      actions.run(() => updateTimeEntryAction({ timeEntryId: entry.id, durationMinutes: minutes }));
      return;
    }

    setBreakdown({ projectId: project.projectId, localDate: day.isoDate });
  }

  const breakdownProject = breakdown
    ? projectRows.find((project) => project.projectId === breakdown.projectId)
    : undefined;
  const breakdownDay = breakdown
    ? week.days.find((day) => day.isoDate === breakdown.localDate)
    : undefined;

  return (
    <div className="min-w-0 p-3 sm:p-4">
      <WeekGridLens
        days={days}
        projects={projectRows}
        declaredProjects={declaredProjects}
        inactiveProjectIds={inactiveProjectIds}
        entriesByCell={entriesByCell}
        entriesByDay={entriesByDay}
        dailyTotals={dailyTotals}
        weekTotal={dailyTotals.reduce((sum, minutes) => sum + minutes, 0)}
        weekHasLockedPeriod={week.lockedMonthStarts.length > 0}
        layout={desktop ? "table" : "stack"}
        disabled={actions.pending}
        animateRows={false}
        onOpenDay={(isoDate) => onNavigate("days", isoDate)}
        onCellCommit={commitCell}
        onOpenBreakdown={(projectId, localDate) => setBreakdown({ projectId, localDate })}
        onCreateFromCell={(project, day) => createInCell(project.projectId, day.isoDate)}
        onToggleInactive={(project, inactive) =>
          actions.run(() =>
            inactive
              ? unmarkInactiveProjectWeekAction({
                  projectId: project.projectId,
                  weekStartDate: week.weekStart,
                })
              : markInactiveProjectWeekAction({
                  projectId: project.projectId,
                  weekStartDate: week.weekStart,
                }),
          )
        }
        onSeeMonth={() => onNavigate("months", week.weekStart)}
      />

      {breakdown && breakdownProject && breakdownDay ? (
        <BreakdownDialog
          day={breakdownDay}
          entries={getCellEntries(entriesByCell, breakdown.projectId, breakdown.localDate).entries}
          entriesByDay={entriesByDay}
          project={breakdownProject}
          onAdd={() => {
            setBreakdown(null);
            createInCell(breakdownProject.projectId, breakdownDay.isoDate);
          }}
          onClose={() => setBreakdown(null)}
          onDelete={(entry) => actions.deleteEntry(entry.id)}
          onEdit={(entry) => {
            setBreakdown(null);
            actions.openEntry({ mode: "edit", entry }, week);
          }}
          t={t}
        />
      ) : null}
    </div>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}
