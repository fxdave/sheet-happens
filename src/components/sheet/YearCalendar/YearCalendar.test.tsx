import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import en from "@/messages/en.json";
import hu from "@/messages/hu.json";

import { buildMonthDays, hourLevel, monthBadge, YearCalendar } from ".";
import { buildYearFixture, currentYear, previousYear } from "./YearCalendar.fixtures";
import type { YearCalendarProps } from "./YearCalendar.types";

function renderCalendar(props: Partial<YearCalendarProps> = {}, locale: "en" | "hu" = "en") {
  const handlers = { onSelectMonth: vi.fn(), onSelectDay: vi.fn() };

  render(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : hu}>
      <YearCalendar
        years={[currentYear]}
        locale={locale}
        durationDisplayFormat="DECIMAL_HOURS"
        {...handlers}
        {...props}
      />
    </NextIntlClientProvider>,
  );

  return handlers;
}

describe("hourLevel", () => {
  it.each([
    [0, 0],
    [1, 1],
    [239, 1],
    [240, 2],
    [479, 2],
    [480, 3],
    [600, 3],
    [601, 4],
    [24 * 60, 4],
  ])("puts %i minutes on level %i", (minutes, level) => {
    expect(hourLevel(minutes)).toBe(level);
  });
});

describe("buildMonthDays", () => {
  it("lays November 2026 out Monday-first and marks today and the future", () => {
    const { leadingBlanks, days } = buildMonthDays({
      monthStart: "2026-11-01",
      todayIso: "2026-11-10",
      minutesByDay: new Map([["2026-11-03", 690]]),
    });

    // 1 November 2026 is a Sunday.
    expect(leadingBlanks).toBe(6);
    expect(days).toHaveLength(30);
    expect(days[0]).toMatchObject({ weekend: true, timing: "past", level: 0 });
    expect(days[2]).toMatchObject({ minutes: 690, level: 4 });
    expect(days[9]?.timing).toBe("today");
    expect(days[10]?.timing).toBe("future");
  });
});

describe("monthBadge", () => {
  const month = currentYear.months[10]!;

  it("prefers a stored status, then Open for a contractor's live month", () => {
    expect(monthBadge({ ...month, timesheetStatus: "paid" }, "CONTRACTOR", "past")).toEqual({
      kind: "status",
      status: "paid",
    });
    expect(monthBadge(month, "CONTRACTOR", "current")).toEqual({ kind: "open" });
    expect(monthBadge({ ...month, totalMinutes: 0 }, "CONTRACTOR", "past")).toBeNull();
    expect(monthBadge(month, "CONTRACTOR", "future")).toBeNull();
    expect(monthBadge(month, "EMPLOYEE", "current")).toBeNull();
  });
});

describe("YearCalendar", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("selects a month from its header button", async () => {
    const user = userEvent.setup();
    const { onSelectMonth } = renderCalendar();

    await user.click(screen.getByRole("button", { name: /^October 2026, .*Nimbus.*Submitted$/ }));

    expect(onSelectMonth).toHaveBeenCalledWith("2026-10-01");
  });

  it("names a month by its hours and status", () => {
    renderCalendar();

    expect(
      screen.getByRole("button", { name: /^November 2026, [\d.]+ hours, Open$/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "December 2026, no hours" })).toBeInTheDocument();
  });

  it("selects a day, and moves between days with the arrow keys", async () => {
    const user = userEvent.setup();
    const { onSelectDay, onSelectMonth } = renderCalendar();
    const november = screen.getByRole("group", { name: "Days of November 2026" });
    const today = within(november).getByRole("button", { name: /November 10, 2026.*today/ });

    expect(today).toHaveAttribute("tabindex", "0");

    await user.click(today);
    expect(onSelectDay).toHaveBeenCalledWith("2026-11-10");
    expect(onSelectMonth).not.toHaveBeenCalled();

    await user.keyboard("{ArrowDown}");
    expect(within(november).getByRole("button", { name: /November 17, 2026/ })).toHaveFocus();

    await user.keyboard("{End}{Enter}");
    expect(onSelectDay).toHaveBeenLastCalledWith("2026-11-30");
  });

  it("shades days by hours and paints a day over 10 h as a warning", () => {
    renderCalendar({
      years: [
        buildYearFixture({
          year: 2026,
          todayIso: "2026-11-10",
          overrides: { "2026-11-03": 690, "2026-11-04": 120 },
        }),
      ],
    });
    const november = screen.getByRole("group", { name: "Days of November 2026" });

    expect(
      within(november).getByRole("button", { name: /November 3, 2026, 11.5 hours/ }),
    ).toHaveAttribute("data-level", "4");
    expect(
      within(november).getByRole("button", { name: /November 4, 2026, 2 hours/ }),
    ).toHaveAttribute("data-level", "1");
    expect(
      within(november).getByRole("button", { name: /November 20, 2026, upcoming/ }),
    ).toHaveAttribute("data-level", "0");
  });

  it("gives employees no timesheet badges", () => {
    renderCalendar({
      years: [buildYearFixture({ year: 2026, todayIso: "2026-11-10", profile: "EMPLOYEE" })],
    });

    expect(screen.queryByText("Open")).not.toBeInTheDocument();
  });

  it("stacks older years under a heading and asks for the next one at the end", async () => {
    const observers: Array<(entries: Array<{ isIntersecting: boolean }>) => void> = [];
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
          observers.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );
    const onReachEnd = vi.fn();

    renderCalendar({ years: [currentYear, previousYear], onReachEnd });

    expect(screen.getByRole("heading", { level: 2, name: "2025" })).toBeVisible();
    observers.at(-1)?.([{ isIntersecting: true }]);
    expect(onReachEnd).toHaveBeenCalledTimes(1);

    await userEvent.setup().click(screen.getByRole("button", { name: "Show 2024" }));
    expect(onReachEnd).toHaveBeenCalledTimes(2);
  });

  it("shows a skeleton while the next year loads", () => {
    renderCalendar({ years: [currentYear], onReachEnd: vi.fn(), loadingMore: true });

    expect(screen.getByRole("status")).toHaveTextContent("Loading 2025…");
    expect(screen.queryByRole("button", { name: "Show 2025" })).not.toBeInTheDocument();
  });

  it("renders Hungarian names and status labels", () => {
    renderCalendar({}, "hu");

    expect(
      screen.getByRole("button", { name: /^2026\. október, .*Beküldve$/ }),
    ).toBeInTheDocument();
  });
});
