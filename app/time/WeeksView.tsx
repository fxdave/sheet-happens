"use client";

import { useLocale } from "next-intl";
import { useState, useTransition } from "react";

import { MonthCalendar } from "@/src/components/sheet/MonthCalendar";
import type {
  MemberMonthCalendar,
  MemberMonthOverview,
  TimeGridWeek,
} from "@/src/server/time-tracking";

import { loadMonthCalendarAction } from "./actions";
import { DeclaredMonthSection } from "./DeclaredMonthSection";
import type { TimeViewActions } from "./TimePageClient";
import { useDurationFormatting } from "./use-duration-formatting";
import { shiftMonthStartIso, type TimeView } from "./view";

type WeeksViewProps = {
  /** The frame's week, for its locks; the calendar carries everything the body draws. */
  week: TimeGridWeek;
  calendar: MemberMonthCalendar;
  /** The month overview, loaded only for a hybrid member: its declared projects. */
  month: MemberMonthOverview | null;
  actions: TimeViewActions;
  onNavigate: (view: TimeView, day: string | null) => void;
};

/**
 * The Weeks tab: one calendar month by ISO week. A day opens Days anchored there; on a phone the
 * list loads earlier months as it scrolls. A hybrid member's declarations sit underneath.
 */
export function WeeksView({ week, calendar, month, actions, onNavigate }: WeeksViewProps) {
  const locale = useLocale();
  const { durationDisplayFormat } = useDurationFormatting();
  const [earlier, setEarlier] = useState<MemberMonthCalendar[]>([]);
  const [hasMore, setHasMore] = useState(calendar.hasEarlier);
  const [loadingMore, startLoading] = useTransition();
  const monthLocked =
    week.lockedMonthStarts.includes(calendar.monthStart) ||
    calendar.weeks.some((row) => row.days.some((day) => day.inMonth && day.locked));

  function loadEarlier() {
    if (loadingMore || !hasMore) return;
    const oldest = earlier.at(-1) ?? calendar;

    startLoading(async () => {
      const result = await loadMonthCalendarAction({
        monthStart: shiftMonthStartIso(oldest.monthStart, -1),
      });

      if (result.status !== "success") {
        setHasMore(false);
        actions.notifyResult(result);
        return;
      }

      setEarlier((loaded) => [...loaded, result.calendar]);
      setHasMore(result.calendar.hasEarlier);
    });
  }

  return (
    <div className="min-w-0">
      <div className="min-w-0 p-2.5 md:p-0">
        <MonthCalendar
          calendar={calendar}
          earlierCalendars={earlier}
          locale={locale}
          durationDisplayFormat={durationDisplayFormat}
          onSelectDay={(isoDate) => onNavigate("days", isoDate)}
          onReachEnd={loadEarlier}
          loadingMore={loadingMore}
          hasMore={hasMore}
        />
      </div>

      {month ? (
        <DeclaredMonthSection month={month} monthLocked={monthLocked} actions={actions} />
      ) : null}
    </div>
  );
}
