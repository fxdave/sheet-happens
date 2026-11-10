/**
 * The Days → Weeks → Months model behind `/time`: which view a URL names, where an old link lands,
 * and what a keystroke means. Pure, so the server page and the client share it and tests need no DOM.
 */

import type { TrackingMode } from "@/src/server/time-tracking";

/** Ordered zoomed-in → zoomed-out: the tab order and the digit keys. */
export const timeViews = ["days", "weeks", "months"] as const;

export type TimeView = (typeof timeViews)[number];

export const VIEW_PARAM = "view";
export const DAY_PARAM = "day";

/** Read, never written: links from before the Days/Weeks/Months tabs. */
const LEGACY_SCOPE_PARAM = "scope";
const LEGACY_LENS_PARAM = "lens";
const LEGACY_ZOOM_PARAM = "zoom";
const LEGACY_WEEK_PARAM = "week";

export const defaultView = "days" satisfies TimeView;

/** A declared-only member logs nothing per day, so the month is all they get. */
export const declaredOnlyViews = ["months"] as const satisfies readonly TimeView[];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isTimeView(value: unknown): value is TimeView {
  return timeViews.includes(value as TimeView);
}

type SearchParamValue = string | string[] | undefined;

function first(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function isIsoDate(value: string | undefined): value is string {
  if (!value || !ISO_DATE.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
}

/**
 * The view and anchor day a `/time` URL names, `day` `null` meaning today.
 *
 * Legacy links keep working: `scope=day|week` and `zoom=day|week` open Days, `lens=grid` or
 * `zoom=grid` open Weeks, `scope=month` / `zoom=month` open Months, `?week=` anchors Days there.
 */
export function resolveTimeLocation(params: Record<string, SearchParamValue>): {
  view: TimeView;
  day: string | null;
} {
  const view = first(params[VIEW_PARAM]);
  const day = first(params[DAY_PARAM]);
  const week = first(params[LEGACY_WEEK_PARAM]);
  const anchor = isIsoDate(day) ? day : isIsoDate(week) ? week : null;

  if (isTimeView(view)) return { view, day: anchor };

  return { view: mapLegacyView(params), day: anchor };
}

function mapLegacyView(params: Record<string, SearchParamValue>): TimeView {
  const scope = first(params[LEGACY_SCOPE_PARAM]);
  const lens = first(params[LEGACY_LENS_PARAM]);
  const zoom = first(params[LEGACY_ZOOM_PARAM]);

  if (scope === "month" || zoom === "month") return "months";
  if (zoom === "grid") return "weeks";
  if (scope === "week" && lens === "grid") return "weeks";
  if (!scope && lens === "grid") return "weeks";

  return defaultView;
}

/** The member's own views: all three, or the month alone when every assignment is declared. */
export function resolveViewStops(
  assignments: readonly { trackingMode: TrackingMode }[],
): readonly TimeView[] {
  const declaredOnly =
    assignments.length > 0 &&
    assignments.every((assignment) => assignment.trackingMode === "DECLARED");

  return declaredOnly ? declaredOnlyViews : timeViews;
}

export function clampView(view: TimeView, stops: readonly TimeView[]): TimeView {
  return stops.includes(view) ? view : (stops[0] ?? defaultView);
}

/** `/time?view=…&day=…`; no `day` means today, which keeps the plain link canonical. */
export function buildTimeHref(view: TimeView, day: string | null = null) {
  const params = new URLSearchParams({ [VIEW_PARAM]: view });
  if (day) params.set(DAY_PARAM, day);

  return `/time?${params.toString()}`;
}

/** The ISO date `days` away. Pure string arithmetic over UTC so no host timezone can shift it. */
export function shiftIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return isoDate;

  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The Monday of the week a day falls in. The server owns the same rule in `getMonday`. */
export function resolveWeekStartIso(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));

  return date.toISOString().slice(0, 10);
}

export function resolveMonthStartIso(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

/** The first of the month `months` away. Counts in absolute months, so December wraps the year. */
export function shiftMonthStartIso(monthStartIso: string, months: number): string {
  const year = Number.parseInt(monthStartIso.slice(0, 4), 10);
  const monthIndex = Number.parseInt(monthStartIso.slice(5, 7), 10) - 1 + months;
  const shiftedYear = year + Math.floor(monthIndex / 12);
  const shiftedMonth = ((monthIndex % 12) + 12) % 12;

  return `${String(shiftedYear).padStart(4, "0")}-${String(shiftedMonth + 1).padStart(2, "0")}-01`;
}

/** The last day of the month a `YYYY-MM` names, or today when that is earlier. */
export function resolveMonthAnchorIso(month: string, todayIso: string): string {
  const end = shiftIsoDate(shiftMonthStartIso(`${month}-01`, 1), -1);
  return end < todayIso ? end : todayIso;
}

export function isWeekendIso(isoDate: string) {
  const weekday = new Date(`${isoDate}T00:00:00.000Z`).getUTCDay();
  return weekday === 0 || weekday === 6;
}

export type TimeShortcut =
  | { type: "view"; view: TimeView }
  | { type: "period"; direction: "previous" | "next" }
  | { type: "today" }
  | { type: "compose" }
  | { type: "timer" }
  | { type: "help" };

/**
 * What a keystroke on `/time` means, or `null` to leave it alone. Nothing fires while a field, a
 * dialog or a menu has the keystroke, or with Ctrl / Cmd / Alt held. `J` / `K` stay as period
 * aliases because they need no modifier on any layout.
 */
export function resolveTimeShortcut(
  event: {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    target: EventTarget | null;
  },
  stops: readonly TimeView[],
): TimeShortcut | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (suppressesTimeShortcut(event.target)) return null;

  const digit = Number.parseInt(event.key, 10);
  const view = digit >= 1 && digit <= stops.length ? stops[digit - 1] : undefined;
  if (view) return { type: "view", view };

  switch (event.key) {
    case "ArrowLeft":
    case "[":
    case "k":
    case "K":
      return { type: "period", direction: "previous" };
    case "ArrowRight":
    case "]":
    case "j":
    case "J":
      return { type: "period", direction: "next" };
    case "t":
    case "T":
      return { type: "today" };
    case "n":
    case "N":
      return { type: "compose" };
    case "s":
    case "S":
      return { type: "timer" };
    case "?":
      return { type: "help" };
    default:
      return null;
  }
}

/** A field being typed into, or an overlay that runs its own keys (a menu, a listbox). */
export function suppressesTimeShortcut(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName;

  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") return true;
  if (target.isContentEditable) return true;

  return Boolean(
    target.closest('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'),
  );
}
