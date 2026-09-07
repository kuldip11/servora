// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPersistedCart,
  getCustomerStorageScope,
  loadPersistedCart,
  restoreCart,
  savePersistedCart,
} from "./persistence";
import type { CartLine } from "./pricing";
import type { CustomerMenuItem } from "@/features/menu/api";

const item: CustomerMenuItem = {
  id: "item-1",
  categoryId: "cat-1",
  name: "Biryani",
  description: null,
  basePrice: "200",
  taxRate: "5",
  imageUrl: null,
  foodType: "NON_VEG",
  spiceLevel: "MEDIUM",
  prepTimeMinutes: 20,
  variants: [{ id: "variant-1", name: "Regular", price: "200" }],
  modifierGroupLinks: [
    {
      sortOrder: 0,
      group: {
        id: "group-1",
        name: "Extras",
        selectionType: "MULTIPLE",
        minSelections: 0,
        maxSelections: 2,
        options: [
          {
            id: "option-1",
            name: "Raita",
            additionalPrice: "30",
            isAvailable: true,
            maxQuantity: 2,
          },
        ],
      },
    },
  ],
  tagLinks: [],
  images: [],
};

describe("customer cart persistence", () => {
  beforeEach(() => localStorage.clear());

  it("scopes storage to the QR token", () => {
    expect(getCustomerStorageScope("abc")).toBe("qr:abc");
    expect(getCustomerStorageScope("xyz")).not.toBe(
      getCustomerStorageScope("abc"),
    );
    expect(getCustomerStorageScope(null)).toBeNull();
  });

  it("persists only the cart references needed for safe restoration", () => {
    const scope = "qr:abc";
    const cart: CartLine[] = [
      {
        item,
        quantity: 2,
        variantId: "variant-1",
        selectedOptions: [{ optionId: "option-1", quantity: 1 }],
        fulfillmentType: "DINE_IN",
      },
    ];
    savePersistedCart(scope, cart);
    expect(loadPersistedCart(scope)).toEqual([
      {
        itemId: "item-1",
        quantity: 2,
        variantId: "variant-1",
        selectedOptions: [{ optionId: "option-1", quantity: 1 }],
        fulfillmentType: "DINE_IN",
      },
    ]);
  });

  it("rebuilds cart lines from the current server menu", () => {
    const scope = "qr:abc";
    savePersistedCart(scope, [
      {
        item,
        quantity: 2,
        variantId: "variant-1",
        selectedOptions: [{ optionId: "option-1", quantity: 1 }],
        fulfillmentType: "DINE_IN",
      },
    ]);
    const restored = restoreCart(scope, [item], "DINE_IN");
    expect(restored.droppedCount).toBe(0);
    expect(restored.cart[0]?.item).toBe(item);
    expect(restored.cart[0]?.quantity).toBe(2);
  });

  it("drops items that are no longer in the menu", () => {
    const scope = "qr:abc";
    savePersistedCart(scope, [
      { item, quantity: 1, selectedOptions: [], fulfillmentType: "DINE_IN" },
    ]);
    const restored = restoreCart(scope, [], "DINE_IN");
    expect(restored.cart).toEqual([]);
    expect(restored.droppedCount).toBe(1);
  });

  it("forces takeaway fulfillment for a public takeaway session", () => {
    const scope = "qr:takeaway";
    savePersistedCart(scope, [
      { item, quantity: 1, selectedOptions: [], fulfillmentType: "DINE_IN" },
    ]);
    const restored = restoreCart(scope, [item], "TAKEAWAY");
    expect(restored.cart[0]?.fulfillmentType).toBe("TAKEAWAY");
  });

  it("can clear the persisted cart after successful submission", () => {
    const scope = "qr:abc";
    savePersistedCart(scope, [
      { item, quantity: 1, selectedOptions: [], fulfillmentType: "DINE_IN" },
    ]);
    clearPersistedCart(scope);
    expect(loadPersistedCart(scope)).toEqual([]);
  });
});

import {
  clearPersistedOrderId,
  clearPersistedSession,
  loadPersistedOrderId,
  loadPersistedSession,
  savePersistedOrderId,
  savePersistedSession,
} from "./persistence";

describe("customer session and order persistence", () => {
  beforeEach(() => localStorage.clear());

  it("saves, loads and clears session and order ids", () => {
    const scope = "qr:full";
    const session = {
      token: "t",
      mode: "DINE_IN" as const,
      table: "1",
      area: "A",
      restaurant: "R",
      estimatedTime: "10m",
      expiresAt: "later",
    };
    expect(loadPersistedSession(scope)).toBeNull();
    expect(loadPersistedOrderId(scope)).toBeNull();
    savePersistedSession(scope, session);
    savePersistedOrderId(scope, "o1");
    expect(loadPersistedSession(scope)).toEqual(session);
    expect(loadPersistedOrderId(scope)).toBe("o1");
    clearPersistedSession(scope);
    clearPersistedOrderId(scope);
    expect(loadPersistedSession(scope)).toBeNull();
    expect(loadPersistedOrderId(scope)).toBeNull();
  });

  it("handles corrupt/throwing storage and invalid persisted lines", () => {
    const scope = "qr:bad";
    localStorage.setItem("servora:customer:qr:bad:cart", "not-json");
    expect(loadPersistedCart(scope)).toEqual([]);
    localStorage.setItem(
      "servora:customer:qr:bad:cart",
      JSON.stringify([
        null,
        { itemId: 2, quantity: 1 },
        { itemId: "a", quantity: 0 },
        { itemId: "b", quantity: 1.5 },
        { itemId: "ok", quantity: 1, selectedOptions: [], fulfillmentType: "DINE_IN" },
      ]),
    );
    expect(loadPersistedCart(scope)).toHaveLength(1);

    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadPersistedSession(scope)).toBeNull();
    get.mockRestore();
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => savePersistedSession(scope, {
      token: "t", mode: "DINE_IN", table: null, area: "", restaurant: "", estimatedTime: "", expiresAt: "",
    })).not.toThrow();
    set.mockRestore();
    const remove = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => clearPersistedSession(scope)).not.toThrow();
    remove.mockRestore();
  });

  it("drops missing variants and invalid modifiers while preserving valid ones", () => {
    const scope = "qr:restore";
    localStorage.setItem(
      "servora:customer:qr:restore:cart",
      JSON.stringify([
        { itemId: item.id, quantity: 1, variantId: "missing", selectedOptions: [], fulfillmentType: "DINE_IN" },
        { itemId: item.id, quantity: 1, variantId: "variant-1", selectedOptions: [
          { optionId: "option-1", quantity: 2 },
          { optionId: "option-1", quantity: 3 },
          { optionId: "missing", quantity: 1 },
          { optionId: "option-1", quantity: 0 },
          { optionId: "option-1", quantity: 1.5 },
        ], fulfillmentType: "DINE_IN" },
      ]),
    );
    const restored = restoreCart(scope, [item], "DINE_IN");
    expect(restored.droppedCount).toBe(1);
    expect(restored.cart).toHaveLength(1);
    expect(restored.cart[0]!.selectedOptions).toEqual([{ optionId: "option-1", quantity: 2 }]);
  });

  it("returns early for empty persistence and saves lines without variant", () => {
    const scope = "qr:empty";
    expect(restoreCart(scope, [item], "DINE_IN")).toEqual({ cart: [], droppedCount: 0 });
    savePersistedCart(scope, [{ item, quantity: 1, selectedOptions: [], fulfillmentType: "DINE_IN" }]);
    expect(loadPersistedCart(scope)[0]!.variantId).toBeUndefined();
  });
});
