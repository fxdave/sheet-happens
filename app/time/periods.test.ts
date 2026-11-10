import { describe, expect, it } from "vitest";

import { buildYearOverview } from "@/src/server/time-tracking";

import { predictPeriod, yearPeriod } from "./periods";
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

describe("predictPeriod", () => {
  const today = { todayIso: "2026-11-10", declaredOnly: false };

  it("predicts the Days fortnight, clamping a future anchor to today", () => {
    expect(predictPeriod({ view: "days", day: null }, today, t, "en")).toMatchObject({
      label: "Nov 2 – 15, 2026",
      key: "2026-11-02",
      atToday: true,
      nextDisabled: true,
    });
    expect(predictPeriod({ view: "days", day: "2027-01-04" }, today, t, "en").key).toBe(
      "2026-11-02",
    );
    expect(predictPeriod({ view: "days", day: "2026-10-27" }, today, t, "en")).toMatchObject({
      label: "Oct 19 – Nov 1, 2026",
      atToday: false,
      nextDisabled: false,
    });
  });

  it("predicts the Weeks month and stops at the current one", () => {
    expect(predictPeriod({ view: "weeks", day: "2026-09-14" }, today, t, "en")).toMatchObject({
      label: "September 2026",
      atToday: false,
      nextDisabled: false,
    });
    expect(predictPeriod({ view: "weeks", day: null }, today, t, "en").nextDisabled).toBe(true);
  });

  it("agrees with the year period the data produces", () => {
    for (const value of [2024, 2026]) {
      const actual = yearPeriod(year(value), t);
      const predicted = predictPeriod({ view: "months", day: `${value}-01-01` }, today, t, "en");

      expect(predicted).toMatchObject({
        label: actual.label,
        key: actual.key,
        atToday: actual.atToday,
        nextDisabled: actual.nextDay === null,
        month: actual.month,
        totalCaption: actual.totalCaption,
      });
    }
  });

  it("predicts a month for a declared-only member's Months", () => {
    expect(
      predictPeriod(
        { view: "months", day: "2026-08-03" },
        { ...today, declaredOnly: true },
        t,
        "en",
      ),
    ).toMatchObject({ label: "August 2026", nextDisabled: false });
  });
});
