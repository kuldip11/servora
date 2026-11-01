import { describe, expect, it, vi } from "vitest";
const { controller } = vi.hoisted(() => ({
  controller: {
    list: vi.fn(),
    create: vi.fn(),
    createHappyHour: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock("../price-rule.controller", () => ({
  priceRuleController: controller,
}));
vi.mock("@/core/auth", async () => {
  const { Elysia } = await import("elysia");
  return {
    requireAuthPlugin: () =>
      new Elysia().derive(() => ({ auth: { tenantId: "t1" } })),
  };
});
import { priceRulesRouter } from "../price-rule.route";

const uuid = "11111111-1111-4111-8111-111111111111";
const rule = {
  id: uuid,
  tenantId: uuid,
  organizationId: null,
  menuItemId: uuid,
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

describe("price rule route", () => {
  it("executes all handlers", async () => {
    controller.list.mockResolvedValue({ success: true, data: [rule] });
    controller.create.mockResolvedValue({ success: true, data: rule });
    controller.createHappyHour.mockResolvedValue({
      success: true,
      data: [rule],
    });
    controller.update.mockResolvedValue({ success: true, data: rule });
    controller.remove.mockResolvedValue({ success: true, data: null });
    const req = (path: string, init?: RequestInit) =>
      priceRulesRouter.handle(new Request(`http://localhost${path}`, init));
    expect(
      (await req(`/api/menu/price-rules/?menuItemId=${uuid}`)).status,
    ).toBe(200);
    expect(
      (
        await req("/api/menu/price-rules/", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ menuItemId: uuid, price: 10 }),
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await req("/api/menu/price-rules/happy-hour", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            percentOff: 20,
            startTime: "17:00",
            endTime: "19:00",
          }),
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await req(`/api/menu/price-rules/${uuid}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ priority: 2 }),
        })
      ).status,
    ).toBe(200);
    expect(
      (await req(`/api/menu/price-rules/${uuid}`, { method: "DELETE" })).status,
    ).toBe(200);
  });
});
