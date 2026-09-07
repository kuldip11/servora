import { useReducer, type Dispatch, type SetStateAction } from "react";

type BuilderKind = "combo" | "promotion";
type ComboPolicy = "FIXED" | "PERCENT_OFF_SUM";
type PromotionType = "PERCENTAGE" | "FIXED_AMOUNT";

type ComboSlotDraft = {
  id: number;
  name: string;
  menuItemId: string;
  upcharge: string;
};

type PromotionPreview = {
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
};

const initialComboSlots: ComboSlotDraft[] = [
  { id: 1, name: "Main", menuItemId: "", upcharge: "0" },
  { id: 2, name: "Side", menuItemId: "", upcharge: "0" },
];

interface State {
  builderKind: BuilderKind;
  busy: boolean;
  comboName: string;
  comboPolicy: ComboPolicy;
  comboValue: string;
  comboSlots: ComboSlotDraft[];
  preview: number | null;
  promotionName: string;
  promotionType: PromotionType;
  promotionValue: string;
  promotionCoupon: string;
  promotionPreviewItemId: string;
  promotionPreview: PromotionPreview | null;
}

type Action = { patch: Partial<State> };

const initialState: State = {
  builderKind: "combo",
  busy: false,
  comboName: "",
  comboPolicy: "FIXED",
  comboValue: "0",
  comboSlots: initialComboSlots,
  preview: null,
  promotionName: "",
  promotionType: "PERCENTAGE",
  promotionValue: "10",
  promotionCoupon: "",
  promotionPreviewItemId: "",
  promotionPreview: null,
};

const reducer = (state: State, action: Action): State => ({
  ...state,
  ...action.patch,
});

const resolve = <T>(current: T, next: SetStateAction<T>): T =>
  typeof next === "function" ? (next as (previous: T) => T)(current) : next;

export const useGuidedBuilderState = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const setter =
    <K extends keyof State>(key: K): Dispatch<SetStateAction<State[K]>> =>
    (next) =>
      dispatch({
        patch: { [key]: resolve(state[key], next) } as Pick<State, K>,
      });

  return {
    ...state,
    setBuilderKind: setter("builderKind"),
    setBusy: setter("busy"),
    setComboName: setter("comboName"),
    setComboPolicy: setter("comboPolicy"),
    setComboValue: setter("comboValue"),
    setComboSlots: setter("comboSlots"),
    setPreview: setter("preview"),
    setPromotionName: setter("promotionName"),
    setPromotionType: setter("promotionType"),
    setPromotionValue: setter("promotionValue"),
    setPromotionCoupon: setter("promotionCoupon"),
    setPromotionPreviewItemId: setter("promotionPreviewItemId"),
    setPromotionPreview: setter("promotionPreview"),
  };
};
