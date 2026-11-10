import { AppShell } from "@/src/components/layout/AppShell";
import {
  mapMemberToShellProfile,
  mapMemberToShellRole,
  mapMemberToShellUser,
  requireActiveAppMember,
} from "@/src/server/auth/app-access";
import {
  getMemberMonthOverview,
  getMemberTimeDays,
  getMemberWeeklyTimeGrid,
  getMonday,
  getMonthStart,
  parseDateOnly,
  TimeTrackingDateError,
} from "@/src/server/time-tracking";

import { TimePageClient, type TimePageData } from "./TimePageClient";
import { clampView, resolveTimeLocation, resolveViewStops, type TimeView } from "./view";

export const dynamic = "force-dynamic";

type TimePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TimePage({ searchParams }: TimePageProps) {
  const { member } = await requireActiveAppMember("/time");
  const location = resolveTimeLocation((await searchParams) ?? {});
  const data = await loadView(member.id, location.view, parseAnchor(location.day));

  return (
    <AppShell
      current="time"
      role={mapMemberToShellRole(member)}
      profile={mapMemberToShellProfile(member)}
      user={mapMemberToShellUser(member)}
      // The period bar carries the timer here; a second pill in the header would repeat it.
      timer={null}
    >
      <section className="mx-auto w-full max-w-[73.75rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:max-w-[92rem]">
        <TimePageClient data={data} durationDisplayFormat={member.durationDisplayFormat} />
      </section>
    </AppShell>
  );
}

/** Only the open view's data is loaded; switching tabs is a navigation. */
async function loadView(
  memberId: string,
  view: TimeView,
  anchor: Date | null,
): Promise<TimePageData> {
  if (view === "days") {
    const days = await getMemberTimeDays({ memberId, endDay: anchor });
    // A declared-only member has no day log; the month is their whole screen.
    if (clampView(view, resolveViewStops(days.projects)) === "days") return { view, days };
  }

  const week = await getMemberWeeklyTimeGrid({
    memberId,
    weekStart: anchor ? getMonday(anchor) : null,
  });

  if (view === "weeks" && clampView(view, resolveViewStops(week.projects)) === "weeks") {
    return { view, week };
  }

  const month = await getMemberMonthOverview({
    memberId,
    monthStart: getMonthStart(anchor ?? parseDateOnly(week.todayIso)),
  });

  return { view: "months", week, month };
}

function parseAnchor(value: string | null) {
  if (!value) return null;

  try {
    return parseDateOnly(value);
  } catch (error) {
    if (error instanceof TimeTrackingDateError) return null;
    throw error;
  }
}
