import { isProjectColorToken, projectColorValues } from "@/src/lib/project-colors";
import { DAILY_HARD_LIMIT_MINUTES } from "@/src/lib/time-entry-limits";
import { prisma } from "@/src/server/db/client";
import { Prisma } from "@/src/server/db/generated/client";

import {
  addDays,
  buildWeekDays,
  formatDateOnly,
  formatTimeInTimezone,
  formatWeekRange,
  getMonday,
  getMonthStart,
  getMonthStartsInRange,
  getTodayIsoInTimezone,
  getWeekEnd,
  localIntervalToUtc,
  normalizeDateOnly,
  parseDateOnly,
  TimeTrackingDateError,
} from "./dates";
import type { TimeGridDay } from "./dates";
import { loadAssignedProjects, loadLockedMonthStarts } from "./assignments";
import {
  buildDescriptionSuggestions,
  loadDescriptionSuggestionRows,
  type DescriptionSuggestion,
} from "./description-suggestions";
import { findFullDayLeaveDates, lockMemberRow } from "./leave-guard";
import { resolveTrackingMode, type TrackingMode, type TrackingModeMember } from "./tracking-mode";

/**
 * Mirrors the `EntrySource` enum, `DECLARED` included: a declared month is materialized as a
 * `TimeEntry` too (see `tracking-mode.ts`). Nothing here writes `DECLARED` — the narrow write
 * paths below stay `Extract<..., "GRID" | "FORM" | "MCP">` — but the union has to carry it so a
 * reader that meets one has to say what it does with it instead of falling through.
 *
 * `MCP` is an agent writing through the MCP server (`src/server/mcp`). It is ordinary tracked time
 * in every respect — period locks, the daily cap and tracking modes all apply identically — and it
 * is tagged only so the grid, reports and the audit trail can tell it apart from a click.
 */
export type TimeEntrySource = "GRID" | "FORM" | "TIMER" | "DECLARED" | "MCP";
export type TimeEntryTimingMode = "DURATION" | "INTERVAL";

/**
 * Request provenance, spread verbatim into every `auditLog.create` in this module — so the field
 * names have to match the `AuditLog` columns exactly.
 *
 * `channel` and `clientId` exist so an agent write through `src/server/mcp` is distinguishable from
 * the member clicking in the browser. Rows written before the columns existed carry `null`, which
 * reads as "the web app".
 */
export type TimeTrackingRequestMetadata = {
  ipAddress?: string | null;
  userAgent?: string | null;
  channel?: "WEB" | "MCP";
  clientId?: string;
};

export type TimeGridAssignedProject = {
  assignmentId: string;
  projectId: string;
  name: string;
  color: string;
  isInternal: boolean;
  validFrom: string;
  validTo: string | null;
  projectStartsOn: string | null;
  projectEndsOn: string | null;
  /**
   * Already resolved through `resolveTrackingMode` — the member default with this assignment's
   * override applied — so no consumer has to re-derive it and none can get the precedence wrong.
   *
   * The client needs it to derive its zoom stop list: a member with no tracked assignment gets the
   * month stop alone (§5). Nothing about what L1-L3 render depends on it yet; excluding declared
   * projects from the week is a separate change.
   */
  trackingMode: TrackingMode;
};

export type TimeGridEntry = {
  id: string;
  projectId: string;
  projectAssignmentId: string;
  localDate: string;
  durationMinutes: number;
  description: string;
  source: TimeEntrySource;
  startedAt: string | null;
  endedAt: string | null;
  startTime: string | null;
  endTime: string | null;
  locked: boolean;
  updatedAt: string;
  adminModification: {
    modifiedAt: string;
    modifiedByName: string | null;
    reason: string;
    timezone: string;
  } | null;
};

export type RunningTimerView = {
  id: string;
  projectId: string;
  projectAssignmentId: string;
  projectName: string;
  projectColor: string;
  description: string;
  startedAt: string;
};

export type InactiveProjectWeekRow = {
  projectId: string;
  weekStartDate: string;
  note: string | null;
};

export type TimeEntryDraftPayload = {
  kind: "time-entry-form";
  version: 1;
  source: Extract<TimeEntrySource, "GRID" | "FORM">;
  projectId: string;
  localDate: string;
  timingMode: TimeEntryTimingMode;
  durationText: string;
  startTime: string;
  endTime: string;
  description: string;
  prefill?: boolean;
};

export type TimeEntryDraftView = {
  draftKey: string;
  payload: TimeEntryDraftPayload;
  updatedAt: string;
};

export type TimeGridWeek = {
  memberId: string;
  timezone: string;
  todayIso: string;
  weekStart: string;
  weekEnd: string;
  previousWeek: string;
  nextWeek: string;
  thisWeek: string;
  weekLabel: string;
  lockedMonthStarts: string[];
  days: TimeGridDay[];
  projects: TimeGridAssignedProject[];
  recentProjects: TimeGridAssignedProject[];
  entries: TimeGridEntry[];
  runningTimer: RunningTimerView | null;
  inactiveWeeks: InactiveProjectWeekRow[];
  entryDraft: TimeEntryDraftView | null;
  /**
   * The member's own recent descriptions, per project, ranked — advice for the composer and the
   * entry dialog (`docs/time-entry-suggestions.md`).
   *
   * A flat array rather than a map keyed by project: it serializes smaller, the client already
   * groups by project id for its chips, and a map would tempt a consumer into reading a missing key
   * as "no project". Never written back, and never another member's.
   */
  descriptionSuggestions: DescriptionSuggestion[];
};

export type TimeEntryMutationInput = {
  memberId: string;
  actorMemberId: string;
  projectId: string;
  localDate: Date;
  timingMode?: TimeEntryTimingMode;
  durationMinutes?: number;
  startTime?: string | null;
  endTime?: string | null;
  description: string;
  source?: Extract<TimeEntrySource, "GRID" | "FORM" | "MCP">;
  requestMetadata?: TimeTrackingRequestMetadata;
};

export type TimeEntryUpdateInput = Partial<
  Pick<
    TimeEntryMutationInput,
    | "projectId"
    | "localDate"
    | "timingMode"
    | "durationMinutes"
    | "startTime"
    | "endTime"
    | "description"
  >
> & {
  memberId: string;
  actorMemberId: string;
  timeEntryId: string;
  requestMetadata?: TimeTrackingRequestMetadata;
};

export type TimeEntryDeleteInput = {
  memberId: string;
  actorMemberId: string;
  timeEntryId: string;
  requestMetadata?: TimeTrackingRequestMetadata;
};

export type TimeEntryRestoreInput = TimeEntryDeleteInput;

export type RunningTimerStartInput = {
  memberId: string;
  actorMemberId: string;
  projectId: string;
  description: string;
  now?: Date;
  requestMetadata?: TimeTrackingRequestMetadata;
};

export type RunningTimerStopInput = {
  memberId: string;
  actorMemberId: string;
  now?: Date;
  requestMetadata?: TimeTrackingRequestMetadata;
};

export type InactiveProjectWeekInput = {
  memberId: string;
  actorMemberId: string;
  projectId: string;
  weekStartDate: Date;
  note?: string | null;
  requestMetadata?: TimeTrackingRequestMetadata;
};

export type CopyPreviousDayEntriesInput = {
  memberId: string;
  actorMemberId: string;
  targetDate: Date;
  requestMetadata?: TimeTrackingRequestMetadata;
};

export type DuplicatePreviousWeekInput = {
  memberId: string;
  actorMemberId: string;
  weekStartDate: Date;
  requestMetadata?: TimeTrackingRequestMetadata;
};

export type CopyTimeEntriesResult = {
  sourceCount: number;
  createdCount: number;
  skippedCount: number;
};

export type SaveTimeEntryDraftInput = {
  memberId: string;
  draftKey: string;
  payload: TimeEntryDraftPayload;
};

export type DeleteTimeEntryDraftInput = {
  memberId: string;
  draftKey: string;
};

type TimeTrackingDeps = {
  db?: typeof prisma;
};

type AssignmentForMutation = {
  id: string;
  projectId: string;
  trackingMode: TrackingMode | null;
  member: TrackingModeMember;
  project: {
    id: string;
  };
};

type EntryRecord = {
  id: string;
  projectId: string;
  projectAssignmentId: string;
  localDate: Date;
  durationMinutes: number;
  description: string;
  source: TimeEntrySource;
  startedAt: Date | null;
  endedAt: Date | null;
  timezone: string;
  lockedByTimesheetRevisionId: string | null;
  updatedAt: Date;
  adminModifiedAt: Date | null;
  adminModificationReason: string | null;
  adminModifiedBy: {
    displayName: string;
  } | null;
};

type EntryForCopy = {
  id: string;
  projectId: string;
  projectAssignmentId: string;
  localDate: Date;
  durationMinutes: number;
  description: string;
  startedAt: Date | null;
  endedAt: Date | null;
  timezone: string;
};

type RunningTimerRecord = {
  id: string;
  projectId: string;
  projectAssignmentId: string;
  description: string;
  startedAt: Date;
  projectAssignment: {
    project: {
      name: string;
      colorToken: string;
    };
  };
};

/**
 * Stable identifiers for the domain's refusals.
 *
 * The message stays the human-readable sentence `app/time/actions.ts` localizes; the code is what a
 * machine-facing caller keys on. Several distinct conditions deliberately share a code (three
 * different call paths all refuse a locked entry, four all refuse the 24-hour cap) — the code says
 * *what rule* was broken, and the message says where.
 */
export type TimeTrackingErrorCode =
  | "MEMBER_NOT_FOUND"
  | "ENTRY_NOT_FOUND"
  | "ENTRY_LOCKED"
  | "ENTRY_IS_DECLARED"
  | "PERIOD_LOCKED"
  | "WEEK_LOCKED"
  | "DAY_ON_LEAVE"
  | "PROJECT_REQUIRED"
  | "PROJECT_NOT_AVAILABLE"
  | "PROJECT_NOT_ASSIGNED_FOR_WEEK"
  | "PROJECT_DECLARES_MONTHLY"
  | "DURATION_INVALID"
  | "DAILY_LIMIT_EXCEEDED"
  | "START_END_REQUIRED"
  | "END_BEFORE_START"
  | "INVALID_DATE"
  | "INVALID_TIME"
  | "DESCRIPTION_REQUIRED"
  | "DESCRIPTION_TOO_LONG"
  | "TIMER_ALREADY_RUNNING"
  | "NO_TIMER_RUNNING"
  | "INACTIVE_WEEK_HAS_ENTRIES"
  | "DRAFT_KEY_INVALID"
  | "INVALID_CURSOR"
  /** Only reachable through a re-wrapped {@link TimeTrackingDateError}; never thrown directly. */
  | "TIMEZONE_FORMAT";

export class TimeTrackingError extends Error {
  readonly code: TimeTrackingErrorCode;

  constructor(message: string, code: TimeTrackingErrorCode) {
    super(message);
    this.name = "TimeTrackingError";
    this.code = code;
  }
}

/**
 * Shared by the week grid and the app-shell pill so both read the timer through one select and one
 * mapper. `memberId` is `@unique` on `RunningTimer`, so this is a single indexed lookup — cheap
 * enough for the root layout to run on every request.
 */
const runningTimerSelect = {
  id: true,
  projectId: true,
  projectAssignmentId: true,
  description: true,
  startedAt: true,
  projectAssignment: {
    select: {
      project: {
        select: {
          name: true,
          colorToken: true,
        },
      },
    },
  },
} as const;

export async function getRunningTimerForMember(memberId: string): Promise<RunningTimerView | null> {
  const timer = await prisma.runningTimer.findUnique({
    where: {
      memberId,
    },
    select: runningTimerSelect,
  });

  return timer ? mapRunningTimer(timer) : null;
}

export async function getMemberWeeklyTimeGrid(input: {
  memberId: string;
  weekStart?: Date | null;
  now?: Date;
}): Promise<TimeGridWeek> {
  const member = await loadTrackingMember(input.memberId);
  const todayIso = getTodayIsoInTimezone(member.timezone, input.now);
  const thisWeekStart = getMonday(parseDateOnly(todayIso));
  const weekStart = getMonday(input.weekStart ?? thisWeekStart);
  const weekEnd = getWeekEnd(weekStart);

  const [shared, entries, inactiveWeeks] = await Promise.all([
    loadTrackingRangeContext({ member, from: weekStart, to: weekEnd }),
    loadRangeEntries({ memberId: member.id, from: weekStart, to: weekEnd }),
    prisma.inactiveProjectWeek.findMany({
      where: {
        memberId: member.id,
        weekStartDate: weekStart,
      },
      select: {
        projectId: true,
        weekStartDate: true,
        note: true,
      },
    }),
  ]);

  return {
    memberId: member.id,
    timezone: member.timezone,
    todayIso,
    weekStart: formatDateOnly(weekStart),
    weekEnd: formatDateOnly(weekEnd),
    previousWeek: formatDateOnly(addDays(weekStart, -7)),
    nextWeek: formatDateOnly(addDays(weekStart, 7)),
    thisWeek: formatDateOnly(thisWeekStart),
    weekLabel: formatWeekRange(weekStart),
    lockedMonthStarts: [...shared.lockedMonthStarts],
    days: buildWeekDays({
      weekStart,
      todayIso,
      lockedMonthStarts: shared.lockedMonthStarts,
      leaveDates: shared.leaveDates,
    }),
    projects: shared.projects,
    recentProjects: shared.recentProjects,
    entries,
    runningTimer: shared.runningTimer,
    inactiveWeeks: inactiveWeeks.map((inactiveWeek) => ({
      projectId: inactiveWeek.projectId,
      weekStartDate: formatDateOnly(inactiveWeek.weekStartDate),
      note: inactiveWeek.note,
    })),
    entryDraft: shared.entryDraft,
    descriptionSuggestions: shared.descriptionSuggestions,
  };
}

export type TrackingMember = {
  id: string;
  timezone: string;
  deletedAt: Date | null;
  defaultTrackingMode: TrackingModeMember["defaultTrackingMode"];
};

/** The member every `/time` read starts from; a deleted member reads as missing. */
export async function loadTrackingMember(memberId: string): Promise<TrackingMember> {
  const member = await prisma.member.findUnique({
    where: {
      id: memberId,
    },
    select: {
      id: true,
      timezone: true,
      deletedAt: true,
      defaultTrackingMode: true,
    },
  });

  if (!member || member.deletedAt) {
    throw new TimeTrackingError("Member not found.", "MEMBER_NOT_FOUND");
  }

  return member;
}

/**
 * The tracked entries in `[from, to]`, oldest first.
 *
 * §4 item 3, and the reason it is a `where` rather than a filter on the way out: a declared month
 * is one 52-hour entry sitting on the 1st, and every `/time` aggregate and warning would absorb it.
 * Excluding it here means the finer views literally cannot see one.
 */
export async function loadRangeEntries(input: {
  memberId: string;
  from: Date;
  to: Date;
}): Promise<TimeGridEntry[]> {
  const entries = await prisma.timeEntry.findMany({
    where: {
      memberId: input.memberId,
      deletedAt: null,
      source: {
        not: "DECLARED",
      },
      localDate: {
        gte: input.from,
        lte: input.to,
      },
    },
    orderBy: [{ localDate: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      projectId: true,
      projectAssignmentId: true,
      localDate: true,
      durationMinutes: true,
      description: true,
      source: true,
      startedAt: true,
      endedAt: true,
      timezone: true,
      lockedByTimesheetRevisionId: true,
      updatedAt: true,
      adminModifiedAt: true,
      adminModificationReason: true,
      adminModifiedBy: {
        select: {
          displayName: true,
        },
      },
    },
  });

  return entries.map(mapTimeEntry);
}

export type TrackingRangeContext = {
  lockedMonthStarts: Set<string>;
  leaveDates: Set<string>;
  projects: TimeGridAssignedProject[];
  recentProjects: TimeGridAssignedProject[];
  runningTimer: RunningTimerView | null;
  entryDraft: TimeEntryDraftView | null;
  descriptionSuggestions: DescriptionSuggestion[];
};

/**
 * Everything a `/time` view needs about a date range besides its entries: locks, leave, the
 * assignments, the recent-project chips, the timer, the draft and the description suggestions.
 * Shared by the week grid and the day log so the two can never disagree about any of them.
 */
export async function loadTrackingRangeContext(input: {
  member: TrackingMember;
  from: Date;
  to: Date;
}): Promise<TrackingRangeContext> {
  const { member, from, to } = input;
  const monthStarts = getMonthStartsInRange(from, to);

  const [
    lockedMonthStarts,
    projectRows,
    recentEntries,
    runningTimer,
    entryDraft,
    suggestionRows,
    leaveDates,
  ] = await Promise.all([
    loadLockedMonthStarts({ memberId: member.id, monthStarts }),
    loadAssignedProjects({ memberId: member.id, member, from, to }),
    prisma.timeEntry.findMany({
      where: {
        memberId: member.id,
        deletedAt: null,
        // A declared project is never a "recent" chip: the chip opens the entry form, which is
        // the one thing a declared project must not offer.
        source: {
          not: "DECLARED",
        },
        localDate: {
          gte: addDays(to, -90),
          lte: to,
        },
      },
      distinct: ["projectId"],
      orderBy: [{ localDate: "desc" }, { updatedAt: "desc" }],
      select: {
        projectId: true,
      },
    }),
    getRunningTimerForMember(member.id),
    prisma.timeEntryDraft.findUnique({
      where: {
        memberId_draftKey: {
          memberId: member.id,
          draftKey: "time-entry-form",
        },
      },
      select: {
        draftKey: true,
        payload: true,
        updatedAt: true,
      },
    }),
    /* Anchored to the range being looked at, not to today: someone adding a forgotten entry in
       March should be offered what they were writing in March. */
    loadDescriptionSuggestionRows({ memberId: member.id, windowEnd: to }),
    findFullDayLeaveDates(prisma, member.id, formatDateOnly(from), formatDateOnly(to)),
  ]);

  const projectsById = new Map(projectRows.map((project) => [project.projectId, project]));
  const recentProjects = unique(recentEntries.map((entry) => entry.projectId))
    .map((projectId) => projectsById.get(projectId))
    .filter((project): project is TimeGridAssignedProject => Boolean(project));

  return {
    lockedMonthStarts,
    leaveDates,
    projects: projectRows,
    recentProjects,
    runningTimer,
    entryDraft: mapTimeEntryDraft(entryDraft),
    // Intersected against the assignments, like `recentProjects`: a suggestion for a project with
    // no chip has nowhere to be used.
    descriptionSuggestions: buildDescriptionSuggestions(suggestionRows, {
      anchor: to,
      projectIds: projectRows.map((project) => project.projectId),
    }),
  };
}

export async function createTimeEntry(input: TimeEntryMutationInput) {
  const normalized = normalizeTimeEntryMutationBase(input);

  return prisma.$transaction(async (tx) => {
    await assertDateOpen(tx, input.memberId, normalized.localDate);
    await assertDateNotOnLeave(tx, input.memberId, normalized.localDate);
    const assignment = await findAssignmentForDate(tx, {
      memberId: input.memberId,
      projectId: normalized.projectId,
      localDate: normalized.localDate,
    });
    const timezone = await getMemberTimezone(tx, input.memberId);
    const timing = normalizeTimeEntryTiming({
      localDate: normalized.localDate,
      timezone,
      timingMode: input.timingMode,
      durationMinutes: input.durationMinutes,
      startTime: input.startTime,
      endTime: input.endTime,
    });

    await assertDailyTotalWithinHardLimit(tx, {
      memberId: input.memberId,
      localDate: normalized.localDate,
      addedMinutes: timing.durationMinutes,
    });

    const created = await tx.timeEntry.create({
      data: {
        memberId: input.memberId,
        projectId: assignment.projectId,
        projectAssignmentId: assignment.id,
        localDate: normalized.localDate,
        timezone,
        durationMinutes: timing.durationMinutes,
        startedAt: timing.startedAt,
        endedAt: timing.endedAt,
        description: normalized.description,
        source: input.source ?? "GRID",
        createdByMemberId: input.actorMemberId,
        updatedByMemberId: input.actorMemberId,
      },
      select: {
        id: true,
      },
    });

    await clearInactiveMarkerForEntryDate(tx, {
      memberId: input.memberId,
      projectId: assignment.projectId,
      localDate: normalized.localDate,
    });

    await tx.auditLog.create({
      data: {
        actorMemberId: input.actorMemberId,
        action: "time_entry.created",
        targetType: "time_entry",
        targetId: created.id,
        after: {
          projectId: assignment.projectId,
          projectAssignmentId: assignment.id,
          localDate: formatDateOnly(normalized.localDate),
          durationMinutes: timing.durationMinutes,
          startedAt: timing.startedAt?.toISOString() ?? null,
          endedAt: timing.endedAt?.toISOString() ?? null,
          source: input.source ?? "GRID",
        },
        ...input.requestMetadata,
      },
    });

    return {
      id: created.id,
    };
  });
}

export async function updateTimeEntry(input: TimeEntryUpdateInput) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.timeEntry.findUnique({
      where: {
        id: input.timeEntryId,
      },
      select: {
        id: true,
        memberId: true,
        projectId: true,
        projectAssignmentId: true,
        localDate: true,
        durationMinutes: true,
        description: true,
        timezone: true,
        startedAt: true,
        endedAt: true,
        source: true,
        lockedByTimesheetRevisionId: true,
        deletedAt: true,
      },
    });

    if (!current || current.memberId !== input.memberId || current.deletedAt) {
      throw new TimeTrackingError("Time entry not found.", "ENTRY_NOT_FOUND");
    }

    assertEntryIsNotDeclared(current.source);

    if (current.lockedByTimesheetRevisionId) {
      throw new TimeTrackingError("This entry is locked by a submitted timesheet.", "ENTRY_LOCKED");
    }

    const nextLocalDate = input.localDate
      ? normalizeDateOnly(input.localDate)
      : normalizeDateOnly(current.localDate);
    const nextProjectId = input.projectId?.trim() || current.projectId;
    const nextDescription =
      input.description === undefined
        ? current.description
        : normalizeDescription(input.description);
    const timingChanged =
      input.timingMode !== undefined ||
      input.durationMinutes !== undefined ||
      input.startTime !== undefined ||
      input.endTime !== undefined;
    const nextTiming = timingChanged
      ? normalizeTimeEntryTiming({
          localDate: nextLocalDate,
          timezone: current.timezone,
          timingMode: input.timingMode,
          durationMinutes: input.durationMinutes,
          startTime: input.startTime,
          endTime: input.endTime,
        })
      : {
          durationMinutes: current.durationMinutes,
          startedAt: current.startedAt,
          endedAt: current.endedAt,
        };

    await assertDateOpen(tx, input.memberId, nextLocalDate);
    // Only a move onto a leave day is refused; an entry already on that day stays editable.
    if (nextLocalDate.getTime() !== normalizeDateOnly(current.localDate).getTime()) {
      await assertDateNotOnLeave(tx, input.memberId, nextLocalDate);
    }
    await assertDailyTotalWithinHardLimit(tx, {
      memberId: input.memberId,
      localDate: nextLocalDate,
      addedMinutes: nextTiming.durationMinutes,
      excludingTimeEntryId: current.id,
    });

    const needsAssignment =
      nextProjectId !== current.projectId ||
      formatDateOnly(nextLocalDate) !== formatDateOnly(current.localDate);
    const assignment = needsAssignment
      ? await findAssignmentForDate(tx, {
          memberId: input.memberId,
          projectId: nextProjectId,
          localDate: nextLocalDate,
        })
      : null;

    const before = serializeTimeEntryForAudit(current);
    const after = {
      projectId: nextProjectId,
      projectAssignmentId: assignment?.id ?? current.projectAssignmentId,
      localDate: formatDateOnly(nextLocalDate),
      durationMinutes: nextTiming.durationMinutes,
      description: nextDescription,
      startedAt: nextTiming.startedAt?.toISOString() ?? null,
      endedAt: nextTiming.endedAt?.toISOString() ?? null,
    };

    await tx.timeEntry.update({
      where: {
        id: current.id,
      },
      data: {
        projectId: nextProjectId,
        projectAssignmentId: assignment?.id ?? current.projectAssignmentId,
        localDate: nextLocalDate,
        durationMinutes: nextTiming.durationMinutes,
        startedAt: nextTiming.startedAt,
        endedAt: nextTiming.endedAt,
        description: nextDescription,
        updatedByMemberId: input.actorMemberId,
      },
      select: {
        id: true,
      },
    });

    await clearInactiveMarkerForEntryDate(tx, {
      memberId: input.memberId,
      projectId: nextProjectId,
      localDate: nextLocalDate,
    });

    await tx.auditLog.create({
      data: {
        actorMemberId: input.actorMemberId,
        action: "time_entry.updated",
        targetType: "time_entry",
        targetId: current.id,
        before,
        after,
        ...input.requestMetadata,
      },
    });

    return {
      id: current.id,
    };
  });
}

export async function deleteTimeEntry(input: TimeEntryDeleteInput) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.timeEntry.findUnique({
      where: {
        id: input.timeEntryId,
      },
      select: {
        id: true,
        memberId: true,
        projectId: true,
        projectAssignmentId: true,
        localDate: true,
        durationMinutes: true,
        description: true,
        source: true,
        lockedByTimesheetRevisionId: true,
        deletedAt: true,
      },
    });

    if (!current || current.memberId !== input.memberId || current.deletedAt) {
      throw new TimeTrackingError("Time entry not found.", "ENTRY_NOT_FOUND");
    }

    assertEntryIsNotDeclared(current.source);

    if (current.lockedByTimesheetRevisionId) {
      throw new TimeTrackingError("This entry is locked by a submitted timesheet.", "ENTRY_LOCKED");
    }

    await assertDateOpen(tx, input.memberId, current.localDate);

    await tx.timeEntry.update({
      where: {
        id: current.id,
      },
      data: {
        deletedAt: new Date(),
        updatedByMemberId: input.actorMemberId,
      },
      select: {
        id: true,
      },
    });

    await tx.auditLog.create({
      data: {
        actorMemberId: input.actorMemberId,
        action: "time_entry.deleted",
        targetType: "time_entry",
        targetId: current.id,
        before: serializeTimeEntryForAudit(current),
        after: {
          deletedAt: "now",
        },
        ...input.requestMetadata,
      },
    });

    return {
      id: current.id,
    };
  });
}

/**
 * The undo of {@link deleteTimeEntry}, for the six seconds the toast offers it (§5.8 of
 * `docs/time-view-redesign.md`).
 *
 * A real restore rather than a deferred delete: the delete has already happened and been audited,
 * so undoing it is a second, audited write that clears `deletedAt` — nothing is held back on the
 * client waiting for a timer, and closing the tab mid-toast leaves the database honest either way.
 *
 * Re-validated as if the entry were being created now, because the world may have moved in the
 * meantime: the month may have been submitted, the assignment may have switched to declared hours,
 * and the day may have filled up past the hard limit with another entry. Each of those refuses the
 * restore with the same message the create would have given.
 */
export async function restoreTimeEntry(input: TimeEntryRestoreInput) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.timeEntry.findUnique({
      where: {
        id: input.timeEntryId,
      },
      select: {
        id: true,
        memberId: true,
        projectId: true,
        projectAssignmentId: true,
        localDate: true,
        durationMinutes: true,
        description: true,
        source: true,
        startedAt: true,
        endedAt: true,
        lockedByTimesheetRevisionId: true,
        deletedAt: true,
      },
    });

    if (!current || current.memberId !== input.memberId || !current.deletedAt) {
      throw new TimeTrackingError("Time entry not found.", "ENTRY_NOT_FOUND");
    }

    assertEntryIsNotDeclared(current.source);

    if (current.lockedByTimesheetRevisionId) {
      throw new TimeTrackingError("This entry is locked by a submitted timesheet.", "ENTRY_LOCKED");
    }

    await assertDateOpen(tx, input.memberId, current.localDate);
    await assertDateNotOnLeave(tx, input.memberId, current.localDate);
    await assertAssignmentStillTracked(tx, current.projectAssignmentId);
    await assertDailyTotalWithinHardLimit(tx, {
      memberId: input.memberId,
      localDate: current.localDate,
      addedMinutes: current.durationMinutes,
    });

    await tx.timeEntry.update({
      where: {
        id: current.id,
      },
      data: {
        deletedAt: null,
        updatedByMemberId: input.actorMemberId,
      },
      select: {
        id: true,
      },
    });

    await tx.auditLog.create({
      data: {
        actorMemberId: input.actorMemberId,
        action: "time_entry.restored",
        targetType: "time_entry",
        targetId: current.id,
        before: {
          deletedAt: current.deletedAt.toISOString(),
        },
        after: serializeTimeEntryForAudit(current),
        ...input.requestMetadata,
      },
    });

    return {
      id: current.id,
    };
  });
}

export async function startRunningTimer(input: RunningTimerStartInput) {
  return prisma.$transaction((tx) => startRunningTimerInTx(tx, input));
}

/**
 * Starts a timer, stopping the running one first if there is one — one transaction, so a failed
 * start (a locked day, a leave day) leaves the old timer running rather than lost. Continue and
 * the day log's composer use it so a member never meets "stop the running timer first".
 */
export async function switchRunningTimer(input: RunningTimerStartInput) {
  const now = input.now ?? new Date();

  return prisma.$transaction(async (tx) => {
    const running = await tx.runningTimer.findUnique({
      where: { memberId: input.memberId },
      select: { id: true },
    });
    const stopped = running ? await stopRunningTimerInTx(tx, { ...input, now }) : null;
    const started = await startRunningTimerInTx(tx, { ...input, now });

    return { stopped, started };
  });
}

async function startRunningTimerInTx(tx: TimeTrackingTransaction, input: RunningTimerStartInput) {
  const description = normalizeDescription(input.description);
  const now = input.now ?? new Date();

  const timezone = await getMemberTimezone(tx, input.memberId);
  const localDate = parseDateOnly(getTodayIsoInTimezone(timezone, now));

  await assertDateOpen(tx, input.memberId, localDate);
  await assertDateNotOnLeave(tx, input.memberId, localDate);

  const assignment = await findAssignmentForDate(tx, {
    memberId: input.memberId,
    projectId: input.projectId,
    localDate,
  });

  const existing = await tx.runningTimer.findUnique({
    where: {
      memberId: input.memberId,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw new TimeTrackingError(
      "Stop the running timer before starting another one.",
      "TIMER_ALREADY_RUNNING",
    );
  }

  const timer = await tx.runningTimer.create({
    data: {
      memberId: input.memberId,
      projectId: assignment.projectId,
      projectAssignmentId: assignment.id,
      description,
      startedAt: now,
      timezone,
    },
    select: {
      id: true,
    },
  });

  await tx.auditLog.create({
    data: {
      actorMemberId: input.actorMemberId,
      action: "running_timer.started",
      targetType: "running_timer",
      targetId: timer.id,
      after: {
        projectId: assignment.projectId,
        projectAssignmentId: assignment.id,
        description,
        startedAt: now.toISOString(),
        timezone,
      },
      ...input.requestMetadata,
    },
  });

  return {
    id: timer.id,
  };
}

export async function stopRunningTimer(input: RunningTimerStopInput) {
  return prisma.$transaction((tx) => stopRunningTimerInTx(tx, input));
}

async function stopRunningTimerInTx(tx: TimeTrackingTransaction, input: RunningTimerStopInput) {
  const endedAt = input.now ?? new Date();

  const timer = await tx.runningTimer.findUnique({
    where: {
      memberId: input.memberId,
    },
    select: {
      id: true,
      memberId: true,
      projectId: true,
      projectAssignmentId: true,
      description: true,
      startedAt: true,
      timezone: true,
    },
  });

  if (!timer || timer.memberId !== input.memberId) {
    throw new TimeTrackingError("No timer is running.", "NO_TIMER_RUNNING");
  }

  if (endedAt <= timer.startedAt) {
    throw new TimeTrackingError("Timer end time must be after start time.", "END_BEFORE_START");
  }

  const localDate = parseDateOnly(getTodayIsoInTimezone(timer.timezone, timer.startedAt));
  await assertDateOpen(tx, input.memberId, localDate);
  await assertDateNotOnLeave(tx, input.memberId, localDate);
  /* A timer cannot be *started* on a declared assignment, but the mode-switch guard counts
     entries and a running timer is not one yet — so the assignment can change under a timer that
     is already running. Re-reading it here is the last point before the entry is written. */
  await assertAssignmentStillTracked(tx, timer.projectAssignmentId);

  const durationMinutes = Math.max(
    1,
    Math.ceil((endedAt.getTime() - timer.startedAt.getTime()) / 60_000),
  );
  const description = timer.description.trim() || "Tracked with timer";

  const currentDailyMinutes = await getDailyLoggedMinutes(tx, {
    memberId: input.memberId,
    localDate,
  });

  if (currentDailyMinutes + durationMinutes > DAILY_HARD_LIMIT_MINUTES) {
    await tx.runningTimer.delete({
      where: {
        id: timer.id,
      },
      select: {
        id: true,
      },
    });

    await tx.auditLog.create({
      data: {
        actorMemberId: input.actorMemberId,
        action: "running_timer.discarded_daily_limit",
        targetType: "running_timer",
        targetId: timer.id,
        before: {
          projectId: timer.projectId,
          projectAssignmentId: timer.projectAssignmentId,
          startedAt: timer.startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          durationMinutes,
          currentDailyMinutes,
        },
        after: {
          saved: false,
          reason: "daily_total_limit",
        },
        ...input.requestMetadata,
      },
    });

    return {
      discarded: true as const,
      reason: "DAILY_LIMIT" as const,
    };
  }

  const entry = await tx.timeEntry.create({
    data: {
      memberId: input.memberId,
      projectId: timer.projectId,
      projectAssignmentId: timer.projectAssignmentId,
      localDate,
      timezone: timer.timezone,
      startedAt: timer.startedAt,
      endedAt,
      durationMinutes,
      description,
      source: "TIMER",
      createdByMemberId: input.actorMemberId,
      updatedByMemberId: input.actorMemberId,
    },
    select: {
      id: true,
    },
  });

  await tx.runningTimer.delete({
    where: {
      id: timer.id,
    },
    select: {
      id: true,
    },
  });

  await tx.auditLog.create({
    data: {
      actorMemberId: input.actorMemberId,
      action: "running_timer.stopped",
      targetType: "time_entry",
      targetId: entry.id,
      before: {
        runningTimerId: timer.id,
        projectId: timer.projectId,
        projectAssignmentId: timer.projectAssignmentId,
        startedAt: timer.startedAt.toISOString(),
      },
      after: {
        localDate: formatDateOnly(localDate),
        durationMinutes,
        endedAt: endedAt.toISOString(),
        source: "TIMER",
      },
      ...input.requestMetadata,
    },
  });

  return {
    id: entry.id,
    saved: true as const,
  };
}

export async function copyPreviousDayEntries(
  input: CopyPreviousDayEntriesInput,
  deps: TimeTrackingDeps = {},
): Promise<CopyTimeEntriesResult> {
  const targetDate = normalizeDateOnly(input.targetDate);
  const sourceDate = addDays(targetDate, -1);

  return copyEntriesByDateShift({
    memberId: input.memberId,
    actorMemberId: input.actorMemberId,
    sourceStartDate: sourceDate,
    sourceEndDate: sourceDate,
    dayShift: 1,
    auditAction: "time_entries.copy_previous_day",
    requestMetadata: input.requestMetadata,
    db: deps.db,
  });
}

export async function duplicatePreviousWeek(
  input: DuplicatePreviousWeekInput,
  deps: TimeTrackingDeps = {},
): Promise<CopyTimeEntriesResult> {
  const weekStartDate = getMonday(input.weekStartDate);

  return copyEntriesByDateShift({
    memberId: input.memberId,
    actorMemberId: input.actorMemberId,
    sourceStartDate: addDays(weekStartDate, -7),
    sourceEndDate: addDays(weekStartDate, -1),
    dayShift: 7,
    auditAction: "time_entries.duplicate_previous_week",
    requestMetadata: input.requestMetadata,
    db: deps.db,
  });
}

export async function saveTimeEntryDraft(
  input: SaveTimeEntryDraftInput,
  deps: TimeTrackingDeps = {},
) {
  const db = deps.db ?? prisma;
  const draftKey = normalizeDraftKey(input.draftKey);

  return db.timeEntryDraft.upsert({
    where: {
      memberId_draftKey: {
        memberId: input.memberId,
        draftKey,
      },
    },
    create: {
      memberId: input.memberId,
      draftKey,
      payload: input.payload,
    },
    update: {
      payload: input.payload,
    },
    select: {
      draftKey: true,
    },
  });
}

export async function deleteTimeEntryDraft(
  input: DeleteTimeEntryDraftInput,
  deps: TimeTrackingDeps = {},
) {
  const db = deps.db ?? prisma;
  const draftKey = normalizeDraftKey(input.draftKey);

  return db.timeEntryDraft.deleteMany({
    where: {
      memberId: input.memberId,
      draftKey,
    },
  });
}

export async function markInactiveProjectWeek(input: InactiveProjectWeekInput) {
  const weekStartDate = getMonday(input.weekStartDate);
  const weekEndDate = getWeekEnd(weekStartDate);
  const note = input.note?.trim() || null;

  return prisma.$transaction(async (tx) => {
    await assertWeekOpen(tx, input.memberId, weekStartDate, weekEndDate);
    await findAssignmentForWeek(tx, {
      memberId: input.memberId,
      projectId: input.projectId,
      weekStartDate,
      weekEndDate,
    });

    const entryCount = await tx.timeEntry.count({
      where: {
        memberId: input.memberId,
        projectId: input.projectId,
        deletedAt: null,
        localDate: {
          gte: weekStartDate,
          lte: weekEndDate,
        },
      },
    });

    if (entryCount > 0) {
      throw new TimeTrackingError(
        "Remove this week's entries before marking the project inactive.",
        "INACTIVE_WEEK_HAS_ENTRIES",
      );
    }

    const inactiveWeek = await tx.inactiveProjectWeek.upsert({
      where: {
        memberId_projectId_weekStartDate: {
          memberId: input.memberId,
          projectId: input.projectId,
          weekStartDate,
        },
      },
      create: {
        memberId: input.memberId,
        projectId: input.projectId,
        weekStartDate,
        timezone: await getMemberTimezone(tx, input.memberId),
        note,
      },
      update: {
        note,
      },
      select: {
        id: true,
      },
    });

    await tx.auditLog.create({
      data: {
        actorMemberId: input.actorMemberId,
        action: "inactive_project_week.marked",
        targetType: "inactive_project_week",
        targetId: inactiveWeek.id,
        after: {
          projectId: input.projectId,
          weekStartDate: formatDateOnly(weekStartDate),
          note,
        },
        ...input.requestMetadata,
      },
    });

    return {
      id: inactiveWeek.id,
    };
  });
}

export async function unmarkInactiveProjectWeek(input: InactiveProjectWeekInput) {
  const weekStartDate = getMonday(input.weekStartDate);
  const weekEndDate = getWeekEnd(weekStartDate);

  return prisma.$transaction(async (tx) => {
    await assertWeekOpen(tx, input.memberId, weekStartDate, weekEndDate);

    const deleted = await tx.inactiveProjectWeek.deleteMany({
      where: {
        memberId: input.memberId,
        projectId: input.projectId,
        weekStartDate,
      },
    });

    await tx.auditLog.create({
      data: {
        actorMemberId: input.actorMemberId,
        action: "inactive_project_week.unmarked",
        targetType: "inactive_project_week",
        targetId: `${input.memberId}:${input.projectId}:${formatDateOnly(weekStartDate)}`,
        before: {
          projectId: input.projectId,
          weekStartDate: formatDateOnly(weekStartDate),
          deletedCount: deleted.count,
        },
        ...input.requestMetadata,
      },
    });

    return {
      deletedCount: deleted.count,
    };
  });
}

async function copyEntriesByDateShift(input: {
  memberId: string;
  actorMemberId: string;
  sourceStartDate: Date;
  sourceEndDate: Date;
  dayShift: number;
  auditAction: string;
  requestMetadata?: TimeTrackingRequestMetadata;
  db?: typeof prisma;
}): Promise<CopyTimeEntriesResult> {
  const db = input.db ?? prisma;
  const sourceStartDate = normalizeDateOnly(input.sourceStartDate);
  const sourceEndDate = normalizeDateOnly(input.sourceEndDate);

  return db.$transaction(async (tx) => {
    const sourceEntries = await tx.timeEntry.findMany({
      where: {
        memberId: input.memberId,
        deletedAt: null,
        /* "Duplicate last week" over a week containing the 1st would otherwise copy a whole
           month's declared figure onto the following month as an ordinary entry — a double count
           with no declaration behind it, created by a button nobody thought was near this. */
        source: {
          not: "DECLARED",
        },
        localDate: {
          gte: sourceStartDate,
          lte: sourceEndDate,
        },
      },
      orderBy: [{ localDate: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        projectId: true,
        projectAssignmentId: true,
        localDate: true,
        durationMinutes: true,
        description: true,
        startedAt: true,
        endedAt: true,
        timezone: true,
      },
    });

    if (!sourceEntries.length) {
      return {
        sourceCount: 0,
        createdCount: 0,
        skippedCount: 0,
      };
    }

    const timezone = await getMemberTimezone(tx, input.memberId);
    const targetDates = unique(
      sourceEntries.map((entry) => formatDateOnly(addDays(entry.localDate, input.dayShift))),
    );
    const existingTargetEntries = await tx.timeEntry.findMany({
      where: {
        memberId: input.memberId,
        deletedAt: null,
        localDate: {
          in: targetDates.map((targetDate) => parseDateOnly(targetDate)),
        },
      },
      select: {
        projectId: true,
        localDate: true,
        durationMinutes: true,
      },
    });
    const occupiedTargetCells = new Set(
      existingTargetEntries.map((entry) =>
        copiedEntryCellKey(entry.projectId, formatDateOnly(entry.localDate)),
      ),
    );
    const targetDailyMinutes = new Map<string, number>();

    for (const entry of existingTargetEntries) {
      const localDate = formatDateOnly(entry.localDate);
      targetDailyMinutes.set(
        localDate,
        (targetDailyMinutes.get(localDate) ?? 0) + entry.durationMinutes,
      );
    }

    for (const targetDate of targetDates) {
      await assertDateOpen(tx, input.memberId, parseDateOnly(targetDate));
    }

    await lockMemberRow(tx, input.memberId);
    const sortedTargetDates = [...targetDates].sort();
    const leaveDates = await findFullDayLeaveDates(
      tx,
      input.memberId,
      sortedTargetDates[0]!,
      sortedTargetDates.at(-1)!,
    );

    let createdCount = 0;
    let skippedCount = 0;
    const createdEntryIds: string[] = [];

    for (const sourceEntry of sourceEntries) {
      const targetDate = addDays(sourceEntry.localDate, input.dayShift);
      const targetDateIso = formatDateOnly(targetDate);

      if (
        leaveDates.has(targetDateIso) ||
        occupiedTargetCells.has(copiedEntryCellKey(sourceEntry.projectId, targetDateIso))
      ) {
        skippedCount += 1;
        continue;
      }

      const assignment = await findOptionalAssignmentForDate(tx, {
        memberId: input.memberId,
        projectId: sourceEntry.projectId,
        localDate: targetDate,
      });

      if (!assignment) {
        skippedCount += 1;
        continue;
      }

      const copiedTiming = getCopiedEntryTiming(sourceEntry, targetDate, timezone);
      const nextDailyTotal =
        (targetDailyMinutes.get(targetDateIso) ?? 0) + copiedTiming.durationMinutes;

      if (nextDailyTotal > DAILY_HARD_LIMIT_MINUTES) {
        throw new TimeTrackingError("Daily total cannot exceed 24 hours.", "DAILY_LIMIT_EXCEEDED");
      }

      targetDailyMinutes.set(targetDateIso, nextDailyTotal);

      const created = await tx.timeEntry.create({
        data: {
          memberId: input.memberId,
          projectId: assignment.projectId,
          projectAssignmentId: assignment.id,
          localDate: targetDate,
          timezone,
          durationMinutes: copiedTiming.durationMinutes,
          startedAt: copiedTiming.startedAt,
          endedAt: copiedTiming.endedAt,
          description: sourceEntry.description,
          source: "GRID",
          createdByMemberId: input.actorMemberId,
          updatedByMemberId: input.actorMemberId,
        },
        select: {
          id: true,
        },
      });

      await clearInactiveMarkerForEntryDate(tx, {
        memberId: input.memberId,
        projectId: assignment.projectId,
        localDate: targetDate,
      });

      createdEntryIds.push(created.id);
      createdCount += 1;
    }

    await tx.auditLog.create({
      data: {
        actorMemberId: input.actorMemberId,
        action: input.auditAction,
        targetType: "time_entries",
        targetId: `${input.memberId}:${formatDateOnly(sourceStartDate)}:${formatDateOnly(sourceEndDate)}`,
        after: {
          sourceStartDate: formatDateOnly(sourceStartDate),
          sourceEndDate: formatDateOnly(sourceEndDate),
          dayShift: input.dayShift,
          sourceCount: sourceEntries.length,
          createdCount,
          skippedCount,
          createdEntryIds,
        },
        ...input.requestMetadata,
      },
    });

    return {
      sourceCount: sourceEntries.length,
      createdCount,
      skippedCount,
    };
  });
}

function normalizeTimeEntryMutationBase(input: TimeEntryMutationInput) {
  return {
    projectId: normalizeId(input.projectId, "Choose a project.", "PROJECT_REQUIRED"),
    localDate: normalizeDateOnly(input.localDate),
    description: normalizeDescription(input.description),
  };
}

function normalizeTimeEntryTiming(input: {
  localDate: Date;
  timezone: string;
  timingMode?: TimeEntryTimingMode;
  durationMinutes?: number;
  startTime?: string | null;
  endTime?: string | null;
}) {
  if (input.timingMode === "INTERVAL" || input.startTime || input.endTime) {
    if (!input.startTime || !input.endTime) {
      throw new TimeTrackingError("Start and end time are required.", "START_END_REQUIRED");
    }

    try {
      return localIntervalToUtc({
        localDate: input.localDate,
        startTime: input.startTime,
        endTime: input.endTime,
        timezone: input.timezone,
      });
    } catch (error) {
      // `localIntervalToUtc` throws `TimeTrackingDateError`s about the times it was handed. Keep
      // both the sentence and the code, so a caller that keys on codes sees the real cause instead
      // of a generic time failure.
      if (error instanceof TimeTrackingDateError) {
        throw new TimeTrackingError(error.message, error.code);
      }

      if (error instanceof Error) {
        throw new TimeTrackingError(error.message, "INVALID_TIME");
      }

      throw error;
    }
  }

  if (input.durationMinutes === undefined) {
    throw new TimeTrackingError("Duration must be greater than zero.", "DURATION_INVALID");
  }

  return {
    durationMinutes: normalizeDurationMinutes(input.durationMinutes),
    startedAt: null,
    endedAt: null,
  };
}

function normalizeId(value: string, message: string, code: TimeTrackingErrorCode) {
  const normalized = value.trim();
  if (!normalized) throw new TimeTrackingError(message, code);
  return normalized;
}

function normalizeDurationMinutes(value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TimeTrackingError("Duration must be greater than zero.", "DURATION_INVALID");
  }

  if (value > DAILY_HARD_LIMIT_MINUTES) {
    throw new TimeTrackingError("Daily total cannot exceed 24 hours.", "DAILY_LIMIT_EXCEEDED");
  }

  return value;
}

function normalizeDescription(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new TimeTrackingError("Description is required.", "DESCRIPTION_REQUIRED");
  }

  if (normalized.length > 1000) {
    throw new TimeTrackingError(
      "Description must be 1000 characters or less.",
      "DESCRIPTION_TOO_LONG",
    );
  }

  return normalized;
}

function normalizeDraftKey(value: string) {
  const normalized = value.trim();

  if (!/^[a-z0-9:_-]{1,80}$/.test(normalized)) {
    throw new TimeTrackingError("Draft key is invalid.", "DRAFT_KEY_INVALID");
  }

  return normalized;
}

function getCopiedEntryTiming(entry: EntryForCopy, targetDate: Date, timezone: string) {
  if (entry.startedAt && entry.endedAt) {
    const startTime = formatTimeInTimezone(entry.startedAt, entry.timezone);
    const endTime = formatTimeInTimezone(entry.endedAt, entry.timezone);

    return localIntervalToUtc({
      localDate: targetDate,
      startTime,
      endTime,
      timezone,
    });
  }

  return {
    durationMinutes: entry.durationMinutes,
    startedAt: null,
    endedAt: null,
  };
}

function copiedEntryCellKey(projectId: string, localDate: string) {
  return `${projectId}:${localDate}`;
}

async function assertDateOpen(tx: TimeTrackingTransaction, memberId: string, localDate: Date) {
  const lockedPeriod = await tx.periodLock.findFirst({
    where: {
      memberId,
      periodStart: getMonthStart(localDate),
      unlockedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (lockedPeriod) {
    throw new TimeTrackingError("This period is locked by a submitted timesheet.", "PERIOD_LOCKED");
  }
}

async function assertDateNotOnLeave(
  tx: TimeTrackingTransaction,
  memberId: string,
  localDate: Date,
) {
  await lockMemberRow(tx, memberId);
  const day = formatDateOnly(localDate);
  const leaveDates = await findFullDayLeaveDates(tx, memberId, day, day);

  if (leaveDates.has(day)) {
    throw new TimeTrackingError("This day is covered by leave.", "DAY_ON_LEAVE");
  }
}

async function assertDailyTotalWithinHardLimit(
  tx: TimeTrackingTransaction,
  input: {
    memberId: string;
    localDate: Date;
    addedMinutes: number;
    excludingTimeEntryId?: string;
  },
) {
  if (input.addedMinutes > DAILY_HARD_LIMIT_MINUTES) {
    throw new TimeTrackingError("Daily total cannot exceed 24 hours.", "DAILY_LIMIT_EXCEEDED");
  }

  const currentMinutes = await getDailyLoggedMinutes(tx, {
    memberId: input.memberId,
    localDate: input.localDate,
    excludingTimeEntryId: input.excludingTimeEntryId,
  });

  if (currentMinutes + input.addedMinutes > DAILY_HARD_LIMIT_MINUTES) {
    throw new TimeTrackingError("Daily total cannot exceed 24 hours.", "DAILY_LIMIT_EXCEEDED");
  }
}

async function getDailyLoggedMinutes(
  tx: TimeTrackingTransaction,
  input: {
    memberId: string;
    localDate: Date;
    excludingTimeEntryId?: string;
  },
) {
  const aggregate = await tx.timeEntry.aggregate({
    where: {
      memberId: input.memberId,
      deletedAt: null,
      localDate: input.localDate,
      ...(input.excludingTimeEntryId ? { NOT: { id: input.excludingTimeEntryId } } : {}),
    },
    _sum: {
      durationMinutes: true,
    },
  });

  return aggregate._sum.durationMinutes ?? 0;
}

async function assertWeekOpen(
  tx: TimeTrackingTransaction,
  memberId: string,
  weekStartDate: Date,
  weekEndDate: Date,
) {
  const lockedPeriod = await tx.periodLock.findFirst({
    where: {
      memberId,
      periodStart: {
        in: getMonthStartsInRange(weekStartDate, weekEndDate),
      },
      unlockedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (lockedPeriod) {
    throw new TimeTrackingError("This week touches a locked period.", "WEEK_LOCKED");
  }
}

async function clearInactiveMarkerForEntryDate(
  tx: TimeTrackingTransaction,
  input: {
    memberId: string;
    projectId: string;
    localDate: Date;
  },
) {
  await tx.inactiveProjectWeek.deleteMany({
    where: {
      memberId: input.memberId,
      projectId: input.projectId,
      weekStartDate: getMonday(input.localDate),
    },
  });
}

/**
 * Everything the three assignment finders need, including what {@link assertAssignmentIsTracked}
 * reads. One select rather than three so a finder cannot be added without the mode coming with it.
 */
const assignmentForMutationSelect = {
  id: true,
  projectId: true,
  trackingMode: true,
  member: {
    select: {
      defaultTrackingMode: true,
    },
  },
  project: {
    select: {
      id: true,
    },
  },
} as const;

async function assertAssignmentStillTracked(
  tx: TimeTrackingTransaction,
  projectAssignmentId: string,
) {
  const assignment = await tx.projectAssignment.findUnique({
    where: {
      id: projectAssignmentId,
    },
    select: {
      trackingMode: true,
      member: {
        select: {
          defaultTrackingMode: true,
        },
      },
    },
  });

  if (assignment && resolveTrackingMode(assignment.member, assignment).mode !== "TRACKED") {
    throw new TimeTrackingError(
      "This project declares its hours monthly.",
      "PROJECT_DECLARES_MONTHLY",
    );
  }
}

function isTrackedAssignment(assignment: AssignmentForMutation) {
  return resolveTrackingMode(assignment.member, assignment).mode === "TRACKED";
}

/**
 * The double-count guard, on the ordinary side.
 *
 * A declared assignment may not have ordinary time entries and a tracked assignment may not have a
 * declaration — enforced on **both** write paths, because without it a hybrid month reports the
 * same hours twice. This is the ordinary half; `declarations.ts` holds the other. Placing it in the
 * assignment finders rather than in each mutation is what makes it total: every create, update,
 * timer and copy resolves an assignment through one of the three.
 */
function assertAssignmentIsTracked(assignment: AssignmentForMutation) {
  if (!isTrackedAssignment(assignment)) {
    throw new TimeTrackingError(
      "This project declares its hours monthly.",
      "PROJECT_DECLARES_MONTHLY",
    );
  }
}

/**
 * A declared entry is corrected at L4 and nowhere else.
 *
 * L1-L3 never receive one — `getMemberWeeklyTimeGrid` excludes it at the query — but these two
 * mutations take an id from the client, so the id of an entry the client was never shown is still
 * reachable. Editing one through the ordinary path would leave its `MonthlyHourDeclaration` stating
 * a figure the entry no longer holds; soft-deleting one would leave a declaration pointing at a
 * deleted entry, silently zeroing the month while the declared band still showed the hours.
 */
function assertEntryIsNotDeclared(source: TimeEntrySource) {
  if (source === "DECLARED") {
    throw new TimeTrackingError(
      "Declared hours are corrected on the month level.",
      "ENTRY_IS_DECLARED",
    );
  }
}

async function findAssignmentForDate(
  tx: TimeTrackingTransaction,
  input: {
    memberId: string;
    projectId: string;
    localDate: Date;
  },
): Promise<AssignmentForMutation> {
  const assignment = await tx.projectAssignment.findFirst({
    where: {
      memberId: input.memberId,
      projectId: input.projectId,
      active: true,
      validFrom: {
        lte: input.localDate,
      },
      OR: [{ validTo: null }, { validTo: { gte: input.localDate } }],
      project: {
        deletedAt: null,
        status: "ACTIVE",
        AND: [
          { OR: [{ startsOn: null }, { startsOn: { lte: input.localDate } }] },
          { OR: [{ endsOn: null }, { endsOn: { gte: input.localDate } }] },
        ],
      },
    },
    orderBy: {
      validFrom: "desc",
    },
    select: assignmentForMutationSelect,
  });

  if (!assignment) {
    throw new TimeTrackingError(
      "This project is not active for the selected date.",
      "PROJECT_NOT_AVAILABLE",
    );
  }

  assertAssignmentIsTracked(assignment);

  return assignment;
}

async function findOptionalAssignmentForDate(
  tx: TimeTrackingTransaction,
  input: {
    memberId: string;
    projectId: string;
    localDate: Date;
  },
): Promise<AssignmentForMutation | null> {
  const assignment = await tx.projectAssignment.findFirst({
    where: {
      memberId: input.memberId,
      projectId: input.projectId,
      active: true,
      validFrom: {
        lte: input.localDate,
      },
      OR: [{ validTo: null }, { validTo: { gte: input.localDate } }],
      project: {
        deletedAt: null,
        status: "ACTIVE",
        AND: [
          { OR: [{ startsOn: null }, { startsOn: { lte: input.localDate } }] },
          { OR: [{ endsOn: null }, { endsOn: { gte: input.localDate } }] },
        ],
      },
    },
    orderBy: {
      validFrom: "desc",
    },
    select: assignmentForMutationSelect,
  });

  /* A copy skips what it cannot write rather than failing the whole batch, which is what it
     already does for a project whose assignment has ended — so a declared assignment is skipped
     here rather than throwing. */
  return assignment && isTrackedAssignment(assignment) ? assignment : null;
}

async function findAssignmentForWeek(
  tx: TimeTrackingTransaction,
  input: {
    memberId: string;
    projectId: string;
    weekStartDate: Date;
    weekEndDate: Date;
  },
) {
  const assignment = await tx.projectAssignment.findFirst({
    where: {
      memberId: input.memberId,
      projectId: input.projectId,
      active: true,
      validFrom: {
        lte: input.weekEndDate,
      },
      OR: [{ validTo: null }, { validTo: { gte: input.weekStartDate } }],
      project: {
        deletedAt: null,
        status: "ACTIVE",
      },
    },
    select: assignmentForMutationSelect,
  });

  if (!assignment) {
    throw new TimeTrackingError(
      "This project is not assigned for the selected week.",
      "PROJECT_NOT_ASSIGNED_FOR_WEEK",
    );
  }

  // §4 item 4: an `InactiveProjectWeek` says "nothing happened on this project this week", which
  // is meaningless for a project whose hours arrive once a month. Not offered, and not accepted.
  assertAssignmentIsTracked(assignment);

  return assignment;
}

async function getMemberTimezone(tx: TimeTrackingTransaction, memberId: string) {
  const member = await tx.member.findUnique({
    where: {
      id: memberId,
    },
    select: {
      timezone: true,
    },
  });

  return member?.timezone ?? "Europe/Budapest";
}

function mapTimeEntry(entry: EntryRecord): TimeGridEntry {
  return {
    id: entry.id,
    projectId: entry.projectId,
    projectAssignmentId: entry.projectAssignmentId,
    localDate: formatDateOnly(entry.localDate),
    durationMinutes: entry.durationMinutes,
    description: entry.description,
    source: entry.source,
    startedAt: entry.startedAt?.toISOString() ?? null,
    endedAt: entry.endedAt?.toISOString() ?? null,
    startTime: entry.startedAt ? formatTimeInTimezone(entry.startedAt, entry.timezone) : null,
    endTime: entry.endedAt ? formatTimeInTimezone(entry.endedAt, entry.timezone) : null,
    locked: Boolean(entry.lockedByTimesheetRevisionId),
    updatedAt: entry.updatedAt.toISOString(),
    adminModification:
      entry.adminModifiedAt && entry.adminModificationReason
        ? {
            modifiedAt: entry.adminModifiedAt.toISOString(),
            modifiedByName: entry.adminModifiedBy?.displayName ?? null,
            reason: entry.adminModificationReason,
            timezone: entry.timezone,
          }
        : null,
  };
}

function mapRunningTimer(timer: RunningTimerRecord): RunningTimerView {
  const colorToken = isProjectColorToken(timer.projectAssignment.project.colorToken)
    ? timer.projectAssignment.project.colorToken
    : "teal";

  return {
    id: timer.id,
    projectId: timer.projectId,
    projectAssignmentId: timer.projectAssignmentId,
    projectName: timer.projectAssignment.project.name,
    projectColor: projectColorValues[colorToken],
    description: timer.description,
    startedAt: timer.startedAt.toISOString(),
  };
}

function mapTimeEntryDraft(
  draft: {
    draftKey: string;
    payload: Prisma.JsonValue;
    updatedAt: Date;
  } | null,
): TimeEntryDraftView | null {
  if (!draft || !isTimeEntryDraftPayload(draft.payload)) return null;

  return {
    draftKey: draft.draftKey,
    payload: draft.payload,
    updatedAt: draft.updatedAt.toISOString(),
  };
}

function serializeTimeEntryForAudit(entry: {
  projectId: string;
  projectAssignmentId: string;
  localDate: Date;
  durationMinutes: number;
  description: string;
  startedAt?: Date | null;
  endedAt?: Date | null;
}) {
  return {
    projectId: entry.projectId,
    projectAssignmentId: entry.projectAssignmentId,
    localDate: formatDateOnly(entry.localDate),
    durationMinutes: entry.durationMinutes,
    description: entry.description,
    startedAt: entry.startedAt?.toISOString() ?? null,
    endedAt: entry.endedAt?.toISOString() ?? null,
  };
}

function isTimeEntryDraftPayload(value: Prisma.JsonValue): value is TimeEntryDraftPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const record = value as Record<string, unknown>;

  return (
    record.kind === "time-entry-form" &&
    record.version === 1 &&
    (record.source === "GRID" || record.source === "FORM") &&
    typeof record.projectId === "string" &&
    typeof record.localDate === "string" &&
    (record.timingMode === "DURATION" || record.timingMode === "INTERVAL") &&
    typeof record.durationText === "string" &&
    typeof record.startTime === "string" &&
    typeof record.endTime === "string" &&
    typeof record.description === "string" &&
    (record.prefill === undefined || typeof record.prefill === "boolean")
  );
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

type TimeTrackingTransaction = Prisma.TransactionClient;
