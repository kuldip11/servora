import { beforeEach, describe, expect, it, vi } from "vitest";
const r = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  itemCount: vi.fn(),
}));
const a = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  resolveMenuBranch: vi.fn(),
  assertMenuResourceBranch: vi.fn(),
  record: vi.fn(),
}));
vi.mock("../category.repository", () => ({ categoryRepository: r }));
vi.mock("../../../../core/auth", () => ({
  requirePermission: a.requirePermission,
}));
vi.mock("../../menu-authorization", () => ({
  resolveMenuBranch: a.resolveMenuBranch,
  assertMenuResourceBranch: a.assertMenuResourceBranch,
}));
vi.mock("../../change-log/menu-change-log", () => ({
  buildDiff: (x: any, y: any) => ({ x, y }),
  menuChangeLog: { record: a.record },
}));
import { categoryService } from "@/modules/menu/categories/category.service";
const auth = (permissions: string[], branchId: any = "b1") =>
  ({ tenantId: "t1", branchId, permissions, userId: "u1" }) as any;
describe("categoryService coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    a.resolveMenuBranch.mockImplementation(
      (_auth: any, b?: string) => b ?? "b1",
    );
    r.findMany.mockResolvedValue([]);
    r.create.mockResolvedValue({ id: "c1" });
    r.findById.mockResolvedValue({ id: "c1", branchId: "b1" });
    r.update.mockResolvedValue({ id: "c1", branchId: "b1" });
    r.itemCount.mockResolvedValue(0);
  });
  it("lists with and without draft permission", async () => {
    await categoryService.list(auth(["menu:read", "menu:update"]));
    expect(r.findMany).toHaveBeenLastCalledWith("t1", "b1", true);
    await categoryService.list(auth(["menu:read"]));
    expect(r.findMany).toHaveBeenLastCalledWith("t1", "b1", false);
  });
  it("creates branch-resolved categories and logs change", async () => {
    await categoryService.create(auth(["menu:create"]), {
      name: "Drinks",
      branchId: "b2",
    });
    expect(r.create).toHaveBeenCalledWith({
      tenantId: "t1",
      name: "Drinks",
      branchId: "b2",
    });
    expect(a.record).toHaveBeenCalled();
  });
  it("updates categories and handles missing/race outcomes", async () => {
    r.findById.mockResolvedValueOnce(undefined);
    await expect(
      categoryService.update(auth(["menu:update"]), "missing", {}),
    ).rejects.toThrow();
    r.findById.mockResolvedValue({ id: "c1", branchId: "b1" });
    r.update.mockResolvedValueOnce(undefined);
    await expect(
      categoryService.update(auth(["menu:update"]), "c1", {}),
    ).rejects.toThrow();
    r.update.mockResolvedValue({ id: "c1" });
    await expect(
      categoryService.update(auth(["menu:update"]), "c1", { name: "B" }),
    ).resolves.toEqual({ id: "c1" });
    expect(a.assertMenuResourceBranch).toHaveBeenCalled();
  });
  it("deactivates empty categories and rejects missing/nonempty/race cases", async () => {
    r.findById.mockResolvedValueOnce(undefined);
    await expect(
      categoryService.deactivate(auth(["menu:delete"]), "x"),
    ).rejects.toThrow();
    r.findById.mockResolvedValue({ id: "c1", branchId: "b1" });
    r.itemCount.mockResolvedValueOnce(2);
    await expect(
      categoryService.deactivate(auth(["menu:delete"]), "c1"),
    ).rejects.toThrow("still has 2 item");
    r.itemCount.mockResolvedValue(0);
    r.update.mockResolvedValueOnce(undefined);
    await expect(
      categoryService.deactivate(auth(["menu:delete"]), "c1"),
    ).rejects.toThrow();
    r.update.mockResolvedValue({ id: "c1", isActive: false });
    await expect(
      categoryService.deactivate(auth(["menu:delete"]), "c1"),
    ).resolves.toMatchObject({ isActive: false });
    expect(a.record).toHaveBeenCalledWith(
      expect.anything(),
      "CATEGORY",
      "c1",
      "ARCHIVED",
      expect.anything(),
    );
  });
});
