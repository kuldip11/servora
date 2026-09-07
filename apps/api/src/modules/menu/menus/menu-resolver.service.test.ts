import { describe, expect, it } from "vitest";
import {
  isEffectiveAt,
  itemMatchesBranch,
  itemIsPublishedAt,
  menuMatchesContext,
  preferSpecializedMenus,
} from "./menu-resolver.service";

const unrestricted = {
  availableChannels: null,
  availableFulfillmentTypes: null,
  availableBranchIds: null,
};

describe("menu context resolver", () => {
  it("accepts an unrestricted menu", () => {
    expect(menuMatchesContext(unrestricted, "b1", "STAFF", "DINE_IN")).toBe(
      true,
    );
  });

  it("checks channel, fulfillment type, and branch independently", () => {
    expect(
      menuMatchesContext(
        { ...unrestricted, availableChannels: ["CUSTOMER_QR"] },
        "b1",
        "STAFF",
        "DINE_IN",
      ),
    ).toBe(false);
    expect(
      menuMatchesContext(
        { ...unrestricted, availableFulfillmentTypes: ["DELIVERY"] },
        "b1",
        "STAFF",
        "DINE_IN",
      ),
    ).toBe(false);
    expect(
      menuMatchesContext(
        { ...unrestricted, availableBranchIds: ["b2"] },
        "b1",
        "STAFF",
        "DINE_IN",
      ),
    ).toBe(false);
  });

  it("requires every configured scope to match", () => {
    const scoped = {
      availableChannels: ["CUSTOMER_QR"],
      availableFulfillmentTypes: ["TAKEAWAY"],
      availableBranchIds: ["b1"],
    };
    expect(menuMatchesContext(scoped, "b1", "CUSTOMER_QR", "TAKEAWAY")).toBe(
      true,
    );
    expect(menuMatchesContext(scoped, "b2", "CUSTOMER_QR", "TAKEAWAY")).toBe(
      false,
    );
  });
});

describe("menu and item branch scope composition", () => {
  it.each([
    [null, null, "b1", true],
    [null, ["b1"], "b1", true],
    ["b1", null, "b1", true],
    ["b1", ["b1", "b2"], "b1", true],
    ["b1", ["b1", "b2"], "b2", false],
    ["b1", ["b2"], "b1", false],
  ])(
    "composes item %s and menu %s at %s",
    (itemBranch, menuBranches, branch, expected) => {
      expect(
        menuMatchesContext(
          { ...unrestricted, availableBranchIds: menuBranches },
          branch,
          "STAFF",
          "DINE_IN",
        ) && itemMatchesBranch(itemBranch, branch),
      ).toBe(expected);
    },
  );
});
it("keeps scheduled changes hidden until the exact effective instant", () => {
  const midnight = new Date("2026-09-01T00:00:00.000Z");
  expect(isEffectiveAt(midnight, new Date("2026-08-31T23:59:59.999Z"))).toBe(
    false,
  );
  expect(isEffectiveAt(midnight, midnight)).toBe(true);
});

describe("default menu fallback", () => {
  it("uses the automatic default menu when no specialized menu matches", () => {
    const resolved = preferSpecializedMenus([
      { id: "default", isDefault: true },
    ]);
    expect(resolved.map((menu) => menu.id)).toEqual(["default"]);
  });

  it("prefers specialized menus over the automatic default menu", () => {
    const resolved = preferSpecializedMenus([
      { id: "default", isDefault: true },
      { id: "breakfast", isDefault: false },
      { id: "delivery", isDefault: false },
    ]);
    expect(resolved.map((menu) => menu.id)).toEqual(["breakfast", "delivery"]);
  });
});

describe("adversarial menu visibility", () => {
  it("rejects a menu scoped to another channel, order type, or branch", () => {
    const menu = {
      availableChannels: ["CUSTOMER_QR"],
      availableFulfillmentTypes: ["DELIVERY"],
      availableBranchIds: ["branch-b"],
    };

    expect(menuMatchesContext(menu, "branch-a", "STAFF", "DINE_IN")).toBe(
      false,
    );
  });

  it("keeps future menus inactive until their effective instant", () => {
    const effectiveFrom = new Date("2026-09-02T00:00:00.000Z");
    expect(
      isEffectiveAt(effectiveFrom, new Date("2026-09-01T23:59:59.999Z")),
    ).toBe(false);
    expect(isEffectiveAt(effectiveFrom, effectiveFrom)).toBe(true);
  });

  it("does not expose an item assigned to a different branch", () => {
    expect(itemMatchesBranch("branch-b", "branch-a")).toBe(false);
    expect(itemMatchesBranch("branch-a", "branch-a")).toBe(true);
    expect(itemMatchesBranch(null, "branch-a")).toBe(true);
  });
});

describe("orderable membership publication", () => {
  const asOf = new Date("2026-09-01T12:00:00.000Z");

  it("accepts only published, non-deleted items whose effective time has arrived", () => {
    expect(
      itemIsPublishedAt(
        { isPublished: true, deletedAt: null, effectiveFrom: null },
        asOf,
      ),
    ).toBe(true);
    expect(
      itemIsPublishedAt(
        { isPublished: false, deletedAt: null, effectiveFrom: null },
        asOf,
      ),
    ).toBe(false);
    expect(
      itemIsPublishedAt(
        {
          isPublished: true,
          deletedAt: null,
          effectiveFrom: new Date("2026-09-02T00:00:00.000Z"),
        },
        asOf,
      ),
    ).toBe(false);
    expect(
      itemIsPublishedAt(
        {
          isPublished: true,
          deletedAt: new Date("2026-09-01T00:00:00.000Z"),
          effectiveFrom: null,
        },
        asOf,
      ),
    ).toBe(false);
  });
});
