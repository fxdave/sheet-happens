import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

import { TimerComposer } from ".";
import type { TimerComposerProps, TimerComposerValue } from "./TimerComposer.types";

const projects = [
  { projectId: "atlas", name: "Atlas Platform", color: "#1f7a78", recent: true },
  { projectId: "nimbus", name: "Nimbus", color: "#7b5ea7", recent: true },
  { projectId: "ops", name: "Internal Ops & Tooling", color: "#c07a1c" },
  {
    projectId: "long",
    name: "Kovács-Szentgyörgyi Ingatlankezelő és Vagyonkezelő Kft.",
    color: "#b8475a",
  },
];

const labels = {
  description: "What are you working on?",
  descriptionCompact: "Working on…",
  project: (name: string) => `Project: ${name}`,
  recent: "Recent",
  allProjects: "All projects",
  start: "Start timer",
  descriptionRequired: "Describe what you are working on.",
  suggestions: {
    list: "Recent descriptions",
    count: (count: number) => `${count} suggestions`,
    empty: "No matching description",
  },
};

function Controlled(
  props: Omit<TimerComposerProps, "value" | "onValueChange"> & {
    initial?: TimerComposerValue;
  },
) {
  const [value, setValue] = useState<TimerComposerValue>(
    props.initial ?? { projectId: "atlas", description: "" },
  );
  return <TimerComposer {...props} value={value} onValueChange={setValue} />;
}

const meta = {
  title: "Sheet/TimerComposer",
  component: TimerComposer,
  args: {
    projects,
    labels,
    value: { projectId: "atlas", description: "" },
    suggestions: [
      { text: "Map layer performance", meta: "12 times · last used Nov 9" },
      { text: "Property search filters", meta: "4 times · last used Nov 6" },
    ],
    onValueChange: fn(),
    onStart: fn(),
  },
  render: (args) => <Controlled {...args} />,
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TimerComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const field = within(canvasElement).getByRole("combobox", { name: labels.description });
    await userEvent.type(field, "Sprint planning{Escape}{Enter}");
    await expect(args.onStart).toHaveBeenCalledWith({
      projectId: "atlas",
      description: "Sprint planning",
    });
  },
};

export const Light: Story = { globals: { theme: "light" } };

export const MissingDescription: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Start timer" }));
    await expect(canvas.getByRole("alert")).toHaveTextContent(labels.descriptionRequired);
  },
};

export const Pending: Story = { args: { pending: true } };

export const ServerError: Story = { args: { error: "This day is covered by leave." } };

export const LongProjectOnPhone: Story = {
  args: { value: { projectId: "long", description: "" } },
  render: (args) => <Controlled {...args} initial={{ projectId: "long", description: "" }} />,
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
