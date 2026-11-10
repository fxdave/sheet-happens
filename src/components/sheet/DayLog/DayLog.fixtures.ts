import type { DayLogDay, DayLogEntry, DayLogLabels, DayLogWeek } from "./DayLog.types";

/** Shared by the stories and the tests: the mockup's two weeks around Tue, Nov 10, 2026. */
const atlas = { projectName: "Atlas Platform", projectColor: "#1f7a78" };
const nimbus = { projectName: "Nimbus", projectColor: "#7b5ea7" };
const support = { projectName: "Client Support", projectColor: "#b8475a" };
const ops = { projectName: "Internal Ops & Tooling", projectColor: "#c07a1c" };

let sequence = 0;

export function logEntry(
  description: string,
  project: { projectName: string; projectColor: string },
  startTime: string | null,
  endTime: string | null,
  durationMinutes: number,
  locked = false,
): DayLogEntry {
  sequence += 1;
  return {
    id: `entry-${sequence}`,
    description,
    ...project,
    startTime,
    endTime,
    durationMinutes,
    locked,
  };
}

function day(
  isoDate: string,
  label: string,
  fullLabel: string,
  entries: DayLogEntry[],
  overrides: Partial<DayLogDay> = {},
): DayLogDay {
  const weekday = new Date(`${isoDate}T00:00:00.000Z`).getUTCDay();

  return {
    isoDate,
    label,
    fullLabel,
    today: false,
    weekend: weekday === 0 || weekday === 6,
    locked: false,
    onLeave: false,
    totalMinutes: entries.reduce((sum, entry) => sum + entry.durationMinutes, 0),
    entries,
    ...overrides,
  };
}

function week(weekStart: string, heading: string, days: DayLogDay[]): DayLogWeek {
  return {
    weekStart,
    heading,
    totalMinutes: days.reduce((sum, item) => sum + item.totalMinutes, 0),
    days,
  };
}

export const LONG_DESCRIPTION =
  "Customer call — onboarding Kovács-Szentgyörgyi Ingatlankezelő Kft. about the quarterly reconciliation of permit backfills and the APN bridge rollout";
export const LONG_PROJECT = {
  projectName: "Kovács-Szentgyörgyi Ingatlankezelő és Vagyonkezelő Kft.",
  projectColor: "#b8475a",
};

export const dayLogWeeks: DayLogWeek[] = [
  week("2026-11-09", "Week 46 · Nov 9 – 15", [
    day(
      "2026-11-10",
      "Tue, Nov 10",
      "Tuesday, November 10, 2026",
      [
        logEntry("Nimbus sync job", nimbus, "11:00", "12:30", 90),
        logEntry("Property search filters", atlas, "09:00", "11:00", 120),
      ],
      { today: true },
    ),
    day("2026-11-09", "Mon, Nov 9", "Monday, November 9, 2026", [
      logEntry("Sprint planning", atlas, "17:00", "17:30", 30),
      logEntry(LONG_DESCRIPTION, support, "16:00", "17:00", 60),
      logEntry("Schema review call", nimbus, null, null, 30),
      logEntry("API pagination for permits", atlas, "09:30", "12:00", 150),
      logEntry("Staging deploy", LONG_PROJECT, "08:30", "09:30", 60),
    ]),
  ]),
  week("2026-11-02", "Week 45 · Nov 2 – 8", [
    day("2026-11-08", "Sun, Nov 8", "Sunday, November 8, 2026", []),
    day("2026-11-07", "Sat, Nov 7", "Saturday, November 7, 2026", []),
    day("2026-11-06", "Fri, Nov 6", "Friday, November 6, 2026", [
      logEntry("Staging deploy", ops, "12:00", "14:30", 150),
      logEntry("Platform migration support (Postgres 18 cutover)", nimbus, "08:30", "11:30", 180),
    ]),
    day("2026-11-05", "Thu, Nov 5", "Thursday, November 5, 2026", [], { onLeave: true }),
    day("2026-11-04", "Wed, Nov 4", "Wednesday, November 4, 2026", [
      logEntry("Fix flaky e2e on CI", atlas, "10:00", "12:00", 120),
    ]),
    day("2026-11-03", "Tue, Nov 3", "Tuesday, November 3, 2026", [
      {
        ...logEntry("Map layer performance", atlas, "09:00", "18:30", 570),
        adminModified: true,
        warnings: ["Long continuous session"],
      },
    ]),
    day("2026-11-02", "Mon, Nov 2", "Monday, November 2, 2026", []),
  ]),
];

/** The same fortnight inside a submitted month: every entry read-only. */
export const lockedDayLogWeeks: DayLogWeek[] = dayLogWeeks.map((item) => ({
  ...item,
  days: item.days.map((entryDay) => ({
    ...entryDay,
    locked: true,
    entries: entryDay.entries.map((entry) => ({ ...entry, locked: true })),
  })),
}));

export const dayLogRunningTimer = {
  description: "Map layer performance",
  projectName: "Atlas Platform",
  projectColor: "#1f7a78",
  startTime: "13:15",
  elapsedLabel: "1:12:40",
};

export const dayLogLabels: DayLogLabels = {
  today: "Today",
  addEntry: (item) => `Add entry on ${item.fullLabel}`,
  progress: (item) => `${item.totalMinutes / 60} h of 8 h`,
  edit: (entry) => `Edit ${entry.description}`,
  delete: (entry) => `Delete ${entry.description}`,
  continue: (entry) => `Continue ${entry.description}`,
  more: (entry) => `More actions for ${entry.description}`,
  locked: "Locked by a submitted timesheet",
  adminModified: "Changed by an administrator",
  onLeave: "On leave",
  nothingLogged: "Nothing logged",
  nothingLoggedWorkday: "Nothing logged on a workday",
  nothingLoggedToday: "Nothing logged yet today",
  now: "now",
  stopTimer: "Stop timer",
  running: "Running now",
  loadEarlier: "Scroll for earlier weeks",
  loadingEarlier: "Loading earlier days…",
  empty: "Nothing to show yet.",
};
