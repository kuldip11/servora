import { describe, expect, it, vi, beforeEach } from "vitest";
const { list, create, update, deactivate } = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deactivate: vi.fn(),
}));
vi.mock("../branch.service", () => ({
  branchService: { list, create, update, deactivate },
}));
import { branchController } from "@/modules/branches/branch.controller";
const branchRecord = (overrides: Record<string, unknown> = {}) => ({
  id: "00000000-0000-4000-8000-000000000011",
  tenantId: "00000000-0000-4000-8000-000000000012",
  name: "Main",
  code: "MAIN",
  timezone: "Asia/Kolkata",
  currency: "INR",
  address: "",
  addressLine1: null,
  addressLine2: null,
  city: null,
  stateProvince: null,
  postalCode: null,
  country: null,
  phone: null,
  managerName: null,
  email: null,
  openingTime: null,
  closingTime: null,
  weeklyOperatingDays: null,
  taxOverride: null,
  serviceChargeOverride: null,
  invoicePrefix: null,
  receiptFooter: null,
  inventoryTrackingEnabled: true,
  negativeStockPolicy: "BLOCK",
  isActive: true,
  dineInEnabled: true,
  takeawayEnabled: true,
  deliveryEnabled: true,
  onlineEnabled: true,
  tablesEnabled: true,
  customerQrEnabled: true,
  kdsEnabled: true,
  waiterAppEnabled: true,
  publicTakeawayQrToken: "00000000-0000-4000-8000-000000000013",
  createdAt: new Date("2026-09-18T00:00:00.000Z"),
  updatedAt: new Date("2026-09-18T00:00:00.000Z"),
  ...overrides,
});
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
describe("branch controller", () => {
  it("delegates list and wraps the result", async () => {
    list.mockResolvedValue([branchRecord()]);
    await expect(branchController.list(auth)).resolves.toEqual({
      success: true,
      data: [
        expect.objectContaining({ id: "00000000-0000-4000-8000-000000000011" }),
      ],
    });
    expect(list).toHaveBeenCalledWith(auth);
  });
  it("delegates create/update and uses the correct response envelopes", async () => {
    const input = { name: "Main" } as any;
    create.mockResolvedValue(branchRecord());
    update.mockResolvedValue(branchRecord({ name: "Updated" }));
    await expect(branchController.create(auth, input)).resolves.toEqual({
      success: true,
      data: expect.objectContaining({
        id: "00000000-0000-4000-8000-000000000011",
      }),
    });
    await expect(branchController.update(auth, "b1", input)).resolves.toEqual({
      success: true,
      data: expect.objectContaining({
        id: "00000000-0000-4000-8000-000000000011",
        name: "Updated",
      }),
    });
    expect(create).toHaveBeenCalledWith(auth, input);
    expect(update).toHaveBeenCalledWith(auth, "b1", input);
  });
  it("delegates deactivation and returns a null success payload", async () => {
    deactivate.mockResolvedValue({ id: "b1", isActive: false });
    await expect(branchController.deactivate(auth, "b1")).resolves.toEqual({
      success: true,
      data: null,
    });
    expect(deactivate).toHaveBeenCalledWith(auth, "b1");
  });
});
