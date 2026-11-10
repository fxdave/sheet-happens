import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TimeGridEntry } from "./time-entries";

const timeEntryFindMany = vi.fn();
const timeEntryGroupBy = vi.fn();

vi.mock("@/src/server/db/client", () => ({
  prisma: {
    member: {
      findUnique: vi.fn(async () => ({
        id: "member-1",
        timezone: "Europe/Budapest",
        deletedAt: null,
        defaultTrackingMode: "TRACKED",
      })),
    },
    periodLock: { findMany: vi.fn(async () => []) },
    projectAssignment: { findMany: vi.fn(async () => []) },
    timeEntry: {
      findMany: (args: unknown) => timeEntryFindMany(args),
      groupBy: (args: unknown) => timeEntryGroupBy(args),
    },
    runningTimer: { findUnique: vi.fn(async () => null) },
    timeEntryDraft: { findUnique: vi.fn(async () => null) },
    leave: { findMany: vi.fn(async () => []) },
  },
}));

const { buildTimeDaysWeeks, getMemberTimeDays } = await import("./time-days");

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function entry(overrides: Partial<TimeGridEntry> & { id: string; localDate: string }) {
  return {
    projectId: "project-1",
    projectAssignmentId: "assignment-1",
    durationMinutes: 60,
    description: overrides.id,
    source: "FORM",
    startedAt: null,
    endedAt: null,
    startTime: null,
    endTime: null,
    locked: false,
    updatedAt: "2026-11-10T09:00:00.000Z",
    adminModification: null,
    ...overrides,
  } satisfies TimeGridEntry;
}

/** Tuesday 10 November 2026, in week 46. */
const NOW = new Date("2026-11-10T09:00:00.000Z");

describe("buildTimeDaysWeeks", () => {
  const weeks = buildTimeDaysWeeks({
    weekStarts: [dateOnly("2026-11-02"), dateOnly("2026-11-09")],
    todayIso: "2026-11-10",
    lockedMonthStarts: new Set(),
    leaveDates: new Set(["2026-11-06"]),
    entries: [
      entry({ id: "mon-a", localDate: "2026-11-09", startTime: "09:00", durationMinutes: 90 }),
      entry({ id: "mon-b", localDate: "2026-11-09", durationMinutes: 30 }),
      entry({ id: "mon-c", localDate: "2026-11-09", startTime: "13:00", durationMinutes: 120 }),
      entry({ id: "wed", localDate: "2026-11-04", durationMinutes: 240 }),
      // Future entries are allowed, but the log has no row for their day.
      entry({ id: "future", localDate: "2026-11-12", durationMinutes: 60 }),
    ],
  });

  it("orders weeks and days newest first and drops future days", () => {
    expect(weeks.map((week) => week.weekStart)).toEqual(["2026-11-09", "2026-11-02"]);
    expect(weeks[0]?.days.map((day) => day.isoDate)).toEqual(["2026-11-10", "2026-11-09"]);
    expect(weeks[1]?.days).toHaveLength(7);
    expect(weeks[1]?.days[0]?.isoDate).toBe("2026-11-08");
  });

  it("numbers the weeks and totals days and weeks", () => {
    expect(weeks.map((week) => week.isoWeek)).toEqual([46, 45]);
    expect(weeks[0]?.totalMinutes).toBe(240);
    expect(weeks[1]?.totalMinutes).toBe(240);
    expect(weeks[0]?.days[1]?.totalMinutes).toBe(240);
  });

  it("sorts a day's entries by start time, newest first, with duration-only entries last", () => {
    expect(weeks[0]?.days[1]?.entries.map((item) => item.id)).toEqual(["mon-c", "mon-a", "mon-b"]);
  });

  it("carries the day flags", () => {
    expect(weeks[0]?.days[0]?.state).toBe("today");
    expect(weeks[1]?.days.find((day) => day.isoDate === "2026-11-06")?.onLeave).toBe(true);
  });
});

describe("getMemberTimeDays", () => {
  beforeEach(() => {
    timeEntryFindMany.mockReset();
    timeEntryFindMany.mockResolvedValue([]);
    timeEntryGroupBy.mockReset();
    timeEntryGroupBy.mockResolvedValue([]);
  });

  it("covers two ISO weeks ending with today's and offers no next page", async () => {
    const days = await getMemberTimeDays({ memberId: "member-1", now: NOW });

    expect(days.rangeStart).toBe("2026-11-02");
    expect(days.rangeEnd).toBe("2026-11-15");
    expect(days.anchorDay).toBe("2026-11-10");
    expect(days.previousAnchor).toBe("2026-10-27");
    expect(days.nextAnchor).toBeNull();
    expect(days.weeks.map((week) => week.isoWeek)).toEqual([46, 45]);
  });

  it("reads a future anchor as today", async () => {
    const days = await getMemberTimeDays({
      memberId: "member-1",
      endDay: dateOnly("2027-01-04"),
      now: NOW,
    });

    expect(days.anchorDay).toBe("2026-11-10");
  });

  it("clamps the next page to today", async () => {
    const days = await getMemberTimeDays({
      memberId: "member-1",
      endDay: dateOnly("2026-10-30"),
      now: NOW,
    });

    expect(days.rangeStart).toBe("2026-10-19");
    expect(days.nextAnchor).toBe("2026-11-10");
  });

  it("loads one earlier week for the infinite scroll", async () => {
    const days = await getMemberTimeDays({
      memberId: "member-1",
      endDay: dateOnly("2026-11-01"),
      weeks: 1,
      now: NOW,
    });

    expect(days.weeks.map((week) => week.weekStart)).toEqual(["2026-10-26"]);
  });

  it("excludes declared entries at the query", async () => {
    await getMemberTimeDays({ memberId: "member-1", now: NOW });

    for (const call of [...timeEntryFindMany.mock.calls, ...timeEntryGroupBy.mock.calls]) {
      const args = call[0] as { where: { source?: { not?: string } } };
      expect(args.where.source).toEqual({ not: "DECLARED" });
    }
  });
});
