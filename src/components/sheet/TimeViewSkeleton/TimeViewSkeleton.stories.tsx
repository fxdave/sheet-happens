import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { TimeViewSkeleton } from ".";

/** What a `/time` tab shows between the click and its data: the target view's shape, static. */
const meta = {
  title: "Sheet/TimeViewSkeleton",
  component: TimeViewSkeleton,
  args: { view: "days", label: "Loading Days…" },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-5xl rounded-[var(--radius-lg)] border border-border bg-card">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TimeViewSkeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Days: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent("Loading Days…");
  },
};

export const Weeks: Story = { args: { view: "weeks", label: "Loading Weeks…" } };

export const Months: Story = { args: { view: "months", label: "Loading Months…" } };

export const DaysLight: Story = { globals: { theme: "light" } };

export const WeeksPhone: Story = {
  ...Weeks,
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

export const MonthsPhone: Story = {
  ...Months,
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
