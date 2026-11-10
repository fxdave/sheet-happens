"use client";

import { AlertTriangle, ChevronRight, Lock, Palmtree } from "lucide-react";
import * as m from "motion/react-m";

import { levelTransition, springRing } from "@/src/lib/motion";
import { cn } from "@/src/lib/utils";
import type { CapacityBarProps, DayColumnHeaderProps } from "./DayColumnHeader.types";
import { dayColumnHeaderVariants } from "./DayColumnHeader.variants";

/**
 * One day's header, at three densities, with one identity.
 *
 * This is the element that makes zooming spatial (§7.2 of `docs/time-view-redesign.md`). The
 * Week scope renders seven of these as column headers; the Day scope renders the same seven as
 * ribbon chips; the two are never mounted together, so they can share `dayLayoutId(iso)` and Motion
 * projects each header into its chip — the day visibly goes somewhere instead of a strip and a
 * header both saying "Monday" at once.
 *
 * Always a real `button`. In the Week scope pressing it opens the day; in the ribbon it selects
 * the day (`aria-pressed`); in the mobile accordion it expands the panel (`aria-expanded`). The
 * caller decides which by naming it, and by which of the two ARIA states it passes.
 *
 * `layout="position"`, not plain `layout`: a column header becoming a chip is a size change, and a
 * size-animating box scales the day number and the total inside it for the length of the
 * transition — the one thing a figure must never appear to do. Position-only snaps the size and
 * animates where the box sits, which carries the meaning anyway.
 */
export function DayColumnHeader({
  day,
  variant = "column",
  capacityMinutes,
  totalLabel,
  label,
  labels,
  pressed,
  expanded,
  layoutId,
  thumb,
  disabled = false,
  className,
  onPress,
}: DayColumnHeaderProps) {
  const over = day.totalMinutes > capacityMinutes;
  const empty = day.totalMinutes === 0;

  const total = (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 font-ui text-xs font-semibold tabular-nums",
        over ? "text-warning" : empty ? "text-subtle-foreground" : "text-muted-foreground",
        variant === "chip" && "text-[11px]",
      )}
      title={over && labels.over ? `${labels.over} · ${labels.capacity}` : labels.capacity}
    >
      {over ? (
        <AlertTriangle
          role="img"
          aria-label={labels.over ?? labels.capacity}
          className="size-3 shrink-0"
        />
      ) : null}
      {totalLabel}
    </span>
  );

  const affordance = day.locked ? (
    <Lock
      role="img"
      aria-label={labels.locked ?? ""}
      className="size-3.5 shrink-0 text-muted-foreground"
    />
  ) : day.onLeave ? (
    <Palmtree
      role="img"
      aria-label={labels.onLeave ?? ""}
      className="size-3.5 shrink-0 text-muted-foreground"
    />
  ) : variant === "chip" ? null : (
    /* The zoom affordance the hidden "press the chip again" gesture never had: a chevron that
       appears on hover and focus, and the header lifting by a pixel. */
    <ChevronRight
      aria-hidden="true"
      className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-[opacity,transform] duration-[var(--duration-micro)] group-hover/day-header:opacity-100 group-hover/day-header:-translate-y-px group-focus-visible/day-header:opacity-100"
    />
  );

  return (
    <m.button
      type="button"
      layoutId={layoutId}
      layout={layoutId ? "position" : undefined}
      transition={levelTransition}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      aria-label={label}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-current={day.state === "today" ? "date" : undefined}
      /* The chip has no room for its figure, so the bar's figures reach a pointer user as the
         button's tooltip and assistive technology through the description it carries. */
      title={variant === "chip" ? labels.capacity : undefined}
      disabled={disabled}
      data-state={day.state}
      className={cn(
        dayColumnHeaderVariants({ variant, state: day.state, pressed: Boolean(pressed) }),
        className,
      )}
      onClick={onPress}
    >
      {thumb}

      {variant === "chip" ? (
        <>
          <span className="relative z-[1] block font-ui text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            {day.shortLabel}
          </span>
          <span className="relative z-[1] block text-base font-semibold leading-tight">
            {day.dayNumber}
          </span>
          <CapacityBar
            minutes={day.totalMinutes}
            capacityMinutes={capacityMinutes}
            className="relative z-[1] w-full"
          />
          {over ? (
            <AlertTriangle
              role="img"
              aria-label={labels.over ?? labels.capacity}
              className="absolute left-1.5 top-1.5 size-3 text-warning"
            />
          ) : null}
          {day.locked ? (
            <Lock
              role="img"
              aria-label={labels.locked ?? ""}
              className="absolute right-1.5 top-1.5 size-3 text-muted-foreground"
            />
          ) : day.onLeave ? (
            <Palmtree
              role="img"
              aria-label={labels.onLeave ?? ""}
              className="absolute right-1.5 top-1.5 size-3 text-muted-foreground"
            />
          ) : null}
        </>
      ) : variant === "row" ? (
        <>
          <span className="flex min-w-0 flex-1 items-baseline gap-2">
            <span className="font-ui text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {day.shortLabel}
            </span>
            <span className="text-base font-semibold">{day.dayNumber}</span>
            <CapacityBar
              minutes={day.totalMinutes}
              capacityMinutes={capacityMinutes}
              className="ml-2 w-16 self-center"
            />
          </span>
          {total}
          {affordance}
        </>
      ) : (
        <>
          {/* Wraps the total under the date rather than letting the two overlap in a narrow column. */}
          <span className="flex flex-wrap items-baseline justify-between gap-x-2">
            <span className="flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
              <span
                className={cn(
                  "font-ui text-[10px] font-semibold uppercase tracking-[0.06em]",
                  day.state === "today" ? "text-accent" : "text-muted-foreground",
                )}
              >
                {day.shortLabel}
              </span>
              <span className="text-base font-semibold leading-none">{day.dayNumber}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1 whitespace-nowrap">
              {total}
              {affordance}
            </span>
          </span>
          <CapacityBar minutes={day.totalMinutes} capacityMinutes={capacityMinutes} />
        </>
      )}
    </m.button>
  );
}

/**
 * How full a day is against the 8h soft target.
 *
 * `capacityMinutes` is `DAILY_SOFT_WARNING_MINUTES` in practice — the same number the day view
 * warns against, so the bar and the warning can never disagree. Past the target the bar fills and
 * turns amber rather than overflowing its track: the fact worth reading at a glance is "over", not
 * "over by how much", and the `⚠` beside the total says it in words as well.
 *
 * `scaleX`, not `width`: transform and opacity only, so seven bars changing at once cost no layout
 * pass. `initial={false}` so the bars do not grow from nothing when the page opens; they fill on
 * `--spring-ring` when a day's total actually changes.
 */
export function CapacityBar({ minutes, capacityMinutes, className }: CapacityBarProps) {
  const ratio = Math.min(1, Math.max(0, minutes / capacityMinutes));
  const over = minutes > capacityMinutes;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "block h-1 overflow-hidden rounded-[var(--radius-pill)] bg-secondary",
        className,
      )}
    >
      <m.span
        initial={false}
        animate={{ scaleX: ratio }}
        transition={springRing}
        className={cn(
          "block h-full origin-left rounded-[var(--radius-pill)]",
          over ? "bg-warning" : "bg-accent",
        )}
      />
    </span>
  );
}
