vi.mock("elysia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("elysia")>();
  class FakeElysia {
    routes: Array<{ method: string; path: string; handler: ((context: any) => unknown) | undefined }> = [];
    constructor(_options: unknown = {}) {}
    use(_plugin: unknown) { return this; }
    get(path: string, handler: ((context: any) => unknown) | undefined) { this.routes.push({ method: "GET", path, handler }); return this; }
  }
  return { ...actual, Elysia: FakeElysia };
});
const mocks = vi.hoisted(() => ({ requirePermission: vi.fn(), list: vi.fn() }));
vi.mock("@/core/auth", () => ({ requireAuthPlugin: () => ({}), requirePermission: mocks.requirePermission }));
vi.mock("../menu-change-log", () => ({ menuChangeLog: { list: mocks.list } }));
import { describe, expect, it, vi } from "vitest";
import { menuChangeLogRouter } from "../menu-change-log.route";

describe("menu change log route coverage", () => {
  it("forwards valid filters and drops invalid before dates", async () => {
    const handler = (menuChangeLogRouter as any).routes[0].handler as (ctx: any) => unknown;
    mocks.list.mockResolvedValue([]);
    const auth = { tenantId: "t1" };
    await handler({ auth, query: { entityType: "MENU_ITEM", entityId: "i1", changeType: "UPDATED", before: "2026-01-01T00:00:00.000Z", limit: 10 } });
    expect(mocks.requirePermission).toHaveBeenCalledWith(auth, "audit:read");
    expect(mocks.list).toHaveBeenLastCalledWith("t1", expect.objectContaining({ entityType: "MENU_ITEM", entityId: "i1", changeType: "UPDATED", limit: 10, before: expect.any(Date) }));
    await handler({ auth, query: { before: "not-a-date" } });
    expect(mocks.list).toHaveBeenLastCalledWith("t1", {});
    await handler({ auth, query: {} });
    expect(mocks.list).toHaveBeenLastCalledWith("t1", {});
  });
});
