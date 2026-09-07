import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  listForStaff: vi.fn(),
  updateForStaff: vi.fn(),
}));

vi.mock("elysia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("elysia")>();
  class FakeElysia {
    routes: Array<{ method: string; path: string; handler: Function | undefined }> = [];
    use() { return this; }
    post(path: string, handler: Function | undefined) { this.routes.push({ method: "POST", path, handler }); return this; }
    get(path: string, handler: Function | undefined) { this.routes.push({ method: "GET", path, handler }); return this; }
    patch(path: string, handler: Function | undefined) { this.routes.push({ method: "PATCH", path, handler }); return this; }
  }
  return { ...actual, Elysia: FakeElysia };
});
vi.mock("@/core/auth", () => ({ requireAuthPlugin: () => ({}) }));
vi.mock("@/modules/customer/customer-requests", () => ({ customerRequestService: mocks }));

import { customerRequestRouter } from "@/modules/customer/customer-requests.route";

const auth = { tenantId: "t1", branchId: "b1", userId: "u1" };
const route = (method: string, path: string) =>
  (customerRequestRouter as any).routes.find((entry: any) => entry.method === method && entry.path === path);

describe("customerRequestRouter coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.create.mockResolvedValue({ id: "r1" });
    mocks.listForStaff.mockResolvedValue([{ id: "r1" }]);
    mocks.updateForStaff.mockResolvedValue({ id: "r1", status: "RESOLVED" });
  });

  it("creates customer requests and requires a session token", async () => {
    const post = route("POST", "/api/customer/requests");
    await expect(post.handler({ headers: {}, body: { type: "WATER" } })).rejects.toThrow();
    await expect(
      post.handler({
        headers: { "x-customer-session": "session1" },
        body: { type: "WATER", note: "cold" },
      }),
    ).resolves.toEqual({ success: true, data: { id: "r1" } });
    expect(mocks.create).toHaveBeenCalledWith("session1", { type: "WATER", note: "cold" });
  });

  it("lists and updates requests for authenticated staff", async () => {
    await expect(route("GET", "/api/customer/requests").handler({ auth })).resolves.toEqual({
      success: true,
      data: [{ id: "r1" }],
    });
    await expect(
      route("PATCH", "/api/customer/requests/:id").handler({
        auth,
        params: { id: "r1" },
        body: { status: "RESOLVED" },
      }),
    ).resolves.toEqual({ success: true, data: { id: "r1", status: "RESOLVED" } });
    expect(mocks.listForStaff).toHaveBeenCalledWith(auth);
    expect(mocks.updateForStaff).toHaveBeenCalledWith(auth, "r1", "RESOLVED");
  });
});
