import { beforeEach, describe, expect, it, vi } from "vitest";
const { db } = vi.hoisted(() => ({ db: { query: { tenants: { findFirst: vi.fn() }, priceRules: { findMany: vi.fn(), findFirst: vi.fn() } }, insert: vi.fn(), update: vi.fn(), delete: vi.fn() } }));
vi.mock("@/db", () => ({ db }));
import { priceRuleRepository } from "../price-rule.repository";
const returningChain = (rows: any[]) => ({ returning: vi.fn().mockResolvedValue(rows) });
beforeEach(() => { vi.clearAllMocks(); db.query.tenants.findFirst.mockResolvedValue({ organizationId: "org1" }); db.query.priceRules.findMany.mockResolvedValue([]); db.query.priceRules.findFirst.mockResolvedValue(undefined); });
describe("price rule repository", () => {
  it("covers lookup branches", async () => {
    await expect(priceRuleRepository.findCandidates("t1", [])).resolves.toEqual([]); db.query.priceRules.findMany.mockResolvedValueOnce([{ id: "r1" }]); await expect(priceRuleRepository.findCandidates("t1", ["i1"], ["sku"])).resolves.toEqual([{ id: "r1" }]);
    db.query.tenants.findFirst.mockResolvedValueOnce(undefined); await priceRuleRepository.findCandidates("t1", ["i1"], []); await priceRuleRepository.findPerCoverRule("t1", "r1"); db.query.tenants.findFirst.mockResolvedValueOnce(undefined); await priceRuleRepository.findPerCoverRule("t1", "r2");
    await priceRuleRepository.list("t1"); await priceRuleRepository.list("t1", "i1"); await priceRuleRepository.listOrganization("org1"); await priceRuleRepository.listOrganization("org1", "sku"); await priceRuleRepository.findById("t1", "r1"); db.query.tenants.findFirst.mockResolvedValueOnce(undefined); await priceRuleRepository.findById("t1", "r2");
  });
  it("covers create/update/remove branches", async () => {
    db.insert.mockReturnValue({ values: vi.fn().mockReturnValue(returningChain([{ id: "r1" }])) }); await expect(priceRuleRepository.create({ tenantId: "t1" } as any)).resolves.toEqual({ id: "r1" }); await expect(priceRuleRepository.createMany([])).resolves.toEqual([]);
    db.insert.mockReturnValue({ values: vi.fn().mockReturnValue(returningChain([{ id: "r2" }])) }); await expect(priceRuleRepository.createMany([{ tenantId: "t1" } as any])).resolves.toEqual([{ id: "r2" }]);
    const findSpy = vi.spyOn(priceRuleRepository, "findById"); findSpy.mockResolvedValueOnce(undefined as any); await expect(priceRuleRepository.update("t1", "missing", { priority: 1 } as any)).resolves.toBeUndefined();
    findSpy.mockResolvedValueOnce({ id: "r1" } as any); db.update.mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue(returningChain([{ id: "r1", priority: 2 }])) }) }); await expect(priceRuleRepository.update("t1", "r1", { priority: 2 } as any)).resolves.toMatchObject({ priority: 2 });
    findSpy.mockResolvedValueOnce(undefined as any); await expect(priceRuleRepository.remove("t1", "missing")).resolves.toBeUndefined(); findSpy.mockResolvedValueOnce({ id: "r1" } as any); db.delete.mockReturnValue({ where: vi.fn().mockReturnValue(returningChain([{ id: "r1" }])) }); await expect(priceRuleRepository.remove("t1", "r1")).resolves.toEqual({ id: "r1" }); findSpy.mockRestore();
  });
  it("returns organization ids or null", async () => { await expect(priceRuleRepository.organizationIdForTenant("t1")).resolves.toBe("org1"); db.query.tenants.findFirst.mockResolvedValueOnce(undefined); await expect(priceRuleRepository.organizationIdForTenant("t2")).resolves.toBeNull(); });
});
