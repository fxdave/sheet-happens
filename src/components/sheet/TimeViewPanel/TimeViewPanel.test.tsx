import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarDays, LayoutGrid, List } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { TimeViewPanel } from ".";

const tabs = [
  { value: "days", label: "Days", icon: List, shortcut: "1", href: "/time?view=days" },
  { value: "weeks", label: "Weeks", icon: CalendarDays, shortcut: "2", href: "/time?view=weeks" },
  { value: "months", label: "Months", icon: LayoutGrid, shortcut: "3", href: "/time?view=months" },
];

describe("TimeViewPanel", () => {
  it("renders the views as links in order, the active one marked current", () => {
    render(
      <TimeViewPanel tabs={tabs} value="weeks" labels={{ tabs: "View" }} total={<span>8 h</span>}>
        <p>Body</p>
      </TimeViewPanel>,
    );

    const nav = screen.getByRole("navigation", { name: "View" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(tabs.map((tab) => tab.href));
    expect(within(nav).getByRole("link", { name: /Weeks/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: /Days/ })).not.toHaveAttribute("aria-current");
  });

  it("hands tab clicks to the screen and marks the body busy while it navigates", async () => {
    const user = userEvent.setup();
    const onTabClick = vi.fn((_value: string, event: { preventDefault: () => void }) =>
      event.preventDefault(),
    );
    render(
      <TimeViewPanel
        tabs={tabs}
        value="days"
        labels={{ tabs: "View" }}
        total={<span>8 h</span>}
        pending
        onTabClick={onTabClick}
      >
        <p>Body</p>
      </TimeViewPanel>,
    );

    await user.click(screen.getByRole("link", { name: /Months/ }));
    expect(onTabClick).toHaveBeenCalledWith("months", expect.anything());
    expect(screen.getByText("Body").parentElement).toHaveAttribute("aria-busy", "true");
  });

  it("drops the tab strip when there is only one view", () => {
    render(
      <TimeViewPanel tabs={tabs.slice(2)} value="months" labels={{ tabs: "View" }} total={null}>
        <p>Body</p>
      </TimeViewPanel>,
    );

    expect(screen.queryByRole("navigation", { name: "View" })).toBeNull();
  });
});
