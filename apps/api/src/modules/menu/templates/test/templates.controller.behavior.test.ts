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
const uuid = "11111111-1111-4111-8111-111111111111";
const template = {
  id: uuid,
  tenantId: uuid,
  name: "Template",
  description: null,
  sourceCategoryName: null,
  createdAt: new Date("2026-09-18T00:00:00.000Z"),
  updatedAt: new Date("2026-09-18T00:00:00.000Z"),
  items: [],
};
const applied = {
  category: { id: uuid, name: "Category" },
  items: [{ id: uuid, name: "Item" }],
};
describe("templates controller coverage", () => {
  it("delegates every operation", async () => {
    service.list.mockResolvedValue([template]);
    service.get.mockResolvedValue(template);
    service.createFromCategory.mockResolvedValue(template);
    service.apply.mockResolvedValue(applied);
    service.delete.mockResolvedValue(undefined);
    await expect(templatesController.list(auth)).resolves.toMatchObject({
      success: true,
    });
    await expect(templatesController.get(auth, uuid)).resolves.toMatchObject({
      success: true,
    });
    await expect(
      templatesController.createFromCategory(auth, uuid, "N", "D"),
    ).resolves.toMatchObject({ success: true });
    await expect(
      templatesController.apply(auth, uuid, {}),
    ).resolves.toMatchObject({ success: true });
    await expect(templatesController.delete(auth, uuid)).resolves.toMatchObject(
      { success: true, data: null },
    );
  });
});
