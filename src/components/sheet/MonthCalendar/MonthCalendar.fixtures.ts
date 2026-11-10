import type {
  MonthCalendarData,
  MonthCalendarDay,
  MonthCalendarEntry,
  MonthCalendarWeek,
} from "./MonthCalendar.types";

/** Deterministic sample months for stories and tests, laid out like `getMemberMonthCalendar`. */

const projects = [
  { projectId: "atlas", projectName: "Atlas Platform", projectColor: "#37e3de" },
  { projectId: "nimbus", projectName: "Nimbus", projectColor: "#c1b1f9" },
  { projectId: "support", projectName: "Client Support", projectColor: "#ff6a7e" },
  { projectId: "ops", projectName: "Internal Ops", projectColor: "#faab59" },
];

const descriptions = [
  "Property search filters",
  "Sprint planning",
  "Review PR #214 — rate limiter for the permit API",
  "Map layer performance",
  "Nimbus sync job",
  "Staging deploy",
  "API pagination for permits",
  "Schema review call",
  "Fix flaky e2e on CI",
  "Ticket triage",
];

const longProject = {
  projectId: "kovacs",
  projectName: "Kovács-Szentgyörgyi Ingatlankezelő és Vagyongazdálkodó Kft. — belső rendszerek",
  projectColor: "#5ce08c",
};

const longDescriptions = [
  "Customer call — onboarding Kovács-Szentgyörgyi Ingatlankezelő Kft. with the full migration checklist",
  "Platform migration support (Postgres 18 cutover, read replicas, connection pooling, failover drills)",
  "Supercalifragilisticexpialidocious-unbreakable-identifier-without-any-spaces-at-all",
];

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isoWeek(isoDate: string) {
  const instant = new Date(`${isoDate}T00:00:00.000Z`);
  instant.setUTCDate(instant.getUTCDate() - ((instant.getUTCDay() + 6) % 7) + 3);
  const yearStart = new Date(Date.UTC(instant.getUTCFullYear(), 0, 4));
  yearStart.setUTCDate(yearStart.getUTCDate() - ((yearStart.getUTCDay() + 6) % 7));
  return 1 + Math.round((instant.getTime() - yearStart.getTime()) / 604_800_000);
}

/** A tiny seeded PRNG so every render of a fixture is identical. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

export type FixtureOptions = {
  monthStart: string;
  todayIso: string;
  /** Leave the month blank. */
  empty?: boolean;
  /** Use very long descriptions and project names. */
  long?: boolean;
  leaveDates?: string[];
  lockedMonthStarts?: string[];
  /** Workdays left blank, to show "nothing logged". */
  gaps?: string[];
  seed?: number;
};

export function buildFixtureCalendar(options: FixtureOptions): MonthCalendarData {
  const random = seeded(options.seed ?? 7);
  const monthKey = options.monthStart.slice(0, 7);
  const first = new Date(`${options.monthStart}T00:00:00.000Z`);
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
  const gridStart = addDays(options.monthStart, -((first.getUTCDay() + 6) % 7));
  const lastIso = last.toISOString().slice(0, 10);
  const gridEnd = addDays(lastIso, 6 - ((last.getUTCDay() + 6) % 7));

  const weeks: MonthCalendarWeek[] = [];
  let totalMinutes = 0;

  for (let weekStart = gridStart; weekStart <= gridEnd; weekStart = addDays(weekStart, 7)) {
    const days = Array.from({ length: 7 }, (_, index): MonthCalendarDay => {
      const isoDate = addDays(weekStart, index);
      const isWeekend = index >= 5;
      const isFuture = isoDate > options.todayIso;
      const onLeave = options.leaveDates?.includes(isoDate) ?? false;
      const blank =
        options.empty ||
        isFuture ||
        onLeave ||
        options.gaps?.includes(isoDate) ||
        (isWeekend && random() > 0.3);
      const count = blank ? 0 : isWeekend ? 1 : 2 + Math.floor(random() * 5);
      const entries: MonthCalendarEntry[] = Array.from({ length: count }, (_, entryIndex) => {
        const project =
          options.long && entryIndex % 2 === 0 ? longProject : projects[entryIndex % 4]!;
        const description = options.long
          ? longDescriptions[(entryIndex + index) % longDescriptions.length]!
          : descriptions[Math.floor(random() * descriptions.length)]!;
        return {
          id: `${isoDate}-${entryIndex}`,
          description,
          ...project,
          durationMinutes: 30 * (1 + Math.floor(random() * 5)),
          startTime: `${String(9 + entryIndex).padStart(2, "0")}:00`,
        };
      });
      const dayMinutes = entries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
      const inMonth = isoDate.startsWith(monthKey);
      if (inMonth) totalMinutes += dayMinutes;

      return {
        isoDate,
        inMonth,
        isToday: isoDate === options.todayIso,
        isFuture,
        isWeekend,
        locked: options.lockedMonthStarts?.includes(`${isoDate.slice(0, 7)}-01`) ?? false,
        onLeave,
        totalMinutes: dayMinutes,
        entries,
      };
    });

    weeks.push({
      weekStart,
      isoWeek: isoWeek(weekStart),
      totalMinutes: days.reduce((sum, day) => sum + day.totalMinutes, 0),
      days,
    });
  }

  return {
    monthStart: options.monthStart,
    todayIso: options.todayIso,
    timezone: "Europe/Budapest",
    totalMinutes,
    weeks,
  };
}

/** The mockup's month: November 2026 starts on a Sunday, so it spans six rows. */
export const currentMonth = buildFixtureCalendar({
  monthStart: "2026-11-01",
  todayIso: "2026-11-10",
  gaps: ["2026-11-02"],
  leaveDates: [],
  lockedMonthStarts: ["2026-10-01"],
});

export const previousMonth = buildFixtureCalendar({
  monthStart: "2026-10-01",
  todayIso: "2026-11-10",
  leaveDates: ["2026-10-22", "2026-10-23"],
  lockedMonthStarts: ["2026-10-01"],
  seed: 3,
});

export const septemberMonth = buildFixtureCalendar({
  monthStart: "2026-09-01",
  todayIso: "2026-11-10",
  gaps: ["2026-09-14"],
  lockedMonthStarts: ["2026-09-01", "2026-10-01"],
  seed: 11,
});

/** March 2026 starts on a Sunday as well — six rows, all of them in the past. */
export const sundayStartMonth = buildFixtureCalendar({
  monthStart: "2026-03-01",
  todayIso: "2026-11-10",
  seed: 5,
});

export const emptyMonth = buildFixtureCalendar({
  monthStart: "2026-11-01",
  todayIso: "2026-11-10",
  empty: true,
});

export const longTextMonth = buildFixtureCalendar({
  monthStart: "2026-11-01",
  todayIso: "2026-11-10",
  long: true,
  leaveDates: ["2026-11-05"],
});
