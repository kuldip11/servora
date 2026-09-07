import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ findMany:vi.fn(), findFirst:vi.fn(), insert:vi.fn(), insertValues:vi.fn(), insertReturning:vi.fn(), update:vi.fn(), updateSet:vi.fn(), updateWhere:vi.fn(), updateReturning:vi.fn(), select:vi.fn(), selectFrom:vi.fn(), selectWhere:vi.fn() }));
vi.mock("@/db", () => {
  m.insert.mockImplementation(() => ({ values:m.insertValues })); m.insertValues.mockImplementation(() => ({ returning:m.insertReturning }));
  m.update.mockImplementation(() => ({ set:m.updateSet })); m.updateSet.mockImplementation(() => ({ where:m.updateWhere })); m.updateWhere.mockImplementation(() => ({ returning:m.updateReturning }));
  m.select.mockImplementation(() => ({ from:m.selectFrom })); m.selectFrom.mockImplementation(() => ({ where:m.selectWhere }));
  return { db:{ query:{ roles:{ findMany:m.findMany, findFirst:m.findFirst } }, insert:m.insert, update:m.update, select:m.select } };
});
import { roleRepository } from "../role.repository";

describe("role repository coverage", () => {
  beforeEach(() => { vi.clearAllMocks(); m.findMany.mockImplementation(async (o?:any)=>{o?.orderBy?.({scope:"scope",name:"name"},{asc:(v:unknown)=>v}); return [{id:"r1"}]}); m.findFirst.mockResolvedValue({id:"r1"}); m.insertReturning.mockResolvedValue([{id:"r1"}]); m.updateReturning.mockResolvedValue([{id:"r1"}]); m.selectWhere.mockResolvedValue([{count:2}]); });
  it("covers list/find/create", async () => {
    await expect(roleRepository.listForTenant("t1")).resolves.toEqual([{id:"r1"}]);
    await expect(roleRepository.findTenantRole("t1","r1")).resolves.toEqual({id:"r1"});
    await expect(roleRepository.findByNameAndScope("t1"," Role ","TENANT")).resolves.toEqual({id:"r1"});
    await expect(roleRepository.create("t1",{name:" Role ",description:"  desc ",scope:"TENANT"})).resolves.toEqual({id:"r1"});
    await roleRepository.create("t1",{name:"Role",description:"   ",scope:"BRANCH"});
    await roleRepository.create("t1",{name:"Role",scope:"BRANCH"});
  });
  it("covers update value branches", async () => {
    await expect(roleRepository.update("r1",{name:" X ",description:" desc "})).resolves.toEqual({id:"r1"});
    await roleRepository.update("r1",{description:"   "});
    await roleRepository.update("r1",{});
  });
  it("covers assignment count and archive fallbacks", async () => {
    await expect(roleRepository.assignmentCount("r1")).resolves.toBe(2);
    m.selectWhere.mockResolvedValueOnce([]);
    await expect(roleRepository.assignmentCount("r1")).resolves.toBe(0);
    await expect(roleRepository.archive("r1")).resolves.toEqual({id:"r1"});
  });
});
