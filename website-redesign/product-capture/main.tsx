import React from "react";
import { createRoot } from "react-dom/client";
import { MenuPicker } from "../../apps/web/src/features/orders/components/create-order/MenuPicker";
import { OrderCart } from "../../apps/web/src/features/orders/components/create-order/OrderCart";
import { OrderFinancialSummary } from "../../apps/web/src/features/orders/components/OrderFinancialSummary";
import { TicketCard } from "../../apps/kitchen-display/src/features/kitchen/components/TicketCard";
import { ticket } from "../../apps/kitchen-display/src/features/kitchen/test/fixtures";
import { OrderCard } from "../../apps/waiter-app/src/features/orders/components/OrderCard";
import { MenuCard } from "../../apps/customer-app/src/features/menu/MenuCard";
import "./capture.css";

// These callbacks deliberately do not access a restaurant. Captures render the
// imported operational components; only the surrounding evidence sheet is new.
const noop = () => {};
const items = [{ id:"sample-pizza",name:"Mushroom pizza",basePrice:"520",description:"Roasted mushrooms, mozzarella and herbs",foodType:"VEG",variants:[],modifierGroupLinks:[],images:[],imageUrl:null,pricingMode:"FIXED",manualStockCount:null,categoryId:"mains",taxRate:"5",spiceLevel:null,prepTimeMinutes:15,tagLinks:[] },{ id:"sample-bowl",name:"Paneer bowl",basePrice:"340",description:"Grilled paneer, rice and seasonal vegetables",foodType:"VEG",variants:[],modifierGroupLinks:[],images:[],imageUrl:null,pricingMode:"FIXED",manualStockCount:null,categoryId:"mains",taxRate:"5",spiceLevel:null,prepTimeMinutes:12,tagLinks:[] }];
const cart = items.map(item=>({menuItemId:item.id,menuItemName:item.name,variantId:null,variantName:null,unitPrice:Number(item.basePrice),quantity:1,modifiers:[],chefNotes:"",courseNumber:1}));
const order = {id:"sample-001048",type:"DINE_IN",status:"OPEN",table:{id:"table12",name:"12"},tableId:"table12",subtotal:"860",taxAmount:"43",totalAmount:"903",discountAmount:"0",serviceChargeAmount:"0",roundingAdjustment:"0",createdAt:new Date(Date.now()-5*60000).toISOString(),items:items.map((item)=>({menuItemName:item.name,taxMode:"EXCLUSIVE"})),kitchenTickets:[{status:"READY"}]};
const kind = new URLSearchParams(location.search).get("view") || "pos";
const title = {pos:"Create an order",kitchen:"Kitchen Display",waiter:"Needs attention",customer:"Your table. Your menu.",billing:"Order financial summary"}[kind] || "Servora";
createRoot(document.getElementById("root")!).render(<div className={`evidence ${kind==="waiter"||kind==="customer"?"capture-phone":""}`} data-capture={kind}>
  <header><h1>{title}</h1><span className="sample-label">Sample data</span></header>
  {kind==="pos" ? <div className="capture-pos"><MenuPicker orderType="DINE_IN" tableId="table12" tablesEnabled tables={[{id:"table12",name:"Table 12",status:"AVAILABLE"}]} categories={[{id:"mains",name:"Main menu",menuItems:items} ] as never} filter="ALL" availableOrderTypes={[{value:"DINE_IN",label:"Dine in"},{value:"TAKEAWAY",label:"Takeaway"}]} onOrderTypeChange={noop} onTableChange={noop} onFilterChange={noop} onItemClick={noop}/><OrderCart items={cart as never} notes="Table 12" total={860} pending={false} canSubmit courseMode={false} onQty={noop} onEdit={noop} onCourse={noop} onNotes={noop} onSubmit={noop}/></div> : null}
  {kind==="kitchen" ? <div className="capture-kitchen">{(["FIRED","PREPARING","READY"] as const).map((status,i)=><div className="capture-column" key={status}><h2>{["New orders","Preparing","Ready"][i]}</h2><TicketCard ticket={{...ticket,id:`sample-ticket-${i}`,ticketNumber:1048+i,status,firedAt:new Date(Date.now()-3*60000).toISOString(),notes:i===0?"No onion":null,items:ticket.items.map((item)=>({...item,menuItemName:items[i%2]!.name,quantity:1,chefNotes:i===0?"No onion":null,variantName:null,modifiers:[]}))}} isUpdating={false} onUpdateStatus={noop}/></div>)}</div>:null}
  {kind==="waiter" ? <div>{[order,{...order,id:"sample-001049",table:{id:"t7",name:"07"},status:"BILL_REQUESTED",kitchenTickets:[]},{...order,id:"sample-001050",table:{id:"t4",name:"04"},kitchenTickets:[]}].map(o=><OrderCard key={o.id} order={o as never} onSelect={noop} variant="compact"/>)}</div>:null}
  {kind==="customer" ? <div>{items.map(item=><MenuCard key={item.id} item={item as never} onSelect={noop}/>)}</div>:null}
  {kind==="billing" ? <OrderFinancialSummary order={order as never}/>:null}
</div>);
