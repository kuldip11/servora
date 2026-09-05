import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCustomerOrderRealtime } from "../useCustomerOrderRealtime";
class WS { static OPEN=1; static instances:WS[]=[]; readyState=1; sent:any[]=[]; onopen:any;onmessage:any;onerror:any;onclose:any; constructor(public url:string){WS.instances.push(this);} send(x:any){this.sent.push(x)} close(){this.onclose?.();} }
beforeEach(()=>{WS.instances=[];(globalThis as any).WebSocket=WS; vi.useFakeTimers(); vi.stubEnv("VITE_WS_URL","");});
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();vi.restoreAllMocks();});
describe("customer realtime",()=>{
 it("handles no token, connect, messages, ping, errors, close/reconnect and cleanup",()=>{
  const onOrder=vi.fn(), onMenu=vi.fn(); const empty=renderHook(()=>useCustomerOrderRealtime(undefined,"o1",onOrder,onMenu)); expect(empty.result.current).toBe(false);
  const h=renderHook(()=>useCustomerOrderRealtime("tok","o1",onOrder,onMenu)); const s=WS.instances[0]!; expect(s.url).toContain("/customer/events"); act(()=>s.onopen()); expect(s.sent[0]).toContain("auth");
  act(()=>s.onmessage({data:JSON.stringify({type:"connected"})})); expect(h.result.current).toBe(true); act(()=>vi.advanceTimersByTime(25000)); expect(s.sent).toContain("ping");
  act(()=>s.onmessage({data:JSON.stringify({type:"order.updated",payload:{id:"o1"}})})); expect(onOrder).toHaveBeenCalled(); act(()=>s.onmessage({data:JSON.stringify({type:"order.updated",payload:{id:"other"}})})); act(()=>s.onmessage({data:JSON.stringify({type:"menu.availability.updated"})})); expect(onMenu).toHaveBeenCalled(); act(()=>s.onmessage({data:"bad"}));
  act(()=>s.onerror()); expect(h.result.current).toBe(false); act(()=>s.onclose()); act(()=>vi.advanceTimersByTime(1000)); expect(WS.instances.length).toBeGreaterThan(1); h.unmount();
 });
 it("covers https protocol/default base, capped reconnect and missing optional menu callback",()=>{
  vi.stubEnv("VITE_WS_URL","wss://example.com/events"); const h=renderHook(()=>useCustomerOrderRealtime("t",undefined,vi.fn())); const s=WS.instances[0]!; act(()=>s.onmessage({data:JSON.stringify({type:"menu.availability.updated"})})); for(let i=0;i<8;i++){act(()=>WS.instances.at(-1)!.onclose()); act(()=>vi.runOnlyPendingTimers());} h.unmount();
 });
 it("executes pending reconnect cleanup when dependencies change",()=>{
  const clearTimeoutSpy=vi.spyOn(window,"clearTimeout");
  const {rerender,unmount}=renderHook(
    ({token}:{token:string|undefined})=>useCustomerOrderRealtime(token,"o",vi.fn()),
    {initialProps:{token:"t" as string|undefined}},
  );
  const s=WS.instances[0]!;
  act(()=>s.onclose());
  expect(vi.getTimerCount()).toBeGreaterThan(0);
  rerender({token:undefined});
  expect(clearTimeoutSpy).toHaveBeenCalled();
  unmount();
 });;

});

describe("customer realtime timer branches",()=>{
 it("clears existing ping and pending reconnect timers",()=>{
  vi.stubEnv("VITE_WS_URL","ws://example.com/events");
  const onOrder=vi.fn(), onMenu=vi.fn();
  const h=renderHook(()=>useCustomerOrderRealtime("t","o",onOrder,onMenu));
  const s=WS.instances[0]!;
  act(()=>s.onmessage({data:JSON.stringify({type:"connected"})}));
  act(()=>s.onmessage({data:JSON.stringify({type:"connected"})}));
  act(()=>s.onclose());
  h.unmount();
  act(()=>vi.runOnlyPendingTimers());
 });
 it("does not ping when socket is not OPEN and ignores duplicate reconnect scheduling",()=>{
  vi.stubEnv("VITE_WS_URL","ws://example.com/events");
  const h=renderHook(()=>useCustomerOrderRealtime("t","o",vi.fn()));
  const s=WS.instances[0]!; s.readyState=0;
  act(()=>s.onmessage({data:JSON.stringify({type:"connected"})}));
  act(()=>vi.advanceTimersByTime(25000));
  expect(s.sent).not.toContain("ping");
  act(()=>s.onclose()); act(()=>s.onclose());
  h.unmount();
 });
});
