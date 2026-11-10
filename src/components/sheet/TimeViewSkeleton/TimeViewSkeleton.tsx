import { cn } from "@/src/lib/utils";
import type { TimeViewSkeletonProps } from "./TimeViewSkeleton.types";

/**
 * The shape of a `/time` view while its data is on the way: the Days log, the Weeks month grid or
 * the Months year grid. Static blocks — no shimmer — so it costs nothing to paint and never
 * animates, whatever the motion or power settings.
 */
export function TimeViewSkeleton({ view, label, className }: TimeViewSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      data-skeleton={view}
      className={cn("@container min-w-0", className)}
    >
      <span className="sr-only">{label}</span>
      {view === "days" ? <DaysShape /> : view === "weeks" ? <WeeksShape /> : <MonthsShape />}
    </div>
  );
}

function Block({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("block rounded bg-[var(--skeleton)]", className)} />
  );
}

/** Composer, a week heading, then day cards with a header strip and rows, as `DayLog` lays out. */
function DaysShape() {
  return (
    <div className="grid min-w-0 gap-1.5 px-2.5 pt-3 pb-3 sm:px-4 sm:pt-3.5">
      <Block className="h-[3.25rem] rounded-[var(--radius-md)]" />
      {[3, 2, 4].map((rows, card) => (
        <div key={card} className="grid min-w-0 gap-1.5">
          {card === 0 ? (
            <div className="flex items-center justify-between px-1.5 pt-3 pb-1">
              <Block className="h-3 w-40" />
              <Block className="h-3 w-10" />
            </div>
          ) : null}
          <div className="min-w-0 rounded-[var(--radius-md)] border border-border">
            <div className="flex items-center gap-3 rounded-t-[var(--radius-md)] bg-surface-inset px-3.5 py-2.5">
              <Block className="h-3.5 w-24" />
              <Block className="ml-auto h-3.5 w-10" />
              <Block className="h-1 w-[70px] max-sm:hidden" />
              <Block className="size-7 rounded-[var(--radius-sm)]" />
            </div>
            {Array.from({ length: rows }, (_, row) => (
              <div key={row} className="flex items-center gap-3 border-t border-border px-3.5 py-3">
                <Block className="h-6 w-1 rounded-[3px]" />
                <Block className={cn("h-3.5", row % 2 ? "w-1/3" : "w-1/2")} />
                <Block className="ml-auto h-3 w-24 max-sm:hidden" />
                <Block className="h-3.5 w-9" />
                <Block className="size-7 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Weekday header and five week rows on a desktop; a week list on a phone, as `MonthCalendar`. */
function WeeksShape() {
  return (
    <>
      <div className="hidden min-w-0 md:block">
        <div className="grid grid-cols-[repeat(5,minmax(0,1fr))_repeat(2,minmax(0,0.55fr))_minmax(3.25rem,4.75rem)] border-b border-border">
          {Array.from({ length: 8 }, (_, index) => (
            <span key={index} className="px-2 py-2.5">
              <Block className="h-2.5 w-8" />
            </span>
          ))}
        </div>
        {Array.from({ length: 5 }, (_, row) => (
          <div
            key={row}
            className="grid grid-cols-[repeat(5,minmax(0,1fr))_repeat(2,minmax(0,0.55fr))_minmax(3.25rem,4.75rem)] last:[&>*]:border-b-0"
          >
            {Array.from({ length: 8 }, (_, cell) => (
              <span
                key={cell}
                className="grid min-h-[7.75rem] content-start gap-2 border-r border-b border-border px-1.5 py-1.5 last:border-r-0"
              >
                <Block className="h-3 w-5" />
                {cell < 5 && (row + cell) % 3 !== 2 ? <Block className="h-7" /> : null}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="grid min-w-0 gap-4 p-2.5 md:hidden">
        {[3, 4].map((days, group) => (
          <div key={group} className="grid min-w-0 gap-2">
            <div className="flex justify-between px-1">
              <Block className="h-3 w-32" />
              <Block className="h-3 w-8" />
            </div>
            <div className="min-w-0 rounded-[var(--radius-md)] border border-border">
              {Array.from({ length: days }, (_, day) => (
                <div
                  key={day}
                  className="grid gap-2 border-b border-border px-3 py-3 last:border-b-0"
                >
                  <Block className="h-3.5 w-24" />
                  <Block className="h-9" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** Twelve month cards in the year grid's columns, as `YearCalendar`. */
function MonthsShape() {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 p-3 sm:p-4 @min-[28rem]:grid-cols-2 @min-[40rem]:grid-cols-3 @min-[56rem]:grid-cols-4">
      {Array.from({ length: 12 }, (_, month) => (
        <div
          key={month}
          className={cn(
            "grid min-w-0 gap-2 rounded-[var(--radius-md)] border border-border p-3",
            // A phone shows the first months only; the rest is below the fold anyway.
            month >= 3 && "@max-[28rem]:hidden",
          )}
        >
          <div className="flex justify-between">
            <Block className="h-4 w-20" />
            <Block className="h-4 w-12" />
          </div>
          <Block className="h-2 w-full opacity-60" />
          <div className="grid grid-cols-7 gap-x-1.5 gap-y-[0.4rem]">
            {Array.from({ length: 42 }, (_, day) => (
              <Block key={day} className="aspect-square rounded-[var(--radius-xs)]" />
            ))}
          </div>
          <Block className="mt-1 ml-auto h-5 w-14 rounded-[var(--radius-pill)]" />
        </div>
      ))}
    </div>
  );
}
