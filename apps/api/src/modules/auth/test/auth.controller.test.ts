import { beforeEach, describe, expect, it, vi } from "vitest";
const svc = vi.hoisted(() => ({ signup: vi.fn(), memberships: vi.fn(), sessions: vi.fn(), revokeSession: vi.fn(), updateProfile: vi.fn(), changePassword: vi.fn(), me: vi.fn() }));
vi.mock("../auth.service", () => ({ authService: svc }));
import { authController } from "@/modules/auth/auth.controller";
const auth: any = { userId: "u1", tenantId: "t1", membershipId: "m1", branchId: "b1", email: "u@example.com", app: "kitchen", roles: [], permissions: ["x"] };
const baseUser = { id: "u1", firstName: "A", lastName: "B", displayName: null, email: "u@example.com", phone: null, profileImageUrl: null, status: "ACTIVE", globalUserRoles: [{ roleId: "r1", role: { name: "OWNER", rolePermissions: [{ permission: { key: "p" } }] } }] };
beforeEach(() => {
  vi.clearAllMocks();
});
describe("auth controller", () => {
  it("delegates signup, memberships, sessions and revoke", async () => {
    svc.signup.mockResolvedValue({ user: { id: "u1" } });
    svc.memberships.mockResolvedValue([{ id: "m1" }]);
    svc.sessions.mockResolvedValue([{ id: "s1" }]);
    svc.revokeSession.mockResolvedValue({ revoked: true });
    await expect(authController.signup({} as any)).resolves.toEqual({ success: true, data: { user: { id: "u1" } } });
    await expect(authController.memberships(auth)).resolves.toEqual({ success: true, data: [{ id: "m1" }] });
    expect(svc.memberships).toHaveBeenCalledWith("u1", "kitchen");
    await authController.memberships({ ...auth, app: undefined });
    expect(svc.memberships).toHaveBeenLastCalledWith("u1", "web");
    await expect(authController.sessions(auth)).resolves.toEqual({ success: true, data: [{ id: "s1" }] });
    await expect(authController.revokeSession(auth, "s1")).resolves.toEqual({ success: true, data: { revoked: true } });
  });

  it("updates profile and changes password", async () => {
    svc.updateProfile.mockResolvedValue(baseUser); svc.changePassword.mockResolvedValue(undefined); svc.me.mockResolvedValue({ user: baseUser, membership: undefined });
    const updated = await authController.updateProfile(auth, { firstName: "N" });
    expect(svc.updateProfile).toHaveBeenCalledWith("u1", { firstName: "N" });
    expect(updated.data.roles[0]?.name).toBe("OWNER");
    await expect(authController.changePassword(auth, { currentPassword: "a", newPassword: "b" })).resolves.toEqual({ success: true, data: { changed: true } });
  });

  it("builds membership roles and global roles", async () => {
    svc.me.mockResolvedValueOnce({ user: baseUser, membership: { roles: [{ roleId: "r2", role: { name: "MANAGER", rolePermissions: [{ permission: { key: "q" } }] } }] } });
    let result: any = await authController.me(auth);
    expect(result.data.roles).toEqual([expect.objectContaining({ id: "r2", name: "MANAGER" })]);
    svc.me.mockResolvedValueOnce({ user: baseUser, membership: undefined });
    result = await authController.me(auth);
    expect(result.data.roles).toEqual([expect.objectContaining({ id: "r1", name: "OWNER" })]);
    expect(result.data).toMatchObject({ tenantId: "t1", membershipId: "m1", branchId: "b1", permissions: ["x"] });
  });
});
