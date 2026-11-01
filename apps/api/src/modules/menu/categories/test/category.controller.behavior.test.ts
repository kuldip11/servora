import { beforeEach, describe, expect, it, vi } from "vitest";
const s = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deactivate: vi.fn(),
}));
vi.mock("../category.service", () => ({ categoryService: s }));
import { categoryController } from "@/modules/menu/categories/category.controller";
const auth = { tenantId: "t1" } as any;
describe("categoryController coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    s.list.mockResolvedValue([]);
    s.create.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      tenantId: "22222222-2222-4222-8222-222222222222",
      branchId: null,
      name: "Drinks",
      description: null,
      sortOrder: 0,
      isActive: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    s.update.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      tenantId: "22222222-2222-4222-8222-222222222222",
      branchId: null,
      name: "Drinks",
      description: null,
      sortOrder: 0,
      isActive: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    s.deactivate.mockResolvedValue(undefined);
  });
  it("delegates all handlers", async () => {
    await expect(categoryController.list(auth)).resolves.toMatchObject({
      success: true,
      data: [],
    });
    await expect(
      categoryController.create(auth, { name: "Drinks" }),
    ).resolves.toMatchObject({
      success: true,
      data: { id: "11111111-1111-4111-8111-111111111111" },
    });
    await categoryController.update(
      auth,
      "11111111-1111-4111-8111-111111111111",
      { name: "B" },
    );
    await expect(
      categoryController.deactivate(
        auth,
        "11111111-1111-4111-8111-111111111111",
      ),
    ).resolves.toMatchObject({ data: null });
    expect(s.update).toHaveBeenCalledWith(
      auth,
      "11111111-1111-4111-8111-111111111111",
      { name: "B" },
    );
  });
});
