import { prisma } from "@/src/server/db/client";

import { formatDateOnly, formatTimeInTimezone, normalizeDateOnly, parseDateOnly } from "./dates";
import { TimeTrackingError } from "./time-entries";
import type { TimeEntrySource } from "./time-entries";

/**
 * "What did I log?", answered a page at a time.
 *
 * Both reads that already exist are shaped for rendering: `getMemberWeeklyTimeGrid` loads a whole
 * `/time` payload for seven days, and `getMemberMonthOverview` loads per-project sums with no
 * entries in them at all. Neither can answer "the entries I logged on Atlas since March" without
 * either fetching twelve week payloads or fetching a month total that has already thrown the
 * entries away. This is the flat ordered list in between, and it is what an agent reading back its
 * own log needs.
 *
 * Member-scoped by construction. `memberId` is required, it is the first thing in the `where`, and
 * there is no "all members" mode — the caller is the member, or an agent acting as one. The
 * admin-wide read is `listTimeEntriesAcrossMembers` below, a different function with a different
 * authorization story; folding it in here would put that decision behind an optional field, which
 * is how a cross-member leak gets written.
 */

export type MemberTimeEntryRow = {
  id: string;
  /** `YYYY-MM-DD`, the entry's own local day — never derived from `startedAt`. */
  date: string;
  projectId: string;
  projectName: string;
  durationMinutes: number;
  /**
   * `HH:mm` as it was entered: formatted in the entry's **own** `timezone` column, not the
   * member's current one. A member who logs a fortnight from Tokyo and then sets their profile back
   * to Budapest must still read that fortnight back as the clock they typed, because those are the
   * times a submitted timesheet was built from.
   */
  startTime: string | null;
  endTime: string | null;
  description: string;
  source: TimeEntrySource;
  /** Locked by a submitted timesheet, i.e. not editable. */
  locked: boolean;
  updatedAt: string;
};

export type ListMemberTimeEntriesResult = {
  /** The requested window, normalized to day markers and echoed back so a page is self-describing. */
  range: { from: string; to: string };
  entries: MemberTimeEntryRow[];
  /**
   * **The returned page, never the whole range.** A caller that wants the range total sums every
   * page it fetched, or asks `getMemberMonthOverview`, which sums in the database. Reading this as
   * "the range" is how an agent that stops paging early reports a plausible but wrong number — and
   * how one that pages to the end reports the same minutes several times over.
   */
  totals: { minutes: number; entryCount: number };
  /** Opaque. Hand it back as `cursor` for the next page; `null` means this page was the last. */
  nextCursor: string | null;
};

type TimeEntryQueryRecord = {
  id: string;
  localDate: Date;
  projectId: string;
  durationMinutes: number;
  description: string;
  source: TimeEntrySource;
  startedAt: Date | null;
  endedAt: Date | null;
  timezone: string;
  lockedByTimesheetRevisionId: string | null;
  updatedAt: Date;
  project: {
    name: string;
  };
};

/**
 * Only what this module touches: one `findMany` over `timeEntry`.
 *
 * Narrow rather than `typeof prisma` so a test can hand over a plain object, and so a second query
 * cannot be added here quietly — it would have to widen this type, which shows up in review.
 */
export type TimeEntryQueryClient = {
  timeEntry: {
    findMany: (args: unknown) => Promise<TimeEntryQueryRecord[]>;
    findFirst: (args: unknown) => Promise<TimeEntryQueryRecord | null>;
  };
};

type PageCursor = {
  date: string;
  startedAt: string | null;
  id: string;
};

const DEFAULT_PAGE_LIMIT = 100;
const MAX_PAGE_LIMIT = 200;

const timeEntryRowSelect = {
  id: true,
  localDate: true,
  projectId: true,
  durationMinutes: true,
  description: true,
  source: true,
  startedAt: true,
  endedAt: true,
  timezone: true,
  lockedByTimesheetRevisionId: true,
  updatedAt: true,
  project: {
    select: {
      name: true,
    },
  },
} as const;

/**
 * A **total** order, which is what makes the cursor safe rather than merely tidy.
 *
 * `localDate` then `startedAt` is the order a log is read in — the day, then the clock. But two
 * entries can share both (two 09:00 starts, or two duration-only entries on one day), and any pair
 * the sort leaves tied is a pair the keyset can hand out twice or step straight over. `id` last
 * breaks every remaining tie, so no two rows compare equal and the cursor has exactly one row it
 * can point at.
 *
 * Nulls last: a duration-only entry has no clock position at all, so it reads after the timed
 * entries of its day rather than jumping to the top of it. That is also Postgres' own default for
 * `ASC`, said out loud here because {@link buildCursorFilter} has to encode the same choice and the
 * two must not drift.
 */
const timeEntryRowOrderBy = [
  { localDate: "asc" },
  { startedAt: { sort: "asc", nulls: "last" } },
  { id: "asc" },
] as const;

export async function listMemberTimeEntries(
  input: {
    memberId: string;
    from: Date;
    to: Date;
    projectId?: string;
    includeDeclared?: boolean;
    cursor?: string | null;
    limit?: number;
  },
  deps: { db?: TimeEntryQueryClient } = {},
): Promise<ListMemberTimeEntriesResult> {
  const db = deps.db ?? (prisma as unknown as TimeEntryQueryClient);
  const page = await readTimeEntryPage(
    db,
    { ...input, members: [input.memberId] },
    timeEntryRowSelect,
  );

  return { ...page, entries: page.entries.map(mapMemberTimeEntryRow) };
}

export type MemberScopedTimeEntryRow = MemberTimeEntryRow & {
  memberId: string;
  memberName: string;
};

export type ListTimeEntriesAcrossMembersResult = Omit<ListMemberTimeEntriesResult, "entries"> & {
  entries: MemberScopedTimeEntryRow[];
};

type CrossMemberTimeEntryRecord = TimeEntryQueryRecord & {
  memberId: string;
  member: { displayName: string };
};

/** `listTimeEntriesAcrossMembers`'s reads: the entry page plus one lookup of the named members. */
export type CrossMemberTimeEntryQueryClient = {
  timeEntry: { findMany: (args: unknown) => Promise<CrossMemberTimeEntryRecord[]> };
  member: { findMany: (args: unknown) => Promise<{ id: string }[]> };
};

/**
 * Admin-wide read for any member, so callers must authorize first. `members` is explicit (ids or
 * `"all"`) so "everyone" is never a forgotten argument; order, cursor and paging match the list above.
 */
export async function listTimeEntriesAcrossMembers(
  input: {
    members: readonly string[] | "all";
    from: Date;
    to: Date;
    projectId?: string;
    includeDeclared?: boolean;
    cursor?: string | null;
    limit?: number;
  },
  deps: { db?: CrossMemberTimeEntryQueryClient } = {},
): Promise<ListTimeEntriesAcrossMembersResult> {
  const db = deps.db ?? (prisma as unknown as CrossMemberTimeEntryQueryClient);
  const members = input.members === "all" ? "all" : [...new Set(input.members)];

  if (members !== "all") {
    const found = await db.member.findMany({
      where: { id: { in: members } },
      select: { id: true },
    });

    if (found.length !== members.length) {
      throw new TimeTrackingError("Member not found.", "MEMBER_NOT_FOUND");
    }
  }

  const page = await readTimeEntryPage(
    db,
    { ...input, members },
    {
      ...timeEntryRowSelect,
      memberId: true,
      member: { select: { displayName: true } },
    },
  );

  return {
    ...page,
    entries: page.entries.map((row) => ({
      ...mapMemberTimeEntryRow(row),
      memberId: row.memberId,
      memberName: row.member.displayName,
    })),
  };
}

/** `aggregate` over the same filter the lists use, minus the cursor: a whole range in one read. */
export type TimeEntryTotalsClient = {
  timeEntry: {
    aggregate: (args: unknown) => Promise<{
      _sum: { durationMinutes: number | null };
      _count: { _all: number };
    }>;
  };
};

/**
 * The range total a page cannot give. Same filter as the lists, so paging to the end and summing
 * agrees with this figure.
 */
export async function sumTimeEntries(
  input: {
    members: readonly string[] | "all";
    from: Date;
    to: Date;
    projectId?: string;
    includeDeclared?: boolean;
  },
  deps: { db?: TimeEntryTotalsClient } = {},
): Promise<{ minutes: number; entryCount: number }> {
  const db = deps.db ?? (prisma as unknown as TimeEntryTotalsClient);
  const result = await db.timeEntry.aggregate({
    where: buildRangeWhere(input),
    _sum: { durationMinutes: true },
    _count: { _all: true },
  });

  return { minutes: result._sum.durationMinutes ?? 0, entryCount: result._count._all };
}

type RangeFilter = {
  members: readonly string[] | "all";
  from: Date;
  to: Date;
  projectId?: string;
  includeDeclared?: boolean;
};

function buildRangeWhere(input: RangeFilter) {
  const members = input.members;

  return {
    ...(members === "all"
      ? {}
      : { memberId: members.length === 1 ? members[0] : { in: [...members] } }),
    /* A soft-deleted entry is gone as far as every reader is concerned, and no flag on this
       function can bring one back: `includeDeclared` widens the *source* filter and nothing else.
       Keeping the two independent is the point — a "show me everything" argument that also
       resurrected deleted rows would make an agent's summary disagree with the member's own week. */
    deletedAt: null,
    localDate: {
      gte: normalizeDateOnly(input.from),
      lte: normalizeDateOnly(input.to),
    },
    ...(input.projectId ? { projectId: input.projectId } : {}),
    /* A declaration is one month-sized entry sitting on the 1st (see `tracking-mode.ts`), so a
       caller that lists a month and sums the page would double-count hours it also read from the
       month overview's declared band. Excluded by default for that reason, and available for the
       caller deliberately auditing what a month is made of. */
    ...(input.includeDeclared ? {} : { source: { not: "DECLARED" } }),
  };
}

async function readTimeEntryPage<Row extends TimeEntryQueryRecord>(
  db: { timeEntry: { findMany: (args: unknown) => Promise<Row[]> } },
  input: RangeFilter & { cursor?: string | null; limit?: number },
  select: Record<string, unknown>,
) {
  const from = normalizeDateOnly(input.from);
  const to = normalizeDateOnly(input.to);
  const limit = clampLimit(input.limit);
  const cursor = input.cursor ? decodeCursor(input.cursor) : null;

  const where = {
    ...buildRangeWhere(input),
    ...(cursor ? { AND: [buildCursorFilter(cursor)] } : {}),
  };

  /* One row past the page, which is how `nextCursor` gets to be honest without a second `count`:
     a page that comes back exactly full is otherwise indistinguishable from the last page, and
     guessing wrong either strands rows or hands out a cursor to nothing. */
  const rows = await db.timeEntry.findMany({
    where,
    orderBy: timeEntryRowOrderBy,
    take: limit + 1,
    select,
  });

  const page = rows.slice(0, limit);
  const lastOfFullPage = rows.length > limit ? page.at(-1) : undefined;

  return {
    range: {
      from: formatDateOnly(from),
      to: formatDateOnly(to),
    },
    entries: page,
    totals: {
      minutes: page.reduce((total, row) => total + row.durationMinutes, 0),
      entryCount: page.length,
    },
    nextCursor: lastOfFullPage ? encodeCursor(lastOfFullPage) : null,
  };
}

/**
 * `1..200`, and a caller asking for more gets 200 rather than an error.
 *
 * Page size is a hint, not a claim the caller can get wrong: refusing "give me everything" would
 * turn a harmless overshoot into a failed tool call an agent then retries with another guess.
 */
function clampLimit(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_PAGE_LIMIT;

  return Math.min(MAX_PAGE_LIMIT, Math.max(1, Math.trunc(value)));
}

/**
 * Opaque on purpose, and neither half is exported: a caller that can read a cursor starts minting
 * them, and from then on the sort key can never change.
 *
 * It carries the whole sort key — day, start instant and id — because the keyset predicate has to
 * reproduce the row's exact position in {@link timeEntryRowOrderBy}. `(date, id)` alone cannot:
 * rows within a day sort by `startedAt` first, so an id-only tiebreak would drop the rows of that
 * day that sort after the cursor with a smaller id, and repeat the ones that sort before it with a
 * larger one.
 */
function encodeCursor(row: { localDate: Date; startedAt: Date | null; id: string }) {
  const payload: PageCursor = {
    date: formatDateOnly(row.localDate),
    startedAt: row.startedAt?.toISOString() ?? null,
    id: row.id,
  };

  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

/**
 * Refuses anything that does not decode — truncated, hand-edited, or minted against a different
 * sort key.
 *
 * Refusing rather than restarting: an ignored cursor silently walks page 1 again, so a caller
 * paging with a corrupted one loops forever and reports the first page's minutes over and over
 * instead of being told its cursor is bad. Being told is recoverable; a plausible wrong total is
 * not.
 */
function decodeCursor(value: string): PageCursor {
  const invalid = () =>
    new TimeTrackingError("The page cursor is invalid. Start again without one.", "INVALID_CURSOR");

  let parsed: unknown;

  try {
    parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    throw invalid();
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw invalid();

  const { date, startedAt, id } = parsed as Record<string, unknown>;

  if (typeof date !== "string" || typeof id !== "string" || !id) throw invalid();
  if (startedAt !== null && typeof startedAt !== "string") throw invalid();
  if (startedAt !== null && Number.isNaN(Date.parse(startedAt))) throw invalid();

  try {
    // Throws `TimeTrackingDateError` on anything that is not a real calendar day.
    parseDateOnly(date);
  } catch {
    throw invalid();
  }

  return { date, startedAt, id };
}

/**
 * "Strictly after this row in {@link timeEntryRowOrderBy}", as a `where` rather than an offset.
 *
 * Keyset rather than `skip`, because rows are written while a caller pages: an offset re-counts
 * from the start of the range on every call, so one entry inserted into an earlier day shifts every
 * following page by one and the walk skips a row without anything noticing. This predicate is
 * anchored to a row instead, so a new entry either sorts after the cursor and is seen, or before it
 * and is not — never half of each.
 *
 * The branches are nulls-last spelled out: a timed cursor is followed by later starts, then by its
 * own `startedAt` ties with a larger id, then by that day's duration-only entries; an untimed
 * cursor already sits in that trailing group, so within its day only a larger id remains.
 */
function buildCursorFilter(cursor: PageCursor) {
  const localDate = parseDateOnly(cursor.date);

  if (!cursor.startedAt) {
    return {
      OR: [{ localDate: { gt: localDate } }, { localDate, startedAt: null, id: { gt: cursor.id } }],
    };
  }

  const startedAt = new Date(cursor.startedAt);

  return {
    OR: [
      { localDate: { gt: localDate } },
      {
        localDate,
        OR: [
          { startedAt: { gt: startedAt } },
          { startedAt, id: { gt: cursor.id } },
          { startedAt: null },
        ],
      },
    ],
  };
}

function mapMemberTimeEntryRow(row: TimeEntryQueryRecord): MemberTimeEntryRow {
  return {
    id: row.id,
    date: formatDateOnly(row.localDate),
    projectId: row.projectId,
    projectName: row.project.name,
    durationMinutes: row.durationMinutes,
    startTime: row.startedAt ? formatTimeInTimezone(row.startedAt, row.timezone) : null,
    endTime: row.endedAt ? formatTimeInTimezone(row.endedAt, row.timezone) : null,
    description: row.description,
    source: row.source,
    locked: Boolean(row.lockedByTimesheetRevisionId),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * One entry of this member's own, by id.
 *
 * `findFirst` with `memberId` in the `where` rather than `findUnique` on the id: an id alone would
 * read any member's row and leave "is it mine?" to the caller, which is the kind of check that gets
 * forgotten. Here a foreign id is simply not found, which is also what a caller should be told.
 *
 * `includeDeleted` exists for the restore path, which by definition looks at a soft-deleted row.
 * Every other caller leaves it off and cannot see one.
 */
export async function getMemberTimeEntry(
  input: { memberId: string; timeEntryId: string; includeDeleted?: boolean },
  deps: { db?: TimeEntryQueryClient } = {},
): Promise<MemberTimeEntryRow | null> {
  const db = deps.db ?? (prisma as unknown as TimeEntryQueryClient);

  const row = await db.timeEntry.findFirst({
    where: {
      id: input.timeEntryId,
      memberId: input.memberId,
      ...(input.includeDeleted ? {} : { deletedAt: null }),
    },
    select: timeEntryRowSelect,
  });

  return row ? mapMemberTimeEntryRow(row) : null;
}
