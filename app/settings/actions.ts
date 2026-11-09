"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import {
  requireActiveAppMemberForAction,
  requireAdminAppMemberForAction,
  requireSecuritySettingsAppMember,
} from "@/src/server/auth/app-access";
import { clearSecondFactorCookie } from "@/src/server/auth/second-factor";
import { AuthenticationError, AuthorizationError } from "@/src/server/auth/session";
import { resourceSaverCookieName, resourceSaverMaxAgeSeconds } from "@/src/lib/resource-saver";
import { prisma } from "@/src/server/db/client";
import { disconnectMcpConnection } from "@/src/server/mcp/connections";
import {
  deleteMemberAvatar,
  MemberPreferenceError,
  updateMemberDurationDisplayFormat,
  updateMemberTimezone,
  uploadMemberAvatar,
} from "@/src/server/settings";
import {
  configurableNotificationTypes,
  NotificationConfigurationError,
  updateNotificationConfiguration,
} from "@/src/server/notifications";
import type {
  DeletePasskeyActionInput,
  DisconnectConnectedAppActionInput,
  MemberPreferenceActionState,
  NotificationSettingsActionState,
  RenamePasskeyActionInput,
  SecuritySettingsActionState,
} from "./actions.types";

type SettingsActionsTranslator = Awaited<ReturnType<typeof getTranslations>>;

export async function updateNotificationSettingsAction(
  _state: NotificationSettingsActionState,
  formData: FormData,
): Promise<NotificationSettingsActionState> {
  const t = await getTranslations("SettingsActions");

  try {
    const { member } = await requireAdminAppMemberForAction();
    const requestHeaders = await headers();
    await updateNotificationConfiguration({
      actorMemberId: member.id,
      value: {
        companyTimezone: String(formData.get("companyTimezone") ?? ""),
        weeklyWeekday: Number(formData.get("weeklyWeekday")),
        weeklyTime: String(formData.get("weeklyTime") ?? ""),
        invoiceInitialDelayHours: Number(formData.get("invoiceInitialDelayHours")),
        invoiceRepeatIntervalHours: Number(formData.get("invoiceRepeatIntervalHours")),
        rules: configurableNotificationTypes.map((type) => ({
          type,
          emailEnabled: formData.get(`email_${type}`) === "on",
          inAppEnabled: formData.get(`inApp_${type}`) === "on",
        })),
      },
      requestMetadata: getRequestMetadata(requestHeaders),
    });
    revalidatePath("/settings");
    return { status: "success", message: t("success.notificationSettingsUpdated") };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof NotificationConfigurationError
          ? t("errors.notificationSettingsInvalid")
          : error instanceof AuthenticationError || error instanceof AuthorizationError
            ? translateSettingsActionMessage(error.message, t)
            : t("errors.notificationSettingsUpdateFailed"),
    };
  }
}

export async function uploadMemberAvatarAction(
  _state: MemberPreferenceActionState,
  formData: FormData,
): Promise<MemberPreferenceActionState> {
  const t = await getTranslations("SettingsActions");
  const file = formData.get("avatar");

  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: t("errors.avatarRequired") };
  }

  try {
    const { member } = await requireActiveAppMemberForAction();
    const requestHeaders = await headers();
    const bytes = Buffer.from(await file.arrayBuffer());

    await uploadMemberAvatar({
      memberId: member.id,
      file: {
        bytes,
        originalFilename: file.name,
        contentType: file.type,
        byteSize: file.size,
      },
      requestMetadata: getRequestMetadata(requestHeaders),
    });
    revalidatePath("/", "layout");
    revalidatePath("/settings");
    return { status: "success", message: t("success.avatarUpdated") };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof MemberPreferenceError
          ? translateMemberPreferenceError(error.message, t)
          : t("errors.avatarUploadFailed"),
    };
  }
}

export async function deleteMemberAvatarAction(): Promise<MemberPreferenceActionState> {
  const t = await getTranslations("SettingsActions");

  try {
    const { member } = await requireActiveAppMemberForAction();
    const requestHeaders = await headers();
    await deleteMemberAvatar({
      memberId: member.id,
      requestMetadata: getRequestMetadata(requestHeaders),
    });
    revalidatePath("/", "layout");
    revalidatePath("/settings");
    return { status: "success", message: t("success.avatarDeleted") };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof MemberPreferenceError
          ? translateMemberPreferenceError(error.message, t)
          : t("errors.avatarDeleteFailed"),
    };
  }
}

export async function updateMemberTimezoneAction(
  _state: MemberPreferenceActionState,
  formData: FormData,
): Promise<MemberPreferenceActionState> {
  const t = await getTranslations("SettingsActions");

  try {
    const { member } = await requireActiveAppMemberForAction();
    const requestHeaders = await headers();
    await updateMemberTimezone({
      memberId: member.id,
      timezone: String(formData.get("timezone") ?? ""),
      requestMetadata: getRequestMetadata(requestHeaders),
    });
    revalidatePath("/", "layout");
    revalidatePath("/settings");
    return { status: "success", message: t("success.timezoneUpdated") };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof MemberPreferenceError
          ? translateMemberPreferenceError(error.message, t)
          : t("errors.timezoneUpdateFailed"),
    };
  }
}

export async function updateMemberDurationDisplayFormatAction(
  _state: MemberPreferenceActionState,
  formData: FormData,
): Promise<MemberPreferenceActionState> {
  const t = await getTranslations("SettingsActions");

  try {
    const { member } = await requireActiveAppMemberForAction();
    const requestHeaders = await headers();
    await updateMemberDurationDisplayFormat({
      memberId: member.id,
      durationDisplayFormat: String(formData.get("durationDisplayFormat") ?? "") as
        "DECIMAL_HOURS" | "HOURS_MINUTES",
      requestMetadata: getRequestMetadata(requestHeaders),
    });
    revalidatePath("/", "layout");
    revalidatePath("/settings");
    return { status: "success", message: t("success.durationDisplayUpdated") };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof MemberPreferenceError
          ? translateMemberPreferenceError(error.message, t)
          : t("errors.durationDisplayUpdateFailed"),
    };
  }
}

export async function updateResourceSaverAction(enabled: boolean): Promise<void> {
  await requireActiveAppMemberForAction();
  const cookieStore = await cookies();

  if (enabled) {
    cookieStore.set(resourceSaverCookieName, "1", {
      maxAge: resourceSaverMaxAgeSeconds,
      path: "/",
      sameSite: "lax",
    });
  } else {
    cookieStore.delete(resourceSaverCookieName);
  }

  revalidatePath("/", "layout");
}

export async function renamePasskeyAction(
  input: RenamePasskeyActionInput,
): Promise<SecuritySettingsActionState> {
  const t = await getTranslations("SettingsActions");
  const name = normalizePasskeyName(input.name);

  if (!input.passkeyId) {
    return {
      status: "error",
      message: t("errors.passkeyIdMissing"),
    };
  }

  if (!name) {
    return {
      status: "error",
      message: t("errors.passkeyNameRequired"),
    };
  }

  try {
    const { member } = await requireActiveAppMemberForAction();
    const requestHeaders = await headers();

    if (!member.authUserId) {
      throw new AuthorizationError("No auth account is linked to this member.");
    }

    const passkey = await prisma.passkey.findFirst({
      where: {
        id: input.passkeyId,
        userId: member.authUserId,
      },
      select: {
        id: true,
        name: true,
        deviceType: true,
        backedUp: true,
      },
    });

    if (!passkey) {
      return {
        status: "error",
        message: t("errors.passkeyNotFound"),
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.passkey.update({
        where: {
          id: passkey.id,
        },
        data: {
          name,
        },
        select: {
          id: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorMemberId: member.id,
          action: "security.passkey_renamed",
          targetType: "passkey",
          targetId: passkey.id,
          before: {
            name: passkey.name,
          },
          after: {
            name,
            deviceType: passkey.deviceType,
            backedUp: passkey.backedUp,
          },
          ipAddress: requestHeaders.get("x-forwarded-for"),
          userAgent: requestHeaders.get("user-agent"),
        },
      });
    });

    revalidatePath("/settings");

    return {
      status: "success",
      message: t("success.passkeyRenamed"),
    };
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return {
        status: "error",
        message: translateSettingsActionMessage(error.message, t),
      };
    }

    return {
      status: "error",
      message: t("errors.passkeyRenameFailed"),
    };
  }
}

export async function deletePasskeyAction(
  input: DeletePasskeyActionInput,
): Promise<SecuritySettingsActionState> {
  const t = await getTranslations("SettingsActions");

  if (!input.passkeyId) {
    return {
      status: "error",
      message: t("errors.passkeyIdMissing"),
    };
  }

  try {
    const { member } = await requireActiveAppMemberForAction();
    const requestHeaders = await headers();

    if (!member.authUserId) {
      throw new AuthorizationError("No auth account is linked to this member.");
    }

    const passkey = await prisma.passkey.findFirst({
      where: {
        id: input.passkeyId,
        userId: member.authUserId,
      },
      select: {
        id: true,
        name: true,
        deviceType: true,
        backedUp: true,
        transports: true,
        createdAt: true,
      },
    });

    if (!passkey) {
      return {
        status: "error",
        message: t("errors.passkeyNotFound"),
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.passkey.delete({
        where: {
          id: passkey.id,
        },
        select: {
          id: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorMemberId: member.id,
          action: "security.passkey_deleted",
          targetType: "passkey",
          targetId: passkey.id,
          before: {
            name: passkey.name,
            deviceType: passkey.deviceType,
            backedUp: passkey.backedUp,
            transports: passkey.transports,
            createdAt: passkey.createdAt?.toISOString() ?? null,
          },
          ipAddress: requestHeaders.get("x-forwarded-for"),
          userAgent: requestHeaders.get("user-agent"),
        },
      });
    });

    revalidatePath("/settings");

    return {
      status: "success",
      message: t("success.passkeyRemoved"),
    };
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return {
        status: "error",
        message: translateSettingsActionMessage(error.message, t),
      };
    }

    return {
      status: "error",
      message: t("errors.passkeyRemoveFailed"),
    };
  }
}

export async function auditTotpDisabledAction(): Promise<SecuritySettingsActionState> {
  const t = await getTranslations("SettingsActions");

  try {
    const { member } = await requireSecuritySettingsAppMember("/settings");
    const requestHeaders = await headers();

    if (!member.authUserId) {
      throw new AuthorizationError("No auth account is linked to this member.");
    }

    await prisma.auditLog.create({
      data: {
        actorMemberId: member.id,
        action: "security.totp_disabled",
        targetType: "member",
        targetId: member.id,
        after: {
          authUserId: member.authUserId,
        },
        ipAddress: requestHeaders.get("x-forwarded-for"),
        userAgent: requestHeaders.get("user-agent"),
      },
    });
    await clearSecondFactorCookie();
    revalidatePath("/settings");

    return {
      status: "success",
      message: t("success.totpDisabledAudited"),
    };
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return {
        status: "error",
        message: translateSettingsActionMessage(error.message, t),
      };
    }

    return {
      status: "error",
      message: t("errors.totpDisableAuditFailed"),
    };
  }
}

export async function auditBackupCodesRegeneratedAction(): Promise<SecuritySettingsActionState> {
  const t = await getTranslations("SettingsActions");

  try {
    const { member } = await requireSecuritySettingsAppMember("/settings");
    const requestHeaders = await headers();

    if (!member.authUserId) {
      throw new AuthorizationError("No auth account is linked to this member.");
    }

    await prisma.auditLog.create({
      data: {
        actorMemberId: member.id,
        action: "security.backup_codes_regenerated",
        targetType: "member",
        targetId: member.id,
        after: {
          authUserId: member.authUserId,
        },
        ipAddress: requestHeaders.get("x-forwarded-for"),
        userAgent: requestHeaders.get("user-agent"),
      },
    });
    revalidatePath("/settings");

    return {
      status: "success",
      message: t("success.backupCodesRegeneratedAudited"),
    };
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return {
        status: "error",
        message: translateSettingsActionMessage(error.message, t),
      };
    }

    return {
      status: "error",
      message: t("errors.backupCodesAuditFailed"),
    };
  }
}

/*
 * A `client_id` is either a Client ID Metadata Document URL (`https://claude.ai/...`) or an opaque
 * registered id, so there is nothing narrower to check than "a non-empty string of plausible
 * length". What actually scopes the delete is the auth user id below: `disconnectMcpConnection`
 * filters on it, so somebody else's `client_id` removes nothing.
 */
const disconnectConnectedAppSchema = z.object({
  clientId: z.string().trim().min(1).max(2048),
});

/**
 * Ends one connected app's access to this member's account.
 *
 * Deleting the consent alone would not be enough — an already-issued access token keeps working for
 * up to an hour and a refresh token for thirty days — which is why this calls
 * `disconnectMcpConnection` rather than the provider's consent endpoint. See
 * `src/server/mcp/connections.ts`.
 */
export async function disconnectConnectedAppAction(
  input: DisconnectConnectedAppActionInput,
): Promise<SecuritySettingsActionState> {
  const t = await getTranslations("SettingsActions");
  const parsed = disconnectConnectedAppSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: t("errors.connectedAppIdMissing"),
    };
  }

  try {
    const { authUser } = await requireActiveAppMemberForAction();
    const result = await disconnectMcpConnection({
      authUserId: authUser.id,
      clientId: parsed.data.clientId,
    });

    revalidatePath("/settings");

    /*
     * Nothing matched: the grant had already gone, from another tab or from the app revoking its own
     * tokens. The list refreshes either way, so this reports the state rather than a failure to act.
     * Counting the tokens too, not just the consent: a consent row lost to a crash mid-disconnect
     * leaves live tokens behind, and removing those is a real disconnect even with no consent to go
     * with them.
     */
    if (result.removedConsents + result.revokedAccessTokens + result.revokedRefreshTokens === 0) {
      return {
        status: "error",
        message: t("errors.connectedAppAlreadyDisconnected"),
      };
    }

    return {
      status: "success",
      message: t("success.connectedAppDisconnected"),
    };
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return {
        status: "error",
        message: translateSettingsActionMessage(error.message, t),
      };
    }

    return {
      status: "error",
      message: t("errors.connectedAppDisconnectFailed"),
    };
  }
}

function normalizePasskeyName(name: string) {
  return name.trim().replace(/\s+/g, " ").slice(0, 80);
}

function translateSettingsActionMessage(message: string, t: SettingsActionsTranslator) {
  if (message === "No auth account is linked to this member.") {
    return t("errors.noAuthAccount");
  }

  return message;
}

function getRequestMetadata(requestHeaders: Headers) {
  return {
    ipAddress: requestHeaders.get("x-forwarded-for"),
    userAgent: requestHeaders.get("user-agent"),
  };
}

function translateMemberPreferenceError(message: string, t: SettingsActionsTranslator) {
  const keyByMessage: Record<string, string> = {
    "Avatar image is required.": "errors.avatarRequired",
    "Avatar image is too large.": "errors.avatarTooLarge",
    "Avatar must be a PNG or JPEG image.": "errors.avatarInvalidType",
    "Unsupported timezone.": "errors.timezoneInvalid",
    "Unsupported duration display format.": "errors.durationDisplayInvalid",
    "Member not found.": "errors.memberNotFound",
  };
  const key = keyByMessage[message];
  return key ? t(key) : message;
}
