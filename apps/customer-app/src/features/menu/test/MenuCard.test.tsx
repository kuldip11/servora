import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MenuCard } from "../MenuCard";
const base=(o:any={})=>({id:"i",name:"Dish",description:null,basePrice:"10",pricingMode:"STANDARD",weightUnit:null,imageUrl:null,images:[],foodType:"VEG",manualStockCount:null,modifierGroupLinks:[],variants:[],...o} as any);
describe("MenuCard",()=>{
 it("renders image, description, standard pricing and click",()=>{const fn=vi.fn(),item=base({imageUrl:"/x.jpg",description:"desc"});render(<MenuCard item={item} onSelect={fn}/>);expect(screen.getByRole("img").getAttribute("src")).toBe("/x.jpg");fireEvent.click(screen.getByRole("button"));expect(fn).toHaveBeenCalledWith(item);expect(screen.getByText("Ready to order")).toBeTruthy();});
 it("uses fallback image, open/weight pricing, customization and stock details",()=>{let {rerender}=render(<MenuCard item={base({images:[{url:"/fallback.jpg"}],pricingMode:"OPEN",modifierGroupLinks:[{}]})} onSelect={()=>{}}/>);expect(screen.getByText("Staff priced")).toBeTruthy();expect(screen.getByText("Customizable")).toBeTruthy();rerender(<MenuCard item={base({pricingMode:"WEIGHT_BASED",weightUnit:"KG",foodType:"NON_VEG",manualStockCount:5})} onSelect={()=>{}}/>);expect(screen.getByText(/\/kg/)).toBeTruthy();expect(screen.getByText("Only 5 left")).toBeTruthy();rerender(<MenuCard item={base({manualStockCount:6,variants:[{}]})} onSelect={()=>{}}/>);expect(screen.getByText("Customizable")).toBeTruthy();});
});
