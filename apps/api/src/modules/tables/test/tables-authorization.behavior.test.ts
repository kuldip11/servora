import { describe, expect, it } from "vitest";
import type { AuthContext } from "@/core/auth";
import {
  requireTablesPermission,
  resolveTableBranch,
  assertTableResourceAccess,
  assertTableListScope,
} from "../tables-authorization";
const auth = (
  o: Omit<Partial<AuthContext>, "authorizedBranchIds"> & {
    authorizedBranchIds?: string[] | undefined;
  } = {},
): AuthContext =>
  ({
    userId: "u1",
    tenantId: "t1",
    email: "u@x",
    branchId: "b1",
    tenantWide: false,
    authorizedBranchIds: ["b1"],
    permissions: ["tables:read"],
    roles: [],
    requestId: "r",
    ipAddress: "127.0.0.1",
    ...o,
  }) as AuthContext;
describe("tables authorization comprehensive coverage", () => {
  it("checks permissions", () => {
    expect(() => requireTablesPermission(auth(), "tables:read")).not.toThrow();
    expect(() =>
      requireTablesPermission(auth({ permissions: [] }), "tables:read"),
    ).toThrow();
  });
  it("resolves branches for tenant-wide and scoped users", () => {
    expect(resolveTableBranch(auth({ tenantWide: true }), "b2")).toBe("b2");
    expect(resolveTableBranch(auth(), undefined)).toBe("b1");
    expect(
      resolveTableBranch(auth({ branchId: null, tenantWide: true }), "b2"),
    ).toBe("b2");
    expect(() =>
      resolveTableBranch(
        auth({ branchId: null, tenantWide: false, authorizedBranchIds: [] }),
        undefined,
      ),
    ).toThrow();
    expect(() => resolveTableBranch(auth(), "b2")).toThrow();
    expect(() =>
      resolveTableBranch(auth({ authorizedBranchIds: undefined }), "b1"),
    ).toThrow();
  });
  it("asserts resource access branches", () => {
    expect(() =>
      assertTableResourceAccess(auth({ tenantWide: true }), "b2"),
    ).not.toThrow();
    expect(() => assertTableResourceAccess(auth(), "b1")).not.toThrow();
    expect(() => assertTableResourceAccess(auth(), null)).toThrow();
    expect(() =>
      assertTableResourceAccess(auth({ authorizedBranchIds: undefined }), "b1"),
    ).toThrow();
    expect(() =>
      assertTableResourceAccess(
        auth({ branchId: "b1", authorizedBranchIds: ["b2"] }),
        "b2",
      ),
    ).toThrow();
  });
  it("asserts list scope", () => {
    expect(() => assertTableListScope(auth())).not.toThrow();
    expect(() =>
      assertTableListScope(auth({ branchId: null, tenantWide: true })),
    ).not.toThrow();
    expect(() =>
      assertTableListScope(auth({ branchId: null, tenantWide: false })),
    ).toThrow();
  });
});
