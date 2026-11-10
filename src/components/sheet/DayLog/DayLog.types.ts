import type { ReactNode } from "react";

import type { DurationDisplayFormat } from "@/src/lib/formatting";

export type DayLogEntry = {
  id: string;
  description: string;
  projectName: string;
  projectColor: string;
  /** `HH:mm`, or `null` for a duration-only entry, which shows `—`. */
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number;
  /** A submitted timesheet holds it: no edit, no delete — continue still works. */
  locked: boolean;
};

export type DayLogDay = {
  isoDate: string;
  /** `Tue, Nov 10` */
  label: string;
  /** `Tuesday, November 10, 2026` — the region's accessible name. */
  fullLabel: string;
  today: boolean;
  weekend: boolean;
  locked: boolean;
  onLeave: boolean;
  totalMinutes: number;
  entries: DayLogEntry[];
};

export type DayLogWeek = {
  weekStart: string;
  /** `Week 46 · Nov 9 – 15` */
  heading: string;
  totalMinutes: number;
  days: DayLogDay[];
};

export type DayLogRunningTimer = {
  description: string;
  projectName: string;
  projectColor: string;
  /** `13:15` */
  startTime: string;
  elapsedLabel: string;
};

export type DayLogLabels = {
  today: string;
  /** `Add entry on Tuesday, November 10, 2026` */
  addEntry: (day: DayLogDay) => string;
  /** `8 h target`-style read-out for the day bar. */
  progress: (day: DayLogDay) => string;
  edit: (entry: DayLogEntry) => string;
  delete: (entry: DayLogEntry) => string;
  continue: (entry: DayLogEntry) => string;
  more: (entry: DayLogEntry) => string;
  locked: string;
  onLeave: string;
  nothingLogged: string;
  nothingLoggedWorkday: string;
  nothingLoggedToday: string;
  now: string;
  stopTimer: string;
  running: string;
  loadEarlier: string;
  loadingEarlier: string;
  empty: string;
};

export type DayLogProps = {
  weeks: readonly DayLogWeek[];
  /** Shown as the first row of today, when today is in the log. */
  runningTimer?: DayLogRunningTimer | null;
  capacityMinutes: number;
  locale: string;
  durationDisplayFormat: DurationDisplayFormat;
  labels: DayLogLabels;
  /** Above the first week: the composer, the declared-projects line. */
  header?: ReactNode;
  disabled?: boolean;
  /** Earlier weeks exist; the end of the log offers them and loads them when scrolled into view. */
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  onAddEntry: (day: DayLogDay) => void;
  onEditEntry: (entry: DayLogEntry) => void;
  onDeleteEntry: (entry: DayLogEntry) => void;
  onContinueEntry: (entry: DayLogEntry) => void;
  onStopTimer: () => void;
};
