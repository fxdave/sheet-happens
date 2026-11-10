import { cva } from "class-variance-authority";

/**
 * A day cell of the grid. Adjacent-month days are striped and their content faded; today is
 * outlined; weekend columns sit on a faint wash so the narrow pair reads as one block.
 */
export const monthCalendarCellVariants = cva(
  [
    "group/cell relative flex min-h-[7.75rem] min-w-0 flex-col items-stretch gap-1 border-b border-r border-border p-1.5 text-left",
    "transition-colors duration-[var(--duration-micro)] hover:bg-accent-soft/40",
    "focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
  ],
  {
    variants: {
      period: {
        current: "",
        adjacent:
          "bg-[repeating-linear-gradient(135deg,color-mix(in_srgb,var(--muted)_70%,transparent)_0_6px,transparent_6px_12px)]",
      },
      weekend: {
        true: "",
        false: "",
      },
      today: {
        true: "shadow-[inset_0_0_0_2px_var(--primary)]",
        false: "",
      },
    },
    compoundVariants: [{ period: "current", weekend: true, className: "bg-muted/35" }],
    defaultVariants: {
      period: "current",
      weekend: false,
      today: false,
    },
  },
);

/** A phone day row: one button, header line over its chips. */
export const monthCalendarRowVariants = cva(
  [
    "flex w-full min-w-0 flex-col items-stretch gap-1.5 px-3 py-2.5 text-left",
    "transition-colors duration-[var(--duration-micro)] hover:bg-accent-soft/40",
    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
  ],
  {
    variants: {
      today: {
        true: "bg-accent-soft/30",
        false: "",
      },
    },
    defaultVariants: {
      today: false,
    },
  },
);
