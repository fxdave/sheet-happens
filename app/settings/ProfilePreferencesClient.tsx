"use client";

import { Clock3, Eye, ImageUp, Leaf, Trash2 } from "lucide-react";
import { useActionState, useOptimistic, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Avatar } from "@/src/components/ui/Avatar";
import { Button } from "@/src/components/ui/Button";
import { Combobox } from "@/src/components/ui/Combobox";
import { SegmentedControl } from "@/src/components/ui/SegmentedControl";
import { Switch } from "@/src/components/ui/Switch";
import type { DurationDisplayFormat } from "@/src/lib/formatting";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/Dialog";
import { useResourceSaver } from "@/src/lib/use-resource-saver";
import { cn } from "@/src/lib/utils";
import {
  deleteMemberAvatarAction,
  updateMemberDurationDisplayFormatAction,
  updateMemberTimezoneAction,
  updateResourceSaverAction,
  uploadMemberAvatarAction,
} from "./actions";
import type { MemberPreferenceActionState } from "./actions.types";

const initialActionState: MemberPreferenceActionState = { status: "idle", message: "" };

export type ProfilePreferencesClientProps = {
  member: {
    name: string;
    initials: string;
    avatarSrc?: string;
    timezone: string;
    durationDisplayFormat: DurationDisplayFormat;
  };
  timezoneOptions: readonly { value: string; label: string }[];
};

export function ProfilePreferencesClient({
  member,
  timezoneOptions,
}: ProfilePreferencesClientProps) {
  const t = useTranslations("Settings.preferences");
  const [uploadState, uploadAction, uploadPending] = useActionState(
    uploadMemberAvatarAction,
    initialActionState,
  );
  const [timezoneState, timezoneAction, timezonePending] = useActionState(
    updateMemberTimezoneAction,
    initialActionState,
  );
  const [durationState, durationAction, durationPending] = useActionState(
    updateMemberDurationDisplayFormatAction,
    initialActionState,
  );
  const [durationDisplayFormat, setDurationDisplayFormat] = useState<DurationDisplayFormat>(
    member.durationDisplayFormat,
  );
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteState, setDeleteState] = useState<MemberPreferenceActionState>(initialActionState);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const resourceSaver = useResourceSaver();
  const [optimisticResourceSaver, setOptimisticResourceSaver] = useOptimistic(resourceSaver);
  const [, startResourceSaverTransition] = useTransition();

  function toggleResourceSaver(enabled: boolean) {
    startResourceSaverTransition(async () => {
      setOptimisticResourceSaver(enabled);
      await updateResourceSaverAction(enabled);
    });
  }

  function deleteAvatar() {
    startDeleteTransition(async () => {
      setDeleteState(await deleteMemberAvatarAction());
    });
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            {t("avatar.label")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t("avatar.description")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Avatar
            name={member.name}
            initials={member.initials}
            src={member.avatarSrc}
            size="xl"
            className="size-20 text-xl"
          />
          <div className="flex flex-wrap gap-2">
            <form action={uploadAction} className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                className="sr-only"
                type="file"
                name="avatar"
                accept="image/png,image/jpeg"
                required
                onChange={(event) =>
                  setSelectedFileName(event.currentTarget.files?.[0]?.name ?? "")
                }
              />
              <Button
                type="button"
                variant="soft"
                icon={ImageUp}
                onClick={() => fileRef.current?.click()}
              >
                {member.avatarSrc ? t("avatar.change") : t("avatar.upload")}
              </Button>
              {selectedFileName ? (
                <Button type="submit" loading={uploadPending}>
                  {t("avatar.save")}
                </Button>
              ) : null}
            </form>
            {member.avatarSrc ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  icon={Eye}
                  onClick={() => setPreviewOpen(true)}
                >
                  {t("avatar.view")}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  icon={Trash2}
                  loading={deletePending}
                  onClick={deleteAvatar}
                >
                  {t("avatar.delete")}
                </Button>
              </>
            ) : null}
          </div>
        </div>
        {selectedFileName ? (
          <p className="text-xs text-muted-foreground">{selectedFileName}</p>
        ) : null}
        <ActionNotice state={uploadState.status !== "idle" ? uploadState : deleteState} />
      </div>

      <div className="border-t border-border pt-6">
        <form action={timezoneAction} className="grid max-w-xl gap-3">
          <div>
            <label
              htmlFor="settings-timezone"
              className="text-xs font-semibold uppercase text-muted-foreground"
            >
              {t("timezone.label")}
            </label>
            <p className="mt-1 text-sm text-muted-foreground">{t("timezone.description")}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Combobox
              id="settings-timezone"
              name="timezone"
              label={t("timezone.label")}
              defaultValue={member.timezone}
              options={timezoneOptions}
              labels={{
                search: t("timezone.search"),
                searchPlaceholder: t("timezone.searchPlaceholder"),
                empty: t("timezone.empty"),
              }}
              required
            />
            <Button type="submit" loading={timezonePending}>
              {t("timezone.save")}
            </Button>
          </div>
          <ActionNotice state={timezoneState} />
        </form>
      </div>

      <div className="border-t border-border pt-6">
        <form action={durationAction} className="grid max-w-xl gap-3">
          <input type="hidden" name="durationDisplayFormat" value={durationDisplayFormat} />
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
              <Clock3 className="size-4" aria-hidden="true" />
              {t("durationDisplay.label")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t("durationDisplay.description")}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <SegmentedControl
              label={t("durationDisplay.label")}
              width="full"
              value={durationDisplayFormat}
              onValueChange={(value) => setDurationDisplayFormat(value as DurationDisplayFormat)}
              items={[
                { value: "DECIMAL_HOURS", label: t("durationDisplay.decimal") },
                { value: "HOURS_MINUTES", label: t("durationDisplay.hoursMinutes") },
              ]}
            />
            <Button type="submit" loading={durationPending}>
              {t("durationDisplay.save")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {durationDisplayFormat === "DECIMAL_HOURS"
              ? t("durationDisplay.decimalExample")
              : t("durationDisplay.hoursMinutesExample")}
          </p>
          <ActionNotice state={durationState} />
        </form>
      </div>

      <div className="border-t border-border pt-6">
        <div className="flex max-w-xl items-start justify-between gap-4">
          <div>
            <label
              htmlFor="settings-resource-saver"
              className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground"
            >
              <Leaf className="size-4" aria-hidden="true" />
              {t("resourceSaver.label")}
            </label>
            <p className="mt-1 text-sm text-muted-foreground">{t("resourceSaver.description")}</p>
          </div>
          <Switch
            id="settings-resource-saver"
            checked={optimisticResourceSaver}
            onCheckedChange={toggleResourceSaver}
          />
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent closeLabel={t("avatar.close")} className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("avatar.previewTitle")}</DialogTitle>
            <DialogDescription>{member.name}</DialogDescription>
          </DialogHeader>
          {member.avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- private signed image route.
            <img
              src={member.avatarSrc}
              alt={member.name}
              className="mx-auto aspect-square w-full max-w-80 rounded-[var(--radius-lg)] object-cover"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActionNotice({ state }: { state: MemberPreferenceActionState }) {
  if (state.status === "idle") return null;

  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={cn("text-sm", state.status === "error" ? "text-destructive" : "text-success")}
    >
      {state.message}
    </p>
  );
}
