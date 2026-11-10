import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import en from "@/messages/en.json";
import { MonthCalendar } from ".";
import { currentMonth, emptyMonth, previousMonth } from "./MonthCalendar.fixtures";
import type { MonthCalendarData } from "./MonthCalendar.types";

function wrap(children: ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      {children}
    </NextIntlClientProvider>
  );
}

function withEntries(calendar: MonthCalendarData, isoDate: string, count: number) {
  return {
    ...calendar,
    weeks: calendar.weeks.map((week) => ({
      ...week,
      totalMinutes: week.days.some((day) => day.isoDate === isoDate)
        ? week.totalMinutes + count * 60
        : week.totalMinutes,
      days: week.days.map((day) =>
        day.isoDate === isoDate
          ? {
              ...day,
              totalMinutes: count * 60,
              entries: Array.from({ length: count }, (_, index) => ({
                id: `e${index}`,
                description: `Task ${index + 1}`,
                projectId: "atlas",
                projectName: "Atlas Platform",
                projectColor: "#37e3de",
                durationMinutes: 60,
                startTime: null,
              })),
            }
          : day,
      ),
    })),
  };
}

describe("MonthCalendar grid", () => {
  it("names each day uniquely and reports a click on it", async () => {
    const onSelectDay = vi.fn();
    const calendar = withEntries(emptyMonth, "2026-11-04", 2);
    render(
      wrap(
        <MonthCalendar
          calendar={calendar}
          layout="grid"
          locale="en"
          durationDisplayFormat="DECIMAL_HOURS"
          onSelectDay={onSelectDay}
        />,
      ),
    );

    await userEvent.click(screen.getByRole("button", { name: "Wednesday, November 4, 2 hours" }));
    expect(onSelectDay).toHaveBeenCalledWith("2026-11-04");

    const names = screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"));
    expect(names).toHaveLength(42);
    expect(new Set(names).size).toBe(42);
    expect(
      screen.getByRole("button", { name: "Monday, November 2, nothing logged" }),
    ).toBeVisible();
  });

  it("folds entries past three into '+N more', which opens the day", async () => {
    const onSelectDay = vi.fn();
    render(
      wrap(
        <MonthCalendar
          calendar={withEntries(emptyMonth, "2026-11-05", 5)}
          layout="grid"
          locale="en"
          durationDisplayFormat="DECIMAL_HOURS"
          onSelectDay={onSelectDay}
        />,
      ),
    );

    const cell = screen.getByRole("button", { name: "Thursday, November 5, 5 hours" });
    expect(within(cell).getByText("Task 3")).toBeInTheDocument();
    expect(within(cell).queryByText("Task 4")).not.toBeInTheDocument();

    await userEvent.click(within(cell).getByText("+2 more"));
    expect(onSelectDay).toHaveBeenCalledWith("2026-11-05");
  });

  it("labels each week with its number and total", () => {
    render(
      wrap(
        <MonthCalendar
          calendar={withEntries(emptyMonth, "2026-11-10", 3)}
          layout="grid"
          locale="en"
          durationDisplayFormat="DECIMAL_HOURS"
          onSelectDay={() => {}}
        />,
      ),
    );

    expect(screen.getByRole("group", { name: "Week 46, 3 h" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Week 47, –" })).toBeInTheDocument();
  });
});

describe("MonthCalendar list", () => {
  it("lists weeks and days newest first, without future or empty weekend days", () => {
    render(
      wrap(
        <MonthCalendar
          calendar={currentMonth}
          earlierCalendars={[previousMonth]}
          layout="list"
          locale="en"
          durationDisplayFormat="DECIMAL_HOURS"
          onSelectDay={() => {}}
        />,
      ),
    );

    const weeks = screen.getAllByRole("region").filter((node) => node.tagName === "SECTION");
    const weekNames = weeks.map((week) => week.getAttribute("aria-label")?.split(",")[0]);
    expect(weekNames.slice(0, 3)).toEqual(["Week 46", "Week 45", "Week 44"]);
    // W44 straddles both months and appears once.
    expect(weekNames.filter((name) => name === "Week 44")).toHaveLength(1);

    const days = within(weeks[0]!)
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label")?.split(",")[0]);
    expect(days).toEqual(["Tuesday", "Monday"]);
    expect(screen.queryByRole("button", { name: /November 11/ })).not.toBeInTheDocument();
  });

  it("shows a skeleton while earlier weeks load", () => {
    render(
      wrap(
        <MonthCalendar
          calendar={currentMonth}
          layout="list"
          locale="en"
          durationDisplayFormat="DECIMAL_HOURS"
          onSelectDay={() => {}}
          onReachEnd={() => {}}
          loadingMore
        />,
      ),
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading earlier weeks…");
  });
});
