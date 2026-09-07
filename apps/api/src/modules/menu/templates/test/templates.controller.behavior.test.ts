import { describe, expect, it, vi } from "vitest";
const { service } = vi.hoisted(() => ({
  service: {
    list: vi.fn(),
    get: vi.fn(),
    createFromCategory: vi.fn(),
    apply: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("../templates.service", () => ({ templatesService: service }));
import { templatesController } from "../templates.controller";
const auth = {} as any;
describe("templates controller coverage", () => {
  it("delegates every operation", async () => {
    service.list.mockResolvedValue([1]);
    service.get.mockResolvedValue({ id: "t1" });
    service.createFromCategory.mockResolvedValue({ id: "t1" });
    service.apply.mockResolvedValue({ ok: 1 });
    service.delete.mockResolvedValue(undefined);
    await expect(templatesController.list(auth)).resolves.toMatchObject({
      success: true,
    });
    await expect(templatesController.get(auth, "t1")).resolves.toMatchObject({
      success: true,
    });
    await expect(
      templatesController.createFromCategory(auth, "c1", "N", "D"),
    ).resolves.toMatchObject({ success: true });
    await expect(
      templatesController.apply(auth, "t1", {}),
    ).resolves.toMatchObject({ success: true });
    await expect(templatesController.delete(auth, "t1")).resolves.toMatchObject(
      { success: true, data: null },
    );
  });
});
