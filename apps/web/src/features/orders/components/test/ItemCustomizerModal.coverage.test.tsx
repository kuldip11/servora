import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({schema:vi.fn()}));
vi.mock("lucide-react",()=>({Minus:()=>null,Plus:()=>null,Check:()=>null}));
vi.mock("@/shared/utils/format",()=>({formatCurrency:(v:number)=>`₹${v}`}));
vi.mock("@pos/validation",()=>({itemCustomizationSchema:{safeParse:mocks.schema}}));
vi.mock("@pos/ui",()=>({Dialog:({open,title,children,footer}:any)=>open?<div role="dialog"><h2>{title}</h2>{children}{footer}</div>:null,Button:({children,...p}:any)=><button {...p}>{children}</button>,TextInput:({label,...p}:any)=><label>{label}<input aria-label={label} {...p}/></label>}));
import { ItemCustomizerModal } from "../ItemCustomizerModal";

const item:any={
 id:"i1",name:"Pizza",basePrice:"100",
 variants:[{id:"v1",name:"Small",price:"100",status:"ACTIVE"},{id:"v2",name:"Large",price:"140",status:"ACTIVE"},{id:"v3",name:"Sold",price:"160",status:"INACTIVE"}],
 modifierGroupLinks:[
  {group:{id:"g1",name:"Size Sauce",selectionType:"SINGLE",minSelections:1,maxSelections:1,options:[{id:"o1",name:"Red",additionalPrice:"10",isAvailable:true,maxQuantity:1},{id:"o2",name:"White",additionalPrice:"0",isAvailable:true,maxQuantity:1}]}},
  {group:{id:"g2",name:"Toppings",selectionType:"MULTIPLE",minSelections:0,maxSelections:1,options:[{id:"o3",name:"Olive",additionalPrice:"5",isAvailable:true,maxQuantity:3},{id:"o4",name:"Corn",additionalPrice:"4",isAvailable:true,maxQuantity:1},{id:"ox",name:"Hidden",additionalPrice:"2",isAvailable:false,maxQuantity:1}]}},
  {group:{id:"g3",name:"Dependent",selectionType:"MULTIPLE",minSelections:0,maxSelections:null,dependsOnOptionId:"o1",options:[{id:"o5",name:"Extra sauce",additionalPrice:"3",isAvailable:true,maxQuantity:2}]}}
 ],
 allergenLinks:[{allergenId:"a1",allergen:{name:"Gluten"}}]
};

describe("ItemCustomizerModal coverage",()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.schema.mockImplementation((input:any)=>({success:true,data:input}));});
 it("covers variants, required/dependent modifiers, quantities, course and confirm",()=>{
  const confirm=vi.fn(),close=vi.fn();render(<ItemCustomizerModal item={item} onConfirm={confirm} onClose={close} courseMode/>);
  expect((screen.getByRole("button",{name:/Add to Order/}) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button",{name:/Sold/}) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button",{name:/Large/}));
  fireEvent.change(screen.getByRole("combobox"),{target:{value:"3"}});
  fireEvent.click(screen.getByText("Red").closest("button")!); expect(screen.getByText("Dependent")).toBeTruthy();
  fireEvent.click(screen.getByText("Olive").closest("button")!); expect((screen.getByText("Corn").closest("button") as HTMLButtonElement).disabled).toBe(true);
  const oliveRow=screen.getByText("Olive").closest("div.w-full")!; const oliveButtons=oliveRow.querySelectorAll("button"); fireEvent.click(oliveButtons[2]!); fireEvent.click(oliveButtons[2]!); fireEvent.click(oliveButtons[0]!);
  const qty=screen.getByText("1",{selector:"span.w-8"}); const qtyBox=qty.parentElement!; fireEvent.click(qtyBox.querySelectorAll("button")[1]!); fireEvent.click(qtyBox.querySelectorAll("button")[0]!);
  fireEvent.change(screen.getByLabelText("Seat / diner (optional)"),{target:{value:"Seat 2"}}); fireEvent.change(screen.getByLabelText("Note for Chef"),{target:{value:"no onion"}});
  expect(screen.getByText(/Gluten/)).toBeTruthy(); fireEvent.click(screen.getByRole("button",{name:/Add to Order/}));
  expect(confirm).toHaveBeenCalledWith(expect.objectContaining({menuItemId:"i1",variantId:"v2",variantName:"Large",seatLabel:"Seat 2",chefNotes:"no onion",courseNumber:3})); expect(close).toHaveBeenCalled();
 });
 it("toggles single option, multiple option and enforces max selection",()=>{
  render(<ItemCustomizerModal item={item} onConfirm={vi.fn()} onClose={vi.fn()}/>); fireEvent.click(screen.getByText("White").closest("button")!); fireEvent.click(screen.getByText("White").closest("button")!); expect((screen.getByRole("button",{name:/Add to Order/}) as HTMLButtonElement).disabled).toBe(true); fireEvent.click(screen.getByText("Red").closest("button")!); fireEvent.click(screen.getByText("Olive").closest("button")!); fireEvent.click(screen.getByText("Olive").closest("button")!); expect((screen.getByText("Corn").closest("button") as HTMLButtonElement).disabled).toBe(false);
 });
 it("shows schema validation errors and restores existing cart defaults",()=>{
  const existing:any={menuItemId:"i1",menuItemName:"Pizza",basePrice:100,variantId:"v1",variantName:"Small",modifiers:[{optionId:"o1",groupId:"g1",groupName:"Size Sauce",name:"Red",price:10,quantity:1}],chefNotes:"old",seatLabel:"Seat 1",quantity:2,courseNumber:2,unitPrice:110};
  mocks.schema.mockReturnValueOnce({success:false,error:{issues:[{message:"Invalid customisation"}]}}); const confirm=vi.fn();render(<ItemCustomizerModal item={item} existingCartItem={existing} onConfirm={confirm} onClose={vi.fn()} courseMode/>); expect((screen.getByLabelText("Note for Chef") as HTMLInputElement).value).toBe("old"); expect((screen.getByLabelText("Seat / diner (optional)") as HTMLInputElement).value).toBe("Seat 1"); expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("2"); fireEvent.click(screen.getByRole("button",{name:/Update Item/})); expect(screen.getByText("Invalid customisation")).toBeTruthy(); expect(confirm).not.toHaveBeenCalled();
 });
 it("covers no-variant/no-modifier defaults",()=>{const plain={id:"p",name:"Plain",basePrice:"20",variants:[],modifierGroupLinks:[],allergenLinks:[]} as any;const confirm=vi.fn();render(<ItemCustomizerModal item={plain} onConfirm={confirm} onClose={vi.fn()}/>);fireEvent.click(screen.getByRole("button",{name:/Add to Order/}));expect(confirm).toHaveBeenCalledWith(expect.objectContaining({menuItemId:"p",unitPrice:20,modifiers:[]}));});
});
