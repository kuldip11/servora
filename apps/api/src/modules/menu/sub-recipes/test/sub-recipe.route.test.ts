import { describe, expect, it, vi } from "vitest";
const { service } = vi.hoisted(() => ({
  service: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock("../sub-recipe.service", () => ({ subRecipeService: service }));
vi.mock("@/core/auth", async () => {
  const { Elysia } = await import("elysia");
  return {
    requireAuthPlugin: () =>
      new Elysia().derive(() => ({ auth: { tenantId: "t1" } })),
  };
});
import { subRecipesRouter } from "../sub-recipe.route";
const uuid = "11111111-1111-4111-8111-111111111111";
const body = {
  name: "Sauce",
  yieldQuantity: 1,
  yieldUnit: "LITERS",
  ingredients: [],
};
describe("sub-recipe routes", () => {
  it("executes all handlers", async () => {
    service.list.mockResolvedValue([]);
    service.create.mockResolvedValue({ id: "s1" });
    service.update.mockResolvedValue({ id: "s1" });
    service.delete.mockResolvedValue(undefined);
    const req = (path: string, init?: RequestInit) =>
      subRecipesRouter.handle(new Request(`http://localhost${path}`, init));
    expect((await req("/api/menu/sub-recipes/")).status).toBe(200);
    expect(
      (
        await req("/api/menu/sub-recipes/", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await req(`/api/menu/sub-recipes/${uuid}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        })
      ).status,
    ).toBe(200);
    expect(
      (await req(`/api/menu/sub-recipes/${uuid}`, { method: "DELETE" })).status,
    ).toBe(200);
  });
});
