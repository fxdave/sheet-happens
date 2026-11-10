import type { DurationDisplayFormat } from "@/src/lib/formatting";

/* Structurally the `MemberMonthCalendar` that `getMemberMonthCalendar` returns, restated here so
   the component never imports from `src/server`. */

export type MonthCalendarEntry = {
  id: string;
  description: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  durationMinutes: number;
  startTime: string | null;
};

export type MonthCalendarDay = {
  isoDate: string;
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  isWeekend: boolean;
  locked: boolean;
  onLeave: boolean;
  totalMinutes: number;
  entries: MonthCalendarEntry[];
};

export type MonthCalendarWeek = {
  weekStart: string;
  isoWeek: number;
  totalMinutes: number;
  days: MonthCalendarDay[];
};

export type MonthCalendarData = {
  monthStart: string;
  todayIso: string;
  timezone: string;
  totalMinutes: number;
  weeks: MonthCalendarWeek[];
  /** Whether anything was logged before the grid's first Monday. */
  hasEarlier?: boolean;
};

/** `grid` is the 7-column month (≥ 768px); `list` is the phone's newest-first list of weeks. */
export type MonthCalendarLayout = "grid" | "list";

export type MonthCalendarProps = {
  calendar: MonthCalendarData;
  /** List layout only: months loaded through `onReachEnd`, merged below `calendar`. */
  earlierCalendars?: readonly MonthCalendarData[];
  durationDisplayFormat: DurationDisplayFormat;
  locale: string;
  /** Omit to follow the viewport in CSS: `grid` from 768px (`md`) up, `list` below. */
  layout?: MonthCalendarLayout;
  onSelectDay: (isoDate: string) => void;
  /** List layout: the bottom sentinel came into view; load earlier weeks. */
  onReachEnd?: () => void;
  loadingMore?: boolean;
  /** List layout: `false` once there is nothing earlier to load. Defaults to `true`. */
  hasMore?: boolean;
  className?: string;
};
