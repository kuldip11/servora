import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CartView } from "./CartView";
import type { CartLine } from "./pricing";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const cart = [
  {
    item: {
      id: "item-1",
      name: "Mushroom pizza",
      basePrice: "500",
      taxRate: "5",
      imageUrl: null,
      images: [],
      variants: [],
      modifierGroupLinks: [],
    },
    quantity: 1,
    selectedOptions: [],
    fulfillmentType: "DINE_IN",
  },
] as unknown as CartLine[];

const roots: Array<ReturnType<typeof createRoot>> = [];

afterEach(() => {
  for (const root of roots.splice(0)) act(() => root.unmount());
  document.body.innerHTML = "";
});

const buttonNamed = (name: RegExp) =>
  [...document.querySelectorAll("button")].find((button) =>
    name.test(button.textContent ?? ""),
  );

describe("CartView round fulfilment", () => {
  it("asks once at placement and keeps table takeaway on the table tab", () => {
    const onPlace = vi.fn();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    roots.push(root);
    act(() =>
      root.render(
        <CartView
          cart={cart}
          combos={[]}
          subtotal={500}
          tax={25}
          total={525}
          table="12"
          mode="DINE_IN"
          onBack={() => {}}
          onChange={() => {}}
          onComboChange={() => {}}
          onEdit={() => {}}
          onPlace={onPlace}
          couponCode=""
          onCouponCodeChange={() => {}}
          loyaltyPhone=""
          onLoyaltyPhoneChange={() => {}}
          loading={false}
        />,
      ),
    );

    expect(document.body.textContent).not.toContain("Eat here");
    const placeOrder = buttonNamed(/place order/i);
    expect(placeOrder).toBeDefined();
    act(() =>
      placeOrder!.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    expect(document.body.textContent).toContain(
      "How should we prepare this order?",
    );
    expect(document.body.textContent).toContain(
      "deliver it to Table 12, and keep it on the same table bill",
    );

    const takeaway = buttonNamed(/pack for takeaway/i);
    expect(takeaway).toBeDefined();
    act(() =>
      takeaway!.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    expect(onPlace).toHaveBeenCalledWith("TAKEAWAY");
  });
});

const richLine = {
  item: {
    id: "item-rich", name: "Loaded pizza", basePrice: "100", taxRate: "5", imageUrl: "pizza.jpg", images: [{ url: "fallback.jpg" }],
    variants: [{ id: "v1", name: "Large", price: "120" }],
    modifierGroupLinks: [{ group: { options: [{ id: "o1", name: "Cheese", additionalPrice: "10" }, { id: "o2", name: "Olives", additionalPrice: "5" }] } }],
  },
  variantId: "v1", quantity: 2,
  selectedOptions: [{ optionId: "o1", quantity: 2, zoneLabel: "LEFT" }, { optionId: "missing", quantity: 1, zoneLabel: "WHOLE" }], fulfillmentType: "DINE_IN",
} as unknown as CartLine;

describe("CartView exhaustive interactions", () => {
  it("covers empty state and browse back", () => {
    const onBack = vi.fn();
    const host=document.createElement("div");document.body.appendChild(host);const root=createRoot(host);roots.push(root);
    act(()=>root.render(<CartView cart={[]} combos={[]} subtotal={0} tax={0} total={0} table="1" onBack={onBack} onChange={vi.fn()} onComboChange={vi.fn()} onEdit={vi.fn()} onPlace={vi.fn()} couponCode="" onCouponCodeChange={vi.fn()} loyaltyPhone="" onLoyaltyPhoneChange={vi.fn()} loading={false}/>));
    expect(document.body.textContent).toContain("Your order is empty");
    const browse=buttonNamed(/Browse menu/i)!;act(()=>browse.dispatchEvent(new MouseEvent("click",{bubbles:true})));expect(onBack).toHaveBeenCalled();
  });

  it("covers combo/item controls, choices, rewards and dine-in choice", () => {
    const onChange=vi.fn(),onComboChange=vi.fn(),onEdit=vi.fn(),onPlace=vi.fn(),onCoupon=vi.fn(),onPhone=vi.fn(),onBack=vi.fn();
    const combos=[{ combo:{id:"c",name:"Family Set"}, selections:[{slotId:"s",optionIds:["a","b"]}], quantity:2 }] as any;
    const host=document.createElement("div");document.body.appendChild(host);const root=createRoot(host);roots.push(root);
    act(()=>root.render(<CartView cart={[richLine]} combos={combos} subtotal={200} tax={10} total={210} table="9" onBack={onBack} onChange={onChange} onComboChange={onComboChange} onEdit={onEdit} onPlace={onPlace} couponCode="" onCouponCodeChange={onCoupon} loyaltyPhone="" onLoyaltyPhoneChange={onPhone} loading={false}/>));
    expect(document.body.textContent).toContain("Large · 2 × Cheese (left)"); expect(document.body.textContent).toContain("2 selected components");
    for(const [label,fn,args] of [["Decrease Family Set",onComboChange,[0,-1]],["Increase Family Set",onComboChange,[0,1]],["Decrease Loaded pizza",onChange,[0,-1]],["Increase Loaded pizza",onChange,[0,1]]] as any[]){const b=document.querySelector(`button[aria-label="${label}"]`)!;act(()=>b.dispatchEvent(new MouseEvent("click",{bubbles:true})));expect(fn).toHaveBeenCalledWith(...args)}
    act(()=>buttonNamed(/Edit choices/i)!.dispatchEvent(new MouseEvent("click",{bubbles:true})));expect(onEdit).toHaveBeenCalledWith(0);
    act(()=>buttonNamed(/Add coupon/i)!.dispatchEvent(new MouseEvent("click",{bubbles:true}))); const inputs=[...document.querySelectorAll("input")];
    act(()=>{const i=inputs.find(x=>x.getAttribute("placeholder")==="Enter a code")!;i.value="save";i.dispatchEvent(new Event("input",{bubbles:true}));});
    act(()=>{const i=inputs.find(x=>x.getAttribute("placeholder")==="Enter your phone number")!;i.value="999";i.dispatchEvent(new Event("input",{bubbles:true}));});
    const place=buttonNamed(/Place order/i)!;act(()=>place.dispatchEvent(new MouseEvent("click",{bubbles:true})));const dine=buttonNamed(/^Dine in/i)!;act(()=>dine.dispatchEvent(new MouseEvent("click",{bubbles:true})));expect(onPlace).toHaveBeenCalledWith("DINE_IN");
    act(()=>document.querySelector('button[aria-label="Back to menu"]')!.dispatchEvent(new MouseEvent("click",{bubbles:true})));expect(onBack).toHaveBeenCalled();
  });

  it("covers takeaway direct payment, rewards initially open, fallback image and loading", () => {
    const onPlace=vi.fn();const line={...richLine,item:{...richLine.item,imageUrl:null,images:[{url:"fallback.jpg"}]},variantId:undefined,selectedOptions:[{optionId:"o2",quantity:1,zoneLabel:"WHOLE"}]} as any;
    const host=document.createElement("div");document.body.appendChild(host);const root=createRoot(host);roots.push(root);
    act(()=>root.render(<CartView cart={[line]} combos={[]} subtotal={100} tax={5} total={105} table="-" mode="TAKEAWAY" onBack={vi.fn()} onChange={vi.fn()} onComboChange={vi.fn()} onEdit={vi.fn()} onPlace={onPlace} couponCode="SAVE" onCouponCodeChange={vi.fn()} loyaltyPhone="999" onLoyaltyPhoneChange={vi.fn()} loading={false}/>));
    expect(document.body.textContent).toContain("Takeaway order");expect(document.body.textContent).toContain("Payment required");expect(document.querySelector('img[src="fallback.jpg"]')).toBeTruthy();
    act(()=>buttonNamed(/Continue to payment/i)!.dispatchEvent(new MouseEvent("click",{bubbles:true})));expect(onPlace).toHaveBeenCalledWith("TAKEAWAY");
    act(()=>root.render(<CartView cart={[line]} combos={[]} subtotal={100} tax={5} total={105} table="-" mode="TAKEAWAY" onBack={vi.fn()} onChange={vi.fn()} onComboChange={vi.fn()} onEdit={vi.fn()} onPlace={onPlace} couponCode="SAVE" onCouponCodeChange={vi.fn()} loyaltyPhone="999" onLoyaltyPhoneChange={vi.fn()} loading/>));
    expect(buttonNamed(/Continue to payment/i)?.hasAttribute("disabled")).toBe(true);
  });
});
