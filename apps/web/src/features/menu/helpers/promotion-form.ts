import type { Promotion } from "@pos/types";

export interface PromotionFormValues {
  name: string;
  ruleType: Promotion["ruleType"];
  scope: Promotion["scope"];
  value: string;
  targetId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  maxUsesTotal: string;
  maxUsesPerCustomer: string;
  triggerId: string;
  rewardType: "SAME" | "ITEM" | "CATEGORY";
  rewardId: string;
  triggerQuantity: string;
  rewardQuantity: string;
  rewardDiscountPercent: string;
}

const positiveNumberError = (value: string, label: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0
    ? undefined
    : `${label} must be greater than 0`;
};

const optionalPositiveIntegerError = (value: string, label: string) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0
    ? undefined
    : `${label} must be a positive whole number`;
};

export const validatePromotionForm = (values: PromotionFormValues) => {
  const errors: Record<string, string> = {};
  if (!values.name.trim()) errors.name = "Name is required";
  else if (values.name.trim().length > 200)
    errors.name = "Name must be 200 characters or fewer";

  if (values.ruleType === "BOGO") {
    if (!values.triggerId) errors.triggerId = "Buy target is required";
    const triggerError = positiveNumberError(
      values.triggerQuantity,
      "Buy quantity",
    );
    if (triggerError) errors.triggerQuantity = triggerError;
    const rewardError = positiveNumberError(
      values.rewardQuantity,
      "Reward quantity",
    );
    if (rewardError) errors.rewardQuantity = rewardError;
    const discount = Number(values.rewardDiscountPercent);
    if (!Number.isFinite(discount) || discount <= 0 || discount > 100) {
      errors.rewardDiscountPercent =
        "Reward discount must be greater than 0 and at most 100";
    }
    if (values.rewardType !== "SAME" && !values.rewardId)
      errors.rewardId = "Reward target is required";
  } else {
    const valueError = positiveNumberError(
      values.value,
      values.ruleType === "PERCENTAGE" ? "Percent off" : "Amount off",
    );
    if (valueError) errors.value = valueError;
    if (values.ruleType === "PERCENTAGE" && Number(values.value) > 100)
      errors.value = "Percent off must be at most 100";
    if (values.scope !== "ORDER" && !values.targetId)
      errors.targetId = "Promotion target is required";
  }

  if (values.startDate && values.endDate && values.endDate < values.startDate)
    errors.endDate = "End date must be on or after start date";
  if (
    !values.startDate &&
    !values.endDate &&
    values.startTime &&
    values.endTime &&
    values.endTime <= values.startTime
  )
    errors.endTime = "End time must be after start time";

  const totalError = optionalPositiveIntegerError(
    values.maxUsesTotal,
    "Max uses total",
  );
  if (totalError) errors.maxUsesTotal = totalError;
  const customerError = optionalPositiveIntegerError(
    values.maxUsesPerCustomer,
    "Max uses per customer",
  );
  if (customerError) errors.maxUsesPerCustomer = customerError;

  return errors;
};
