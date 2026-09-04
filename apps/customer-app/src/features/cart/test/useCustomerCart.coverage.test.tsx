import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { useCustomerCart } from "../useCustomerCart";

const option=(id:string,maxQuantity=2)=>({id,name:id,priceDelta:"1",maxQuantity});
const group=(selectionType:"SINGLE"|"MULTIPLE"="MULTIPLE",maxSelections:number|null=2)=>({id:"g1",name:"G",selectionType,minSelections:0,maxSelections,options:[option("o1"),option("o2",1)]});
const item=(over:any={})=>({
 id:"i1",name:"Item",categoryId:"c",description:null,basePrice:"10",taxRate:"10",taxMode:"EXCLUSIVE",imageUrl:null,foodType:"VEG",spiceLevel:null,prepTimeMinutes:null,tagLinks:[],images:[],status:"ACTIVE",
 variants:[],modifierGroupLinks:[{group:group()}],...over
} as any);
const combo=(over:any={})=>({id:"c1",name:"Combo",description:null,pricePolicy:"FIXED",fixedPrice:"20",percentOff:null,slots:[{id:"s1",name:"S",minSelections:1,maxSelections:2,sortOrder:0,options:[{id:"co1",menuItemId:"i1",variantId:null,upcharge:"0"},{id:"co2",menuItemId:"i1",variantId:null,upcharge:"1"}]}],...over} as any);

const setup=(initialCart:any[]=[], menu=[item()], mode:"DINE_IN"|"TAKEAWAY"="DINE_IN")=>{
 const clearError=vi.fn();
 const hook=renderHook(()=>{const [cart,setCart]=useState<any[]>(initialCart); return {cart,...useCustomerCart({menu,cart,setCart,sessionMode:mode,clearError})};});
 return {...hook,clearError};
};

describe("useCustomerCart exhaustive behavior",()=>{
 it("opens/closes items, auto-selects only variant, and ignores missing cart line",()=>{
  const one=item({variants:[{id:"v1",name:"V",price:"12"}]}); const h=setup([], [one]);
  act(()=>h.result.current.openItem(one)); expect(h.result.current.selectedVariantId).toBe("v1");
  act(()=>h.result.current.openCartItem(99)); expect(h.result.current.editingCartIndex).toBeNull();
  act(()=>h.result.current.closeItem()); expect(h.result.current.selectedItem).toBeNull();
  expect(h.clearError).toHaveBeenCalled();
 });
 it("covers single/multiple modifier toggling, zone handling and limits",()=>{
  const multi=item(); const h=setup([], [multi]); act(()=>h.result.current.openItem(multi));
  act(()=>h.result.current.toggleOption("missing","missing")); expect(h.result.current.selectedOptions).toEqual([]);
  act(()=>h.result.current.toggleOption("o1","g1","LEFT")); expect(h.result.current.selectedOptions).toHaveLength(1);
  act(()=>h.result.current.toggleOption("o1","g1","LEFT")); expect(h.result.current.selectedOptions).toHaveLength(0);
  act(()=>h.result.current.toggleOption("o1","g1")); act(()=>h.result.current.toggleOption("o2","g1"));
  act(()=>h.result.current.toggleOption("o1","g1","RIGHT"));
  act(()=>h.result.current.changeOptionQuantity("other",1));
  act(()=>h.result.current.changeOptionQuantity("o1",1));
  act(()=>h.result.current.changeOptionQuantity("o1",-3));
  act(()=>h.result.current.changeOptionQuantity("o2",2));
  const single=item({modifierGroupLinks:[{group:group("SINGLE",1)}]}); const s=setup([], [single]); act(()=>s.result.current.openItem(single));
  act(()=>s.result.current.toggleOption("o1","g1")); act(()=>s.result.current.toggleOption("o2","g1")); expect(s.result.current.selectedOptions.map((x:any)=>x.optionId)).toEqual(["o2"]);
  const capped=item({modifierGroupLinks:[{group:group("MULTIPLE",1)}]}); const c=setup([], [capped]); act(()=>c.result.current.openItem(capped)); act(()=>c.result.current.toggleOption("o1","g1")); act(()=>c.result.current.toggleOption("o2","g1")); expect(c.result.current.selectedOptions).toHaveLength(1);
 });
 it("adds, merges, edits and removes regular lines",()=>{
  const i=item({modifierGroupLinks:[]}); const h=setup([], [i],"TAKEAWAY");
  act(()=>h.result.current.addSelectedItem());
  act(()=>h.result.current.openItem(i)); act(()=>h.result.current.setSelectedQuantity(2)); act(()=>h.result.current.addSelectedItem()); expect(h.result.current.cart[0].quantity).toBe(2);
  act(()=>h.result.current.openItem(i)); act(()=>h.result.current.addSelectedItem()); expect(h.result.current.cart[0].quantity).toBe(3);
  act(()=>h.result.current.openCartItem(0)); act(()=>h.result.current.setSelectedQuantity(5)); act(()=>h.result.current.addSelectedItem()); expect(h.result.current.cart[0].quantity).toBe(5);
  act(()=>h.result.current.changeQuantity(0,-1)); expect(h.result.current.cart[0].quantity).toBe(4);
  act(()=>h.result.current.changeQuantity(0,-10)); expect(h.result.current.cart).toEqual([]);
  act(()=>h.result.current.changeQuantity(5,1));
 });
 it("covers combo open/toggle/validation/merge/quantity/remove/clear",()=>{
  const i=item({modifierGroupLinks:[]}); const h=setup([{item:i,quantity:1,selectedOptions:[],fulfillmentType:"DINE_IN"}], [i]);
  act(()=>h.result.current.toggleComboOption("s","x")); act(()=>h.result.current.addSelectedCombo());
  const auto=combo({slots:[{id:"auto",name:"A",minSelections:1,maxSelections:1,sortOrder:0,options:[{id:"only",menuItemId:"i1",variantId:null,upcharge:"0"}]}]});
  act(()=>h.result.current.openCombo(auto)); expect(h.result.current.comboSelections[0].optionIds).toEqual(["only"]); act(()=>h.result.current.closeCombo());
  const c=combo(); act(()=>h.result.current.openCombo(c)); act(()=>h.result.current.toggleComboOption("missing","x"));
  act(()=>h.result.current.addSelectedCombo()); expect(h.result.current.comboCart).toHaveLength(0);
  act(()=>h.result.current.toggleComboOption("s1","co1")); act(()=>h.result.current.toggleComboOption("s1","co2")); act(()=>h.result.current.toggleComboOption("s1","co1"));
  act(()=>h.result.current.toggleComboOption("s1","co1")); act(()=>h.result.current.addSelectedCombo()); expect(h.result.current.comboCart).toHaveLength(1);
  act(()=>h.result.current.openCombo(auto)); act(()=>h.result.current.addSelectedCombo()); act(()=>h.result.current.openCombo(auto)); act(()=>h.result.current.addSelectedCombo()); expect(h.result.current.comboCart.some((line:any)=>line.quantity >= 2)).toBe(true);
  act(()=>h.result.current.changeComboQuantity(9,1)); act(()=>h.result.current.changeComboQuantity(0,-1)); while(h.result.current.comboCart.length){act(()=>h.result.current.changeComboQuantity(0,-99));} expect(h.result.current.comboCart).toEqual([]);
  act(()=>h.result.current.clearCart()); expect(h.result.current.cart).toEqual([]);
 });
});

describe("useCustomerCart remaining branches",()=>{
 it("preserves non-target lines while merging and changing quantities",()=>{
  const a=item({id:"a",name:"A",modifierGroupLinks:[]});
  const b=item({id:"b",name:"B",modifierGroupLinks:[]});
  const h=setup([
   {item:a,quantity:1,selectedOptions:[],fulfillmentType:"DINE_IN"},
   {item:b,quantity:4,selectedOptions:[],fulfillmentType:"DINE_IN"},
  ],[a,b]);
  act(()=>h.result.current.openItem(a)); act(()=>h.result.current.addSelectedItem());
  expect(h.result.current.cart.map((x:any)=>x.quantity)).toEqual([2,4]);
  act(()=>h.result.current.changeQuantity(0,1));
  expect(h.result.current.cart.map((x:any)=>x.quantity)).toEqual([3,4]);
 });
 it("replaces a max-one combo choice and increments an existing combo line",()=>{
  const i=item({modifierGroupLinks:[]});
  const c=combo({slots:[{id:"s",name:"S",minSelections:1,maxSelections:1,sortOrder:0,options:[{id:"a",menuItemId:"i1",variantId:null,upcharge:"0"},{id:"b",menuItemId:"i1",variantId:null,upcharge:"0"}]}]});
  const h=setup([], [i]);
  act(()=>h.result.current.openCombo(c));
  act(()=>h.result.current.toggleComboOption("s","a"));
  act(()=>h.result.current.toggleComboOption("s","b"));
  expect(h.result.current.comboSelections[0].optionIds).toEqual(["b"]);
  act(()=>h.result.current.addSelectedCombo());
  act(()=>h.result.current.openCombo(c)); act(()=>h.result.current.toggleComboOption("s","b")); act(()=>h.result.current.addSelectedCombo());
  expect(h.result.current.comboCart[0].quantity).toBe(2);
  act(()=>h.result.current.changeComboQuantity(0,1));
  expect(h.result.current.comboCart[0].quantity).toBe(3);
 });
});
