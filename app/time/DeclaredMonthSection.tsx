"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { DeclaredHoursRow } from "@/src/components/sheet/DeclaredHoursRow";
import { formatDateTime } from "@/src/lib/formatting";
import type { MemberMonthOverview } from "@/src/server/time-tracking";

import { saveMonthlyHourDeclarationAction, uploadDeclarationProofAction } from "./actions";
import type { TimeViewActions } from "./TimePageClient";
import { countDaysInMonth, formatBytesLabel } from "./time-entry-helpers";
import { useDurationFormatting } from "./use-duration-formatting";

type RowState = {
  projectId: string | null;
  saving: boolean;
  uploading: boolean;
  savedAt: number | null;
  error: string | null;
};

const idle: RowState = {
  projectId: null,
  saving: false,
  uploading: false,
  savedAt: null,
  error: null,
};

type DeclaredMonthSectionProps = {
  month: MemberMonthOverview;
  monthLocked: boolean;
  actions: TimeViewActions;
};

/** A hybrid member's declared projects for the shown month, editable under the calendar. */
export function DeclaredMonthSection({ month, monthLocked, actions }: DeclaredMonthSectionProps) {
  const t = useTranslations("TimeTracking");
  const locale = useLocale();
  const { durationDisplayFormat, formatMinutesWithUnit } = useDurationFormatting();
  const [, startTransition] = useTransition();
  const [row, setRow] = useState<RowState>(idle);
  const sanityLimit = countDaysInMonth(month.monthStart) * 24 * 60;

  if (!month.declared.length) return null;

  function save(input: { projectId: string; minutes: number; note: string }) {
    setRow({ ...idle, projectId: input.projectId, saving: true });

    startTransition(async () => {
      const result = await saveMonthlyHourDeclarationAction({
        ...input,
        periodStart: month.monthStart,
      });
      const ok = result.status === "success";

      setRow({
        ...idle,
        projectId: input.projectId,
        savedAt: ok ? Date.now() : null,
        error: ok ? null : result.message,
      });
      if (ok) actions.notifyResult(result);
    });
  }

  function uploadProof(input: { projectId: string; file: File }) {
    setRow({ ...idle, projectId: input.projectId, uploading: true });

    startTransition(async () => {
      const formData = new FormData();
      formData.set("projectId", input.projectId);
      formData.set("periodStart", month.monthStart);
      formData.set("proofFile", input.file);

      const result = await uploadDeclarationProofAction({ status: "idle", message: "" }, formData);
      const ok = result.status === "success";

      setRow({ ...idle, projectId: input.projectId, error: ok ? null : result.message });
      if (ok) actions.notifyResult(result);
    });
  }

  return (
    <section aria-labelledby="weeks-declared-heading" className="min-w-0 border-t border-border">
      <h2
        id="weeks-declared-heading"
        className="border-b border-border px-4 py-2.5 font-ui text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
      >
        {t("month.declaredHeading")}
      </h2>
      {month.declared.map((project) => {
        const mine = row.projectId === project.projectId;

        return (
          <DeclaredHoursRow
            key={project.projectId}
            project={{ projectId: project.projectId, name: project.name, color: project.color }}
            minutes={project.minutes}
            note={project.note}
            proof={
              project.proof
                ? {
                    filename: project.proof.filename,
                    href: `/time/hours-proof/${project.proof.declarationId}`,
                    sizeLabel: formatBytesLabel(project.proof.byteSize, locale),
                    uploadedAtLabel: formatDateTime(project.proof.uploadedAt, locale),
                  }
                : null
            }
            locale={locale}
            durationDisplayFormat={durationDisplayFormat}
            locked={monthLocked}
            disabled={actions.pending}
            saving={mine && row.saving}
            uploading={mine && row.uploading}
            savedAt={mine ? row.savedAt : null}
            error={mine ? row.error : null}
            warning={
              project.minutes !== null && project.minutes > sanityLimit
                ? t("declared.sanityWarning", { hours: formatMinutesWithUnit(sanityLimit) })
                : null
            }
            labels={{
              hoursLabel: (declared) => t("declared.hoursLabel", { project: declared.name }),
              hoursPlaceholder: t("declared.hoursPlaceholder"),
              hoursHint: t("declared.hoursHint"),
              noteLabel: (declared) => t("declared.noteLabel", { project: declared.name }),
              notePlaceholder: t("declared.notePlaceholder"),
              noteRequired: t("declared.noteRequired"),
              proofLabel: t("declared.proofLabel"),
              proofUpload: t("declared.proofUpload"),
              proofReplace: t("declared.proofReplace"),
              proofView: t("declared.proofView"),
              proofMissing: t("declared.proofMissing"),
              proofNeedsHours: t("declared.proofNeedsHours"),
              proofUploading: t("declared.proofUploading"),
              save: t("declared.save"),
              saving: t("declared.saving"),
              saved: t("declared.saved"),
              locked: t("declared.locked"),
              nothingDeclared: t("declared.nothingDeclared"),
              externalSystem: t("declared.externalSystem"),
            }}
            onSave={save}
            onUploadProof={uploadProof}
          />
        );
      })}
    </section>
  );
}
