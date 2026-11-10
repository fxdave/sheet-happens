/**
 * Date and timestamp formatting.
 *
 * Date-only values (`YYYY-MM-DD`) are calendar dates, not instants, so every helper that
 * takes one pins `timeZone: "UTC"`. Without it a UTC-midnight instant renders as the
 * previous day on any host west of UTC.
 *
 * Named `formatDateLabel` rather than `formatDateOnly` on purpose: `formatDateOnly` in
 * `src/server/time-tracking` converts a `Date` into a `YYYY-MM-DD` string, which is the
 * opposite direction.
 */

export type DateLabelStyle = "full" | "medium" | "short";

export type FormatDateLabelOptions = {
  /**
   * `medium` renders `Jul 1, 2026`, `short` renders `Jul 1`, and `full` renders
   * `Wednesday, July 1, 2026`. `full` exists for the calendar grid, where each day button
   * needs a self-contained accessible name.
   */
  style?: DateLabelStyle;
};

export type FormatWeekdayLabelOptions = {
  /** `short` renders `Wed`, `narrow` renders `W`, `long` renders `Wednesday`. */
  style?: "short" | "narrow" | "long";
};

export type FormatMonthNameOptions = {
  /** `short` renders `Jul`, `long` renders `July`. */
  style?: "short" | "long";
};

export type FormatTimeOptions = {
  /** Pin the rendering zone. Omit to use the host zone. */
  timeZone?: string;
  /**
   * Name the zone the value was rendered in, so the reader cannot mistake it for their own clock.
   *
   * `shortOffset` — `GMT+2` — is the form Intl renders identically in both catalogues. `short`
   * says `CEST` in Hungarian and `GMT+2` in English for the very same zone, which makes the two
   * language versions of one document look like two different documents.
   */
  timeZoneName?: Intl.DateTimeFormatOptions["timeZoneName"];
};

function dateOnlyToInstant(isoDate: string) {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

/** `Jul 1, 2026` (medium), `Jul 1` (short), or `Wednesday, July 1, 2026` (full). */
export function formatDateLabel(
  isoDate: string,
  locale: string,
  options: FormatDateLabelOptions = {},
) {
  const instant = dateOnlyToInstant(isoDate);

  if (options.style === "full") {
    return new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "UTC" }).format(instant);
  }

  return new Intl.DateTimeFormat(locale, {
    ...(options.style === "short" ? {} : { year: "numeric" }),
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(instant);
}

/** `Wed` (short), `W` (narrow), or `Wednesday` (long) from a `YYYY-MM-DD` string. */
export function formatWeekdayLabel(
  isoDate: string,
  locale: string,
  options: FormatWeekdayLabelOptions = {},
) {
  return new Intl.DateTimeFormat(locale, {
    weekday: options.style ?? "short",
    timeZone: "UTC",
  }).format(dateOnlyToInstant(isoDate));
}

/**
 * `Jul` (short) or `July` (long) — the month name alone.
 *
 * Distinct from `formatMonthLabel`, which always carries the year. The month grid renders
 * twelve cells under a single year heading, so repeating the year in every cell is noise.
 */
export function formatMonthName(
  isoDate: string,
  locale: string,
  options: FormatMonthNameOptions = {},
) {
  return new Intl.DateTimeFormat(locale, {
    month: options.style ?? "short",
    timeZone: "UTC",
  }).format(dateOnlyToInstant(isoDate));
}

/** `Jul 1, 2026 - Jul 31, 2026` from two `YYYY-MM-DD` strings. */
export function formatPeriodRange(
  start: string,
  end: string,
  locale: string,
  options: FormatDateLabelOptions = {},
) {
  return `${formatDateLabel(start, locale, options)} - ${formatDateLabel(end, locale, options)}`;
}

/**
 * `Aug 31 – Sep 6, 2026` (EN) or `2026. aug. 31. – szept. 6.` (HU) from two `YYYY-MM-DD` strings.
 *
 * `formatRange` rather than two `formatDateLabel`s joined by a dash: a range formatter drops the
 * parts the two ends share, which is what makes the week header read as one period rather than two
 * dates, and it puts the year where the locale puts it.
 */
export function formatDateRangeLabel(start: string, end: string, locale: string) {
  return (
    new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    })
      .formatRange(dateOnlyToInstant(start), dateOnlyToInstant(end))
      /* Node's ICU sets the dash in U+2009 THIN SPACE, Chrome's in a plain space. The label is
         rendered on the server and hydrated in the browser, so the two have to agree byte for byte
         or every week that crosses a month reports a hydration mismatch. */
      .replace(/[\u2009\u202f]/g, " ")
  );
}

/** `Nov 9 – 15` (EN) or `nov. 9–15.` (HU): a range inside a known year, as a week heading names it. */
export function formatShortDateRangeLabel(start: string, end: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" })
    .formatRange(dateOnlyToInstant(start), dateOnlyToInstant(end))
    .replace(/[\u2009\u202f]/g, " ");
}

/** `Tue, Nov 10` (EN) or `nov. 10., kedd` (HU): a day as a day card names it. */
export function formatDayCardLabel(isoDate: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    // Hungarian short weekdays are one or two letters (`K`, `Sze`), too terse to read as a day.
    weekday: locale.startsWith("hu") ? "long" : "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(dateOnlyToInstant(isoDate));
}

/**
 * `Monday, Aug 31, 2026` (EN) or `2026. aug. 31., hétfő` (HU) — a day as the period header names
 * it: weekday first in English, last in Hungarian, the locale deciding.
 */
export function formatDayHeading(isoDate: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateOnlyToInstant(isoDate));
}

/** `July 2026` from a `YYYY-MM-DD` string. */
export function formatMonthLabel(isoDate: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateOnlyToInstant(isoDate));
}

/**
 * `Jul 31, 2026, 02:00 PM` — an instant with an explicit, zero-padded time.
 *
 * Unlike the date-only helpers above, an instant has no single right zone to pin, so this renders
 * in the host's unless `timeZone` says otherwise. That is correct in a Client Component, where the
 * host is the reader's own browser, and wrong on the server, where it is whatever the deployment
 * happens to run in — pass `timeZone` there, and `timeZoneName` so the output says which.
 */
export function formatDateTime(
  value: Date | string,
  locale: string,
  options: FormatTimeOptions = {},
) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
    ...(options.timeZoneName ? { timeZoneName: options.timeZoneName } : {}),
  }).format(typeof value === "string" ? new Date(value) : value);
}

/** `Jul 31, 2026, 2:00 PM` — an instant via locale date/time styles. `-` when absent. */
export function formatTimestamp(
  value: string | null,
  locale: string,
  options: FormatTimeOptions = {},
) {
  if (!value) return "-";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
    ...(options.timeZoneName ? { timeZoneName: options.timeZoneName } : {}),
  }).format(new Date(value));
}
