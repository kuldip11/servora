import { toast } from "@pos/ui";
import { addOrderItemsSchema, createOrderSchema } from "@pos/validation";

import type { CartItem } from "@/features/menu/types";
import type { WaiterComboCartLine } from "@/features/menu/combo";
import type {
  WaiterBillingMode,
  WaiterOrderType,
} from "@/features/menu/hooks/useOrderDraft";
import type { AddOrderItemInput } from "@/features/orders/api/orders";
import type { CreateOrderInput } from "@/features/orders/api/createOrder";
import { useAddOrderItems } from "@/features/orders/hooks/useAddOrderItems";
import { useCreateOrder } from "@/features/orders/hooks/useCreateOrder";

type Params = {
  cart: CartItem[];
  comboCart: WaiterComboCartLine[];
  courseMode: boolean;
  roundCourseNumber: number;
  isAddingToExisting: boolean;
  existingOrderId?: string;
  orderType: WaiterOrderType;
  tableId: string;
  customerId: string;
  customerGroupId: string;
  billingMode: WaiterBillingMode;
  coverCount: number;
  perCoverPriceRuleId: string;
  orderNotes: string;
  couponCode: string;
  selectedPromotionIds: string[];
  onOrderPlaced: (orderId: string) => void;
};

const toOrderItems = (
  cart: CartItem[],
  courseMode: boolean,
  isAddingToExisting: boolean,
  roundCourseNumber: number,
): AddOrderItemInput[] =>
  cart.map((item) => {
    const result: AddOrderItemInput = {
      menuItemId: item.menuItemId,
      quantity: item.quantity,
    };
    if (item.variantId) result.variantId = item.variantId;
    if (item.chefNotes) result.chefNotes = item.chefNotes;
    if (item.seatLabel) result.seatLabel = item.seatLabel;
    if (item.weightQuantity !== undefined)
      result.weightQuantity = item.weightQuantity;
    if (item.manualPrice !== undefined) result.manualPrice = item.manualPrice;
    if (courseMode) {
      result.courseNumber = isAddingToExisting
        ? roundCourseNumber
        : (item.course ?? 1);
    }
    if (item.modifiers.length) {
      result.selectedOptions = item.modifiers.map((modifier) => ({
        optionId: modifier.optionId,
        quantity: modifier.quantity,
        ...(modifier.zoneLabel ? { zoneLabel: modifier.zoneLabel } : {}),
      }));
    }
    return result;
  });

const toOrderCombos = (
  comboCart: WaiterComboCartLine[],
  courseMode: boolean,
  isAddingToExisting: boolean,
  roundCourseNumber: number,
) =>
  comboCart.map((line) => ({
    comboId: line.combo.id,
    quantity: line.quantity,
    selections: line.selections,
    ...(courseMode
      ? {
          courseNumber: isAddingToExisting
            ? roundCourseNumber
            : (line.courseNumber ?? 1),
        }
      : {}),
  }));

export const useMenuOrderSubmission = ({
  cart,
  comboCart,
  courseMode,
  roundCourseNumber,
  isAddingToExisting,
  existingOrderId,
  orderType,
  tableId,
  customerId,
  customerGroupId,
  billingMode,
  coverCount,
  perCoverPriceRuleId,
  orderNotes,
  couponCode,
  selectedPromotionIds,
  onOrderPlaced,
}: Params) => {
  const addItemsMutation = useAddOrderItems();
  const createOrderMutation = useCreateOrder();

  const submit = () => {
    const items = toOrderItems(
      cart,
      courseMode,
      isAddingToExisting,
      roundCourseNumber,
    );
    const combos = toOrderCombos(
      comboCart,
      courseMode,
      isAddingToExisting,
      roundCourseNumber,
    );

    if (isAddingToExisting) {
      if (!existingOrderId) return;
      const validated = addOrderItemsSchema.safeParse({
        ...(items.length ? { items } : {}),
        ...(combos.length ? { combos } : {}),
        ...(orderNotes ? { notes: orderNotes } : {}),
      });
      if (!validated.success) {
        toast({ title: "Please check the order details", tone: "danger" });
        return;
      }
      addItemsMutation.mutate(
        {
          orderId: existingOrderId,
          items,
          combos,
          ...(orderNotes ? { notes: orderNotes } : {}),
          ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
          ...(selectedPromotionIds.length
            ? { promotionIds: selectedPromotionIds }
            : {}),
        },
        { onSuccess: () => onOrderPlaced(existingOrderId) },
      );
      return;
    }

    const validated = createOrderSchema.safeParse({
      type: orderType,
      ...(orderType === "DINE_IN" && tableId ? { tableId } : {}),
      ...(customerId ? { customerId } : {}),
      ...(customerGroupId ? { customerGroupId } : {}),
      billingMode,
      ...(billingMode === "PER_COVER"
        ? { coverCount, perCoverPriceRuleId }
        : {}),
      ...(orderNotes ? { notes: orderNotes } : {}),
      ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
      ...(selectedPromotionIds.length
        ? { promotionIds: selectedPromotionIds }
        : {}),
      ...(items.length ? { items } : {}),
      ...(combos.length ? { combos } : {}),
    });
    if (!validated.success) {
      toast({ title: "Please check the order details", tone: "danger" });
      return;
    }

    const input: CreateOrderInput = {
      type: validated.data.type,
      ...(items.length ? { items } : {}),
      ...(combos.length ? { combos } : {}),
      ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
      ...(selectedPromotionIds.length
        ? { promotionIds: selectedPromotionIds }
        : {}),
      ...(validated.data.tableId ? { tableId: validated.data.tableId } : {}),
      ...(validated.data.customerId
        ? { customerId: validated.data.customerId }
        : {}),
      ...(customerGroupId ? { customerGroupId } : {}),
      billingMode,
      ...(billingMode === "PER_COVER"
        ? { coverCount, perCoverPriceRuleId }
        : {}),
      ...(validated.data.notes ? { notes: validated.data.notes } : {}),
    };
    createOrderMutation.mutate(input, {
      onSuccess: (data) => onOrderPlaced(data.id),
    });
  };

  return {
    submit,
    isPending: addItemsMutation.isPending || createOrderMutation.isPending,
  };
};
