"use client";

import { useLocale } from "next-intl";
import { useState, useTransition } from "react";

import { notify } from "@/src/components/sheet/Toast";
import { YearCalendar } from "@/src/components/sheet/YearCalendar";
import type { MemberYearOverview } from "@/src/server/time-tracking";

import { loadYearOverviewAction } from "./actions";
import { useDurationFormatting } from "./use-duration-formatting";
import type { TimeView } from "./view";

type MonthsViewProps = {
  year: MemberYearOverview;
  onNavigate: (view: TimeView, day: string | null) => void;
};

/**
 * The Months tab: the year calendar, with earlier years appended below as the end scrolls into
 * view. Keyed by year in the frame, so stepping the period starts a fresh stack.
 */
export function MonthsView({ year, onNavigate }: MonthsViewProps) {
  const locale = useLocale();
  const { durationDisplayFormat } = useDurationFormatting();
  const [years, setYears] = useState<MemberYearOverview[]>([year]);
  const [loadingMore, startLoading] = useTransition();
  // The newest of the stack is replaced on refresh; only the appended years are local.
  const stack = [year, ...years.slice(1)];
  const oldest = stack.at(-1) ?? year;

  function loadEarlier() {
    if (loadingMore || !oldest.hasEarlier) return;

    startLoading(async () => {
      const result = await loadYearOverviewAction({ year: oldest.year - 1 });

      if (result.status !== "success") {
        notify("error", result.message);
        return;
      }

      setYears((current) =>
        current.some((entry) => entry.year === result.overview.year)
          ? current
          : [...current, result.overview],
      );
    });
  }

  return (
    <div className="min-w-0 p-3 sm:p-4">
      <YearCalendar
        years={stack}
        locale={locale}
        durationDisplayFormat={durationDisplayFormat}
        loadingMore={loadingMore}
        onReachEnd={oldest.hasEarlier ? loadEarlier : undefined}
        onSelectMonth={(monthStart) => onNavigate("weeks", monthStart)}
        onSelectDay={(isoDate) => onNavigate("days", isoDate)}
      />
    </div>
  );
}
