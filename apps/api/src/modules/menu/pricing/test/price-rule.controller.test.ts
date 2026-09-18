import { beforeEach, describe, expect, it, vi } from "vitest";
const { service } = vi.hoisted(() => ({
  service: {
    list: vi.fn(),
    create: vi.fn(),
    createHappyHour: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock("../price-rule.service", () => ({ priceRuleService: service }));
import { priceRuleController } from "../price-rule.controller";
const auth = { tenantId: "t1" } as any;
const row = {
  id: "11111111-1111-4111-8111-111111111111",
  tenantId: "22222222-2222-4222-8222-222222222222",
  organizationId: null,
  menuItemId: null,
  menuItemSku: null,
  variantId: null,
  branchId: null,
  channel: null,
  fulfillmentType: null,
  customerGroupId: null,
  coverTier: null,
  isPerCover: false,
  startDate: null,
  endDate: null,
  startTime: null,
  endTime: null,
  price: "10.00",
  percentOff: null,
  taxRate: null,
  priority: 0,
  isActive: true,
  effectiveFrom: null,
};
beforeEach(() => {
  vi.clearAllMocks();
});
describe("price rule controller", () => {
  it("delegates all operations", async () => {
    service.list.mockResolvedValue([row]);
    service.create.mockResolvedValue(row);
    service.createHappyHour.mockResolvedValue([row]);
    service.update.mockResolvedValue(row);
    service.remove.mockResolvedValue(undefined);
    await expect(
      priceRuleController.list(auth, "i1", "o1", "sku"),
    ).resolves.toMatchObject({
      success: true,
      data: [expect.objectContaining({ id: row.id })],
    });
    await expect(
      priceRuleController.create(auth, { price: 10 } as any),
    ).resolves.toMatchObject({ success: true });
    await expect(
      priceRuleController.createHappyHour(auth, { percentOff: 10 } as any),
    ).resolves.toMatchObject({ success: true });
    await expect(
      priceRuleController.update(auth, "r1", { price: 9 }),
    ).resolves.toMatchObject({ success: true });
    await expect(priceRuleController.remove(auth, "r1")).resolves.toMatchObject(
      { success: true, data: null },
    );
  });
});
