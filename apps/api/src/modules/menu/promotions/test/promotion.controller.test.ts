import { beforeEach, describe, expect, it, vi } from "vitest";
const { service } = vi.hoisted(() => ({
  service: {
    preview: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    stats: vi.fn(),
  },
}));
vi.mock("../promotion.service", () => ({ promotionService: service }));
import { promotionController } from "../promotion.controller";
const auth = { tenantId: "t1" } as any;
beforeEach(() => {
  vi.clearAllMocks();
});
describe("promotion controller", () => {
  it("delegates all methods", async () => {
    service.preview.mockResolvedValue({ discount: 1 });
    service.list.mockResolvedValue([{ id: "p1" }]);
    service.create.mockResolvedValue({ id: "p1" });
    service.update.mockResolvedValue({ id: "p1" });
    service.remove.mockResolvedValue(undefined);
    service.stats.mockResolvedValue({ uses: 1 });
    await expect(
      promotionController.preview(auth, {} as any),
    ).resolves.toMatchObject({ success: true });
    await expect(promotionController.list(auth)).resolves.toMatchObject({
      success: true,
    });
    await expect(
      promotionController.create(auth, {} as any),
    ).resolves.toMatchObject({ success: true });
    await expect(
      promotionController.update(auth, "p1", {}),
    ).resolves.toMatchObject({ success: true });
    await expect(promotionController.remove(auth, "p1")).resolves.toMatchObject(
      { success: true, data: null },
    );
    await expect(promotionController.stats(auth, "p1")).resolves.toMatchObject({
      success: true,
    });
  });
});
