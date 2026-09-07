import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  findMany: vi.fn(), update: vi.fn(), set: vi.fn(), where: vi.fn(), returning: vi.fn(),
  del: vi.fn(), deleteWhere: vi.fn(), insert: vi.fn(), values: vi.fn(), conflict: vi.fn(),
  selectDistinct: vi.fn(), from: vi.fn(), innerJoin: vi.fn(), selectWhere: vi.fn(),
}));
vi.mock("@/db", () => {
  m.update.mockImplementation(() => ({ set: m.set }));
  m.set.mockImplementation(() => ({ where: m.where }));
  m.where.mockImplementation(() => ({ returning: m.returning }));
  m.del.mockImplementation(() => ({ where: m.deleteWhere }));
  m.deleteWhere.mockResolvedValue(undefined);
  m.insert.mockImplementation(() => ({ values: m.values }));
  m.values.mockImplementation(() => ({ onConflictDoNothing: m.conflict }));
  m.conflict.mockResolvedValue(undefined);
  m.selectDistinct.mockImplementation(() => ({ from: m.from }));
  m.from.mockImplementation(() => ({ innerJoin: m.innerJoin }));
  m.innerJoin.mockImplementation(() => ({ where: m.selectWhere }));
  return { db: { query: { menuItems: { findMany: m.findMany } }, update: m.update, delete: m.del, insert: m.insert, selectDistinct: m.selectDistinct } };
});
import { bulkOpsRepository } from "../bulk-ops.repository";

describe("bulk ops repository comprehensive coverage", () => {
  beforeEach(() => { vi.clearAllMocks(); m.findMany.mockResolvedValue([{id:"i1",basePrice:"10.00"},{id:"i2",basePrice:"20"}]); m.returning.mockResolvedValue([{id:"i1"},{id:"i2"}]); m.selectWhere.mockResolvedValue([]); });
  it("covers scope/status/category empty and populated paths", async () => {
    await expect(bulkOpsRepository.findItemScopes("t",[])).resolves.toEqual([]);
    m.findMany.mockResolvedValueOnce([{id:"i1",branchId:"b"}]);
    await expect(bulkOpsRepository.findItemScopes("t",["i1"])).resolves.toHaveLength(1);
    await expect(bulkOpsRepository.updateItemsStatus("t",[],"ACTIVE")).resolves.toEqual({updated:0});
    await expect(bulkOpsRepository.updateItemsStatus("t",["i1"],"HIDDEN")).resolves.toEqual({updated:2});
    await bulkOpsRepository.updateItemsStatus("t",["i1"],"OUT_OF_STOCK","reason");
    await expect(bulkOpsRepository.updateItemsCategory("t",[],"c")).resolves.toEqual({updated:0});
    await expect(bulkOpsRepository.updateItemsCategory("t",["i1"],"c")).resolves.toEqual({updated:2});
  });
  it("covers every tag mode, empty ids, no ownership and empty relation inputs", async () => {
    await expect(bulkOpsRepository.bulkSetItemTags("t",[],[],"add")).resolves.toEqual({updated:0});
    m.findMany.mockResolvedValueOnce([]); await expect(bulkOpsRepository.bulkSetItemTags("t",["x"],["t"],"add")).resolves.toEqual({updated:0});
    m.findMany.mockResolvedValueOnce([{id:"i1"}]); await bulkOpsRepository.bulkSetItemTags("t",["i1"],["t1","t2"],"replace");
    m.findMany.mockResolvedValueOnce([{id:"i1"}]); await bulkOpsRepository.bulkSetItemTags("t",["i1"],[],"replace");
    m.findMany.mockResolvedValueOnce([{id:"i1"}]); await bulkOpsRepository.bulkSetItemTags("t",["i1"],["t1"],"add");
    m.findMany.mockResolvedValueOnce([{id:"i1"}]); await bulkOpsRepository.bulkSetItemTags("t",["i1"],[],"add");
    m.findMany.mockResolvedValueOnce([{id:"i1"}]); await bulkOpsRepository.bulkSetItemTags("t",["i1"],["t1"],"remove");
  });
  it("covers every modifier mode and sort order mapping", async () => {
    await expect(bulkOpsRepository.bulkSetItemModifierGroups("t",[],[],"replace")).resolves.toEqual({updated:0});
    m.findMany.mockResolvedValueOnce([]); await expect(bulkOpsRepository.bulkSetItemModifierGroups("t",["x"],["m"],"add")).resolves.toEqual({updated:0});
    for (const [mode, ids] of [["replace",["m1","m2"]],["replace",[]],["add",["m1"]],["add",[]],["remove",["m1"]]] as const) {
      m.findMany.mockResolvedValueOnce([{id:"i1"},{id:"i2"}]); await bulkOpsRepository.bulkSetItemModifierGroups("t",["i1","i2"],[...ids],mode);
    }
    expect(m.values).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({modifierGroupId:"m2",sortOrder:1})]));
  });
  it("covers all price modes, rounding, floor and empty input", async () => {
    await expect(bulkOpsRepository.bulkUpdatePrice("t",[],5,"set")).resolves.toEqual({updated:0,changes:[]});
    m.findMany.mockResolvedValueOnce([{id:"i1",basePrice:"10"}]); await expect(bulkOpsRepository.bulkUpdatePrice("t",["i1"],12.345,"set")).resolves.toMatchObject({changes:[{newPrice:12.35}]});
    m.findMany.mockResolvedValueOnce([{id:"i1",basePrice:"10"}]); await expect(bulkOpsRepository.bulkUpdatePrice("t",["i1"],10,"increase")).resolves.toMatchObject({changes:[{newPrice:11}]});
    m.findMany.mockResolvedValueOnce([{id:"i1",basePrice:"10"}]); await expect(bulkOpsRepository.bulkUpdatePrice("t",["i1"],200,"decrease")).resolves.toMatchObject({changes:[{newPrice:0}]});
    m.findMany.mockResolvedValueOnce([]); await expect(bulkOpsRepository.bulkUpdatePrice("t",["i1"],1,"set")).resolves.toEqual({updated:0,changes:[]});
  });
  it("covers protected and deletable bulk delete branches", async () => {
    await expect(bulkOpsRepository.bulkDeleteItems("t",[])).resolves.toEqual({deleted:0,protected:0});
    m.selectWhere.mockResolvedValueOnce([{id:"i1"},{id:"i2"}]); await expect(bulkOpsRepository.bulkDeleteItems("t",["i1","i2"])).resolves.toEqual({deleted:0,protected:2});
    m.selectWhere.mockResolvedValueOnce([{id:"i1"}]); m.returning.mockResolvedValueOnce([{id:"i2"}]);
    await expect(bulkOpsRepository.bulkDeleteItems("t",["i1","i2"])).resolves.toEqual({deleted:1,protected:1});
    m.selectWhere.mockResolvedValueOnce([]); m.returning.mockResolvedValueOnce([]);
    await expect(bulkOpsRepository.bulkDeleteItems("t",["i3"])).resolves.toEqual({deleted:0,protected:0});
  });
});
