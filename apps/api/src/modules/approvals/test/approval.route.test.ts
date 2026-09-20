import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  upsert: vi.fn(),
  issue: vi.fn(),
}));

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
    put(path: string, handler: Function | undefined, options: unknown) {
      this.routes.push({ method: "PUT", path, handler, options });
      return this;
    }
    post(path: string, handler: Function | undefined, options: unknown) {
      this.routes.push({ method: "POST", path, handler, options });
      return this;
    }
  }
  return { ...actual, Elysia: FakeElysia };
});
vi.mock("../../../core/auth", () => ({ requireAuthPlugin: () => ({}) }));
vi.mock("../approval.service", () => ({ approvalService: mocks }));

import { approvalsRouter } from "@/modules/approvals/approval.route";

const route = (method: string, path: string) =>
  (approvalsRouter as any).routes.find(
    (entry: any) => entry.method === method && entry.path === path,
  );

const auth = { tenantId: "tenant-1" } as any;

describe("approval routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const threshold = {
      id: "00000000-0000-4000-8000-000000000001",
      tenantId: "00000000-0000-4000-8000-000000000002",
      actionType: "VOID",
      thresholdAmount: "42.00",
      requiresRole: "Manager",
      createdAt: new Date("2026-09-18T00:00:00.000Z"),
      updatedAt: new Date("2026-09-18T00:00:00.000Z"),
    };
    mocks.list.mockReturnValue([threshold]);
    mocks.upsert.mockResolvedValue(threshold);
    mocks.issue.mockResolvedValue({
      token: "00000000-0000-4000-8000-000000000003",
      expiresAt: new Date("2026-09-18T00:05:00.000Z"),
    });
  });

  it("registers every approval endpoint and validation schema", () => {
    expect(
      (approvalsRouter as any).routes.map((entry: any) => [
        entry.method,
        entry.path,
      ]),
    ).toEqual([
      ["GET", "/thresholds"],
      ["PUT", "/thresholds/:actionType"],
      ["POST", "/manager"],
    ]);
    expect(route("PUT", "/thresholds/:actionType").options).toBeTruthy();
    expect(route("POST", "/manager").options).toBeTruthy();
  });

  it("executes all route handlers and delegates their inputs", async () => {
    expect(await route("GET", "/thresholds").handler({ auth })).toEqual({
      success: true,
      data: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          tenantId: "00000000-0000-4000-8000-000000000002",
          actionType: "VOID",
          thresholdAmount: "42.00",
          requiresRole: "Manager",
          createdAt: "2026-09-18T00:00:00.000Z",
          updatedAt: "2026-09-18T00:00:00.000Z",
        },
      ],
    });
    await route("PUT", "/thresholds/:actionType").handler({
      auth,
      params: { actionType: "COMP" },
      body: { thresholdAmount: 42, requiresRole: "Supervisor" },
    });
    await route("POST", "/manager").handler({
      auth,
      body: {
        actionType: "VOID",
        orderId: "o1",
        orderItemId: "i1",
        managerEmail: "m@example.com",
        password: "pw",
      },
    });
    expect(mocks.upsert).toHaveBeenCalledWith(auth, "COMP", 42, "Supervisor");
    expect(mocks.issue).toHaveBeenCalledWith(
      auth,
      expect.objectContaining({ actionType: "VOID", orderId: "o1" }),
    );
  });
});
