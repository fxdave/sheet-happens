import { describe, expect, it, vi } from "vitest";

const timeEntryFindMany = vi.fn<(args: unknown) => Promise<unknown[]>>(async () => []);

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
      groupBy: vi.fn(async () => []),
    },
    runningTimer: { findUnique: vi.fn(async () => null) },
    timeEntryDraft: { findUnique: vi.fn(async () => null) },
    leave: { findMany: vi.fn(async () => []) },
  },
}));

const { getMemberTimeFrame } = await import("./time-frame");

describe("getMemberTimeFrame", () => {
  it("reads the anchor's ISO week and loads no entries of its own", async () => {
    const frame = await getMemberTimeFrame({
      memberId: "member-1",
      anchor: new Date("2026-10-15T00:00:00.000Z"),
      now: new Date("2026-11-10T09:00:00.000Z"),
    });

    expect(frame).toMatchObject({
      todayIso: "2026-11-10",
      weekStart: "2026-10-12",
      weekEnd: "2026-10-18",
      runningTimer: null,
    });
    // The one `findMany` is the recent-project lookback, which selects project ids only.
    expect(timeEntryFindMany).toHaveBeenCalledTimes(1);
    expect(timeEntryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ distinct: ["projectId"], select: { projectId: true } }),
    );
  });

  it("defaults to the week holding today", async () => {
    const frame = await getMemberTimeFrame({
      memberId: "member-1",
      now: new Date("2026-11-10T09:00:00.000Z"),
    });

    expect(frame.weekStart).toBe("2026-11-09");
  });
});
