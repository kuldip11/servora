import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContext } from "@/core/auth";

const m = vi.hoisted(() => ({
  findMembershipsByUserId: vi.fn(),
  findOrganizationMembership: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  createOwnerMembership: vi.fn(),
  findRoleByName: vi.fn(),
  branchFindMany: vi.fn(),
  writeAudit: vi.fn(),
}));
vi.mock("../tenant.repository", () => ({
  tenantRepository: {
    findMembershipsByUserId: m.findMembershipsByUserId,
    findOrganizationMembership: m.findOrganizationMembership,
    findById: m.findById,
    create: m.create,
    update: m.update,
    createOwnerMembership: m.createOwnerMembership,
    findRoleByName: m.findRoleByName,
  },
}));
vi.mock("@/modules/branches/branch.repository", () => ({
  branchRepository: { findMany: m.branchFindMany },
}));
vi.mock("@/core/audit", () => ({ writeAudit: m.writeAudit }));
import { tenantService } from "../tenant.service";
import { tenantController } from "../tenant.controller";

const auth = (overrides: Partial<AuthContext> = {}): AuthContext =>
  ({
    userId: "u1",
    tenantId: "t1",
    email: "u@example.com",
    branchId: "b1",
    tenantWide: true,
    permissions: ["tenant:update", "tenant:archive"],
    roles: ["OWNER"],
    requestId: "r1",
    ipAddress: "127.0.0.1",
    ...overrides,
  }) as AuthContext;
const tenant = (overrides: Record<string, unknown> = {}) => ({
  id: "t1",
  name: "Tenant",
  organizationId: "org1",
  isActive: true,
  ...overrides,
});
const orgMembership = { organization: { id: "org1", isActive: true } };

describe("tenant service/controller coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.findMembershipsByUserId.mockResolvedValue([]);
    m.findOrganizationMembership.mockResolvedValue(orgMembership);
    m.findById.mockResolvedValue(tenant());
    m.create.mockResolvedValue(tenant());
    m.update.mockResolvedValue(tenant());
    m.createOwnerMembership.mockResolvedValue({ id: "mem1" });
    m.findRoleByName.mockResolvedValue({ id: "role1", scope: "TENANT" });
    m.branchFindMany.mockResolvedValue([{ id: "b1" }, { id: "b2" }]);
    m.writeAudit.mockResolvedValue(undefined);
  });

  it("lists memberships using tenant-wide branches or scoped branch ids", async () => {
    m.findMembershipsByUserId.mockResolvedValueOnce([
      {
        id: "m1",
        tenant: { id: "t1" },
        roles: [{ roleId: "r1", role: { name: "MANAGER", scope: "TENANT" } }],
        branches: [],
      },
      {
        id: "m2",
        tenant: { id: "t2" },
        roles: [{ roleId: "r2", role: { name: "WAITER", scope: "BRANCH" } }],
        branches: [{ branchId: "b3" }],
      },
    ]);
    const result = await tenantService.list(auth());
    expect(result).toEqual([
      {
        membershipId: "m1",
        tenant: { id: "t1" },
        roles: [{ id: "r1", name: "MANAGER", scope: "TENANT" }],
        branchIds: ["b1", "b2"],
      },
      {
        membershipId: "m2",
        tenant: { id: "t2" },
        roles: [{ id: "r2", name: "WAITER", scope: "BRANCH" }],
        branchIds: ["b3"],
      },
    ]);
    await expect(tenantController.list(auth())).resolves.toEqual({
      success: true,
      data: [],
    });
  });

  it("creates tenants with normalized defaults and audits", async () => {
    const input = {
      name: "  Acme  ",
      organizationId: "org1",
      defaultCurrency: " usd ",
      defaultTimezone: " Asia/Kolkata ",
      supportEmail: " ADMIN@EXAMPLE.COM ",
      defaultTaxRate: 12.5,
    };
    const out = await tenantService.create(auth(), input);
    expect(out).toEqual({ tenant: tenant(), membershipId: "mem1" });
    expect(m.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Acme",
        cuisineTypes: null,
        defaultCurrency: "USD",
        defaultTimezone: "Asia/Kolkata",
        supportEmail: "admin@example.com",
        defaultTaxRate: "12.50",
        createdBy: "u1",
        organizationId: "org1",
      }),
    );
    expect(m.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "TENANT_CREATED", tenantId: "t1" }),
    );
    await expect(
      tenantController.create(auth(), {
        name: "X",
        organizationId: "org1",
        defaultTaxRate: null,
      }),
    ).resolves.toMatchObject({ success: true });
  });

  it("rejects tenant creation guards and missing RBAC reference", async () => {
    await expect(
      tenantService.create(auth({ roles: [] }), {
        name: "X",
        organizationId: "org1",
      }),
    ).rejects.toThrow("global Owner");
    m.findOrganizationMembership.mockResolvedValueOnce(undefined);
    await expect(
      tenantService.create(auth(), { name: "X", organizationId: "org1" }),
    ).rejects.toThrow("Organization access denied");
    m.findOrganizationMembership.mockResolvedValueOnce({
      organization: { isActive: false },
    });
    await expect(
      tenantService.create(auth(), { name: "X", organizationId: "org1" }),
    ).rejects.toThrow("Organization access denied");
    m.findRoleByName.mockResolvedValueOnce(undefined);
    await expect(
      tenantService.create(auth(), { name: "X", organizationId: "org1" }),
    ).rejects.toThrow("RBAC reference data");
    m.findRoleByName.mockResolvedValueOnce({ id: "r", scope: "BRANCH" });
    await expect(
      tenantService.create(auth(), { name: "X", organizationId: "org1" }),
    ).rejects.toThrow("RBAC reference data");
  });

  it("updates normalized tenant settings and covers nullable/optional branches", async () => {
    const changes = {
      name: "  New  ",
      serviceChargePercent: 5,
      serviceChargeTaxable: true,
      roundingPolicy: "NEAREST_5" as const,
      defaultTaxMode: "INCLUSIVE" as const,
      courseSequencingEnabled: true,
      defaultCurrency: " inr ",
      defaultTimezone: " UTC ",
      supportEmail: " X@Y.COM ",
      defaultTaxRate: 18,
    };
    await expect(
      tenantService.update(auth(), "t1", changes),
    ).resolves.toMatchObject({ id: "t1" });
    expect(m.update).toHaveBeenCalledWith(
      "t1",
      expect.objectContaining({
        name: "New",
        serviceChargePercent: "5.00",
        serviceChargeTaxable: true,
        roundingPolicy: "NEAREST_5",
        defaultTaxMode: "INCLUSIVE",
        courseSequencingEnabled: true,
        defaultCurrency: "INR",
        defaultTimezone: "UTC",
        supportEmail: "x@y.com",
        defaultTaxRate: "18.00",
      }),
    );
    expect(m.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "TENANT_UPDATED" }),
    );

    m.update.mockResolvedValueOnce(tenant());
    await tenantService.update(auth(), "t1", {
      serviceChargePercent: null,
      defaultCurrency: null,
      defaultTimezone: null,
      supportEmail: null,
      defaultTaxRate: null,
    });
    expect(m.update).toHaveBeenLastCalledWith(
      "t1",
      expect.objectContaining({
        serviceChargePercent: null,
        defaultCurrency: null,
        defaultTimezone: null,
        supportEmail: null,
        defaultTaxRate: null,
      }),
    );
    await tenantController.update(auth(), "t1", {});
  });

  it("rejects invalid update paths", async () => {
    await expect(
      tenantService.update(auth({ permissions: [] }), "t1", {}),
    ).rejects.toThrow();
    m.findById.mockResolvedValueOnce(undefined);
    await expect(tenantService.update(auth(), "t1", {})).rejects.toThrow(
      "Tenant",
    );
    m.findOrganizationMembership.mockResolvedValueOnce(undefined);
    await expect(tenantService.update(auth(), "t1", {})).rejects.toThrow(
      "Tenant",
    );
    await expect(
      tenantService.update(auth({ tenantId: "other" }), "t1", {}),
    ).rejects.toThrow("Tenant");
    for (const value of [-1, 101, Number.NaN, Number.POSITIVE_INFINITY])
      await expect(
        tenantService.update(auth(), "t1", { serviceChargePercent: value }),
      ).rejects.toThrow("between 0 and 100");
    m.update.mockResolvedValueOnce(undefined);
    await expect(tenantService.update(auth(), "t1", {})).rejects.toThrow(
      "Tenant",
    );
  });

  it("archives tenants and covers every guard", async () => {
    await expect(tenantService.archive(auth(), "t1")).resolves.toMatchObject({
      id: "t1",
    });
    expect(m.update).toHaveBeenCalledWith("t1", { isActive: false });
    expect(m.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "TENANT_ARCHIVED" }),
    );
    await expect(tenantController.archive(auth(), "t1")).resolves.toMatchObject(
      { success: true },
    );

    await expect(
      tenantService.archive(auth({ permissions: [] }), "t1"),
    ).rejects.toThrow();
    m.findById.mockResolvedValueOnce(undefined);
    await expect(tenantService.archive(auth(), "t1")).rejects.toThrow("Tenant");
    m.findOrganizationMembership.mockResolvedValueOnce(undefined);
    await expect(tenantService.archive(auth(), "t1")).rejects.toThrow("Tenant");
    await expect(
      tenantService.archive(auth({ tenantId: "other" }), "t1"),
    ).rejects.toThrow("Tenant");
    m.update.mockResolvedValueOnce(undefined);
    await expect(tenantService.archive(auth(), "t1")).rejects.toThrow("Tenant");
  });
});
