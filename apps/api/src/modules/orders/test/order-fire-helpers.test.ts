import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findTenant: vi.fn(),
  getActiveItemIds: vi.fn(),
  getEffectiveItem: vi.fn(),
}));

vi.mock("@/modules/tenants/tenant.repository", () => ({
  tenantRepository: { findById: mocks.findTenant },
}));
vi.mock("@/modules/menu/menus/menu-resolver.service", () => ({
  menuResolver: { getActiveItemIds: mocks.getActiveItemIds },
}));
vi.mock("@/modules/menu/availability/availability.service", () => ({
  availabilityService: { getEffectiveItem: mocks.getEffectiveItem },
}));

import {
  assertCourseSequencingAllowed,
  assertInitialCourseSequence,
  assertItemsInSchedule,
  requestedCourseNumbers,
  singleCourseNumber,
} from "../order-fire.helpers";

const item = (courseNumber?: number) => ({
  menuItemId: "item-1",
  quantity: 1,
  courseNumber,
});
const combo = (courseNumber?: number) => ({
  comboId: "combo-1",
  quantity: 1,
  selections: [],
  courseNumber,
});

describe("order fire course helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("collects only defined course numbers from items and combos", () => {
    expect(
      requestedCourseNumbers([item(2), item()] as never, [combo(1)] as never),
    ).toEqual([2, 1]);
  });

  it("only loads tenant settings when course sequencing is requested", async () => {
    await assertCourseSequencingAllowed("t1", [item()] as never, []);
    expect(mocks.findTenant).not.toHaveBeenCalled();

    mocks.findTenant.mockResolvedValue({ courseSequencingEnabled: true });
    await expect(
      assertCourseSequencingAllowed("t1", [item(1)] as never, []),
    ).resolves.toBeUndefined();

    mocks.findTenant.mockResolvedValue({ courseSequencingEnabled: false });
    await expect(
      assertCourseSequencingAllowed("t1", [item(1)] as never, []),
    ).rejects.toThrow("Course sequencing is not enabled");
  });

  it("requires every line to have a contiguous sequence starting at one", () => {
    expect(() =>
      assertInitialCourseSequence([item()] as never, []),
    ).not.toThrow();
    expect(() =>
      assertInitialCourseSequence([item(1), item()] as never, []),
    ).toThrow("Every line must have a course");
    expect(() => assertInitialCourseSequence([item(2)] as never, [])).toThrow(
      "start at 1",
    );
    expect(() =>
      assertInitialCourseSequence([item(1), item(3)] as never, []),
    ).toThrow("contiguous");
    expect(() =>
      assertInitialCourseSequence(
        [item(1), item(2)] as never,
        [combo(2)] as never,
      ),
    ).not.toThrow();
  });

  it("returns the single course and rejects mixed-course fire actions", () => {
    expect(singleCourseNumber([item()] as never, [])).toBeUndefined();
    expect(singleCourseNumber([item(2)] as never, [combo(2)] as never)).toBe(2);
    expect(() =>
      singleCourseNumber([item(1)] as never, [combo(2)] as never),
    ).toThrow("only one course");
  });
});

describe("assertItemsInSchedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getActiveItemIds.mockResolvedValue(new Set(["item-1", "item-2"]));
    mocks.getEffectiveItem.mockResolvedValue({
      isHidden: false,
      effectiveStatus: "ACTIVE",
      availabilityReason: null,
    });
  });

  const asOf = new Date("2026-09-04T12:00:00Z");
  const menuItem = (id: string, name: string) => [id, { id, name }] as const;

  it("deduplicates requested ids, skips unknown map entries and validates active items", async () => {
    const map = new Map<string, never>([
      menuItem("item-1", "Burger") as never,
      menuItem("item-2", "Fries") as never,
    ]);
    await assertItemsInSchedule(
      "tenant-1",
      "branch-1",
      map,
      ["item-1", "item-1", "missing", "item-2"],
      "DINE_IN",
      asOf,
    );

    expect(mocks.getActiveItemIds).toHaveBeenCalledWith(
      "tenant-1",
      "branch-1",
      "STAFF",
      "DINE_IN",
      asOf,
    );
    expect(mocks.getEffectiveItem).toHaveBeenCalledTimes(2);
    expect(mocks.getEffectiveItem).toHaveBeenCalledWith(
      "tenant-1",
      "item-1",
      "branch-1",
      { channel: "STAFF", fulfillmentType: "DINE_IN", asOf },
    );
  });

  it("rejects items that are not on an active menu", async () => {
    mocks.getActiveItemIds.mockResolvedValue(new Set());
    const map = new Map([menuItem("item-1", "Burger")]) as never;
    await expect(
      assertItemsInSchedule("t", "b", map, ["item-1"], "TAKEAWAY", asOf),
    ).rejects.toThrow("Burger isn't on an active menu");
    expect(mocks.getEffectiveItem).not.toHaveBeenCalled();
  });

  it("rejects branch-hidden items", async () => {
    mocks.getEffectiveItem.mockResolvedValue({
      isHidden: true,
      effectiveStatus: "ACTIVE",
    });
    const map = new Map([menuItem("item-1", "Burger")]) as never;
    await expect(
      assertItemsInSchedule("t", "b", map, ["item-1"], "DINE_IN", asOf),
    ).rejects.toThrow("Burger isn't available at this branch");
  });

  it("rejects inactive items with the availability reason or fallback reason", async () => {
    const map = new Map([menuItem("item-1", "Burger")]) as never;
    mocks.getEffectiveItem.mockResolvedValue({
      isHidden: false,
      effectiveStatus: "INACTIVE",
      availabilityReason: "outside schedule",
    });
    await expect(
      assertItemsInSchedule("t", "b", map, ["item-1"], "DINE_IN", asOf),
    ).rejects.toThrow("outside schedule");

    mocks.getEffectiveItem.mockResolvedValue({
      isHidden: false,
      effectiveStatus: "INACTIVE",
      availabilityReason: null,
    });
    await expect(
      assertItemsInSchedule("t", "b", map, ["item-1"], "DINE_IN", asOf),
    ).rejects.toThrow("currently unavailable");
  });
});
