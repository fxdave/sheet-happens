import type {
  YearCalendarMonth,
  YearCalendarOverview,
  YearCalendarTimesheetStatus,
} from "./YearCalendar.types";

/** Deterministic weekday hours, so stories and tests render the same year every time. */
const PATTERN = [480, 450, 510, 0, 390, 480, 210, 540, 480, 300, 480, 465];

export function buildYearFixture(input: {
  year: number;
  todayIso: string;
  profile?: YearCalendarOverview["profile"];
  statuses?: Partial<Record<number, YearCalendarTimesheetStatus>>;
  declared?: Partial<Record<number, YearCalendarMonth["declared"]>>;
  overrides?: Record<string, number>;
  empty?: boolean;
  leaveDays?: YearCalendarOverview["leaveDays"];
}): YearCalendarOverview {
  const days: YearCalendarOverview["days"] = [];
  let seed = 0;

  for (
    let date = new Date(Date.UTC(input.year, 0, 1));
    date.getUTCFullYear() === input.year;
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    const isoDate = date.toISOString().slice(0, 10);
    if (input.empty || isoDate > input.todayIso) continue;

    const weekday = date.getUTCDay();
    const override = input.overrides?.[isoDate];
    const minutes =
      override ?? (weekday === 0 || weekday === 6 ? 0 : PATTERN[seed++ % PATTERN.length]!);
    if (minutes > 0) days.push({ isoDate, minutes });
  }

  const months = Array.from({ length: 12 }, (_, index): YearCalendarMonth => {
    const prefix = `${input.year}-${String(index + 1).padStart(2, "0")}`;
    const trackedMinutes = days
      .filter((day) => day.isoDate.startsWith(prefix))
      .reduce((total, day) => total + day.minutes, 0);
    const declared = input.declared?.[index] ?? [];
    const declaredMinutes = declared.reduce((total, row) => total + row.minutes, 0);
    const timesheetStatus = input.statuses?.[index] ?? null;

    return {
      monthStart: `${prefix}-01`,
      trackedMinutes,
      declaredMinutes,
      totalMinutes: trackedMinutes + declaredMinutes,
      declared,
      timesheetStatus,
      locked: timesheetStatus !== null && timesheetStatus !== "rejected",
    };
  });

  return {
    year: input.year,
    todayIso: input.todayIso,
    profile: input.profile ?? "CONTRACTOR",
    totalMinutes: months.reduce((total, month) => total + month.totalMinutes, 0),
    days,
    leaveDays: input.leaveDays ?? [],
    months,
  };
}

/** 2026 seen from 2026-11-10: paid through August, then the newer statuses, November open. */
export const currentYear = buildYearFixture({
  year: 2026,
  todayIso: "2026-11-10",
  statuses: {
    0: "paid",
    1: "paid",
    2: "paid",
    3: "paid",
    4: "paid",
    5: "paid",
    6: "accepted",
    7: "invoiced",
    8: "approved",
    9: "submitted",
  },
  declared: { 9: [{ projectName: "Nimbus", minutes: 24 * 60 }] },
  overrides: { "2026-08-10": 0, "2026-08-11": 0, "2026-08-12": 240 },
  leaveDays: [
    { isoDate: "2026-08-10", dayPart: "FULL" },
    { isoDate: "2026-08-11", dayPart: "FULL" },
    { isoDate: "2026-08-12", dayPart: "MORNING" },
  ],
});

export const previousYear = buildYearFixture({
  year: 2025,
  todayIso: "2026-11-10",
  statuses: Object.fromEntries(Array.from({ length: 12 }, (_, index) => [index, "paid"])),
});
