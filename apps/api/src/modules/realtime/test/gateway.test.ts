import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError } from "@/core/errors";

const { resolveMembership } = vi.hoisted(() => ({
  resolveMembership: vi.fn(),
}));
const { resolveAuthorization } = vi.hoisted(() => ({
  resolveAuthorization: vi.fn(),
}));
const { subscribe } = vi.hoisted(() => ({ subscribe: vi.fn() }));
const { on } = vi.hoisted(() => ({ on: vi.fn() }));

vi.mock("../../../db", () => ({ db: {} }));
vi.mock("../../../lib/redis", () => ({
  subscriber: { subscribe, on },
  REDIS_CHANNELS: {
    ORDER_EVENTS: "orders",
    KITCHEN_EVENTS: "kitchen",
    INVENTORY_EVENTS: "inventory",
    TABLE_EVENTS: "tables",
  },
}));
vi.mock("../../../core/auth/authorization", () => ({
  resolveMembership,
  resolveAuthorization,
}));
vi.mock("../../../lib/jwt", () => ({ verifyAccessToken: vi.fn() }));

import {
  forwardTenantRealtimeMessage,
  resolveRealtimeContext,
} from "@/modules/realtime/gateway";

const payload = { sub: "u1" } as any;

beforeEach(() => {
  vi.clearAllMocks();
  subscribe.mockResolvedValue(undefined);
  resolveMembership.mockResolvedValue({ id: "m1", tenantId: "t1" });
  resolveAuthorization.mockResolvedValue({
    allowed: true,
    permissionKeys: ["orders:read"],
    branchIds: ["b1"],
    tenantWide: false,
  });
});

describe("realtime gateway context", () => {
  it("requires an explicit tenant and an active membership", async () => {
    await expect(resolveRealtimeContext(payload, "")).rejects.toBeInstanceOf(
      ForbiddenError,
    );

    resolveMembership.mockResolvedValue(undefined);
    await expect(resolveRealtimeContext(payload, "t1")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(resolveMembership).toHaveBeenCalledWith({}, "u1", "t1");
  });

  it("requires one of the realtime read permissions and preserves the authorized branch scope", async () => {
    resolveAuthorization.mockResolvedValue({
      allowed: true,
      permissionKeys: ["menu:read"],
      branchIds: ["b1"],
      tenantWide: false,
    });
    await expect(
      resolveRealtimeContext(payload, "t1", "b1"),
    ).rejects.toBeInstanceOf(ForbiddenError);

    resolveAuthorization.mockResolvedValue({
      allowed: true,
      permissionKeys: ["orders:read"],
      branchIds: ["b1"],
      tenantWide: false,
    });
    await expect(resolveRealtimeContext(payload, "t1", "b1")).resolves.toEqual({
      tenantId: "t1",
      membershipId: "m1",
      branchId: "b1",
    });
  });

  it("rejects unauthorized branches but permits tenant-wide or all-branch sessions", async () => {
    resolveAuthorization.mockResolvedValue({
      allowed: true,
      permissionKeys: ["tables:read"],
      branchIds: ["b1"],
      tenantWide: false,
    });
    await expect(
      resolveRealtimeContext(payload, "t1", "b2"),
    ).rejects.toBeInstanceOf(ForbiddenError);

    resolveAuthorization.mockResolvedValue({
      allowed: true,
      permissionKeys: ["tables:read"],
      branchIds: [],
      tenantWide: true,
    });
    await expect(resolveRealtimeContext(payload, "t1", "b2")).resolves.toEqual({
      tenantId: "t1",
      membershipId: "m1",
      branchId: "b2",
    });
    await expect(resolveRealtimeContext(payload, "t1", "all")).resolves.toEqual(
      { tenantId: "t1", membershipId: "m1", branchId: null },
    );
  });

  it("forwards a branch-scoped void event through the same tenant realtime transport as kitchen events", () => {
    const tenantId = "11111111-1111-4111-8111-111111111111";
    const branchId = "22222222-2222-4222-8222-222222222222";
    const otherBranchId = "33333333-3333-4333-8333-333333333333";
    const b1 = { __branchId: branchId, send: vi.fn() };
    const b2 = { __branchId: otherBranchId, send: vi.fn() };
    const all = { __branchId: null, send: vi.fn() };
    const registry = new Map([[tenantId, new Set([b1, b2, all])]]);
    const message = JSON.stringify({
      type: "order.item.voided",
      tenantId,
      branchId,
      payload: { id: "44444444-4444-4444-8444-444444444444" },
    });
    forwardTenantRealtimeMessage(message, registry);
    expect(b1.send).toHaveBeenCalledWith(message);
    expect(all.send).toHaveBeenCalledWith(message);
    expect(b2.send).not.toHaveBeenCalled();
  });

  it("drops malformed or structurally invalid realtime envelopes", () => {
    const send = vi.fn();
    const tenantId = "11111111-1111-4111-8111-111111111111";
    const registry = new Map([
      [tenantId, new Set([{ __branchId: null, send }])],
    ]);

    expect(() =>
      forwardTenantRealtimeMessage("not-json", registry),
    ).not.toThrow();
    expect(() =>
      forwardTenantRealtimeMessage(
        JSON.stringify({
          type: "order.updated",
          tenantId: "not-a-uuid",
          payload: {},
        }),
        registry,
      ),
    ).not.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
});
