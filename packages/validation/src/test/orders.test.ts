import { describe, expect, it } from "vitest";
import {
  addOrderItemSchema,
  addOrderItemsSchema,
  createOrderSchema,
  itemCustomizationSchema,
  updateKitchenTicketStatusSchema,
  updateOrderStatusSchema,
} from "../orders";

const uuid = "550e8400-e29b-41d4-a716-446655440000";
const item = { menuItemId: uuid, quantity: 1 };

describe("createOrderSchema", () => {
  it("requires at least one valid item", () => {
    expect(
      createOrderSchema.safeParse({ type: "DINE_IN", items: [item] }).success,
    ).toBe(true);
    expect(
      createOrderSchema.safeParse({ type: "DINE_IN", items: [] }).success,
    ).toBe(false);
  });
  it("accepts a combo-only order and rejects empty order payloads", () => {
    expect(
      createOrderSchema.safeParse({
        type: "TAKEAWAY",
        combos: [
          {
            comboId: uuid,
            selections: [{ slotId: uuid, optionIds: [uuid] }],
          },
        ],
      }).success,
    ).toBe(true);
    expect(createOrderSchema.safeParse({ type: "TAKEAWAY" }).success).toBe(
      false,
    );
  });

  it("enforces billing-mode-specific cover fields", () => {
    expect(
      createOrderSchema.safeParse({
        type: "DINE_IN",
        billingMode: "PER_COVER",
        coverCount: 2,
        perCoverPriceRuleId: uuid,
        items: [item],
      }).success,
    ).toBe(true);
    expect(
      createOrderSchema.safeParse({
        type: "DINE_IN",
        billingMode: "PER_COVER",
        items: [item],
      }).success,
    ).toBe(false);
    expect(
      createOrderSchema.safeParse({
        type: "DINE_IN",
        billingMode: "LINE_ITEMS",
        coverCount: 2,
        perCoverPriceRuleId: uuid,
        items: [item],
      }).success,
    ).toBe(false);
  });

  it("accepts optional table/customer and selected options", () => {
    expect(
      createOrderSchema.safeParse({
        type: "DELIVERY",
        tableId: uuid,
        customerId: uuid,
        notes: "No onions",
        items: [
          {
            ...item,
            variantId: uuid,
            selectedOptions: [{ optionId: uuid, quantity: 2 }],
          },
        ],
      }).success,
    ).toBe(true);
  });
  it("enforces quantity and text limits", () => {
    expect(
      createOrderSchema.safeParse({
        type: "DINE_IN",
        items: [{ ...item, quantity: 0 }],
      }).success,
    ).toBe(false);
    expect(
      createOrderSchema.safeParse({
        type: "DINE_IN",
        items: [{ ...item, quantity: 1000 }],
      }).success,
    ).toBe(false);
    expect(
      createOrderSchema.safeParse({
        type: "DINE_IN",
        notes: "x".repeat(501),
        items: [item],
      }).success,
    ).toBe(false);
  });
});

describe("order update/customization schemas", () => {
  it("accepts supported order and kitchen statuses", () => {
    expect(updateOrderStatusSchema.safeParse({ status: "PAID" }).success).toBe(
      true,
    );
    expect(
      updateKitchenTicketStatusSchema.safeParse({ status: "READY" }).success,
    ).toBe(true);
  });
  it("validates add-order-item and batch inputs", () => {
    expect(addOrderItemSchema.safeParse(item).success).toBe(true);
    expect(addOrderItemsSchema.safeParse({ items: [item] }).success).toBe(true);
    expect(addOrderItemsSchema.safeParse({ items: [] }).success).toBe(false);
    expect(
      addOrderItemsSchema.safeParse({
        combos: [
          {
            comboId: uuid,
            selections: [{ slotId: uuid, optionIds: [uuid] }],
          },
        ],
      }).success,
    ).toBe(true);
    expect(addOrderItemsSchema.safeParse({}).success).toBe(false);
  });
  it("requires complete customization fields", () => {
    expect(
      itemCustomizationSchema.safeParse({
        ...item,
        chefNotes: "",
        selectedOptions: [],
      }).success,
    ).toBe(true);
    expect(
      itemCustomizationSchema.safeParse({
        ...item,
        chefNotes: "x".repeat(200),
        selectedOptions: [{ optionId: uuid, quantity: 999 }],
      }).success,
    ).toBe(true);
    expect(
      itemCustomizationSchema.safeParse({
        ...item,
        chefNotes: "x",
        selectedOptions: [{ optionId: uuid, quantity: 1000 }],
      }).success,
    ).toBe(false);
  });
});
