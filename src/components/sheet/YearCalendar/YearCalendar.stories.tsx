import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { YearCalendar } from ".";
import { buildYearFixture, currentYear, previousYear } from "./YearCalendar.fixtures";

/** The `/time` content panel the calendar sits in, so container-query columns match the app. */
function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4">{children}</div>
  );
}

const meta = {
  title: "Sheet/YearCalendar",
  component: YearCalendar,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <Panel>
        <Story />
      </Panel>
    ),
  ],
  args: {
    years: [currentYear],
    locale: "en",
    durationDisplayFormat: "DECIMAL_HOURS",
    onSelectMonth: fn(),
    onSelectDay: fn(),
  },
} satisfies Meta<typeof YearCalendar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The current year: future months muted, today ringed, November open. */
export const CurrentYear: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: /^November 2026, .*Open$/ }));
    await expect(args.onSelectMonth).toHaveBeenCalledWith("2026-11-01");

    await userEvent.click(canvas.getByRole("button", { name: /November 10, 2026/ }));
    await expect(args.onSelectDay).toHaveBeenCalledWith("2026-11-10");
  },
};

export const ContractorFullYear: Story = {
  args: { years: [previousYear] },
};

export const Employee: Story = {
  args: {
    years: [buildYearFixture({ year: 2026, todayIso: "2026-11-10", profile: "EMPLOYEE" })],
  },
};

/** Declared projects in the footer, one with a name long enough to truncate. */
export const DeclaredHours: Story = {
  args: {
    years: [
      buildYearFixture({
        year: 2026,
        todayIso: "2026-11-10",
        statuses: { 7: "paid", 8: "invoice_rejected", 9: "rejected" },
        declared: {
          7: [{ projectName: "Nimbus", minutes: 24 * 60 }],
          8: [{ projectName: "Kovács-Szentgyörgyi Integration Platform Migration", minutes: 1530 }],
          9: [
            { projectName: "Atlas", minutes: 600 },
            { projectName: "Nimbus", minutes: 900 },
          ],
        },
      }),
    ],
  },
};

/** One day past 10 h takes the warning fill; one under 4 h the lightest shade. */
export const LongDay: Story = {
  args: {
    years: [
      buildYearFixture({
        year: 2026,
        todayIso: "2026-11-10",
        overrides: { "2026-11-03": 11 * 60 + 30, "2026-11-04": 150 },
      }),
    ],
  },
};

export const EmptyYear: Story = {
  args: {
    years: [buildYearFixture({ year: 2027, todayIso: "2026-11-10", empty: true })],
  },
};

/** Large totals in the hours-and-minutes format. */
export const LargeTotalsHoursMinutes: Story = {
  args: {
    durationDisplayFormat: "HOURS_MINUTES",
    years: [
      {
        ...previousYear,
        months: previousYear.months.map((month) => ({ ...month, totalMinutes: 96_042 })),
      },
    ],
  },
};

export const Hungarian: Story = {
  args: { locale: "hu" },
  globals: { locale: "hu" },
};

export const Phone: Story = {
  args: { locale: "hu" },
  globals: { locale: "hu" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

export const Dark: Story = {
  globals: { theme: "dark" },
};

export const Light: Story = {
  globals: { theme: "light" },
};

/** Two years stacked, the older one under its own heading, with a third on the way. */
export const TwoStackedYears: Story = {
  args: { years: [currentYear, previousYear], onReachEnd: fn() },
};

export const LoadingMore: Story = {
  args: { years: [currentYear], onReachEnd: fn(), loadingMore: true },
};
