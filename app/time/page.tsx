import { AppShell } from "@/src/components/layout/AppShell";
import {
  mapMemberToShellProfile,
  mapMemberToShellRole,
  mapMemberToShellUser,
  requireActiveAppMember,
} from "@/src/server/auth/app-access";
import {
  getMemberMonthCalendar,
  getMemberMonthOverview,
  getMemberTimeDays,
  getMemberTimeFrame,
  getMemberYearOverview,
  getMonthStart,
  getTodayIsoInTimezone,
  parseDateOnly,
  TimeTrackingDateError,
} from "@/src/server/time-tracking";

import { TimePageClient, type TimePageData } from "./TimePageClient";
import { clampView, resolveTimeLocation, resolveViewStops, type TimeView } from "./view";

export const dynamic = "force-dynamic";
/** Seconds a visited tab or period is reused on the client; mutations evict it at once. */
export const unstable_dynamicStaleTime = 30;

type TimePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TimePage({ searchParams }: TimePageProps) {
  const [{ member }, params] = await Promise.all([
    requireActiveAppMember("/time"),
    searchParams ?? Promise.resolve({}),
  ]);
  const location = resolveTimeLocation(params);
  const data = await loadView(member, location.view, parseAnchor(location.day));

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

/**
 * Only the open view's data is loaded, beside the frame's (assignments, timer, draft) rather than
 * after it. Which view a member may have depends on those assignments, so the rare fallbacks — a
 * declared-only member — load their month once the frame has said so.
 */
async function loadView(
  member: { id: string; timezone: string },
  view: TimeView,
  anchor: Date | null,
): Promise<TimePageData> {
  const memberId = member.id;
  const today = parseDateOnly(getTodayIsoInTimezone(member.timezone));
  const anchorDay = anchor ?? today;

  if (view === "days") {
    const days = await getMemberTimeDays({ memberId, endDay: anchor });
    if (clampView(view, resolveViewStops(days.projects)) === "days") return { view, days };
  }

  const framePromise = getMemberTimeFrame({ memberId, anchor });

  if (view === "weeks") {
    const currentMonth = getMonthStart(today);
    const anchorMonth = getMonthStart(anchorDay);
    // A future month has nothing to show; it reads as this one, as a future day does in Days.
    const monthStart = anchorMonth > currentMonth ? currentMonth : anchorMonth;
    // Started with the calendar so a hybrid member's declarations do not wait for the frame.
    const monthPromise = getMemberMonthOverview({ memberId, monthStart });
    monthPromise.catch(() => {});
    const [frame, calendar] = await Promise.all([
      framePromise,
      getMemberMonthCalendar({ memberId, monthStart }),
    ]);

    if (clampView(view, resolveViewStops(frame.projects)) === "weeks") {
      const hybrid = frame.projects.some((project) => project.trackingMode === "DECLARED");
      return { view, frame, calendar, month: hybrid ? await monthPromise : null };
    }
  }

  // A future year has nothing to show; the period bar's forward arrow stops at this one.
  const year = Math.min(anchorDay.getUTCFullYear(), today.getUTCFullYear());
  const yearPromise = getMemberYearOverview({ memberId, year });
  yearPromise.catch(() => {});
  const frame = await framePromise;

  if (!resolveViewStops(frame.projects).includes("days")) {
    const month = await getMemberMonthOverview({ memberId, monthStart: getMonthStart(anchorDay) });
    return { view: "months", frame, layout: "declared", month };
  }

  return { view: "months", frame, layout: "year", year: await yearPromise };
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
