"use client";

import { AnimatePresence, LayoutGroup, LazyMotion, MotionConfig } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useRef, type ReactNode, type RefObject, type TouchEvent } from "react";

import { DayRibbon, type DayRibbonLabels } from "@/src/components/sheet/DayRibbon";
import type { DayColumnHeaderDay } from "@/src/components/sheet/DayColumnHeader";
import { TIME_LAYOUT_GROUP_ID, viewVariants, type TimeMove } from "@/src/lib/motion";
import { useResourceSaver } from "@/src/lib/use-resource-saver";
import { DAILY_SOFT_WARNING_MINUTES } from "@/src/lib/time-entry-limits";

import {
  ESCAPE_ZOOM_GRACE_MS,
  hasOpenOverlay,
  resolveTimeShortcut,
  stepScope,
  type TimeScope,
  type WeekLens,
} from "./zoom";

/** A day of the visible week, plus the total its capacity bar measures. */
export type TimeZoomDay = DayColumnHeaderDay;

const SWIPE_MIN_DISTANCE = 60;
const SWIPE_MAX_DRIFT = 40;

type TimeZoomShellProps = {
  scope: TimeScope;
  lens: WeekLens;
  /** The member's own scope list (`resolveScopeStops`), which bounds the digits and the steps. */
  stops: readonly TimeScope[];
  days: TimeZoomDay[];
  selectedDayIso: string;
  /** Keys the ribbon's slide across a week boundary. */
  weekStart: string;
  /**
   * Keys the content: `${scope}:${lens}:${periodStart}`. A change of key is a move, and `move`
   * says which kind, so the presence can slide, scale or crossfade accordingly.
   */
  viewKey: string;
  move: TimeMove | null;
  /** What a screen reader hears on every scope, lens or period change. */
  announcement: string;
  /** Rows 1 and 2 — the scope bar and the period navigator, composed by the screen. */
  toolbar: ReactNode;
  /** Whether a horizontal swipe on the content steps the period. Off on the Grid lens. */
  swipeEnabled: boolean;
  /** Where focus lands when a scope change took the focused element with it. */
  focusFallback: RefObject<HTMLElement | null>;
  formatMinutes: (minutes: number) => string;
  ribbonLabels: DayRibbonLabels;
  disabled?: boolean;
  onScopeChange: (scope: TimeScope) => void;
  onSelectDay: (isoDate: string) => void;
  onPeriod: (direction: "previous" | "next") => void;
  onToday: () => void;
  onToggleLens: () => void;
  onCompose: () => void;
  onTimer: () => void;
  onHelp: () => void;
  children: ReactNode;
};

/** `domMax`, loaded after first paint. See `motion-features.ts` for why it is not `domAnimation`. */
const loadMotionFeatures = () => import("./motion-features").then((module) => module.default);

/**
 * The chrome that stays put while the view changes underneath it, and the choreography of the
 * change (§6, §7 of `docs/time-view-redesign.md`).
 *
 * Three jobs:
 *
 * - **Keyboard.** One listener resolves every shortcut through `resolveTimeShortcut` and hands the
 *   meaning back to the screen. `Esc` zooms out one step, but only when no overlay is open and not
 *   within {@link ESCAPE_ZOOM_GRACE_MS} of an `Esc` an overlay swallowed — so closing a dialog
 *   and pressing `Esc` again reflexively does not also change the view.
 * - **Motion.** One `AnimatePresence` around the content, keyed by the view and told which kind of
 *   move happened. A step slides along the time axis; a zoom scales in the direction of travel
 *   while the day headers, ribbon chips and heat cells that share a `layoutId` morph between their
 *   stations; a re-lens crossfades under headers that do not move. `LayoutGroup id="time"`
 *   namespaces every id on the surface.
 * - **Continuity.** The selected day survives every move because it lives in the URL. Focus
 *   survives: if the element that had it left with the old view, it lands on the period label,
 *   never on `body`. The ribbon renders here, in the Day scope only, as the week context for one
 *   day and the navigator between days.
 *
 * This is also the `/time` client root, so it is where the two Motion providers live:
 * `MotionConfig reducedMotion="user"` is **required, not belt-and-braces** — the global
 * `prefers-reduced-motion` block in `app/globals.css` does nothing to Motion — and `LazyMotion
 * strict` keeps the feature bundle off every other route.
 */
export function TimeZoomShell({
  scope,
  lens,
  stops,
  days,
  selectedDayIso,
  weekStart,
  viewKey,
  move,
  announcement,
  toolbar,
  swipeEnabled,
  focusFallback,
  formatMinutes,
  ribbonLabels,
  disabled = false,
  onScopeChange,
  onSelectDay,
  onPeriod,
  onToday,
  onToggleLens,
  onCompose,
  onTimer,
  onHelp,
  children,
}: TimeZoomShellProps) {
  const previousScope = useRef(scope);
  const overlayEscapeAt = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const shortcut = resolveTimeShortcut(event, stops);

      if (!shortcut) return;

      if (shortcut.type === "escape") {
        if (hasOpenOverlay()) {
          overlayEscapeAt.current = Date.now();
          return;
        }
        if (Date.now() - overlayEscapeAt.current < ESCAPE_ZOOM_GRACE_MS) return;

        const outer = stepScope(scope, "out", stops);
        if (outer !== scope) {
          event.preventDefault();
          onScopeChange(outer);
        }
        return;
      }

      event.preventDefault();

      switch (shortcut.type) {
        case "scope":
          onScopeChange(shortcut.scope);
          break;
        case "step": {
          const next = stepScope(scope, shortcut.direction, stops);
          if (next !== scope) onScopeChange(next);
          break;
        }
        case "period":
          onPeriod(shortcut.direction);
          break;
        case "today":
          onToday();
          break;
        case "lens":
          onToggleLens();
          break;
        case "compose":
          onCompose();
          break;
        case "timer":
          onTimer();
          break;
        case "help":
          onHelp();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCompose, onHelp, onPeriod, onScopeChange, onTimer, onToday, onToggleLens, scope, stops]);

  /**
   * Focus survives a scope change, or lands somewhere sensible.
   *
   * Left exactly where it is whenever it survived — the point is not to move focus, it is that a
   * scope change must never dump it on `<body>`. It lands there when the element that was focused
   * belonged to the view that just went away, which is what pressing a day header does; the period
   * label is where that focus belongs, because it names the same day.
   */
  useEffect(() => {
    if (previousScope.current === scope) return;

    previousScope.current = scope;

    const active = document.activeElement;
    /* The old view is still in the DOM while it animates out, so "the focused element left with
       the view" has to be read off which view it sits in, not off `body`. */
    const leftWithOldView =
      active instanceof HTMLElement &&
      active.closest("[data-view-key]")?.getAttribute("data-view-key") !== viewKey &&
      active.closest("[data-view-key]") !== null;

    if (!active || active === document.body || leftWithOldView) focusFallback.current?.focus();
  }, [focusFallback, scope, viewKey]);

  const resourceSaver = useResourceSaver();

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;

    if (!swipeEnabled || !start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE || Math.abs(deltaY) > SWIPE_MAX_DRIFT) return;

    onPeriod(deltaX < 0 ? "next" : "previous");
  }

  return (
    <MotionConfig reducedMotion={resourceSaver ? "always" : "user"}>
      <LazyMotion strict features={loadMotionFeatures}>
        <LayoutGroup id={TIME_LAYOUT_GROUP_ID}>
          <div className="grid gap-4">
            {toolbar}

            {/* The ribbon lives here, and only in the Day scope on a desktop (§4.3). It mounts as
                the Week headers unmount, which is what lets both carry `day-<iso>`. Crossing a week
                boundary slides the whole ribbon as one block; inside the week only the thumb moves. */}
            <AnimatePresence mode="popLayout" initial={false} custom={move}>
              {scope === "day" ? (
                <m.div
                  key={`ribbon:${weekStart}`}
                  custom={move}
                  variants={viewVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="relative min-w-0"
                >
                  <DayRibbon
                    days={days}
                    selectedDayIso={selectedDayIso}
                    capacityMinutes={DAILY_SOFT_WARNING_MINUTES}
                    formatMinutes={formatMinutes}
                    labels={ribbonLabels}
                    disabled={disabled}
                    onSelectDay={onSelectDay}
                  />
                </m.div>
              ) : null}
            </AnimatePresence>

            <div
              className="relative min-w-0"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <AnimatePresence mode="popLayout" initial={false} custom={move}>
                <m.div
                  key={viewKey}
                  custom={move}
                  variants={viewVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="min-w-0"
                  data-view-key={viewKey}
                  data-scope={scope}
                  data-lens={scope === "week" ? lens : undefined}
                >
                  {children}
                </m.div>
              </AnimatePresence>
            </div>

            <p aria-live="polite" className="sr-only">
              {announcement}
            </p>
          </div>
        </LayoutGroup>
      </LazyMotion>
    </MotionConfig>
  );
}
