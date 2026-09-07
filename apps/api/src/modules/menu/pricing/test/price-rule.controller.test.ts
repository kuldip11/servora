import { beforeEach, describe, expect, it, vi } from "vitest";
const { service } = vi.hoisted(() => ({ service: { list: vi.fn(), create: vi.fn(), createHappyHour: vi.fn(), update: vi.fn(), remove: vi.fn() } }));
vi.mock("../price-rule.service", () => ({ priceRuleService: service }));
import { priceRuleController } from "../price-rule.controller";
const auth = { tenantId: "t1" } as any;
beforeEach(() => { vi.clearAllMocks(); });
describe("price rule controller", () => {
  it("delegates all operations", async () => {
    service.list.mockResolvedValue([1]); service.create.mockResolvedValue({ id: "r1" }); service.createHappyHour.mockResolvedValue([{ id: "h1" }]); service.update.mockResolvedValue({ id: "r1" }); service.remove.mockResolvedValue(undefined);
    await expect(priceRuleController.list(auth, "i1", "o1", "sku")).resolves.toMatchObject({ success: true, data: [1] });
    await expect(priceRuleController.create(auth, { price: 10 } as any)).resolves.toMatchObject({ success: true });
    await expect(priceRuleController.createHappyHour(auth, { percentOff: 10 } as any)).resolves.toMatchObject({ success: true });
    await expect(priceRuleController.update(auth, "r1", { price: 9 })).resolves.toMatchObject({ success: true });
    await expect(priceRuleController.remove(auth, "r1")).resolves.toMatchObject({ success: true, data: null });
    expect(service.list).toHaveBeenCalledWith(auth, "i1", "o1", "sku"); expect(service.remove).toHaveBeenCalledWith(auth, "r1");
  });
});
