import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  state: { isAuthenticated: false, franchiseId: null as string | null, user: { id: "u1" } as any },
  permission: vi.fn(), home: vi.fn(), redirect: vi.fn((value:any)=>({ redirect:value })), configs: [] as any[],
}));
vi.mock("@/store/auth", () => ({ useAuthStore: { getState: () => mocks.state } }));
vi.mock("@/shared/auth/permissions", () => ({ userHasPermission: mocks.permission }));
vi.mock("@/shared/auth/default-route", () => ({ getAuthorizedHomePath: mocks.home }));
vi.mock("@pos/ui", () => ({ Spinner: () => null }));
vi.mock("@tanstack/react-router", () => ({
  redirect: mocks.redirect,
  createRootRoute: (config:any) => ({ config, addChildren(children:any[]){ return { config, children }; } }),
  createRoute: (config:any) => { const route={ config, addChildren(children:any[]){ return { config, children }; } }; mocks.configs.push(route); return route; },
  createRouter: ({routeTree}:any) => ({ routeTree }),
}));

describe("web route guards", () => {
  beforeEach(() => { mocks.permission.mockReset(); mocks.home.mockReset().mockReturnValue("/dashboard"); mocks.redirect.mockClear(); });
  it("covers auth, protected, permission and legacy redirects", async () => {
    await import("../index");
    const config = (path:string) => mocks.configs.find((r:any)=>r.config.path===path || r.config.id===path)!.config;
    mocks.state = { isAuthenticated: true, franchiseId: "f1", user: { id:"u1" } }; expect(()=>config("auth").beforeLoad()).toThrow();
    mocks.state = { isAuthenticated: false, franchiseId: null, user: { id:"u1" } }; expect(()=>config("protected").beforeLoad({location:{pathname:"/orders"}})).toThrow();
    mocks.state = { isAuthenticated: true, franchiseId: null, user: { id:"u1" } }; expect(()=>config("protected").beforeLoad({location:{pathname:"/business"}})).not.toThrow(); expect(()=>config("protected").beforeLoad({location:{pathname:"/orders"}})).toThrow();
    mocks.state = { isAuthenticated: true, franchiseId: "f1", user: { id:"u1" } }; mocks.permission.mockReturnValue(false); expect(()=>config("/orders").beforeLoad()).toThrow(); mocks.permission.mockReturnValue(true); expect(()=>config("/orders").beforeLoad()).not.toThrow();
    expect(()=>config("/context").beforeLoad()).toThrow(); expect(()=>config("/branches").beforeLoad()).toThrow();
  });
  it("covers index route destinations", async () => {
    await import("../index"); const index=mocks.configs.find((r:any)=>r.config.path==="/")!.config;
    mocks.state={isAuthenticated:false,franchiseId:null,user:{id:"u1"}}; expect(()=>index.beforeLoad()).toThrow(); expect(mocks.redirect).toHaveBeenLastCalledWith({to:"/login"});
    mocks.state={isAuthenticated:true,franchiseId:null,user:{id:"u1"}}; expect(()=>index.beforeLoad()).toThrow(); expect(mocks.redirect).toHaveBeenLastCalledWith({to:"/business"});
    mocks.state={isAuthenticated:true,franchiseId:"f1",user:{id:"u1"}}; expect(()=>index.beforeLoad()).toThrow(); expect(mocks.redirect).toHaveBeenLastCalledWith({to:"/dashboard"});
  });
});
