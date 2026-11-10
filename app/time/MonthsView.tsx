"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { buildHeatWeeks, MonthHeatNavigator } from "@/src/components/sheet/MonthHeatNavigator";
import {
  MonthOverview,
  type MonthOverviewDeclaredProject,
} from "@/src/components/sheet/MonthOverview";
import { DAILY_SOFT_WARNING_MINUTES } from "@/src/lib/time-entry-limits";
import {
  formatDateLabel,
  formatDateTime,
  formatMonthLabel,
  formatWeekdayLabel,
} from "@/src/lib/formatting";
import type { MemberMonthOverview, TimeGridWeek } from "@/src/server/time-tracking";

import { saveMonthlyHourDeclarationAction, uploadDeclarationProofAction } from "./actions";
import type { TimeViewActions } from "./TimePageClient";
import { countDaysInMonth, formatBytesLabel } from "./time-entry-helpers";
import { useDurationFormatting } from "./use-duration-formatting";
import { resolveWeekStartIso, shiftIsoDate, type TimeView } from "./view";

type DeclarationRowState = {
  projectId: string | null;
  saving: boolean;
  uploading: boolean;
  savedAt: number | null;
  error: string | null;
};

type MonthsViewProps = {
  /** The week holding the anchor day: assignments and locks for the month form. */
  week: TimeGridWeek;
  month: MemberMonthOverview;
  actions: TimeViewActions;
  onNavigate: (view: TimeView, day: string | null) => void;
};

/**
 * Placeholder for the Months tab: the old month level, declared-hours form included, until the
 * year calendar replaces it.
 */
export function MonthsView({ week, month, actions, onNavigate }: MonthsViewProps) {
  const t = useTranslations("TimeTracking");
  const locale = useLocale();
  const { durationDisplayFormat, formatMinutesWithUnit } = useDurationFormatting();
  const [, startTransition] = useTransition();
  const [declaration, setDeclaration] = useState<DeclarationRowState>({
    projectId: null,
    saving: false,
    uploading: false,
    savedAt: null,
    error: null,
  });

  const monthStart = month.monthStart;
  const monthLocked = week.lockedMonthStarts.includes(monthStart);
  const tracked = week.projects.some((project) => project.trackingMode === "TRACKED");
  const heatWeeks = buildHeatWeeks({
    monthStart,
    todayIso: week.todayIso,
    totals: month.days,
  });
  const sanityLimit = countDaysInMonth(monthStart) * 24 * 60;
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    capitalize(
      formatWeekdayLabel(shiftIsoDate(resolveWeekStartIso(monthStart), index), locale, {
        style: "short",
      }),
    ),
  );

  const declaredRows: MonthOverviewDeclaredProject[] = month.declared.map((project) => {
    const mine = declaration.projectId === project.projectId;

    return {
      projectId: project.projectId,
      name: project.name,
      color: project.color,
      minutes: project.minutes,
      note: project.note,
      proof: project.proof
        ? {
            filename: project.proof.filename,
            href: `/time/hours-proof/${project.proof.declarationId}`,
            sizeLabel: formatBytesLabel(project.proof.byteSize, locale),
            uploadedAtLabel: formatDateTime(project.proof.uploadedAt, locale),
          }
        : null,
      warning:
        project.minutes !== null && project.minutes > sanityLimit
          ? t("declared.sanityWarning", { hours: formatMinutesWithUnit(sanityLimit) })
          : null,
      error: mine ? declaration.error : null,
      saving: mine && declaration.saving,
      uploading: mine && declaration.uploading,
      savedAt: mine ? declaration.savedAt : null,
    };
  });

  function saveDeclaration(input: { projectId: string; minutes: number; note: string }) {
    setDeclaration({ ...input, saving: true, uploading: false, savedAt: null, error: null });

    startTransition(async () => {
      const result = await saveMonthlyHourDeclarationAction({ ...input, periodStart: monthStart });

      setDeclaration({
        projectId: input.projectId,
        saving: false,
        uploading: false,
        savedAt: result.status === "success" ? Date.now() : null,
        error: result.status === "success" ? null : result.message,
      });
      if (result.status === "success") actions.notifyResult(result);
    });
  }

  function uploadProof(input: { projectId: string; file: File }) {
    setDeclaration({
      projectId: input.projectId,
      saving: false,
      uploading: true,
      savedAt: null,
      error: null,
    });

    startTransition(async () => {
      const formData = new FormData();
      formData.set("projectId", input.projectId);
      formData.set("periodStart", monthStart);
      formData.set("proofFile", input.file);

      const result = await uploadDeclarationProofAction({ status: "idle", message: "" }, formData);

      setDeclaration({
        projectId: input.projectId,
        saving: false,
        uploading: false,
        savedAt: null,
        error: result.status === "success" ? null : result.message,
      });
      if (result.status === "success") actions.notifyResult(result);
    });
  }

  const dateLabel = (isoDate: string) => formatDateLabel(isoDate, locale, { style: "full" });

  return (
    <div className="min-w-0 p-3 sm:p-4">
      <MonthOverview
        projects={month.tracked.map((project) => ({
          projectId: project.projectId,
          name: project.name,
          color: project.color,
          minutes: project.minutes,
        }))}
        declared={declaredRows}
        monthLocked={monthLocked}
        locale={locale}
        durationDisplayFormat={durationDisplayFormat}
        disabled={actions.pending}
        animateRows={false}
        navigator={
          tracked ? (
            <MonthHeatNavigator
              weeks={heatWeeks}
              weekdayLabels={weekdayLabels}
              selectedWeekStart={week.weekStart}
              selectedDayIso={week.todayIso}
              capacityMinutes={DAILY_SOFT_WARNING_MINUTES}
              locked={monthLocked}
              formatMinutes={formatMinutesWithUnit}
              animate={false}
              disabled={actions.pending}
              labels={{
                grid: t("heat.label", { month: formatMonthLabel(monthStart, locale) }),
                openWeek: (heatWeek) => t("heat.openWeek", { week: heatWeek.weekNumber }),
                weekRow: (heatWeek) => `W${heatWeek.weekNumber}`,
                cell: (day) =>
                  t("heat.cell", {
                    date: dateLabel(day.isoDate),
                    hours: formatMinutesWithUnit(day.minutes),
                  }),
                empty: (day) => t("heat.empty", { date: dateLabel(day.isoDate) }),
                future: (day) => t("heat.future", { date: dateLabel(day.isoDate) }),
                outside: (day) => t("heat.outside", { date: dateLabel(day.isoDate) }),
                detail: (day) =>
                  t("heat.cellDetail", {
                    hours: formatMinutesWithUnit(day.minutes),
                    count: day.entryCount,
                  }),
                locked: t("heat.locked"),
                legendLogged: t("heat.legendLogged"),
                legendEmpty: t("heat.legendEmpty"),
                legendFuture: t("heat.legendFuture"),
              }}
              onSelectDay={(isoDate) => onNavigate("days", isoDate)}
              onSelectWeek={(weekStart) => onNavigate("weeks", weekStart)}
            />
          ) : undefined
        }
        labels={{
          trackedHeading: t("month.trackedHeading"),
          declaredHeading: t("month.declaredHeading"),
          zoomToProject: (project) => t("zoom.zoomToProject", { project: project.name }),
          emptyTitle: t("month.emptyTitle"),
          emptyDescription: t("month.emptyDescription"),
          declared: {
            hoursLabel: (project) => t("declared.hoursLabel", { project: project.name }),
            hoursPlaceholder: t("declared.hoursPlaceholder"),
            hoursHint: t("declared.hoursHint"),
            noteLabel: (project) => t("declared.noteLabel", { project: project.name }),
            notePlaceholder: t("declared.notePlaceholder"),
            noteRequired: t("declared.noteRequired"),
            proofLabel: t("declared.proofLabel"),
            proofUpload: t("declared.proofUpload"),
            proofReplace: t("declared.proofReplace"),
            proofView: t("declared.proofView"),
            proofMissing: t("declared.proofMissing"),
            proofNeedsHours: t("declared.proofNeedsHours"),
            proofUploading: t("declared.proofUploading"),
            save: t("declared.save"),
            saving: t("declared.saving"),
            saved: t("declared.saved"),
            locked: t("declared.locked"),
            nothingDeclared: t("declared.nothingDeclared"),
            externalSystem: t("declared.externalSystem"),
          },
        }}
        onSaveDeclaration={saveDeclaration}
        onUploadProof={uploadProof}
        onZoomToProject={() => onNavigate("weeks", monthStart)}
      />
    </div>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}
