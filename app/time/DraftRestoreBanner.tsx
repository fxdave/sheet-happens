"use client";

import { Info, RotateCcw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { formatDraftTimestamp } from "./time-entry-helpers";

/** An entry dialog left half-filled survives a reload; this offers it back. */
export function DraftRestoreBanner({
  updatedAt,
  onDiscard,
  onRestore,
}: {
  updatedAt: string;
  onDiscard: () => void;
  onRestore: () => void;
}) {
  const t = useTranslations("TimeTracking");

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-card text-accent">
          <Info className="size-4" aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold">{t("draft.title")}</p>
          <p className="text-muted-foreground">
            {t("draft.lastSaved", { time: formatDraftTimestamp(updatedAt) })}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          onClick={onDiscard}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          {t("actions.discard")}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-[color-mix(in_srgb,var(--accent)_88%,black)]"
          onClick={onRestore}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {t("actions.restoreDraft")}
        </button>
      </div>
    </div>
  );
}
