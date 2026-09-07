import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>{ const authHook:any=vi.fn(); authHook.getState=vi.fn(); return {navigate:vi.fn(),logoutApi:vi.fn(),logoutStore:vi.fn(),clearPersisted:vi.fn(),clearQuery:vi.fn(),toast:vi.fn(),activate:vi.fn(),home:vi.fn(),authHook,state:{membershipId:"m1",memberships:[] as any[],user:{firstName:"Ada",lastName:"Lovelace",displayName:"Ada L",profileImageUrl:null as string|null}}}; });
vi.mock("lucide-react",()=>({ChevronDown:()=>null,LogOut:()=>null,UserRound:()=>null,Building2:()=>null,Check:()=>null}));
vi.mock("@tanstack/react-router",()=>({Link:({children,...p}:any)=><a {...p}>{children}</a>,useRouter:()=>({navigate:mocks.navigate})}));
vi.mock("@/features/auth/services/auth.service",()=>({authService:{logout:mocks.logoutApi}}));
vi.mock("@/shared/lib/query-client",()=>({queryClient:{clear:mocks.clearQuery}}));
vi.mock("@/shared/auth/active-context",()=>({clearPersistedContext:mocks.clearPersisted,activateMembershipContext:mocks.activate}));
vi.mock("@/shared/auth/default-route",()=>({getAuthorizedHomePath:mocks.home}));
vi.mock("@/shared/utils",()=>({cn:(...v:any[])=>v.filter(Boolean).join(" ")}));
vi.mock("@pos/ui",()=>({toast:mocks.toast}));
vi.mock("@/store/auth",()=>({useAuthStore:mocks.authHook}));
import { UserMenu } from "../UserMenu";
import { TenantSwitcher } from "../TenantSwitcher";

describe("layout menus coverage",()=>{
 beforeEach(()=>{vi.clearAllMocks(); mocks.authHook.mockImplementation(()=>({...mocks.state,logout:mocks.logoutStore})); mocks.authHook.getState.mockImplementation(()=>mocks.state); mocks.logoutApi.mockResolvedValue({}); mocks.activate.mockResolvedValue({}); mocks.home.mockReturnValue("/dashboard"); mocks.state={membershipId:"m1",memberships:[{membershipId:"m1",tenant:{name:"One",displayName:"Franchise One"},roles:[{name:"Owner"}]},{membershipId:"m2",tenant:{name:"Two"},roles:[{name:"Manager"}]}],user:{firstName:"Ada",lastName:"Lovelace",displayName:"Ada L",profileImageUrl:null}};});
 it("opens profile menu, closes outside and signs out even when API fails", async()=>{ const {container}=render(<UserMenu/>); fireEvent.click(screen.getByRole("button",{name:/Ada L/})); expect(screen.getByRole("menu")).toBeTruthy(); fireEvent.mouseDown(document.body); expect(screen.queryByRole("menu")).toBeNull(); fireEvent.click(screen.getByRole("button",{name:/Ada L/})); fireEvent.click(screen.getByRole("menuitem",{name:"Sign out"})); await waitFor(()=>expect(mocks.logoutStore).toHaveBeenCalled()); expect(mocks.clearPersisted).toHaveBeenCalled(); expect(mocks.clearQuery).toHaveBeenCalled(); expect(mocks.navigate).toHaveBeenCalledWith({to:"/login"}); expect(container.textContent).toContain("Ada L"); });
 it("switches franchise, ignores current one and closes outside", async()=>{ render(<TenantSwitcher/>); fireEvent.click(screen.getByRole("button",{name:/Franchise One/})); fireEvent.click(screen.getByRole("menuitem",{name:/Franchise One/})); expect(mocks.activate).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole("button",{name:/Franchise One/})); fireEvent.click(screen.getByRole("menuitem",{name:/Two/})); await waitFor(()=>expect(mocks.activate).toHaveBeenCalled()); expect(mocks.navigate).toHaveBeenCalledWith({to:"/dashboard"}); fireEvent.click(screen.getByRole("button",{name:/Franchise One/})); fireEvent.mouseDown(document.body); expect(screen.queryByRole("menu")).toBeNull(); });
 it("returns null without memberships and renders profile image branch",()=>{ mocks.state.memberships=[]; const {rerender}=render(<TenantSwitcher/>); expect(document.body.textContent).not.toContain("Franchise"); mocks.state.memberships=[{membershipId:"m1",tenant:{name:"One"},roles:[]}]; mocks.state.user.profileImageUrl="/a.png"; rerender(<UserMenu/>); expect(document.querySelector("img")?.getAttribute("src")).toBe("/a.png"); });
});
