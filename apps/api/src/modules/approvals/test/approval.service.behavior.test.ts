import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const findMany = vi.fn();
  const findUser = vi.fn();
  const findThreshold = vi.fn();
  const directReturning = vi.fn();
  const upsertReturning = vi.fn();
  const onConflictDoUpdate = vi.fn(() => ({ returning: upsertReturning }));
  const values = vi.fn(() => ({
    returning: directReturning,
    onConflictDoUpdate,
  }));
  const insert = vi.fn(() => ({ values }));
  const tokenReturning = vi.fn();
  const tokenWhere = vi.fn(() => ({ returning: tokenReturning }));
  const tokenSet = vi.fn(() => ({ where: tokenWhere }));
  const update = vi.fn(() => ({ set: tokenSet }));
  const requirePermission = vi.fn();
  const writeAudit = vi.fn();
  const compare = vi.fn();
  return {
    findMany,
    findUser,
    findThreshold,
    directReturning,
    upsertReturning,
    onConflictDoUpdate,
    values,
    insert,
    tokenReturning,
    tokenWhere,
    tokenSet,
    update,
    requirePermission,
    writeAudit,
    compare,
  };
});

vi.mock("../../../db", () => ({
  db: {
    query: {
      voidCompApprovalThresholds: {
        findMany: mocks.findMany,
        findFirst: mocks.findThreshold,
      },
      users: { findFirst: mocks.findUser },
    },
    insert: mocks.insert,
    update: mocks.update,
  },
}));
vi.mock("../../../core/auth", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("../../../core/audit", () => ({ writeAudit: mocks.writeAudit }));
vi.mock("bcryptjs", () => ({ default: { compare: mocks.compare } }));

import { approvalService } from "@/modules/approvals/approval.service";

const auth = {
  tenantId: "tenant-1",
  userId: "requester-1",
  branchId: "branch-1",
  requestId: "req-1",
  ipAddress: "127.0.0.1",
} as any;

const role = (
  name = "Manager",
  permission = "orders:void",
  isActive = true,
) => ({
  role: {
    name,
    isActive,
    rolePermissions: permission
      ? [{ permission: { key: permission } }]
      : [],
  },
});

const userWith = (roles: any[], overrides: Record<string, unknown> = {}) => ({
  id: "manager-1",
  passwordHash: "hash",
  memberships: [{ tenantId: "tenant-1", status: "ACTIVE", roles }],
  ...overrides,
});

describe("approvalService comprehensive coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([{ id: "threshold-1" }]);
    mocks.findThreshold.mockResolvedValue({
      thresholdAmount: "500.00",
      requiresRole: "Manager",
    });
    mocks.findUser.mockResolvedValue(userWith([role()]));
    mocks.compare.mockResolvedValue(true);
    mocks.upsertReturning.mockResolvedValue([{ id: "threshold-1" }]);
    mocks.directReturning.mockResolvedValue([
      { id: "token-1", expiresAt: new Date("2030-01-01T00:00:00Z") },
    ]);
    mocks.tokenReturning.mockResolvedValue([{ id: "token-1" }]);
  });

  it("lists thresholds after checking permission", async () => {
    await expect(approvalService.list(auth)).resolves.toEqual([{ id: "threshold-1" }]);
    expect(mocks.requirePermission).toHaveBeenCalledWith(auth, "orders:update");
    expect(mocks.findMany).toHaveBeenCalledOnce();
  });

  it("rejects non-finite, negative, and blank threshold settings", async () => {
    await expect(approvalService.upsert(auth, "VOID", Number.NaN)).rejects.toThrow(
      "Threshold must be zero or greater",
    );
    await expect(approvalService.upsert(auth, "VOID", -1)).rejects.toThrow(
      "Threshold must be zero or greater",
    );
    await expect(approvalService.upsert(auth, "COMP", 0, "   ")).rejects.toThrow(
      "Approval role is required",
    );
  });

  it("upserts a normalized threshold and writes its audit entry", async () => {
    await expect(approvalService.upsert(auth, "COMP", 12.5, " Supervisor ")).resolves.toEqual({
      id: "threshold-1",
    });
    expect(mocks.requirePermission).toHaveBeenCalledWith(auth, "settings:update");
    expect(mocks.values).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        actionType: "COMP",
        thresholdAmount: "12.50",
        requiresRole: "Supervisor",
      }),
    );
    expect(mocks.onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({
          thresholdAmount: "12.50",
          requiresRole: "Supervisor",
          updatedAt: expect.any(Date),
        }),
      }),
    );
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "VOID_COMP_THRESHOLD_UPDATED",
        entityId: "threshold-1",
        metadata: {
          actionType: "COMP",
          thresholdAmount: 12.5,
          requiresRole: "Supervisor",
        },
      }),
    );
  });

  it("uses Manager as the default role when upserting", async () => {
    await approvalService.upsert(auth, "VOID", 0);
    expect(mocks.values).toHaveBeenCalledWith(
      expect.objectContaining({ requiresRole: "Manager", thresholdAmount: "0.00" }),
    );
  });

  it("rejects issue when no user exists without checking a password", async () => {
    mocks.findUser.mockResolvedValue(undefined);
    await expect(
      approvalService.issue(auth, {
        actionType: "VOID",
        orderId: "o1",
        orderItemId: "i1",
        managerEmail: " MANAGER@EXAMPLE.COM ",
        password: "pw",
      }),
    ).rejects.toThrow("Manager approval credentials are invalid");
    expect(mocks.compare).not.toHaveBeenCalled();
  });

  it("rejects users without an active matching tenant membership", async () => {
    mocks.findUser.mockResolvedValue({
      id: "manager-1",
      passwordHash: "hash",
      memberships: [
        { tenantId: "other", status: "ACTIVE", roles: [role()] },
        { tenantId: "tenant-1", status: "INACTIVE", roles: [role()] },
      ],
    });
    await expect(
      approvalService.issue(auth, {
        actionType: "VOID",
        orderId: "o1",
        orderItemId: "i1",
        managerEmail: "manager@example.com",
        password: "pw",
      }),
    ).rejects.toThrow("Manager approval credentials are invalid");
  });

  it("rejects inactive, wrong-role, and permissionless manager roles", async () => {
    const input = {
      actionType: "VOID" as const,
      orderId: "o1",
      orderItemId: "i1",
      managerEmail: "manager@example.com",
      password: "pw",
    };
    mocks.findUser.mockResolvedValue(
      userWith([role("Manager", "orders:void", false), role("Chef"), role("Manager", "")]),
    );
    await expect(approvalService.issue(auth, input)).rejects.toThrow(
      "Manager approval credentials are invalid",
    );
  });

  it("rejects a valid role when the password is wrong", async () => {
    mocks.compare.mockResolvedValue(false);
    await expect(
      approvalService.issue(auth, {
        actionType: "VOID",
        orderId: "o1",
        orderItemId: "i1",
        managerEmail: "manager@example.com",
        password: "bad",
      }),
    ).rejects.toThrow("Manager approval credentials are invalid");
    expect(mocks.compare).toHaveBeenCalledWith("bad", "hash");
  });

  it("issues and audits a VOID approval token using the configured role", async () => {
    mocks.findThreshold.mockResolvedValue({ thresholdAmount: "1", requiresRole: "Supervisor" });
    mocks.findUser.mockResolvedValue(userWith([role("Supervisor", "orders:void")]));
    await expect(
      approvalService.issue(auth, {
        actionType: "VOID",
        orderId: "o1",
        orderItemId: "i1",
        managerEmail: " MANAGER@EXAMPLE.COM ",
        password: "pw",
      }),
    ).resolves.toEqual({
      token: "token-1",
      expiresAt: new Date("2030-01-01T00:00:00Z"),
    });
    expect(mocks.values).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        approvedBy: "manager-1",
        actionType: "VOID",
        orderId: "o1",
        orderItemId: "i1",
        expiresAt: expect.any(Date),
      }),
    );
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "MANAGER_APPROVAL_GRANTED",
        entityId: "token-1",
        metadata: expect.objectContaining({ requiresRole: "Supervisor", requestedBy: "requester-1" }),
      }),
    );
  });

  it("issues COMP approval with the default Manager role when no threshold exists", async () => {
    mocks.findThreshold.mockResolvedValue(undefined);
    mocks.findUser.mockResolvedValue(userWith([role("Manager", "orders:comp")]));
    await approvalService.issue(auth, {
      actionType: "COMP",
      orderId: "o1",
      orderItemId: "i1",
      managerEmail: "manager@example.com",
      password: "pw",
    });
    expect(mocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ requiresRole: "Manager", actionType: "COMP" }),
      }),
    );
  });
});
