import { beforeEach, describe, expect, it, vi } from "vitest";
const { list, create, update, remove, listRoles } = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  listRoles: vi.fn(),
}));
vi.mock("../staff.service", () => ({
  staffService: { list, create, update, remove, listRoles },
}));
import { staffController } from "@/modules/staff/staff.controller";
const auth = {
  userId: "u1",
  tenantId: "t1",
  branchId: "b1",
  email: "u@example.com",
  roles: [],
  permissions: [],
} as any;
beforeEach(() => {
  vi.clearAllMocks();
});
describe("staff controller", () => {
  it("delegates list/create/update and uses response envelopes", async () => {
    const member = {
      id: "11111111-1111-4111-8111-111111111111",
      membershipId: "22222222-2222-4222-8222-222222222222",
      firstName: "A",
      lastName: "B",
      email: "a@example.com",
      status: "ACTIVE",
      assignedBranches: [],
      roles: [],
    };
    list.mockResolvedValue({
      items: [member],
      total: 1,
      page: 1,
      limit: 25,
    });
    create.mockResolvedValue({
      id: member.membershipId,
      userId: member.id,
      status: "ACTIVE",
      user: {
        id: member.id,
        firstName: "A",
        lastName: "B",
        email: "a@example.com",
      },
      roles: [],
      branches: [],
    });
    update.mockResolvedValue({
      id: member.membershipId,
      userId: member.id,
      status: "ACTIVE",
      user: {
        id: member.id,
        firstName: "New",
        lastName: "B",
        email: "a@example.com",
      },
      roles: [],
      branches: [],
    });
    expect(await staffController.list(auth)).toEqual({
      success: true,
      data: [member],
      pagination: { page: 1, limit: 25, total: 1, hasMore: false },
    });
    expect(
      await staffController.create(auth, { firstName: "A" } as any),
    ).toEqual({ success: true, data: member });
    expect(
      await staffController.update(auth, "u2", { firstName: "New" }),
    ).toEqual({ success: true, data: { ...member, firstName: "New" } });
    expect(list).toHaveBeenCalledWith(auth, {});
    expect(create).toHaveBeenCalledWith(auth, { firstName: "A" });
    expect(update).toHaveBeenCalledWith(auth, "u2", { firstName: "New" });
  });
  it("returns null after removal and delegates role listing", async () => {
    remove.mockResolvedValue(undefined);
    listRoles.mockResolvedValue([{ name: "CASHIER" }]);
    expect(await staffController.remove(auth, "u2")).toEqual({
      success: true,
      data: null,
    });
    expect(await staffController.listRoles(auth)).toEqual({
      success: true,
      data: [{ name: "CASHIER" }],
    });
  });
});
