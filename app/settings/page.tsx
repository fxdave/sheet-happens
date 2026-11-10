import { ShieldCheck, ShieldPlus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AppShell } from "@/src/components/layout/AppShell";
import { Badge } from "@/src/components/ui/Badge";
import { Button } from "@/src/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/Card";
import { SectionHead } from "@/src/components/ui/SectionHead";
import { getMemberPreferenceOptions } from "@/src/lib/member-preferences";
import {
  mapMemberToShellProfile,
  mapMemberToShellRole,
  mapMemberToShellUser,
  requireSecuritySettingsAppMember,
  sanitizeCallbackURL,
} from "@/src/server/auth/app-access";
import { listApiTokens } from "@/src/server/api-tokens";
import { authUrls } from "@/src/server/auth/auth-urls";
import { getGoogleAuthSettings } from "@/src/server/auth/sign-in-methods";
import { prisma } from "@/src/server/db/client";
import { listMcpConnections, type McpConnection } from "@/src/server/mcp/connections";
import { groupConsentScopes } from "@/src/server/mcp/consent";
import { MCP_SCOPES } from "@/src/server/mcp/scopes";
import { getNotificationConfiguration } from "@/src/server/notifications";
import type { ConnectedAppView } from "./ConnectedAppsClient";
import { SettingsWorkspace } from "./SettingsWorkspace";

export const dynamic = "force-dynamic";

type SettingsPageProps = {
  searchParams: Promise<{
    callbackURL?: string | string[];
    reason?: string | string[];
    setup?: string | string[];
    section?: string | string[];
  }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const callbackURL = sanitizeCallbackURL(getSingleParam(params.callbackURL));
  const setupParam = getSingleParam(params.setup);
  const setupReason = getSingleParam(params.reason);
  const requestedSection = getSingleParam(params.section);
  const access = await requireSecuritySettingsAppMember("/settings");
  const t = await getTranslations("Settings");
  const { member, authUser } = access;
  const securityState = await getSecurityState(authUser.id);
  const connectedApps = await listMcpConnections({ authUserId: authUser.id });
  const apiTokens = await listApiTokens({ memberId: member.id });
  const googleAuthSettings = getGoogleAuthSettings();
  const notificationConfiguration =
    member.role === "ADMIN" ? await getNotificationConfiguration() : undefined;
  const hasSecurityMethod = securityState.twoFactorEnabled || securityState.passkeys.length > 0;
  const adminTotpRequired = member.role === "ADMIN" && !securityState.twoFactorEnabled;
  const showSetupBanner =
    access.status === "security_setup_required" ||
    setupParam === "required" ||
    setupReason === "admin-totp-required" ||
    adminTotpRequired;
  const setupStillRequired = !hasSecurityMethod || adminTotpRequired;
  const shellUser = mapMemberToShellUser(member);
  const preferenceOptions = getMemberPreferenceOptions();
  const defaultSection = showSetupBanner
    ? "security"
    : requestedSection === "security" ||
        requestedSection === "preferences" ||
        requestedSection === "connectedApps" ||
        requestedSection === "apiTokens" ||
        (requestedSection === "notifications" && member.role === "ADMIN")
      ? requestedSection
      : "profile";

  return (
    <AppShell
      current="settings"
      role={mapMemberToShellRole(member)}
      profile={mapMemberToShellProfile(member)}
      user={shellUser}
    >
      <section className="mx-auto grid w-full max-w-[86rem] gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <SectionHead
          eyebrow={t("page.eyebrow")}
          title={t("page.title")}
          subtitle={t("page.subtitle")}
        />
        {showSetupBanner ? (
          <SecuritySetupBanner
            adminTotpRequired={adminTotpRequired}
            callbackURL={callbackURL}
            complete={!setupStillRequired}
            t={t}
          />
        ) : null}
        <SettingsWorkspace
          defaultSection={defaultSection}
          member={{
            name: shellUser.name,
            initials: shellUser.initials,
            email: member.email,
            profile: member.currentProfile === "EMPLOYEE" ? "employee" : "contractor",
            timezone: member.timezone,
            durationDisplayFormat: member.durationDisplayFormat,
            avatarSrc: shellUser.avatarSrc,
          }}
          timezoneOptions={preferenceOptions.timezones}
          security={{
            user: {
              id: authUser.id,
              email: authUser.email,
              name: authUser.name,
              twoFactorEnabled: securityState.twoFactorEnabled,
              passwordEnabled: securityState.accounts.some(
                (account) => account.providerId === "credential",
              ),
              googleLinked: securityState.accounts.some(
                (account) => account.providerId === "google",
              ),
              googleAvailable: googleAuthSettings.enabled,
            },
            passkeys: securityState.passkeys.map((passkey) => ({
              id: passkey.id,
              name: passkey.name,
              deviceType: passkey.deviceType,
              backedUp: passkey.backedUp,
              transports: passkey.transports,
              createdAt: passkey.createdAt?.toISOString() ?? null,
            })),
            twoFactor: {
              enabled: securityState.twoFactorEnabled,
              verified: securityState.twoFactors.some((twoFactor) => twoFactor.verified),
              lockedUntil:
                securityState.twoFactors
                  .find((twoFactor) => twoFactor.lockedUntil)
                  ?.lockedUntil?.toISOString() ?? null,
              failedVerificationCount:
                securityState.twoFactors.find((twoFactor) => twoFactor.failedVerificationCount > 0)
                  ?.failedVerificationCount ?? 0,
            },
          }}
          connectedApps={toConnectedAppViews(connectedApps)}
          apiTokens={{
            tokens: apiTokens,
            baseUrl: authUrls.restApi,
            canGrantAdminScopes: member.role === "ADMIN",
          }}
          notificationConfiguration={notificationConfiguration}
        />
      </section>
    </AppShell>
  );
}

function SecuritySetupBanner({
  adminTotpRequired,
  callbackURL,
  complete,
  t,
}: {
  adminTotpRequired: boolean;
  callbackURL: string;
  complete: boolean;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  return (
    <Card variant={complete ? "selected" : "warning"} density="lg">
      <CardHeader className="block">
        <Badge tone={complete ? "success" : "warning"} dot>
          {complete ? t("setupBanner.securityReady") : t("setupBanner.actionRequired")}
        </Badge>
        <CardTitle className="mt-4 flex items-center gap-2">
          {complete ? (
            <ShieldCheck className="size-5 text-success" aria-hidden="true" />
          ) : (
            <ShieldPlus className="size-5 text-warning" aria-hidden="true" />
          )}
          {t("setupBanner.title")}
        </CardTitle>
        <CardDescription>
          {complete
            ? t("setupBanner.completeDescription")
            : adminTotpRequired
              ? t("setupBanner.adminTotpDescription")
              : t("setupBanner.memberDescription")}
        </CardDescription>
      </CardHeader>
      {complete && callbackURL !== "/settings" ? (
        <CardFooter>
          <Button asChild icon={ShieldCheck}>
            <Link href={callbackURL as Route}>{t("actions.continue")}</Link>
          </Button>
        </CardFooter>
      ) : (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {complete
              ? t("setupBanner.noFurtherAction")
              : adminTotpRequired
                ? t("setupBanner.adminTotpHint")
                : t("setupBanner.memberHint")}
          </p>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Shapes a grant for the client component.
 *
 * The scopes are re-ordered through `MCP_SCOPES` and grouped by `groupConsentScopes` — the very
 * functions `/consent` uses — so a row lists the same access, in the same order, in the same words
 * the member approved. A scope stored on the grant that the app no longer recognises drops out
 * here rather than rendering as a raw `some:scope` string.
 */
function toConnectedAppViews(connections: readonly McpConnection[]): ConnectedAppView[] {
  return connections.map((connection) => ({
    clientId: connection.clientId,
    displayName: connection.displayName,
    connectedAt: connection.connectedAt.toISOString(),
    scopeGroupIds: groupConsentScopes(
      MCP_SCOPES.filter((scope) => connection.scopes.includes(scope)),
    ).map((group) => group.id),
  }));
}

async function getSecurityState(userId: string) {
  const securityState = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      twoFactorEnabled: true,
      passkeys: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          name: true,
          deviceType: true,
          backedUp: true,
          transports: true,
          createdAt: true,
        },
      },
      accounts: {
        select: {
          providerId: true,
        },
      },
      twoFactors: {
        select: {
          verified: true,
          failedVerificationCount: true,
          lockedUntil: true,
        },
      },
    },
  });

  if (!securityState) {
    throw new Error("No auth account is linked to this member.");
  }

  return securityState;
}

function getSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.at(0) ?? "";
  }

  return value ?? "";
}
