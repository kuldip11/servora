import {
  useCallback,
  useMemo,
  useReducer,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { CustomerMenuItem } from "@/api";
import {
  canAddItemConfiguration,
  normalizeSelectedOptions,
} from "./configuration";
import { getCartLineKey, type CartLine, type SelectedOption } from "./pricing";

type FulfillmentType = "DINE_IN" | "TAKEAWAY";

type ItemConfigurationState = {
  selectedItem: CustomerMenuItem | null;
  selectedVariantId: string | undefined;
  selectedOptions: SelectedOption[];
  selectedQuantity: number;
  editingCartIndex: number | null;
};

type ItemConfigurationAction =
  | { type: "OPEN_ITEM"; item: CustomerMenuItem }
  | { type: "OPEN_CART_ITEM"; line: CartLine; index: number }
  | { type: "CLOSE" }
  | { type: "SET_VARIANT"; variantId: string | undefined }
  | { type: "SET_QUANTITY"; quantity: number }
  | { type: "SET_OPTIONS"; options: SelectedOption[] };

const initialState: ItemConfigurationState = {
  selectedItem: null,
  selectedVariantId: undefined,
  selectedOptions: [],
  selectedQuantity: 1,
  editingCartIndex: null,
};

const itemConfigurationReducer = (
  state: ItemConfigurationState,
  action: ItemConfigurationAction,
): ItemConfigurationState => {
  switch (action.type) {
    case "OPEN_ITEM":
      return {
        selectedItem: action.item,
        selectedVariantId:
          action.item.variants.length === 1
            ? action.item.variants[0]?.id
            : undefined,
        selectedOptions: [],
        selectedQuantity: 1,
        editingCartIndex: null,
      };
    case "OPEN_CART_ITEM":
      return {
        selectedItem: action.line.item,
        selectedVariantId: action.line.variantId,
        selectedOptions: action.line.selectedOptions,
        selectedQuantity: action.line.quantity,
        editingCartIndex: action.index,
      };
    case "CLOSE":
      return initialState;
    case "SET_VARIANT":
      return { ...state, selectedVariantId: action.variantId };
    case "SET_QUANTITY":
      return { ...state, selectedQuantity: action.quantity };
    case "SET_OPTIONS":
      return { ...state, selectedOptions: action.options };
  }
};

type UseItemCartConfigurationInput = {
  cart: CartLine[];
  setCart: Dispatch<SetStateAction<CartLine[]>>;
  sessionMode: FulfillmentType;
  clearError: () => void;
};

export const useItemCartConfiguration = ({
  cart,
  setCart,
  sessionMode,
  clearError,
}: UseItemCartConfigurationInput) => {
  const [state, dispatch] = useReducer(itemConfigurationReducer, initialState);

  const openItem = useCallback(
    (item: CustomerMenuItem) => {
      dispatch({ type: "OPEN_ITEM", item });
      clearError();
    },
    [clearError],
  );

  const closeItem = useCallback(() => dispatch({ type: "CLOSE" }), []);

  const openCartItem = useCallback(
    (index: number) => {
      const line = cart[index];
      if (!line) return;
      dispatch({ type: "OPEN_CART_ITEM", line, index });
      clearError();
    },
    [cart, clearError],
  );

  const setSelectedVariantId = useCallback((variantId?: string) => {
    dispatch({ type: "SET_VARIANT", variantId });
  }, []);

  const setSelectedQuantity = useCallback((quantity: number) => {
    dispatch({ type: "SET_QUANTITY", quantity });
  }, []);

  const toggleOption = useCallback(
    (
      optionId: string,
      groupId: string,
      zoneLabel?: "LEFT" | "RIGHT" | "WHOLE",
    ) => {
      const group = state.selectedItem?.modifierGroupLinks.find(
        ({ group: value }) => value.id === groupId,
      )?.group;
      if (!group) return;

      const normalizedZone = zoneLabel ?? "WHOLE";
      const existing = state.selectedOptions.find(
        (selection) =>
          selection.optionId === optionId &&
          (selection.zoneLabel ?? "WHOLE") === normalizedZone,
      );

      let options: SelectedOption[];
      if (existing) {
        options = state.selectedOptions.filter(
          (selection) =>
            !(
              selection.optionId === optionId &&
              (selection.zoneLabel ?? "WHOLE") === normalizedZone
            ),
        );
      } else if (group.selectionType === "SINGLE") {
        options = [
          ...state.selectedOptions.filter(
            (selection) =>
              !(
                group.options.some(
                  (option) => option.id === selection.optionId,
                ) && (selection.zoneLabel ?? "WHOLE") === normalizedZone
              ),
          ),
          { optionId, quantity: 1, ...(zoneLabel ? { zoneLabel } : {}) },
        ];
      } else {
        const selectedCount = state.selectedOptions.filter(
          (selection) =>
            group.options.some((option) => option.id === selection.optionId) &&
            (selection.zoneLabel ?? "WHOLE") === normalizedZone,
        ).length;
        if (
          group.maxSelections != null &&
          selectedCount >= group.maxSelections
        ) {
          return;
        }
        options = [
          ...state.selectedOptions,
          { optionId, quantity: 1, ...(zoneLabel ? { zoneLabel } : {}) },
        ];
      }
      dispatch({ type: "SET_OPTIONS", options });
    },
    [state.selectedItem, state.selectedOptions],
  );

  const changeOptionQuantity = useCallback(
    (
      optionId: string,
      delta: number,
      zoneLabel?: "LEFT" | "RIGHT" | "WHOLE",
    ) => {
      const options = state.selectedOptions.flatMap((selection) => {
        if (
          selection.optionId !== optionId ||
          (selection.zoneLabel ?? "WHOLE") !== (zoneLabel ?? "WHOLE")
        ) {
          return [selection];
        }
        const option = state.selectedItem?.modifierGroupLinks
          .flatMap(({ group }) => group.options)
          .find((value) => value.id === optionId);
        const next = selection.quantity + delta;
        if (next <= 0) return [];
        if (option && next > option.maxQuantity) return [selection];
        return [{ ...selection, quantity: next }];
      });
      dispatch({ type: "SET_OPTIONS", options });
    },
    [state.selectedItem, state.selectedOptions],
  );

  const canAddSelectedItem = useMemo(
    () =>
      state.selectedItem
        ? canAddItemConfiguration(
            state.selectedItem,
            state.selectedVariantId,
            state.selectedOptions,
          )
        : false,
    [state.selectedItem, state.selectedOptions, state.selectedVariantId],
  );

  const addSelectedItem = useCallback(() => {
    if (!state.selectedItem || !canAddSelectedItem) return;
    const newLine: CartLine = {
      item: state.selectedItem,
      quantity: state.selectedQuantity,
      ...(state.selectedVariantId
        ? { variantId: state.selectedVariantId }
        : {}),
      selectedOptions: normalizeSelectedOptions(state.selectedOptions),
      fulfillmentType: sessionMode,
    };

    setCart((current) => {
      if (state.editingCartIndex != null && current[state.editingCartIndex]) {
        return current.map((line, index) =>
          index === state.editingCartIndex ? newLine : line,
        );
      }
      const key = getCartLineKey(newLine);
      const index = current.findIndex((line) => getCartLineKey(line) === key);
      if (index === -1) return [...current, newLine];
      return current.map((line, indexToUpdate) =>
        indexToUpdate === index
          ? { ...line, quantity: line.quantity + state.selectedQuantity }
          : line,
      );
    });
    closeItem();
  }, [canAddSelectedItem, closeItem, sessionMode, setCart, state]);

  return {
    ...state,
    setSelectedVariantId,
    setSelectedQuantity,
    openItem,
    openCartItem,
    closeItem,
    toggleOption,
    changeOptionQuantity,
    addSelectedItem,
  };
};
