export const validateServiceChargePercent = (
  value: string,
): string | undefined => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100)
    return "Service charge must be between 0 and 100";
  return undefined;
};

export const validateApprovalThreshold = (input: {
  thresholdAmount: string;
  requiresRole: string;
}): Record<string, string> => {
  const errors: Record<string, string> = {};
  const threshold = Number(input.thresholdAmount);
  if (!Number.isFinite(threshold) || threshold < 0)
    errors.thresholdAmount = "Threshold must be zero or greater";
  if (!input.requiresRole.trim())
    errors.requiresRole = "Approval role is required";
  return errors;
};

export const validateCancellationReason = (
  value: string,
): string | undefined => {
  const label = value.trim();
  if (!label) return "Cancellation reason is required";
  if (label.length > 120)
    return "Cancellation reason must be 120 characters or fewer";
  return undefined;
};
