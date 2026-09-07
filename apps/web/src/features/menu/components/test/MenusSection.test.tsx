import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({
 menus:[] as any[],resolved:[] as any[],branches:[] as any[],schedules:[] as any[],
 create:vi.fn(),publish:vi.fn(),del:vi.fn(),update:vi.fn(),addSchedule:vi.fn(),removeSchedule:vi.fn(),invalidate:vi.fn()
}));
vi.mock("lucide-react",()=>({Pencil:()=>null,Plus:()=>null,Trash2:()=>null}));
vi.mock("@/shared/lib/api-client",()=>({apiClient:{}}));
vi.mock("@/shared/lib/query-client",()=>({queryClient:{invalidateQueries:mocks.invalidate}}));
vi.mock("@/features/branches/hooks/useBranches",()=>({useBranches:()=>({data:mocks.branches})}));
vi.mock("@/features/menu/hooks/useMenus",()=>({
 useMenus:()=>({data:mocks.menus,isLoading:false}),useCreateMenu:()=>({mutate:mocks.create,isPending:false}),useSetMenuPublished:()=>({mutate:mocks.publish,isPending:false}),useDeleteMenu:()=>({mutate:mocks.del,isPending:false}),useUpdateMenu:()=>({mutate:mocks.update,isPending:false})
}));
vi.mock("@pos/api-client",()=>({createMenuApi:()=>({listActiveMenus:vi.fn(),listMenuSchedules:vi.fn(),createMenuSchedule:mocks.addSchedule,removeMenuSchedule:mocks.removeSchedule})}));
vi.mock("@tanstack/react-query",()=>({
 useQuery:({queryKey}:any)=>({data:queryKey?.[1]==="active"?mocks.resolved:mocks.schedules}),
 useMutation:(opts:any)=>({isPending:false,mutate:async(arg?:any)=>{const out=await opts.mutationFn(arg);opts.onSuccess?.(out);}})
}));
vi.mock("@pos/ui",()=>({
 Button:({children,loading:_l,...p}:any)=><button {...p}>{children}</button>,
 Input:({label,...p}:any)=><label>{label}<input aria-label={label} {...p}/></label>,
 Modal:({open,title,children}:any)=>open?<div role="dialog"><h3>{title}</h3>{children}</div>:null,
}));
import { MenusSection } from "../MenusSection";
const defaultMenu={id:"m0",name:"Default Menu",isDefault:true,status:"PUBLISHED"} as any;
const menu={id:"m1",name:"Weekend",isDefault:false,status:"DRAFT",availableChannels:null,availableFulfillmentTypes:null,availableBranchIds:null,effectiveFrom:null} as any;

describe("MenusSection coverage",()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.menus=[defaultMenu,menu,{...menu,id:"m2",name:"Live",status:"PUBLISHED"}];mocks.resolved=[{id:"org",name:"Org Menu",organizationId:"o1"}];mocks.branches=[{id:"b1",name:"Central"},{id:"b2",name:"North"}];mocks.schedules=[{id:"s1",scheduleType:"DAILY",startTime:"07:00:00",endTime:"11:00:00"}];mocks.addSchedule.mockResolvedValue({});mocks.removeSchedule.mockResolvedValue({});vi.stubGlobal("confirm",vi.fn(()=>true));});
 it("creates, publishes/drafts and deletes advanced menus",()=>{render(<MenusSection/>);expect(screen.getByText(/Organization-inherited menu active/)).toBeTruthy();fireEvent.submit(screen.getByRole("button",{name:/Create/}).closest("form")!);expect(mocks.create).not.toHaveBeenCalled();fireEvent.change(screen.getByLabelText("New menu"),{target:{value:"  Dinner  "}});fireEvent.submit(screen.getByRole("button",{name:/Create/}).closest("form")!);expect(mocks.create).toHaveBeenCalledWith({name:"Dinner"},expect.any(Object));fireEvent.click(screen.getByRole("button",{name:"Publish"}));expect(mocks.publish).toHaveBeenCalledWith({id:"m1",published:true});fireEvent.click(screen.getByRole("button",{name:"Move to draft"}));expect(mocks.publish).toHaveBeenCalledWith({id:"m2",published:false});fireEvent.click(screen.getByLabelText("Delete Weekend"));expect(mocks.del).toHaveBeenCalledWith("m1");});
 it("edits availability, toggles scopes and saves future-effective settings",()=>{render(<MenusSection/>);fireEvent.click(screen.getAllByRole("button",{name:/Availability/})[0]!);expect(screen.getByRole("heading",{name:"Availability — Weekend"})).toBeTruthy();const checks=screen.getAllByRole("checkbox");fireEvent.click(checks[0]!);fireEvent.click(screen.getByLabelText("North"));expect(screen.getByText(/Branch-specific items/)).toBeTruthy();const future=new Date(Date.now()+86400000).toISOString().slice(0,16);fireEvent.change(screen.getByLabelText("Effective from (optional)"),{target:{value:future}});expect(screen.getByText(/Pending change/)).toBeTruthy();fireEvent.submit(screen.getByRole("button",{name:"Save availability"}).closest("form")!);expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({id:"m1",input:expect.objectContaining({effectiveFrom:expect.any(String)})}),expect.any(Object));});
 it("covers daily, weekly, date-range, holiday schedule creation and removal",async()=>{render(<MenusSection/>);fireEvent.click(screen.getAllByRole("button",{name:/Availability/})[0]!);fireEvent.click(screen.getByRole("button",{name:"Remove"}));await waitFor(()=>expect(mocks.removeSchedule).toHaveBeenCalledWith("s1"));fireEvent.change(screen.getByLabelText("Menu start time"),{target:{value:"08:00"}});fireEvent.change(screen.getByLabelText("Menu end time"),{target:{value:"12:00"}});fireEvent.click(screen.getByRole("button",{name:"Add window"}));await waitFor(()=>expect(mocks.addSchedule).toHaveBeenCalled());fireEvent.change(screen.getByLabelText("Menu schedule type"),{target:{value:"WEEKLY"}});fireEvent.change(screen.getByLabelText("Day of week"),{target:{value:"5"}});fireEvent.click(screen.getByRole("button",{name:"Add window"}));fireEvent.change(screen.getByLabelText("Menu schedule type"),{target:{value:"SPECIFIC_DATE"}});fireEvent.change(screen.getByLabelText("Menu start date"),{target:{value:"2026-09-10"}});fireEvent.click(screen.getByRole("button",{name:"Add window"}));fireEvent.change(screen.getByLabelText("Menu schedule type"),{target:{value:"HOLIDAY"}});fireEvent.change(screen.getByLabelText("Holiday name"),{target:{value:"Diwali"}});fireEvent.click(screen.getByRole("button",{name:"Add window"}));await waitFor(()=>expect(mocks.addSchedule).toHaveBeenCalledTimes(4));expect(mocks.invalidate).toHaveBeenCalled();});
 it("covers loading/empty inherited branches and cancel",()=>{mocks.resolved=[];mocks.menus=[menu];mocks.branches=[];render(<MenusSection/>);expect(screen.queryByText(/Organization-inherited/)).toBeNull();fireEvent.click(screen.getByRole("button",{name:/Availability/}));fireEvent.click(screen.getByRole("button",{name:"Cancel"}));expect(screen.queryByRole("heading",{name:/Availability/})).toBeNull();});
});
