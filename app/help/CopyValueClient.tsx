"use client";

import { Check, Copy } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/src/components/ui/Button";

export type CopyValueClientProps = {
  value: string;
  labels: { copy: string; copied: string; failed: string };
  /** Accessible name of the value itself, when the surrounding text does not give one. */
  valueLabel?: string;
  /** `block` keeps multi-line values (a curl command) in a scrollable `pre`. */
  variant?: "inline" | "block";
};

/**
 * A value plus a copy button. The button label never changes; a `role="status"` line reports the
 * outcome so the button stays addressable by one name.
 */
export function CopyValueClient({
  value,
  labels,
  valueLabel,
  variant = "inline",
}: CopyValueClientProps) {
  const [outcome, setOutcome] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copy() {
    if (resetTimer.current) clearTimeout(resetTimer.current);

    try {
      await navigator.clipboard.writeText(value);
      setOutcome("copied");
      resetTimer.current = setTimeout(() => setOutcome("idle"), 4000);
    } catch {
      // Sticky: it tells the reader to copy by hand, so it must not vanish.
      setOutcome("failed");
    }
  }

  return (
    <div className="grid min-w-0 gap-2">
      <div
        className={
          variant === "block"
            ? "grid min-w-0 gap-2"
            : "grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
        }
      >
        {variant === "block" ? (
          <pre
            aria-label={valueLabel}
            className="min-w-0 overflow-x-auto rounded-[var(--radius-md)] border border-border bg-background/55 px-3 py-2 font-mono text-xs leading-6 text-foreground"
          >
            <code>{value}</code>
          </pre>
        ) : (
          <p
            aria-label={valueLabel}
            className="min-w-0 break-all rounded-[var(--radius-md)] border border-border bg-background/55 px-3 py-2 font-mono text-sm text-foreground"
          >
            {value}
          </p>
        )}
        <Button
          type="button"
          variant="soft"
          size="sm"
          icon={outcome === "copied" ? Check : Copy}
          className="justify-self-start"
          onClick={() => void copy()}
        >
          {labels.copy}
        </Button>
      </div>
      <p role="status" className="min-h-5 text-sm leading-5 text-muted-foreground">
        {outcome === "copied" ? labels.copied : outcome === "failed" ? labels.failed : null}
      </p>
    </div>
  );
}
