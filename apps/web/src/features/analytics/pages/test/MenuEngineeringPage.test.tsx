import React from "react";
import {fireEvent,render,screen,waitFor} from "@testing-library/react";
import {beforeEach,describe,expect,it,vi} from "vitest";
const h=vi.hoisted(()=>({menuEngineering:vi.fn(),extract:vi.fn(()=>"boom")}));
vi.mock("@/shared/lib/api-client",()=>({apiClient:{},extractApiError:h.extract}));
vi.mock("@pos/api-client",()=>({createAnalyticsApi:()=>({menuEngineering:h.menuEngineering})}));
vi.mock("@pos/ui",()=>({Badge:({children}:any)=><span>{children}</span>,Button:({children,loading:_l,...p}:any)=><button {...p}>{children}</button>,Card:({children}:any)=><section>{children}</section>,Page:({children}:any)=><main>{children}</main>,PageHeader:({title,description,actions}:any)=><header><h1>{title}</h1><p>{description}</p>{actions}</header>,Spinner:()=> <span>spinner</span>}));
import {MenuEngineeringPage} from "../MenuEngineeringPage";
const rows:any[]=[
{menuItemId:"1",menuItemName:"Zulu",variantName:null,margin:20,marginPercent:10,salesVolume:5,quadrant:"STAR",recommendation:"Keep"},
{menuItemId:"2",menuItemName:"Alpha",variantName:"Large",margin:null,marginPercent:null,salesVolume:10,quadrant:"DOG",recommendation:"Drop"},
{menuItemId:"3",menuItemName:"Bravo",variantName:null,margin:15,marginPercent:null,salesVolume:7,quadrant:"PUZZLE",recommendation:"Test"},
{menuItemId:"4",menuItemName:"Charlie",variantName:null,margin:10,marginPercent:5,salesVolume:3,quadrant:"COST_MISSING",recommendation:"Cost"},
];
describe("MenuEngineeringPage",()=>{beforeEach(()=>{vi.clearAllMocks();h.menuEngineering.mockResolvedValue(rows)});it("covers loading,data,filters and sorts",async()=>{render(<MenuEngineeringPage/>);expect(screen.getByText("spinner")).toBeTruthy();await screen.findByText("Zulu");const selects=screen.getAllByRole("combobox");fireEvent.change(selects[0]!,{target:{value:"30"}});fireEvent.change(selects[1]!,{target:{value:"STAR"}});fireEvent.change(selects[2]!,{target:{value:"margin"}});fireEvent.click(screen.getByRole("button",{name:"Apply"}));await waitFor(()=>expect(h.menuEngineering).toHaveBeenLastCalledWith(30));fireEvent.change(selects[1]!,{target:{value:"ALL"}});fireEvent.change(selects[2]!,{target:{value:"name"}});expect(screen.getByText(/Cost not configured/)).toBeTruthy();});it("covers empty and error states",async()=>{h.menuEngineering.mockResolvedValueOnce([]);const {unmount}=render(<MenuEngineeringPage/>);await screen.findByText(/No menu items match/);unmount();h.menuEngineering.mockRejectedValueOnce(new Error("x"));render(<MenuEngineeringPage/>);await screen.findByText("Menu engineering unavailable");expect(screen.getByText("boom")).toBeTruthy();});});
