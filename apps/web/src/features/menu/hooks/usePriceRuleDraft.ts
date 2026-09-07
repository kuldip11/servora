import { useReducer } from "react";

interface PriceRuleDraft {
  channel: string;
  fulfillmentType: string;
  scopeToBranch: boolean;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  price: string;
  priority: string;
  customerGroupId: string;
  error: string | null;
}

type Action =
  | { type: "set"; field: keyof PriceRuleDraft; value: string | boolean | null }
  | { type: "saved" }
  | { type: "set-error"; error: string | null };

const initialState: PriceRuleDraft = {
  channel: "",
  fulfillmentType: "",
  scopeToBranch: false,
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  price: "",
  priority: "0",
  customerGroupId: "",
  error: null,
};

const reducer = (state: PriceRuleDraft, action: Action): PriceRuleDraft => {
  switch (action.type) {
    case "set":
      return { ...state, [action.field]: action.value } as PriceRuleDraft;
    case "saved":
      return { ...state, price: "", error: null };
    case "set-error":
      return { ...state, error: action.error };
  }
};

export const usePriceRuleDraft = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const setField = <K extends keyof PriceRuleDraft>(
    field: K,
    value: PriceRuleDraft[K],
  ) => dispatch({ type: "set", field, value });

  return {
    ...state,
    setField,
    markSaved: () => dispatch({ type: "saved" }),
    setError: (error: string | null) => dispatch({ type: "set-error", error }),
  };
};
