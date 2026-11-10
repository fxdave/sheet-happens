import type { TimeDaysWeek, TimeGridAssignedProject } from "@/src/server/time-tracking";

export type TimeTrackingActionStatus = "idle" | "success" | "error";

export type TimeTrackingActionState = {
  status: TimeTrackingActionStatus;
  message: string;
  fieldErrors?: Partial<Record<TimeEntryFormField, string>>;
};

export const TIME_ENTRY_FORM_DRAFT_KEY = "time-entry-form";

export type TimeEntryFormField =
  "projectId" | "localDate" | "durationMinutes" | "description" | "startTime" | "endTime";

export type TimeEntryTimingMode = "DURATION" | "INTERVAL";

export type CreateTimeEntryActionInput = {
  projectId: string;
  localDate: string;
  timingMode?: TimeEntryTimingMode;
  durationMinutes?: number;
  startTime?: string | null;
  endTime?: string | null;
  description: string;
  source?: "GRID" | "FORM";
};

export type UpdateTimeEntryActionInput = {
  timeEntryId: string;
  projectId?: string;
  localDate?: string;
  timingMode?: TimeEntryTimingMode;
  durationMinutes?: number;
  startTime?: string | null;
  endTime?: string | null;
  description?: string;
};

export type DeleteTimeEntryActionInput = {
  timeEntryId: string;
};

export type RestoreTimeEntryActionInput = DeleteTimeEntryActionInput;

export type InactiveProjectWeekActionInput = {
  projectId: string;
  weekStartDate: string;
  note?: string;
};

export type StartRunningTimerActionInput = {
  projectId: string;
  description: string;
};

export type CopyPreviousDayEntriesActionInput = {
  targetDate: string;
};

export type DuplicatePreviousWeekActionInput = {
  weekStartDate: string;
};

export type SaveTimeEntryDraftActionInput = {
  draftKey: string;
  payload: {
    kind: "time-entry-form";
    version: 1;
    source: "GRID" | "FORM";
    projectId: string;
    localDate: string;
    timingMode: TimeEntryTimingMode;
    durationText: string;
    startTime: string;
    endTime: string;
    description: string;
    prefill?: boolean;
  };
};

export type ClearTimeEntryDraftActionInput = {
  draftKey: string;
};

export type SaveMonthlyHourDeclarationActionInput = {
  projectId: string;
  /** Always a `YYYY-MM-01` month start — L4 never names any other day. */
  periodStart: string;
  minutes: number;
  note: string;
};

export type DeleteMonthlyHourDeclarationActionInput = {
  projectId: string;
  periodStart: string;
};

export type LoadEarlierTimeDaysActionInput = {
  /** The first day already shown; the page returned ends the day before it. */
  before: string;
};

export type LoadEarlierTimeDaysActionResult =
  | {
      status: "success";
      weeks: TimeDaysWeek[];
      /** Assignments over the loaded weeks, for entries on projects the first page did not know. */
      projects: TimeGridAssignedProject[];
      lockedMonthStarts: string[];
    }
  | { status: "error"; message: string };
