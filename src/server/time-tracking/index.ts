export {
  copyPreviousDayEntries,
  createTimeEntry,
  deleteTimeEntry,
  deleteTimeEntryDraft,
  duplicatePreviousWeek,
  getMemberWeeklyTimeGrid,
  getRunningTimerForMember,
  markInactiveProjectWeek,
  restoreTimeEntry,
  saveTimeEntryDraft,
  startRunningTimer,
  stopRunningTimer,
  switchRunningTimer,
  TimeTrackingError,
  unmarkInactiveProjectWeek,
  updateTimeEntry,
} from "./time-entries";
export type {
  CopyPreviousDayEntriesInput,
  CopyTimeEntriesResult,
  DeleteTimeEntryDraftInput,
  DuplicatePreviousWeekInput,
  InactiveProjectWeekInput,
  InactiveProjectWeekRow,
  RunningTimerView,
  SaveTimeEntryDraftInput,
  TimeEntryDraftPayload,
  TimeEntryDraftView,
  TimeEntryDeleteInput,
  TimeEntryMutationInput,
  TimeEntryRestoreInput,
  TimeEntrySource,
  TimeEntryUpdateInput,
  TimeGridAssignedProject,
  TimeGridEntry,
  TimeGridWeek,
  TimeTrackingErrorCode,
  TimeTrackingRequestMetadata,
} from "./time-entries";
export { getMemberTimeFrame } from "./time-frame";
export type { MemberTimeFrame } from "./time-frame";
export { buildTimeDaysWeeks, getMemberTimeDays, TIME_DAYS_PAGE_WEEKS } from "./time-days";
export type { MemberTimeDays, TimeDaysDay, TimeDaysWeek } from "./time-days";
export {
  buildDescriptionSuggestions,
  loadDescriptionSuggestionRows,
  MCP_SUGGESTIONS_PER_PROJECT,
  scoreSuggestion,
  SUGGESTION_HALF_LIFE_DAYS,
  SUGGESTION_LOOKBACK_DAYS,
  SUGGESTION_TEXT_MAX_LENGTH,
  SUGGESTIONS_PER_PAYLOAD,
  SUGGESTIONS_PER_PROJECT,
} from "./description-suggestions";
export type {
  BuildDescriptionSuggestionsInput,
  DescriptionSuggestion,
  DescriptionSuggestionClient,
  DescriptionSuggestionRow,
} from "./description-suggestions";
export { buildDeclaredHoursRoster, listDeclaredHoursForMonth } from "./admin-declarations";
export type {
  AdminDeclaredHoursAssignment,
  AdminDeclaredHoursCorrection,
  AdminDeclaredHoursDeclarationRow,
  AdminDeclaredHoursMonth,
  AdminDeclaredHoursProof,
  AdminDeclaredHoursRow,
  BuildDeclaredHoursRosterInput,
} from "./admin-declarations";
export { buildMonthOverview, getMemberMonthOverview } from "./month-overview";
export type {
  BuildMonthOverviewInput,
  MemberMonthOverview,
  MonthOverviewAssignment,
  MonthOverviewDayTotal,
  MonthOverviewDeclaration,
  MonthOverviewDeclarationProof,
  MonthOverviewDeclarationRow,
  MonthOverviewProject,
} from "./month-overview";
export { buildMonthCalendar, getMemberMonthCalendar } from "./month-calendar";
export type {
  BuildMonthCalendarInput,
  MemberMonthCalendar,
  MonthCalendarDay,
  MonthCalendarEntry,
  MonthCalendarEntryRow,
  MonthCalendarWeek,
} from "./month-calendar";
export { buildYearOverview, getMemberYearOverview, yearMonthStarts } from "./year-overview";
export type {
  BuildYearOverviewInput,
  MemberYearOverview,
  YearOverviewClient,
  YearOverviewDeclared,
  YearOverviewLeaveDay,
  YearOverviewMonth,
  YearOverviewProfile,
  YearOverviewTimesheetStatus,
} from "./year-overview";
export {
  buildHoursProofObjectKey,
  DeclarationError,
  deleteMonthlyHourDeclaration,
  HOURS_PROOF_MAX_BYTES,
  isDeclarationImplausible,
  resolveDeclarationSanityLimit,
  saveMonthlyHourDeclaration,
  uploadDeclarationProof,
  validateHoursProofFile,
} from "./declarations";
export type {
  DeclarationErrorCode,
  DeclarationProofFileInput,
  DeleteMonthlyHourDeclarationInput,
  SaveMonthlyHourDeclarationInput,
  SaveMonthlyHourDeclarationResult,
  UploadDeclarationProofInput,
} from "./declarations";
/*
 * `shell-timer` is deliberately NOT re-exported here. It reaches into `src/server/auth/app-access`
 * for the current request's member, so re-exporting it made this barrel pull the whole Better Auth
 * instance — and, since the OAuth provider seeds its resource row during plugin init, a database
 * write — into every module that wanted a date helper. Import it from
 * `@/src/server/time-tracking/shell-timer` instead; `app/layout.tsx` is its only caller.
 */
export {
  assertTrackingModeSwitchAllowed,
  collectTrackingModeConflicts,
  findInheritingAssignmentIds,
  findTrackingModeConflicts,
  resolveTrackingMode,
  TrackingModeSwitchError,
} from "./tracking-mode";
export type {
  ResolvedTrackingMode,
  TrackingMode,
  TrackingModeAssignment,
  TrackingModeAssignmentClient,
  TrackingModeConflict,
  TrackingModeConflictClient,
  TrackingModeConflictKind,
  TrackingModeMember,
  TrackingModeMonthData,
  TrackingModeSource,
} from "./tracking-mode";
export {
  addDays,
  buildWeekDays,
  formatDateOnly,
  formatWeekRange,
  getMonday,
  getMonthEnd,
  getMonthStart,
  getMonthStartsInRange,
  getTodayIsoInTimezone,
  getWeekEnd,
  normalizeDateOnly,
  parseDateOnly,
  TimeTrackingDateError,
} from "./dates";
export type { TimeGridDay, TimeGridDayState, TimeTrackingDateErrorCode } from "./dates";
export {
  buildAssignedProjectWhere,
  loadAssignedProjects,
  loadLockedMonthStarts,
  mapAssignedProject,
} from "./assignments";
export type { AssignedProjectRecord } from "./assignments";
export { getMemberTrackingContext } from "./context";
export type {
  MemberTrackingContext,
  MemberTrackingContextProject,
  TrackingContextClient,
} from "./context";
export { getMemberTimeEntry, listMemberTimeEntries } from "./queries";
export type {
  ListMemberTimeEntriesResult,
  MemberTimeEntryRow,
  TimeEntryQueryClient,
} from "./queries";
export { summarizeMemberTime } from "./summary";
export type {
  MemberTimeSummary,
  MemberTimeSummaryDay,
  MemberTimeSummaryProject,
  TimeSummaryClient,
} from "./summary";
