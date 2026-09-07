vi.mock("elysia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("elysia")>();
  class FakeElysia {
    routes: any[] = [];
    name: string;
    constructor(options: any = {}) {
      this.name = options.name ?? "";
    }
    use(plugin: any) {
      return this;
    }
    get(path: string, handler?: unknown) {
      this.routes.push({ method: "GET", path, handler });
      return this;
    }
    post(path: string, handler?: unknown) {
      this.routes.push({ method: "POST", path, handler });
      return this;
    }
    put(path: string) {
      this.routes.push({ method: "PUT", path });
      return this;
    }
    patch(path: string, handler?: unknown) {
      this.routes.push({ method: "PATCH", path, handler });
      return this;
    }
    delete(path: string) {
      this.routes.push({ method: "DELETE", path });
      return this;
    }
    ws(path: string) {
      this.routes.push({ method: "WS", path });
      return this;
    }
  }
  return { ...actual, Elysia: FakeElysia };
});
vi.mock("../../../core/auth", () => ({ requireAuthPlugin: () => ({}) }));
import { describe, expect, it, vi } from "vitest";
const {
  list,
  create,
  updateStock,
  lowStockAlerts,
  recentTransactions,
  logWaste, recipeImpact, listWasteReasons, createWasteReason, updateWasteReason,
} = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  updateStock: vi.fn(),
  lowStockAlerts: vi.fn(),
  recentTransactions: vi.fn(),
  logWaste: vi.fn(), recipeImpact: vi.fn(), listWasteReasons: vi.fn(), createWasteReason: vi.fn(), updateWasteReason: vi.fn(),
}));
vi.mock("../inventory.controller", () => ({
  inventoryController: {
    list,
    create,
    updateStock,
    lowStockAlerts,
    recentTransactions,
    logWaste, recipeImpact, listWasteReasons, createWasteReason, updateWasteReason,
  },
}));
import { inventoryRouter } from "@/modules/inventory/inventory.route";
describe("inventory routes", () => {
  it("registers item, stock, and low-stock endpoints", () => {
    expect((inventoryRouter as any).routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: "GET",
          path: "/api/inventory/items",
        }),
        expect.objectContaining({
          method: "POST",
          path: "/api/inventory/items",
        }),
        expect.objectContaining({
          method: "PATCH",
          path: "/api/inventory/items/:id/stock",
        }),
        expect.objectContaining({
          method: "GET",
          path: "/api/inventory/alerts/low-stock",
        }),
        expect.objectContaining({
          method: "GET",
          path: "/api/inventory/transactions",
        }),
        expect.objectContaining({
          method: "GET",
          path: "/api/inventory/items/:id/recipe-impact",
        }),
        expect.objectContaining({
          method: "POST",
          path: "/api/inventory/items/:id/waste",
        }),
      ]),
    );
  });

  it("forwards the reason-coded waste payload through the HTTP endpoint", async () => {
    logWaste.mockResolvedValue({
      success: true,
      data: { transaction: { wasteReasonId: "wr1" } },
    });
    const route = (
      inventoryRouter as {
        routes: Array<{
          method: string;
          path: string;
          handler?: (context: unknown) => unknown;
        }>;
      }
    ).routes.find(
      (candidate) =>
        candidate.method === "POST" &&
        candidate.path === "/api/inventory/items/:id/waste",
    );
    expect(route?.handler).toBeTypeOf("function");

    const body = { quantity: 2, wasteReasonId: "wr1", notes: "Trim loss" };
    await route!.handler!({
      auth: { tenantId: "t1" },
      params: { id: "i1" },
      body,
    });

    expect(logWaste).toHaveBeenCalledWith({ tenantId: "t1" }, "i1", body);
  });
  it("executes every registered inventory route handler", async () => {
    list.mockResolvedValue({ok:true}); create.mockResolvedValue({ok:true}); updateStock.mockResolvedValue({ok:true}); lowStockAlerts.mockResolvedValue({ok:true}); recentTransactions.mockResolvedValue({ok:true}); recipeImpact.mockResolvedValue({ok:true}); listWasteReasons.mockResolvedValue({ok:true}); createWasteReason.mockResolvedValue({ok:true}); updateWasteReason.mockResolvedValue({ok:true}); logWaste.mockResolvedValue({ok:true});
    const routes=(inventoryRouter as any).routes as Array<{method:string;path:string;handler:(ctx:any)=>unknown}>;
    const get=(method:string,path:string)=>routes.find(r=>r.method===method&&r.path===path)!;
    const auth={tenantId:"t1"};
    await get("GET","/api/inventory/items").handler({auth,query:{page:1}});
    const set1:any={}; await get("POST","/api/inventory/items").handler({auth,body:{name:"x"},set:set1}); expect(set1.status).toBe(201);
    await get("PATCH","/api/inventory/items/:id/stock").handler({auth,params:{id:"i1"},body:{quantity:1}});
    await get("GET","/api/inventory/alerts/low-stock").handler({auth});
    await get("GET","/api/inventory/transactions").handler({auth});
    await get("GET","/api/inventory/items/:id/recipe-impact").handler({auth,params:{id:"i1"}});
    await get("GET","/api/inventory/waste-reasons").handler({auth,query:{includeInactive:"true"}});
    await get("GET","/api/inventory/waste-reasons").handler({auth,query:{includeInactive:"false"}});
    const set2:any={}; await get("POST","/api/inventory/waste-reasons").handler({auth,body:{label:"Waste"},set:set2}); expect(set2.status).toBe(201);
    await get("PATCH","/api/inventory/waste-reasons/:id").handler({auth,params:{id:"w1"},body:{label:"X"}});
    await get("POST","/api/inventory/items/:id/waste").handler({auth,params:{id:"i1"},body:{quantity:1,wasteReasonId:"w1"}});
    expect(recipeImpact).toHaveBeenCalled(); expect(listWasteReasons).toHaveBeenCalledWith(auth,true); expect(listWasteReasons).toHaveBeenCalledWith(auth,false);
  });

});
