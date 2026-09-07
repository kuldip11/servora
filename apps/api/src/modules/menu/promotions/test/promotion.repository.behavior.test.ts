import { beforeEach, describe, expect, it, vi } from "vitest";

const { db } = vi.hoisted(() => ({
  db: {
    query: {
      promotions: { findMany: vi.fn(), findFirst: vi.fn() },
      promotionRedemptions: { findMany: vi.fn() },
    },
    insert: vi.fn(), update: vi.fn(), delete: vi.fn(), select: vi.fn(),
  },
}));
vi.mock("@/db", () => ({ db }));

import {
  assertAndInsertPromotionRedemptions,
  assertAndReplacePromotionRedemptions,
  promotionRepository,
} from "../promotion.repository";

const returning = (rows: any[]) => ({ returning: vi.fn().mockResolvedValue(rows) });
const selectRows = (rows: any[]) => ({
  from: vi.fn().mockReturnValue({
    innerJoin: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(rows) }),
    where: vi.fn().mockResolvedValue(rows),
  }),
});

beforeEach(() => {
  vi.clearAllMocks();
  db.query.promotions.findMany.mockResolvedValue([]);
  db.query.promotions.findFirst.mockResolvedValue(undefined);
  db.query.promotionRedemptions.findMany.mockResolvedValue([]);
});

describe("promotion repository direct coverage", () => {
  it("covers list/find/create/update/remove/redemption-list/stats", async () => {
    db.query.promotions.findMany.mockResolvedValue([{ id: "p1" }]);
    await expect(promotionRepository.list("t1")).resolves.toEqual([{ id: "p1" }]);
    await expect(promotionRepository.findCandidates("t1")).resolves.toEqual([{ id: "p1" }]);
    db.query.promotions.findFirst.mockResolvedValue({ id: "p1" });
    await expect(promotionRepository.findById("t1", "p1")).resolves.toEqual({ id: "p1" });

    db.insert.mockReturnValue({ values: vi.fn().mockReturnValue(returning([{ id: "p1" }])) });
    await expect(promotionRepository.create({ tenantId: "t1" } as any)).resolves.toEqual({ id: "p1" });
    db.update.mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue(returning([{ id: "p1", name: "x" }])) }) });
    await expect(promotionRepository.update("t1", "p1", { name: "x" } as any)).resolves.toMatchObject({ name: "x" });
    db.delete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    await expect(promotionRepository.remove("t1", "p1")).resolves.toBeUndefined();

    db.query.promotionRedemptions.findMany.mockResolvedValue([{ promotionId: "p1", customerId: null, discountAmount: "3.50" }]);
    await expect(promotionRepository.listRedemptionsForOrder("o1")).resolves.toEqual([{ promotionId: "p1", customerId: null, discountAmount: 3.5 }]);

    db.select.mockReturnValueOnce(selectRows([{ uses: 2, discountAmount: "7.00" }]));
    await expect(promotionRepository.stats("t1", "p1")).resolves.toEqual({ uses: 2, discountAmount: "7.00" });
    db.select.mockReturnValueOnce(selectRows([]));
    await expect(promotionRepository.stats("t1", "p2")).resolves.toEqual({ uses: 0, discountAmount: "0" });
  });

  it("covers insert redemption unavailable, limits, insert and merge", async () => {
    const basePromotion = { id: "p1", tenantId: "t1", name: "Promo", isActive: true, maxUsesTotal: null, maxUsesPerCustomer: null };
    const makeTx = (promotion: any, existing: any = undefined, counts: number[] = []) => {
      const select = vi.fn();
      select.mockImplementation((shape?: any) => {
        if (shape) {
          const value = counts.shift() ?? 0;
          return { from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ value }]) }) };
        }
        return { from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ for: vi.fn().mockResolvedValue(promotion ? [promotion] : []) }) }) };
      });
      return {
        select,
        query: { promotionRedemptions: { findFirst: vi.fn().mockResolvedValue(existing), findMany: vi.fn().mockResolvedValue([]) } },
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) }),
        delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      } as any;
    };

    await expect(assertAndInsertPromotionRedemptions(makeTx(undefined), "t1", "o1", [{ promotionId: "p1", discountAmount: 1 }])).rejects.toThrow(/no longer available/i);
    await expect(assertAndInsertPromotionRedemptions(makeTx({ ...basePromotion, isActive: false }), "t1", "o1", [{ promotionId: "p1", discountAmount: 1 }])).rejects.toThrow(/no longer available/i);
    await expect(assertAndInsertPromotionRedemptions(makeTx({ ...basePromotion, maxUsesTotal: 1 }, undefined, [1]), "t1", "o1", [{ promotionId: "p1", discountAmount: 1 }])).rejects.toThrow(/usage limit/i);
    await expect(assertAndInsertPromotionRedemptions(makeTx({ ...basePromotion, maxUsesPerCustomer: 1 }), "t1", "o1", [{ promotionId: "p1", discountAmount: 1 }])).rejects.toThrow(/identified customer/i);
    await expect(assertAndInsertPromotionRedemptions(makeTx({ ...basePromotion, maxUsesPerCustomer: 1 }, undefined, [1]), "t1", "o1", [{ promotionId: "p1", customerId: "c1", discountAmount: 1 }])).rejects.toThrow(/customer's usage limit/i);

    const insertTx = makeTx(basePromotion);
    await assertAndInsertPromotionRedemptions(insertTx, "t1", "o1", [{ promotionId: "p1", customerId: "c1", discountAmount: 1.25 }]);
    expect(insertTx.insert).toHaveBeenCalled();
    const mergeTx = makeTx(basePromotion, { id: "r1", discountAmount: "2.00" });
    await assertAndInsertPromotionRedemptions(mergeTx, "t1", "o1", [{ promotionId: "p1", discountAmount: 1.25 }]);
    expect(mergeTx.update).toHaveBeenCalled();
  });

  it("covers replace deletion, insert, update and validation branches", async () => {
    const promo = { id: "p1", tenantId: "t1", name: "Promo", isActive: true, maxUsesTotal: null, maxUsesPerCustomer: null };
    const makeTx = (existingRows: any[], promotion: any = promo, counts: number[] = []) => {
      const select = vi.fn();
      select.mockImplementation((shape?: any) => {
        if (shape) {
          const value = counts.shift() ?? 0;
          return { from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ value }]) }) };
        }
        return { from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ for: vi.fn().mockResolvedValue(promotion ? [promotion] : []) }) }) };
      });
      return {
        select,
        query: { promotionRedemptions: { findMany: vi.fn().mockResolvedValue(existingRows) } },
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) }),
        delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      } as any;
    };

    const delTx = makeTx([{ id: "r1", promotionId: "p1" }]);
    await assertAndReplacePromotionRedemptions(delTx, "t1", "o1", []);
    expect(delTx.delete).toHaveBeenCalled();

    await expect(assertAndReplacePromotionRedemptions(makeTx([], null), "t1", "o1", [{ promotionId: "p1", discountAmount: 1 }])).rejects.toThrow(/no longer available/i);
    await expect(assertAndReplacePromotionRedemptions(makeTx([], { ...promo, maxUsesTotal: 1 }, [1]), "t1", "o1", [{ promotionId: "p1", discountAmount: 1 }])).rejects.toThrow(/usage limit/i);
    await expect(assertAndReplacePromotionRedemptions(makeTx([], { ...promo, maxUsesPerCustomer: 1 }), "t1", "o1", [{ promotionId: "p1", discountAmount: 1 }])).rejects.toThrow(/identified customer/i);
    await expect(assertAndReplacePromotionRedemptions(makeTx([], { ...promo, maxUsesPerCustomer: 1 }, [1]), "t1", "o1", [{ promotionId: "p1", customerId: "c1", discountAmount: 1 }])).rejects.toThrow(/customer's usage limit/i);

    const insTx = makeTx([]);
    await assertAndReplacePromotionRedemptions(insTx, "t1", "o1", [{ promotionId: "p1", customerId: "c1", discountAmount: 2 }]);
    expect(insTx.insert).toHaveBeenCalled();
    const updTx = makeTx([{ id: "r1", promotionId: "p1" }]);
    await assertAndReplacePromotionRedemptions(updTx, "t1", "o1", [{ promotionId: "p1", customerId: null, discountAmount: 2 }]);
    expect(updTx.update).toHaveBeenCalled();
  });
});
