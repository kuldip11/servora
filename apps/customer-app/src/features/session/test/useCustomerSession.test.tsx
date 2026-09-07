import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCustomerSession: vi.fn(), getCustomerMenu: vi.fn(), getCustomerOrder: vi.fn(), createCustomerRequest: vi.fn(),
  clearPersistedOrderId: vi.fn(), clearPersistedSession: vi.fn(), getCustomerStorageScope: vi.fn(), loadPersistedOrderId: vi.fn(), loadPersistedSession: vi.fn(), restoreCart: vi.fn(), savePersistedCart: vi.fn(), savePersistedOrderId: vi.fn(), savePersistedSession: vi.fn(),
  realtime: vi.fn(),
}));
vi.mock("@/api", () => ({ createCustomerSession:mocks.createCustomerSession,getCustomerMenu:mocks.getCustomerMenu,getCustomerOrder:mocks.getCustomerOrder,createCustomerRequest:mocks.createCustomerRequest }));
vi.mock("@/features/cart/persistence", () => ({ clearPersistedOrderId:mocks.clearPersistedOrderId,clearPersistedSession:mocks.clearPersistedSession,getCustomerStorageScope:mocks.getCustomerStorageScope,loadPersistedOrderId:mocks.loadPersistedOrderId,loadPersistedSession:mocks.loadPersistedSession,restoreCart:mocks.restoreCart,savePersistedCart:mocks.savePersistedCart,savePersistedOrderId:mocks.savePersistedOrderId,savePersistedSession:mocks.savePersistedSession }));
vi.mock("@/features/ordering/useCustomerOrderRealtime", () => ({ useCustomerOrderRealtime:mocks.realtime }));
import { useCustomerSession } from "../useCustomerSession";

const menu = (mode:"DINE_IN"|"TAKEAWAY"="DINE_IN") => ({ mode, table: mode === "DINE_IN" ? {name:"7",section:"Patio"}:null, restaurant:{name:"Cafe"}, items:[{id:"i1"}], combos:[{id:"c1"}], categories:[{id:"cat",name:"Food"}] } as any);

beforeEach(()=>{
 vi.clearAllMocks(); vi.useFakeTimers({shouldAdvanceTime:true}); history.replaceState({},"","/?qr=abc");
 mocks.getCustomerStorageScope.mockReturnValue("scope"); mocks.loadPersistedSession.mockReturnValue(null); mocks.loadPersistedOrderId.mockReturnValue(null); mocks.restoreCart.mockReturnValue({cart:[],droppedCount:0}); mocks.realtime.mockReturnValue(true);
 mocks.createCustomerSession.mockResolvedValue({sessionToken:"new-token",expiresAt:"2099"}); mocks.getCustomerMenu.mockResolvedValue(menu()); mocks.createCustomerRequest.mockResolvedValue({});
});
afterEach(()=>{ vi.useRealTimers(); });

describe("useCustomerSession exhaustive",()=>{
 it("shows QR error when no token exists", async()=>{ history.replaceState({},"","/"); mocks.getCustomerStorageScope.mockReturnValue(null); const {result}=renderHook(()=>useCustomerSession()); await waitFor(()=>expect(result.current.loading).toBe(false)); expect(result.current.error).toMatch(/QR code/); expect(mocks.createCustomerSession).not.toHaveBeenCalled(); });
 it("creates a session, restores cart/order and persists updates", async()=>{
  mocks.loadPersistedOrderId.mockReturnValue("o1"); mocks.getCustomerOrder.mockResolvedValue({id:"o1"}); mocks.restoreCart.mockReturnValue({cart:[{item:{id:"i1"}}],droppedCount:1});
  const {result}=renderHook(()=>useCustomerSession()); await waitFor(()=>expect(result.current.session?.token).toBe("new-token"));
  expect(result.current.session).toMatchObject({mode:"DINE_IN",table:"7",area:"Patio",restaurant:"Cafe",expiresAt:"2099"}); expect(result.current.categories[0]).toEqual({id:"popular",name:"Popular"}); expect(result.current.error).toMatch(/saved cart items/); expect(mocks.savePersistedSession).toHaveBeenCalled();
  await waitFor(()=>expect(mocks.savePersistedCart).toHaveBeenCalled()); await waitFor(()=>expect(mocks.savePersistedOrderId).toHaveBeenCalledWith("scope","o1"));
 });
 it("reuses persisted sessions, clears invalid sessions/orders, and supports takeaway defaults", async()=>{
  mocks.loadPersistedSession.mockReturnValue({token:"old",expiresAt:"old-exp"}); mocks.getCustomerMenu.mockRejectedValueOnce(new Error("expired")).mockResolvedValueOnce(menu("TAKEAWAY")); mocks.loadPersistedOrderId.mockReturnValue("bad"); mocks.getCustomerOrder.mockRejectedValueOnce(new Error("gone"));
  const {result}=renderHook(()=>useCustomerSession()); await waitFor(()=>expect(result.current.session?.mode).toBe("TAKEAWAY")); expect(mocks.clearPersistedSession).toHaveBeenCalledWith("scope"); expect(mocks.createCustomerSession).toHaveBeenCalled(); expect(result.current.session?.area).toBe("Takeaway"); expect(mocks.clearPersistedOrderId).toHaveBeenCalledWith("scope");
 });
 it("uses persisted token without creating and supports storage-less scope", async()=>{
  mocks.loadPersistedSession.mockReturnValue({token:"old",expiresAt:"persisted-exp"}); mocks.getCustomerMenu.mockResolvedValue(menu()); const h=renderHook(()=>useCustomerSession()); await waitFor(()=>expect(h.result.current.session?.token).toBe("old")); expect(mocks.createCustomerSession).not.toHaveBeenCalled(); expect(h.result.current.session?.expiresAt).toBe("persisted-exp"); h.unmount(); mocks.restoreCart.mockClear();
  mocks.getCustomerStorageScope.mockReturnValue(null); mocks.loadPersistedSession.mockReturnValue(null); mocks.createCustomerSession.mockResolvedValue({sessionToken:"x"}); const s=renderHook(()=>useCustomerSession()); await waitFor(()=>expect(s.result.current.session?.token).toBe("x")); expect(mocks.restoreCart).not.toHaveBeenCalled();
 });
 it("handles bootstrap errors and retry", async()=>{ mocks.createCustomerSession.mockRejectedValueOnce(new Error("boom")); const {result}=renderHook(()=>useCustomerSession()); await waitFor(()=>expect(result.current.error).toBe("boom")); act(()=>result.current.retryBootstrap()); await waitFor(()=>expect(result.current.session).not.toBeNull()); mocks.createCustomerSession.mockRejectedValueOnce("x"); act(()=>result.current.retryBootstrap()); await waitFor(()=>expect(result.current.error).toBe("Unable to load this ordering session")); });
 it("handles requests success/failure/guard and realtime callbacks", async()=>{
  let onOrder:any,onMenu:any; mocks.realtime.mockImplementation((_t,_id,a,b)=>{onOrder=a;onMenu=b; return true}); const {result}=renderHook(()=>useCustomerSession()); await waitFor(()=>expect(result.current.session).not.toBeNull());
  await act(async()=>result.current.requestHelp("BILL" as any)); expect(result.current.requestMessage).toMatch(/bill/); await act(async()=>result.current.requestHelp("WATER" as any)); expect(result.current.requestMessage).toMatch(/shortly/);
  mocks.createCustomerRequest.mockRejectedValueOnce(new Error("nope")); await act(async()=>result.current.requestHelp("CUTLERY" as any)); expect(result.current.requestMessage).toBe("nope"); mocks.createCustomerRequest.mockRejectedValueOnce("x"); await act(async()=>result.current.requestHelp("CALL_WAITER" as any)); expect(result.current.requestMessage).toBe("Could not send request");
  act(()=>onOrder({id:"rt"})); expect(result.current.placedOrder?.id).toBe("rt"); const calls=mocks.getCustomerMenu.mock.calls.length; act(()=>onMenu()); await waitFor(()=>expect(mocks.getCustomerMenu.mock.calls.length).toBeGreaterThan(calls));
 });
 it("polls order when realtime is down and tolerates poll errors", async()=>{
  mocks.realtime.mockReturnValue(false); mocks.loadPersistedOrderId.mockReturnValue("o1"); mocks.getCustomerOrder.mockResolvedValueOnce({id:"o1"}).mockResolvedValueOnce({id:"o2"}).mockRejectedValueOnce(new Error("offline")); const {result,unmount}=renderHook(()=>useCustomerSession()); await waitFor(()=>expect(result.current.placedOrder?.id).toBe("o1")); await act(async()=>{vi.advanceTimersByTime(15000); await Promise.resolve()}); await waitFor(()=>expect(result.current.placedOrder?.id).toBe("o2")); await act(async()=>{vi.advanceTimersByTime(15000); await Promise.resolve()}); unmount();
 });
});
