"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { isDateValue } from "@/src/lib/date-values";

import { DAILY_HARD_LIMIT_MINUTES } from "@/src/lib/time-entry-limits";
import { requireActiveAppMemberForAction } from "@/src/server/auth/app-access";
import { AuthenticationError, AuthorizationError } from "@/src/server/auth/session";
import { ObjectStorageConfigurationError } from "@/src/server/storage";
import {
  addDays,
  copyPreviousDayEntries,
  createTimeEntry,
  DeclarationError,
  deleteMonthlyHourDeclaration,
  deleteTimeEntry,
  deleteTimeEntryDraft,
  duplicatePreviousWeek,
  getMemberTimeDays,
  HOURS_PROOF_MAX_BYTES,
  markInactiveProjectWeek,
  parseDateOnly,
  restoreTimeEntry,
  saveMonthlyHourDeclaration,
  saveTimeEntryDraft,
  startRunningTimer,
  stopRunningTimer,
  switchRunningTimer,
  TimeTrackingDateError,
  type TimeTrackingDateErrorCode,
  TimeTrackingError,
  type TimeTrackingErrorCode,
  unmarkInactiveProjectWeek,
  updateTimeEntry,
  uploadDeclarationProof,
  type CopyTimeEntriesResult,
  type TimeTrackingRequestMetadata,
} from "@/src/server/time-tracking";

import type {
  ClearTimeEntryDraftActionInput,
  CopyPreviousDayEntriesActionInput,
  CreateTimeEntryActionInput,
  DeleteMonthlyHourDeclarationActionInput,
  DeleteTimeEntryActionInput,
  DuplicatePreviousWeekActionInput,
  InactiveProjectWeekActionInput,
  LoadEarlierTimeDaysActionInput,
  LoadEarlierTimeDaysActionResult,
  RestoreTimeEntryActionInput,
  SaveMonthlyHourDeclarationActionInput,
  SaveTimeEntryDraftActionInput,
  StartRunningTimerActionInput,
  TimeEntryFormField,
  TimeTrackingActionState,
  UpdateTimeEntryActionInput,
} from "./actions.types";

type TimeTrackingActionsTranslator = Awaited<ReturnType<typeof getTranslations>>;

const timingSchema = {
  timingMode: z.enum(["DURATION", "INTERVAL"]).optional(),
  durationMinutes: z
    .number()
    .int()
    .positive("Duration must be greater than zero.")
    .max(DAILY_HARD_LIMIT_MINUTES, "Daily total cannot exceed 24 hours.")
    .optional(),
  startTime: z
    .string()
    .trim()
    .refine(isTimeInputValue, "Choose a valid start time.")
    .nullable()
    .optional(),
  endTime: z
    .string()
    .trim()
    .refine(isTimeInputValue, "Choose a valid end time.")
    .nullable()
    .optional(),
};

const createTimeEntrySchema = z
  .object({
    projectId: z.string().trim().min(1, "Choose a project."),
    localDate: z.string().trim().refine(isDateInputValue, "Choose a valid date."),
    description: z
      .string()
      .trim()
      .min(1, "Description is required.")
      .max(1000, "Description must be 1000 characters or less."),
    source: z.enum(["GRID", "FORM"]).optional(),
    ...timingSchema,
  })
  .superRefine((value, context) => validateTimeEntryTiming(value, context, true));

const updateTimeEntrySchema = z
  .object({
    timeEntryId: z.string().trim().min(1, "Time entry id is missing."),
    projectId: z.string().trim().min(1, "Choose a project.").optional(),
    localDate: z.string().trim().refine(isDateInputValue, "Choose a valid date.").optional(),
    description: z
      .string()
      .trim()
      .min(1, "Description is required.")
      .max(1000, "Description must be 1000 characters or less.")
      .optional(),
    ...timingSchema,
  })
  .superRefine((value, context) => validateTimeEntryTiming(value, context, false));

const deleteTimeEntrySchema = z.object({
  timeEntryId: z.string().trim().min(1, "Time entry id is missing."),
});

const inactiveWeekSchema = z.object({
  projectId: z.string().trim().min(1, "Choose a project."),
  weekStartDate: z.string().trim().refine(isDateInputValue, "Choose a valid week."),
  note: z.string().trim().max(500, "Note must be 500 characters or less.").optional(),
});

const startRunningTimerSchema = z.object({
  projectId: z.string().trim().min(1, "Choose a project."),
  description: z
    .string()
    .trim()
    .min(1, "Description is required.")
    .max(1000, "Description must be 1000 characters or less."),
});

const loadEarlierTimeDaysSchema = z.object({
  before: z.string().trim().refine(isDateInputValue, "Choose a valid date."),
  weeks: z.number().int().min(1).max(52).optional(),
});

const copyPreviousDayEntriesSchema = z.object({
  targetDate: z.string().trim().refine(isDateInputValue, "Choose a valid target date."),
});

const duplicatePreviousWeekSchema = z.object({
  weekStartDate: z.string().trim().refine(isDateInputValue, "Choose a valid week."),
});

const timeEntryDraftPayloadSchema = z.object({
  kind: z.literal("time-entry-form"),
  version: z.literal(1),
  source: z.enum(["GRID", "FORM"]),
  projectId: z.string().trim().min(1, "Choose a project."),
  localDate: z.string().trim().refine(isDateInputValue, "Choose a valid date."),
  timingMode: z.enum(["DURATION", "INTERVAL"]),
  durationText: z.string().trim().max(64, "Duration is too long."),
  startTime: z.string().trim().refine(isTimeInputValue, "Choose a valid start time."),
  endTime: z.string().trim().refine(isTimeInputValue, "Choose a valid end time."),
  description: z.string().trim().max(1000, "Description must be 1000 characters or less."),
  prefill: z.boolean().optional(),
});

const timeEntryDraftSchema = z.object({
  draftKey: z.string().trim().min(1).max(80),
  payload: timeEntryDraftPayloadSchema,
});

/**
 * The month is a `YYYY-MM-01` string rather than a free date: L4 only ever names a month start, and
 * a schema that accepted the 17th would leave the normalization to the domain layer where a caller
 * could not see it.
 */
const monthlyDeclarationTargetSchema = {
  projectId: z.string().uuid("Choose a project."),
  periodStart: z.string().regex(/^\d{4}-\d{2}-01$/, "Choose a valid month."),
};

const saveMonthlyHourDeclarationSchema = z.object({
  ...monthlyDeclarationTargetSchema,
  minutes: z
    .number()
    .int()
    .positive("Declared hours must be greater than zero.")
    // A year of hours is not a month's figure; the *plausible* bound is the warning in
    // `declarations.ts`, and this is only the outer edge of what the column can hold.
    .max(366 * 24 * 60, "Declared hours are too large."),
  note: z
    .string()
    .trim()
    .min(1, "Describe what the declared hours cover.")
    .max(1_000, "Description must be 1000 characters or less."),
});

const deleteMonthlyHourDeclarationSchema = z.object(monthlyDeclarationTargetSchema);

const clearTimeEntryDraftSchema = z.object({
  draftKey: z.string().trim().min(1).max(80),
});

export async function createTimeEntryAction(
  input: CreateTimeEntryActionInput,
): Promise<TimeTrackingActionState> {
  const t = await getTranslations("TimeTrackingActions");
  const parsed = createTimeEntrySchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: t("errors.fixFields"),
      fieldErrors: translateEntryFieldErrors(getEntryFieldErrors(parsed.error), t),
    };
  }

  try {
    const { member } = await requireActiveAppMemberForAction();
    await createTimeEntry({
      ...parsed.data,
      localDate: parseDateOnly(parsed.data.localDate),
      memberId: member.id,
      actorMemberId: member.id,
      requestMetadata: await getTimeTrackingRequestMetadata(),
    });

    revalidatePath("/time");

    return {
      status: "success",
      message: t("success.timeEntrySaved"),
    };
  } catch (error) {
    return mapTimeTrackingActionError(error, t("errors.timeEntrySaveFailed"), t);
  }
}

export async function updateTimeEntryAction(
  input: UpdateTimeEntryActionInput,
): Promise<TimeTrackingActionState> {
  const t = await getTranslations("TimeTrackingActions");
  const parsed = updateTimeEntrySchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: t("errors.fixFields"),
      fieldErrors: translateEntryFieldErrors(getEntryFieldErrors(parsed.error), t),
    };
  }

  try {
    const { member } = await requireActiveAppMemberForAction();
    await updateTimeEntry({
      ...parsed.data,
      localDate: parsed.data.localDate ? parseDateOnly(parsed.data.localDate) : undefined,
      memberId: member.id,
      actorMemberId: member.id,
      requestMetadata: await getTimeTrackingRequestMetadata(),
    });

    revalidatePath("/time");

    return {
      status: "success",
      message: t("success.timeEntryUpdated"),
    };
  } catch (error) {
    return mapTimeTrackingActionError(error, t("errors.timeEntryUpdateFailed"), t);
  }
}

export async function deleteTimeEntryAction(
  input: DeleteTimeEntryActionInput,
): Promise<TimeTrackingActionState> {
  const t = await getTranslations("TimeTrackingActions");
  const parsed = deleteTimeEntrySchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: t("errors.timeEntryDeleteFailed"),
    };
  }

  try {
    const { member } = await requireActiveAppMemberForAction();
    await deleteTimeEntry({
      timeEntryId: parsed.data.timeEntryId,
      memberId: member.id,
      actorMemberId: member.id,
      requestMetadata: await getTimeTrackingRequestMetadata(),
    });

    revalidatePath("/time");

    return {
      status: "success",
      message: t("success.timeEntryDeleted"),
    };
  } catch (error) {
    return mapTimeTrackingActionError(error, t("errors.timeEntryDeleteFailed"), t);
  }
}

export async function restoreTimeEntryAction(
  input: RestoreTimeEntryActionInput,
): Promise<TimeTrackingActionState> {
  const t = await getTranslations("TimeTrackingActions");
  const parsed = deleteTimeEntrySchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: t("errors.timeEntryRestoreFailed"),
    };
  }

  try {
    const { member } = await requireActiveAppMemberForAction();
    await restoreTimeEntry({
      timeEntryId: parsed.data.timeEntryId,
      memberId: member.id,
      actorMemberId: member.id,
      requestMetadata: await getTimeTrackingRequestMetadata(),
    });

    revalidatePath("/time");

    return {
      status: "success",
      message: t("success.timeEntryRestored"),
    };
  } catch (error) {
    return mapTimeTrackingActionError(error, t("errors.timeEntryRestoreFailed"), t);
  }
}

export async function startRunningTimerAction(
  input: StartRunningTimerActionInput,
): Promise<TimeTrackingActionState> {
  const t = await getTranslations("TimeTrackingActions");
  const parsed = startRunningTimerSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: t("errors.fixFields"),
      fieldErrors: translateEntryFieldErrors(getEntryFieldErrors(parsed.error), t),
    };
  }

  try {
    const { member } = await requireActiveAppMemberForAction();
    await startRunningTimer({
      ...parsed.data,
      memberId: member.id,
      actorMemberId: member.id,
      requestMetadata: await getTimeTrackingRequestMetadata(),
    });

    revalidatePath("/time");

    return {
      status: "success",
      message: t("success.timerStarted"),
    };
  } catch (error) {
    return mapTimeTrackingActionError(error, t("errors.timerStartFailed"), t);
  }
}

export async function stopRunningTimerAction(): Promise<TimeTrackingActionState> {
  const t = await getTranslations("TimeTrackingActions");

  try {
    const { member } = await requireActiveAppMemberForAction();
    const result = await stopRunningTimer({
      memberId: member.id,
      actorMemberId: member.id,
      requestMetadata: await getTimeTrackingRequestMetadata(),
    });

    revalidatePath("/time");

    if ("discarded" in result) {
      return {
        status: "error",
        message: t("errors.timerDiscardedDailyLimit"),
      };
    }

    return {
      status: "success",
      message: t("success.timerStopped"),
    };
  } catch (error) {
    return mapTimeTrackingActionError(error, t("errors.timerStopFailed"), t);
  }
}

/** Continue and the day log's composer: start a timer, stopping a running one first. */
export async function switchRunningTimerAction(
  input: StartRunningTimerActionInput,
): Promise<TimeTrackingActionState> {
  const t = await getTranslations("TimeTrackingActions");
  const parsed = startRunningTimerSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: t("errors.fixFields"),
      fieldErrors: translateEntryFieldErrors(getEntryFieldErrors(parsed.error), t),
    };
  }

  try {
    const { member } = await requireActiveAppMemberForAction();
    const result = await switchRunningTimer({
      ...parsed.data,
      memberId: member.id,
      actorMemberId: member.id,
      requestMetadata: await getTimeTrackingRequestMetadata(),
    });

    revalidatePath("/time");

    return {
      status: "success",
      message:
        result.stopped && "discarded" in result.stopped
          ? t("success.timerSwitchedDiscarded")
          : result.stopped
            ? t("success.timerSwitched")
            : t("success.timerStarted"),
    };
  } catch (error) {
    return mapTimeTrackingActionError(error, t("errors.timerStartFailed"), t);
  }
}

/** The day log's infinite scroll: `weeks` weeks (default one) ending the day before `before`. */
export async function loadEarlierTimeDaysAction(
  input: LoadEarlierTimeDaysActionInput,
): Promise<LoadEarlierTimeDaysActionResult> {
  const t = await getTranslations("TimeTrackingActions");
  const parsed = loadEarlierTimeDaysSchema.safeParse(input);

  if (!parsed.success) return { status: "error", message: t("errors.fixFields") };

  try {
    const { member } = await requireActiveAppMemberForAction();
    const page = await getMemberTimeDays({
      memberId: member.id,
      endDay: addDays(parseDateOnly(parsed.data.before), -1),
      weeks: parsed.data.weeks ?? 1,
    });

    return {
      status: "success",
      weeks: page.weeks,
      projects: page.projects,
      lockedMonthStarts: page.lockedMonthStarts,
    };
  } catch (error) {
    const mapped = mapTimeTrackingActionError(error, t("errors.generic"), t);
    return { status: "error", message: mapped.message };
  }
}

export async function copyPreviousDayEntriesAction(
  input: CopyPreviousDayEntriesActionInput,
): Promise<TimeTrackingActionState> {
  const t = await getTranslations("TimeTrackingActions");
  const parsed = copyPreviousDayEntriesSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: t("fields.validTargetDate"),
    };
  }

  try {
    const { member } = await requireActiveAppMemberForAction();
    const result = await copyPreviousDayEntries({
      targetDate: parseDateOnly(parsed.data.targetDate),
      memberId: member.id,
      actorMemberId: member.id,
      requestMetadata: await getTimeTrackingRequestMetadata(),
    });

    revalidatePath("/time");

    return {
      status: "success",
      message: formatCopyResultMessage(result, "previousDay", t),
    };
  } catch (error) {
    return mapTimeTrackingActionError(error, t("errors.previousDayCopyFailed"), t);
  }
}

export async function duplicatePreviousWeekAction(
  input: DuplicatePreviousWeekActionInput,
): Promise<TimeTrackingActionState> {
  const t = await getTranslations("TimeTrackingActions");
  const parsed = duplicatePreviousWeekSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: t("fields.validWeek"),
    };
  }

  try {
    const { member } = await requireActiveAppMemberForAction();
    const result = await duplicatePreviousWeek({
      weekStartDate: parseDateOnly(parsed.data.weekStartDate),
      memberId: member.id,
      actorMemberId: member.id,
      requestMetadata: await getTimeTrackingRequestMetadata(),
    });

    revalidatePath("/time");

    return {
      status: "success",
      message: formatCopyResultMessage(result, "previousWeek", t),
    };
  } catch (error) {
    return mapTimeTrackingActionError(error, t("errors.previousWeekDuplicateFailed"), t);
  }
}

export async function saveTimeEntryDraftAction(
  input: SaveTimeEntryDraftActionInput,
): Promise<TimeTrackingActionState> {
  const t = await getTranslations("TimeTrackingActions");
  const parsed = timeEntryDraftSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: t("errors.draftSaveFailed"),
    };
  }

  try {
    const { member } = await requireActiveAppMemberForAction();
    await saveTimeEntryDraft({
      draftKey: parsed.data.draftKey,
      payload: parsed.data.payload,
      memberId: member.id,
    });

    return {
      status: "success",
      message: t("success.draftSaved"),
    };
  } catch (error) {
    return mapTimeTrackingActionError(error, t("errors.draftSaveFailed"), t);
  }
}

export async function clearTimeEntryDraftAction(
  input: ClearTimeEntryDraftActionInput,
): Promise<TimeTrackingActionState> {
  const t = await getTranslations("TimeTrackingActions");
  const parsed = clearTimeEntryDraftSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: t("errors.draftClearFailed"),
    };
  }

  try {
    const { member } = await requireActiveAppMemberForAction();
    await deleteTimeEntryDraft({
      draftKey: parsed.data.draftKey,
      memberId: member.id,
    });

    revalidatePath("/time");

    return {
      status: "success",
      message: t("success.draftDiscarded"),
    };
  } catch (error) {
    return mapTimeTrackingActionError(error, t("errors.draftClearFailed"), t);
  }
}

export async function markInactiveProjectWeekAction(
  input: InactiveProjectWeekActionInput,
): Promise<TimeTrackingActionState> {
  const t = await getTranslations("TimeTrackingActions");
  const parsed = inactiveWeekSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: t("errors.inactiveWeekSaveFailed"),
    };
  }

  try {
    const { member } = await requireActiveAppMemberForAction();
    await markInactiveProjectWeek({
      ...parsed.data,
      weekStartDate: parseDateOnly(parsed.data.weekStartDate),
      memberId: member.id,
      actorMemberId: member.id,
      requestMetadata: await getTimeTrackingRequestMetadata(),
    });

    revalidatePath("/time");

    return {
      status: "success",
      message: t("success.inactiveWeekSaved"),
    };
  } catch (error) {
    return mapTimeTrackingActionError(error, t("errors.inactiveWeekSaveFailed"), t);
  }
}

export async function unmarkInactiveProjectWeekAction(
  input: InactiveProjectWeekActionInput,
): Promise<TimeTrackingActionState> {
  const t = await getTranslations("TimeTrackingActions");
  const parsed = inactiveWeekSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: t("errors.inactiveWeekRemoveFailed"),
    };
  }

  try {
    const { member } = await requireActiveAppMemberForAction();
    await unmarkInactiveProjectWeek({
      ...parsed.data,
      weekStartDate: parseDateOnly(parsed.data.weekStartDate),
      memberId: member.id,
      actorMemberId: member.id,
      requestMetadata: await getTimeTrackingRequestMetadata(),
    });

    revalidatePath("/time");

    return {
      status: "success",
      message: t("success.inactiveWeekRemoved"),
    };
  } catch (error) {
    return mapTimeTrackingActionError(error, t("errors.inactiveWeekRemoveFailed"), t);
  }
}

/**
 * Save one month's declared figure for one project.
 *
 * A member's own declaration only — an admin correction goes through the same domain function with
 * a differing `actorMemberId`, which this action deliberately cannot produce: it always passes the
 * signed-in member as both, so no request shape can turn it into a write against someone else.
 */
export async function saveMonthlyHourDeclarationAction(
  input: SaveMonthlyHourDeclarationActionInput,
): Promise<TimeTrackingActionState> {
  const t = await getTranslations("TimeTrackingActions");
  const parsed = saveMonthlyHourDeclarationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: translateKnownMessage(parsed.error.issues[0]?.message, t),
    };
  }

  try {
    const { member } = await requireActiveAppMemberForAction();
    await saveMonthlyHourDeclaration({
      memberId: member.id,
      actorMemberId: member.id,
      projectId: parsed.data.projectId,
      periodStart: parseDateOnly(parsed.data.periodStart, "Choose a valid month."),
      minutes: parsed.data.minutes,
      note: parsed.data.note,
      requestMetadata: await getTimeTrackingRequestMetadata(),
    });

    revalidatePath("/time");

    return {
      status: "success",
      message: t("success.declarationSaved"),
    };
  } catch (error) {
    return mapTimeTrackingActionError(error, t("errors.declarationSaveFailed"), t);
  }
}

export async function deleteMonthlyHourDeclarationAction(
  input: DeleteMonthlyHourDeclarationActionInput,
): Promise<TimeTrackingActionState> {
  const t = await getTranslations("TimeTrackingActions");
  const parsed = deleteMonthlyHourDeclarationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: translateKnownMessage(parsed.error.issues[0]?.message, t),
    };
  }

  try {
    const { member } = await requireActiveAppMemberForAction();
    await deleteMonthlyHourDeclaration({
      memberId: member.id,
      actorMemberId: member.id,
      projectId: parsed.data.projectId,
      periodStart: parseDateOnly(parsed.data.periodStart, "Choose a valid month."),
      requestMetadata: await getTimeTrackingRequestMetadata(),
    });

    revalidatePath("/time");

    return {
      status: "success",
      message: t("success.declarationWithdrawn"),
    };
  } catch (error) {
    return mapTimeTrackingActionError(error, t("errors.declarationWithdrawFailed"), t);
  }
}

/**
 * Attach or replace the proof PDF, as `FormData` so the file never passes through JSON.
 *
 * The size is checked here as well as in the domain validator, and that is not redundancy: the
 * Server Action body limit is 12 MB, so a file over it never reaches this function at all. Checking
 * against a **smaller** ceiling first is what turns a silent transport failure into a sentence
 * naming the actual problem, which is what §3 asks for.
 */
export async function uploadDeclarationProofAction(
  _previousState: TimeTrackingActionState,
  formData: FormData,
): Promise<TimeTrackingActionState> {
  const t = await getTranslations("TimeTrackingActions");
  const parsed = deleteMonthlyHourDeclarationSchema.safeParse({
    projectId: formData.get("projectId"),
    periodStart: formData.get("periodStart"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: translateKnownMessage(parsed.error.issues[0]?.message, t),
    };
  }

  const file = formData.get("proofFile");

  if (!(file instanceof File) || file.size <= 0) {
    return { status: "error", message: t("errors.proofRequired") };
  }

  if (file.size > HOURS_PROOF_MAX_BYTES) {
    return { status: "error", message: t("errors.proofTooLarge") };
  }

  try {
    const { member } = await requireActiveAppMemberForAction();
    await uploadDeclarationProof({
      memberId: member.id,
      actorMemberId: member.id,
      projectId: parsed.data.projectId,
      periodStart: parseDateOnly(parsed.data.periodStart, "Choose a valid month."),
      file: {
        bytes: Buffer.from(await file.arrayBuffer()),
        originalFilename: file.name || "hours-proof.pdf",
        contentType:
          file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
            ? "application/pdf"
            : file.type,
        byteSize: file.size,
      },
      requestMetadata: await getTimeTrackingRequestMetadata(),
    });

    revalidatePath("/time");

    return {
      status: "success",
      message: t("success.proofUploaded"),
    };
  } catch (error) {
    console.error("[time] hours proof upload failed", error);
    return mapTimeTrackingActionError(error, t("errors.proofUploadFailed"), t);
  }
}

function validateTimeEntryTiming(
  value: {
    timingMode?: "DURATION" | "INTERVAL";
    durationMinutes?: number;
    startTime?: string | null;
    endTime?: string | null;
  },
  context: z.RefinementCtx,
  required: boolean,
) {
  const hasTiming =
    value.timingMode !== undefined ||
    value.durationMinutes !== undefined ||
    value.startTime !== undefined ||
    value.endTime !== undefined;

  if (!required && !hasTiming) return;

  const mode = value.timingMode ?? (value.startTime || value.endTime ? "INTERVAL" : "DURATION");

  if (mode === "INTERVAL") {
    if (!value.startTime) {
      context.addIssue({
        code: "custom",
        path: ["startTime"],
        message: "Start time is required.",
      });
    }

    if (!value.endTime) {
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "End time is required.",
      });
    }

    return;
  }

  if (!value.durationMinutes) {
    context.addIssue({
      code: "custom",
      path: ["durationMinutes"],
      message: "Duration must be greater than zero.",
    });
  }
}

function formatCopyResultMessage(
  result: CopyTimeEntriesResult,
  source: "previousDay" | "previousWeek",
  t: TimeTrackingActionsTranslator,
) {
  if (result.sourceCount === 0) {
    return t(`copy.${source}.noneFound`);
  }

  if (result.createdCount === 0) {
    return t(`copy.${source}.noneCopied`);
  }

  if (result.skippedCount > 0) {
    return t(`copy.${source}.copiedWithSkipped`, {
      created: result.createdCount,
      skipped: result.skippedCount,
    });
  }

  return t(`copy.${source}.copied`, { created: result.createdCount });
}

function getEntryFieldErrors(error: z.ZodError): Partial<Record<TimeEntryFormField, string>> {
  const fieldErrors: Partial<Record<TimeEntryFormField, string>> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (isTimeEntryFormField(field) && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }

  return fieldErrors;
}

function translateEntryFieldErrors(
  fieldErrors: Partial<Record<TimeEntryFormField, string>>,
  t: TimeTrackingActionsTranslator,
): Partial<Record<TimeEntryFormField, string>> {
  const translated: Partial<Record<TimeEntryFormField, string>> = {};

  for (const [field, message] of Object.entries(fieldErrors)) {
    translated[field as TimeEntryFormField] = translateKnownMessage(message, t);
  }

  return translated;
}

function isTimeEntryFormField(field: unknown): field is TimeEntryFormField {
  return (
    field === "projectId" ||
    field === "localDate" ||
    field === "durationMinutes" ||
    field === "description" ||
    field === "startTime" ||
    field === "endTime"
  );
}

function mapTimeTrackingActionError(
  error: unknown,
  fallback: string,
  t: TimeTrackingActionsTranslator,
): TimeTrackingActionState {
  if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
    return {
      status: "error",
      message: translateKnownMessage(error.message, t),
    };
  }

  if (error instanceof TimeTrackingError || error instanceof TimeTrackingDateError) {
    return {
      status: "error",
      message: translateDomainError(error, t),
    };
  }

  if (error instanceof ObjectStorageConfigurationError) {
    return {
      status: "error",
      message: t("errors.storageMissing"),
    };
  }

  /* Keyed on the code rather than on the message, unlike the errors above: these are new, so there
     is no English sentence already in flight that a lookup table has to keep matching. */
  if (error instanceof DeclarationError) {
    return {
      status: "error",
      message: t(`declarationErrors.${error.code}`),
    };
  }

  return {
    status: "error",
    message: fallback,
  };
}

function translateKnownMessage(message: string | undefined, t: TimeTrackingActionsTranslator) {
  if (!message) return t("errors.generic");

  const key = knownMessageKeys[message];
  return key ? t(key) : message;
}

/**
 * The message table stays first because it is finer-grained than the codes are: `localIntervalToUtc`
 * reports "Choose a valid start time." and "Choose a valid end time." separately, and both arrive
 * carrying the single code `INVALID_TIME`. Keying on the code alone would tell the member which
 * *rule* they broke but no longer which field.
 *
 * The code table is the safety net underneath, so a domain sentence that gets reworded still
 * localizes instead of leaking English into the UI.
 */
function translateDomainError(
  error: TimeTrackingError | TimeTrackingDateError,
  t: TimeTrackingActionsTranslator,
) {
  if (error.message && knownMessageKeys[error.message]) {
    return t(knownMessageKeys[error.message]);
  }

  const key = domainErrorKeys[error.code];
  return key ? t(key) : translateKnownMessage(error.message, t);
}

const domainErrorKeys: Record<TimeTrackingErrorCode | TimeTrackingDateErrorCode, string> = {
  MEMBER_NOT_FOUND: "errors.memberNotFound",
  ENTRY_NOT_FOUND: "errors.timeEntryNotFound",
  ENTRY_LOCKED: "errors.entryLocked",
  ENTRY_IS_DECLARED: "errors.declaredCorrectedAtMonth",
  PERIOD_LOCKED: "errors.periodLocked",
  WEEK_LOCKED: "errors.weekTouchesLockedPeriod",
  DAY_ON_LEAVE: "errors.dayOnLeave",
  PROJECT_REQUIRED: "fields.chooseProject",
  PROJECT_NOT_AVAILABLE: "errors.projectNotActiveForDate",
  PROJECT_NOT_ASSIGNED_FOR_WEEK: "errors.projectNotAssignedForWeek",
  PROJECT_DECLARES_MONTHLY: "errors.projectDeclaresMonthly",
  DURATION_INVALID: "fields.durationPositive",
  DAILY_LIMIT_EXCEEDED: "fields.dailyTotalTooLarge",
  START_END_REQUIRED: "fields.startEndRequired",
  END_BEFORE_START: "fields.endAfterStart",
  INVALID_DATE: "fields.validDate",
  INVALID_TIME: "fields.validTime",
  DESCRIPTION_REQUIRED: "fields.descriptionRequired",
  DESCRIPTION_TOO_LONG: "fields.descriptionMax",
  TIMER_ALREADY_RUNNING: "errors.stopTimerFirst",
  NO_TIMER_RUNNING: "errors.noTimerRunning",
  INACTIVE_WEEK_HAS_ENTRIES: "errors.inactiveWeekHasEntries",
  DRAFT_KEY_INVALID: "fields.draftKeyInvalid",
  TIMEZONE_FORMAT: "errors.dateTimezoneFormatFailed",
  /*
   * Unreachable from the browser: nothing here paginates, so no cursor is ever sent. The entry
   * exists because the map is exhaustive over the domain's codes — which is what caught this one
   * being added — and `errors.generic` is the honest answer rather than a string invented for a
   * path a member cannot take. `src/server/mcp` has the message an agent actually sees.
   */
  INVALID_CURSOR: "errors.generic",
};

const knownMessageKeys: Record<string, string> = {
  "Choose a project.": "fields.chooseProject",
  "Choose a valid date.": "fields.validDate",
  "Choose a valid target date.": "fields.validTargetDate",
  "Choose a valid week.": "fields.validWeek",
  "Choose a valid start time.": "fields.validStartTime",
  "Choose a valid end time.": "fields.validEndTime",
  "Start time is required.": "fields.startRequired",
  "End time is required.": "fields.endRequired",
  "End time must be after start time.": "fields.endAfterStart",
  "Timer end time must be after start time.": "fields.endAfterStart",
  "Start and end time are required.": "fields.startEndRequired",
  "Duration must be greater than zero.": "fields.durationPositive",
  "Duration is too long.": "fields.durationTooLong",
  "Duration is too large.": "fields.durationTooLarge",
  "Daily total cannot exceed 24 hours.": "fields.dailyTotalTooLarge",
  "Description is required.": "fields.descriptionRequired",
  "Description must be 1000 characters or less.": "fields.descriptionMax",
  "Time entry id is missing.": "fields.timeEntryMissing",
  "Note must be 500 characters or less.": "fields.noteMax",
  "Draft key is invalid.": "fields.draftKeyInvalid",
  "Member not found.": "errors.memberNotFound",
  "Time entry not found.": "errors.timeEntryNotFound",
  "This entry is locked by a submitted timesheet.": "errors.entryLocked",
  "This period is locked by a submitted timesheet.": "errors.periodLocked",
  "This week touches a locked period.": "errors.weekTouchesLockedPeriod",
  "Stop the running timer before starting another one.": "errors.stopTimerFirst",
  "No timer is running.": "errors.noTimerRunning",
  "This project is not active for the selected date.": "errors.projectNotActiveForDate",
  "This project is not assigned for the selected week.": "errors.projectNotAssignedForWeek",
  "This project declares its hours monthly.": "errors.projectDeclaresMonthly",
  "Declared hours are corrected on the month level.": "errors.declaredCorrectedAtMonth",
  "Could not format date in timezone.": "errors.dateTimezoneFormatFailed",
};

/**
 * Date validity for this module's schemas, where a date is always required.
 *
 * Deliberately stricter than the same-named helper in `app/admin/projects` and
 * `app/admin/rates`, which accept `""` to mean "no date". Keeping the difference explicit
 * and local is what stops a future consolidation from quietly making required dates
 * optional, or vice versa.
 */
function isDateInputValue(value: string) {
  return isDateValue(value);
}

function isTimeInputValue(value: string) {
  if (!value) return false;
  if (!/^\d{2}:\d{2}$/.test(value)) return false;

  const [hourValue, minuteValue] = value.split(":");
  const hour = Number.parseInt(hourValue ?? "", 10);
  const minute = Number.parseInt(minuteValue ?? "", 10);

  return (
    !Number.isNaN(hour) &&
    !Number.isNaN(minute) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59
  );
}

async function getTimeTrackingRequestMetadata(): Promise<TimeTrackingRequestMetadata> {
  const requestHeaders = await headers();

  return {
    ipAddress: requestHeaders.get("x-forwarded-for"),
    userAgent: requestHeaders.get("user-agent"),
    channel: "WEB",
  };
}
