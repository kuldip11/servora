import { describe, expect, it } from "vitest";
import { ValidationError } from "@/core/errors";
import {
  allocateTotalsByWeight,
  areAllBillsPaid,
  buildSeatAllocationPlan,
  buildFractionalSeatAllocationPlan,
  combinedOrderAmounts,
  groupOrderItemsForEvenBills,
  splitMoneyEvenly,
  validateComboGroupAllocations,
  validateFractionalComboAllocations,
  validateItemAllocations,
  validateItemShareAllocations,
} from "@/modules/billing/billing-split";

describe("multi-bill splitting", () => {
  it("distributes odd-cent totals exactly and evenly", () => {
    const shares = splitMoneyEvenly(10.01, 3);
    expect(shares).toEqual([3.34, 3.34, 3.33]);
    expect(
      Math.round(shares.reduce((sum, share) => sum + share, 0) * 100),
    ).toBe(1001);
  });

  it("preserves a negative rounding adjustment exactly across an even split", () => {
    const shares = splitMoneyEvenly(-0.01, 2);
    expect(shares).toEqual([-0.01, 0]);
    expect(shares.reduce((sum, share) => sum + share, 0)).toBeCloseTo(-0.01, 8);
  });

  it("preserves signed weighted adjustments without negative zero", () => {
    expect(allocateTotalsByWeight(-0.01, [1, 1])).toEqual([-0.01, 0]);
    expect(allocateTotalsByWeight(-0.01, [0, 0])).toEqual([-0.01, 0]);
  });

  it("does not settle the order when only one split bill is paid", () => {
    const bills = [
      { id: "one", totalAmount: "5.00" },
      { id: "two", totalAmount: "5.00" },
    ];
    expect(areAllBillsPaid(bills, new Map([["one", 5]]))).toBe(false);
    expect(
      areAllBillsPaid(
        bills,
        new Map([
          ["one", 5],
          ["two", 5],
        ]),
      ),
    ).toBe(true);
  });

  it("builds one exact combined bill across merged orders", () => {
    expect(
      combinedOrderAmounts([
        {
          subtotal: "10.00",
          taxAmount: "1.00",
          discountAmount: "0.50",
          totalAmount: "10.50",
        },
        {
          subtotal: "20.00",
          taxAmount: "2.00",
          discountAmount: "0.00",
          totalAmount: "22.00",
        },
      ]),
    ).toEqual({
      subtotal: "30.00",
      taxAmount: "3.00",
      discountAmount: "0.50",
      serviceChargeAmount: "0.00",
      roundingAdjustment: "0.00",
      totalAmount: "32.50",
    });
  });

  it("rejects partial and duplicate item allocations", () => {
    expect(
      validateItemAllocations(
        ["a", "b", "c"],
        [{ orderItemIds: ["a"] }, { orderItemIds: ["b"] }],
      ),
    ).toEqual({ ok: false, reason: "UNASSIGNED_ITEM" });
    expect(
      validateItemAllocations(
        ["a", "b"],
        [{ orderItemIds: ["a"] }, { orderItemIds: ["a", "b"] }],
      ),
    ).toEqual({ ok: false, reason: "DUPLICATE_ITEM" });
  });

  it("keeps combo groups atomic during an even bill split", () => {
    const grouped = groupOrderItemsForEvenBills(
      [
        { id: "parent", comboGroupId: "combo-1" },
        { id: "child-a", comboGroupId: "combo-1" },
        { id: "child-b", comboGroupId: "combo-1" },
        { id: "regular-a", comboGroupId: null },
        { id: "regular-b", comboGroupId: null },
      ],
      2,
    );
    expect(grouped).not.toBeNull();
    const comboBills = grouped!.filter((ids) =>
      ids.some((id) => id.startsWith("parent") || id.startsWith("child")),
    );
    expect(comboBills).toHaveLength(1);
    expect(comboBills[0]).toEqual(
      expect.arrayContaining(["parent", "child-a", "child-b"]),
    );
    expect(
      groupOrderItemsForEvenBills(
        [
          { id: "parent", comboGroupId: "combo-1" },
          { id: "child", comboGroupId: "combo-1" },
        ],
        2,
      ),
    ).toBeNull();
  });

  it("keeps a combo parent and its component lines on the same item-split bill", () => {
    const items = [
      { id: "parent", comboGroupId: "combo-1" },
      { id: "child-a", comboGroupId: "combo-1" },
      { id: "child-b", comboGroupId: "combo-1" },
      { id: "regular", comboGroupId: null },
    ];
    expect(
      validateComboGroupAllocations(items, [
        { orderItemIds: ["parent", "child-a"] },
        { orderItemIds: ["child-b", "regular"] },
      ]),
    ).toEqual({ ok: false, reason: "SPLIT_COMBO_GROUP" });
    expect(
      validateComboGroupAllocations(items, [
        { orderItemIds: ["parent", "child-a", "child-b"] },
        { orderItemIds: ["regular"] },
      ]),
    ).toEqual({ ok: true });
  });

  it("accepts exact item coverage and preserves weighted total cents", () => {
    expect(
      validateItemAllocations(
        ["a", "b", "c"],
        [{ orderItemIds: ["a", "c"] }, { orderItemIds: ["b"] }],
      ),
    ).toEqual({ ok: true });
    const totals = allocateTotalsByWeight(10.01, [2, 1]);
    expect(totals.reduce((sum, value) => sum + value, 0)).toBeCloseTo(10.01);
  });

  it("does not add tax a second time when weighting inclusive-tax seat items", () => {
    const plan = buildSeatAllocationPlan(
      [
        {
          id: "inclusive",
          seatLabel: "Seat 1",
          subtotal: "100",
          taxRate: "20",
          taxMode: "INCLUSIVE",
        },
        {
          id: "exclusive",
          seatLabel: "Seat 2",
          subtotal: "100",
          taxRate: "20",
          taxMode: "EXCLUSIVE",
        },
        {
          id: "shared",
          seatLabel: null,
          subtotal: "10",
          taxRate: "0",
          taxMode: "EXCLUSIVE",
        },
      ],
      "EVEN_SPLIT",
    );
    expect(plan).toMatchObject({ status: "complete" });
    if (plan.status === "complete") {
      expect(
        plan.allocations.find((entry) => entry.label === "Seat 1")
          ?.orderItemIds,
      ).toContain("shared");
    }
  });

  it("keeps shared combo rows together during automatic seat splitting", () => {
    const items = [
      { id: "seat-1", seatLabel: "Seat 1", subtotal: "10", taxRate: "0" },
      { id: "seat-2", seatLabel: "Seat 2", subtotal: "20", taxRate: "0" },
      {
        id: "combo-parent",
        comboGroupId: "combo-1",
        seatLabel: null,
        subtotal: "0",
        taxRate: "0",
      },
      {
        id: "combo-child",
        comboGroupId: "combo-1",
        seatLabel: null,
        subtotal: "9",
        taxRate: "0",
      },
    ];
    const plan = buildSeatAllocationPlan(items, "EVEN_SPLIT");
    expect(plan.status).toBe("complete");
    if (plan.status === "complete") {
      const comboBills = plan.allocations.filter(
        (allocation) =>
          allocation.orderItemIds.includes("combo-parent") ||
          allocation.orderItemIds.includes("combo-child"),
      );
      expect(comboBills).toHaveLength(1);
      expect(comboBills[0]!.orderItemIds).toEqual(
        expect.arrayContaining(["combo-parent", "combo-child"]),
      );
    }
  });

  it("groups seat-labelled items and handles shared items by the chosen strategy", () => {
    const items = [
      { id: "a", seatLabel: "Seat 1", subtotal: "10", taxRate: "0" },
      { id: "b", seatLabel: "Seat 2", subtotal: "20", taxRate: "0" },
      { id: "shared", seatLabel: null, subtotal: "5", taxRate: "0" },
    ];
    expect(buildSeatAllocationPlan(items, "MANUAL")).toMatchObject({
      status: "manual_required",
      sharedItemIds: ["shared"],
    });
    const automatic = buildSeatAllocationPlan(items, "EVEN_SPLIT");
    expect(automatic).toMatchObject({ status: "complete" });
    if (automatic.status === "complete") {
      expect(
        validateItemAllocations(
          items.map((item) => item.id),
          automatic.allocations,
        ),
      ).toEqual({ ok: true });
      expect(
        automatic.allocations.find(
          (allocation) => allocation.label === "Seat 1",
        )?.orderItemIds,
      ).toContain("shared");
    }
  });


  it("rejects invalid split counts and every item-allocation validation failure", () => {
    expect(() => splitMoneyEvenly(10, 0)).toThrow(ValidationError);
    expect(() => groupOrderItemsForEvenBills([{ id: "a" }], 1.5)).toThrow(
      ValidationError,
    );
    expect(validateItemAllocations(["a"], [{ orderItemIds: [] }])).toEqual({
      ok: false,
      reason: "EMPTY_BILL",
    });
    expect(
      validateItemAllocations(["a"], [{ orderItemIds: ["missing"] }]),
    ).toEqual({ ok: false, reason: "UNKNOWN_ITEM" });
  });

  it("validates fractional item shares and combo atomicity", () => {
    expect(
      validateItemShareAllocations(["a"], [{ itemShares: [] }]),
    ).toEqual({ ok: false, reason: "EMPTY_BILL" });
    expect(
      validateItemShareAllocations(["a"], [
        { itemShares: [{ orderItemId: "missing", shareRatio: 1 }] },
      ]),
    ).toEqual({ ok: false, reason: "UNKNOWN_ITEM" });
    for (const ratio of [0, 1.1, Number.NaN]) {
      expect(
        validateItemShareAllocations(["a"], [
          { itemShares: [{ orderItemId: "a", shareRatio: ratio }] },
        ]),
      ).toEqual({ ok: false, reason: "INVALID_RATIO" });
    }
    expect(
      validateItemShareAllocations(["a"], [
        { itemShares: [{ orderItemId: "a", shareRatio: 0.5 }] },
      ]),
    ).toEqual({ ok: false, reason: "UNASSIGNED_ITEM" });
    expect(
      validateItemShareAllocations(["a"], [
        { itemShares: [{ orderItemId: "a", shareRatio: 1 }] },
      ]),
    ).toEqual({ ok: true });
    expect(
      validateItemShareAllocations(["a", "b"], [
        { itemShares: [{ orderItemId: "a", shareRatio: 1 }] },
      ]),
    ).toEqual({ ok: false, reason: "UNASSIGNED_ITEM" });

    const comboItems = [
      { id: "parent", comboGroupId: "c1" },
      { id: "child", comboGroupId: "c1" },
      { id: "solo", comboGroupId: null },
    ];
    expect(
      validateFractionalComboAllocations(comboItems, [
        { itemShares: [{ orderItemId: "parent", shareRatio: 1 }] },
        { itemShares: [{ orderItemId: "child", shareRatio: 1 }] },
      ]),
    ).toEqual({ ok: false, reason: "SPLIT_COMBO_GROUP" });
    expect(
      validateFractionalComboAllocations(comboItems, [
        {
          itemShares: [
            { orderItemId: "parent", shareRatio: 1 },
            { orderItemId: "child", shareRatio: 1 },
            { orderItemId: "solo", shareRatio: 1 },
          ],
        },
      ]),
    ).toEqual({ ok: true });
    expect(
      validateFractionalComboAllocations(comboItems, [
        { itemShares: [{ orderItemId: "child", shareRatio: 1 }] },
      ]),
    ).toEqual({ ok: false, reason: "SPLIT_COMBO_GROUP" });
    expect(
      validateFractionalComboAllocations(comboItems, [
        { itemShares: [{ orderItemId: "parent", shareRatio: 1 }] },
      ]),
    ).toEqual({ ok: false, reason: "SPLIT_COMBO_GROUP" });
  });

});

describe("G5 fractional shared-dish splitting", () => {
  const shared = {
    id: "platter",
    seatLabel: null,
    subtotal: "30.00",
    taxRate: "0",
    taxMode: "EXCLUSIVE" as const,
    seatShares: [
      { seatLabel: "Seat 1", shareRatio: "0.333333" },
      { seatLabel: "Seat 2", shareRatio: "0.333333" },
      { seatLabel: "Seat 3", shareRatio: "0.333334" },
    ],
  };

  it("rejects ratios that do not cover exactly one whole item", () => {
    try {
      buildFractionalSeatAllocationPlan(
        [
          {
            ...shared,
            seatShares: [
              { seatLabel: "Seat 1", shareRatio: 0.4 },
              { seatLabel: "Seat 2", shareRatio: 0.4 },
            ],
          },
        ],
        "EVEN_SPLIT",
      );
      throw new Error("Expected seat-share validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).details?.reason).toBe(
        "INVALID_SEAT_SHARE_TOTAL",
      );
    }
  });

  it("allocates one shared line fractionally without gaps or double counting", () => {
    const plan = buildFractionalSeatAllocationPlan([shared], "EVEN_SPLIT");
    expect(plan).toMatchObject({ status: "complete" });
    if (!plan || plan.status !== "complete")
      throw new Error("expected complete plan");
    const shares = plan.allocations.flatMap(
      (allocation) => allocation.itemShares,
    );
    expect(shares).toHaveLength(3);
    expect(
      shares.reduce((sum, entry) => sum + entry.shareRatio, 0),
    ).toBeCloseTo(1, 6);
    expect(
      shares.reduce((sum, entry) => sum + 30 * entry.shareRatio, 0),
    ).toBeCloseTo(30, 6);
  });

  it("preserves whole-line B9 allocation when mixed with fractional lines", () => {
    const plan = buildFractionalSeatAllocationPlan(
      [
        shared,
        {
          id: "drink-1",
          seatLabel: "Seat 1",
          subtotal: "5",
          taxRate: "0",
          taxMode: "EXCLUSIVE",
        },
        {
          id: "shared-bread",
          seatLabel: null,
          subtotal: "6",
          taxRate: "0",
          taxMode: "EXCLUSIVE",
        },
      ],
      "EVEN_SPLIT",
    );
    expect(plan?.status).toBe("complete");
    if (!plan || plan.status !== "complete")
      throw new Error("expected complete plan");
    expect(
      plan.allocations
        .flatMap((allocation) => allocation.itemShares)
        .filter((share) => share.orderItemId === "shared-bread"),
    ).toHaveLength(1);
    expect(
      plan.allocations
        .flatMap((allocation) => allocation.itemShares)
        .reduce(
          (sum, share) =>
            sum +
            (share.orderItemId === "platter"
              ? 30
              : share.orderItemId === "drink-1"
                ? 5
                : 6) *
              share.shareRatio,
          0,
        ),
    ).toBeCloseTo(41, 6);
  });

  it("returns null without seat shares and handles no-seat/manual fractional plans", () => {
    expect(
      buildFractionalSeatAllocationPlan(
        [{ id: "a", seatLabel: "Seat 1", subtotal: 1, taxRate: 0 }],
        "EVEN_SPLIT",
      ),
    ).toBeNull();

    expect(
      buildFractionalSeatAllocationPlan(
        [
          {
            id: "a",
            seatLabel: null,
            subtotal: 1,
            taxRate: 0,
            seatShares: [{ seatLabel: "   ", shareRatio: 1 }],
          },
        ],
        "EVEN_SPLIT",
      ),
    ).toEqual({ status: "no_seats" });

    expect(
      buildFractionalSeatAllocationPlan(
        [
          {
            id: "a",
            seatLabel: null,
            subtotal: 10,
            taxRate: 0,
            seatShares: [{ seatLabel: "Seat 1", shareRatio: 1 }],
          },
          {
            id: "shared",
            seatLabel: null,
            subtotal: 5,
            taxRate: 0,
          },
        ],
        "MANUAL",
      ),
    ).toMatchObject({
      status: "manual_required",
      allocations: [{ label: "Seat 1", orderItemIds: ["a"] }],
      sharedItemIds: ["shared"],
    });
  });


  it("covers no-seat and inclusive-tax weighting branches", () => {
    expect(
      buildSeatAllocationPlan(
        [{ id: "shared", seatLabel: null, subtotal: 5, taxRate: 20, taxMode: "INCLUSIVE" }],
        "EVEN_SPLIT",
      ),
    ).toEqual({ status: "no_seats" });

    const seatPlan = buildSeatAllocationPlan(
      [
        { id: "seat-a", seatLabel: "A", subtotal: 10, taxRate: 0, taxMode: "EXCLUSIVE" },
        { id: "seat-b", seatLabel: "B", subtotal: 10, taxRate: 0, taxMode: "EXCLUSIVE" },
        { id: "shared-inclusive", seatLabel: null, subtotal: 5, taxRate: 20, taxMode: "INCLUSIVE" },
      ],
      "EVEN_SPLIT",
    );
    expect(seatPlan.status).toBe("complete");

    const fractional = buildFractionalSeatAllocationPlan(
      [
        {
          id: "fractional-inclusive",
          seatLabel: null,
          subtotal: 10,
          taxRate: 20,
          taxMode: "INCLUSIVE",
          seatShares: [{ seatLabel: "A", shareRatio: 1 }],
        },
        {
          id: "fractional-exclusive",
          seatLabel: "B",
          subtotal: 10,
          taxRate: 20,
          taxMode: "EXCLUSIVE",
        },
        {
          id: "unresolved-inclusive",
          seatLabel: null,
          subtotal: 2,
          taxRate: 20,
          taxMode: "INCLUSIVE",
        },
        {
          id: "unresolved-exclusive",
          seatLabel: null,
          subtotal: 2,
          taxRate: 20,
          taxMode: "EXCLUSIVE",
        },
      ],
      "EVEN_SPLIT",
    );
    expect(fractional?.status).toBe("complete");
  });

});
