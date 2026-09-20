export type LoyaltyTierDraft = {
  name: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: string;
};

export type LoyaltyCustomerDraft = {
  name: string;
  phone: string;
  email: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateLoyaltyTierDraft = (
  draft: LoyaltyTierDraft,
): Record<string, string> => {
  const errors: Record<string, string> = {};
  const name = draft.name.trim();
  const value = Number(draft.discountValue);

  if (!name) errors.name = "Tier name is required";
  else if (name.length > 120)
    errors.name = "Tier name must be 120 characters or fewer";

  if (!Number.isFinite(value) || value <= 0) {
    errors.discountValue = "Discount must be greater than 0";
  } else if (draft.discountType === "PERCENT" && value > 100) {
    errors.discountValue = "Percentage discount cannot exceed 100";
  }

  return errors;
};

export const validateLoyaltyCustomerDraft = (
  draft: LoyaltyCustomerDraft,
): Record<string, string> => {
  const errors: Record<string, string> = {};
  const name = draft.name.trim();
  const email = draft.email.trim();

  if (!name) errors.name = "Customer name is required";
  else if (name.length > 200)
    errors.name = "Customer name must be 200 characters or fewer";

  if (draft.phone.length > 40)
    errors.phone = "Phone number must be 40 characters or fewer";
  if (email.length > 320)
    errors.email = "Email must be 320 characters or fewer";
  else if (email && !EMAIL_PATTERN.test(email))
    errors.email = "Enter a valid email address";

  return errors;
};
