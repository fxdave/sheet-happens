export type ShortcutChipProps = {
  children: string;
  variant?: "inline" | "tab";
  className?: string;
  /** Hide the cap from the accessible name when the control already names its key elsewhere. */
  "aria-hidden"?: boolean;
};
