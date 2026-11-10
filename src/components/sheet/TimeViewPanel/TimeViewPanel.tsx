import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { cn } from "@/src/lib/utils";
import { ShortcutChip } from "../../ui/ShortcutChip";
import type { TimeViewPanelProps } from "./TimeViewPanel.types";

/**
 * The `/time` frame: folder tabs fused to the top edge of one panel, the period bar under them,
 * then the view. The tabs share the panel's surface so the controls read as part of what they
 * control; the bar is the same on every view and only its contents change.
 */
export function TimeViewPanel({
  tabs,
  value,
  labels,
  navigator,
  total,
  timer,
  action,
  pending = false,
  onTabClick,
  className,
  children,
}: TimeViewPanelProps) {
  return (
    <div className={cn("@container min-w-0", className)}>
      {tabs.length > 1 ? (
        <div className="relative z-[1] flex min-w-0 items-end gap-1 pl-2.5 sm:pl-3.5">
          <nav aria-label={labels.tabs} className="flex min-w-0 items-end gap-1">
            {tabs.map((tab) => {
              const active = tab.value === value;
              const Icon = tab.icon;

              return (
                <Link
                  key={tab.value}
                  href={tab.href as Route}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-w-0 items-center gap-2 rounded-t-[var(--radius-md)] border border-b-0 border-border px-3 pt-2 pb-2.5 font-ui text-[13px] font-semibold whitespace-nowrap transition-colors duration-[var(--duration-micro)] focus-visible:outline-2 focus-visible:outline-ring sm:px-[18px] sm:text-sm",
                    active
                      ? "-mb-px bg-card pb-3 text-foreground before:absolute before:inset-x-2.5 before:-top-px before:h-[3px] before:rounded-b-[3px] before:bg-accent"
                      : "bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                  onClick={onTabClick ? (event) => onTabClick(tab.value, event) : undefined}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{tab.label}</span>
                  {tab.shortcut ? (
                    <ShortcutChip variant="tab" className="hidden sm:inline" aria-hidden>
                      {tab.shortcut}
                    </ShortcutChip>
                  ) : null}
                </Link>
              );
            })}
          </nav>
          {labels.zoomHint ? (
            <span
              aria-hidden="true"
              className="mb-2.5 ml-2 hidden shrink-0 items-center gap-1 text-xs text-subtle-foreground lg:flex"
            >
              {labels.zoomHint}
              <ArrowRight className="size-3" />
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="relative min-w-0 rounded-[var(--radius-lg)] border border-border bg-card text-card-foreground shadow-soft max-sm:rounded-b-none">
        <div className="flex min-w-0 flex-nowrap items-center gap-3 border-b border-border px-3 py-2.5 sm:flex-wrap sm:px-4 sm:py-3">
          {navigator ? <div className="hidden min-w-0 sm:flex">{navigator}</div> : null}
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3 sm:min-w-auto sm:justify-end">
            <div className="shrink-0">{total}</div>
            {timer ? (
              <div className="flex min-w-0 justify-end sm:min-w-[8.5rem]">{timer}</div>
            ) : null}
            {action ? <div className="hidden shrink-0 sm:block">{action}</div> : null}
          </div>
        </div>

        <div
          aria-busy={pending || undefined}
          className={cn(
            "min-w-0 transition-opacity duration-150 motion-reduce:transition-none",
            pending && "opacity-60",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
