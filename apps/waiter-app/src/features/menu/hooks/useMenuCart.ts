import { useState } from "react";
import { toast } from "@pos/ui";
import type { OrderableMenuItem } from "@pos/types";

import type { CartItem } from "@/features/menu/types";
import type {
  WaiterCombo,
  WaiterComboCartLine,
  WaiterComboSelection,
} from "@/features/menu/combo";
import { comboLineKey } from "@/features/menu/combo";
import { cartItemKey, replaceCartItem } from "@/features/menu/utils/cart";

type Params = {
  allItems: OrderableMenuItem[];
  courseMode: boolean;
  isAddingToExisting: boolean;
  onCartVisibilityChange: (visible: boolean) => void;
};

export const useMenuCart = ({
  allItems,
  courseMode,
  isAddingToExisting,
  onCartVisibilityChange,
}: Params) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [comboCart, setComboCart] = useState<WaiterComboCartLine[]>([]);
  const [customisingCombo, setCustomisingCombo] = useState<WaiterCombo | null>(
    null,
  );
  const [comboSelections, setComboSelections] = useState<
    WaiterComboSelection[]
  >([]);
  const [customising, setCustomising] = useState<{
    item: OrderableMenuItem;
    existingCartItem?: CartItem;
    originalKey?: string;
  } | null>(null);

  const addOrIncrementItem = (newItem: CartItem) => {
    setCart((previous) => {
      const key = cartItemKey(newItem);
      const existing = previous.find((item) => cartItemKey(item) === key);
      if (existing) {
        return previous.map((item) =>
          cartItemKey(item) === key
            ? { ...item, quantity: item.quantity + newItem.quantity }
            : item,
        );
      }
      return [...previous, newItem];
    });
    toast({ title: `${newItem.name} added`, tone: "success", duration: 1000 });
  };

  const handleItemTap = (item: OrderableMenuItem) => {
    const hasOptions =
      item.variants?.length > 0 ||
      item.modifierGroupLinks?.length > 0 ||
      item.supportsZones === true ||
      item.pricingMode === "WEIGHT_BASED" ||
      item.pricingMode === "OPEN";
    if (hasOptions) {
      setCustomising({ item });
      return;
    }
    addOrIncrementItem({
      menuItemId: item.id,
      name: item.name,
      basePrice: Number(item.basePrice),
      modifiers: [],
      chefNotes: "",
      seatLabel: "",
      ...(courseMode ? { course: 1 } : {}),
      quantity: 1,
      unitPrice: Number(item.basePrice),
    });
  };

  const confirmCustomisedItem = (newItem: CartItem) => {
    const originalKey = customising?.originalKey;
    if (!originalKey) {
      addOrIncrementItem(newItem);
      return;
    }
    setCart((previous) => replaceCartItem(previous, originalKey, newItem));
    toast({
      title: `${newItem.name} updated`,
      tone: "success",
      duration: 1000,
    });
  };

  const editCartItem = (key: string) => {
    const existingCartItem = cart.find((item) => cartItemKey(item) === key);
    if (!existingCartItem) return;
    const menuItem = allItems.find(
      (item) => item.id === existingCartItem.menuItemId,
    );
    if (!menuItem) {
      toast({
        title: "This menu item is no longer available to edit",
        tone: "danger",
      });
      return;
    }
    onCartVisibilityChange(false);
    setCustomising({ item: menuItem, existingCartItem, originalKey: key });
  };

  const updateQty = (key: string, delta: number) => {
    setCart((previous) =>
      previous
        .map((item) =>
          cartItemKey(item) === key
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const openCombo = (combo: WaiterCombo) => {
    setCustomisingCombo(combo);
    setComboSelections(
      combo.slots.map((slot) => ({ slotId: slot.id, optionIds: [] })),
    );
  };

  const toggleComboOption = (slotId: string, optionId: string) => {
    if (!customisingCombo) return;
    const slot = customisingCombo.slots.find((value) => value.id === slotId);
    if (!slot) return;
    setComboSelections((previous) =>
      previous.map((selection) => {
        if (selection.slotId !== slotId) return selection;
        if (selection.optionIds.includes(optionId)) {
          return {
            ...selection,
            optionIds: selection.optionIds.filter((id) => id !== optionId),
          };
        }
        if (selection.optionIds.length >= slot.maxSelections) {
          return slot.maxSelections === 1
            ? { ...selection, optionIds: [optionId] }
            : selection;
        }
        return { ...selection, optionIds: [...selection.optionIds, optionId] };
      }),
    );
  };

  const addSelectedCombo = () => {
    if (!customisingCombo) return;
    const line: WaiterComboCartLine = {
      combo: customisingCombo,
      quantity: 1,
      selections: comboSelections,
      ...(courseMode && !isAddingToExisting ? { courseNumber: 1 } : {}),
    };
    const key = comboLineKey(line);
    setComboCart((previous) => {
      const existing = previous.find((value) => comboLineKey(value) === key);
      if (existing) {
        return previous.map((value) =>
          comboLineKey(value) === key
            ? { ...value, quantity: value.quantity + 1 }
            : value,
        );
      }
      return [...previous, line];
    });
    setCustomisingCombo(null);
    setComboSelections([]);
    toast({
      title: `${customisingCombo.name} added`,
      tone: "success",
      duration: 1000,
    });
  };

  const updateComboQty = (key: string, delta: number) => {
    setComboCart((previous) =>
      previous
        .map((value) =>
          comboLineKey(value) === key
            ? { ...value, quantity: value.quantity + delta }
            : value,
        )
        .filter((value) => value.quantity > 0),
    );
  };

  const setCourseModeEnabled = (enabled: boolean) => {
    setCart((current) =>
      current.map((item) =>
        enabled
          ? { ...item, course: item.course ?? 1 }
          : (({ course: _course, ...rest }) => rest)(item),
      ),
    );
    setComboCart((current) =>
      current.map((line) =>
        enabled
          ? { ...line, courseNumber: line.courseNumber ?? 1 }
          : (({ courseNumber: _courseNumber, ...rest }) => rest)(line),
      ),
    );
  };

  const updateItemCourse = (key: string, course: number) => {
    setCart((current) =>
      current.map((item) =>
        cartItemKey(item) === key ? { ...item, course } : item,
      ),
    );
  };
  const updateComboCourse = (key: string, courseNumber: number) => {
    setComboCart((current) =>
      current.map((line) =>
        comboLineKey(line) === key ? { ...line, courseNumber } : line,
      ),
    );
  };

  return {
    cart,
    comboCart,
    customising,
    customisingCombo,
    comboSelections,
    setCustomising,
    setCustomisingCombo,
    setComboSelections,
    handleItemTap,
    confirmCustomisedItem,
    editCartItem,
    updateQty,
    openCombo,
    toggleComboOption,
    addSelectedCombo,
    updateComboQty,
    setCourseModeEnabled,
    updateItemCourse,
    updateComboCourse,
  };
};
