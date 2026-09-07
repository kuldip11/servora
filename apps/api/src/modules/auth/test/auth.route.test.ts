vi.mock("elysia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("elysia")>();
  type Handler = ((ctx: any) => unknown) | undefined;
  class FakeElysia {
    routes: Array<{ method: string; path: string; handler: Handler }> = [];
    constructor(_options: unknown = {}) {}
    use(_plugin: unknown) { return this; }
    get(path: string, handler?: (ctx: any) => unknown) { this.routes.push({ method: "GET", path, handler }); return this; }
    post(path: string, handler?: (ctx: any) => unknown) { this.routes.push({ method: "POST", path, handler }); return this; }
    patch(path: string, handler?: (ctx: any) => unknown) { this.routes.push({ method: "PATCH", path, handler }); return this; }
    delete(path: string, handler?: (ctx: any) => unknown) { this.routes.push({ method: "DELETE", path, handler }); return this; }
  }
  return { ...actual, Elysia: FakeElysia };
});
import { beforeEach, describe, expect, it, vi } from "vitest";
const ctl = vi.hoisted(() => ({ signup: vi.fn(), me: vi.fn(), updateProfile: vi.fn(), changePassword: vi.fn(), memberships: vi.fn(), sessions: vi.fn(), revokeSession: vi.fn() }));
const svc = vi.hoisted(() => ({ login: vi.fn(), refresh: vi.fn(), logout: vi.fn() }));
const helpers = vi.hoisted(() => ({ trusted: vi.fn(), parse: vi.fn((value: string) => value), read: vi.fn(), serialize: vi.fn(() => "cookie"), clear: vi.fn(() => "clear") }));
vi.mock("../auth.controller", () => ({ authController: ctl }));
vi.mock("../../../core/auth", () => ({ requireAuthPlugin: () => ({}) }));
vi.mock("../auth.service", () => ({ authService: svc }));
vi.mock("../auth-origin", () => ({ assertTrustedAuthOrigin: helpers.trusted }));
vi.mock("../auth-app", () => ({ AUTH_APP_HEADER: "x-servora-app", parseAuthApp: helpers.parse }));
vi.mock("../auth-cookie", () => ({ readRefreshCookie: helpers.read, serializeRefreshCookie: helpers.serialize, clearRefreshCookie: helpers.clear }));
import { authRouter, authMeRouter } from "@/modules/auth/auth.route";

beforeEach(() => { vi.clearAllMocks(); helpers.parse.mockImplementation((v: string) => v); helpers.serialize.mockReturnValue("cookie"); helpers.clear.mockReturnValue("clear"); });
const route = (router: any, method: string, path: string) => router.routes.find((r: any) => r.method === method && r.path === path)!;

describe("auth routes", () => {
  it("executes public signup and login", async () => {
    ctl.signup.mockResolvedValue({ success: true }); svc.login.mockResolvedValue({ refreshToken: "rt", accessToken: "at", sessionId: "s1" });
    await expect(route(authRouter,"POST","/api/auth/signup").handler({ body: { email: "x" } })).resolves.toEqual({ success: true });
    const set = { headers: {} as Record<string,string> };
    const result: any = await route(authRouter,"POST","/api/auth/login").handler({ body: { email: "x" }, headers: { origin: "o", "x-servora-app": "web" }, set });
    expect(helpers.trusted).toHaveBeenCalledWith("o"); expect(svc.login).toHaveBeenCalledWith({ email: "x" }, "web"); expect(set.headers["set-cookie"]).toBe("cookie"); expect(result.data).toMatchObject({ accessToken: "at", sessionId: "s1" });
  });

  it("executes refresh success and missing-cookie failure", async () => {
    helpers.read.mockReturnValueOnce("old"); svc.refresh.mockResolvedValueOnce({ refreshToken: "next", accessToken: "at" });
    const set = { headers: {} as Record<string,string> };
    await expect(route(authRouter,"POST","/api/auth/refresh").handler({ headers: { origin: "o", "x-servora-app": "web", cookie: "c" }, set })).resolves.toMatchObject({ data: { accessToken: "at" } });
    expect(svc.refresh).toHaveBeenCalledWith("old","web"); expect(set.headers["set-cookie"]).toBe("cookie");
    helpers.read.mockReturnValueOnce(null);
    await expect(route(authRouter,"POST","/api/auth/refresh").handler({ headers: { origin: "o", "x-servora-app": "web" }, set: { headers: {} } })).rejects.toThrow();
  });

  it("executes logout with and without refresh token", async () => {
    helpers.read.mockReturnValueOnce("old"); svc.logout.mockResolvedValue(undefined); const set = { headers: {} as Record<string,string> };
    await expect(route(authRouter,"POST","/api/auth/logout").handler({ headers: { origin: "o", "x-servora-app": "web", cookie: "c" }, set })).resolves.toMatchObject({ data: { loggedOut: true } });
    expect(svc.logout).toHaveBeenCalledWith("old"); expect(set.headers["set-cookie"]).toBe("clear");
    helpers.read.mockReturnValueOnce(null); await route(authRouter,"POST","/api/auth/logout").handler({ headers: { origin: "o", "x-servora-app": "web" }, set: { headers: {} } }); expect(svc.logout).toHaveBeenCalledTimes(1);
  });

  it("executes every protected route", async () => {
    const auth = { userId: "u1" }; ctl.me.mockResolvedValue("me"); ctl.updateProfile.mockResolvedValue("profile"); ctl.changePassword.mockResolvedValue("pw"); ctl.memberships.mockResolvedValue("memberships"); ctl.sessions.mockResolvedValue("sessions"); ctl.revokeSession.mockResolvedValue("revoked");
    expect(await route(authMeRouter,"GET","/api/auth/me").handler({ auth })).toBe("me");
    expect(await route(authMeRouter,"PATCH","/api/auth/me").handler({ auth, body: { firstName: "A" } })).toBe("profile");
    expect(await route(authMeRouter,"POST","/api/auth/me/change-password").handler({ auth, body: { currentPassword: "a", newPassword: "b" } })).toBe("pw");
    expect(await route(authMeRouter,"GET","/api/auth/memberships").handler({ auth })).toBe("memberships");
    expect(await route(authMeRouter,"GET","/api/auth/sessions").handler({ auth })).toBe("sessions");
    expect(await route(authMeRouter,"DELETE","/api/auth/sessions/:id").handler({ auth, params: { id: "s1" } })).toBe("revoked"); expect(ctl.revokeSession).toHaveBeenCalledWith(auth,"s1");
  });
});
