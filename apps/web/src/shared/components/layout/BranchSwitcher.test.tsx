import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  setContext: vi.fn(), useAuthStore: vi.fn(), useBranches: vi.fn(), persist: vi.fn(), permission: vi.fn(),
}));
vi.mock("../../../store/auth", () => ({ useAuthStore: () => h.useAuthStore() }));
vi.mock("../../../features/branches/hooks/useBranches", () => ({ useBranches: (arg:any) => h.useBranches(arg) }));
vi.mock("../../../shared/auth/active-context", () => ({ persistActiveContext: h.persist }));
vi.mock("../../../shared/auth/permissions", () => ({ userHasPermission: (...args:any[]) => h.permission(...args) }));

import { BranchSwitcher } from "./BranchSwitcher";

const tenantMembership:any = {
  membershipId: "m1", tenant: { id: "t1", name: "Demo" }, roles: [{ scope: "TENANT" }], branches: [],
};
const branchMembership:any = {
  membershipId: "m1", tenant: { id: "t1", name: "Demo" }, roles: [{ scope: "BRANCH" }], branches: [
    { id: "b1", name: "Main", isActive: true, tablesEnabled: true },
    { id: "b2", name: "Second", isActive: true, tablesEnabled: false },
    { id: "b3", name: "Inactive", isActive: false, tablesEnabled: false },
  ],
};
const auth = (overrides:any={}) => ({ memberships:[tenantMembership], membershipId:"m1", branchId:null, user:{id:"u1"}, setContext:h.setContext, ...overrides });

beforeEach(() => {
  vi.clearAllMocks(); h.permission.mockReturnValue(true);
  h.useAuthStore.mockReturnValue(auth());
  h.useBranches.mockReturnValue({ data: [
    { id: "b1", name: "Main", isActive: true, tablesEnabled: true },
    { id: "b2", name: "Second", isActive: true, tablesEnabled: false },
    { id: "b3", name: "Inactive", isActive: false, tablesEnabled: false },
  ]});
});

describe("BranchSwitcher", () => {
  it("shows tenant-wide active branches and All Branches", () => {
    render(<BranchSwitcher />);
    expect(h.useBranches).toHaveBeenCalledWith({enabled:true});
    fireEvent.click(screen.getByRole("button", { name: /branch/i }));
    expect(screen.getByRole("menuitem", { name: /Main/i })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /Second/i })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: /Inactive/i })).toBeNull();
    expect(screen.getByRole("menuitem", { name: /All Branches/i })).toBeTruthy();
  });

  it("changes active branch and persists branch context", async () => {
    render(<BranchSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /branch/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Second/i }));
    expect(h.setContext).toHaveBeenCalledWith({membershipId:"m1",franchiseId:"t1",branchId:"b2"});
    expect(h.persist).toHaveBeenCalledWith({membershipId:"m1",franchiseId:"t1",branchId:"b2"});
    await waitFor(()=>expect(screen.queryByRole("menu")).toBeNull());
  });

  it("switches from a branch to tenant-wide and maps all to null in runtime context", async () => {
    h.useAuthStore.mockReturnValue(auth({branchId:"b1"}));
    render(<BranchSwitcher />);
    expect(screen.getByText("Main")).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:/branch/i}));
    expect(screen.getByText("Tables enabled")).toBeTruthy();
    expect(screen.getByText("Tables disabled")).toBeTruthy();
    fireEvent.click(screen.getByRole("menuitem",{name:/All Branches/i}));
    expect(h.setContext).toHaveBeenCalledWith({membershipId:"m1",franchiseId:"t1",branchId:null});
    expect(h.persist).toHaveBeenCalledWith({membershipId:"m1",franchiseId:"t1",branchId:"all"});
    await waitFor(()=>expect(screen.queryByRole("menu")).toBeNull());
  });

  it("closes without mutating when selecting the already-selected option", async () => {
    h.useAuthStore.mockReturnValue(auth({branchId:"all"}));
    render(<BranchSwitcher />);
    fireEvent.click(screen.getByRole("button",{name:/branch/i}));
    fireEvent.click(screen.getByRole("menuitem",{name:/All Branches/i}));
    expect(h.setContext).not.toHaveBeenCalled(); expect(h.persist).not.toHaveBeenCalled();
    await waitFor(()=>expect(screen.queryByRole("menu")).toBeNull());
  });

  it("uses membership branches for branch-scoped users and shows empty state", () => {
    h.useAuthStore.mockReturnValue(auth({memberships:[branchMembership],branchId:"missing"}));
    h.permission.mockReturnValue(false);
    const first=render(<BranchSwitcher />);
    expect(h.useBranches).toHaveBeenCalledWith({enabled:false});
    expect(screen.getByText("Main")).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:/branch/i}));
    expect(screen.queryByRole("menuitem",{name:/All Branches/i})).toBeNull();
    expect(screen.getByRole("menuitem",{name:/Main/i})).toBeTruthy();
    first.unmount();

    h.useAuthStore.mockReturnValue(auth({memberships:[{...branchMembership,branches:[]}],branchId:null}));
    const second=render(<BranchSwitcher />);
    expect(second.getByText("No branches")).toBeTruthy();
    fireEvent.click(second.getByRole("button",{name:/branch/i}));
    expect(second.getByText("No active branches yet.")).toBeTruthy();
  });

  it("falls back to membership branches when tenant query has no data",()=>{
    h.useBranches.mockReturnValue({data:undefined});
    h.useAuthStore.mockReturnValue(auth({memberships:[{...tenantMembership,branches:[{id:"b9",name:"Fallback",isActive:true,tablesEnabled:false}]}]}));
    render(<BranchSwitcher/>); fireEvent.click(screen.getByRole("button",{name:/branch/i}));
    expect(screen.getByRole("menuitem",{name:/Fallback/i})).toBeTruthy();
  });

  it("falls back to an empty branch list when tenant and membership branch data are absent",()=>{
    h.useBranches.mockReturnValue({data:undefined});
    h.useAuthStore.mockReturnValue(auth({memberships:[{...tenantMembership,branches:undefined}]}));
    render(<BranchSwitcher/>);
    expect(screen.getByText("All Branches")).toBeTruthy();
  });

  it("supports backdrop/outside close and toggle close",()=>{
    render(<div><BranchSwitcher/><button aria-label="outside">outside</button></div>);
    const trigger=screen.getByRole("button",{name:/branch/i});
    fireEvent.click(trigger); expect(screen.getByRole("menu")).toBeTruthy();
    fireEvent.mouseDown(screen.getByLabelText("outside")); expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(trigger); fireEvent.click(screen.getByLabelText("Close branch menu")); expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(trigger); fireEvent.click(trigger); expect(screen.queryByRole("menu")).toBeNull();
  });

  it("returns nothing when current membership is unavailable",()=>{
    h.useAuthStore.mockReturnValue(auth({membershipId:"missing"}));
    const {container}=render(<BranchSwitcher/>); expect(container.innerHTML).toBe("");
  });
});
