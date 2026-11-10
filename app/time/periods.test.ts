import { describe, expect, it } from "vitest";

import { buildYearOverview } from "@/src/server/time-tracking";

import { yearPeriod } from "./periods";
import type { TimeTrackingTranslator } from "./time-entry-helpers";

const t = ((key: string) => key) as unknown as TimeTrackingTranslator;

function year(value: number) {
  return buildYearOverview({
    year: value,
    todayIso: "2026-11-10",
    timezone: "UTC",
    profile: "CONTRACTOR",
    dayTotals: [{ isoDate: `${value}-03-02`, minutes: 480, entryCount: 1 }],
    declarations: [],
    timesheets: [],
    lockedMonthStarts: new Set(),
    leaves: [],
  });
}

describe("yearPeriod", () => {
  it("steps a year back and stops forward at the current year", () => {
    expect(yearPeriod(year(2026), t)).toMatchObject({
      label: "2026",
      previousDay: "2025-01-01",
      nextDay: null,
      atToday: true,
      month: "2026-11",
      totalMinutes: 480,
      totalCaption: "total.year",
    });
  });

  it("steps forward from an earlier year and captions its total plainly", () => {
    const period = yearPeriod(year(2024), t);

    expect(period).toMatchObject({
      nextDay: "2025-01-01",
      atToday: false,
      month: "2024-01",
      totalCaption: "total.yearPast",
    });
    expect(period.dayForMonth("2024-07")).toBe("2024-07-01");
  });
});
