import { InternalError } from "@/core/errors";
import type {
  CustomerCheckoutResponse,
  CustomerMenuResponse,
  CustomerSessionResponse,
  CustomerTakeawayPaymentResponse,
} from "@pos/contracts";
import { toOrderResponse } from "@/modules/orders/order.mapper";
import type { customerMenuService } from "./customer-menu.service";
import type { customerSessionService } from "./customer-session.service";
import type { customerPaymentService } from "./customer-payment.service";

export { toOrderResponse as toCustomerOrderResponse };

type CustomerSessionAggregate = Awaited<
  ReturnType<typeof customerSessionService.createSession>
>;
type CustomerMenuAggregate = Awaited<
  ReturnType<typeof customerMenuService.getMenu>
>;
type CustomerCheckoutAggregate = Awaited<
  ReturnType<typeof customerPaymentService.checkout>
>;
type CustomerTakeawayPaymentAggregate = Awaited<
  ReturnType<typeof customerPaymentService.initiateTakeawayPayment>
>;

const iso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : value;

export const toCustomerSessionResponse = (
  value: CustomerSessionAggregate,
): CustomerSessionResponse => ({
  sessionToken: value.sessionToken,
  expiresAt: iso(value.expiresAt),
  mode: value.mode,
  restaurant: {
    id: value.restaurant.id,
    name: value.restaurant.name,
  },
  table: value.table
    ? {
        id: value.table.id,
        name: value.table.name,
        section: value.table.section,
      }
    : null,
});

export const toCustomerMenuResponse = (
  value: CustomerMenuAggregate,
): CustomerMenuResponse => ({
  restaurant: {
    id: value.restaurant.id,
    name: value.restaurant.name,
    address: value.restaurant.address,
  },
  mode: value.mode,
  table: value.table
    ? {
        id: value.table.id,
        name: value.table.name,
        section: value.table.section,
      }
    : null,
  categories: value.categories.map((category) => ({
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
  })),
  combos: value.combos.map((combo) => ({
    id: combo.id,
    name: combo.name,
    description: combo.description,
    pricePolicy: combo.pricePolicy,
    fixedPrice: combo.fixedPrice,
    percentOff: combo.percentOff,
    slots: combo.slots.map((slot) => ({
      id: slot.id,
      name: slot.name,
      minSelections: slot.minSelections,
      maxSelections: slot.maxSelections,
      sortOrder: slot.sortOrder,
      options: slot.options.map((option) => ({
        id: option.id,
        menuItemId: option.menuItemId,
        variantId: option.variantId,
        upcharge: option.upcharge,
      })),
    })),
  })),
  items: value.items.map((item) => ({
    id: item.id,
    categoryId: item.categoryId,
    name: item.name,
    description: item.description,
    basePrice: item.basePrice,
    taxRate: item.taxRate,
    imageUrl: item.imageUrl,
    foodType: item.foodType,
    spiceLevel: item.spiceLevel,
    prepTimeMinutes: item.prepTimeMinutes,
    displayMode: item.displayMode,
    pricingMode: item.pricingMode,
    weightUnit: item.weightUnit,
    openPriceMin: item.openPriceMin,
    openPriceMax: item.openPriceMax,
    supportsZones: item.supportsZones,
    zonePricingRule: item.zonePricingRule,
    manualStockCount: item.manualStockCount,
    variants: item.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      price: variant.price,
      status: variant.status,
      manualOverrideStatus: variant.manualOverrideStatus,
      manualOverrideReason: variant.manualOverrideReason,
      manualStockCount: variant.manualStockCount,
    })),
    modifierGroupLinks: item.modifierGroupLinks.map((link) => ({
      sortOrder: link.sortOrder,
      group: {
        id: link.group.id,
        name: link.group.name,
        selectionType: link.group.selectionType,
        minSelections: link.group.minSelections,
        maxSelections: link.group.maxSelections,
        dependsOnOptionId: link.group.dependsOnOptionId,
        options: link.group.options.map((option) => ({
          id: option.id,
          name: option.name,
          additionalPrice: option.additionalPrice,
          isAvailable: option.isAvailable,
          maxQuantity: option.maxQuantity,
          isDefault: option.isDefault,
        })),
      },
    })),
    tagLinks: item.tagLinks.map((link) => ({
      tag: { name: link.tag.name },
    })),
    images: item.images.map((image) => ({
      url: image.url,
      sortOrder: image.sortOrder,
    })),
  })),
});

export const toCustomerCheckoutResponse = (
  value: CustomerCheckoutAggregate,
): CustomerCheckoutResponse => {
  if (!value.payment) {
    throw new InternalError("Customer checkout payment response is incomplete");
  }
  if (value.payment.method !== "CASH" || value.method !== "CASH") {
    throw new InternalError(
      "Customer checkout returned an unsupported payment method",
    );
  }
  return {
    payment: {
      id: value.payment.id,
      method: "CASH",
      status: value.payment.status,
      amount: value.payment.amount,
      reference: value.payment.reference,
    },
    orderStatus: value.orderStatus,
    paymentRequired: value.paymentRequired,
    method: "CASH",
  };
};

export const toCustomerTakeawayPaymentResponse = (
  value: CustomerTakeawayPaymentAggregate,
): CustomerTakeawayPaymentResponse => {
  if (!value.gatewayOrderId) {
    throw new InternalError(
      "Takeaway payment gateway order was not initialized",
    );
  }
  return {
    id: value.id,
    amount: value.amount,
    reference: value.reference,
    gatewayOrderId: value.gatewayOrderId,
  };
};
