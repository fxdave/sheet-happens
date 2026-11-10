import type { LucideIcon } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";

export type TimeViewPanelTab = {
  value: string;
  label: string;
  icon: LucideIcon;
  /** The digit that selects it; hidden on a phone. */
  shortcut?: string;
  href: string;
};

export type TimeViewPanelLabels = {
  /** Accessible name of the tab strip — `View`. */
  tabs: string;
  /** The quiet `zoom out →` beside the tabs on a desktop; omitted when empty. */
  zoomHint?: string;
};

export type TimeViewPanelProps = {
  tabs: readonly TimeViewPanelTab[];
  value: string;
  labels: TimeViewPanelLabels;
  /** `‹ period ›` and `Today`, left in the bar. Dropped on a phone. */
  navigator?: ReactNode;
  /** The period total, right in the bar (left on a phone). */
  total: ReactNode;
  /** The running-timer pill or the start control; truncates rather than pushing the bar wide. */
  timer?: ReactNode;
  /** `+ Entry`, last in the bar. Dropped on a phone. */
  action?: ReactNode;
  /** A navigation is in flight: the body dims, briefly. */
  pending?: boolean;
  /** Lets the screen route a tab click through its own transition; default is the link. */
  onTabClick?: (value: string, event: MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
  children: ReactNode;
};
