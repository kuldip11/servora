import { describe, expect, it, vi } from "vitest";
const { controller } = vi.hoisted(() => ({
  controller: {
    list: vi.fn(),
    get: vi.fn(),
    createFromCategory: vi.fn(),
    apply: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("../templates.controller", () => ({ templatesController: controller }));
vi.mock("@/core/auth", async () => {
  const { Elysia } = await import("elysia");
  return {
    requireAuthPlugin: () =>
      new Elysia().derive(() => ({ auth: { tenantId: "t1" } })),
  };
});
import { menuTemplatesRouter } from "../templates.route";
const uuid = "11111111-1111-4111-8111-111111111111";
const templateData = {
  id: uuid,
  tenantId: uuid,
  name: "Template",
  description: null,
  sourceCategoryName: null,
  createdAt: "2026-09-18T00:00:00.000Z",
  updatedAt: "2026-09-18T00:00:00.000Z",
  items: [],
};
describe("templates route coverage", () => {
  it("executes all handlers", async () => {
    controller.list.mockResolvedValue({ success: true, data: [templateData] });
    controller.get.mockResolvedValue({ success: true, data: templateData });
    controller.createFromCategory.mockResolvedValue({
      success: true,
      data: templateData,
    });
    controller.apply.mockResolvedValue({
      success: true,
      data: { category: { id: uuid, name: "Category" }, items: [] },
    });
    controller.delete.mockResolvedValue({ success: true, data: null });
    const req = (path: string, init?: RequestInit) =>
      menuTemplatesRouter.handle(new Request(`http://localhost${path}`, init));
    expect((await req("/api/menu/templates/")).status).toBe(200);
    expect((await req(`/api/menu/templates/${uuid}`)).status).toBe(200);
    expect(
      (
        await req(`/api/menu/templates/from-category/${uuid}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "Copy", description: "D" }),
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await req(`/api/menu/templates/${uuid}/apply`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ branchId: uuid, categoryName: "New" }),
        })
      ).status,
    ).toBe(201);
    expect(
      (await req(`/api/menu/templates/${uuid}`, { method: "DELETE" })).status,
    ).toBe(200);
  });
});
