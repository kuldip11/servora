import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContext } from "@/core/auth";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  writeAudit: vi.fn(),
}));

vi.mock("./customer-group.repository", () => ({
  customerGroupRepository: {
    list: mocks.list,
    findById: mocks.findById,
    create: mocks.create,
    update: mocks.update,
    remove: mocks.remove,
  },
}));
vi.mock("@/core/audit", () => ({ writeAudit: mocks.writeAudit }));

import { customerGroupService } from "./customer-group.service";

const auth = (permissions: string[] = ["menu:read", "menu:pricing:write"]): AuthContext =>
  ({
    userId: "u1",
    tenantId: "t1",
  email: "user@example.com",
    branchId: "b1",
    tenantWide: false,
    permissions,
    roles: [],
    requestId: "req1",
    ipAddress: "127.0.0.1",
  }) as AuthContext;

describe("customerGroupService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue([{ id: "g1" }]);
    mocks.findById.mockResolvedValue({
      id: "g1",
      name: "VIP",
      discountPercent: "10",
      discountFixed: null,
    });
    mocks.create.mockResolvedValue({ id: "g1", name: "VIP" });
    mocks.update.mockResolvedValue({ id: "g1", name: "VIP 2" });
    mocks.remove.mockResolvedValue({ id: "g1" });
    mocks.writeAudit.mockResolvedValue(undefined);
  });

  it("lists and finds groups with read permission", async () => {
    await expect(customerGroupService.list(auth())).resolves.toEqual([{ id: "g1" }]);
    await expect(customerGroupService.findById(auth(), "g1")).resolves.toMatchObject({ id: "g1" });
    mocks.findById.mockResolvedValueOnce(undefined);
    await expect(customerGroupService.findById(auth(), "missing")).rejects.toThrow("Customer group not found");
    await expect(customerGroupService.list(auth([]))).rejects.toThrow();
  });

  it("validates create inputs", async () => {
    const invalid = [
      { name: " " },
      { name: "VIP", discountPercent: 10, discountFixed: 5 },
      { name: "VIP", discountPercent: 0 },
      { name: "VIP", discountPercent: 101 },
      { name: "VIP", discountFixed: -1 },
    ];
    for (const input of invalid) {
      await expect(customerGroupService.create(auth(), input)).rejects.toThrow();
    }
    await expect(customerGroupService.create(auth([]), { name: "VIP" })).rejects.toThrow();
  });

  it("creates groups, trims names, preserves explicit discounts, and audits", async () => {
    await customerGroupService.create(auth(), { name: " VIP ", discountPercent: 15 });
    expect(mocks.create).toHaveBeenCalledWith({ tenantId: "t1", name: "VIP", discountPercent: 15 });
    expect(mocks.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "CUSTOMER_GROUP_CREATED", entityId: "g1" }));

    await customerGroupService.create(auth(), { name: "Regular", discountFixed: null });
    expect(mocks.create).toHaveBeenLastCalledWith({ tenantId: "t1", name: "Regular", discountFixed: null });
  });

  it("updates groups using existing values and validates merged state", async () => {
    await customerGroupService.update(auth(), "g1", { name: "VIP 2" });
    expect(mocks.update).toHaveBeenCalledWith("t1", "g1", { name: "VIP 2" });
    expect(mocks.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "CUSTOMER_GROUP_UPDATED" }));

    mocks.findById.mockResolvedValueOnce({ id: "g1", name: "VIP", discountPercent: null, discountFixed: "5" });
    await customerGroupService.update(auth(), "g1", { discountFixed: 7 });

    mocks.findById.mockResolvedValueOnce({ id: "g1", name: "VIP", discountPercent: null, discountFixed: "5" });
    await customerGroupService.update(auth(), "g1", { name: "VIP Plus" });

    mocks.findById.mockResolvedValueOnce({ id: "g1", name: "VIP", discountPercent: "12", discountFixed: null });
    await customerGroupService.update(auth(), "g1", { discountPercent: null });

    mocks.findById.mockResolvedValueOnce({ id: "g1", name: "VIP", discountPercent: null, discountFixed: "6" });
    await customerGroupService.update(auth(), "g1", { discountFixed: null });

    mocks.findById.mockResolvedValueOnce(undefined);
    await expect(customerGroupService.update(auth(), "missing", {})).rejects.toThrow("Customer group not found");

    mocks.findById.mockResolvedValueOnce({ id: "g1", name: "VIP", discountPercent: null, discountFixed: null });
    mocks.update.mockResolvedValueOnce(undefined);
    await expect(customerGroupService.update(auth(), "g1", {})).rejects.toThrow("Customer group not found");
  });

  it("removes existing groups with audit and treats missing groups as a no-op", async () => {
    await customerGroupService.remove(auth(), "g1");
    expect(mocks.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "CUSTOMER_GROUP_DELETED" }));
    mocks.remove.mockResolvedValueOnce(undefined);
    await expect(customerGroupService.remove(auth(), "missing")).resolves.toBeUndefined();
    expect(mocks.writeAudit).toHaveBeenCalledTimes(1);
  });
});
