import { describe, expect, it } from "vitest";
import { RESERVED_SYSTEM_ROLE_NAMES, SYSTEM_ROLE_PERMISSIONS, isReservedSystemRoleName } from "../constants/system-role-permissions";

describe("system role permissions coverage", () => {
  it("exposes permissions for every reserved role and normalizes role-name checks", () => {
    expect(Object.keys(SYSTEM_ROLE_PERMISSIONS)).toEqual([...RESERVED_SYSTEM_ROLE_NAMES]);
    for (const name of RESERVED_SYSTEM_ROLE_NAMES) expect(SYSTEM_ROLE_PERMISSIONS[name].length).toBeGreaterThan(0);
    expect(isReservedSystemRoleName(" owner ")).toBe(true);
    expect(isReservedSystemRoleName("Franchise_Admin")).toBe(true);
    expect(isReservedSystemRoleName("custom")).toBe(false);
  });
});
