import { describe, expect, it } from "vitest";
import type { AuthContext } from "@/core/auth";
import {
  assertInventoryResourceBranch,
  requireInventoryTransactionPermission,
  resolveInventoryBranch,
} from "../inventory-authorization";
const auth = (o: Partial<AuthContext> = {}): AuthContext =>
  ({
    userId: "u",
    tenantId: "t",
    email: "u@x",
    branchId: "b1",
    tenantWide: false,
    authorizedBranchIds: ["b1"],
    permissions: ["inventory:update", "inventory:adjust", "inventory:waste"],
    roles: [],
    requestId: "r",
    ipAddress: "127.0.0.1",
    ...o,
  }) as AuthContext;
describe("inventory authorization remaining branches", () => {
  it("covers requested/active mismatch, empty authorized list, and resource guards", () => {
    expect(resolveInventoryBranch(auth(), null)).toBe("b1");
    expect(() =>
      resolveInventoryBranch(
        auth({ branchId: "b1", authorizedBranchIds: [] }),
        "b1",
      ),
    ).toThrow();
    expect(() =>
      resolveInventoryBranch(
        auth({ branchId: "b1", authorizedBranchIds: ["b2"] }),
        "b1",
      ),
    ).toThrow();
    expect(() => assertInventoryResourceBranch(auth(), null)).toThrow();
    expect(() =>
      assertInventoryResourceBranch(auth({ authorizedBranchIds: [] }), "b1"),
    ).toThrow();
    expect(() =>
      assertInventoryResourceBranch(
        auth({ branchId: "b2", authorizedBranchIds: ["b1"] }),
        "b1",
      ),
    ).toThrow();
    expect(() =>
      assertInventoryResourceBranch(
        auth({ branchId: null, authorizedBranchIds: ["b1"] }),
        "b1",
      ),
    ).not.toThrow();
  });
  it("covers denied transaction permission mappings", () => {
    expect(() =>
      requireInventoryTransactionPermission(auth({ permissions: [] }), "IN"),
    ).toThrow();
    expect(() =>
      requireInventoryTransactionPermission(auth({ permissions: [] }), "OUT"),
    ).toThrow();
    expect(() =>
      requireInventoryTransactionPermission(
        auth({ permissions: [] }),
        "ADJUSTMENT",
      ),
    ).toThrow();
    expect(() =>
      requireInventoryTransactionPermission(auth({ permissions: [] }), "WASTE"),
    ).toThrow();
  });
  it("covers missing authorized-branch collections", () => {
    const noList = auth();
    delete (noList as any).authorizedBranchIds;
    expect(() => resolveInventoryBranch(noList, "b1")).toThrow();
    const noList2 = auth();
    delete (noList2 as any).authorizedBranchIds;
    expect(() => assertInventoryResourceBranch(noList2, "b1")).toThrow();
  });
});
