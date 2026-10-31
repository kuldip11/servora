import type { CreateCustomerOrderInput } from "@/features/order/api";
import type { CartLine } from "@/features/cart";
import { normalizeSelectedOptions } from "@/features/cart";

export const createOrderPayload = (
  cart: CartLine[],
  fulfillmentType: "DINE_IN" | "TAKEAWAY",
): CreateCustomerOrderInput => {
  return {
    fulfillmentType,
    items: cart.map((line) => ({
      menuItemId: line.item.id,
      quantity: line.quantity,
      ...(line.variantId ? { variantId: line.variantId } : {}),
      ...(line.selectedOptions.length
        ? { selectedOptions: normalizeSelectedOptions(line.selectedOptions) }
        : {}),
      fulfillmentType,
    })),
  };
};
