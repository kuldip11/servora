import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@pos/ui", () => ({
  SearchInput: ({ value, onChange, onClear, ...props }: any) => <div><input value={value} onChange={onChange} {...props}/><button aria-label="clear-search" onClick={onClear}>clear</button></div>,
  Select: ({ label, options = [], ...props }: any) => <label>{label}<select aria-label={label || "order-type"} {...props}>{options.map((o:any)=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>,
}));
vi.mock("@/shared/utils/format", () => ({ formatCurrency: (v:number) => `₹${v.toFixed(2)}` }));

import { MenuPicker } from "./MenuPicker";

const item = (overrides:any={}) => ({ id:"i1", name:"Burger", basePrice:100, foodType:"NON_VEG", variants:[], modifierGroupLinks:[], ...overrides });
const baseProps = () => ({
  orderType:"DINE_IN", tableId:"", tablesEnabled:true,
  tables:[{id:"t1",name:"T1",status:"AVAILABLE"},{id:"t2",name:"T2",status:"OCCUPIED"}],
  categories:[{id:"c1",name:"Main",menuItems:[item(), item({id:"i2",name:"Salad",basePrice:80,foodType:"VEG"})]}] as any,
  filter:"ALL" as any,
  onOrderTypeChange:vi.fn(), availableOrderTypes:[{value:"DINE_IN",label:"Dine in"},{value:"TAKEAWAY",label:"Takeaway"}],
  onTableChange:vi.fn(), onFilterChange:vi.fn(), onItemClick:vi.fn(),
});

describe("MenuPicker coverage",()=>{
  it("covers order/table selectors, search, filtering, item selection and fixed/variant prices",()=>{
    const props=baseProps();
    props.categories=[{id:"c1",name:"Main",menuItems:[
      item({variants:[{price:120},{price:150}],modifierGroupLinks:[{id:"g1"}]}),
      item({id:"i2",name:"Tea",basePrice:50,foodType:"VEG",variants:[{price:60},{price:60}]})
    ]}] as any;
    render(<MenuPicker {...props}/>);
    fireEvent.change(screen.getByLabelText("order-type"),{target:{value:"TAKEAWAY"}});
    expect(props.onOrderTypeChange).toHaveBeenCalledWith("TAKEAWAY");
    fireEvent.change(screen.getByLabelText("Table (required)"),{target:{value:"t1"}});
    expect(props.onTableChange).toHaveBeenCalledWith("t1");
    expect(screen.queryByRole("option",{name:"T2"})).toBeNull();
    expect(screen.getByText("₹120.00 – ₹150.00")).toBeTruthy();
    expect(screen.getByText("₹60.00")).toBeTruthy();
    expect(screen.getAllByText("Options ▾").length).toBe(2);
    fireEvent.click(screen.getByRole("button",{name:/Burger/}));
    expect(props.onItemClick).toHaveBeenCalledWith(expect.objectContaining({id:"i1"}));
    fireEvent.change(screen.getByLabelText("Search menu items"),{target:{value:"  tea "}});
    expect(screen.queryByRole("button",{name:/Burger/})).toBeNull();
    expect(screen.getByRole("button",{name:/Tea/})).toBeTruthy();
    fireEvent.click(screen.getByLabelText("clear-search"));
    expect(screen.getByRole("button",{name:/Burger/})).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:"Veg"}));
    expect(props.onFilterChange).toHaveBeenCalledWith("VEG");
  });

  it("covers single/no order type labels, unavailable-table message and empty states",()=>{
    const props=baseProps();
    props.availableOrderTypes=[{value:"DINE_IN",label:"Dine only"}];
    props.tables=[{id:"t2",name:"T2",status:"OCCUPIED"}];
    props.categories=[] as any;
    props.emptyMessage="Nothing orderable";
    const {rerender}=render(<MenuPicker {...props}/>);
    expect(screen.getByText("Dine only")).toBeTruthy();
    expect(screen.getByText(/No available tables right now/)).toBeTruthy();
    expect(screen.getByText("Nothing orderable")).toBeTruthy();
    rerender(<MenuPicker {...props} availableOrderTypes={[]}/>);
    expect(screen.getByText("No order types enabled")).toBeTruthy();
  });

  it("covers food-type and search filtered-out categories plus non-dine-in/no-table paths",()=>{
    const props=baseProps();
    props.orderType="TAKEAWAY"; props.tablesEnabled=false; props.filter="VEG" as any;
    const {rerender}=render(<MenuPicker {...props}/>);
    expect(screen.queryByLabelText("Table (required)")).toBeNull();
    expect(screen.queryByRole("button",{name:/Burger/})).toBeNull();
    expect(screen.getByRole("button",{name:/Salad/})).toBeTruthy();
    rerender(<MenuPicker {...props} categories={undefined}/>);
    expect(screen.getByText("No menu items available for this order.")).toBeTruthy();
  });
});
