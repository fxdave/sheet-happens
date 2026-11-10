import { cva } from "class-variance-authority";

/**
 * A day square. Shades mix the primary into the card so both themes follow the tokens; an
 * overworked day takes the warning fill instead of a fifth teal.
 */
export const yearDayVariants = cva(
  "relative grid aspect-square min-w-0 place-items-center rounded-[4px] font-ui text-[9px] leading-none font-semibold tabular-nums transition-[filter,box-shadow] duration-[var(--duration-micro)] outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card @min-[13rem]:text-[10px] @min-[19rem]:text-xs",
  {
    variants: {
      level: {
        0: "bg-muted text-muted-foreground",
        1: "bg-[color-mix(in_srgb,var(--primary)_26%,var(--card))] text-foreground",
        2: "bg-[color-mix(in_srgb,var(--primary)_58%,var(--card))] text-foreground",
        3: "bg-primary text-primary-foreground",
        4: "bg-warning text-warning-foreground",
      },
      weekend: {
        true: "",
        false: "",
      },
      timing: {
        past: "",
        today: "ring-2 ring-foreground ring-offset-1 ring-offset-card",
        future: "",
      },
    },
    compoundVariants: [
      // A weekend without hours is not a gap, so it gets no fill.
      { level: 0, weekend: true, className: "bg-transparent text-subtle-foreground" },
      {
        level: 0,
        timing: "future",
        className:
          "border border-dashed border-border-strong bg-transparent text-subtle-foreground",
      },
    ],
    defaultVariants: {
      level: 0,
      weekend: false,
      timing: "past",
    },
  },
);

export const yearMonthCardVariants = cva(
  "group/month relative flex min-w-0 flex-col rounded-[var(--radius-md)] border bg-card px-3 pt-2.5 pb-3 transition-[border-color,box-shadow] duration-[var(--duration-micro)] has-[[data-month-trigger]:focus-visible]:ring-2 has-[[data-month-trigger]:focus-visible]:ring-ring",
  {
    variants: {
      timing: {
        past: "border-border hover:border-border-strong",
        current: "border-primary shadow-[0_0_0_1px_var(--primary)]",
        future: "border-border opacity-60 hover:opacity-80",
      },
    },
    defaultVariants: {
      timing: "past",
    },
  },
);
