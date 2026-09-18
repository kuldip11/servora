import { describe, expect, it, vi } from "vitest";
const { controller } = vi.hoisted(() => ({
  controller: {
    preview: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    stats: vi.fn(),
  },
}));
vi.mock("../promotion.controller", () => ({ promotionController: controller }));
vi.mock("@/core/auth", async () => {
  const { Elysia } = await import("elysia");
  return {
    requireAuthPlugin: () =>
      new Elysia().derive(() => ({ auth: { tenantId: "t1" } })),
  };
});
import { promotionsRouter } from "../promotion.route";
const uuid = "11111111-1111-4111-8111-111111111111";
const promotion = {
  id: uuid,
  tenantId: uuid,
  name: "Promo",
  ruleType: "PERCENTAGE",
  scope: "ORDER",
  scopeCategoryId: null,
  scopeMenuItemId: null,
  value: "10.00",
  couponCode: null,
  startDate: null,
  endDate: null,
  startTime: null,
  endTime: null,
  maxUsesTotal: null,
  maxUsesPerCustomer: null,
  triggerMenuItemId: null,
  triggerCategoryId: null,
  rewardMenuItemId: null,
  rewardCategoryId: null,
  rewardDiscountPercent: null,
  triggerQuantity: null,
  rewardQuantity: null,
  stackableWithLoyalty: true,
  isActive: true,
};
const line = {
  menuItemId: uuid,
  menuItemName: "Item",
  quantity: 1,
  unitPrice: 100,
  subtotal: 100,
  taxRate: 5,
  fulfillmentType: "DINE_IN",
  modifiers: [],
  pricingAttribution: { BASE_PRICE: 100, VARIANT: 0, MODIFIER: 0 },
};
describe("promotion routes", () => {
  it("executes all registered handlers", async () => {
    controller.list.mockResolvedValue({ success: true, data: [promotion] });
    controller.create.mockResolvedValue({ success: true, data: promotion });
    controller.update.mockResolvedValue({ success: true, data: promotion });
    controller.remove.mockResolvedValue({ success: true, data: null });
    controller.stats.mockResolvedValue({
      success: true,
      data: { uses: 0, discountAmount: "0" },
    });
    controller.preview.mockResolvedValue({
      success: true,
      data: {
        asOf: "2026-09-18T00:00:00.000Z",
        subtotal: 100,
        discountAmount: 10,
        taxAmount: 4.5,
        serviceChargeAmount: 0,
        roundingAdjustment: 0,
        totalAmount: 94.5,
        lines: [line],
      },
    });
    const req = (path: string, init?: RequestInit) =>
      promotionsRouter.handle(new Request(`http://localhost${path}`, init));
    expect((await req("/api/menu/promotions/")).status).toBe(200);
    expect(
      (
        await req("/api/menu/promotions/", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: "Promo",
            ruleType: "PERCENTAGE",
            scope: "ORDER",
            value: 10,
          }),
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await req("/api/menu/promotions/preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            promotion: {
              name: "Promo",
              ruleType: "PERCENTAGE",
              scope: "ORDER",
              value: 10,
            },
            items: [{ menuItemId: uuid, quantity: 1 }],
          }),
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await req(`/api/menu/promotions/${uuid}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "Updated" }),
        })
      ).status,
    ).toBe(200);
    expect(
      (await req(`/api/menu/promotions/${uuid}`, { method: "DELETE" })).status,
    ).toBe(200);
    expect((await req(`/api/menu/promotions/${uuid}/stats`)).status).toBe(200);
  });
});
