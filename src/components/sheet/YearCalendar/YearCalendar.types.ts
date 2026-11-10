import type { DurationDisplayFormat } from "@/src/lib/formatting";

import type { TimesheetStatus } from "../StatusPill";

/** Persisted timesheet statuses; the derived ones (`not_created`, `missing`) never arrive here. */
export type YearCalendarTimesheetStatus = Exclude<TimesheetStatus, "not_created" | "missing">;

export type YearCalendarMonth = {
  /** `YYYY-MM-01`. */
  monthStart: string;
  trackedMinutes: number;
  declaredMinutes: number;
  totalMinutes: number;
  declared: { projectName: string; minutes: number }[];
  timesheetStatus: YearCalendarTimesheetStatus | null;
  locked: boolean;
};

/** Structurally the server's `MemberYearOverview`, so the query result can be passed straight in. */
export type YearCalendarOverview = {
  year: number;
  /** The member's local today, `YYYY-MM-DD`. */
  todayIso: string;
  /** Contractors get an "Open" badge on current and past months that have no timesheet yet. */
  profile: "CONTRACTOR" | "EMPLOYEE";
  totalMinutes: number;
  /** Tracked minutes per day; days without any may be omitted. */
  days: { isoDate: string; minutes: number }[];
  leaveDays?: { isoDate: string; dayPart: "FULL" | "MORNING" | "AFTERNOON" }[];
  /** Twelve months, January first. */
  months: YearCalendarMonth[];
};

/** `0` nothing, then `< 4 h`, `4–8 h`, `8–10 h` and `> 10 h`. */
export type HourLevel = 0 | 1 | 2 | 3 | 4;

export type MonthTiming = "past" | "current" | "future";

export type DayTiming = "past" | "today" | "future";

export type YearCalendarDay = {
  isoDate: string;
  dayNumber: number;
  minutes: number;
  level: HourLevel;
  weekend: boolean;
  timing: DayTiming;
  leave: "FULL" | "MORNING" | "AFTERNOON" | null;
};

export type MonthBadge =
  { kind: "status"; status: YearCalendarTimesheetStatus } | { kind: "open" } | null;

export type YearCalendarProps = {
  /** Newest year first; each later entry is stacked below with its own heading. */
  years: YearCalendarOverview[];
  durationDisplayFormat: DurationDisplayFormat;
  locale: string;
  onSelectMonth: (monthStart: string) => void;
  onSelectDay: (isoDate: string) => void;
  /** Called when the end of the stack scrolls into view. Omit when there is nothing older. */
  onReachEnd?: () => void;
  loadingMore?: boolean;
  className?: string;
};
