"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useState } from "react";

import { labelVariants } from "@/src/lib/motion";
import { cn } from "@/src/lib/utils";
import { MonthPickerPanel } from "../../ui/MonthPicker";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/Popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../ui/Tooltip";
import { ShortcutChip } from "../../ui/ShortcutChip";
import type { PeriodNavigatorProps } from "./PeriodNavigator.types";

/**
 * Row 2 of the `/time` chrome: *when* (§4, §5.3 of `docs/time-view-redesign.md`).
 *
 * `‹ label › Today`. The header is the unit: `Week 36 · Aug 31 – Sep 6, 2026` beside arrows can only
 * mean "move a week", `Monday, Aug 31, 2026` can only mean "move a day". No legend needed, and the
 * arrows' names carry the unit the caller resolved.
 *
 * The label is a button too. It opens a month grid to jump anywhere without leaving the scope —
 * the Notion Calendar rule that a date picker changes the date, never the view. Its visible text
 * is its accessible name, so a test can find the period by what the header says.
 *
 * `Today` stays a real, focusable button while today is in view: `aria-disabled`, dimmed, and with
 * a small mint dot that says "you are here", which is how Google Calendar's Today button reads.
 */
export function PeriodNavigator({
  label,
  periodKey,
  direction,
  atToday,
  month,
  locale,
  labels,
  shortcuts,
  menu,
  labelRef,
  disabled = false,
  nextDisabled = false,
  className,
  labelClassName,
  onPrevious,
  onNext,
  onToday,
  onPickMonth,
}: PeriodNavigatorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={400}>
      <div className={cn("flex min-w-0 flex-wrap items-center gap-2", className)}>
        <div className="inline-flex min-w-0 items-center gap-0.5 rounded-[var(--radius-pill)] border border-border bg-card p-1">
          <StepButton
            label={labels.previous}
            shortcut={shortcuts?.previous}
            disabled={disabled}
            onClick={onPrevious}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </StepButton>

          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button
                ref={labelRef}
                type="button"
                title={labels.pick}
                aria-haspopup="dialog"
                aria-expanded={pickerOpen}
                disabled={disabled}
                className={cn(
                  "relative min-w-0 rounded-[var(--radius-pill)] px-3 py-1 text-sm font-medium text-foreground transition-colors duration-[var(--duration-micro)] hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50",
                  labelClassName,
                )}
              >
                <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                  <m.span
                    key={periodKey}
                    custom={direction}
                    variants={labelVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="block truncate"
                  >
                    {label}
                  </m.span>
                </AnimatePresence>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-3">
              <MonthPickerPanel
                value={month}
                locale={locale}
                labels={labels.monthPicker}
                clearable={false}
                onSelect={(next) => {
                  setPickerOpen(false);
                  if (next) onPickMonth(next);
                }}
              />
            </PopoverContent>
          </Popover>

          <StepButton
            label={labels.next}
            shortcut={shortcuts?.next}
            disabled={disabled || nextDisabled}
            onClick={onNext}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </StepButton>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-disabled={atToday || undefined}
              disabled={disabled}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-[var(--radius-pill)] border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors duration-[var(--duration-micro)] hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50",
                atToday && "cursor-default text-muted-foreground hover:bg-card",
              )}
              onClick={atToday ? undefined : onToday}
            >
              {atToday ? (
                <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
              ) : null}
              {labels.today}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {atToday ? labels.atToday : labels.today}
            {shortcuts?.today && !atToday ? <ShortcutChip>{shortcuts.today}</ShortcutChip> : null}
          </TooltipContent>
        </Tooltip>

        {menu}
      </div>
    </TooltipProvider>
  );
}

function StepButton({
  label,
  shortcut,
  disabled,
  children,
  onClick,
}: {
  label: string;
  shortcut?: string;
  disabled: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          disabled={disabled}
          className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors duration-[var(--duration-micro)] hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onClick}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label}
        {shortcut ? <ShortcutChip>{shortcut}</ShortcutChip> : null}
      </TooltipContent>
    </Tooltip>
  );
}
