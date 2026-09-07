import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const limit = vi.fn();
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn(() => ({ orderBy }));
  const leftJoin = vi.fn(() => ({ where }));
  const from = vi.fn(() => ({ leftJoin }));
  const select = vi.fn(() => ({ from }));
  const requirePermission = vi.fn();
  return { limit, orderBy, where, leftJoin, from, select, requirePermission };
});

vi.mock("elysia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("elysia")>();
  class FakeElysia {
    routes: Array<{
      method: string;
      path: string;
      handler: Function | undefined;
      options: unknown;
    }> = [];
    use() {
      return this;
    }
    get(path: string, handler: Function | undefined, options: unknown) {
      this.routes.push({ method: "GET", path, handler, options });
      return this;
    }
  }
  return { ...actual, Elysia: FakeElysia };
});
vi.mock("../../../core/auth", () => ({
  requireAuthPlugin: () => ({}),
  requirePermission: mocks.requirePermission,
}));
vi.mock("../../../db", () => ({ db: { select: mocks.select } }));

import { auditRouter } from "@/modules/audit/audit.route";

const handler = () => (auditRouter as any).routes[0].handler as Function;

describe("audit route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.limit.mockResolvedValue([{ id: "audit-1" }]);
  });

  it("registers the audit endpoint with query validation", () => {
    expect((auditRouter as any).routes).toHaveLength(1);
    expect((auditRouter as any).routes[0]).toEqual(
      expect.objectContaining({
        method: "GET",
        path: "/",
        options: expect.anything(),
      }),
    );
  });

  it("requires permission and returns no rows when auth has no tenant", async () => {
    await expect(
      handler()({ auth: { tenantId: "" }, query: {} }),
    ).resolves.toEqual({
      success: true,
      data: [],
    });
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      { tenantId: "" },
      "audit:read",
    );
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("queries tenant audit rows with defaults and no optional filters", async () => {
    const auth = { tenantId: "tenant-1" };
    await expect(handler()({ auth, query: {} })).resolves.toEqual({
      success: true,
      data: [{ id: "audit-1" }],
    });
    expect(mocks.select).toHaveBeenCalledOnce();
    expect(mocks.limit).toHaveBeenCalledWith(50);
  });

  it("applies every optional filter, a valid cursor, and caps the limit", async () => {
    const auth = { tenantId: "tenant-1", branchId: "branch-1" };
    await handler()({
      auth,
      query: {
        action: "ORDER_UPDATED",
        entity: "order",
        userId: "00000000-0000-0000-0000-000000000001",
        before: "2026-09-05T10:00:00.000Z",
        limit: 250,
      },
    });
    expect(mocks.limit).toHaveBeenCalledWith(100);
    expect(mocks.where).toHaveBeenCalledOnce();
  });

  it("ignores an invalid before cursor and honors an explicit small limit", async () => {
    await handler()({
      auth: { tenantId: "tenant-1" },
      query: { before: "not-a-date", limit: 1 },
    });
    expect(mocks.limit).toHaveBeenCalledWith(1);
  });
});
