"use client";

import type { MemberMonthOverview, TimeGridWeek } from "@/src/server/time-tracking";

import { DeclaredMonthSection } from "./DeclaredMonthSection";
import type { TimeViewActions } from "./TimePageClient";

type DeclaredMonthViewProps = {
  /** The week holding the anchor day, for the month's lock. */
  week: TimeGridWeek;
  month: MemberMonthOverview;
  actions: TimeViewActions;
};

/**
 * The Months tab for a declared-only member: one month and its declaration form, since they have
 * no days for the year calendar to shade and no other place to enter hours.
 */
export function DeclaredMonthView({ week, month, actions }: DeclaredMonthViewProps) {
  return (
    <div className="min-w-0 p-3 sm:p-4">
      <DeclaredMonthSection
        month={month}
        monthLocked={week.lockedMonthStarts.includes(month.monthStart)}
        actions={actions}
      />
    </div>
  );
}
