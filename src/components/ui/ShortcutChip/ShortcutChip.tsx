import { cn } from "@/src/lib/utils";
import type { ShortcutChipProps } from "./ShortcutChip.types";

/** A key cap. `inline` prefixes a dot for use after a tooltip's text; `tab` sits inside a control. */
export function ShortcutChip({ children, variant = "inline", className }: ShortcutChipProps) {
  const chip = (
    <kbd
      className={cn(
        "rounded-[var(--radius-xs)] border border-border-strong px-1 font-ui text-[10px] font-semibold leading-4",
        variant === "inline" ? "bg-background/60" : "text-muted-foreground",
        className,
      )}
    >
      {children}
    </kbd>
  );

  if (variant === "tab") return chip;

  return (
    <>
      <span aria-hidden="true"> · </span>
      {chip}
    </>
  );
}
