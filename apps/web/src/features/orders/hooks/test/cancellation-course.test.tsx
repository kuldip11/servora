import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const h=vi.hoisted(()=>({list:vi.fn(),listAll:vi.fn(),activeFranchiseId:vi.fn(),listTenants:vi.fn()}));
vi.mock("@/features/orders/services/cancellation-reasons.service",()=>({cancellationReasonsService:{list:h.list,listAll:h.listAll}}));
vi.mock("@/shared/lib/query-context",()=>({activeFranchiseId:h.activeFranchiseId}));
vi.mock("@pos/api-client",()=>({createAuthApi:()=>({listTenants:h.listTenants})}));
vi.mock("@/shared/lib/api-client",()=>({apiClient:{}}));
import { cancellationReasonKeys, useCancellationReasons } from "../useCancellationReasons";
import { useCourseSequencingEnabled } from "../useCourseSequencingEnabled";

const wrapper=({children}:{children:React.ReactNode})=>{
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
 return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe("order cancellation/course hooks coverage",()=>{
 beforeEach(()=>{vi.clearAllMocks();h.list.mockResolvedValue([]);h.listAll.mockResolvedValue([]);h.activeFranchiseId.mockReturnValue("t1");h.listTenants.mockResolvedValue([]);});
 it("covers cancellation reason keys and both query branches",async()=>{
  expect(cancellationReasonKeys.active).toEqual(["cancellation-reasons","active"]); expect(cancellationReasonKeys.all).toEqual(["cancellation-reasons"]);
  const a=renderHook(()=>useCancellationReasons(true,true),{wrapper}); await waitFor(()=>expect(a.result.current.isSuccess).toBe(true)); expect(h.list).toHaveBeenCalledWith(true);
  const b=renderHook(()=>useCancellationReasons(false,true),{wrapper}); await waitFor(()=>expect(b.result.current.isSuccess).toBe(true)); expect(h.listAll).toHaveBeenCalled();
  const c=renderHook(()=>useCancellationReasons(true,false),{wrapper}); expect(c.result.current.fetchStatus).toBe("idle");
 });
 it("covers course sequencing enabled, disabled, missing tenant and null tenant id",async()=>{
  h.listTenants.mockResolvedValue([{tenant:{id:"t1",courseSequencingEnabled:true}}]);
  const yes=renderHook(()=>useCourseSequencingEnabled(),{wrapper}); await waitFor(()=>expect(yes.result.current).toBe(true));
  h.listTenants.mockResolvedValue([{tenant:{id:"t1",courseSequencingEnabled:false}}]);
  const no=renderHook(()=>useCourseSequencingEnabled(),{wrapper}); await waitFor(()=>expect(h.listTenants).toHaveBeenCalledTimes(2)); expect(no.result.current).toBe(false);
  h.listTenants.mockResolvedValue([{tenant:{id:"other",courseSequencingEnabled:true}}]);
  const missing=renderHook(()=>useCourseSequencingEnabled(),{wrapper}); await waitFor(()=>expect(h.listTenants).toHaveBeenCalledTimes(3)); expect(missing.result.current).toBe(false);
  h.activeFranchiseId.mockReturnValue(null); const disabled=renderHook(()=>useCourseSequencingEnabled(),{wrapper}); expect(disabled.result.current).toBe(false);
 });
});
