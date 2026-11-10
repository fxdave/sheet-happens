import { describe, expect, it, vi } from "vitest";

import {
  changeMemberRole,
  deactivateMember,
  MemberLifecycleError,
  reactivateMember,
  restoreArchivedMember,
  resetMemberTotp,
  revokeMemberSessions,
  resendMemberInvitation,
  revokeMemberInvitation,
  softDeleteMember,
} from "./lifecycle";

type TestMember = {
  id: string;
  authUserId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: "ADMIN" | "MEMBER";
  currentProfile: "CONTRACTOR" | "EMPLOYEE";
  status: string;
  locale: string;
  deletedAt: Date | null;
};

const baseMember: TestMember = {
  id: "member-1",
  authUserId: "auth-user-1",
  email: "member@example.com",
  firstName: "Member",
  lastName: "Example",
  displayName: "Member Example",
  role: "MEMBER" as const,
  currentProfile: "CONTRACTOR" as const,
  status: "ACTIVE",
  locale: "hu",
  deletedAt: null,
};

function createLifecycleDb(
  overrides: {
    member?: TestMember | null;
    invitation?: { id: string } | null;
    authUser?: { id: string; twoFactorEnabled: boolean } | null;
    activeAdminCount?: number;
    deletedTotpCount?: number;
    revokedInvitationCount?: number;
    revokedAccessTokenCount?: number;
    revokedRefreshTokenCount?: number;
    removedConsentCount?: number;
    revokedApiTokenCount?: number;
  } = {},
) {
  const tx = {
    member: {
      findUnique: vi.fn().mockResolvedValue(overrides.member ?? baseMember),
      count: vi.fn().mockResolvedValue(overrides.activeAdminCount ?? 1),
      update: vi.fn().mockResolvedValue({ id: "member-1" }),
    },
    invitation: {
      findFirst: vi.fn().mockResolvedValue(overrides.invitation ?? { id: "invitation-1" }),
      update: vi.fn().mockResolvedValue({ id: "invitation-1" }),
      create: vi.fn().mockResolvedValue({ id: "new-invitation-1" }),
      updateMany: vi.fn().mockResolvedValue({ count: overrides.revokedInvitationCount ?? 0 }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit-1" }),
    },
    session: {
      deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
    twoFactor: {
      deleteMany: vi.fn().mockResolvedValue({ count: overrides.deletedTotpCount ?? 1 }),
    },
    oauthAccessToken: {
      deleteMany: vi.fn().mockResolvedValue({ count: overrides.revokedAccessTokenCount ?? 1 }),
    },
    oauthRefreshToken: {
      deleteMany: vi.fn().mockResolvedValue({ count: overrides.revokedRefreshTokenCount ?? 1 }),
    },
    oauthConsent: {
      deleteMany: vi.fn().mockResolvedValue({ count: overrides.removedConsentCount ?? 1 }),
    },
    apiToken: {
      updateMany: vi.fn().mockResolvedValue({ count: overrides.revokedApiTokenCount ?? 0 }),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(
        overrides.authUser ?? {
          id: "auth-user-1",
          twoFactorEnabled: true,
        },
      ),
      update: vi.fn().mockResolvedValue({ id: "auth-user-1" }),
    },
  };

  return {
    tx,
    db: {
      $transaction: vi.fn((callback) => callback(tx)),
    },
  };
}

describe("member lifecycle services", () => {
  it("resends a pending invitation with a rotated token", async () => {
    const invitedMember = {
      ...baseMember,
      authUserId: null,
      status: "INVITED",
    };
    const { db, tx } = createLifecycleDb({ member: invitedMember });
    const sendEmail = vi.fn().mockResolvedValue(undefined);

    await resendMemberInvitation(
      {
        memberId: "member-1",
        actorMemberId: "admin-1",
      },
      {
        db,
        sendEmail,
        createToken: () => "new-token",
        now: () => new Date("2026-07-05T00:00:00.000Z"),
      },
    );

    expect(tx.invitation.findFirst).toHaveBeenCalledWith({
      where: {
        memberId: "member-1",
        status: "PENDING",
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });
    expect(tx.invitation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "invitation-1" },
        data: expect.objectContaining({
          expiresAt: new Date("2026-07-08T00:00:00.000Z"),
          tokenHash: expect.any(String),
        }),
      }),
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "member@example.com",
        acceptUrl: "http://localhost:3000/accept-invite?token=new-token",
      }),
    );
  });

  it("restores archived linked members as active without restoring sessions", async () => {
    const archivedAt = new Date("2026-07-04T00:00:00.000Z");
    const { db, tx } = createLifecycleDb({
      member: {
        ...baseMember,
        status: "DELETED",
        deletedAt: archivedAt,
      },
    });
    const sendEmail = vi.fn().mockResolvedValue(undefined);

    const result = await restoreArchivedMember(
      {
        memberId: "member-1",
        actorMemberId: "admin-1",
      },
      {
        db,
        sendEmail,
      },
    );

    expect(tx.member.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: "ACTIVE",
          inactivatedAt: null,
          deletedAt: null,
        },
      }),
    );
    expect(tx.invitation.create).not.toHaveBeenCalled();
    expect(tx.session.deleteMany).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "member.restored",
          before: {
            status: "DELETED",
            deletedAt: archivedAt,
          },
          after: {
            status: "ACTIVE",
            deletedAt: null,
            invitationId: null,
          },
        }),
      }),
    );
    expect(result).toMatchObject({
      memberId: "member-1",
      status: "ACTIVE",
      invitationSent: false,
    });
  });

  it("restores archived unlinked members as invited and sends a new invitation", async () => {
    const archivedAt = new Date("2026-07-04T00:00:00.000Z");
    const now = new Date("2026-07-05T00:00:00.000Z");
    const { db, tx } = createLifecycleDb({
      member: {
        ...baseMember,
        authUserId: null,
        status: "DELETED",
        deletedAt: archivedAt,
      },
    });
    const sendEmail = vi.fn().mockResolvedValue(undefined);

    const result = await restoreArchivedMember(
      {
        memberId: "member-1",
        actorMemberId: "admin-1",
      },
      {
        db,
        sendEmail,
        createToken: () => "restore-token",
        now: () => now,
      },
    );

    expect(tx.member.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: "INVITED",
          inactivatedAt: null,
          deletedAt: null,
        },
      }),
    );
    expect(tx.invitation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "member@example.com",
          firstName: "Member",
          lastName: "Example",
          role: "MEMBER",
          profile: "CONTRACTOR",
          status: "PENDING",
          memberId: "member-1",
          expiresAt: new Date("2026-07-08T00:00:00.000Z"),
          invitedByMemberId: "admin-1",
        }),
      }),
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "member@example.com",
        acceptUrl: "http://localhost:3000/accept-invite?token=restore-token",
        locale: "hu",
      }),
    );
    expect(result).toMatchObject({
      memberId: "member-1",
      status: "INVITED",
      invitationSent: true,
      email: "member@example.com",
      expiresAt: new Date("2026-07-08T00:00:00.000Z"),
    });
  });

  it("revokes a pending invitation and inactivates the unaccepted member", async () => {
    const { db, tx } = createLifecycleDb({
      member: {
        ...baseMember,
        authUserId: null,
        status: "INVITED",
      },
    });
    const now = new Date("2026-07-05T00:00:00.000Z");

    await revokeMemberInvitation(
      {
        memberId: "member-1",
        actorMemberId: "admin-1",
      },
      {
        db,
        now: () => now,
      },
    );

    expect(tx.invitation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: "REVOKED",
          revokedAt: now,
        },
      }),
    );
    expect(tx.member.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: "INACTIVE",
          inactivatedAt: now,
        },
      }),
    );
  });

  it("deactivates active members but rejects self-deactivation", async () => {
    const { db, tx } = createLifecycleDb();

    const result = await deactivateMember(
      {
        memberId: "member-1",
        actorMemberId: "admin-1",
      },
      { db },
    );

    expect(tx.member.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "INACTIVE",
        }),
      }),
    );
    expect(tx.session.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "auth-user-1",
      },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "member.session_revoked",
          after: expect.objectContaining({
            reason: "member_deactivated",
            revokedSessionCount: 2,
          }),
        }),
      }),
    );
    expect(result).toMatchObject({
      revokedSessionCount: 2,
    });

    await expect(
      deactivateMember(
        {
          memberId: "member-1",
          actorMemberId: "member-1",
        },
        { db },
      ),
    ).rejects.toBeInstanceOf(MemberLifecycleError);
  });

  it("archives members, revokes sessions, revokes pending invitations, and audits the change", async () => {
    const { db, tx } = createLifecycleDb({
      revokedInvitationCount: 1,
    });
    const now = new Date("2026-07-05T00:00:00.000Z");

    const result = await softDeleteMember(
      {
        memberId: "member-1",
        actorMemberId: "admin-1",
      },
      {
        db,
        now: () => now,
      },
    );

    expect(tx.invitation.updateMany).toHaveBeenCalledWith({
      where: {
        memberId: "member-1",
        status: "PENDING",
      },
      data: {
        status: "REVOKED",
        revokedAt: now,
      },
    });
    expect(tx.member.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: "DELETED",
          inactivatedAt: now,
          deletedAt: now,
        },
      }),
    );
    expect(tx.session.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "auth-user-1",
      },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "member.deleted",
          before: {
            status: "ACTIVE",
            deletedAt: null,
          },
          after: {
            status: "DELETED",
            deletedAt: now,
          },
        }),
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "member.session_revoked",
          after: expect.objectContaining({
            reason: "member_deleted",
            revokedSessionCount: 2,
          }),
        }),
      }),
    );
    expect(result).toEqual({
      memberId: "member-1",
      revokedInvitationCount: 1,
      revokedSessionCount: 2,
      revokedConnectionCount: 1,
    });
  });

  it("rejects self-archive and last active admin archive", async () => {
    const { db } = createLifecycleDb();

    await expect(
      softDeleteMember(
        {
          memberId: "member-1",
          actorMemberId: "member-1",
        },
        { db },
      ),
    ).rejects.toThrow("You cannot archive your own account.");

    const { db: lastAdminDb } = createLifecycleDb({
      member: {
        ...baseMember,
        role: "ADMIN",
      },
      activeAdminCount: 0,
    });

    await expect(
      softDeleteMember(
        {
          memberId: "member-1",
          actorMemberId: "admin-1",
        },
        { db: lastAdminDb },
      ),
    ).rejects.toThrow("At least one active admin must remain.");
  });

  it("reactivates inactive members with linked auth users", async () => {
    const { db, tx } = createLifecycleDb({
      member: {
        ...baseMember,
        status: "INACTIVE",
      },
    });

    await reactivateMember(
      {
        memberId: "member-1",
        actorMemberId: "admin-1",
      },
      { db },
    );

    expect(tx.member.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: "ACTIVE",
          inactivatedAt: null,
        },
      }),
    );
  });

  it("revokes linked member sessions", async () => {
    const { db, tx } = createLifecycleDb();

    const result = await revokeMemberSessions(
      {
        memberId: "member-1",
        actorMemberId: "admin-1",
      },
      { db },
    );

    expect(tx.session.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "auth-user-1",
      },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "member.session_revoked",
          targetId: "member-1",
          after: {
            reason: "admin_revoke",
            revokedSessionCount: 2,
          },
        }),
      }),
    );
    expect(result).toEqual({
      memberId: "member-1",
      revokedSessionCount: 2,
    });
  });

  it("resets linked member TOTP, revokes sessions, and audits without secrets", async () => {
    const { db, tx } = createLifecycleDb();

    const result = await resetMemberTotp(
      {
        memberId: "member-1",
        actorMemberId: "admin-1",
      },
      { db },
    );

    expect(tx.user.findUnique).toHaveBeenCalledWith({
      where: {
        id: "auth-user-1",
      },
      select: {
        id: true,
        twoFactorEnabled: true,
      },
    });
    expect(tx.twoFactor.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "auth-user-1",
      },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: {
        id: "auth-user-1",
      },
      data: {
        twoFactorEnabled: false,
      },
      select: {
        id: true,
      },
    });
    expect(tx.session.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "auth-user-1",
      },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "security.totp_reset",
          targetId: "member-1",
          before: {
            twoFactorEnabled: true,
            twoFactorRecordCount: 1,
          },
          after: {
            twoFactorEnabled: false,
            revokedSessionCount: 2,
          },
        }),
      }),
    );
    expect(result).toEqual({
      memberId: "member-1",
      hadTotp: true,
      revokedSessionCount: 2,
    });
  });

  it("resets stale TOTP flags even when the TOTP row is already missing", async () => {
    const { db, tx } = createLifecycleDb({
      deletedTotpCount: 0,
      authUser: {
        id: "auth-user-1",
        twoFactorEnabled: true,
      },
    });

    const result = await resetMemberTotp(
      {
        memberId: "member-1",
        actorMemberId: "admin-1",
      },
      { db },
    );

    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          twoFactorEnabled: false,
        },
      }),
    );
    expect(result.hadTotp).toBe(true);
  });

  it("rejects self TOTP reset and members without linked auth users", async () => {
    const { db } = createLifecycleDb();

    await expect(
      resetMemberTotp(
        {
          memberId: "member-1",
          actorMemberId: "member-1",
        },
        { db },
      ),
    ).rejects.toThrow("You cannot reset your own authenticator app here.");

    const { db: unlinkedDb } = createLifecycleDb({
      member: {
        ...baseMember,
        authUserId: null,
      },
    });

    await expect(
      resetMemberTotp(
        {
          memberId: "member-1",
          actorMemberId: "admin-1",
        },
        { db: unlinkedDb },
      ),
    ).rejects.toThrow("This member has no linked auth account.");
  });

  it("changes roles but rejects self role changes", async () => {
    const { db, tx } = createLifecycleDb();

    await changeMemberRole(
      {
        memberId: "member-1",
        actorMemberId: "admin-1",
        role: "ADMIN",
      },
      { db },
    );

    expect(tx.member.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          role: "ADMIN",
        },
      }),
    );

    await expect(
      changeMemberRole(
        {
          memberId: "member-1",
          actorMemberId: "member-1",
          role: "ADMIN",
        },
        { db },
      ),
    ).rejects.toBeInstanceOf(MemberLifecycleError);
  });
});
