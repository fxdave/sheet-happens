import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MonthCalendarEntryRow } from "./month-calendar";

const memberFindUnique = vi.fn();
const timeEntryFindMany = vi.fn();
const timeEntryFindFirst = vi.fn();
const periodLockFindMany = vi.fn();
const leaveFindMany = vi.fn();

vi.mock("@/src/server/db/client", () => ({
  prisma: {
    member: { findUnique: (args: unknown) => memberFindUnique(args) },
    timeEntry: {
      findMany: (args: unknown) => timeEntryFindMany(args),
      findFirst: (args: unknown) => timeEntryFindFirst(args),
    },
    periodLock: { findMany: (args: unknown) => periodLockFindMany(args) },
    leave: { findMany: (args: unknown) => leaveFindMany(args) },
  },
}));

const { buildMonthCalendar, getMemberMonthCalendar } = await import("./month-calendar");

function row(
  localDate: string,
  minutes: number,
  overrides: Partial<MonthCalendarEntryRow> = {},
): MonthCalendarEntryRow {
  return {
    id: `${localDate}-${minutes}`,
    localDate,
    description: "Sprint planning",
    projectId: "atlas",
    projectName: "Atlas Platform",
    projectColor: "#37e3de",
    durationMinutes: minutes,
    startTime: null,
    startedAt: null,
    createdAt: `${localDate}T12:00:00.000Z`,
    ...overrides,
  };
}

function build(input: {
  monthStart?: string;
  todayIso?: string;
  entries?: MonthCalendarEntryRow[];
  locked?: string[];
  leave?: string[];
}) {
  return buildMonthCalendar({
    monthStart: input.monthStart ?? "2026-11-01",
    todayIso: input.todayIso ?? "2026-11-10",
    timezone: "Europe/Budapest",
    lockedMonthStarts: new Set(input.locked ?? []),
    leaveDates: new Set(input.leave ?? []),
    entries: input.entries ?? [],
  });
}

describe("buildMonthCalendar", () => {
  it("covers the month with Monday-first weeks, neighbours included", () => {
    // November 2026 starts on a Sunday, so it needs six rows: Oct 26 – Dec 6.
    const calendar = build({});

    expect(calendar.weeks.map((week) => week.weekStart)).toEqual([
      "2026-10-26",
      "2026-11-02",
      "2026-11-09",
      "2026-11-16",
      "2026-11-23",
      "2026-11-30",
    ]);
    expect(calendar.weeks.map((week) => week.isoWeek)).toEqual([44, 45, 46, 47, 48, 49]);
    expect(calendar.weeks[0]?.days.map((day) => day.inMonth)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
    expect(calendar.weeks[5]?.days.at(-1)?.isoDate).toBe("2026-12-06");
  });

  it("uses five rows for a month that fits them", () => {
    expect(build({ monthStart: "2026-10-01" }).weeks).toHaveLength(5);
  });

  it("flags today, future and weekend days", () => {
    const days = build({}).weeks[2]!.days;

    expect(days[0]).toMatchObject({ isoDate: "2026-11-09", isToday: false, isFuture: false });
    expect(days[1]).toMatchObject({ isoDate: "2026-11-10", isToday: true, isFuture: false });
    expect(days[2]).toMatchObject({ isoDate: "2026-11-11", isToday: false, isFuture: true });
    expect(days.map((day) => day.isWeekend)).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
      true,
    ]);
  });

  it("counts only the month's days in the month total, and every day in a week total", () => {
    const calendar = build({
      entries: [row("2026-10-30", 480), row("2026-11-02", 300), row("2026-11-02", 60)],
    });

    expect(calendar.totalMinutes).toBe(360);
    expect(calendar.weeks[0]?.totalMinutes).toBe(480);
    expect(calendar.weeks[1]?.totalMinutes).toBe(360);
    expect(calendar.weeks[1]?.days[0]?.totalMinutes).toBe(360);
  });

  it("orders a day's entries by start time, then untimed ones by creation", () => {
    const calendar = build({
      entries: [
        row("2026-11-03", 30, { id: "untimed-late", createdAt: "2026-11-03T18:00:00.000Z" }),
        row("2026-11-03", 30, {
          id: "afternoon",
          startedAt: "2026-11-03T13:00:00.000Z",
          startTime: "14:00",
        }),
        row("2026-11-03", 30, { id: "untimed-early", createdAt: "2026-11-03T08:00:00.000Z" }),
        row("2026-11-03", 30, {
          id: "morning",
          startedAt: "2026-11-03T08:00:00.000Z",
          startTime: "09:00",
        }),
      ],
    });

    expect(calendar.weeks[1]?.days[1]?.entries.map((entry) => entry.id)).toEqual([
      "morning",
      "afternoon",
      "untimed-early",
      "untimed-late",
    ]);
  });

  it("marks locked months and leave days, neighbours included", () => {
    const calendar = build({ locked: ["2026-10-01"], leave: ["2026-11-05"] });

    expect(calendar.weeks[0]?.days[0]).toMatchObject({ isoDate: "2026-10-26", locked: true });
    expect(calendar.weeks[0]?.days[6]).toMatchObject({ isoDate: "2026-11-01", locked: false });
    expect(calendar.weeks[1]?.days[3]).toMatchObject({ isoDate: "2026-11-05", onLeave: true });
  });
});

describe("getMemberMonthCalendar", () => {
  beforeEach(() => {
    memberFindUnique.mockReset();
    memberFindUnique.mockResolvedValue({
      id: "member-1",
      timezone: "Europe/Budapest",
      deletedAt: null,
    });
    timeEntryFindMany.mockReset();
    timeEntryFindMany.mockResolvedValue([]);
    timeEntryFindFirst.mockReset();
    timeEntryFindFirst.mockResolvedValue(null);
    periodLockFindMany.mockReset();
    periodLockFindMany.mockResolvedValue([]);
    leaveFindMany.mockReset();
    leaveFindMany.mockResolvedValue([]);
  });

  it("reads the whole grid in one query, without declared or deleted entries", async () => {
    await getMemberMonthCalendar({
      memberId: "member-1",
      monthStart: new Date("2026-11-17T00:00:00.000Z"),
      now: new Date("2026-11-10T09:00:00.000Z"),
    });

    expect(timeEntryFindMany).toHaveBeenCalledTimes(1);
    expect(timeEntryFindMany.mock.calls[0]?.[0]).toMatchObject({
      where: {
        memberId: "member-1",
        deletedAt: null,
        source: { not: "DECLARED" },
        localDate: {
          gte: new Date("2026-10-26T00:00:00.000Z"),
          lte: new Date("2026-12-06T00:00:00.000Z"),
        },
      },
    });
    expect(periodLockFindMany.mock.calls[0]?.[0]).toMatchObject({
      where: {
        periodStart: {
          in: [
            new Date("2026-10-01T00:00:00.000Z"),
            new Date("2026-11-01T00:00:00.000Z"),
            new Date("2026-12-01T00:00:00.000Z"),
          ],
        },
      },
    });
  });

  it("maps rows into day cells in the member's timezone", async () => {
    timeEntryFindMany.mockResolvedValue([
      {
        id: "entry-1",
        localDate: new Date("2026-11-09T00:00:00.000Z"),
        description: "Nimbus sync job",
        durationMinutes: 90,
        startedAt: new Date("2026-11-09T10:00:00.000Z"),
        timezone: "Europe/Budapest",
        createdAt: new Date("2026-11-09T12:00:00.000Z"),
        project: { id: "nimbus", name: "Nimbus", colorToken: "not-a-token" },
      },
    ]);

    const calendar = await getMemberMonthCalendar({
      memberId: "member-1",
      monthStart: new Date("2026-11-01T00:00:00.000Z"),
      now: new Date("2026-11-10T09:00:00.000Z"),
    });

    expect(calendar.todayIso).toBe("2026-11-10");
    expect(calendar.totalMinutes).toBe(90);
    expect(calendar.weeks[2]?.days[0]?.entries).toEqual([
      {
        id: "entry-1",
        description: "Nimbus sync job",
        projectId: "nimbus",
        projectName: "Nimbus",
        projectColor: expect.any(String),
        durationMinutes: 90,
        startTime: "11:00",
      },
    ]);
  });

  it("reports whether anything was logged before the grid", async () => {
    timeEntryFindFirst.mockResolvedValue({ id: "older" });

    const calendar = await getMemberMonthCalendar({
      memberId: "member-1",
      monthStart: new Date("2026-11-01T00:00:00.000Z"),
    });

    expect(calendar.hasEarlier).toBe(true);
    expect(timeEntryFindFirst.mock.calls[0]?.[0]).toMatchObject({
      where: {
        deletedAt: null,
        source: { not: "DECLARED" },
        localDate: { lt: new Date("2026-10-26T00:00:00.000Z") },
      },
    });
  });

  it("rejects an unknown member", async () => {
    memberFindUnique.mockResolvedValue(null);

    await expect(
      getMemberMonthCalendar({ memberId: "missing", monthStart: new Date("2026-11-01") }),
    ).rejects.toMatchObject({ code: "MEMBER_NOT_FOUND" });
  });
});
