"use client";

import { Play, Square } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/src/components/ui/Button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/src/components/ui/Tooltip";
import { ShortcutChip } from "@/src/components/ui/ShortcutChip";
import { useElapsedLabel } from "@/src/lib/use-elapsed-label";
import type { RunningTimerView } from "@/src/server/time-tracking";

type TimerControlProps = {
  runningTimer: RunningTimerView | null;
  disabled: boolean;
  canStart: boolean;
  onStart: () => void;
  onStop: () => void;
};

/**
 * The period bar's timer slot: `▷ Start timer`, or while one runs a live pill
 * `● 0:42:13 · Atlas Platform ■` whose project name truncates before the bar would overflow.
 */
export function TimerControl({
  runningTimer,
  disabled,
  canStart,
  onStart,
  onStop,
}: TimerControlProps) {
  const t = useTranslations("TimeTracking");
  const elapsed = useElapsedLabel(runningTimer?.startedAt ?? null);

  return (
    <TooltipProvider delayDuration={400}>
      {runningTimer ? (
        <div
          role="status"
          aria-label={`${t("timer.running")} · ${elapsed} · ${runningTimer.projectName}`}
          className="inline-flex h-10 max-w-full min-w-0 items-center sm:max-w-[18rem] gap-2 rounded-[var(--radius-pill)] border border-accent-line bg-accent-soft pl-3 pr-1 text-sm"
        >
          <span aria-hidden="true" className="relative flex size-2.5 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-45 motion-reduce:hidden" />
            <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
          </span>
          <span className="shrink-0 font-ui text-sm font-bold whitespace-nowrap tabular-nums text-accent">
            {elapsed}
          </span>
          <span aria-hidden="true" className="text-muted-foreground">
            ·
          </span>
          <span className="min-w-0 truncate text-xs font-medium text-foreground">
            {runningTimer.projectName}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                aria-label={t("timer.stopTimer")}
                className="ml-1 grid size-8 shrink-0 place-items-center rounded-full text-destructive transition-colors duration-[var(--duration-micro)] hover:bg-destructive-soft disabled:cursor-not-allowed disabled:opacity-50"
                onClick={onStop}
              >
                <Square className="size-3 fill-current" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t("timer.stopTimer")}
              <ShortcutChip>S</ShortcutChip>
            </TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              icon={Play}
              disabled={disabled || !canStart}
              onClick={onStart}
            >
              {t("timer.startTimer")}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t("timer.startTimer")}
            <ShortcutChip>S</ShortcutChip>
          </TooltipContent>
        </Tooltip>
      )}
    </TooltipProvider>
  );
}
