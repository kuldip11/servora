import { beforeEach, describe, expect, it, vi } from "vitest";

const h=vi.hoisted(()=>({me:vi.fn()}));
vi.mock("@/features/auth/services/auth.service", () => ({ authService: { me: h.me } }));

import { activateMembershipContext, clearPersistedContext, persistActiveContext, restoreActiveContext } from "@/shared/auth/active-context";
import { useAuthStore } from "@/store/auth";

const membership = (membershipId:string, franchiseId:string, branchIds:string[], tenantWide=true) => ({
  membershipId,
  tenant:{id:franchiseId,name:franchiseId},
  roles:[{id:"r1",name:"OWNER" as const,scope:tenantWide ? ("TENANT" as const) : ("BRANCH" as const)}],
  branches:branchIds.map((id)=>({id,name:id,address:"",isActive:true,tablesEnabled:true})),
});

describe("persisted active context",()=>{
  beforeEach(()=>{
    vi.clearAllMocks(); localStorage.clear(); useAuthStore.getState().logout(); useAuthStore.getState().setAccessToken("token");
    h.me.mockResolvedValue({id:"u1",email:"owner@example.com",roles:[]});
  });

  it("persists and clears context explicitly",()=>{
    persistActiveContext({membershipId:"m1",franchiseId:"f1",branchId:"b1"});
    expect(JSON.parse(localStorage.getItem("servora.active-context.v1")!)).toEqual({membershipId:"m1",franchiseId:"f1",branchId:"b1"});
    clearPersistedContext(); expect(localStorage.getItem("servora.active-context.v1")).toBeNull();
  });

  it("returns false when no memberships exist",async()=>{
    expect(await restoreActiveContext([])).toBe(false); expect(h.me).not.toHaveBeenCalled();
  });

  it("restores a still-authorized franchise and branch",async()=>{
    localStorage.setItem("servora.active-context.v1",JSON.stringify({membershipId:"m2",franchiseId:"f2",branchId:"b2"}));
    await restoreActiveContext([membership("m1","f1",["b1"]),membership("m2","f2",["b2"])] as any);
    expect(useAuthStore.getState()).toMatchObject({membershipId:"m2",franchiseId:"f2",branchId:"b2"});
  });

  it("falls back safely when saved franchise/branch is unauthorized or storage is malformed",async()=>{
    localStorage.setItem("servora.active-context.v1",JSON.stringify({membershipId:"removed",franchiseId:"removed",branchId:"removed"}));
    await restoreActiveContext([membership("m1","f1",["b1"],false)] as any);
    expect(useAuthStore.getState()).toMatchObject({membershipId:"m1",franchiseId:"f1",branchId:"b1"});

    localStorage.setItem("servora.active-context.v1","{not-json");
    await restoreActiveContext([membership("m2","f2",[],false)] as any);
    expect(useAuthStore.getState()).toMatchObject({membershipId:"m2",franchiseId:"f2",branchId:null});
  });

  it("defaults tenant-wide users to first branch and restores All Branches only tenant-wide",async()=>{
    await restoreActiveContext([membership("m1","f1",["b1","b2"],true)] as any);
    expect(useAuthStore.getState().branchId).toBe("b1");
    localStorage.setItem("servora.active-context.v1",JSON.stringify({membershipId:"m1",franchiseId:"f1",branchId:"all"}));
    await restoreActiveContext([membership("m1","f1",["b1"],true)] as any);
    expect(useAuthStore.getState().branchId).toBeNull();
    await restoreActiveContext([membership("m1","f1",["b1"],false)] as any);
    expect(useAuthStore.getState().branchId).toBe("b1");
  });

  it("includes organizationId when supplied and refreshes the user",async()=>{
    const m=membership("m1","f1",["b1"],true) as any;
    await activateMembershipContext(m,[m],"org1");
    expect(h.me).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({membershipId:"m1",franchiseId:"f1",branchId:"b1",organizationId:"org1",user:{id:"u1"}});
  });

  it("clears active identifiers and rethrows when user refresh fails",async()=>{
    const m=membership("m1","f1",["b1"],true) as any; const error=new Error("session expired"); h.me.mockRejectedValueOnce(error);
    await expect(activateMembershipContext(m,[m],null)).rejects.toBe(error);
    expect(useAuthStore.getState()).toMatchObject({membershipId:null,franchiseId:null,branchId:null});
  });
});
