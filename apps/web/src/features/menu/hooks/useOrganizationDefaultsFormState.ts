import { useReducer } from "react";

export interface OrganizationDefaultsFormState {
  menuName: string;
  menuSkus: string;
  menuPublished: boolean;
  menuDefault: boolean;
  ruleSku: string;
  rulePrice: string;
  loyaltyName: string;
  loyaltyMode: "PERCENT" | "FIXED";
  loyaltyValue: string;
}

type Action =
  | {
      type: "set";
      field: keyof OrganizationDefaultsFormState;
      value: string | boolean;
    }
  | { type: "reset-menu" }
  | { type: "reset-rule" }
  | { type: "reset-loyalty" };

const initialState: OrganizationDefaultsFormState = {
  menuName: "",
  menuSkus: "",
  menuPublished: false,
  menuDefault: true,
  ruleSku: "",
  rulePrice: "",
  loyaltyName: "",
  loyaltyMode: "PERCENT",
  loyaltyValue: "5",
};

const reducer = (
  state: OrganizationDefaultsFormState,
  action: Action,
): OrganizationDefaultsFormState => {
  switch (action.type) {
    case "set":
      return {
        ...state,
        [action.field]: action.value,
      } as OrganizationDefaultsFormState;
    case "reset-menu":
      return {
        ...state,
        menuName: "",
        menuSkus: "",
        menuPublished: false,
        menuDefault: true,
      };
    case "reset-rule":
      return { ...state, ruleSku: "", rulePrice: "" };
    case "reset-loyalty":
      return {
        ...state,
        loyaltyName: "",
        loyaltyMode: "PERCENT",
        loyaltyValue: "5",
      };
  }
};

export const useOrganizationDefaultsFormState = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const setField = <K extends keyof OrganizationDefaultsFormState>(
    field: K,
    value: OrganizationDefaultsFormState[K],
  ) => dispatch({ type: "set", field, value });

  return {
    ...state,
    setField,
    resetMenu: () => dispatch({ type: "reset-menu" }),
    resetRule: () => dispatch({ type: "reset-rule" }),
    resetLoyalty: () => dispatch({ type: "reset-loyalty" }),
  };
};
