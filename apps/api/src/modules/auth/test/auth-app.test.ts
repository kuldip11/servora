import { describe, expect, it } from "vitest";
import {
  assertAppRoleAccess,
  assertMembershipAppAccess,
  assertTokenApp,
  hasAppRoleAccess,
  hasMembershipAppAccess,
  parseAuthApp,
} from "@/modules/auth/auth-app";

describe("auth application policy", () => {
  it("parses supported applications and rejects missing/unknown clients", () => {
    expect(parseAuthApp(" WEB ")).toBe("web");
    expect(parseAuthApp("kitchen")).toBe("kitchen");
    expect(parseAuthApp("WAITER")).toBe("waiter");
    expect(() => parseAuthApp(undefined)).toThrow("Application identity is missing or invalid");
    expect(() => parseAuthApp("customer")).toThrow("Application identity is missing or invalid");
  });

  it("checks system-role access for each app and assertion paths", () => {
    expect(hasAppRoleAccess("web", ["CHEF", "OWNER"])).toBe(true);
    expect(hasAppRoleAccess("web", ["CHEF"])).toBe(false);
    expect(hasAppRoleAccess("kitchen", ["CHEF"])).toBe(true);
    expect(hasAppRoleAccess("waiter", ["WAITER"])).toBe(true);
    expect(() => assertAppRoleAccess("web", ["OWNER"])).not.toThrow();
    expect(() => assertAppRoleAccess("web", ["CHEF"])).toThrow("Account does not have access to this application");
  });

  it("checks system and custom membership capability matrices", () => {
    expect(hasMembershipAppAccess("web", [{ name: "OWNER", isSystem: true }], [])).toBe(true);
    expect(hasMembershipAppAccess("waiter", [{ name: "WAITER", isSystem: false }], [])).toBe(false);
    expect(hasMembershipAppAccess("web", [{ name: "Custom", isSystem: false }], ["analytics:read"])).toBe(true);
    expect(hasMembershipAppAccess("web", [{ name: "Custom", isSystem: false }], [])).toBe(false);
    expect(hasMembershipAppAccess("kitchen", [{ name: "Line Cook", isSystem: false }], ["kitchen:update"])).toBe(false);
    expect(hasMembershipAppAccess("kitchen", [{ name: "Line Cook", isSystem: false }], ["kitchen:read"])).toBe(false);
    expect(hasMembershipAppAccess("kitchen", [{ name: "Line Cook", isSystem: false }], ["kitchen:read", "kitchen:update"])).toBe(true);
    expect(hasMembershipAppAccess("waiter", [{ name: "Floor Captain", isSystem: false }], ["menu:read", "orders:read", "orders:update_status"])).toBe(true);
    expect(hasMembershipAppAccess("waiter", [], ["menu:read", "orders:read", "orders:update_status"])).toBe(false);
    expect(() => assertMembershipAppAccess("waiter", [{ name: "Custom", isSystem: false }], ["menu:read", "orders:read", "orders:create"])).not.toThrow();
    expect(() => assertMembershipAppAccess("waiter", [{ name: "Custom", isSystem: false }], ["menu:read"])).toThrow("Account does not have access to this application");
  });

  it("validates token application identity", () => {
    expect(() => assertTokenApp("kitchen", "web")).toThrow("Session is not valid for this application");
    expect(() => assertTokenApp(undefined, "web")).toThrow("Session is not valid for this application");
    expect(() => assertTokenApp("web", "web")).not.toThrow();
  });
});
