import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContext } from "@/core/auth";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  findRole: vi.fn(),
  findPermissionsByIds: vi.fn(),
  replaceRolePermissions: vi.fn(),
  writeAudit: vi.fn(),
}));

vi.mock("@/core/audit", () => ({ writeAudit: mocks.writeAudit }));
vi.mock("../permission.repository", () => ({
  permissionRepository: {
    list: mocks.list,
    findRole: mocks.findRole,
    findPermissionsByIds: mocks.findPermissionsByIds,
    replaceRolePermissions: mocks.replaceRolePermissions,
  },
}));

import { permissionService } from "../permission.service";
import { permissionController } from "../permission.controller";

const auth = (overrides: Partial<AuthContext> = {}): AuthContext =>
  ({
    userId: "u1",
    tenantId: "t1",
    email: "u@example.com",
    branchId: "b1",
    tenantWide: true,
    permissions: ["permissions:read", "roles:read", "roles:assign_permissions"],
    roles: [],
    requestId: "r1",
    ipAddress: "127.0.0.1",
    ...overrides,
  }) as AuthContext;

const role = (overrides: Record<string, unknown> = {}) => ({
  id: "role1",
  tenantId: "t1",
  isActive: true,
  isSystem: false,
  rolePermissions: [
    { permission: { id: "p1", key: "menu:read" } },
    { permission: null },
  ],
  ...overrides,
});

describe("permission service/controller coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue([{ id: "p1" }]);
    mocks.findRole.mockResolvedValue(role());
    mocks.findPermissionsByIds.mockResolvedValue([{ id: "p1" }, { id: "p2" }]);
    mocks.replaceRolePermissions.mockResolvedValue(undefined);
    mocks.writeAudit.mockResolvedValue(undefined);
  });

  it("lists permissions and delegates through the controller", async () => {
    await expect(permissionService.list(auth())).resolves.toEqual([
      { id: "p1" },
    ]);
    await expect(permissionController.list(auth())).resolves.toEqual({
      success: true,
      data: [{ id: "p1" }],
    });
    await expect(
      permissionService.list(auth({ permissions: [] })),
    ).rejects.toThrow();
  });

  it("reads role permissions, filters null relations, and handles missing roles", async () => {
    await expect(permissionService.forRole(auth(), "role1")).resolves.toEqual([
      { id: "p1", key: "menu:read" },
    ]);
    await expect(
      permissionController.forRole(auth(), "role1"),
    ).resolves.toEqual({
      success: true,
      data: [{ id: "p1", key: "menu:read" }],
    });
    mocks.findRole.mockResolvedValueOnce(undefined);
    await expect(permissionService.forRole(auth(), "missing")).rejects.toThrow(
      "Role not found",
    );
    await expect(
      permissionService.forRole(auth({ permissions: [] }), "role1"),
    ).rejects.toThrow();
  });

  it("validates role permission assignment and audits unique ids", async () => {
    mocks.findPermissionsByIds.mockResolvedValueOnce([
      { id: "p1" },
      { id: "p2" },
    ]);
    mocks.findRole
      .mockResolvedValueOnce(role())
      .mockResolvedValueOnce(role({ rolePermissions: [] }));
    await expect(
      permissionService.setForRole(auth(), "role1", ["p1", "p1", "p2"]),
    ).resolves.toMatchObject({ id: "role1" });
    expect(mocks.findPermissionsByIds).toHaveBeenCalledWith(["p1", "p2"]);
    expect(mocks.replaceRolePermissions).toHaveBeenCalledWith("role1", [
      "p1",
      "p2",
    ]);
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ROLE_PERMISSIONS_UPDATED",
        entityId: "role1",
        metadata: { permissionIds: ["p1", "p2"] },
      }),
    );

    mocks.findRole
      .mockResolvedValueOnce(role())
      .mockResolvedValueOnce(role({ rolePermissions: [] }));
    mocks.findPermissionsByIds.mockResolvedValueOnce([]);
    await expect(
      permissionController.setForRole(auth(), "role1", []),
    ).resolves.toMatchObject({ success: true });
  });

  it("rejects non-tenant-wide, missing, system, invalid, and unauthorized assignments", async () => {
    await expect(
      permissionService.setForRole(auth({ tenantWide: false }), "role1", [
        "p1",
      ]),
    ).rejects.toThrow("Tenant-wide access");

    mocks.findRole.mockResolvedValueOnce(undefined);
    await expect(
      permissionService.setForRole(auth(), "missing", ["p1"]),
    ).rejects.toThrow("Role not found");

    mocks.findRole.mockResolvedValueOnce(role({ isSystem: true }));
    await expect(
      permissionService.setForRole(auth(), "role1", ["p1"]),
    ).rejects.toThrow("System role permissions");

    mocks.findRole.mockResolvedValueOnce(role());
    mocks.findPermissionsByIds.mockResolvedValueOnce([]);
    await expect(
      permissionService.setForRole(auth(), "role1", ["p1"]),
    ).rejects.toThrow("permissions are invalid");

    await expect(
      permissionService.setForRole(auth({ permissions: [] }), "role1", ["p1"]),
    ).rejects.toThrow();
  });
});
