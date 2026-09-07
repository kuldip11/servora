import { beforeEach, describe, expect, it, vi } from "vitest";
const { repo, record } = vi.hoisted(() => ({
  repo: {
    findMany: vi.fn(),
    findById: vi.fn(),
    findCategory: vi.fn(),
    findTenantWideCategoryItems: vi.fn(),
    createFromCategory: vi.fn(),
    apply: vi.fn(),
    delete: vi.fn(),
  },
  record: vi.fn(),
}));
vi.mock("../templates.repository", () => ({ templatesRepository: repo }));
vi.mock("../../change-log/menu-change-log", () => ({
  menuChangeLog: { record },
  buildDiff: vi.fn(() => ({})),
}));
import { templatesService } from "../templates.service";
const auth = {
  tenantId: "t1",
  branchId: null,
  tenantWide: true,
  permissions: ["menu:read", "menu:create", "menu:delete"],
} as any;
beforeEach(() => {
  vi.clearAllMocks();
  repo.findMany.mockResolvedValue([]);
  repo.findTenantWideCategoryItems.mockResolvedValue([]);
  record.mockResolvedValue(undefined);
});
describe("templates service coverage", () => {
  it("covers list/get found and missing", async () => {
    repo.findMany.mockResolvedValue([{ id: "t1" }]);
    await expect(templatesService.list(auth)).resolves.toEqual([{ id: "t1" }]);
    repo.findById.mockResolvedValueOnce({ id: "tpl1" });
    await expect(templatesService.get(auth, "tpl1")).resolves.toEqual({
      id: "tpl1",
    });
    repo.findById.mockResolvedValueOnce(undefined);
    await expect(templatesService.get(auth, "missing")).rejects.toThrow();
  });
  it("covers create from category success and failure branches", async () => {
    repo.findCategory.mockResolvedValueOnce(undefined);
    await expect(
      templatesService.createFromCategory(auth, "c1", "N"),
    ).rejects.toThrow();
    repo.findCategory.mockResolvedValue({ name: "Cat" });
    repo.findTenantWideCategoryItems.mockResolvedValue([{ name: "Item" }]);
    repo.createFromCategory.mockResolvedValueOnce(undefined);
    await expect(
      templatesService.createFromCategory(auth, "c1", "N"),
    ).rejects.toThrow(/could not be created/i);
    repo.createFromCategory.mockResolvedValueOnce({ id: "tpl1" });
    await expect(
      templatesService.createFromCategory(auth, "c1", "N", "D"),
    ).resolves.toEqual({ id: "tpl1" });
    expect(record).toHaveBeenCalled();
  });
  it("covers apply found/missing and delete found/missing", async () => {
    repo.findById.mockResolvedValueOnce(undefined);
    await expect(templatesService.apply(auth, "missing", {})).rejects.toThrow();
    repo.findById.mockResolvedValueOnce({ id: "tpl1", items: [] });
    repo.apply.mockResolvedValue({ category: { id: "c1" }, items: [] });
    await expect(
      templatesService.apply(auth, "tpl1", { categoryName: "Copy" }),
    ).resolves.toMatchObject({ category: { id: "c1" } });
    repo.delete.mockResolvedValueOnce(false);
    await expect(templatesService.delete(auth, "missing")).rejects.toThrow();
    repo.delete.mockResolvedValueOnce(true);
    await expect(
      templatesService.delete(auth, "tpl1"),
    ).resolves.toBeUndefined();
    expect(record).toHaveBeenCalled();
  });
});
