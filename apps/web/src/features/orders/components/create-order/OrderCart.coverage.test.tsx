import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@pos/ui",()=>({
  Button:({children,loading:_loading,...props}:any)=><button {...props}>{children}</button>,
  TextArea:(props:any)=><textarea {...props}/>,
}));
vi.mock("@/shared/utils/format",()=>({formatCurrency:(v:number)=>`₹${v.toFixed(2)}`}));
vi.mock("@/features/orders/utils/cartTypes",async(importOriginal)=>{
  const actual=await importOriginal<any>();
  return {...actual,cartItemKey:(item:any)=>`key-${item.menuItemId}-${item.variantId??"base"}`};
});

import { OrderCart } from "./OrderCart";

const makeItem=(overrides:any={})=>({menuItemId:"i1",menuItemName:"Burger",variantId:null,variantName:null,quantity:2,unitPrice:100,modifiers:[],courseNumber:null,chefNotes:null,...overrides});
const props=()=>({items:[] as any[],notes:"",total:0,pending:false,canSubmit:false,validationError:undefined as string|undefined,courseMode:false,onQty:vi.fn(),onEdit:vi.fn(),onCourse:vi.fn(),onNotes:vi.fn(),onSubmit:vi.fn()});

describe("OrderCart coverage",()=>{
  it("covers empty cart, notes, validation, disabled submit and submit callback",()=>{
    const p=props(); p.validationError="Choose a table";
    render(<OrderCart {...p}/>);
    expect(screen.getByText("Click menu items to add")).toBeTruthy();
    expect(screen.getByText("Choose a table")).toBeTruthy();
    const submit=screen.getByRole("button",{name:"Place Order"});
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText("Order notes..."),{target:{value:"No onions"}});
    expect(p.onNotes).toHaveBeenCalledWith("No onions");
  });

  it("covers populated cart details, modifiers, course, edit, qty and removal",()=>{
    const p=props();
    const first=makeItem({variantId:"v1",variantName:"Large",modifiers:[{optionId:"o1",name:"Cheese",quantity:2},{optionId:"o2",name:"Sauce",quantity:1}],courseNumber:3,chefNotes:"Extra hot"});
    const second=makeItem({menuItemId:"i2",menuItemName:"Tea",quantity:1,unitPrice:50});
    p.items=[first,second]; p.total=250; p.canSubmit=true; p.courseMode=true;
    render(<OrderCart {...p}/>);
    expect(screen.getByText("Order Items (2)")).toBeTruthy();
    expect(screen.getByText("Large")).toBeTruthy();
    expect(screen.getByText("+ Cheese ×2")).toBeTruthy();
    expect(screen.getByText("+ Sauce")).toBeTruthy();
    expect(screen.getByText("📝 Extra hot")).toBeTruthy();
    expect(screen.getByText("₹200.00")).toBeTruthy();
    expect(screen.getByText("₹250.00")).toBeTruthy();
    fireEvent.change(screen.getAllByRole("combobox")[0],{target:{value:"4"}});
    expect(p.onCourse).toHaveBeenCalledWith("key-i1-v1",4);
    fireEvent.click(screen.getByLabelText("Edit Burger"));
    expect(p.onEdit).toHaveBeenCalledWith(first);
    fireEvent.click(screen.getByLabelText("Decrease Burger quantity"));
    fireEvent.click(screen.getByLabelText("Increase Burger quantity"));
    fireEvent.click(screen.getByLabelText("Remove Burger"));
    expect(p.onQty).toHaveBeenCalledWith("key-i1-v1",-1);
    expect(p.onQty).toHaveBeenCalledWith("key-i1-v1",1);
    expect(p.onQty).toHaveBeenCalledWith("key-i1-v1",-2);
    fireEvent.click(screen.getByRole("button",{name:"Place Order"}));
    expect(p.onSubmit).toHaveBeenCalled();
  });

  it("covers non-course item path and default course value",()=>{
    const p=props(); p.items=[makeItem({quantity:1})]; p.canSubmit=true; p.courseMode=false;
    const {rerender}=render(<OrderCart {...p}/>);
    expect(screen.queryByText("Course")).toBeNull();
    p.courseMode=true; rerender(<OrderCart {...p}/>);
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("1");
  });
});
