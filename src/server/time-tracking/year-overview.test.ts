import { describe, expect, it, vi } from "vitest";

import { TimeTrackingError } from "./time-entries";
import {
  buildYearOverview,
  getMemberYearOverview,
  type BuildYearOverviewInput,
  type YearOverviewClient,
} from "./year-overview";

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function build(overrides: Partial<BuildYearOverviewInput> = {}) {
  return buildYearOverview({
    year: 2026,
    todayIso: "2026-11-10",
    timezone: "Europe/Budapest",
    profile: "CONTRACTOR",
    dayTotals: [],
    declarations: [],
    timesheets: [],
    lockedMonthStarts: new Set(),
    leaves: [],
    ...overrides,
  });
}

describe("buildYearOverview", () => {
  it("always returns twelve months, January first", () => {
    const overview = build();

    expect(overview.months).toHaveLength(12);
    expect(overview.months[0]?.monthStart).toBe("2026-01-01");
    expect(overview.months[11]?.monthStart).toBe("2026-12-01");
    expect(overview.totalMinutes).toBe(0);
    expect(overview.months.every((month) => month.timesheetStatus === null)).toBe(true);
  });

  it("sums tracked days into their month and adds declarations to the total", () => {
    const overview = build({
      dayTotals: [
        { isoDate: "2026-10-02", minutes: 480, entryCount: 3 },
        { isoDate: "2026-10-01", minutes: 240, entryCount: 1 },
        { isoDate: "2026-11-02", minutes: 90, entryCount: 1 },
      ],
      declarations: [
        { periodStart: "2026-10-01", projectId: "p2", projectName: "Nimbus", minutes: 1440 },
        { periodStart: "2026-10-01", projectId: "p1", projectName: "Atlas", minutes: 60 },
        { periodStart: "2026-10-01", projectId: "p3", projectName: "Zero", minutes: 0 },
      ],
    });
    const october = overview.months[9];

    expect(october).toMatchObject({
      trackedMinutes: 720,
      declaredMinutes: 1500,
      totalMinutes: 2220,
    });
    expect(october?.declared.map((row) => row.projectName)).toEqual(["Atlas", "Nimbus"]);
    expect(overview.months[10]?.totalMinutes).toBe(90);
    expect(overview.totalMinutes).toBe(2310);
    expect(overview.days.map((day) => day.isoDate)).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-11-02",
    ]);
  });

  it("drops empty days and days outside the year", () => {
    const overview = build({
      dayTotals: [
        { isoDate: "2025-12-31", minutes: 60, entryCount: 1 },
        { isoDate: "2026-03-03", minutes: 0, entryCount: 1 },
        { isoDate: "2026-03-04", minutes: 30, entryCount: 1 },
      ],
    });

    expect(overview.days).toEqual([{ isoDate: "2026-03-04", minutes: 30, entryCount: 1 }]);
  });

  it("attaches each month's timesheet status and lock", () => {
    const overview = build({
      timesheets: [
        { periodStart: "2026-09-01", status: "paid" },
        { periodStart: "2026-10-01", status: "submitted" },
      ],
      lockedMonthStarts: new Set(["2026-10-01"]),
    });

    expect(overview.months[8]).toMatchObject({ timesheetStatus: "paid", locked: false });
    expect(overview.months[9]).toMatchObject({ timesheetStatus: "submitted", locked: true });
    expect(overview.months[10]).toMatchObject({ timesheetStatus: null, locked: false });
  });

  it("expands leave into dates clipped to the year, a full day winning over a half", () => {
    const overview = build({
      leaves: [
        { startDate: "2025-12-30", endDate: "2026-01-02", dayPart: "FULL" },
        { startDate: "2026-01-02", endDate: "2026-01-02", dayPart: "MORNING" },
        { startDate: "2026-06-05", endDate: "2026-06-05", dayPart: "AFTERNOON" },
      ],
    });

    expect(overview.leaveDays).toEqual([
      { isoDate: "2026-01-01", dayPart: "FULL" },
      { isoDate: "2026-01-02", dayPart: "FULL" },
      { isoDate: "2026-06-05", dayPart: "AFTERNOON" },
    ]);
  });
});

function createYearDb(
  overrides: { member?: Awaited<ReturnType<YearOverviewClient["member"]["findUnique"]>> } = {},
) {
  const db = {
    member: {
      findUnique: vi.fn(async () =>
        overrides.member !== undefined
          ? overrides.member
          : {
              timezone: "Pacific/Auckland",
              currentProfile: "CONTRACTOR" as const,
              deletedAt: null,
            },
      ),
    },
    timeEntry: {
      findFirst: vi.fn(async () => ({ id: "older-entry" })),
      groupBy: vi.fn(async () => [
        { localDate: dateOnly("2026-11-09"), _sum: { durationMinutes: 450 }, _count: { _all: 2 } },
      ]),
    },
    monthlyHourDeclaration: {
      findMany: vi.fn(async () => [
        {
          periodStart: dateOnly("2026-10-01"),
          projectId: "p2",
          minutes: 1440,
          project: { name: "Nimbus" },
        },
      ]),
    },
    timesheet: {
      findMany: vi.fn(async () => [{ periodStart: dateOnly("2026-10-01"), status: "SUBMITTED" }]),
    },
    periodLock: {
      findMany: vi.fn(async () => [{ periodStart: dateOnly("2026-10-01") }]),
    },
    leave: {
      findMany: vi.fn(async () => [
        {
          startDate: dateOnly("2026-08-03"),
          endDate: dateOnly("2026-08-04"),
          dayPart: "FULL" as const,
        },
      ]),
    },
  } satisfies YearOverviewClient;

  return db;
}

describe("getMemberYearOverview", () => {
  it("reads the year in a fixed set of queries and maps the rows", async () => {
    const db = createYearDb();
    const overview = await getMemberYearOverview(
      { memberId: "member-1", year: 2026, now: new Date("2026-11-10T12:00:00.000Z") },
      { db },
    );

    // Auckland is already on the 11th at noon UTC.
    expect(overview.todayIso).toBe("2026-11-11");
    expect(overview.timezone).toBe("Pacific/Auckland");
    expect(overview.profile).toBe("CONTRACTOR");
    expect(overview.months[9]).toMatchObject({
      timesheetStatus: "submitted",
      locked: true,
      declaredMinutes: 1440,
      declared: [{ projectId: "p2", projectName: "Nimbus", minutes: 1440 }],
    });
    expect(overview.months[10]?.trackedMinutes).toBe(450);
    expect(overview.leaveDays.map((day) => day.isoDate)).toEqual(["2026-08-03", "2026-08-04"]);
    expect(overview.totalMinutes).toBe(1890);
    expect(overview.hasEarlier).toBe(true);

    expect(db.timeEntry.groupBy).toHaveBeenCalledTimes(1);
    expect(db.timeEntry.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["localDate"],
        where: expect.objectContaining({
          memberId: "member-1",
          deletedAt: null,
          source: { not: "DECLARED" },
          localDate: { gte: dateOnly("2026-01-01"), lte: dateOnly("2026-12-31") },
        }),
      }),
    );
    expect(db.periodLock.findMany).toHaveBeenCalledTimes(1);
  });

  it("refuses an unknown or deleted member", async () => {
    await expect(
      getMemberYearOverview(
        { memberId: "nobody", year: 2026 },
        { db: createYearDb({ member: null }) },
      ),
    ).rejects.toBeInstanceOf(TimeTrackingError);

    await expect(
      getMemberYearOverview(
        { memberId: "gone", year: 2026 },
        {
          db: createYearDb({
            member: { timezone: "UTC", currentProfile: "EMPLOYEE", deletedAt: new Date() },
          }),
        },
      ),
    ).rejects.toMatchObject({ code: "MEMBER_NOT_FOUND" });
  });
});
