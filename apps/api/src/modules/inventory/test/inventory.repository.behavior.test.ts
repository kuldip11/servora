import { beforeEach, describe, expect, it, vi } from "vitest";

const schema = vi.hoisted(() => {
  const table = (fields: string[]) => Object.fromEntries(fields.map((k) => [k, k]));
  return {
    inventoryItems: table(["id","tenantId","branchId","isActive","deletedAt","name","currentStock","minimumStock","updatedAt"]),
    inventoryTransactions: table(["id","inventoryItemId","createdAt"]),
    recipes: table(["menuItemId","inventoryItemId","isOptional","variantId","modifierOptionId","quantityRequired"]),
    menuItems: table(["id","branchId","tenantId","name","status","enableRecipeDeduction","deletedAt"]),
    orderInventoryDeductions: table(["id","orderId","kitchenTicketId","orderItemId","menuItemId","inventoryItemId","deductedAt"]),
    branches: table(["id","tenantId","isActive"]),
    orders: table(["id","tenantId","branchId"]),
    kitchenTickets: table(["id","orderId","tenantId","branchId"]),
    menuItemVariants: table(["id","name","menuItemId","status","manualOverrideStatus"]),
    modifierOptions: table(["id","name","computedAvailability","manualOverrideAvailability"]),
    wasteReasons: table(["id","tenantId","label","isActive"]),
  };
});
vi.mock("@/db/schema", () => schema);
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a) => ["eq", ...a]), and: vi.fn((...a) => ["and", ...a]), or: vi.fn((...a) => ["or", ...a]),
  isNull: vi.fn((...a) => ["null", ...a]), isNotNull: vi.fn((...a) => ["notnull", ...a]), inArray: vi.fn((...a) => ["in", ...a]),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

const m = vi.hoisted(() => ({
  branchFindFirst: vi.fn(), inventoryFindMany: vi.fn(), inventoryFindFirst: vi.fn(), transactionFindMany: vi.fn(),
  wasteFindMany: vi.fn(), wasteFindFirst: vi.fn(), deductionFindMany: vi.fn(), recipeFindMany: vi.fn(), subRecipeFindFirst: vi.fn(), menuFindMany: vi.fn(),
  insert: vi.fn(), update: vi.fn(), select: vi.fn(), selectDistinct: vi.fn(), transaction: vi.fn(),
  resolveStockBalance: vi.fn(), effectiveModifierAvailability: vi.fn(),
}));

const promiseChain = (rows: unknown) => {
  const q: any = {};
  for (const name of ["from","innerJoin","leftJoin","where","orderBy","limit","offset","groupBy"]) q[name] = vi.fn(() => q);
  q.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(rows).then(resolve, reject);
  return q;
};
const returningChain = (rows: unknown) => ({ values: vi.fn(() => ({ returning: vi.fn().mockResolvedValue(rows) })) });
const updateChain = (rows: unknown) => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue(rows) })) })) });

vi.mock("@/db", () => ({ db: {
  query: {
    branches: { findFirst: m.branchFindFirst }, inventoryItems: { findMany: m.inventoryFindMany, findFirst: m.inventoryFindFirst },
    inventoryTransactions: { findMany: m.transactionFindMany }, wasteReasons: { findMany: m.wasteFindMany, findFirst: m.wasteFindFirst },
    orderInventoryDeductions: { findMany: m.deductionFindMany }, recipes: { findMany: m.recipeFindMany },
    subRecipes: { findFirst: m.subRecipeFindFirst }, menuItems: { findMany: m.menuFindMany },
  },
  insert: m.insert, update: m.update, select: m.select, selectDistinct: m.selectDistinct, transaction: m.transaction,
} }));
vi.mock("../inventory-stock", () => ({ resolveStockBalance: m.resolveStockBalance }));
vi.mock("@/modules/menu/availability/availability-view", () => ({ effectiveModifierAvailability: m.effectiveModifierAvailability }));

import { inventoryRepository } from "../inventory.repository";

describe("inventory repository comprehensive coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.branchFindFirst.mockResolvedValue({ id: "b1" });
    m.inventoryFindMany.mockResolvedValue([]);
    m.inventoryFindFirst.mockResolvedValue({ id: "i1" });
    m.transactionFindMany.mockResolvedValue([]);
    m.wasteFindMany.mockResolvedValue([]);
    m.wasteFindFirst.mockResolvedValue({ id: "w1" });
    m.deductionFindMany.mockResolvedValue([]);
    m.recipeFindMany.mockResolvedValue([]);
    m.subRecipeFindFirst.mockImplementation(async (opts:any) => { if (typeof opts?.where === "function") opts.where({id:"id",tenantId:"tenantId"},{and:(...a:any[])=>a,eq:(...a:any[])=>a}); return { id: "s1" }; });
    m.menuFindMany.mockResolvedValue([]);
    m.insert.mockImplementation(() => returningChain([{ id: "new" }]));
    m.update.mockImplementation(() => updateChain([{ id: "updated" }]));
    m.resolveStockBalance.mockReturnValue({ ok: true, balanceAfter: 8 });
    m.effectiveModifierAvailability.mockReturnValue(true);
  });

  it("covers basic branch/item/transaction CRUD and clamped transaction limits", async () => {
    await expect(inventoryRepository.findBranch("t1","b1")).resolves.toEqual({id:"b1"});
    m.inventoryFindMany.mockResolvedValueOnce([{id:"i1"}]);
    await expect(inventoryRepository.findMany("t1","b1")).resolves.toEqual([{id:"i1"}]);
    m.inventoryFindMany.mockResolvedValueOnce([{id:"i2",branch:{id:"b2"}}]);
    await expect(inventoryRepository.findAllBranches("t1")).resolves.toHaveLength(1);
    await expect(inventoryRepository.findById("t1","i1")).resolves.toEqual({id:"i1"});
    m.transactionFindMany.mockImplementationOnce(async (opts:any)=>{opts.orderBy({createdAt:"createdAt"},{desc:(v:any)=>v});return [{id:"x",inventoryItem:{tenantId:"t1",branchId:"b1"}}, {id:"y",inventoryItem:{tenantId:"t2",branchId:"b1"}}, {id:"z",inventoryItem:{tenantId:"t1",branchId:"b2"}}];});
    await expect(inventoryRepository.findRecentTransactions("t1","b1",500)).resolves.toEqual([{id:"x",inventoryItem:{tenantId:"t1",branchId:"b1"}}]);
    m.transactionFindMany.mockImplementationOnce(async (opts:any)=>{opts.orderBy({createdAt:"createdAt"},{desc:(v:any)=>v});return [{id:"x",inventoryItem:{tenantId:"t1",branchId:"b2"}}];});
    await expect(inventoryRepository.findRecentTransactions("t1",null,0)).resolves.toHaveLength(1);
    await expect(inventoryRepository.create({tenantId:"t1",branchId:"b1",name:"Flour",unit:"GRAMS",currentStock:1.2345,minimumStock:2,reorderPoint:3,costPerUnit:4.5})).resolves.toEqual({id:"new"});
  });

  it("covers stock-change not-found, insufficient and successful transaction paths", async () => {
    const tx: any = { select: vi.fn(), update: vi.fn(), insert: vi.fn() };
    const selected: unknown[][] = [[], [{id:"i1",currentStock:"10.000"}], [{id:"i1",currentStock:"10.000"}], [{id:"i1",currentStock:"8.000"}]];
    tx.select.mockImplementation(() => promiseChain(selected.shift() ?? []));
    tx.update.mockImplementation(() => ({set:vi.fn(()=>({where:vi.fn().mockResolvedValue(undefined)}))}));
    tx.insert.mockImplementation(() => returningChain([{id:"tr1"}]));
    m.transaction.mockImplementation(async (fn: (t:any)=>unknown) => fn(tx));
    await expect(inventoryRepository.applyStockChange("t1","i1",2,"OUT","u1")).resolves.toEqual({status:"not_found"});
    m.resolveStockBalance.mockReturnValueOnce({ok:false});
    await expect(inventoryRepository.applyStockChange("t1","i1",20,"OUT","u1")).resolves.toEqual({status:"insufficient_stock"});
    m.resolveStockBalance.mockReturnValueOnce({ok:true,balanceAfter:8});
    await expect(inventoryRepository.applyStockChange("t1","i1",2,"OUT","u1","note","w1")).resolves.toMatchObject({status:"ok",item:{id:"i1"},transaction:{id:"tr1"}});
    const selected2: unknown[][] = [[{id:"i1",currentStock:"10.000"}],[{id:"i1",currentStock:"8.000"}]]; tx.select.mockImplementation(() => promiseChain(selected2.shift() ?? [])); m.resolveStockBalance.mockReturnValueOnce({ok:true,balanceAfter:8});
    await expect(inventoryRepository.applyStockChange("t1","i1",2,"OUT","u1")).resolves.toMatchObject({status:"ok"});
  });

  it("covers waste-reason reads, create/update success and update miss", async () => {
    await inventoryRepository.listWasteReasons("t1");
    await inventoryRepository.listWasteReasons("t1",true);
    await expect(inventoryRepository.findWasteReason("t1","w1")).resolves.toEqual({id:"w1"});
    await expect(inventoryRepository.createWasteReason("t1","Spoilage")).resolves.toEqual({id:"new"});
    await expect(inventoryRepository.updateWasteReason("t1","w1",{label:"Waste",isActive:false})).resolves.toEqual({id:"updated"});
    m.update.mockImplementationOnce(() => updateChain([]));
    await expect(inventoryRepository.updateWasteReason("t1","missing",{})).resolves.toBeNull();
  });

  it("covers ID, low-stock and deduction lookups", async () => {
    await expect(inventoryRepository.findByIds("t1",[])).resolves.toEqual([]);
    m.inventoryFindMany.mockResolvedValueOnce([{id:"i1"},{id:"i2"}]);
    await expect(inventoryRepository.findByIds("t1",["i1","i2"])).resolves.toHaveLength(2);
    m.inventoryFindMany.mockResolvedValueOnce([{id:"a",currentStock:"1",minimumStock:"2"},{id:"b",currentStock:"3",minimumStock:"2"}]);
    await expect(inventoryRepository.findLowStock("t1","b1")).resolves.toEqual([{id:"a",currentStock:"1",minimumStock:"2"}]);
    m.inventoryFindMany.mockResolvedValueOnce([{id:"a",currentStock:"1",minimumStock:"1",branch:{id:"b1"}}]);
    await expect(inventoryRepository.findLowStockAllBranches("t1")).resolves.toHaveLength(1);
    m.deductionFindMany.mockImplementationOnce(async (opts:any)=>{opts.orderBy({deductedAt:"deductedAt"},{asc:(v:any)=>v});return [{id:"d1"}];});
    await expect(inventoryRepository.findOrderDeductions("o1")).resolves.toEqual([{id:"d1"}]);
  });

  it("filters required recipe lines by tenant/branch and linked inventory/subrecipe scope", async () => {
    await expect(inventoryRepository.findRequiredRecipeLines("t1","b1",[])).resolves.toEqual([]);
    m.recipeFindMany.mockResolvedValueOnce([
      {id:"ok",menuItem:{tenantId:"t1",branchId:null},inventoryItem:null,subRecipe:null},
      {id:"local",menuItem:{tenantId:"t1",branchId:"b1"},inventoryItem:{tenantId:"t1",branchId:"b1"},subRecipe:{tenantId:"t1"}},
      {id:"tenantBad",menuItem:{tenantId:"t2",branchId:null},inventoryItem:null,subRecipe:null},
      {id:"branchBad",menuItem:{tenantId:"t1",branchId:"b2"},inventoryItem:null,subRecipe:null},
      {id:"invBad",menuItem:{tenantId:"t1",branchId:null},inventoryItem:{tenantId:"t1",branchId:"b2"},subRecipe:null},
      {id:"subBad",menuItem:{tenantId:"t1",branchId:null},inventoryItem:null,subRecipe:{tenantId:"t2"}},
    ]);
    await expect(inventoryRepository.findRequiredRecipeLines("t1","b1",["m1"])).resolves.toEqual(expect.arrayContaining([expect.objectContaining({id:"ok"}),expect.objectContaining({id:"local"})]));
    await expect(inventoryRepository.findSubRecipeWithIngredients("t1","s1")).resolves.toEqual({id:"s1"});
  });

  it("covers recipe deduction early exits, idempotency, missing inventory, success, short dedupe and ticket mismatch", async () => {
    const makeTx = (opts: {order?:boolean;ticket?:boolean;existing?:boolean;inv?:any;items?:any[]}) => {
      const tx:any={execute:vi.fn(),query:{kitchenTickets:{findFirst:vi.fn().mockResolvedValue(opts.ticket===false?undefined:{id:"kt",items:opts.items??[{id:"oi",menuItemId:"m1"}]})},orderInventoryDeductions:{findFirst:vi.fn().mockResolvedValue(opts.existing?{id:"d"}:undefined)}},select:vi.fn(),update:vi.fn(),insert:vi.fn()};
      const invRows = opts.inv===undefined?[{id:"i1",name:"Milk",currentStock:"1"}]:opts.inv? [opts.inv]:[];
      const selections: unknown[][]=[opts.order===false?[]:[{id:"o1"}], invRows, invRows];
      tx.select.mockImplementation(()=>promiseChain(selections.shift()??[]));
      tx.update.mockImplementation(()=>({set:vi.fn(()=>({where:vi.fn().mockResolvedValue(undefined)}))}));
      tx.insert.mockImplementation(()=>({values:vi.fn().mockResolvedValue(undefined)}));
      return tx;
    };
    const line={inventoryItemId:"i1",menuItemId:"m1",orderItemId:"oi",unit:"ML" as const,neededQuantity:2};
    for (const opts of [{order:false},{ticket:false},{existing:true},{inv:false}] as const) {
      const tx=makeTx(opts as any);m.transaction.mockImplementationOnce(async(fn:(t:any)=>unknown)=>fn(tx));
      await expect(inventoryRepository.deductRecipeLines("t1","b1","o1","kt",[line],"u1")).resolves.toMatchObject({deducted:0});
    }
    const tx=makeTx({items:[{id:"oi",menuItemId:"m1"},{id:"oi2",menuItemId:"m1"}]});m.transaction.mockImplementationOnce(async(fn:(t:any)=>unknown)=>fn(tx));
    await expect(inventoryRepository.deductRecipeLines("t1","b1","o1","kt",[line,{...line,orderItemId:"oi2"}],null)).resolves.toMatchObject({deducted:2,short:[{inventoryItemId:"i1",name:"Milk"}]});
    const fallbackLine={...line,orderItemId:""}; const fallback=makeTx({items:[{id:"",menuItemId:"m1"}]});m.transaction.mockImplementationOnce(async(fn:(t:any)=>unknown)=>fn(fallback));
    await expect(inventoryRepository.deductRecipeLines("t1","b1","o1","kt",[fallbackLine],"u1")).resolves.toMatchObject({deducted:1});
    const bad=makeTx({items:[]});m.transaction.mockImplementationOnce(async(fn:(t:any)=>unknown)=>fn(bad));
    await expect(inventoryRepository.deductRecipeLines("t1","b1","o1","kt",[line],"u1")).rejects.toThrow("missing from kitchen ticket");
  });

  it("covers distinct recipe item/variant/modifier and menu availability query builders", async () => {
    m.selectDistinct.mockReturnValueOnce(promiseChain([{id:"m1"},{id:"m2"}])).mockReturnValueOnce(promiseChain([{id:"v1",name:"Large"}])).mockReturnValueOnce(promiseChain([{id:"op1",computedAvailability:true,manualOverrideAvailability:null}]));
    await expect(inventoryRepository.findAllRecipeMenuItemIds("t1","b1")).resolves.toEqual(["m1","m2"]);
    await expect(inventoryRepository.findScopedRecipeVariants("t1","b1")).resolves.toEqual([{id:"v1",name:"Large"}]);
    await expect(inventoryRepository.findScopedRecipeModifierOptions("t1","b1")).resolves.toEqual([{id:"op1",computedAvailability:true,manualOverrideAvailability:null,isAvailable:true}]);
    await expect(inventoryRepository.findMenuItemsForAvailability("t1","b1",[])).resolves.toEqual([]);
    m.menuFindMany.mockResolvedValueOnce([{id:"m1"}]);
    await expect(inventoryRepository.findMenuItemsForAvailability("t1","b1",["m1"])).resolves.toEqual([{id:"m1"}]);
    m.select.mockReturnValueOnce(promiseChain([{quantityRequired:"1",inventoryItem:{id:"i1"}}]));
    await expect(inventoryRepository.findNonOptionalIngredients("t1","b1","m1")).resolves.toHaveLength(1);
  });
});
