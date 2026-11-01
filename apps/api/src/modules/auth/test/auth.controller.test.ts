import { beforeEach, describe, expect, it, vi } from "vitest";
const svc = vi.hoisted(() => ({
  signup: vi.fn(),
  memberships: vi.fn(),
  sessions: vi.fn(),
  revokeSession: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  me: vi.fn(),
}));
vi.mock("../auth.service", () => ({ authService: svc }));
import { authController } from "@/modules/auth/auth.controller";
const auth: any = {
  userId: "00000000-0000-4000-8000-000000000001",
  tenantId: "00000000-0000-4000-8000-000000000002",
  membershipId: "00000000-0000-4000-8000-000000000003",
  branchId: "00000000-0000-4000-8000-000000000004",
  email: "u@example.com",
  app: "kitchen",
  roles: [],
  permissions: ["x"],
};
const baseUser = {
  id: "00000000-0000-4000-8000-000000000001",
  firstName: "A",
  lastName: "B",
  displayName: null,
  email: "u@example.com",
  phone: null,
  profileImageUrl: null,
  status: "ACTIVE",
  globalUserRoles: [
    {
      roleId: "00000000-0000-4000-8000-000000000005",
      role: {
        name: "OWNER",
        rolePermissions: [
          {
            permission: {
              id: "00000000-0000-4000-8000-000000000006",
              key: "p",
              module: "test",
              description: null,
            },
          },
        ],
      },
    },
  ],
};
beforeEach(() => {
  vi.clearAllMocks();
});
describe("auth controller", () => {
  it("delegates signup, memberships, sessions and revoke", async () => {
    svc.signup.mockResolvedValue({
      user: { id: "00000000-0000-4000-8000-000000000001" },
    });
    svc.memberships.mockResolvedValue([
      {
        membershipId: "00000000-0000-4000-8000-000000000011",
        tenant: { id: "00000000-0000-4000-8000-000000000012", name: "Tenant" },
        roles: [
          {
            id: "00000000-0000-4000-8000-000000000013",
            name: "MANAGER",
            scope: "TENANT",
          },
        ],
        branches: [
          {
            id: "00000000-0000-4000-8000-000000000014",
            name: "Main",
            address: "1 Main St",
            isActive: true,
            tablesEnabled: true,
          },
        ],
      },
    ]);
    const sessionNow = new Date("2026-09-18T00:00:00.000Z");
    svc.sessions.mockResolvedValue([
      {
        id: "00000000-0000-4000-8000-000000000021",
        userId: "00000000-0000-4000-8000-000000000001",
        createdAt: sessionNow,
        lastSeenAt: sessionNow,
        expiresAt: sessionNow,
        revokedAt: null,
        userAgent: null,
        ipAddress: null,
      },
    ]);
    svc.revokeSession.mockResolvedValue({ revoked: true });
    await expect(authController.signup({} as any)).resolves.toEqual({
      success: true,
      data: { user: { id: "00000000-0000-4000-8000-000000000001" } },
    });
    await expect(authController.memberships(auth)).resolves.toEqual({
      success: true,
      data: [
        {
          membershipId: "00000000-0000-4000-8000-000000000011",
          tenant: {
            id: "00000000-0000-4000-8000-000000000012",
            name: "Tenant",
          },
          roles: [
            {
              id: "00000000-0000-4000-8000-000000000013",
              name: "MANAGER",
              scope: "TENANT",
            },
          ],
          branches: [
            {
              id: "00000000-0000-4000-8000-000000000014",
              name: "Main",
              address: "1 Main St",
              isActive: true,
              tablesEnabled: true,
            },
          ],
        },
      ],
    });
    expect(svc.memberships).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001",
      "kitchen",
    );
    await authController.memberships({ ...auth, app: undefined });
    expect(svc.memberships).toHaveBeenLastCalledWith(
      "00000000-0000-4000-8000-000000000001",
      "web",
    );
    await expect(authController.sessions(auth)).resolves.toEqual({
      success: true,
      data: [
        {
          id: "00000000-0000-4000-8000-000000000021",
          userId: "00000000-0000-4000-8000-000000000001",
          createdAt: "2026-09-18T00:00:00.000Z",
          lastSeenAt: "2026-09-18T00:00:00.000Z",
          expiresAt: "2026-09-18T00:00:00.000Z",
          revokedAt: null,
          userAgent: null,
          ipAddress: null,
        },
      ],
    });
    await expect(
      authController.revokeSession(
        auth,
        "00000000-0000-4000-8000-000000000021",
      ),
    ).resolves.toEqual({
      success: true,
      data: { revoked: true },
    });
  });

  it("updates profile and changes password", async () => {
    svc.updateProfile.mockResolvedValue(baseUser);
    svc.changePassword.mockResolvedValue(undefined);
    svc.me.mockResolvedValue({ user: baseUser, membership: undefined });
    const updated = await authController.updateProfile(auth, {
      firstName: "N",
    });
    expect(svc.updateProfile).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001",
      { firstName: "N" },
    );
    expect(updated.data.roles[0]?.name).toBe("OWNER");
    await expect(
      authController.changePassword(auth, {
        currentPassword: "a",
        newPassword: "b",
      }),
    ).resolves.toEqual({ success: true, data: { changed: true } });
  });

  it("builds membership roles and global roles", async () => {
    svc.me.mockResolvedValueOnce({
      user: baseUser,
      membership: {
        roles: [
          {
            roleId: "00000000-0000-4000-8000-000000000007",
            role: {
              name: "MANAGER",
              rolePermissions: [
                {
                  permission: {
                    id: "00000000-0000-4000-8000-000000000008",
                    key: "q",
                    module: "test",
                    description: null,
                  },
                },
              ],
            },
          },
        ],
      },
    });
    let result: any = await authController.me(auth);
    expect(result.data.roles).toEqual([
      expect.objectContaining({
        id: "00000000-0000-4000-8000-000000000007",
        name: "MANAGER",
      }),
    ]);
    svc.me.mockResolvedValueOnce({ user: baseUser, membership: undefined });
    result = await authController.me(auth);
    expect(result.data.roles).toEqual([
      expect.objectContaining({
        id: "00000000-0000-4000-8000-000000000005",
        name: "OWNER",
      }),
    ]);
    expect(result.data).toMatchObject({
      tenantId: "00000000-0000-4000-8000-000000000002",
      membershipId: "00000000-0000-4000-8000-000000000003",
      branchId: "00000000-0000-4000-8000-000000000004",
      permissions: ["x"],
    });
  });
});
