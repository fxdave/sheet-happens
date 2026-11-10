import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DayLog } from ".";
import {
  dayLogLabels,
  dayLogRunningTimer,
  dayLogWeeks,
  lockedDayLogWeeks,
  LONG_DESCRIPTION,
} from "./DayLog.fixtures";
import type { DayLogProps } from "./DayLog.types";

function renderLog(overrides: Partial<DayLogProps> = {}) {
  const handlers = {
    onAddEntry: vi.fn(),
    onEditEntry: vi.fn(),
    onDeleteEntry: vi.fn(),
    onContinueEntry: vi.fn(),
    onStopTimer: vi.fn(),
    onLoadMore: vi.fn(),
  };

  render(
    <DayLog
      weeks={dayLogWeeks}
      capacityMinutes={480}
      locale="en"
      durationDisplayFormat="DECIMAL_HOURS"
      labels={dayLogLabels}
      {...handlers}
      {...overrides}
    />,
  );

  return handlers;
}

describe("DayLog", () => {
  it("groups days under their week, newest first, each a named region", () => {
    renderLog();

    const headings = screen.getAllByRole("heading", { level: 2 }).map((item) => item.textContent);
    expect(headings).toEqual(["Week 46 · Nov 9 – 15", "Week 45 · Nov 2 – 8"]);

    const monday = screen.getByRole("region", { name: "Monday, November 9, 2026" });
    expect(within(monday).getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByRole("region", { name: "Tuesday, November 10, 2026, Today" })).toBeVisible();
  });

  it("collapses an empty weekend, warns on an empty workday and says when a day is leave", () => {
    renderLog();

    const sunday = screen.getByRole("region", { name: "Sunday, November 8, 2026" });
    expect(within(sunday).queryByRole("list")).toBeNull();
    expect(within(sunday).queryByText("Nothing logged")).toBeNull();

    const monday = screen.getByRole("region", { name: "Monday, November 2, 2026" });
    expect(within(monday).getByText("Nothing logged on a workday")).toBeVisible();

    const leave = screen.getByRole("region", { name: "Thursday, November 5, 2026" });
    expect(within(leave).getByText("On leave")).toBeVisible();
    expect(within(leave).queryByRole("button", { name: /^Add entry/ })).toBeNull();
  });

  it("shows a duration-only entry's range as a dash", () => {
    renderLog();

    const row = screen.getByRole("button", { name: "Edit Schema review call" }).closest("li");
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getAllByText("—").length).toBeGreaterThan(0);
  });

  it("opens the edit dialog from the row and continues an entry with ▷", async () => {
    const user = userEvent.setup();
    const handlers = renderLog();

    await user.click(screen.getByRole("button", { name: `Edit ${LONG_DESCRIPTION}` }));
    expect(handlers.onEditEntry).toHaveBeenCalledWith(
      expect.objectContaining({ description: LONG_DESCRIPTION }),
    );

    await user.click(screen.getByRole("button", { name: "Continue Sprint planning" }));
    expect(handlers.onContinueEntry).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Sprint planning", projectName: "Atlas Platform" }),
    );
  });

  it("deletes through the row menu", async () => {
    const user = userEvent.setup();
    const handlers = renderLog();

    await user.click(screen.getByRole("button", { name: "More actions for Sprint planning" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete Sprint planning" }));

    expect(handlers.onDeleteEntry).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Sprint planning" }),
    );
  });

  it("puts the running timer first in today, with a stop button", async () => {
    const user = userEvent.setup();
    const handlers = renderLog({ runningTimer: dayLogRunningTimer });

    const today = screen.getByRole("region", { name: "Tuesday, November 10, 2026, Today" });
    const rows = within(today).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("1:12:40");
    expect(rows[0]).toHaveTextContent("13:15–now");

    await user.click(within(rows[0] as HTMLElement).getByRole("button", { name: "Stop timer" }));
    expect(handlers.onStopTimer).toHaveBeenCalled();
  });

  it("keeps locked entries read-only but still lets them be continued", async () => {
    const user = userEvent.setup();
    const handlers = renderLog({ weeks: lockedDayLogWeeks });

    expect(screen.queryByRole("button", { name: /^Edit / })).toBeNull();
    expect(screen.queryByRole("button", { name: /^More actions/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Add entry/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Continue Sprint planning" }));
    expect(handlers.onContinueEntry).toHaveBeenCalled();
  });

  it("offers earlier weeks at the end and shows a skeleton while they load", async () => {
    const user = userEvent.setup();
    const handlers = renderLog({ hasMore: true });

    await user.click(screen.getByRole("button", { name: "Scroll for earlier weeks" }));
    expect(handlers.onLoadMore).toHaveBeenCalled();
  });

  it("adds an entry on a day from its header", async () => {
    const user = userEvent.setup();
    const handlers = renderLog();

    await user.click(screen.getByRole("button", { name: "Add entry on Sunday, November 8, 2026" }));
    expect(handlers.onAddEntry).toHaveBeenCalledWith(
      expect.objectContaining({ isoDate: "2026-11-08" }),
    );
  });
});
