import { requireApiTokenScope } from "@/src/server/api-tokens";
import {
  apiJson,
  handleApiRequest,
  parseMonthPathParam,
  requireContractor,
} from "@/src/server/rest-api";
import { formatDateOnly } from "@/src/server/time-tracking";
import { getContractorTimesheetStatus, submitContractorTimesheet } from "@/src/server/timesheets";

type SubmitTimesheetRouteContext = { params: Promise<{ month: string }> };

export async function POST(request: Request, { params }: SubmitTimesheetRouteContext) {
  return handleApiRequest(request, "[api/v1] timesheet submit failed", async (actor) => {
    requireApiTokenScope(actor, "timesheets:write");

    const periodStart = parseMonthPathParam((await params).month);

    requireContractor(actor);

    const result = await submitContractorTimesheet({
      memberId: actor.member.id,
      actorMemberId: actor.member.id,
      periodStart,
      requestMetadata: actor.requestMetadata,
    });

    return apiJson(
      {
        month: formatDateOnly(periodStart).slice(0, 7),
        status: "SUBMITTED",
        timesheetId: result.timesheetId,
        revisionId: result.revisionId,
        revisionNumber: result.revisionNumber,
        entryCount: result.entryCount,
        totalMinutes: result.totalMinutes,
        totalAmount: result.totalAmount,
        currencyCode: result.currencyCode,
        timesheet: await getContractorTimesheetStatus({ memberId: actor.member.id, periodStart }),
      },
      201,
    );
  });
}
