import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const { api, clearPersistedCart } = vi.hoisted(()=>({api:{createCustomerOrder:vi.fn(),initiateTakeawayPayment:vi.fn(),verifyTakeawayPayment:vi.fn()},clearPersistedCart:vi.fn()}));
vi.mock("@/api",()=>api); vi.mock("@/features/cart/persistence",()=>({clearPersistedCart}));
import { useCustomerCheckout } from "../useCustomerCheckout";
const session=(mode:"DINE_IN"|"TAKEAWAY"="DINE_IN")=>({token:"tok",mode,table:null,area:"",restaurant:"R",estimatedTime:"",expiresAt:""} as any);
const order=(payments:any[]=[])=>({id:"order123456",payments,...({} as any)});
const base=(over:any={})=>({session:session(),cart:[{item:{id:"i"},quantity:1,selectedOptions:[],fulfillmentType:"DINE_IN"}],comboCart:[],storageScope:"scope",loading:false,setLoading:vi.fn(),setError:vi.fn(),placedOrder:null,setPlacedOrder:vi.fn(),clearCart:vi.fn(),onPlaced:vi.fn(),...over});

beforeEach(()=>{vi.clearAllMocks(); delete (window as any).Razorpay; document.head.innerHTML=""; vi.stubEnv("VITE_RAZORPAY_KEY_ID","key");});
describe("useCustomerCheckout",()=>{
 it("guards empty/session/loading and places dine-in with coupon/loyalty/combo",async()=>{
  const p=base({comboCart:[{combo:{id:"c"},quantity:2,selections:[{slotId:"s",optionIds:["o"]}]}]}); api.createCustomerOrder.mockResolvedValue(order()); const {result}=renderHook(()=>useCustomerCheckout(p));
  act(()=>result.current.setCouponCode(" C ")); act(()=>result.current.setLoyaltyPhone(" 9 ")); await act(async()=>result.current.placeOrder("DINE_IN"));
  expect(api.createCustomerOrder).toHaveBeenCalledWith("tok",expect.objectContaining({couponCode:"C",loyaltyPhone:"9",combos:expect.any(Array)})); expect(p.clearCart).toHaveBeenCalled(); expect(clearPersistedCart).toHaveBeenCalledWith("scope");
  const g=renderHook(()=>useCustomerCheckout(base({session:null}))); await act(async()=>g.result.current.placeOrder("DINE_IN"));
  const e=renderHook(()=>useCustomerCheckout(base({cart:[],comboCart:[]}))); await act(async()=>e.result.current.placeOrder("DINE_IN"));
  const l=renderHook(()=>useCustomerCheckout(base({loading:true}))); await act(async()=>l.result.current.placeOrder("DINE_IN"));
 });
 it("covers order creation failure unknown error and no storage",async()=>{
  const p=base({storageScope:null}); api.createCustomerOrder.mockRejectedValueOnce(new Error("boom")); const {result}=renderHook(()=>useCustomerCheckout(p)); await act(async()=>result.current.placeOrder("DINE_IN")); expect(p.setError).toHaveBeenCalledWith("boom");
  api.createCustomerOrder.mockRejectedValueOnce("x"); await act(async()=>result.current.placeOrder("DINE_IN")); expect(p.setError).toHaveBeenCalledWith("Unable to place order");
 });
 it("covers takeaway payment initialization, existing pending payment, verify and cancellation",async()=>{
  const p=base({session:session("TAKEAWAY")}); const created=order([]); api.createCustomerOrder.mockResolvedValue(created); api.initiateTakeawayPayment.mockResolvedValue({method:"RAZORPAY",status:"PENDING",reference:"rz",amount:"12"}); api.verifyTakeawayPayment.mockResolvedValue(order([]));
  let opts:any; (window as any).Razorpay=class { constructor(o:any){opts=o;} open(){setTimeout(()=>opts.handler({razorpay_order_id:"ro",razorpay_payment_id:"rp",razorpay_signature:"rs"}),0);} };
  const append=vi.spyOn(document.head,"appendChild").mockImplementation((node:any)=>{setTimeout(()=>node.onload?.(),0); return node;});
  const {result}=renderHook(()=>useCustomerCheckout(p)); await act(async()=>result.current.placeOrder("TAKEAWAY")); expect(api.verifyTakeawayPayment).toHaveBeenCalled();
  append.mockRestore();
  const existing=order([{method:"RAZORPAY",status:"PENDING",reference:"existing",amount:"10"}]); const p2=base({session:session("TAKEAWAY"),placedOrder:existing}); let opened=false; (window as any).Razorpay=class { constructor(o:any){opts=o;} open(){opened=true; setTimeout(()=>opts.modal.ondismiss(),0);} }; const script=document.createElement("script"); script.id="razorpay-checkout"; document.head.appendChild(script); const h=renderHook(()=>useCustomerCheckout(p2)); await act(async()=>h.result.current.retryTakeawayPayment()); expect(opened).toBe(true); expect(p2.setError).toHaveBeenCalledWith("Payment was cancelled");
 });
 it("covers takeaway guard/config/script/payment errors and retry branches",async()=>{
  const guards=[base({session:null}),base({session:session("DINE_IN"),placedOrder:order()}),base({session:session("TAKEAWAY"),placedOrder:null}),base({session:session("TAKEAWAY"),placedOrder:order(),loading:true})];
  for(const p of guards){const h=renderHook(()=>useCustomerCheckout(p)); await act(async()=>h.result.current.retryTakeawayPayment());}
  vi.stubEnv("VITE_RAZORPAY_KEY_ID",""); const p=base({session:session("TAKEAWAY"),placedOrder:order()}); let h=renderHook(()=>useCustomerCheckout(p)); await act(async()=>h.result.current.retryTakeawayPayment()); expect(p.setError).toHaveBeenCalledWith("Online takeaway payment is not configured");
  vi.stubEnv("VITE_RAZORPAY_KEY_ID","key"); api.initiateTakeawayPayment.mockResolvedValueOnce({reference:null,amount:"1"}); h=renderHook(()=>useCustomerCheckout(p)); await act(async()=>h.result.current.retryTakeawayPayment()); expect(p.setError).toHaveBeenCalledWith("Unable to initialize takeaway payment");
  api.initiateTakeawayPayment.mockResolvedValueOnce({reference:"x",amount:"1"}); vi.spyOn(document.head,"appendChild").mockImplementationOnce((node:any)=>{setTimeout(()=>node.onerror?.(),0);return node;}); h=renderHook(()=>useCustomerCheckout(p)); await act(async()=>h.result.current.retryTakeawayPayment()); expect(p.setError).toHaveBeenCalledWith("Unable to load payment checkout");
 });
});

describe("useCustomerCheckout remaining payment branches",()=>{
 it("handles verification rejection and successful retry cleanup with restaurant fallback",async()=>{
  const pending=order([{method:"RAZORPAY",status:"PENDING",reference:"ref",amount:"10"}]);
  const p=base({session:{...session("TAKEAWAY"),restaurant:""},placedOrder:pending,storageScope:"scope"});
  let opts:any;
  (window as any).Razorpay=class{constructor(o:any){opts=o;}open(){setTimeout(()=>opts.handler({razorpay_order_id:"a",razorpay_payment_id:"b",razorpay_signature:"c"}),0)}};
  const script=document.createElement("script");script.id="razorpay-checkout";document.head.appendChild(script);
  api.verifyTakeawayPayment.mockRejectedValueOnce(new Error("verify failed"));
  let h=renderHook(()=>useCustomerCheckout(p));
  await act(async()=>h.result.current.retryTakeawayPayment());
  expect(p.setError).toHaveBeenCalledWith("verify failed");
  api.verifyTakeawayPayment.mockResolvedValueOnce(order([]));
  h=renderHook(()=>useCustomerCheckout(p));
  await act(async()=>h.result.current.retryTakeawayPayment());
  expect(clearPersistedCart).toHaveBeenCalledWith("scope");
  expect(p.clearCart).toHaveBeenCalled();
  expect(opts.name).toBe("Restaurant");
 });
 it("reports unknown retry errors and missing checkout constructor",async()=>{
  const p=base({session:session("TAKEAWAY"),placedOrder:order([{method:"RAZORPAY",status:"PENDING",reference:"ref",amount:"10"}])});
  const script=document.createElement("script");script.id="razorpay-checkout";document.head.appendChild(script);
  delete (window as any).Razorpay;
  let h=renderHook(()=>useCustomerCheckout(p)); await act(async()=>h.result.current.retryTakeawayPayment()); expect(p.setError).toHaveBeenCalledWith("Payment checkout is unavailable");
  p.setError.mockClear(); api.initiateTakeawayPayment.mockRejectedValueOnce("plain");
  h=renderHook(()=>useCustomerCheckout({...p,placedOrder:order([])})); await act(async()=>h.result.current.retryTakeawayPayment()); expect(p.setError).toHaveBeenCalledWith("Payment was not completed");
 });
});
