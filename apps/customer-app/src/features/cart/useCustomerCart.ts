import {
  useCallback,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { CustomerMenuItem } from "@/api";
import { estimateComboLine } from "./combo";
import { getCartSummary, type CartLine } from "./pricing";
import { useComboCart } from "./useComboCart";
import { useItemCartConfiguration } from "./useItemCartConfiguration";

type FulfillmentType = "DINE_IN" | "TAKEAWAY";

type UseCustomerCartInput = {
  menu: CustomerMenuItem[];
  cart: CartLine[];
  setCart: Dispatch<SetStateAction<CartLine[]>>;
  sessionMode: FulfillmentType;
  clearError: () => void;
};

export const useCustomerCart = ({
  menu,
  cart,
  setCart,
  sessionMode,
  clearError,
}: UseCustomerCartInput) => {
  const itemConfiguration = useItemCartConfiguration({
    cart,
    setCart,
    sessionMode,
    clearError,
  });
  const combo = useComboCart({ clearError });

  const menuById = useMemo(
    () => new Map(menu.map((item) => [item.id, item] as const)),
    [menu],
  );

  const summary = useMemo(() => {
    const cartSummary = getCartSummary(cart);
    const comboSummary = combo.comboCart.reduce(
      (current, line) => {
        const estimate = estimateComboLine(line, menuById);
        current.subtotal += estimate.subtotal;
        current.tax += estimate.tax;
        current.total += estimate.total;
        current.itemCount += line.quantity;
        return current;
      },
      { subtotal: 0, tax: 0, total: 0, itemCount: 0 },
    );
    return {
      subtotal: cartSummary.subtotal + comboSummary.subtotal,
      tax: cartSummary.tax + comboSummary.tax,
      total: cartSummary.total + comboSummary.total,
      itemCount: cartSummary.itemCount + comboSummary.itemCount,
    };
  }, [cart, combo.comboCart, menuById]);

  const changeQuantity = useCallback(
    (index: number, delta: number) => {
      setCart((current) =>
        current.flatMap((line, currentIndex) =>
          currentIndex !== index
            ? [line]
            : line.quantity + delta > 0
              ? [{ ...line, quantity: line.quantity + delta }]
              : [],
        ),
      );
    },
    [setCart],
  );

  const clearCart = useCallback(() => {
    setCart([]);
    combo.clearComboCart();
  }, [combo, setCart]);

  return {
    ...itemConfiguration,
    comboCart: combo.comboCart,
    selectedCombo: combo.selectedCombo,
    comboSelections: combo.comboSelections,
    menuById,
    summary,
    openCombo: combo.openCombo,
    closeCombo: combo.closeCombo,
    toggleComboOption: combo.toggleComboOption,
    addSelectedCombo: combo.addSelectedCombo,
    changeComboQuantity: combo.changeComboQuantity,
    changeQuantity,
    clearCart,
  };
};
