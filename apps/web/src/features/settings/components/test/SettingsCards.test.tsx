import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ tenants: vi.fn(), update: vi.fn(), invalidate: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@/shared/lib/api-client", () => ({ apiClient: {} }));
vi.mock("@pos/api-client", () => ({ createSettingsApi: () => ({ tenants: mocks.tenants, updateTenant: mocks.update }) }));
vi.mock("@/shared/lib/notify", () => ({ notifySuccess: mocks.success, notifyError: mocks.error }));
vi.mock("lucide-react", () => ({ ReceiptText: () => null, ChefHat: () => null }));
vi.mock("@pos/ui", () => ({
  Card: ({children}:any)=><section>{children}</section>,
  Button: ({children,loading:_loading,...props}:any)=><button {...props}>{children}</button>,
  Input: ({label,...props}:any)=><label>{label}<input aria-label={label} {...props}/></label>,
  Select: ({label,options=[],...props}:any)=><label>{label}<select aria-label={label} {...props}>{options.map((o:any)=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>,
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
  useQuery: ({queryFn}:any) => { const [data,setData]=React.useState<any>(); React.useEffect(()=>{ void queryFn().then(setData).catch(()=>{}); },[]); return {data}; },
  useMutation: (options:any) => ({ isPending:false, mutate: async()=>{ try{ const out=await options.mutationFn(); options.onSuccess?.(out);}catch(e){options.onError?.(e);} } }),
}));
import { PricingSettingsCard } from "../PricingSettingsCard";
import { KitchenOperationsSettingsCard } from "../KitchenOperationsSettingsCard";

describe("settings cards coverage", () => {
  beforeEach(()=>{ vi.clearAllMocks(); mocks.tenants.mockResolvedValue([{tenant:{id:"t1",serviceChargePercent:5,serviceChargeTaxable:true,roundingPolicy:"NEAREST_5",defaultTaxMode:"INCLUSIVE",courseSequencingEnabled:true}}]); mocks.update.mockResolvedValue({}); });
  it("hydrates and saves pricing settings including nullable service charge", async()=>{
    render(<PricingSettingsCard tenantId="t1"/>); await waitFor(()=>expect((screen.getByLabelText("Service charge %") as HTMLInputElement).value).toBe("5"));
    fireEvent.change(screen.getByLabelText("Service charge %"),{target:{value:""}}); fireEvent.click(screen.getByLabelText(/Service charge is taxable/)); fireEvent.change(screen.getByLabelText("Rounding policy"),{target:{value:"NEAREST_10"}}); fireEvent.change(screen.getByLabelText("Default tax mode"),{target:{value:"EXCLUSIVE"}}); fireEvent.click(screen.getByRole("button",{name:"Save pricing settings"}));
    await waitFor(()=>expect(mocks.update).toHaveBeenCalledWith("t1",{serviceChargePercent:null,serviceChargeTaxable:false,roundingPolicy:"NEAREST_10",defaultTaxMode:"EXCLUSIVE"})); expect(mocks.success).toHaveBeenCalled(); expect(mocks.invalidate).toHaveBeenCalled();
  });
  it("hydrates/saves kitchen sequencing and covers mutation errors", async()=>{
    render(<KitchenOperationsSettingsCard tenantId="t1"/>); const checkbox=await screen.findByRole("checkbox"); await waitFor(()=>expect((checkbox as HTMLInputElement).checked).toBe(true)); fireEvent.click(checkbox); fireEvent.click(screen.getByRole("button",{name:"Save kitchen settings"})); await waitFor(()=>expect(mocks.update).toHaveBeenCalledWith("t1",{courseSequencingEnabled:false}));
    mocks.update.mockRejectedValueOnce(new Error("no")); fireEvent.click(screen.getByRole("button",{name:"Save kitchen settings"})); await waitFor(()=>expect(mocks.error).toHaveBeenCalled());
  });
  it("covers missing tenant query branch", async()=>{ mocks.tenants.mockResolvedValueOnce([]); render(<PricingSettingsCard tenantId="missing"/>); await new Promise(r=>setTimeout(r,0)); expect(mocks.update).not.toHaveBeenCalled(); });
});
