import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const h=vi.hoisted(()=>({handlers:new Map<string,(e:any)=>void>(),toast:vi.fn(),invalidate:vi.fn()}));
vi.mock("@pos/ui",()=>({toast:h.toast}));
vi.mock("@/shared/lib/realtime",()=>({useRealtimeEvent:(name:string,cb:(e:any)=>void)=>{h.handlers.set(name,cb);}}));
vi.mock("@/shared/lib/query-client",()=>({queryClient:{invalidateQueries:h.invalidate}}));
import {RealtimeNotifications} from "../RealtimeNotifications";
describe("RealtimeNotifications",()=>{it("covers all realtime event paths and dedupe",()=>{const {unmount}=render(<RealtimeNotifications/>);h.handlers.get("inventory.low_stock")!({payload:{id:"i1",currentStock:2,name:"Rice"}});h.handlers.get("inventory.low_stock")!({payload:{id:"i1",currentStock:2,name:"Rice"}});h.handlers.get("menu.availability.updated")!({payload:{}});h.handlers.get("customer.request.created")!({payload:{id:"r1",type:"CALL_WAITER"}});h.handlers.get("customer.request.created")!({payload:{id:"r1",type:"CALL_WAITER"}});h.handlers.get("payment.updated")!({payload:{paymentId:"p1",status:"SUCCESS"}});h.handlers.get("payment.updated")!({payload:{paymentId:"p1",status:"FAILED"}});h.handlers.get("payment.updated")!({payload:{paymentId:"p1",status:"FAILED"}});expect(h.toast).toHaveBeenCalledTimes(3);expect(h.invalidate).toHaveBeenCalledTimes(3);unmount();});});
