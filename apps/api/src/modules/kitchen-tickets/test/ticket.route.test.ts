vi.mock("elysia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("elysia")>();
  class FakeElysia {
    routes: any[] = [];
    name: string;
    constructor(options: any = {}) {
      this.name = options.name ?? "";
    }
    use(_plugin: any) {
      return this;
    }
    get(path: string) {
      this.routes.push({ method: "GET", path });
      return this;
    }
    post(path: string) {
      this.routes.push({ method: "POST", path });
      return this;
    }
    put(path: string) {
      this.routes.push({ method: "PUT", path });
      return this;
    }
    patch(path: string) {
      this.routes.push({ method: "PATCH", path });
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
vi.mock("../ticket.controller", () => ({
  ticketController: { getQueue: vi.fn(), updateStatus: vi.fn() },
}));
import { kitchenTicketsRouter } from "@/modules/kitchen-tickets/ticket.route";

describe("kitchen ticket routes", () => {
  it("registers queue and status endpoints", () => {
    expect((kitchenTicketsRouter as any).routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: "GET",
          path: "/api/kitchen-tickets/",
        }),
        expect.objectContaining({
          method: "PATCH",
          path: "/api/kitchen-tickets/:id/status",
        }),
      ]),
    );
  });
});
