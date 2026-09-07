import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const h=vi.hoisted(()=>({sessionState:{} as any, cartState:{} as any, checkout:{} as any, checkoutArgs:null as any}));
vi.mock("@pos/ui",()=>({Skeleton:(p:any)=><div data-testid="skeleton" {...p}/> }));
vi.mock("./features/session/useCustomerSession",()=>({useCustomerSession:()=>h.sessionState}));
vi.mock("./features/cart/useCustomerCart",()=>({useCustomerCart:()=>h.cartState}));
vi.mock("./features/order/useCustomerCheckout",()=>({useCustomerCheckout:(args:any)=>{h.checkoutArgs=args;return h.checkout;}}));
vi.mock("./features/session/StatusScreen",()=>({StatusScreen:(p:any)=><button onClick={p.onAction}>{p.title}:{p.message}</button>}));
vi.mock("./features/menu/CustomerMenuView",()=>({CustomerMenuView:(p:any)=><div data-testid="menu"><span>{p.visibleItems.map((x:any)=>x.name).join(",")}</span><button onClick={p.onCart}>cart</button><button onClick={p.onViewOrder}>order</button><button onClick={()=>p.setSearch("pizza")}>search</button><button onClick={()=>p.setCategory("Cat")}>category</button><button onClick={()=>p.setError(null)}>clear</button></div>}));
vi.mock("./features/menu/ComboCustomization",()=>({ComboCustomization:(p:any)=><button data-testid="combo" onClick={p.onAdd}>combo</button>}));
vi.mock("./features/menu/ItemCustomization",()=>({ItemCustomization:(p:any)=><button data-testid="item" onClick={p.onAdd}>{p.editing?"edit":"add"}</button>}));
vi.mock("./features/cart/CartView",()=>({CartView:(p:any)=><div data-testid="cart"><button onClick={p.onBack}>back</button><button onClick={()=>p.onPlace("DINE_IN")}>place</button></div>}));
vi.mock("./features/ordering/OrderStatus",()=>({OrderStatus:(p:any)=><div data-testid="order"><button onClick={p.onMenu}>menu</button><button onClick={()=>p.onRequest("WATER")}>help</button><button onClick={p.onPay}>pay</button><span>{p.table}</span></div>}));
import { CustomerApp } from "./CustomerApp";
const session={token:"t",mode:"DINE_IN",table:"1",area:"A",restaurant:"R",estimatedTime:"10m",expiresAt:""};
const defaults=()=>{
 h.sessionState={session,menu:[{id:"1",name:"Pizza",description:null},{id:"2",name:"Burger",description:"nice"}],combos:[],categories:[],cart:[],setCart:vi.fn(),placedOrder:null,setPlacedOrder:vi.fn(),loading:false,setLoading:vi.fn(),error:null,setError:vi.fn(),requestBusy:false,requestMessage:null,storageScope:"s",live:true,requestHelp:vi.fn(),retryBootstrap:vi.fn()};
 h.cartState={comboCart:[],selectedCombo:null,comboSelections:[],selectedItem:null,selectedVariantId:undefined,selectedOptions:[],selectedQuantity:1,editingCartIndex:null,menuById:new Map(),summary:{itemCount:0,subtotal:0,tax:0,total:0},setSelectedVariantId:vi.fn(),setSelectedQuantity:vi.fn(),openCombo:vi.fn(),openItem:vi.fn(),toggleComboOption:vi.fn(),closeCombo:vi.fn(),addSelectedCombo:vi.fn(),toggleOption:vi.fn(),changeOptionQuantity:vi.fn(),closeItem:vi.fn(),addSelectedItem:vi.fn(),clearCart:vi.fn(),changeQuantity:vi.fn(),changeComboQuantity:vi.fn(),openCartItem:vi.fn()};
 h.checkout={couponCode:"",loyaltyPhone:"",setCouponCode:vi.fn(),setLoyaltyPhone:vi.fn(),placeOrder:vi.fn(),retryTakeawayPayment:vi.fn()}; h.checkoutArgs=null;
};
beforeEach(defaults);
const actCheckout=()=>act(()=>h.checkoutArgs.onPlaced());
describe("CustomerApp",()=>{
 it("renders loading skeleton",()=>{h.sessionState.session=null;h.sessionState.loading=true;render(<CustomerApp/>);expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(5);});
 it("renders error retry and null state",()=>{h.sessionState.session=null;h.sessionState.error="bad";const {rerender}=render(<CustomerApp/>);fireEvent.click(screen.getByRole("button"));expect(h.sessionState.retryBootstrap).toHaveBeenCalled();h.sessionState.error=null;rerender(<CustomerApp/>);expect(document.body.textContent).toBe("");});
 it("covers menu search/cart/back/order/menu and checkout callbacks",()=>{render(<CustomerApp/>);expect(screen.getByTestId("menu")).toBeTruthy();fireEvent.click(screen.getByText("search"));expect(screen.getByTestId("menu").textContent).toContain("Pizza");fireEvent.click(screen.getByText("cart"));expect(screen.getByTestId("cart")).toBeTruthy();fireEvent.click(screen.getByText("place"));expect(h.checkout.placeOrder).toHaveBeenCalledWith("DINE_IN");fireEvent.click(screen.getByText("back"));expect(screen.getByTestId("menu")).toBeTruthy();h.sessionState.placedOrder={id:"order"};fireEvent.click(screen.getByText("order"));expect(screen.getByTestId("order")).toBeTruthy();fireEvent.click(screen.getByText("help"));expect(h.sessionState.requestHelp).toHaveBeenCalledWith("WATER");fireEvent.click(screen.getByText("pay"));expect(h.checkout.retryTakeawayPayment).toHaveBeenCalled();fireEvent.click(screen.getByText("menu"));expect(screen.getByTestId("menu")).toBeTruthy();});
 it("covers takeaway fallback and combo/item overlays including editing/variant branch",()=>{h.sessionState.session={...session,mode:"TAKEAWAY",table:null};h.cartState.selectedCombo={id:"c"};h.cartState.selectedItem={id:"i"};h.cartState.selectedVariantId="v";h.cartState.editingCartIndex=0;render(<CustomerApp/>);fireEvent.click(screen.getByTestId("combo"));expect(h.cartState.addSelectedCombo).toHaveBeenCalled();expect(screen.getByTestId("item").textContent).toBe("edit");fireEvent.click(screen.getByTestId("item"));expect(h.cartState.addSelectedItem).toHaveBeenCalled();fireEvent.click(screen.getByText("cart"));expect(screen.getByTestId("cart")).toBeTruthy();});
 it("covers checkout onPlaced transition and takeaway table fallback",()=>{
  h.sessionState.session={...session,table:null};
  h.sessionState.placedOrder={id:"order"};
  render(<CustomerApp/>);
  actCheckout();
  expect(screen.getByTestId("order")).toBeTruthy();
  expect(screen.getByTestId("order").textContent).toContain("Takeaway");
 });

});
it("covers selected item without a variant",()=>{h.cartState.selectedItem={id:"i"};h.cartState.selectedVariantId=undefined;render(<CustomerApp/>);expect(screen.getByTestId("item")).toBeTruthy();});
