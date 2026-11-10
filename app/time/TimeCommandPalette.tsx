"use client";

import { CalendarDays, Keyboard, LayoutGrid, List, Play, Plus, Square, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CommandPalette, type CommandPaletteItem } from "@/src/components/layout/CommandPalette";

import type { TimeView } from "./view";

export type TimeCommand =
  | { type: "today" }
  | { type: "view"; view: TimeView }
  | { type: "compose" }
  | { type: "timer" }
  | { type: "shortcuts" };

type TimeCommandPaletteProps = {
  stops: readonly TimeView[];
  timerRunning: boolean;
  canCompose: boolean;
  onCommand: (command: TimeCommand) => void;
};

const viewCommandKeys = {
  days: "commands.viewDays",
  weeks: "commands.viewWeeks",
  months: "commands.viewMonths",
} as const;
const viewIcons = { days: List, weeks: CalendarDays, months: LayoutGrid } as const;

/**
 * `⌘K` on `/time`: every action on the page, searchable by name in both locales (§8 of
 * `docs/time-view-redesign.md`).
 *
 * Mounted here rather than in the shell because the shell's pill has no page to talk to — pages
 * are Server Components and cannot hand a callback across the boundary — so the palette's open
 * state and its items live with the one page that has commands. The trigger is a visually hidden
 * button so the palette stays reachable without the keyboard chord.
 */
export function TimeCommandPalette({
  stops,
  timerRunning,
  canCompose,
  onCommand,
}: TimeCommandPaletteProps) {
  const t = useTranslations("TimeTracking");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && (event.key === "k" || event.key === "K")) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const group = t("commands.group");
  const items: (CommandPaletteItem & { command: TimeCommand })[] = [
    {
      id: "today",
      label: t("commands.goToToday"),
      shortcut: "T",
      icon: Sun,
      group,
      command: { type: "today" },
    },
    ...stops.map((view, index) => ({
      id: `view-${view}`,
      label: t(viewCommandKeys[view]),
      shortcut: String(index + 1),
      icon: viewIcons[view],
      group,
      command: { type: "view", view } as const,
    })),
    {
      id: "new-entry",
      label: t("commands.newEntry"),
      shortcut: "N",
      icon: Plus,
      group,
      disabled: !canCompose,
      command: { type: "compose" },
    },
    timerRunning
      ? {
          id: "stop-timer",
          label: t("commands.stopTimer"),
          shortcut: "S",
          icon: Square,
          group,
          command: { type: "timer" },
        }
      : {
          id: "start-timer",
          label: t("commands.startTimer"),
          shortcut: "S",
          icon: Play,
          group,
          disabled: !canCompose,
          command: { type: "timer" },
        },
    {
      id: "shortcuts",
      label: t("commands.shortcuts"),
      shortcut: "?",
      icon: Keyboard,
      group,
      command: { type: "shortcuts" },
    },
  ];

  return (
    <CommandPalette
      open={open}
      onOpenChange={setOpen}
      items={items}
      labels={{
        title: t("commands.title"),
        description: t("commands.description"),
        search: t("commands.search"),
        empty: t("commands.empty"),
      }}
      trigger={
        <button
          type="button"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-md)] focus:bg-popover focus:px-3 focus:py-2 focus:text-sm"
        >
          {t("commands.trigger")}
          <kbd className="ml-2 font-ui text-[10px]">⌘K</kbd>
        </button>
      }
      onSelect={(item) => {
        const match = items.find((candidate) => candidate.id === item.id);
        if (match) onCommand(match.command);
      }}
    />
  );
}
