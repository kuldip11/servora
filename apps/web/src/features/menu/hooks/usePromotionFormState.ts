import { useReducer, type Dispatch, type SetStateAction } from "react";
import type { Promotion } from "@pos/types";

type TriggerType = "ITEM" | "CATEGORY";
type RewardType = "SAME" | "ITEM" | "CATEGORY";

interface PromotionFormState {
  editingId: string | null;
  name: string;
  ruleType: Promotion["ruleType"];
  scope: Promotion["scope"];
  value: string;
  couponCode: string;
  targetId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  maxUsesTotal: string;
  maxUsesPerCustomer: string;
  triggerType: TriggerType;
  triggerId: string;
  rewardType: RewardType;
  rewardId: string;
  triggerQuantity: string;
  rewardQuantity: string;
  rewardDiscountPercent: string;
  stackableWithLoyalty: boolean;
}

type Action = { patch: Partial<PromotionFormState> };

const initialState: PromotionFormState = {
  editingId: null,
  name: "",
  ruleType: "PERCENTAGE",
  scope: "ORDER",
  value: "10",
  couponCode: "",
  targetId: "",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  maxUsesTotal: "",
  maxUsesPerCustomer: "",
  triggerType: "ITEM",
  triggerId: "",
  rewardType: "SAME",
  rewardId: "",
  triggerQuantity: "2",
  rewardQuantity: "1",
  rewardDiscountPercent: "100",
  stackableWithLoyalty: true,
};

const reducer = (
  state: PromotionFormState,
  action: Action,
): PromotionFormState => ({ ...state, ...action.patch });

const resolve = <T>(current: T, next: SetStateAction<T>): T =>
  typeof next === "function" ? (next as (previous: T) => T)(current) : next;

export const usePromotionFormState = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setter =
    <K extends keyof PromotionFormState>(
      key: K,
    ): Dispatch<SetStateAction<PromotionFormState[K]>> =>
    (next) =>
      dispatch({
        patch: { [key]: resolve(state[key], next) } as Pick<
          PromotionFormState,
          K
        >,
      });

  const beginEdit = (promotion: Promotion) =>
    dispatch({
      patch: {
        editingId: promotion.id,
        name: promotion.name,
        ruleType: promotion.ruleType,
        scope: promotion.scope,
        value: promotion.value ?? "10",
        couponCode: promotion.couponCode ?? "",
        targetId: promotion.scopeCategoryId ?? promotion.scopeMenuItemId ?? "",
        startDate: promotion.startDate ?? "",
        endDate: promotion.endDate ?? "",
        startTime: promotion.startTime ?? "",
        endTime: promotion.endTime ?? "",
        maxUsesTotal:
          promotion.maxUsesTotal == null ? "" : String(promotion.maxUsesTotal),
        maxUsesPerCustomer:
          promotion.maxUsesPerCustomer == null
            ? ""
            : String(promotion.maxUsesPerCustomer),
        triggerType: promotion.triggerCategoryId ? "CATEGORY" : "ITEM",
        triggerId:
          promotion.triggerCategoryId ?? promotion.triggerMenuItemId ?? "",
        rewardType: promotion.rewardCategoryId
          ? "CATEGORY"
          : promotion.rewardMenuItemId
            ? "ITEM"
            : "SAME",
        rewardId:
          promotion.rewardCategoryId ?? promotion.rewardMenuItemId ?? "",
        triggerQuantity: String(promotion.triggerQuantity ?? 2),
        rewardQuantity: String(promotion.rewardQuantity ?? 1),
        rewardDiscountPercent: String(promotion.rewardDiscountPercent ?? 100),
        stackableWithLoyalty: promotion.stackableWithLoyalty,
      },
    });

  const resetAfterSave = () =>
    dispatch({
      patch: {
        editingId: null,
        name: "",
        couponCode: "",
        targetId: "",
        triggerId: "",
        rewardId: "",
      },
    });

  return {
    ...state,
    beginEdit,
    resetAfterSave,
    setEditingId: setter("editingId"),
    setName: setter("name"),
    setRuleType: setter("ruleType"),
    setScope: setter("scope"),
    setValue: setter("value"),
    setCouponCode: setter("couponCode"),
    setTargetId: setter("targetId"),
    setStartDate: setter("startDate"),
    setEndDate: setter("endDate"),
    setStartTime: setter("startTime"),
    setEndTime: setter("endTime"),
    setMaxUsesTotal: setter("maxUsesTotal"),
    setMaxUsesPerCustomer: setter("maxUsesPerCustomer"),
    setTriggerType: setter("triggerType"),
    setTriggerId: setter("triggerId"),
    setRewardType: setter("rewardType"),
    setRewardId: setter("rewardId"),
    setTriggerQuantity: setter("triggerQuantity"),
    setRewardQuantity: setter("rewardQuantity"),
    setRewardDiscountPercent: setter("rewardDiscountPercent"),
    setStackableWithLoyalty: setter("stackableWithLoyalty"),
  };
};
