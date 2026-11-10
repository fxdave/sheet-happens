import { describe, expect, it, vi } from "vitest";

import { listTimeEntriesAcrossMembers, sumTimeEntries } from "./queries";

const FROM = new Date("2026-11-01T00:00:00.000Z");
const TO = new Date("2026-11-30T00:00:00.000Z");

function row(id: string, memberId: string, displayName: string) {
  return {
    id,
    memberId,
    member: { displayName },
    localDate: new Date("2026-11-03T00:00:00.000Z"),
    projectId: "project-1",
    durationMinutes: 90,
    description: "Review",
    source: "GRID" as const,
    startedAt: null,
    endedAt: null,
    timezone: "Europe/Budapest",
    lockedByTimesheetRevisionId: id === "e2" ? "revision-1" : null,
    updatedAt: new Date("2026-11-03T10:00:00.000Z"),
    project: { name: "Atlas" },
  };
}

function createDb(foundMembers: string[]) {
  return {
    timeEntry: {
      findMany: vi.fn().mockResolvedValue([row("e1", "m1", "Ada"), row("e2", "m2", "Bo")]),
    },
    member: {
      findMany: vi.fn().mockResolvedValue(foundMembers.map((id) => ({ id }))),
    },
  };
}

describe("listTimeEntriesAcrossMembers", () => {
  it("reads the named members and labels every row with its member", async () => {
    const db = createDb(["m1", "m2"]);

    const result = await listTimeEntriesAcrossMembers(
      { members: ["m1", "m2", "m1"], from: FROM, to: TO },
      { db },
    );

    expect(db.member.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["m1", "m2"] } },
      select: { id: true },
    });
    expect(db.timeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          memberId: { in: ["m1", "m2"] },
          deletedAt: null,
          source: { not: "DECLARED" },
        }),
      }),
    );
    expect(result.entries.map((entry) => [entry.memberId, entry.memberName, entry.locked])).toEqual(
      [
        ["m1", "Ada", false],
        ["m2", "Bo", true],
      ],
    );
    expect(result.totals).toEqual({ minutes: 180, entryCount: 2 });
  });

  it("has no member filter for everyone, and does not look members up", async () => {
    const db = createDb([]);

    await listTimeEntriesAcrossMembers({ members: "all", from: FROM, to: TO }, { db });

    expect(db.member.findMany).not.toHaveBeenCalled();
    const where = db.timeEntry.findMany.mock.calls[0]?.[0].where as Record<string, unknown>;
    expect(where).not.toHaveProperty("memberId");
  });

  it("refuses an unknown member id", async () => {
    const db = createDb(["m1"]);

    await expect(
      listTimeEntriesAcrossMembers({ members: ["m1", "ghost"], from: FROM, to: TO }, { db }),
    ).rejects.toMatchObject({ code: "MEMBER_NOT_FOUND" });
    expect(db.timeEntry.findMany).not.toHaveBeenCalled();
  });
});

describe("sumTimeEntries", () => {
  it("aggregates the whole range with the list's filter", async () => {
    const aggregate = vi
      .fn()
      .mockResolvedValue({ _sum: { durationMinutes: 600 }, _count: { _all: 7 } });

    await expect(
      sumTimeEntries(
        { members: ["m1"], from: FROM, to: TO, projectId: "p1", includeDeclared: true },
        { db: { timeEntry: { aggregate } } },
      ),
    ).resolves.toEqual({ minutes: 600, entryCount: 7 });
    expect(aggregate).toHaveBeenCalledWith({
      where: {
        memberId: "m1",
        deletedAt: null,
        localDate: { gte: FROM, lte: TO },
        projectId: "p1",
      },
      _sum: { durationMinutes: true },
      _count: { _all: true },
    });
  });

  it("reports zero for an empty range", async () => {
    const aggregate = vi
      .fn()
      .mockResolvedValue({ _sum: { durationMinutes: null }, _count: { _all: 0 } });

    await expect(
      sumTimeEntries({ members: "all", from: FROM, to: TO }, { db: { timeEntry: { aggregate } } }),
    ).resolves.toEqual({ minutes: 0, entryCount: 0 });
  });
});
