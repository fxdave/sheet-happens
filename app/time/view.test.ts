import { describe, expect, it } from "vitest";

import {
  buildTimeHref,
  clampView,
  isWeekendIso,
  resolveMonthAnchorIso,
  resolveTimeLocation,
  resolveTimeShortcut,
  resolveViewStops,
  resolveWeekStartIso,
  shiftIsoDate,
  shiftMonthStartIso,
  suppressesTimeShortcut,
  timeViews,
} from "./view";

function keystroke(
  key: string,
  overrides: Partial<{
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    target: EventTarget | null;
  }> = {},
) {
  return { key, ctrlKey: false, metaKey: false, altKey: false, target: null, ...overrides };
}

describe("resolveTimeLocation", () => {
  it("opens Days on today with nothing in the URL", () => {
    expect(resolveTimeLocation({})).toEqual({ view: "days", day: null });
  });

  it("reads the view and the anchor day", () => {
    expect(resolveTimeLocation({ view: "weeks", day: "2026-11-03" })).toEqual({
      view: "weeks",
      day: "2026-11-03",
    });
    expect(resolveTimeLocation({ view: "months", day: "nonsense" })).toEqual({
      view: "months",
      day: null,
    });
  });

  it.each([
    [{ scope: "day" }, "days"],
    [{ scope: "week" }, "days"],
    [{ scope: "week", lens: "agenda" }, "days"],
    [{ scope: "week", lens: "grid" }, "weeks"],
    [{ lens: "grid" }, "weeks"],
    [{ scope: "month" }, "months"],
    [{ zoom: "day" }, "days"],
    [{ zoom: "week" }, "days"],
    [{ zoom: "grid" }, "weeks"],
    [{ zoom: "month" }, "months"],
    [{ zoom: "bogus" }, "days"],
  ] as const)("maps the legacy link %o to %s", (params, view) => {
    expect(resolveTimeLocation(params).view).toBe(view);
  });

  it("anchors an old ?week= link on that week, and lets ?day= win", () => {
    expect(resolveTimeLocation({ week: "2025-03-03" })).toEqual({
      view: "days",
      day: "2025-03-03",
    });
    expect(resolveTimeLocation({ week: "2025-03-03", day: "2025-03-05", scope: "day" })).toEqual({
      view: "days",
      day: "2025-03-05",
    });
  });

  it("takes the first of a repeated param", () => {
    expect(resolveTimeLocation({ view: ["months", "days"] }).view).toBe("months");
  });
});

describe("resolveViewStops", () => {
  it("gives every view to tracked, hybrid and unassigned members", () => {
    expect(resolveViewStops([])).toEqual(timeViews);
    expect(resolveViewStops([{ trackingMode: "TRACKED" }, { trackingMode: "DECLARED" }])).toEqual(
      timeViews,
    );
  });

  it("gives a declared-only member the month alone", () => {
    const stops = resolveViewStops([{ trackingMode: "DECLARED" }]);

    expect(stops).toEqual(["months"]);
    expect(clampView("days", stops)).toBe("months");
  });
});

describe("hrefs and dates", () => {
  it("builds canonical links", () => {
    expect(buildTimeHref("days")).toBe("/time?view=days");
    expect(buildTimeHref("weeks", "2026-11-03")).toBe("/time?view=weeks&day=2026-11-03");
  });

  it("does date arithmetic over UTC", () => {
    expect(shiftIsoDate("2026-11-10", -14)).toBe("2026-10-27");
    expect(resolveWeekStartIso("2026-11-15")).toBe("2026-11-09");
    expect(shiftMonthStartIso("2026-12-01", 1)).toBe("2027-01-01");
    expect(isWeekendIso("2026-11-08")).toBe(true);
    expect(isWeekendIso("2026-11-09")).toBe(false);
  });

  it("anchors a picked month on its last day, never past today", () => {
    expect(resolveMonthAnchorIso("2026-02", "2026-11-10")).toBe("2026-02-28");
    expect(resolveMonthAnchorIso("2026-11", "2026-11-10")).toBe("2026-11-10");
  });
});

describe("resolveTimeShortcut", () => {
  it("maps digits to the member's own views", () => {
    expect(resolveTimeShortcut(keystroke("1"), timeViews)).toEqual({ type: "view", view: "days" });
    expect(resolveTimeShortcut(keystroke("3"), timeViews)).toEqual({
      type: "view",
      view: "months",
    });
    expect(resolveTimeShortcut(keystroke("2"), ["months"])).toBeNull();
  });

  it("steps the period with the arrows and the J/K aliases", () => {
    expect(resolveTimeShortcut(keystroke("ArrowLeft"), timeViews)).toEqual({
      type: "period",
      direction: "previous",
    });
    expect(resolveTimeShortcut(keystroke("j"), timeViews)).toEqual({
      type: "period",
      direction: "next",
    });
  });

  it("maps the action keys", () => {
    expect(resolveTimeShortcut(keystroke("T"), timeViews)).toEqual({ type: "today" });
    expect(resolveTimeShortcut(keystroke("s"), timeViews)).toEqual({ type: "timer" });
    expect(resolveTimeShortcut(keystroke("n"), timeViews)).toEqual({ type: "compose" });
    expect(resolveTimeShortcut(keystroke("?"), timeViews)).toEqual({ type: "help" });
  });

  it("leaves modified keys and typing alone", () => {
    const input = document.createElement("input");

    expect(resolveTimeShortcut(keystroke("1", { metaKey: true }), timeViews)).toBeNull();
    expect(resolveTimeShortcut(keystroke("t", { target: input }), timeViews)).toBeNull();
  });

  it("treats a menu as owning the keyboard", () => {
    const menu = document.createElement("div");
    menu.setAttribute("role", "menu");
    const item = document.createElement("button");
    menu.append(item);

    expect(suppressesTimeShortcut(item)).toBe(true);
  });
});
