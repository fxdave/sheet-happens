import { prisma } from "@/src/server/db/client";
import { revokeAllApiTokensForMember } from "@/src/server/api-tokens/tokens";
import { revokeAllMcpAccessForUser } from "@/src/server/mcp/connections";
import { sendInvitationEmail } from "@/src/server/auth/auth-emails";
import {
  buildInvitationAcceptUrl,
  getDisplayName,
  normalizeInvitationEmail,
} from "@/src/server/users/invitations";
import { getDefaultInvitationExpiresAt } from "@/src/server/users/invitation-expiry";
import { createInvitationToken, hashInvitationToken } from "@/src/server/users/invitation-tokens";

export type MemberLifecycleRole = "ADMIN" | "MEMBER";
export type MemberLifecycleStatus = "INVITED" | "ACTIVE" | "INACTIVE" | "DELETED";
export type SessionRevocationReason = "admin_revoke" | "member_deactivated" | "member_deleted";
type MemberLifecycleProfile = "CONTRACTOR" | "EMPLOYEE";

export type MemberLifecycleInput = {
  memberId: string;
  actorMemberId: string;
};

export type ChangeMemberRoleInput = MemberLifecycleInput & {
  role: MemberLifecycleRole;
};

type MemberLifecycleDb = {
  $transaction<T>(callback: (tx: MemberLifecycleTransaction) => Promise<T>): Promise<T>;
};

type MemberLifecycleTransaction = {
  member: {
    findUnique(args: {
      where: { id: string };
      select: {
        id: true;
        authUserId: true;
        email: true;
        firstName: true;
        lastName: true;
        displayName: true;
        role: true;
        status: true;
        currentProfile: true;
        locale: true;
        deletedAt: true;
      };
    }): Promise<{
      id: string;
      authUserId: string | null;
      email: string;
      firstName: string;
      lastName: string;
      displayName: string;
      role: MemberLifecycleRole;
      status: MemberLifecycleStatus;
      currentProfile: MemberLifecycleProfile;
      locale: string;
      deletedAt: Date | null;
    } | null>;
    count(args: {
      where: {
        id?: { not: string };
        role?: MemberLifecycleRole;
        status?: MemberLifecycleStatus;
        deletedAt?: null;
      };
    }): Promise<number>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
      select: { id: true };
    }): Promise<{ id: string }>;
  };
  invitation: {
    findFirst(args: {
      where: {
        memberId: string;
        status: "PENDING";
        expiresAt?: { gt: Date };
      };
      select: { id: true };
      orderBy?: { createdAt: "desc" };
    }): Promise<{ id: string } | null>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
      select?: { id: true };
    }): Promise<{ id: string }>;
    create(args: {
      data: {
        email: string;
        firstName: string;
        lastName: string;
        role: MemberLifecycleRole;
        profile: MemberLifecycleProfile;
        status: "PENDING";
        memberId: string;
        tokenHash: string;
        expiresAt: Date;
        invitedByMemberId: string;
      };
      select: { id: true };
    }): Promise<{ id: string }>;
    updateMany(args: {
      where: {
        memberId: string;
        status: "PENDING";
      };
      data: Record<string, unknown>;
    }): Promise<{ count: number }>;
  };
  auditLog: {
    create(args: {
      data: {
        actorMemberId: string;
        action: string;
        targetType: string;
        targetId: string;
        before?: Record<string, unknown>;
        after?: Record<string, unknown>;
      };
    }): Promise<unknown>;
  };
  session: {
    deleteMany(args: { where: { userId: string } }): Promise<{ count: number }>;
  };
  /*
   * The MCP/OAuth grant tables. Declared here so revoking an agent's access happens inside the same
   * transaction as the status change — a member cannot end up INACTIVE with a live grant, or lose a
   * grant while staying ACTIVE.
   */
  oauthAccessToken: {
    deleteMany(args: { where: { userId: string } }): Promise<{ count: number }>;
  };
  oauthRefreshToken: {
    deleteMany(args: { where: { userId: string } }): Promise<{ count: number }>;
  };
  oauthConsent: {
    deleteMany(args: { where: { userId: string } }): Promise<{ count: number }>;
  };
  /** Personal access tokens, revoked in the same transaction for the same reason. */
  apiToken: {
    updateMany(args: {
      where: { memberId: string; revokedAt: null };
      data: { revokedAt: Date };
    }): Promise<{ count: number }>;
  };
  twoFactor: {
    deleteMany(args: { where: { userId: string } }): Promise<{ count: number }>;
  };
  user: {
    findUnique(args: {
      where: { id: string };
      select: {
        id: true;
        twoFactorEnabled: true;
      };
    }): Promise<{
      id: string;
      twoFactorEnabled: boolean;
    } | null>;
    update(args: {
      where: { id: string };
      data: {
        twoFactorEnabled: boolean;
      };
      select: { id: true };
    }): Promise<{ id: string }>;
  };
};

export type MemberLifecycleDeps = {
  db?: MemberLifecycleDb;
  now?: () => Date;
  createToken?: typeof createInvitationToken;
  sendEmail?: typeof sendInvitationEmail;
};

export class MemberLifecycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MemberLifecycleError";
  }
}

export async function resendMemberInvitation(
  input: MemberLifecycleInput,
  deps: MemberLifecycleDeps = {},
) {
  const db: MemberLifecycleDb = deps.db ?? (prisma as unknown as MemberLifecycleDb);
  const sendEmail = deps.sendEmail ?? sendInvitationEmail;
  const createToken = deps.createToken ?? createInvitationToken;
  const now = deps.now?.() ?? new Date();
  const expiresAt = getDefaultInvitationExpiresAt(now);
  const token = createToken();
  const tokenHash = hashInvitationToken(token);

  const result = await db.$transaction(async (tx) => {
    const member = await findMember(tx, input.memberId);

    if (member.deletedAt || member.status !== "INVITED") {
      throw new MemberLifecycleError("Only pending invited members can be resent an invite.");
    }

    const invitation = await tx.invitation.findFirst({
      where: {
        memberId: member.id,
        status: "PENDING",
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });

    if (!invitation) {
      throw new MemberLifecycleError("No active pending invitation exists for this member.");
    }

    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        tokenHash,
        expiresAt,
      },
      select: { id: true },
    });

    await tx.auditLog.create({
      data: {
        actorMemberId: input.actorMemberId,
        action: "member.invitation_resent",
        targetType: "member",
        targetId: member.id,
        after: {
          invitationId: invitation.id,
          email: member.email,
          expiresAt,
        },
      },
    });

    return {
      invitationId: invitation.id,
      email: normalizeInvitationEmail(member.email),
      name: getDisplayName(member.firstName, member.lastName) || member.displayName,
      locale: member.locale,
    };
  });

  await sendEmail({
    email: result.email,
    name: result.name,
    acceptUrl: buildInvitationAcceptUrl(undefined, token),
    locale: result.locale,
  });

  return {
    ...result,
    expiresAt,
  };
}

export async function revokeMemberInvitation(
  input: MemberLifecycleInput,
  deps: MemberLifecycleDeps = {},
) {
  const db: MemberLifecycleDb = deps.db ?? (prisma as unknown as MemberLifecycleDb);
  const now = deps.now?.() ?? new Date();

  return db.$transaction(async (tx) => {
    const member = await findMember(tx, input.memberId);

    if (member.deletedAt || member.status !== "INVITED") {
      throw new MemberLifecycleError("Only pending invited members can have invites revoked.");
    }

    const invitation = await tx.invitation.findFirst({
      where: {
        memberId: member.id,
        status: "PENDING",
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });

    if (!invitation) {
      throw new MemberLifecycleError("No pending invitation exists for this member.");
    }

    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "REVOKED",
        revokedAt: now,
      },
      select: { id: true },
    });

    await tx.member.update({
      where: { id: member.id },
      data: {
        status: "INACTIVE",
        inactivatedAt: now,
      },
      select: { id: true },
    });

    await tx.auditLog.create({
      data: {
        actorMemberId: input.actorMemberId,
        action: "member.invitation_revoked",
        targetType: "member",
        targetId: member.id,
        after: {
          invitationId: invitation.id,
          email: member.email,
        },
      },
    });

    return {
      memberId: member.id,
      invitationId: invitation.id,
    };
  });
}

export async function deactivateMember(
  input: MemberLifecycleInput,
  deps: MemberLifecycleDeps = {},
) {
  const db: MemberLifecycleDb = deps.db ?? (prisma as unknown as MemberLifecycleDb);
  const now = deps.now?.() ?? new Date();

  return db.$transaction(async (tx) => {
    const member = await findMember(tx, input.memberId);

    if (member.id === input.actorMemberId) {
      throw new MemberLifecycleError("You cannot deactivate your own account.");
    }

    if (member.deletedAt || member.status !== "ACTIVE") {
      throw new MemberLifecycleError("Only active members can be deactivated.");
    }

    await tx.member.update({
      where: { id: member.id },
      data: {
        status: "INACTIVE",
        inactivatedAt: now,
      },
      select: { id: true },
    });

    await tx.auditLog.create({
      data: {
        actorMemberId: input.actorMemberId,
        action: "member.deactivated",
        targetType: "member",
        targetId: member.id,
        after: {
          previousStatus: member.status,
          status: "INACTIVE",
        },
      },
    });

    const revokedSessionCount = await revokeAuthSessionsForMember(tx, {
      member,
      actorMemberId: input.actorMemberId,
      reason: "member_deactivated",
    });

    const revokedConnectionCount = await revokeMcpGrantsForMember(tx, {
      member,
      actorMemberId: input.actorMemberId,
      reason: "member_deactivated",
    });

    await revokeApiTokensForMember(tx, {
      member,
      actorMemberId: input.actorMemberId,
      reason: "member_deactivated",
      now,
    });

    return {
      memberId: member.id,
      revokedSessionCount,
      revokedConnectionCount,
    };
  });
}

export async function softDeleteMember(
  input: MemberLifecycleInput,
  deps: MemberLifecycleDeps = {},
) {
  const db: MemberLifecycleDb = deps.db ?? (prisma as unknown as MemberLifecycleDb);
  const now = deps.now?.() ?? new Date();

  return db.$transaction(async (tx) => {
    const member = await findMember(tx, input.memberId);

    if (member.id === input.actorMemberId) {
      throw new MemberLifecycleError("You cannot archive your own account.");
    }

    if (member.deletedAt || member.status === "DELETED") {
      throw new MemberLifecycleError("This member is already archived.");
    }

    if (member.role === "ADMIN") {
      const remainingActiveAdminCount = await tx.member.count({
        where: {
          id: {
            not: member.id,
          },
          role: "ADMIN",
          status: "ACTIVE",
          deletedAt: null,
        },
      });

      if (remainingActiveAdminCount === 0) {
        throw new MemberLifecycleError("At least one active admin must remain.");
      }
    }

    const revokedInvitations = await tx.invitation.updateMany({
      where: {
        memberId: member.id,
        status: "PENDING",
      },
      data: {
        status: "REVOKED",
        revokedAt: now,
      },
    });

    if (revokedInvitations.count > 0) {
      await tx.auditLog.create({
        data: {
          actorMemberId: input.actorMemberId,
          action: "member.pending_invitations_revoked",
          targetType: "member",
          targetId: member.id,
          after: {
            reason: "member_deleted",
            revokedInvitationCount: revokedInvitations.count,
          },
        },
      });
    }

    await tx.member.update({
      where: { id: member.id },
      data: {
        status: "DELETED",
        inactivatedAt: now,
        deletedAt: now,
      },
      select: { id: true },
    });

    await tx.auditLog.create({
      data: {
        actorMemberId: input.actorMemberId,
        action: "member.deleted",
        targetType: "member",
        targetId: member.id,
        before: {
          status: member.status,
          deletedAt: member.deletedAt,
        },
        after: {
          status: "DELETED",
          deletedAt: now,
        },
      },
    });

    const revokedSessionCount = await revokeAuthSessionsForMember(tx, {
      member,
      actorMemberId: input.actorMemberId,
      reason: "member_deleted",
    });

    const revokedConnectionCount = await revokeMcpGrantsForMember(tx, {
      member,
      actorMemberId: input.actorMemberId,
      reason: "member_deleted",
    });

    await revokeApiTokensForMember(tx, {
      member,
      actorMemberId: input.actorMemberId,
      reason: "member_deleted",
      now,
    });

    return {
      memberId: member.id,
      revokedInvitationCount: revokedInvitations.count,
      revokedSessionCount,
      revokedConnectionCount,
    };
  });
}

export async function revokeMemberSessions(
  input: MemberLifecycleInput,
  deps: MemberLifecycleDeps = {},
) {
  const db: MemberLifecycleDb = deps.db ?? (prisma as unknown as MemberLifecycleDb);

  return db.$transaction(async (tx) => {
    const member = await findMember(tx, input.memberId);

    if (member.id === input.actorMemberId) {
      throw new MemberLifecycleError("You cannot revoke your own sessions here.");
    }

    if (member.deletedAt) {
      throw new MemberLifecycleError("Deleted members cannot be changed.");
    }

    if (!member.authUserId) {
      throw new MemberLifecycleError("This member has no linked auth account.");
    }

    const revokedSessionCount = await revokeAuthSessionsForMember(tx, {
      member,
      actorMemberId: input.actorMemberId,
      reason: "admin_revoke",
    });

    return {
      memberId: member.id,
      revokedSessionCount,
    };
  });
}

export async function resetMemberTotp(input: MemberLifecycleInput, deps: MemberLifecycleDeps = {}) {
  const db: MemberLifecycleDb = deps.db ?? (prisma as unknown as MemberLifecycleDb);

  return db.$transaction(async (tx) => {
    const member = await findMember(tx, input.memberId);

    if (member.id === input.actorMemberId) {
      throw new MemberLifecycleError("You cannot reset your own authenticator app here.");
    }

    if (member.deletedAt) {
      throw new MemberLifecycleError("Deleted members cannot be changed.");
    }

    if (!member.authUserId) {
      throw new MemberLifecycleError("This member has no linked auth account.");
    }

    const authUser = await tx.user.findUnique({
      where: { id: member.authUserId },
      select: {
        id: true,
        twoFactorEnabled: true,
      },
    });

    if (!authUser) {
      throw new MemberLifecycleError("The linked auth account was not found.");
    }

    const deletedTotp = await tx.twoFactor.deleteMany({
      where: {
        userId: authUser.id,
      },
    });

    await tx.user.update({
      where: {
        id: authUser.id,
      },
      data: {
        twoFactorEnabled: false,
      },
      select: {
        id: true,
      },
    });

    const revokedSessionCount = await revokeAuthSessionsForMember(tx, {
      member,
      actorMemberId: input.actorMemberId,
      reason: "admin_revoke",
    });

    const hadTotp = authUser.twoFactorEnabled || deletedTotp.count > 0;

    await tx.auditLog.create({
      data: {
        actorMemberId: input.actorMemberId,
        action: "security.totp_reset",
        targetType: "member",
        targetId: member.id,
        before: {
          twoFactorEnabled: authUser.twoFactorEnabled,
          twoFactorRecordCount: deletedTotp.count,
        },
        after: {
          twoFactorEnabled: false,
          revokedSessionCount,
        },
      },
    });

    return {
      memberId: member.id,
      hadTotp,
      revokedSessionCount,
    };
  });
}

export async function reactivateMember(
  input: MemberLifecycleInput,
  deps: MemberLifecycleDeps = {},
) {
  const db: MemberLifecycleDb = deps.db ?? (prisma as unknown as MemberLifecycleDb);

  return db.$transaction(async (tx) => {
    const member = await findMember(tx, input.memberId);

    if (member.deletedAt || member.status !== "INACTIVE") {
      throw new MemberLifecycleError("Only inactive members can be reactivated.");
    }

    if (!member.authUserId) {
      throw new MemberLifecycleError("Members without an auth account need a new invitation.");
    }

    await tx.member.update({
      where: { id: member.id },
      data: {
        status: "ACTIVE",
        inactivatedAt: null,
      },
      select: { id: true },
    });

    await tx.auditLog.create({
      data: {
        actorMemberId: input.actorMemberId,
        action: "member.reactivated",
        targetType: "member",
        targetId: member.id,
        after: {
          previousStatus: member.status,
          status: "ACTIVE",
        },
      },
    });

    return {
      memberId: member.id,
    };
  });
}

export async function restoreArchivedMember(
  input: MemberLifecycleInput,
  deps: MemberLifecycleDeps = {},
) {
  const db: MemberLifecycleDb = deps.db ?? (prisma as unknown as MemberLifecycleDb);
  const sendEmail = deps.sendEmail ?? sendInvitationEmail;
  const createToken = deps.createToken ?? createInvitationToken;
  const now = deps.now?.() ?? new Date();
  const expiresAt = getDefaultInvitationExpiresAt(now);
  const token = createToken();
  const tokenHash = hashInvitationToken(token);

  const result = await db.$transaction(async (tx) => {
    const member = await findMember(tx, input.memberId);

    if (!member.deletedAt && member.status !== "DELETED") {
      throw new MemberLifecycleError("Only archived members can be restored.");
    }

    const restoredStatus: MemberLifecycleStatus = member.authUserId ? "ACTIVE" : "INVITED";

    await tx.member.update({
      where: { id: member.id },
      data: {
        status: restoredStatus,
        inactivatedAt: null,
        deletedAt: null,
      },
      select: { id: true },
    });

    let invitationId: string | null = null;

    if (!member.authUserId) {
      const invitation = await tx.invitation.create({
        data: {
          email: normalizeInvitationEmail(member.email),
          firstName: member.firstName,
          lastName: member.lastName,
          role: member.role,
          profile: member.currentProfile,
          status: "PENDING",
          memberId: member.id,
          tokenHash,
          expiresAt,
          invitedByMemberId: input.actorMemberId,
        },
        select: { id: true },
      });

      invitationId = invitation.id;
    }

    await tx.auditLog.create({
      data: {
        actorMemberId: input.actorMemberId,
        action: "member.restored",
        targetType: "member",
        targetId: member.id,
        before: {
          status: member.status,
          deletedAt: member.deletedAt,
        },
        after: {
          status: restoredStatus,
          deletedAt: null,
          invitationId,
        },
      },
    });

    return {
      memberId: member.id,
      status: restoredStatus,
      invitationId,
      email: normalizeInvitationEmail(member.email),
      name: getDisplayName(member.firstName, member.lastName) || member.displayName,
      locale: member.locale,
    };
  });

  if (result.invitationId) {
    await sendEmail({
      email: result.email,
      name: result.name,
      acceptUrl: buildInvitationAcceptUrl(undefined, token),
      locale: result.locale,
    });
  }

  return {
    ...result,
    invitationSent: Boolean(result.invitationId),
    expiresAt: result.invitationId ? expiresAt : null,
  };
}

export async function changeMemberRole(
  input: ChangeMemberRoleInput,
  deps: MemberLifecycleDeps = {},
) {
  const db: MemberLifecycleDb = deps.db ?? (prisma as unknown as MemberLifecycleDb);

  return db.$transaction(async (tx) => {
    const member = await findMember(tx, input.memberId);

    if (member.id === input.actorMemberId) {
      throw new MemberLifecycleError("You cannot change your own role.");
    }

    if (member.deletedAt) {
      throw new MemberLifecycleError("Deleted members cannot be changed.");
    }

    await tx.member.update({
      where: { id: member.id },
      data: {
        role: input.role,
      },
      select: { id: true },
    });

    await tx.auditLog.create({
      data: {
        actorMemberId: input.actorMemberId,
        action: "member.role_changed",
        targetType: "member",
        targetId: member.id,
        after: {
          previousRole: member.role,
          role: input.role,
        },
      },
    });

    return {
      memberId: member.id,
    };
  });
}

async function findMember(tx: MemberLifecycleTransaction, memberId: string) {
  const member = await tx.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      authUserId: true,
      email: true,
      firstName: true,
      lastName: true,
      displayName: true,
      role: true,
      status: true,
      currentProfile: true,
      locale: true,
      deletedAt: true,
    },
  });

  if (!member) {
    throw new MemberLifecycleError("Member does not exist.");
  }

  return member;
}

/**
 * Ends every connected app's access, alongside the browser sessions.
 *
 * Only deactivation and deletion do this. Revoking sessions on its own ("sign this person out
 * everywhere") and resetting an authenticator deliberately leave grants alone: those are about
 * regaining control of a browser, not about withdrawing an agent's authority, and silently
 * disconnecting Claude because someone reset a TOTP would be a surprise.
 *
 * `resolveMcpActor` re-checks `ACTIVE` on every single MCP call, so this is not what makes
 * deactivation safe — it is what stops a dormant grant from reviving on reactivation, and what
 * empties "Connected apps" for an account that is gone.
 */
async function revokeMcpGrantsForMember(
  tx: MemberLifecycleTransaction,
  input: {
    member: {
      id: string;
      authUserId: string | null;
    };
    actorMemberId: string;
    reason: SessionRevocationReason;
  },
) {
  if (!input.member.authUserId) return 0;

  const revoked = await revokeAllMcpAccessForUser(
    { authUserId: input.member.authUserId },
    { db: tx },
  );
  const total = revoked.revokedAccessTokens + revoked.revokedRefreshTokens;

  if (revoked.removedConsents === 0 && total === 0) {
    // Nothing was connected. An audit row saying so would be noise on every deactivation.
    return 0;
  }

  await tx.auditLog.create({
    data: {
      actorMemberId: input.actorMemberId,
      action: "member.mcp_access_revoked",
      targetType: "member",
      targetId: input.member.id,
      after: {
        reason: input.reason,
        removedConsents: revoked.removedConsents,
        revokedAccessTokens: revoked.revokedAccessTokens,
        revokedRefreshTokens: revoked.revokedRefreshTokens,
      },
    },
  });

  return revoked.removedConsents;
}

/** `authenticateApiToken` already refuses a non-active owner; this stops reactivation reviving them. */
async function revokeApiTokensForMember(
  tx: MemberLifecycleTransaction,
  input: {
    member: { id: string };
    actorMemberId: string;
    reason: SessionRevocationReason;
    now: Date;
  },
) {
  const revoked = await revokeAllApiTokensForMember(
    { memberId: input.member.id, now: input.now },
    { db: tx },
  );

  if (revoked === 0) return 0;

  await tx.auditLog.create({
    data: {
      actorMemberId: input.actorMemberId,
      action: "member.api_tokens_revoked",
      targetType: "member",
      targetId: input.member.id,
      after: { reason: input.reason, revokedApiTokens: revoked },
    },
  });

  return revoked;
}

async function revokeAuthSessionsForMember(
  tx: MemberLifecycleTransaction,
  input: {
    member: {
      id: string;
      authUserId: string | null;
    };
    actorMemberId: string;
    reason: SessionRevocationReason;
  },
) {
  if (!input.member.authUserId) return 0;

  const result = await tx.session.deleteMany({
    where: {
      userId: input.member.authUserId,
    },
  });

  await tx.auditLog.create({
    data: {
      actorMemberId: input.actorMemberId,
      action: "member.session_revoked",
      targetType: "member",
      targetId: input.member.id,
      after: {
        reason: input.reason,
        revokedSessionCount: result.count,
      },
    },
  });

  return result.count;
}
