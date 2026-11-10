import { z } from "zod";

import { requireApiTokenScope } from "@/src/server/api-tokens";
import {
  apiJson,
  handleApiRequest,
  requireContractor,
  validationError,
} from "@/src/server/rest-api";
import { getTodayIsoInTimezone } from "@/src/server/time-tracking";
import { listContractorTimesheetStatuses } from "@/src/server/timesheets";

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export async function GET(request: Request) {
  return handleApiRequest(request, "[api/v1] timesheet list failed", async (actor) => {
    requireApiTokenScope(actor, "timesheets:read");

    const parsed = querySchema.safeParse({
      year: new URL(request.url).searchParams.get("year") ?? undefined,
    });

    if (!parsed.success) throw validationError(parsed.error);

    requireContractor(actor);

    // Defaults to the current year in the member's own timezone, like the rest of the app.
    const year =
      parsed.data.year ?? Number(getTodayIsoInTimezone(actor.member.timezone).slice(0, 4));

    return apiJson({
      year,
      months: await listContractorTimesheetStatuses({ memberId: actor.member.id, year }),
    });
  });
}
