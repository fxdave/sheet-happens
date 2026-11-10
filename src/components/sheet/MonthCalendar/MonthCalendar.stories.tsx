import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";

import { MonthCalendar } from ".";
import {
  buildFixtureCalendar,
  currentMonth,
  emptyMonth,
  longTextMonth,
  previousMonth,
  septemberMonth,
  sundayStartMonth,
} from "./MonthCalendar.fixtures";

/** November 2026 seen on the 10th: six rows, the 2nd left blank, October locked. */
const meta = {
  title: "Sheet/MonthCalendar",
  component: MonthCalendar,
  args: {
    calendar: currentMonth,
    locale: "en",
    durationDisplayFormat: "DECIMAL_HOURS",
    layout: "grid",
    onSelectDay: fn(),
  },
} satisfies Meta<typeof MonthCalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CurrentMonth: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /^Tuesday, November 3,/ }));
    await expect(args.onSelectDay).toHaveBeenCalledWith("2026-11-03");
  },
};

export const CurrentMonthLight: Story = {
  globals: { theme: "light" },
};

/** A past month, all days filled in, with a leave pair and a lock. */
export const TypicalMonth: Story = {
  args: { calendar: previousMonth },
};

/** March 2026 starts on a Sunday, so the grid needs six rows. */
export const StartsOnSunday: Story = {
  args: { calendar: sundayStartMonth },
};

/** Nothing logged at all: every past workday points at the gap. */
export const EmptyMonth: Story = {
  args: { calendar: emptyMonth },
};

export const LongText: Story = {
  args: { calendar: longTextMonth },
};

export const LongTextLight: Story = {
  args: { calendar: longTextMonth },
  globals: { theme: "light" },
};

export const Hungarian: Story = {
  args: { locale: "hu" },
  globals: { locale: "hu" },
};

export const HoursAndMinutes: Story = {
  args: { durationDisplayFormat: "HOURS_MINUTES" },
};

/** The phone list: newest week first, future and empty weekend days left out. */
export const Phone: Story = {
  args: {
    layout: "list",
    earlierCalendars: [previousMonth],
    onReachEnd: fn(),
  },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /^Monday, November 9,/ }));
    await expect(args.onSelectDay).toHaveBeenCalledWith("2026-11-09");
  },
};

export const PhoneLight: Story = {
  ...Phone,
  globals: { theme: "light" },
};

export const PhoneHungarianLongText: Story = {
  args: {
    layout: "list",
    calendar: longTextMonth,
    locale: "hu",
  },
  globals: { locale: "hu" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

/** Earlier weeks on their way in, under the sentinel. */
export const PhoneLoadingMore: Story = {
  args: {
    layout: "list",
    earlierCalendars: [previousMonth, septemberMonth],
    onReachEnd: fn(),
    loadingMore: true,
  },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

/** A month whose days are all still ahead has nothing to list. */
export const PhoneEmpty: Story = {
  args: {
    layout: "list",
    calendar: buildFixtureCalendar({ monthStart: "2026-12-01", todayIso: "2026-11-10" }),
    hasMore: false,
  },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
