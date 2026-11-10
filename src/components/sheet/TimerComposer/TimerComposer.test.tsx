import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { TimerComposer } from ".";
import type { TimerComposerValue } from "./TimerComposer.types";

const labels = {
  description: "What are you working on?",
  project: (name: string) => `Project: ${name}`,
  recent: "Recent",
  allProjects: "All projects",
  start: "Start timer",
  descriptionRequired: "Describe what you are working on.",
  suggestions: { list: "Recent descriptions", count: (n: number) => `${n}`, empty: "None" },
};

const projects = [
  { projectId: "atlas", name: "Atlas Platform", color: "#1f7a78", recent: true },
  { projectId: "ops", name: "Internal Ops & Tooling", color: "#c07a1c" },
];

function Harness({ onStart }: { onStart: (value: TimerComposerValue) => void }) {
  const [value, setValue] = useState<TimerComposerValue>({ projectId: "", description: "" });
  return (
    <TimerComposer
      projects={projects}
      value={value}
      labels={labels}
      onValueChange={setValue}
      onStart={onStart}
    />
  );
}

describe("TimerComposer", () => {
  it("starts on Enter with the first (recent) project", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<Harness onStart={onStart} />);

    await user.type(screen.getByRole("combobox", { name: labels.description }), "Sprint planning");
    await user.keyboard("{Enter}");

    expect(onStart).toHaveBeenCalledWith({ projectId: "atlas", description: "Sprint planning" });
  });

  it("refuses an empty description with a message instead of starting", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<Harness onStart={onStart} />);

    await user.click(screen.getByRole("button", { name: "Start timer" }));

    expect(onStart).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(labels.descriptionRequired);
  });

  it("switches project from the menu, recent ones first", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<Harness onStart={onStart} />);

    await user.click(screen.getByRole("button", { name: "Project: Atlas Platform" }));
    const items = await screen.findAllByRole("menuitemradio");
    expect(items.map((item) => item.textContent)).toEqual([
      "Atlas Platform",
      "Internal Ops & Tooling",
    ]);
    await user.click(items[1] as HTMLElement);

    await user.type(screen.getByRole("combobox", { name: labels.description }), "Deploy");
    await user.click(screen.getByRole("button", { name: "Start timer" }));

    expect(onStart).toHaveBeenCalledWith({ projectId: "ops", description: "Deploy" });
  });
});
