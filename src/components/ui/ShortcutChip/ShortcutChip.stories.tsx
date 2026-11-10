import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ShortcutChip } from ".";

const meta = {
  title: "UI/ShortcutChip",
  component: ShortcutChip,
  args: { children: "S" },
} satisfies Meta<typeof ShortcutChip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Inline: Story = {
  render: (args) => (
    <p className="text-sm">
      Start timer
      <ShortcutChip {...args} />
    </p>
  ),
};

export const Tab: Story = { args: { variant: "tab", children: "1" } };

export const Light: Story = { ...Inline, globals: { theme: "light" } };
