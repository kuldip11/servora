import { beforeEach, describe, expect, it, vi } from "vitest";
const h=vi.hoisted(()=>({list:vi.fn(),listAll:vi.fn(),create:vi.fn(),update:vi.fn()}));
vi.mock("@pos/api-client",()=>({createOrdersApi:()=>({listCancellationReasons:h.list,listAllCancellationReasons:h.listAll,createCancellationReason:h.create,updateCancellationReason:h.update})}));
vi.mock("@/shared/lib/api-client",()=>({apiClient:{}}));
import { cancellationReasonsService } from "../cancellation-reasons.service";
describe("cancellationReasonsService coverage",()=>{
 beforeEach(()=>vi.clearAllMocks());
 it("covers active/inactive listing and mutations",async()=>{
  h.list.mockResolvedValue([1]);h.listAll.mockResolvedValue([2]);h.create.mockResolvedValue({id:"r1"});h.update.mockResolvedValue({id:"r1",label:"Changed"});
  expect(await cancellationReasonsService.list()).toEqual([1]);
  expect(await cancellationReasonsService.list(false)).toEqual([2]);
  expect(await cancellationReasonsService.listAll()).toEqual([2]);
  expect(await cancellationReasonsService.create("Sold out")).toEqual({id:"r1"});
  expect(await cancellationReasonsService.update("r1",{label:"Changed",isActive:false})).toEqual({id:"r1",label:"Changed"});
  expect(h.create).toHaveBeenCalledWith("Sold out");
  expect(h.update).toHaveBeenCalledWith("r1",{label:"Changed",isActive:false});
 });
});
