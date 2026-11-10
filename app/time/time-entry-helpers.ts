import type { useTranslations } from "next-intl";

import { DAILY_HARD_LIMIT_MINUTES } from "@/src/lib/time-entry-limits";
import type { TimeGridEntry } from "@/src/server/time-tracking";

/**
 * The pure half of `/time`: warnings and formatting rules the views and the dialogs share. No React, no server, no locale work beyond taking a translator.
 */

export type TimeTrackingTranslator = ReturnType<typeof useTranslations>;

export function getDayLoggedMinutes(
  entries: TimeGridEntry[],
  localDate: string,
  excludingEntryId: string | null,
) {
  return entries.reduce((sum, entry) => {
    if (entry.localDate !== localDate || entry.id === excludingEntryId) return sum;
    return sum + entry.durationMinutes;
  }, 0);
}

/**
 * Days in the month a `YYYY-MM-01` names, from day 0 of the month after it.
 *
 * The client's half of `getMonthEnd`, over an ISO string. February, leap years and December all
 * fall out of the same arithmetic, and the server keeps its own copy because the warning shown here
 * and the bound recorded there must agree.
 */
export function countDaysInMonth(monthStartIso: string) {
  const year = Number.parseInt(monthStartIso.slice(0, 4), 10);
  const month = Number.parseInt(monthStartIso.slice(5, 7), 10);

  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** A file size for the proof slot. Bytes are not a locale concept; the number is. */
export function formatBytesLabel(byteSize: number, locale: string) {
  const kilobytes = byteSize / 1024;

  return kilobytes >= 1024
    ? `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(kilobytes / 1024)} MB`
    : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(kilobytes)} kB`;
}

export function getEntryWarnings(
  entry: TimeGridEntry,
  dayEntries: TimeGridEntry[],
  t: TimeTrackingTranslator,
) {
  const warnings: string[] = [];

  if (!entry.description.trim()) warnings.push(t("warnings.descriptionNeeded"));
  if (entry.durationMinutes >= 480) warnings.push(t("warnings.longContinuousSession"));
  if (entryHasOverlap(entry, dayEntries)) warnings.push(t("warnings.overlapsAnotherEntry"));

  return warnings;
}

/** The admin's own timezone, not the reader's — the correction happened at a moment they know. */
export function formatAdminModifiedAt(
  modification: NonNullable<TimeGridEntry["adminModification"]>,
  locale: string,
) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: modification.timezone,
  }).format(new Date(modification.modifiedAt));
}

export function entryHasOverlap(entry: TimeGridEntry, entries: TimeGridEntry[]) {
  if (!entry.startedAt || !entry.endedAt) return false;
  const start = Date.parse(entry.startedAt);
  const end = Date.parse(entry.endedAt);

  if (Number.isNaN(start) || Number.isNaN(end)) return false;

  return entries.some((other) => {
    if (other.id === entry.id || !other.startedAt || !other.endedAt) return false;
    const otherStart = Date.parse(other.startedAt);
    const otherEnd = Date.parse(other.endedAt);
    if (Number.isNaN(otherStart) || Number.isNaN(otherEnd)) return false;
    return start < otherEnd && otherStart < end;
  });
}

export function calculateIntervalMinutes(startTime: string, endTime: string) {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);

  if (start === null || end === null) return 0;

  const minutes = end > start ? end - start : end + DAILY_HARD_LIMIT_MINUTES - start;
  return minutes > 0 ? minutes : 0;
}

export function parseTimeToMinutes(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;

  const [hourValue, minuteValue] = value.split(":");
  const hour = Number.parseInt(hourValue ?? "", 10);
  const minute = Number.parseInt(minuteValue ?? "", 10);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return hour * 60 + minute;
}

export function formatDraftTimestamp(value: string) {
  return value.replace("T", " ").slice(0, 16);
}
