"use client";

import { AlertTriangle, CalendarDays, Check, Clock3, LayoutGrid, List, Plus } from "lucide-react";
import { LazyMotion, MotionConfig } from "motion/react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";

import { PeriodNavigator } from "@/src/components/sheet/PeriodNavigator";
import { ShortcutSheet } from "@/src/components/sheet/ShortcutSheet";
import { TimeViewPanel } from "@/src/components/sheet/TimeViewPanel";
import { notify } from "@/src/components/sheet/Toast";
import { Button } from "@/src/components/ui/Button";
import { usePickerLabels } from "@/src/i18n/picker-labels";
import { type DurationDisplayFormat } from "@/src/lib/formatting";
import { useOverlayParam } from "@/src/lib/use-overlay-param";
import { cn } from "@/src/lib/utils";
import type {
  MemberMonthCalendar,
  MemberMonthOverview,
  MemberTimeDays,
  MemberYearOverview,
  TimeGridEntry,
  TimeGridWeek,
} from "@/src/server/time-tracking";

import {
  clearTimeEntryDraftAction,
  deleteTimeEntryAction,
  restoreTimeEntryAction,
  stopRunningTimerAction,
  switchRunningTimerAction,
} from "./actions";
import type { TimeTrackingActionState } from "./actions.types";
import { DaysView } from "./DaysView";
import { DraftRestoreBanner } from "./DraftRestoreBanner";
import { EntryModal, type EntryModalState } from "./EntryModal";
import { DeclaredMonthView } from "./DeclaredMonthView";
import { MonthsView } from "./MonthsView";
import { TimeCommandPalette, type TimeCommand } from "./TimeCommandPalette";
import { TimerControl } from "./TimerControl";
import { TimerCreateDialog } from "./TimerCreateDialog";
import { TIME_OVERLAY_PARAM, TIMER_OVERLAY_VALUE } from "./time-overlays";
import { useDescriptionSuggestions } from "./use-description-suggestions";
import { DurationDisplayContext, useDurationFormatting } from "./use-duration-formatting";
import {
  buildTimeHref,
  clampView,
  resolveTimeShortcut,
  resolveViewStops,
  type TimeView,
} from "./view";
import { resolvePeriod } from "./periods";
import { WeeksView } from "./WeeksView";

const UNDO_TOAST_MS = 6_000;

/** What the server loaded for the view in the URL. */
export type TimePageData =
  | { view: "days"; days: MemberTimeDays }
  /** `week` is the frame's half (assignments, timer, drafts); `month` only for a hybrid member. */
  | {
      view: "weeks";
      week: TimeGridWeek;
      calendar: MemberMonthCalendar;
      month: MemberMonthOverview | null;
    }
  | { view: "months"; week: TimeGridWeek; layout: "year"; year: MemberYearOverview }
  /* A declared-only member has no days to shade; their month carries the declaration form. */
  | { view: "months"; week: TimeGridWeek; layout: "declared"; month: MemberMonthOverview };

/** The entries and date bounds the entry dialog checks a day total and a date against. */
export type EntryScope = Pick<TimeGridWeek, "entries" | "weekStart" | "weekEnd">;

/** What the views get from the frame to act on entries. */
export type TimeViewActions = {
  pending: boolean;
  openEntry: (state: NonNullable<EntryModalState>, scope?: EntryScope) => void;
  deleteEntry: (entryId: string) => void;
  continueEntry: (entry: Pick<TimeGridEntry, "projectId" | "description">) => void;
  stopTimer: () => void;
  run: (action: () => Promise<TimeTrackingActionState>) => void;
  notifyResult: (result: TimeTrackingActionState) => void;
};

type TimePageClientProps = {
  data: TimePageData;
  durationDisplayFormat: DurationDisplayFormat;
};

export function TimePageClient({ data, durationDisplayFormat }: TimePageClientProps) {
  return (
    <DurationDisplayContext.Provider value={durationDisplayFormat}>
      {/* The placeholder Weeks/Months bodies still animate their rows; no layout morphing. */}
      <MotionConfig reducedMotion="user">
        <LazyMotion strict features={loadMotionFeatures}>
          <TimePageContent data={data} />
        </LazyMotion>
      </MotionConfig>
    </DurationDisplayContext.Provider>
  );
}

const loadMotionFeatures = () => import("./motion-features").then((module) => module.default);

type Notice = { tone: "success" | "error"; message: string } | null;

function TimePageContent({ data }: { data: TimePageData }) {
  const router = useRouter();
  const t = useTranslations("TimeTracking");
  const locale = useLocale();
  const pickerLabels = usePickerLabels();
  const { formatMinutesAsHours, durationDisplayFormat } = useDurationFormatting();
  const [isPending, startTransition] = useTransition();
  const [isNavigating, startNavigation] = useTransition();
  const [notice, setNotice] = useState<Notice>(null);
  const [entryModal, setEntryModal] = useState<{
    state: NonNullable<EntryModalState>;
    scope: EntryScope;
  } | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [, setTimerOpen] = useOverlayParam(TIME_OVERLAY_PARAM, TIMER_OVERLAY_VALUE);

  const period = resolvePeriod(data, t, locale);
  /* Every payload carries the frame's half: assignments, the timer, suggestions, the draft. */
  const frame = data.view === "days" ? data.days : data.week;
  const defaultScope: EntryScope =
    data.view === "days"
      ? {
          entries: data.days.weeks.flatMap((week) => week.days.flatMap((day) => day.entries)),
          weekStart: data.days.rangeStart,
          weekEnd: data.days.rangeEnd,
        }
      : data.week;
  const stops = useMemo(() => resolveViewStops(frame.projects), [frame.projects]);
  const view = clampView(data.view, stops);
  const trackedProjects = useMemo(
    () => frame.projects.filter((project) => project.trackingMode === "TRACKED"),
    [frame.projects],
  );
  const recentProjects = frame.recentProjects.filter((project) =>
    trackedProjects.some((tracked) => tracked.projectId === project.projectId),
  );
  const descriptionSuggestions = useDescriptionSuggestions(frame.descriptionSuggestions);
  const hasAssignments = frame.projects.length > 0;
  const canLog = trackedProjects.length > 0;
  const defaultEntryDate =
    frame.todayIso >= defaultScope.weekStart && frame.todayIso <= defaultScope.weekEnd
      ? frame.todayIso
      : defaultScope.weekStart;

  /* ------------------------------------------------------------------------------------------ */
  /* Navigation                                                                                 */
  /* ------------------------------------------------------------------------------------------ */

  function navigate(next: TimeView, day: string | null) {
    setNotice(null);
    startNavigation(() => {
      router.push(buildTimeHref(next, day) as Route);
    });
  }

  function step(direction: "previous" | "next") {
    const target = direction === "previous" ? period.previousDay : period.nextDay;
    if (target) navigate(view, target);
  }

  function goToToday() {
    if (!period.atToday) navigate(view, null);
  }

  /** A view switch keeps the anchor only when the URL named one; otherwise it stays on today. */
  function switchView(next: TimeView) {
    if (next === view) return;
    const params = new URLSearchParams(window.location.search);
    navigate(next, params.get("day") ?? params.get("week"));
  }

  /* ------------------------------------------------------------------------------------------ */
  /* Mutations                                                                                  */
  /* ------------------------------------------------------------------------------------------ */

  function notifyResult(result: TimeTrackingActionState) {
    setNotice({ tone: result.status === "success" ? "success" : "error", message: result.message });
    if (result.status === "success") router.refresh();
  }

  function run(action: () => Promise<TimeTrackingActionState>) {
    startTransition(async () => {
      notifyResult(await action());
    });
  }

  function openEntry(state: NonNullable<EntryModalState>, scope: EntryScope = defaultScope) {
    setEntryModal({ state, scope });
  }

  function openNewEntry(localDate = defaultEntryDate) {
    if (!canLog) return;
    openEntry({
      mode: "create",
      source: "FORM",
      projectId: recentProjects[0]?.projectId ?? trackedProjects[0]?.projectId ?? "",
      localDate,
      durationMinutes: 60,
    });
  }

  /** Undoable for six seconds: Undo is a real, audited restore, so nothing waits on a timer. */
  function deleteEntry(entryId: string) {
    startTransition(async () => {
      const result = await deleteTimeEntryAction({ timeEntryId: entryId });

      if (result.status !== "success") {
        setNotice({ tone: "error", message: result.message });
        return;
      }

      router.refresh();
      notify("info", t("undo.deleted"), {
        duration: UNDO_TOAST_MS,
        action: {
          label: t("undo.action"),
          onClick: () => {
            startTransition(async () => {
              const restored = await restoreTimeEntryAction({ timeEntryId: entryId });
              if (restored.status === "success") {
                router.refresh();
                notify("success", t("undo.restored"));
              } else {
                notify("error", restored.message);
              }
            });
          },
        },
      });
    });
  }

  /** ▷ on a row: a timer with that entry's project and description, replacing a running one. */
  function continueEntry(entry: Pick<TimeGridEntry, "projectId" | "description">) {
    run(() =>
      switchRunningTimerAction({ projectId: entry.projectId, description: entry.description }),
    );
  }

  function stopTimer() {
    run(stopRunningTimerAction);
  }

  function toggleTimer() {
    if (frame.runningTimer) stopTimer();
    else if (canLog) setTimerOpen(true);
  }

  const actions: TimeViewActions = {
    pending: isPending,
    openEntry,
    deleteEntry,
    continueEntry,
    stopTimer,
    run,
    notifyResult,
  };

  /* ------------------------------------------------------------------------------------------ */
  /* Keyboard and commands                                                                      */
  /* ------------------------------------------------------------------------------------------ */

  const keyHandlers = useRef({ switchView, step, goToToday, openNewEntry, toggleTimer });
  useEffect(() => {
    keyHandlers.current = { switchView, step, goToToday, openNewEntry, toggleTimer };
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const shortcut = resolveTimeShortcut(event, stops);
      if (!shortcut) return;

      const handlers = keyHandlers.current;
      event.preventDefault();
      switch (shortcut.type) {
        case "view":
          handlers.switchView(shortcut.view);
          break;
        case "period":
          handlers.step(shortcut.direction);
          break;
        case "today":
          handlers.goToToday();
          break;
        case "compose":
          handlers.openNewEntry();
          break;
        case "timer":
          handlers.toggleTimer();
          break;
        case "help":
          setShortcutsOpen(true);
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stops]);

  function handleCommand(command: TimeCommand) {
    switch (command.type) {
      case "today":
        goToToday();
        break;
      case "view":
        switchView(command.view);
        break;
      case "compose":
        openNewEntry();
        break;
      case "timer":
        toggleTimer();
        break;
      case "shortcuts":
        setShortcutsOpen(true);
        break;
    }
  }

  const unit = period.unit;
  const shortcutGroups = [
    {
      id: "view",
      title: t("shortcuts.groupView"),
      rows: stops.map((stop, index) => ({
        keys: [String(index + 1)],
        label: t(`shortcuts.${stop}`),
      })),
    },
    {
      id: "move",
      title: t("shortcuts.groupMove"),
      rows: [
        { keys: ["←", "K"], label: t("shortcuts.previous", { unit }) },
        { keys: ["→", "J"], label: t("shortcuts.next", { unit }) },
        { keys: ["T"], label: t("shortcuts.today") },
      ],
    },
    {
      id: "add",
      title: t("shortcuts.groupAdd"),
      rows: [
        { keys: ["N"], label: t("actions.newEntry") },
        { keys: ["?"], label: t("shortcuts.help") },
        { keys: ["⌘K"], label: t("shortcuts.palette") },
      ],
    },
    {
      id: "timer",
      title: t("shortcuts.groupTimer"),
      rows: [{ keys: ["S"], label: t("shortcuts.timer") }],
    },
  ];

  /* ------------------------------------------------------------------------------------------ */
  /* Frame                                                                                      */
  /* ------------------------------------------------------------------------------------------ */

  const tabIcons = { days: List, weeks: CalendarDays, months: LayoutGrid } as const;
  const tabs = stops.map((stop, index) => ({
    value: stop,
    label: t(`tabs.${stop}`),
    icon: tabIcons[stop],
    shortcut: String(index + 1),
    href: buildTimeHref(stop),
  }));

  const navigator = (
    <PeriodNavigator
      label={period.label}
      periodKey={period.key}
      direction={0}
      atToday={period.atToday}
      month={period.month}
      locale={locale}
      labels={{
        previous: t("period.previous", { unit: period.unit }),
        next: t("period.next", { unit: period.unit }),
        today: t("period.today"),
        atToday: t("period.atToday"),
        pick: t("period.pick"),
        monthPicker: pickerLabels.month,
      }}
      shortcuts={{ previous: "←", next: "→", today: "T" }}
      disabled={isNavigating}
      nextDisabled={period.nextDay === null}
      onPrevious={() => step("previous")}
      onNext={() => step("next")}
      onToday={goToToday}
      onPickMonth={(month) => navigate(view, period.dayForMonth(month))}
    />
  );

  const total = (
    <p className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="font-ui text-lg font-bold tabular-nums text-foreground sm:text-xl">
        {formatMinutesAsHours(period.totalMinutes)}
        {durationDisplayFormat === "DECIMAL_HOURS" ? " h" : ""}
      </span>
      <span className="font-ui text-xs font-medium text-muted-foreground">
        {period.totalCaption}
      </span>
    </p>
  );

  const body: ReactNode =
    data.view === "days" && view === "days" ? (
      <DaysView key={data.days.anchorDay} days={data.days} actions={actions} />
    ) : data.view === "weeks" && view === "weeks" ? (
      <WeeksView
        key={data.calendar.monthStart}
        week={data.week}
        calendar={data.calendar}
        month={data.month}
        actions={actions}
        onNavigate={navigate}
      />
    ) : data.view === "months" && data.layout === "year" ? (
      <MonthsView key={data.year.year} year={data.year} onNavigate={navigate} />
    ) : data.view === "months" ? (
      <DeclaredMonthView week={data.week} month={data.month} actions={actions} />
    ) : null;

  return (
    <div className="grid min-w-0 gap-4">
      {notice ? (
        <div
          role="status"
          className={cn(
            "flex min-w-0 items-start gap-2 rounded-[var(--radius-md)] border px-4 py-3 text-sm font-medium",
            notice.tone === "success"
              ? "border-success/35 bg-success-soft text-success"
              : "border-destructive/35 bg-destructive-soft text-destructive",
          )}
        >
          {notice.tone === "success" ? (
            <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          ) : (
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          )}
          <span className="min-w-0 [overflow-wrap:anywhere]">{notice.message}</span>
        </div>
      ) : null}

      {frame.entryDraft && !entryModal && canLog ? (
        <DraftRestoreBanner
          updatedAt={frame.entryDraft.updatedAt}
          onDiscard={() => {
            const draftKey = frame.entryDraft?.draftKey;
            if (draftKey) run(() => clearTimeEntryDraftAction({ draftKey }));
          }}
          onRestore={() => {
            const draft = frame.entryDraft;
            if (!draft) return;
            const known = trackedProjects.some((p) => p.projectId === draft.payload.projectId);
            openEntry({
              mode: "create",
              source: draft.payload.source,
              projectId: known ? draft.payload.projectId : (trackedProjects[0]?.projectId ?? ""),
              localDate: draft.payload.localDate,
              durationMinutes: 60,
              durationText: draft.payload.durationText,
              description: draft.payload.description,
              timingMode: draft.payload.timingMode,
              startTime: draft.payload.startTime,
              endTime: draft.payload.endTime,
              prefill: draft.payload.prefill,
              draftKey: draft.draftKey,
            });
          }}
        />
      ) : null}

      {hasAssignments ? (
        <TimeViewPanel
          tabs={tabs}
          value={view}
          labels={{ tabs: t("tabs.label"), zoomHint: t("tabs.zoomHint") }}
          navigator={navigator}
          total={total}
          timer={
            <TimerControl
              runningTimer={frame.runningTimer}
              disabled={isPending}
              canStart={canLog}
              onStart={() => setTimerOpen(true)}
              onStop={stopTimer}
            />
          }
          action={
            canLog ? (
              <Button
                type="button"
                variant="ghost"
                icon={Plus}
                disabled={isPending}
                aria-label={t("actions.newEntry")}
                className="border border-border"
                onClick={() => openNewEntry()}
              >
                {t("actions.entryShort")}
              </Button>
            ) : null
          }
          pending={isNavigating}
          onTabClick={(value, event) => {
            event.preventDefault();
            switchView(value as TimeView);
          }}
        >
          {body}
        </TimeViewPanel>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-border bg-card px-6 py-12 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
            <Clock3 className="size-6" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">{t("empty.title")}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {t("empty.description")}
          </p>
        </div>
      )}

      {hasAssignments ? (
        <TimeCommandPalette
          stops={stops}
          timerRunning={Boolean(frame.runningTimer)}
          canCompose={canLog}
          onCommand={handleCommand}
        />
      ) : null}

      <ShortcutSheet
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
        groups={shortcutGroups}
        labels={{
          title: t("shortcuts.title"),
          description: t("shortcuts.description"),
          close: t("actions.close"),
          keyHeader: t("shortcuts.keyHeader"),
          actionHeader: t("shortcuts.actionHeader"),
        }}
      />

      <TimerCreateDialog
        projects={trackedProjects}
        recentProjects={recentProjects}
        suggestions={descriptionSuggestions}
        onStarted={notifyResult}
      />

      {entryModal ? (
        <EntryModal
          state={entryModal.state}
          week={entryModal.scope}
          projects={trackedProjects}
          suggestions={descriptionSuggestions}
          onClose={() => setEntryModal(null)}
          onDone={(result) => {
            if (result.status === "success") setEntryModal(null);
            notifyResult(result);
          }}
          t={t}
        />
      ) : null}
    </div>
  );
}
