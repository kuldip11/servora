import { describe, expect, it } from "vitest";
import type { User } from "@pos/types";
import { getAuthorizedHomePath } from "../default-route";

const userWith = (permissions: string[], roleNames: string[] = []): User =>
  ({
    roles: [
      ...roleNames.map((name) => ({ name, permissions: [] })),
      { name: "CUSTOM", permissions: permissions.map((key) => ({ key })) },
    ],
  }) as unknown as User;

describe("getAuthorizedHomePath", () => {
  it.each([
    ["CASHIER", "billing:read", "/billing"],
    ["INVENTORY_MANAGER", "inventory:read", "/inventory"],
    ["RECEPTIONIST", "tables:read", "/tables"],
  ])("honors %s role-specific landing pages", (role, permission, expected) => {
    expect(getAuthorizedHomePath(userWith([permission], [role]))).toBe(
      expected,
    );
  });

  it.each([
    ["analytics:read", "/dashboard"],
    ["orders:read", "/orders"],
    ["menu:read", "/menu"],
    ["tables:read", "/tables"],
    ["inventory:read", "/inventory"],
    ["billing:read", "/billing"],
    ["staff:read", "/staff"],
    ["branch:read", "/branches"],
    ["audit:read", "/audit"],
  ])("routes %s permission to %s", (permission, expected) => {
    expect(getAuthorizedHomePath(userWith([permission]))).toBe(expected);
  });

  it("falls back to settings for signed-out or permissionless users", () => {
    expect(getAuthorizedHomePath(null)).toBe("/settings");
    expect(getAuthorizedHomePath(userWith([]))).toBe("/settings");
  });

  it("uses permission priority when a user has access to multiple modules", () => {
    expect(
      getAuthorizedHomePath(
        userWith(["orders:read", "analytics:read", "audit:read"]),
      ),
    ).toBe("/dashboard");
  });
});
