"use client";

import { AlertTriangle, Check, Grid3X3, Info, ShieldCheck, X } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";

import { Combobox } from "@/src/components/ui/Combobox";
import { DatePicker } from "@/src/components/ui/DatePicker";
import { focusChromeClassName } from "@/src/components/ui/focusRing";
import { SuggestInput } from "@/src/components/ui/SuggestInput";
import { TimeInput } from "@/src/components/ui/TimeInput";
import { parseDurationToMinutes } from "@/src/lib/duration";
import { DAILY_HARD_LIMIT_MINUTES, DAILY_SOFT_WARNING_MINUTES } from "@/src/lib/time-entry-limits";
import { usePickerLabels } from "@/src/i18n/picker-labels";
import { cn } from "@/src/lib/utils";
import type {
  TimeGridAssignedProject,
  TimeGridEntry,
  TimeGridWeek,
} from "@/src/server/time-tracking";

import {
  clearTimeEntryDraftAction,
  createTimeEntryAction,
  saveTimeEntryDraftAction,
  updateTimeEntryAction,
} from "./actions";
import {
  TIME_ENTRY_FORM_DRAFT_KEY,
  type TimeEntryTimingMode,
  type TimeTrackingActionState,
} from "./actions.types";
import {
  calculateIntervalMinutes,
  formatAdminModifiedAt,
  getDayLoggedMinutes,
  type TimeTrackingTranslator,
} from "./time-entry-helpers";
import type { DescriptionSuggestionsController } from "./use-description-suggestions";
import { useDurationFormatting } from "./use-duration-formatting";

/**
 * The full entry dialog and the per-cell breakdown, lifted out of the screen file unchanged.
 *
 * The quick composer (§5.6 of `docs/time-view-redesign.md`) covers the common case; this is the
 * "More options" it opens into, with the date, the interval mode, the warnings and the draft
 * autosave. `EntryModalState` is the hand-off shape between the two — a composer carries its
 * project, day, duration text and description into a `create` state here.
 */
export type EntryModalState =
  | {
      mode: "create";
      source: "GRID" | "FORM";
      projectId: string;
      localDate: string;
      durationMinutes: number;
      description?: string;
      timingMode?: TimeEntryTimingMode;
      durationText?: string;
      startTime?: string | null;
      endTime?: string | null;
      prefill?: boolean;
      draftKey?: string;
    }
  | {
      mode: "edit";
      entry: TimeGridEntry;
    }
  | null;

export type EntryModalProps = {
  state: NonNullable<EntryModalState>;
  /** The entries a day total is projected from, and the bounds of the date picker. */
  week: Pick<TimeGridWeek, "entries" | "weekStart" | "weekEnd">;
  projects: TimeGridAssignedProject[];
  /** The member's own recent descriptions, scoped here to whichever project is selected. */
  suggestions: DescriptionSuggestionsController;
  onClose: () => void;
  onDone: (result: TimeTrackingActionState) => void;
  t: TimeTrackingTranslator;
};

export function EntryModal({
  state,
  week,
  projects,
  suggestions,
  onClose,
  onDone,
  t,
}: EntryModalProps) {
  const locale = useLocale();
  const { formatMinutesForInput, formatMinutesWithUnit } = useDurationFormatting();
  const pickerLabels = usePickerLabels();
  const [isPending, startTransition] = useTransition();
  const initialProjectId = state.mode === "edit" ? state.entry.projectId : state.projectId;
  const initialLocalDate = state.mode === "edit" ? state.entry.localDate : state.localDate;
  const initialDuration =
    state.mode === "edit" ? state.entry.durationMinutes : state.durationMinutes;
  const initialTimingMode: TimeEntryTimingMode =
    state.mode === "edit" && state.entry.startTime && state.entry.endTime
      ? "INTERVAL"
      : state.mode === "create" && state.timingMode
        ? state.timingMode
        : "DURATION";
  const initialDurationText =
    state.mode === "create" && state.durationText
      ? state.durationText
      : formatMinutesForInput(initialDuration) || "1";
  const [projectId, setProjectId] = useState(initialProjectId);
  const [localDate, setLocalDate] = useState(initialLocalDate);
  const [timingMode, setTimingMode] = useState<TimeEntryTimingMode>(initialTimingMode);
  const [durationText, setDurationText] = useState(initialDurationText);
  const [startTime, setStartTime] = useState(
    state.mode === "edit" ? (state.entry.startTime ?? "09:00") : (state.startTime ?? "09:00"),
  );
  const [endTime, setEndTime] = useState(
    state.mode === "edit" ? (state.entry.endTime ?? "10:00") : (state.endTime ?? "10:00"),
  );
  const initialDescription =
    state.mode === "edit" ? state.entry.description : (state.description ?? "");
  const [description, setDescription] = useState(initialDescription);
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [fieldErrors, setFieldErrors] = useState<TimeTrackingActionState["fieldErrors"]>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const project = projects.find((item) => item.projectId === projectId) ?? projects[0];
  const parsedMinutes = parseDurationToMinutes(durationText);
  const intervalMinutes = calculateIntervalMinutes(startTime, endTime);
  const entryMinutes =
    timingMode === "INTERVAL" ? intervalMinutes : parsedMinutes !== null ? parsedMinutes : 0;
  const projectedDayTotalMinutes =
    entryMinutes > 0
      ? getDayLoggedMinutes(
          week.entries,
          localDate,
          state.mode === "edit" ? state.entry.id : null,
        ) + entryMinutes
      : 0;
  const durationOverHardLimit =
    timingMode === "DURATION" && parsedMinutes !== null && parsedMinutes > DAILY_HARD_LIMIT_MINUTES;
  const projectedDayOverHardLimit =
    projectedDayTotalMinutes > DAILY_HARD_LIMIT_MINUTES && !durationOverHardLimit;
  const projectedDayOverSoftLimit =
    projectedDayTotalMinutes > DAILY_SOFT_WARNING_MINUTES && !projectedDayOverHardLimit;
  const createDraftKey =
    state.mode === "create" ? (state.draftKey ?? TIME_ENTRY_FORM_DRAFT_KEY) : null;
  const createDraftSource = state.mode === "create" ? state.source : null;
  const createDraftPrefill = state.mode === "create" ? state.prefill : undefined;
  const ready = Boolean(
    projectId &&
    localDate &&
    description.trim() &&
    !durationOverHardLimit &&
    !projectedDayOverHardLimit &&
    (timingMode === "INTERVAL" ? intervalMinutes > 0 : parsedMinutes && parsedMinutes > 0),
  );

  useEffect(() => {
    if (!createDraftKey || !createDraftSource || !description.trim()) return;

    let cancelled = false;
    const timerId = window.setTimeout(() => {
      void saveTimeEntryDraftAction({
        draftKey: createDraftKey,
        payload: {
          kind: "time-entry-form",
          version: 1,
          source: createDraftSource,
          projectId,
          localDate,
          timingMode,
          durationText,
          startTime,
          endTime,
          description,
          prefill: createDraftPrefill,
        },
      }).then((result) => {
        if (cancelled) return;
        setDraftStatus(result.status === "success" ? "saved" : "error");
      });
    }, 700);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [
    createDraftKey,
    createDraftPrefill,
    createDraftSource,
    description,
    durationText,
    endTime,
    localDate,
    projectId,
    startTime,
    timingMode,
  ]);

  function markDraftDirty(nextDescription = description) {
    if (!createDraftKey) return;
    setDraftStatus(nextDescription.trim() ? "saving" : "idle");
  }

  function clearSubmitFeedback() {
    setFieldErrors(undefined);
    setSubmitError(null);
  }

  function saveCurrentDraft() {
    if (!createDraftKey || !createDraftSource || !description.trim()) return;

    void saveTimeEntryDraftAction({
      draftKey: createDraftKey,
      payload: {
        kind: "time-entry-form",
        version: 1,
        source: createDraftSource,
        projectId,
        localDate,
        timingMode,
        durationText,
        startTime,
        endTime,
        description,
        prefill: createDraftPrefill,
      },
    });
  }

  function closeModal() {
    saveCurrentDraft();
    onClose();
  }

  const dialogRef = useModalFocusTrap<HTMLDivElement>(closeModal);
  const descriptionRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  /**
   * The prefill moment: a duration typed into an empty grid cell opens this dialog with everything
   * filled in *except* the description, and the same is true of an entry whose description was
   * never written. That is the one place in the app where the next keystroke is genuinely
   * predictable, so focus goes there and the field's own focus handler offers what this member
   * usually writes on this project. Nothing is inserted.
   *
   * Declared after `useModalFocusTrap` on purpose: the trap claims focus for the first focusable
   * element in its own effect, and effects in one component run in declaration order, so this is
   * what makes "focus the description" win rather than a race.
   */
  useEffect(() => {
    if (initialDescription.trim()) return;

    descriptionRef.current?.focus();
  }, [initialDescription]);

  function submit() {
    const durationMinutes = parseDurationToMinutes(durationText);

    setSubmitError(null);

    if (timingMode === "DURATION" && (!durationMinutes || durationMinutes <= 0)) {
      setFieldErrors({ durationMinutes: t("fieldErrors.durationPositive") });
      return;
    }

    if (timingMode === "INTERVAL" && intervalMinutes <= 0) {
      setFieldErrors({ endTime: t("fieldErrors.endAfterStart") });
      return;
    }

    startTransition(async () => {
      const durationPayloadMinutes = durationMinutes ?? 0;
      const timingPayload =
        timingMode === "INTERVAL"
          ? {
              timingMode,
              startTime,
              endTime,
            }
          : {
              timingMode,
              durationMinutes: durationPayloadMinutes,
              startTime: null,
              endTime: null,
            };
      const result =
        state.mode === "edit"
          ? await updateTimeEntryAction({
              timeEntryId: state.entry.id,
              projectId,
              localDate,
              description,
              ...timingPayload,
            })
          : await createTimeEntryAction({
              projectId,
              localDate,
              description,
              source: state.source,
              ...timingPayload,
            });

      setFieldErrors(result.fieldErrors);
      setSubmitError(result.status === "error" ? result.message : null);

      if (result.status === "success") {
        // So a second entry in the same session is offered what the first one said, before the
        // page revalidates and the server's own list catches up.
        suggestions.remember(projectId, description);
      }

      if (result.status === "success" && createDraftKey) {
        await clearTimeEntryDraftAction({ draftKey: createDraftKey });
      }

      onDone(result);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={closeModal}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="time-entry-dialog-title"
        tabIndex={-1}
        className="max-h-[92vh] w-full max-w-[540px] overflow-y-auto rounded-[var(--radius-xl)] border border-border bg-card shadow-panel"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2 id="time-entry-dialog-title" className="text-xl font-semibold">
            {state.mode === "edit" ? t("entryModal.editTitle") : t("entryModal.newTitle")}
          </h2>
          <button
            type="button"
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={closeModal}
            aria-label={t("actions.close")}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-5 px-6 py-6">
          {state.mode === "create" && state.prefill && project ? (
            <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-accent-line bg-accent-soft p-3">
              <span className="grid size-9 place-items-center rounded-[var(--radius-sm)] bg-card text-accent">
                <Grid3X3 className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: project.color }}
                      aria-hidden="true"
                    />
                    {project.name}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{localDate}</span>
                  <span className="rounded-[var(--radius-pill)] border border-accent-line bg-card px-2 py-0.5 font-ui text-[11px] font-bold text-accent">
                    {formatMinutesWithUnit(state.durationMinutes)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Info className="size-3.5 text-accent" aria-hidden="true" />
                  {t("entryModal.prefillHint")}
                </div>
              </div>
            </div>
          ) : null}

          {submitError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-[var(--radius-md)] border border-destructive/35 bg-destructive-soft px-3 py-2 text-sm font-medium text-destructive"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          ) : null}

          {state.mode === "edit" && state.entry.adminModification ? (
            <AdminModificationNotice modification={state.entry.adminModification} t={t} />
          ) : null}

          {/* The render-prop form of `Field`, not the plain one: a `<label>` may wrap a single
              control, and this one brings a listbox of its own. */}
          <Field label={t("fields.description")} required error={fieldErrors?.description}>
            {({ id, describedBy, invalid }) => (
              <SuggestInput
                as="textarea"
                id={id}
                rows={3}
                fieldRef={descriptionRef}
                value={description}
                options={suggestions.optionsFor(projectId)}
                labels={suggestions.labels}
                emptyStateLimit={6}
                placeholder={t("fields.descriptionPlaceholder")}
                aria-describedby={describedBy}
                invalid={invalid}
                onValueChange={(next) => {
                  clearSubmitFeedback();
                  setDescription(next);
                  markDraftDirty(next);
                }}
              />
            )}
          </Field>

          <Field label={t("fields.project")} required error={fieldErrors?.projectId}>
            {({ id, describedBy, invalid, required }) => (
              <Combobox
                id={id}
                label={t("fields.project")}
                value={projectId}
                aria-describedby={describedBy}
                invalid={invalid}
                required={required}
                labels={pickerLabels.combobox}
                options={projects.map((option) => ({
                  value: option.projectId,
                  label: option.name,
                }))}
                onValueChange={(value) => {
                  clearSubmitFeedback();
                  setProjectId(value);
                  markDraftDirty();
                }}
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <Field label={t("fields.date")} required error={fieldErrors?.localDate}>
              {({ id, describedBy, invalid, required }) => (
                <DatePicker
                  id={id}
                  label={t("fields.date")}
                  locale={locale}
                  value={localDate}
                  min={week.weekStart}
                  max={week.weekEnd}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  required={required}
                  // The action rejects an empty date, so there is nothing to clear to.
                  clearable={false}
                  labels={pickerLabels.date}
                  onValueChange={(value) => {
                    clearSubmitFeedback();
                    setLocalDate(value ?? "");
                    markDraftDirty();
                  }}
                />
              )}
            </Field>
            <Field label={t("fields.mode")} required>
              <div className="inline-flex rounded-[var(--radius-pill)] border border-border bg-secondary p-1">
                <button
                  type="button"
                  className={cn(
                    "rounded-[var(--radius-pill)] px-3 py-2 text-sm font-semibold transition",
                    timingMode === "DURATION"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground",
                  )}
                  onClick={() => {
                    clearSubmitFeedback();
                    setTimingMode("DURATION");
                    markDraftDirty();
                  }}
                >
                  {t("mode.duration")}
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-[var(--radius-pill)] px-3 py-2 text-sm font-semibold transition",
                    timingMode === "INTERVAL"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground",
                  )}
                  onClick={() => {
                    clearSubmitFeedback();
                    setTimingMode("INTERVAL");
                    markDraftDirty();
                  }}
                >
                  {t("mode.interval")}
                </button>
              </div>
            </Field>
          </div>

          {timingMode === "DURATION" ? (
            <Field label={t("fields.duration")} required error={fieldErrors?.durationMinutes}>
              <input
                inputMode="decimal"
                value={durationText}
                placeholder="3h 20m"
                className={inputClassName(Boolean(fieldErrors?.durationMinutes))}
                onChange={(event) => {
                  clearSubmitFeedback();
                  setDurationText(event.target.value);
                  markDraftDirty();
                }}
              />
            </Field>
          ) : (
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Field label={t("fields.start")} required error={fieldErrors?.startTime}>
                {({ id, describedBy, invalid, required }) => (
                  <TimeInput
                    id={id}
                    value={startTime}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    required={required}
                    onChange={(event) => {
                      clearSubmitFeedback();
                      setStartTime(event.target.value);
                      markDraftDirty();
                    }}
                  />
                )}
              </Field>
              <Field label={t("fields.end")} required error={fieldErrors?.endTime}>
                {({ id, describedBy, invalid, required }) => (
                  <TimeInput
                    id={id}
                    value={endTime}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    required={required}
                    onChange={(event) => {
                      clearSubmitFeedback();
                      setEndTime(event.target.value);
                      markDraftDirty();
                    }}
                  />
                )}
              </Field>
              <div className="pb-2 text-xl font-semibold text-accent">
                {formatMinutesWithUnit(intervalMinutes)}
              </div>
            </div>
          )}

          {durationOverHardLimit ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="size-4" aria-hidden="true" />
              {t("warnings.durationOver24Blocked")}
            </div>
          ) : null}

          {projectedDayOverHardLimit ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="size-4" aria-hidden="true" />
              {t("warnings.dailyTotalOver24Projected", {
                hours: formatMinutesWithUnit(projectedDayTotalMinutes),
              })}
            </div>
          ) : null}

          {projectedDayOverSoftLimit ? (
            <div className="flex items-center gap-2 text-sm text-warning">
              <AlertTriangle className="size-4" aria-hidden="true" />
              {t("warnings.dayOver8Projected", {
                hours: formatMinutesWithUnit(projectedDayTotalMinutes),
              })}
            </div>
          ) : null}

          {timingMode === "INTERVAL" && intervalMinutes >= 480 ? (
            <div className="flex items-center gap-2 text-sm text-warning">
              <AlertTriangle className="size-4" aria-hidden="true" />
              {t("warnings.longSessionNotBlocked")}
            </div>
          ) : null}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="size-4" aria-hidden="true" />
            {t("entryModal.requiredHint")}
          </div>

          {createDraftKey && description.trim() && draftStatus !== "idle" ? (
            <div
              className={cn(
                "font-ui text-[11px] font-semibold uppercase tracking-[0.08em]",
                draftStatus === "error" ? "text-destructive" : "text-muted-foreground",
              )}
              aria-live="polite"
            >
              {draftStatus === "saving"
                ? t("draft.saving")
                : draftStatus === "saved"
                  ? t("draft.saved")
                  : t("draft.notSaved")}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            className="rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
            onClick={closeModal}
          >
            {t("actions.cancel")}
          </button>
          <button
            type="button"
            disabled={!ready || isPending}
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-gradient-to-br from-primary to-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
            onClick={submit}
          >
            <Check className="size-4" aria-hidden="true" />
            {t("actions.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminModificationNotice({
  modification,
  compact = false,
  t,
}: {
  modification: NonNullable<TimeGridEntry["adminModification"]>;
  compact?: boolean;
  t: TimeTrackingTranslator;
}) {
  const locale = useLocale();
  const modifiedAt = formatAdminModifiedAt(modification, locale);

  return (
    <div
      className={cn(
        "mt-2 flex items-start gap-2 rounded-[var(--radius-sm)] border border-accent-line bg-accent-soft text-xs leading-relaxed",
        compact ? "px-2.5 py-2" : "px-3 py-2.5",
      )}
    >
      <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden="true" />
      <span>
        <span className="font-semibold text-foreground">
          {t("adminModification.changedBy", {
            name: modification.modifiedByName ?? t("adminModification.adminFallback"),
            date: modifiedAt,
          })}
        </span>{" "}
        <span className="text-muted-foreground">
          {t("adminModification.reason", { reason: modification.reason })}
        </span>
      </span>
    </div>
  );
}

type TimeFieldRenderProps = {
  id: string;
  describedBy?: string;
  invalid: boolean;
  required?: boolean;
};

const timeFieldLabelClassName =
  "font-ui text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

/**
 * The entry modal's own field wrapper, kept local because its label is smaller and
 * uppercase compared with `src/components/ui/Field`.
 *
 * Takes either a plain node — wrapped in a `<label>`, which implicitly labels a single
 * input — or a render prop, which is what the popover-based controls need: a `<label>`
 * cannot wrap a button trigger, so those get an explicit `htmlFor` instead.
 */
function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode | ((field: TimeFieldRenderProps) => ReactNode);
}) {
  const generatedId = useId();

  if (typeof children !== "function") {
    return (
      <label className="grid gap-2">
        <span className={timeFieldLabelClassName}>
          {label} {required ? <span className="text-destructive">*</span> : null}
        </span>
        {children}
        {error ? <span className="text-xs font-medium text-destructive">{error}</span> : null}
      </label>
    );
  }

  const controlId = `time-field-${generatedId}`;
  const errorId = error ? `${controlId}-error` : undefined;

  return (
    <div className="grid gap-2">
      <label htmlFor={controlId} className={timeFieldLabelClassName}>
        {label} {required ? <span className="text-destructive">*</span> : null}
      </label>
      {children({ id: controlId, describedBy: errorId, invalid: Boolean(error), required })}
      {error ? (
        <span id={errorId} className="text-xs font-medium text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function inputClassName(error: boolean) {
  return cn(
    "w-full rounded-[var(--radius-md)] border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition",
    focusChromeClassName,
    error ? "border-destructive" : "border-border",
  );
}

export function useModalFocusTrap<T extends HTMLElement>(onClose: () => void) {
  const containerRef = useRef<T>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const container = containerRef.current;
    const focusableElements = getFocusableElements(container);

    (focusableElements[0] ?? container)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  return containerRef;
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      [
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        "[tabindex]:not([tabindex='-1'])",
      ].join(","),
    ),
  ).filter((element) => element.offsetParent !== null);
}
