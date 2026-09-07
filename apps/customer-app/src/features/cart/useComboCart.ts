import { useCallback, useReducer } from "react";
import type { CustomerCombo } from "@/api";
import {
  comboLineKey,
  type ComboCartLine,
  type CustomerComboSelection,
} from "./combo";

type ComboState = {
  comboCart: ComboCartLine[];
  selectedCombo: CustomerCombo | null;
  comboSelections: CustomerComboSelection[];
};

type ComboAction =
  | { type: "OPEN"; combo: CustomerCombo }
  | { type: "CLOSE" }
  | { type: "SET_SELECTIONS"; selections: CustomerComboSelection[] }
  | { type: "ADD_LINE"; line: ComboCartLine }
  | { type: "CHANGE_QUANTITY"; index: number; delta: number }
  | { type: "CLEAR" };

const initialState: ComboState = {
  comboCart: [],
  selectedCombo: null,
  comboSelections: [],
};

const comboReducer = (state: ComboState, action: ComboAction): ComboState => {
  switch (action.type) {
    case "OPEN":
      return {
        ...state,
        selectedCombo: action.combo,
        comboSelections: action.combo.slots.map((slot) => ({
          slotId: slot.id,
          optionIds:
            slot.minSelections === 1 &&
            slot.maxSelections === 1 &&
            slot.options.length === 1
              ? [slot.options[0]!.id]
              : [],
        })),
      };
    case "CLOSE":
      return { ...state, selectedCombo: null, comboSelections: [] };
    case "SET_SELECTIONS":
      return { ...state, comboSelections: action.selections };
    case "ADD_LINE": {
      const key = comboLineKey(action.line);
      const index = state.comboCart.findIndex(
        (line) => comboLineKey(line) === key,
      );
      const comboCart =
        index === -1
          ? [...state.comboCart, action.line]
          : state.comboCart.map((line, currentIndex) =>
              currentIndex === index
                ? { ...line, quantity: line.quantity + 1 }
                : line,
            );
      return {
        comboCart,
        selectedCombo: null,
        comboSelections: [],
      };
    }
    case "CHANGE_QUANTITY":
      return {
        ...state,
        comboCart: state.comboCart.flatMap((line, currentIndex) =>
          currentIndex !== action.index
            ? [line]
            : line.quantity + action.delta > 0
              ? [{ ...line, quantity: line.quantity + action.delta }]
              : [],
        ),
      };
    case "CLEAR":
      return initialState;
  }
};

type UseComboCartInput = {
  clearError: () => void;
};

export const useComboCart = ({ clearError }: UseComboCartInput) => {
  const [state, dispatch] = useReducer(comboReducer, initialState);

  const openCombo = useCallback(
    (combo: CustomerCombo) => {
      dispatch({ type: "OPEN", combo });
      clearError();
    },
    [clearError],
  );

  const closeCombo = useCallback(() => dispatch({ type: "CLOSE" }), []);

  const toggleComboOption = useCallback(
    (slotId: string, optionId: string) => {
      if (!state.selectedCombo) return;
      const slot = state.selectedCombo.slots.find(
        (value) => value.id === slotId,
      );
      if (!slot) return;

      const selections = state.comboSelections.map((selection) => {
        if (selection.slotId !== slotId) return selection;
        const selected = selection.optionIds.includes(optionId);
        if (selected) {
          return {
            ...selection,
            optionIds: selection.optionIds.filter((id) => id !== optionId),
          };
        }
        if (slot.maxSelections === 1) {
          return { ...selection, optionIds: [optionId] };
        }
        if (selection.optionIds.length >= slot.maxSelections) return selection;
        return {
          ...selection,
          optionIds: [...selection.optionIds, optionId],
        };
      });
      dispatch({ type: "SET_SELECTIONS", selections });
    },
    [state.comboSelections, state.selectedCombo],
  );

  const addSelectedCombo = useCallback(() => {
    if (!state.selectedCombo) return;
    const valid = state.selectedCombo.slots.every((slot) => {
      const count =
        state.comboSelections.find((value) => value.slotId === slot.id)
          ?.optionIds.length ?? 0;
      return count >= slot.minSelections && count <= slot.maxSelections;
    });
    if (!valid) return;

    dispatch({
      type: "ADD_LINE",
      line: {
        combo: state.selectedCombo,
        quantity: 1,
        selections: state.comboSelections,
      },
    });
  }, [state.comboSelections, state.selectedCombo]);

  const changeComboQuantity = useCallback((index: number, delta: number) => {
    dispatch({ type: "CHANGE_QUANTITY", index, delta });
  }, []);

  const clearComboCart = useCallback(() => dispatch({ type: "CLEAR" }), []);

  return {
    ...state,
    openCombo,
    closeCombo,
    toggleComboOption,
    addSelectedCombo,
    changeComboQuantity,
    clearComboCart,
  };
};
