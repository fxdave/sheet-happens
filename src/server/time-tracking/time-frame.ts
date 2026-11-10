import {
  formatDateOnly,
  getMonday,
  getTodayIsoInTimezone,
  getWeekEnd,
  parseDateOnly,
} from "./dates";
import {
  loadTrackingMember,
  loadTrackingRangeContext,
  type RunningTimerView,
  type TimeEntryDraftView,
  type TimeGridAssignedProject,
} from "./time-entries";
import type { DescriptionSuggestion } from "./description-suggestions";

/**
 * What the `/time` frame needs whatever view is open: assignments, the timer, the draft, the
 * suggestions and the locks around the anchor. No entries — each view loads its own.
 */
export type MemberTimeFrame = {
  memberId: string;
  timezone: string;
  todayIso: string;
  /** The ISO week holding the anchor: the range the assignments and locks are read over. */
  weekStart: string;
  weekEnd: string;
  lockedMonthStarts: string[];
  projects: TimeGridAssignedProject[];
  recentProjects: TimeGridAssignedProject[];
  runningTimer: RunningTimerView | null;
  entryDraft: TimeEntryDraftView | null;
  descriptionSuggestions: DescriptionSuggestion[];
};

export async function getMemberTimeFrame(input: {
  memberId: string;
  anchor?: Date | null;
  now?: Date;
}): Promise<MemberTimeFrame> {
  const member = await loadTrackingMember(input.memberId);
  const todayIso = getTodayIsoInTimezone(member.timezone, input.now);
  const weekStart = getMonday(input.anchor ?? parseDateOnly(todayIso));
  const weekEnd = getWeekEnd(weekStart);
  const context = await loadTrackingRangeContext({ member, from: weekStart, to: weekEnd });

  return {
    memberId: member.id,
    timezone: member.timezone,
    todayIso,
    weekStart: formatDateOnly(weekStart),
    weekEnd: formatDateOnly(weekEnd),
    lockedMonthStarts: [...context.lockedMonthStarts],
    projects: context.projects,
    recentProjects: context.recentProjects,
    runningTimer: context.runningTimer,
    entryDraft: context.entryDraft,
    descriptionSuggestions: context.descriptionSuggestions,
  };
}
