import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CalendarDays, LayoutGrid, List, Play, Plus } from "lucide-react";
import { expect, within } from "storybook/test";

import { TimeViewPanel } from ".";
import { Button } from "../../ui/Button";
import { DayLog } from "../DayLog";
import { dayLogLabels, dayLogWeeks } from "../DayLog/DayLog.fixtures";
import { PeriodNavigator } from "../PeriodNavigator";

const tabs = [
  { value: "days", label: "Days", icon: List, shortcut: "1", href: "/time?view=days" },
  { value: "weeks", label: "Weeks", icon: CalendarDays, shortcut: "2", href: "/time?view=weeks" },
  { value: "months", label: "Months", icon: LayoutGrid, shortcut: "3", href: "/time?view=months" },
];

const noop = () => {};

const navigator = (
  <PeriodNavigator
    label="Nov 2 – 15, 2026"
    periodKey="2026-11-02"
    direction={0}
    atToday
    month="2026-11"
    locale="en"
    labels={{
      previous: "Previous 2 weeks",
      next: "Next 2 weeks",
      today: "Today",
      atToday: "You are on today",
      pick: "Jump to a month",
      monthPicker: {},
    }}
    onPrevious={noop}
    onNext={noop}
    onToday={noop}
    onPickMonth={noop}
  />
);

const total = (
  <p className="flex items-baseline gap-1.5 whitespace-nowrap">
    <span className="font-ui text-xl font-bold tabular-nums">46.3 h</span>
    <span className="font-ui text-xs text-muted-foreground">2 weeks</span>
  </p>
);

const runningPill = (
  <div className="inline-flex h-10 max-w-full min-w-0 items-center gap-2 rounded-[var(--radius-pill)] border border-accent-line bg-accent-soft pr-3 pl-3 text-sm sm:max-w-[18rem]">
    <span className="size-2.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
    <span className="shrink-0 font-ui font-bold tabular-nums text-accent">1:12:40</span>
    <span className="min-w-0 truncate text-xs font-medium">
      Kovács-Szentgyörgyi Ingatlankezelő és Vagyonkezelő Kft.
    </span>
  </div>
);

/** The `/time` frame: folder tabs on the panel's top edge, the period bar, then the view. */
const meta = {
  title: "Sheet/TimeViewPanel",
  component: TimeViewPanel,
  args: {
    tabs,
    value: "days",
    labels: { tabs: "View", zoomHint: "zoom out" },
    navigator,
    total,
    timer: (
      <Button type="button" variant="ghost" icon={Play}>
        Start timer
      </Button>
    ),
    action: (
      <Button type="button" variant="ghost" icon={Plus} className="border border-border">
        Entry
      </Button>
    ),
    children: (
      <DayLog
        weeks={dayLogWeeks}
        capacityMinutes={480}
        locale="en"
        durationDisplayFormat="DECIMAL_HOURS"
        labels={dayLogLabels}
        onAddEntry={noop}
        onEditEntry={noop}
        onDeleteEntry={noop}
        onContinueEntry={noop}
        onStopTimer={noop}
      />
    ),
  },
} satisfies Meta<typeof TimeViewPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Days: Story = {
  play: async ({ canvasElement }) => {
    const nav = within(canvasElement).getByRole("navigation", { name: "View" });
    await expect(within(nav).getByRole("link", { name: /Days/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(within(nav).getAllByRole("link")).toHaveLength(3);
  },
};

export const DaysLight: Story = { globals: { theme: "light" } };

export const RunningTimer: Story = { args: { timer: runningPill } };

export const Weeks: Story = {
  args: { value: "weeks", children: <p className="p-6 text-sm">The Weeks body.</p> },
};

/** One row: total left, the pill right and truncating; no navigator, no `+ Entry`, no chips. */
export const Phone: Story = {
  args: { timer: runningPill },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

export const PhoneLight: Story = { ...Phone, globals: { theme: "light" } };

export const Pending: Story = { args: { pending: true } };

/** A declared-only member has one view, so there is no tab strip at all. */
export const SingleView: Story = { args: { tabs: tabs.slice(2), value: "months" } };
