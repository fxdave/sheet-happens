import { z } from "zod";

import { recordApiTokenCrossMemberRead, requireApiTokenScope } from "@/src/server/api-tokens";
import {
  apiJson,
  handleApiRequest,
  HOURS_QUERY_LIMITS,
  inclusiveDaySpan,
  RestApiError,
  validationError,
} from "@/src/server/rest-api";
import {
  listMemberTimeEntries,
  listTimeEntriesAcrossMembers,
  parseDateOnly,
  sumTimeEntries,
} from "@/src/server/time-tracking";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

const querySchema = z
  .object({
    from: isoDate,
    to: isoDate,
    memberId: z
      .array(z.union([z.literal("all"), z.string().uuid()]))
      .max(HOURS_QUERY_LIMITS.maxMemberIds)
      .refine((ids) => !ids.includes("all") || ids.length === 1, {
        message: '"all" cannot be combined with member ids.',
      }),
    projectId: z.string().uuid().optional(),
    includeDeclared: z.enum(["true", "false"]).optional(),
    cursor: z.string().min(1).max(512).optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(HOURS_QUERY_LIMITS.pageSizeMax)
      .default(HOURS_QUERY_LIMITS.pageSize),
  })
  .refine((query) => query.to >= query.from, {
    message: "`to` must not be earlier than `from`.",
    path: ["to"],
  });

export async function GET(request: Request) {
  return handleApiRequest(request, "[api/v1] hours read failed", async (actor) => {
    const params = new URL(request.url).searchParams;
    const parsed = querySchema.safeParse({
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      // Repeatable and comma-separated: `memberId=a&memberId=b` and `memberId=a,b` both work.
      memberId: params
        .getAll("memberId")
        .flatMap((value) => value.split(","))
        .filter(Boolean),
      projectId: params.get("projectId") ?? undefined,
      includeDeclared: params.get("includeDeclared") ?? undefined,
      cursor: params.get("cursor") ?? undefined,
      limit: params.get("limit") ?? undefined,
    });

    if (!parsed.success) throw validationError(parsed.error);

    const query = parsed.data;
    const span = inclusiveDaySpan(query.from, query.to);

    if (span > HOURS_QUERY_LIMITS.rangeDays) {
      throw new RestApiError(
        400,
        "RANGE_TOO_LARGE",
        `A range may span at most ${HOURS_QUERY_LIMITS.rangeDays} days; this one spans ${span}.`,
        { details: { requestedDays: span, maxDays: HOURS_QUERY_LIMITS.rangeDays } },
      );
    }

    const members: string[] | "all" =
      query.memberId[0] === "all" ? "all" : [...new Set(query.memberId)];
    const ownOnly = members !== "all" && members.every((id) => id === actor.member.id);
    const filter = {
      from: parseDateOnly(query.from),
      to: parseDateOnly(query.to),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      includeDeclared: query.includeDeclared === "true",
    };
    const page = { ...(query.cursor ? { cursor: query.cursor } : {}), limit: query.limit };

    if (ownOnly) {
      requireApiTokenScope(actor, "hours:read");

      const [list, rangeTotals] = await Promise.all([
        listMemberTimeEntries({ memberId: actor.member.id, ...filter, ...page }),
        sumTimeEntries({ members: [actor.member.id], ...filter }),
      ]);

      return apiJson({
        range: list.range,
        entries: list.entries.map((entry) => ({
          ...entry,
          memberId: actor.member.id,
          memberName: actor.member.displayName,
        })),
        totals: { page: list.totals, range: rangeTotals },
        nextCursor: list.nextCursor,
      });
    }

    requireApiTokenScope(actor, "hours:read:all");

    const [list, rangeTotals] = await Promise.all([
      listTimeEntriesAcrossMembers({ members, ...filter, ...page }),
      sumTimeEntries({ members, ...filter }),
    ]);

    await recordApiTokenCrossMemberRead(actor, {
      memberIds: members,
      from: query.from,
      to: query.to,
      ...(query.projectId ? { projectId: query.projectId } : {}),
    });

    return apiJson({
      range: list.range,
      entries: list.entries,
      totals: { page: list.totals, range: rangeTotals },
      nextCursor: list.nextCursor,
    });
  });
}
