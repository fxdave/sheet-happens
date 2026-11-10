import { requireApiTokenScope } from "@/src/server/api-tokens";
import {
  apiJson,
  handleApiRequest,
  parseMonthPathParam,
  requireContractor,
} from "@/src/server/rest-api";
import { getContractorTimesheetStatus } from "@/src/server/timesheets";

type TimesheetRouteContext = { params: Promise<{ month: string }> };

export async function GET(request: Request, { params }: TimesheetRouteContext) {
  return handleApiRequest(request, "[api/v1] timesheet read failed", async (actor) => {
    requireApiTokenScope(actor, "timesheets:read");

    const periodStart = parseMonthPathParam((await params).month);

    requireContractor(actor);

    return apiJson(await getContractorTimesheetStatus({ memberId: actor.member.id, periodStart }));
  });
}
