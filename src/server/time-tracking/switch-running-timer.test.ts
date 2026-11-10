import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
  $queryRaw: vi.fn(async () => []),
  leave: { findMany: vi.fn(async () => []) },
  periodLock: { findFirst: vi.fn(async () => null) },
  member: { findUnique: vi.fn(async () => ({ timezone: "Europe/Budapest" })) },
  projectAssignment: {
    findFirst: vi.fn(async (args: { where: { projectId: string } }) => ({
      id: `assignment-${args.where.projectId}`,
      projectId: args.where.projectId,
      trackingMode: null,
      member: { defaultTrackingMode: "TRACKED" },
      project: { id: args.where.projectId },
    })),
    findUnique: vi.fn(async () => ({
      trackingMode: null,
      member: { defaultTrackingMode: "TRACKED" },
    })),
  },
  timeEntry: {
    aggregate: vi.fn(async () => ({ _sum: { durationMinutes: 60 } })),
    create: vi.fn(async () => ({ id: "entry-stopped" })),
  },
  runningTimer: {
    findUnique: vi.fn(),
    create: vi.fn(async () => ({ id: "timer-new" })),
    delete: vi.fn(async () => ({ id: "timer-old" })),
  },
  auditLog: { create: vi.fn(async () => ({ id: "audit" })) },
}));

vi.mock("@/src/server/db/client", () => ({
  prisma: { ...tx, $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) },
}));

const { startRunningTimer, switchRunningTimer, TimeTrackingError } = await import("./time-entries");

const NOW = new Date("2026-11-10T10:00:00.000Z");
const runningTimer = {
  id: "timer-old",
  memberId: "member-1",
  projectId: "project-old",
  projectAssignmentId: "assignment-project-old",
  description: "Map layer performance",
  startedAt: new Date("2026-11-10T09:00:00.000Z"),
  timezone: "Europe/Budapest",
};

const input = {
  memberId: "member-1",
  actorMemberId: "member-1",
  projectId: "project-new",
  description: "Sprint planning",
  now: NOW,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("switchRunningTimer", () => {
  it("starts a timer straight away when none is running", async () => {
    tx.runningTimer.findUnique.mockResolvedValue(null);

    const result = await switchRunningTimer(input);

    expect(result).toEqual({ stopped: null, started: { id: "timer-new" } });
    expect(tx.timeEntry.create).not.toHaveBeenCalled();
    expect(tx.runningTimer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ projectId: "project-new", description: "Sprint planning" }),
      }),
    );
  });

  it("stops the running timer into an entry, then starts the new one", async () => {
    // The switch's own read, the stop's read, then the start's "already running?" read.
    tx.runningTimer.findUnique
      .mockResolvedValueOnce({ id: "timer-old" })
      .mockResolvedValueOnce(runningTimer)
      .mockResolvedValueOnce(null);

    const result = await switchRunningTimer(input);

    expect(result.stopped).toEqual({ id: "entry-stopped", saved: true });
    expect(result.started).toEqual({ id: "timer-new" });
    expect(tx.timeEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "project-old",
          durationMinutes: 60,
          source: "TIMER",
          endedAt: NOW,
        }),
      }),
    );
    expect(tx.runningTimer.delete).toHaveBeenCalled();
    expect(tx.runningTimer.create).toHaveBeenCalled();
  });

  it("refuses a start on a locked day without stopping anything", async () => {
    tx.runningTimer.findUnique.mockResolvedValue(null);
    tx.periodLock.findFirst.mockResolvedValueOnce({ id: "lock" } as never);

    await expect(switchRunningTimer(input)).rejects.toBeInstanceOf(TimeTrackingError);
    expect(tx.runningTimer.create).not.toHaveBeenCalled();
  });
});

describe("startRunningTimer", () => {
  it("still refuses to start over a running timer", async () => {
    tx.runningTimer.findUnique.mockResolvedValue({ id: "timer-old" });

    await expect(startRunningTimer(input)).rejects.toMatchObject({
      code: "TIMER_ALREADY_RUNNING",
    });
  });
});
