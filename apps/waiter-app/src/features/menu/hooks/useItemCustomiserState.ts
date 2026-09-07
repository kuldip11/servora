import { useReducer } from "react";
import type { CartItem, SelectedModifier } from "@/features/menu/types";
import type { OrderableMenuItem } from "@pos/types";

type ZoneLabel = "LEFT" | "RIGHT" | "WHOLE";

type ItemCustomiserState = {
  activeZone: ZoneLabel;
  variantId: string;
  selections: Record<string, SelectedModifier[]>;
  chefNotes: string;
  seatLabel: string;
  course: number;
  quantity: number;
  weightQuantity: string;
  manualPrice: string;
  guidedStep: number;
};

type ToggleModifierAction = {
  type: "toggleModifier";
  bucket: string;
  selectionType: "SINGLE" | "MULTIPLE";
  maxSelections?: number | null;
  modifier: SelectedModifier;
};

type ItemCustomiserAction =
  | { type: "activeZoneChanged"; value: ZoneLabel }
  | { type: "variantChanged"; value: string }
  | ToggleModifierAction
  | {
      type: "modifierQuantityChanged";
      bucket: string;
      optionId: string;
      value: number;
      maxQuantity: number;
    }
  | { type: "chefNotesChanged"; value: string }
  | { type: "seatLabelChanged"; value: string }
  | { type: "courseChanged"; value: number }
  | { type: "quantityChanged"; value: number }
  | { type: "weightQuantityChanged"; value: string }
  | { type: "manualPriceChanged"; value: string }
  | { type: "guidedStepChanged"; value: number };

const reducer = (
  state: ItemCustomiserState,
  action: ItemCustomiserAction,
): ItemCustomiserState => {
  switch (action.type) {
    case "activeZoneChanged":
      return { ...state, activeZone: action.value };
    case "variantChanged":
      return { ...state, variantId: action.value };
    case "toggleModifier": {
      const current = state.selections[action.bucket] ?? [];
      const existing = current.find(
        (modifier) => modifier.optionId === action.modifier.optionId,
      );
      let next: SelectedModifier[];
      if (action.selectionType === "SINGLE") {
        next = existing ? [] : [action.modifier];
      } else if (existing) {
        next = current.filter(
          (modifier) => modifier.optionId !== action.modifier.optionId,
        );
      } else if (
        action.maxSelections != null &&
        current.length >= action.maxSelections
      ) {
        return state;
      } else {
        next = [...current, action.modifier];
      }
      return {
        ...state,
        selections: { ...state.selections, [action.bucket]: next },
      };
    }
    case "modifierQuantityChanged":
      return {
        ...state,
        selections: {
          ...state.selections,
          [action.bucket]: (state.selections[action.bucket] ?? []).map(
            (modifier) =>
              modifier.optionId === action.optionId
                ? {
                    ...modifier,
                    quantity: Math.max(
                      1,
                      Math.min(action.value, action.maxQuantity),
                    ),
                  }
                : modifier,
          ),
        },
      };
    case "chefNotesChanged":
      return { ...state, chefNotes: action.value };
    case "seatLabelChanged":
      return { ...state, seatLabel: action.value };
    case "courseChanged":
      return { ...state, course: action.value };
    case "quantityChanged":
      return { ...state, quantity: Math.max(1, action.value) };
    case "weightQuantityChanged":
      return { ...state, weightQuantity: action.value };
    case "manualPriceChanged":
      return { ...state, manualPrice: action.value };
    case "guidedStepChanged":
      return { ...state, guidedStep: Math.max(0, action.value) };
  }
};

const buildInitialState = (
  item: OrderableMenuItem,
  existingCartItem: CartItem | undefined,
  zoned: boolean,
): ItemCustomiserState => {
  const selections: Record<string, SelectedModifier[]> = {};
  for (const modifier of existingCartItem?.modifiers ?? []) {
    const bucket = zoned
      ? `${modifier.groupId}:${modifier.zoneLabel ?? "WHOLE"}`
      : modifier.groupId;
    (selections[bucket] ??= []).push(modifier);
  }

  return {
    activeZone: "LEFT",
    variantId:
      existingCartItem?.variantId ??
      (item.variants?.length ? (item.variants[0]?.id ?? "") : ""),
    selections,
    chefNotes: existingCartItem?.chefNotes ?? "",
    seatLabel: existingCartItem?.seatLabel ?? "",
    course: existingCartItem?.course ?? 1,
    quantity: existingCartItem?.quantity ?? 1,
    weightQuantity:
      existingCartItem?.weightQuantity != null
        ? String(existingCartItem.weightQuantity)
        : "",
    manualPrice:
      existingCartItem?.manualPrice != null
        ? String(existingCartItem.manualPrice)
        : "",
    guidedStep: 0,
  };
};

export const useItemCustomiserState = (
  item: OrderableMenuItem,
  existingCartItem: CartItem | undefined,
  zoned: boolean,
) => {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    buildInitialState(item, existingCartItem, zoned),
  );

  return {
    ...state,
    changeActiveZone: (value: ZoneLabel) =>
      dispatch({ type: "activeZoneChanged", value }),
    changeVariant: (value: string) =>
      dispatch({ type: "variantChanged", value }),
    toggleModifier: (action: Omit<ToggleModifierAction, "type">) =>
      dispatch({ type: "toggleModifier", ...action }),
    changeModifierQuantity: (
      bucket: string,
      optionId: string,
      value: number,
      maxQuantity: number,
    ) =>
      dispatch({
        type: "modifierQuantityChanged",
        bucket,
        optionId,
        value,
        maxQuantity,
      }),
    changeChefNotes: (value: string) =>
      dispatch({ type: "chefNotesChanged", value }),
    changeSeatLabel: (value: string) =>
      dispatch({ type: "seatLabelChanged", value }),
    changeCourse: (value: number) => dispatch({ type: "courseChanged", value }),
    changeQuantity: (value: number) =>
      dispatch({ type: "quantityChanged", value }),
    changeWeightQuantity: (value: string) =>
      dispatch({ type: "weightQuantityChanged", value }),
    changeManualPrice: (value: string) =>
      dispatch({ type: "manualPriceChanged", value }),
    changeGuidedStep: (value: number) =>
      dispatch({ type: "guidedStepChanged", value }),
  };
};
