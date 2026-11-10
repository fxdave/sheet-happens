import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { DayLog } from ".";
import {
  dayLogLabels,
  dayLogRunningTimer,
  dayLogWeeks,
  lockedDayLogWeeks,
} from "./DayLog.fixtures";

/** The Days view of `/time`: the mockup's fortnight, newest first. */
const meta = {
  title: "Sheet/DayLog",
  component: DayLog,
  args: {
    weeks: dayLogWeeks,
    capacityMinutes: 480,
    locale: "en",
    durationDisplayFormat: "DECIMAL_HOURS",
    labels: dayLogLabels,
    hasMore: true,
    onLoadMore: fn(),
    onAddEntry: fn(),
    onEditEntry: fn(),
    onDeleteEntry: fn(),
    onContinueEntry: fn(),
    onStopTimer: fn(),
  },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-5xl rounded-[var(--radius-lg)] border border-border bg-card">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DayLog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Continue Sprint planning" }));
    await expect(args.onContinueEntry).toHaveBeenCalled();
  },
};

export const DesktopLight: Story = { globals: { theme: "light" } };

export const RunningTimer: Story = { args: { runningTimer: dayLogRunningTimer } };

/** A submitted month: no edit, no delete, no `+`; ▷ still starts a new timer today. */
export const Locked: Story = { args: { weeks: lockedDayLogWeeks } };

export const LoadingEarlier: Story = { args: { loadingMore: true } };

export const Empty: Story = { args: { weeks: [], hasMore: false } };

/** Descriptions clamp to two lines; project names ellipsize; times stay on one line. */
export const Phone: Story = {
  args: { runningTimer: dayLogRunningTimer },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

export const PhoneLight: Story = { ...Phone, globals: { theme: "light" } };

export const Hungarian: Story = {
  args: { locale: "hu", runningTimer: dayLogRunningTimer },
  globals: { locale: "hu" },
};
