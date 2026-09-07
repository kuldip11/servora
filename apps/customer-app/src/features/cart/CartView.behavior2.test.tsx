import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CartView } from "./CartView";
const line:any={item:{id:"i",name:"Item",basePrice:"10",taxRate:"0",imageUrl:null,images:[],variants:[],modifierGroupLinks:[]},quantity:1,selectedOptions:[],fulfillmentType:"DINE_IN"};
describe("CartView remaining handlers",()=>{
 it("fires reward input handlers and dialog close",()=>{const coupon=vi.fn(),phone=vi.fn();render(<CartView cart={[line]} combos={[]} subtotal={10} tax={0} total={10} table="1" onBack={vi.fn()} onChange={vi.fn()} onComboChange={vi.fn()} onEdit={vi.fn()} onPlace={vi.fn()} couponCode="X" onCouponCodeChange={coupon} loyaltyPhone="1" onLoyaltyPhoneChange={phone} loading={false}/>);fireEvent.change(screen.getByLabelText("Coupon code"),{target:{value:"save"}});expect(coupon).toHaveBeenCalledWith("SAVE");fireEvent.change(screen.getByLabelText("Loyalty phone"),{target:{value:"999"}});expect(phone).toHaveBeenCalledWith("999");fireEvent.click(screen.getByRole("button",{name:/Place order/}));fireEvent.click(screen.getByRole("button",{name:"Close"}));});
});
