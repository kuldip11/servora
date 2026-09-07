import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContext } from "@/core/auth";

const mocks = vi.hoisted(() => ({
  listForTenant: vi.fn(),
  findTenantRole: vi.fn(),
  findByNameAndScope: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  assignmentCount: vi.fn(),
  archive: vi.fn(),
  writeAudit: vi.fn(),
}));
vi.mock("@/core/audit", () => ({ writeAudit: mocks.writeAudit }));
vi.mock("../role.repository", () => ({
  roleRepository: {
    listForTenant: mocks.listForTenant,
    findTenantRole: mocks.findTenantRole,
    findByNameAndScope: mocks.findByNameAndScope,
    create: mocks.create,
    update: mocks.update,
    assignmentCount: mocks.assignmentCount,
    archive: mocks.archive,
  },
}));

import { roleService } from "../role.service";
import { roleController } from "../role.controller";

const auth = (overrides: Partial<AuthContext> = {}): AuthContext =>
  ({
    userId: "u1",
    tenantId: "t1",
    email: "u@example.com",
    branchId: "b1",
    tenantWide: true,
    permissions: [
      "staff:read",
      "roles:create",
      "roles:update",
      "roles:archive",
    ],
    roles: [],
    requestId: "r1",
    ipAddress: "127.0.0.1",
    ...overrides,
  }) as AuthContext;
const role = (overrides: Record<string, unknown> = {}) => ({
  id: "r1",
  name: "Custom",
  scope: "TENANT",
  tenantId: "t1",
  isActive: true,
  isSystem: false,
  ...overrides,
});

describe("role service/controller coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listForTenant.mockResolvedValue([role()]);
    mocks.findTenantRole.mockResolvedValue(role());
    mocks.findByNameAndScope.mockResolvedValue(undefined);
    mocks.create.mockResolvedValue(role());
    mocks.update.mockResolvedValue(role({ name: "Updated" }));
    mocks.assignmentCount.mockResolvedValue(0);
    mocks.archive.mockResolvedValue(role({ isActive: false }));
    mocks.writeAudit.mockResolvedValue(undefined);
  });

  it("lists roles and delegates controllers", async () => {
    await expect(roleService.list(auth())).resolves.toHaveLength(1);
    await expect(roleController.list(auth())).resolves.toMatchObject({
      success: true,
    });
    await expect(roleService.list(auth({ permissions: [] }))).rejects.toThrow();
  });

  it("creates normalized roles and rejects invalid/reserved/duplicate/admin scope", async () => {
    await expect(
      roleService.create(auth(), {
        name: "  Custom   Role ",
        description: "x",
        scope: "TENANT",
      }),
    ).resolves.toMatchObject({ id: "r1" });
    expect(mocks.create).toHaveBeenCalledWith("t1", {
      name: "Custom Role",
      description: "x",
      scope: "TENANT",
    });
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ROLE_CREATED" }),
    );
    await expect(
      roleController.create(auth(), { name: "Another", scope: "BRANCH" }),
    ).resolves.toMatchObject({ success: true });

    await expect(
      roleService.create(auth(), { name: "   ", scope: "TENANT" }),
    ).rejects.toThrow("Role name is required");
    await expect(
      roleService.create(auth(), { name: "owner", scope: "TENANT" }),
    ).rejects.toThrow("reserved");
    mocks.findByNameAndScope.mockResolvedValueOnce(role());
    await expect(
      roleService.create(auth(), { name: "Custom", scope: "TENANT" }),
    ).rejects.toThrow("already exists");
    await expect(
      roleService.create(auth({ tenantWide: false }), {
        name: "Custom",
        scope: "TENANT",
      }),
    ).rejects.toThrow("Tenant-wide access");
    await expect(
      roleService.create(auth({ permissions: [] }), {
        name: "Custom",
        scope: "TENANT",
      }),
    ).rejects.toThrow();
  });

  it("updates roles with normalized names, duplicate checks, and audits", async () => {
    await roleService.update(auth(), "r1", {
      name: "  Updated  Role  ",
      description: "desc",
    });
    expect(mocks.update).toHaveBeenCalledWith("r1", {
      name: "Updated Role",
      description: "desc",
    });
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ROLE_UPDATED", entityId: "r1" }),
    );
    await expect(
      roleController.update(auth(), "r1", { description: "new" }),
    ).resolves.toMatchObject({ success: true });

    mocks.findTenantRole.mockResolvedValueOnce(undefined);
    await expect(roleService.update(auth(), "missing", {})).rejects.toThrow(
      "Role not found",
    );
    mocks.findTenantRole.mockResolvedValueOnce(role({ isActive: false }));
    await expect(roleService.update(auth(), "r1", {})).rejects.toThrow(
      "Role not found",
    );
    mocks.findTenantRole.mockResolvedValueOnce(role({ isSystem: true }));
    await expect(roleService.update(auth(), "r1", {})).rejects.toThrow(
      "System roles cannot be modified",
    );
    mocks.findTenantRole.mockResolvedValueOnce(role());
    await expect(
      roleService.update(auth(), "r1", { name: "manager" }),
    ).rejects.toThrow("reserved");
    mocks.findTenantRole.mockResolvedValueOnce(role());
    mocks.findByNameAndScope.mockResolvedValueOnce(role({ id: "other" }));
    await expect(
      roleService.update(auth(), "r1", { name: "Duplicate" }),
    ).rejects.toThrow("already exists");
    mocks.findTenantRole.mockResolvedValueOnce(role());
    mocks.findByNameAndScope.mockResolvedValueOnce(role({ id: "r1" }));
    await expect(
      roleService.update(auth(), "r1", { name: "Same" }),
    ).resolves.toMatchObject({ id: "r1" });
  });

  it("archives roles and covers all guards", async () => {
    await expect(roleService.archive(auth(), "r1")).resolves.toBeUndefined();
    expect(mocks.archive).toHaveBeenCalledWith("r1");
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ROLE_ARCHIVED" }),
    );
    await expect(roleController.archive(auth(), "r1")).resolves.toEqual({
      success: true,
      data: null,
    });

    mocks.findTenantRole.mockResolvedValueOnce(undefined);
    await expect(roleService.archive(auth(), "missing")).rejects.toThrow(
      "Role not found",
    );
    mocks.findTenantRole.mockResolvedValueOnce(role({ isActive: false }));
    await expect(roleService.archive(auth(), "r1")).rejects.toThrow(
      "Role not found",
    );
    mocks.findTenantRole.mockResolvedValueOnce(role({ isSystem: true }));
    await expect(roleService.archive(auth(), "r1")).rejects.toThrow(
      "System roles cannot be archived",
    );
    mocks.findTenantRole.mockResolvedValueOnce(role());
    mocks.assignmentCount.mockResolvedValueOnce(2);
    await expect(roleService.archive(auth(), "r1")).rejects.toThrow(
      "assigned to staff",
    );
    await expect(
      roleService.archive(auth({ tenantWide: false }), "r1"),
    ).rejects.toThrow("Tenant-wide access");
  });
});
