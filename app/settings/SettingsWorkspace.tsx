"use client";

import {
  Bell,
  KeyRound,
  LockKeyhole,
  Plug,
  ShieldCheck,
  SlidersHorizontal,
  User,
} from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { Avatar } from "@/src/components/ui/Avatar";
import { Badge } from "@/src/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/Card";
import { cn } from "@/src/lib/utils";
import type { DurationDisplayFormat } from "@/src/lib/formatting";
import type { NotificationConfigurationValue } from "@/src/server/notifications";
import { ApiTokensClient, type ApiTokensClientProps } from "./ApiTokensClient";
import { ConnectedAppsClient, type ConnectedAppView } from "./ConnectedAppsClient";
import { NotificationSettingsClient } from "./NotificationSettingsClient";
import { ProfilePreferencesClient } from "./ProfilePreferencesClient";
import { SecuritySettingsClient, type SecuritySettingsClientProps } from "./SecuritySettingsClient";

type SettingsSection =
  "profile" | "security" | "connectedApps" | "apiTokens" | "preferences" | "notifications";

export type SettingsWorkspaceProps = {
  defaultSection?: SettingsSection;
  member: {
    name: string;
    initials: string;
    email: string;
    profile: "employee" | "contractor";
    timezone: string;
    durationDisplayFormat: DurationDisplayFormat;
    avatarSrc?: string;
  };
  timezoneOptions: readonly { value: string; label: string }[];
  security: SecuritySettingsClientProps;
  connectedApps: readonly ConnectedAppView[];
  apiTokens: ApiTokensClientProps;
  notificationConfiguration?: NotificationConfigurationValue;
};

export function SettingsWorkspace({
  defaultSection = "profile",
  member,
  timezoneOptions,
  security,
  connectedApps,
  apiTokens,
  notificationConfiguration,
}: SettingsWorkspaceProps) {
  const t = useTranslations("Settings");
  const [activeSection, setActiveSection] = useState<SettingsSection>(defaultSection);
  const sections = [
    { id: "profile" as const, icon: User, label: t("sections.profile") },
    { id: "security" as const, icon: ShieldCheck, label: t("sections.security") },
    { id: "connectedApps" as const, icon: Plug, label: t("sections.connectedApps") },
    { id: "apiTokens" as const, icon: KeyRound, label: t("sections.apiTokens") },
    { id: "preferences" as const, icon: SlidersHorizontal, label: t("sections.preferences") },
    ...(notificationConfiguration
      ? [{ id: "notifications" as const, icon: Bell, label: t("sections.notifications") }]
      : []),
  ];

  return (
    <div className="grid gap-6 md:grid-cols-[14rem_minmax(0,1fr)] md:items-start">
      <nav aria-label={t("sections.label")} className="hidden gap-1 md:grid">
        {sections.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            aria-current={activeSection === id ? "page" : undefined}
            onClick={() => setActiveSection(id)}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-4 text-left text-sm font-semibold transition",
              activeSection === id
                ? "bg-accent-soft text-accent"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>

      <div className="grid min-w-0 gap-6">
        <SettingsPanel
          id="profile"
          active={activeSection === "profile"}
          title={t("profile.title")}
          description={t("profile.description")}
          compact
        >
          <ProfilePanel member={member} />
        </SettingsPanel>
        {notificationConfiguration ? (
          <SettingsPanel
            id="notifications"
            active={activeSection === "notifications"}
            title={t("notifications.title")}
            description={t("notifications.description")}
          >
            <NotificationSettingsClient
              value={notificationConfiguration}
              timezoneOptions={timezoneOptions}
            />
          </SettingsPanel>
        ) : null}
        <SettingsPanel
          id="security"
          active={activeSection === "security"}
          title={t("securitySection.title")}
          description={t("securitySection.description")}
          unframed
        >
          <SecuritySettingsClient {...security} />
        </SettingsPanel>
        <SettingsPanel
          id="connectedApps"
          active={activeSection === "connectedApps"}
          title={t("connectedApps.title")}
          description={t("connectedApps.description")}
          compact
        >
          <ConnectedAppsClient connections={connectedApps} />
        </SettingsPanel>
        <SettingsPanel
          id="apiTokens"
          active={activeSection === "apiTokens"}
          title={t("apiTokens.title")}
          description={t("apiTokens.description")}
          compact
        >
          <ApiTokensClient {...apiTokens} />
        </SettingsPanel>
        <SettingsPanel
          id="preferences"
          active={activeSection === "preferences"}
          title={t("preferences.title")}
          description={t("preferences.description")}
          compact
        >
          <ProfilePreferencesClient member={member} timezoneOptions={timezoneOptions} />
        </SettingsPanel>
      </div>
    </div>
  );
}

function SettingsPanel({
  id,
  active,
  title,
  description,
  children,
  unframed = false,
  compact = false,
}: {
  id: SettingsSection;
  active: boolean;
  title: string;
  description: string;
  children: React.ReactNode;
  unframed?: boolean;
  compact?: boolean;
}) {
  const heading = (
    <div className="mb-4 md:hidden">
      <p className="text-xs font-semibold uppercase text-accent">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );

  if (unframed) {
    return (
      <section id={`settings-${id}`} className={cn("min-w-0", !active && "md:hidden")}>
        {heading}
        {children}
      </section>
    );
  }

  return (
    <section
      id={`settings-${id}`}
      className={cn("min-w-0", compact && "md:max-w-3xl", !active && "md:hidden")}
    >
      {heading}
      <Card density="lg">
        <CardHeader className="block">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </section>
  );
}

function ProfilePanel({ member }: { member: SettingsWorkspaceProps["member"] }) {
  const t = useTranslations("Settings.profile");
  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={member.name} initials={member.initials} src={member.avatarSrc} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{member.name}</p>
            <p className="truncate text-sm text-muted-foreground">{member.email}</p>
          </div>
        </div>
        <Badge tone="neutral" className="shrink-0 gap-1">
          <LockKeyhole className="size-3" aria-hidden="true" />
          {t("readOnly")}
        </Badge>
      </div>
      <dl className="divide-y divide-border border-y border-border">
        <ProfileRow label={t("name")} value={member.name} />
        <ProfileRow label={t("email")} value={member.email} />
        <ProfileRow
          label={t("profile")}
          value={
            <Badge tone={member.profile === "employee" ? "warning" : "info"} dot>
              {t(`profiles.${member.profile}`)}
            </Badge>
          }
        />
      </dl>
      <p className="rounded-[var(--radius-md)] bg-secondary px-4 py-3 text-sm text-muted-foreground">
        {t("adminManaged")}
      </p>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(6rem,0.4fr)_minmax(0,1fr)] items-center gap-4 py-3">
      <dt className="text-xs font-semibold uppercase text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-semibold">{value}</dd>
    </div>
  );
}
