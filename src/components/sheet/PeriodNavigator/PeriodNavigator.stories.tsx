import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LazyMotion, domMax } from "motion/react";
import { useState } from "react";
import { expect, fn } from "storybook/test";

import { PeriodNavigator } from ".";

const labels = {
  previous: "Previous week",
  next: "Next week",
  today: "Today",
  atToday: "You are on today",
  pick: "Jump to a month",
  monthPicker: {
    previousYear: "Previous year",
    nextYear: "Next year",
    monthGrid: "Select month",
    clear: "Clear",
    thisMonth: "This month",
  },
};

const weeks = [
  { key: "2026-08-24", label: "Week 35 · Aug 24 – 30, 2026" },
  { key: "2026-08-31", label: "Week 36 · Aug 31 – Sep 6, 2026" },
  { key: "2026-09-07", label: "Week 37 · Sep 7 – 13, 2026" },
];

function Demo() {
  const [index, setIndex] = useState(1);
  const [direction, setDirection] = useState<1 | -1 | 0>(0);
  const week = weeks[index] ?? weeks[1];

  return (
    <LazyMotion features={domMax}>
      <PeriodNavigator
        label={week.label}
        periodKey={week.key}
        direction={direction}
        atToday={index === 1}
        month="2026-09"
        locale="en"
        labels={labels}
        shortcuts={{ previous: "K", next: "J", today: "T" }}
        onPrevious={() => {
          setDirection(-1);
          setIndex((current) => Math.max(0, current - 1));
        }}
        onNext={() => {
          setDirection(1);
          setIndex((current) => Math.min(weeks.length - 1, current + 1));
        }}
        onToday={() => {
          setDirection(index > 1 ? -1 : 1);
          setIndex(1);
        }}
        onPickMonth={fn()}
      />
    </LazyMotion>
  );
}

const meta = {
  title: "Sheet/PeriodNavigator",
  component: PeriodNavigator,
  parameters: { layout: "padded" },
  args: {
    label: "Week 36 · Aug 31 – Sep 6, 2026",
    periodKey: "2026-08-31",
    direction: 0,
    atToday: true,
    month: "2026-09",
    locale: "en",
    labels,
    shortcuts: { previous: "K", next: "J", today: "T" },
    onPrevious: fn(),
    onNext: fn(),
    onToday: fn(),
    onPickMonth: fn(),
  },
} satisfies Meta<typeof PeriodNavigator>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The header is the unit: arrows beside a week label can only mean "move a week". */
export const Week: Story = {
  render: () => <Demo />,
  play: async ({ canvas, userEvent }) => {
    const today = canvas.getByRole("button", { name: "Today" });
    await expect(today).toHaveAttribute("aria-disabled", "true");

    await userEvent.click(canvas.getByRole("button", { name: "Next week" }));
    await expect(canvas.getByRole("button", { name: /Week 37/ })).toBeInTheDocument();
    await expect(today).not.toHaveAttribute("aria-disabled");
  },
};

export const Day: Story = {
  args: {
    label: "Monday, Aug 31, 2026",
    labels: { ...labels, previous: "Previous day", next: "Next day" },
    atToday: false,
  },
};

export const Month: Story = {
  args: {
    label: "September 2026",
    labels: { ...labels, previous: "Previous month", next: "Next month" },
  },
};

/** The current month: forward would pass today, so › is disabled. */
export const MonthAtLatest: Story = {
  args: {
    label: "November 2026",
    labels: { ...labels, previous: "Previous month", next: "Next month" },
    atToday: true,
    nextDisabled: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Next month" })).toBeDisabled();
  },
};

/** The label opens a month grid: a date picker changes the date, never the view. */
export const MonthPickerOpen: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /Week 36/ }));
    await expect(
      (await import("storybook/test")).screen.getByRole("grid", { name: "Select month" }),
    ).toBeInTheDocument();
  },
};

export const Hungarian: Story = {
  args: {
    label: "36. hét · 2026. aug. 31. – szept. 6.",
    locale: "hu",
    labels: {
      previous: "Előző hét",
      next: "Következő hét",
      today: "Ma",
      atToday: "A mai napon vagy",
      pick: "Ugrás egy hónapra",
      monthPicker: {
        previousYear: "Előző év",
        nextYear: "Következő év",
        monthGrid: "Hónap választása",
        clear: "Törlés",
        thisMonth: "Ez a hónap",
      },
    },
  },
  globals: { locale: "hu" },
};

export const WeekLight: Story = {
  render: () => <Demo />,
  globals: { theme: "light" },
};
