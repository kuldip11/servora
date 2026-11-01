export type PriceRuleFormValues = {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  price: string;
  priority: string;
};

export const validatePriceRuleForm = (
  values: PriceRuleFormValues,
): Record<string, string> => {
  const errors: Record<string, string> = {};
  const price = Number(values.price);
  const priority = Number(values.priority);

  if (!values.price.trim()) errors.price = "Price is required";
  else if (!Number.isFinite(price) || price < 0)
    errors.price = "Price must be 0 or greater";

  if (!Number.isInteger(priority))
    errors.priority = "Priority must be a whole number";

  if (values.startDate && values.endDate && values.startDate > values.endDate)
    errors.endDate = "End date must be on or after start date";

  if (
    values.startTime &&
    values.endTime &&
    !values.startDate &&
    !values.endDate &&
    values.startTime >= values.endTime
  )
    errors.endTime = "End time must be after start time";

  return errors;
};
