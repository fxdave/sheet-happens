import type { ReactNode, RefObject } from "react";

import type { MonthPickerLabels } from "../../ui/MonthPicker";

export type PeriodNavigatorLabels = {
  /** `Previous week` — already carrying the unit, because the header is the unit. */
  previous: string;
  next: string;
  today: string;
  /** Read out with the disabled Today button — `You are on today`. */
  atToday: string;
  /** The label button's tooltip — `Jump to a month`. */
  pick: string;
  monthPicker: MonthPickerLabels;
};

export type PeriodNavigatorShortcuts = {
  previous?: string;
  next?: string;
  today?: string;
};

export type PeriodNavigatorProps = {
  /** The period as the header names it — `Week 36 · Aug 31 – Sep 6, 2026`. */
  label: string;
  /** Changes with the period; keys the label's slide. The period start ISO works. */
  periodKey: string;
  /** Which way the last step went, so the label slides in from that side. `0` crossfades. */
  direction: 1 | -1 | 0;
  /** Whether today is in view, which dims Today and marks it "you are here". */
  atToday: boolean;
  /** The month the picker opens on, `YYYY-MM`. */
  month: string;
  locale: string;
  labels: PeriodNavigatorLabels;
  shortcuts?: PeriodNavigatorShortcuts;
  /** The `⋯` menu, or anything else that belongs at the row's end. */
  menu?: ReactNode;
  /** The label button, so the screen can land focus on it after a view change. */
  labelRef?: RefObject<HTMLButtonElement | null>;
  disabled?: boolean;
  /** Forward would pass today. */
  nextDisabled?: boolean;
  className?: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onPickMonth: (month: string) => void;
};
