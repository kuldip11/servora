import { extractApiFieldErrors } from "@pos/api-client";

export type ComboPolicy = "FIXED" | "PERCENT_OFF_SUM";

export type DraftOption = {
  key: string;
  menuItemId: string;
  variantId: string;
  upcharge: string;
  isUnlimitedRefill: boolean;
};

export type DraftSlot = {
  key: string;
  name: string;
  minSelections: string;
  maxSelections: string;
  options: DraftOption[];
};

export type ComboDraft = {
  name: string;
  description: string;
  policy: ComboPolicy;
  amount: string;
  slots: DraftSlot[];
};

export type ComboPayload = {
  name: string;
  description?: string;
  pricePolicy: ComboPolicy;
  fixedPrice?: number;
  percentOff?: number;
  slots: Array<{
    name: string;
    minSelections: number;
    maxSelections: number;
    options: Array<{
      menuItemId: string;
      variantId?: string;
      upcharge: number;
      isUnlimitedRefill: boolean;
    }>;
  }>;
};

export type ComboFormErrors = Record<string, string>;

export const comboFieldKey = {
  name: "name",
  amount: "amount",
  slotName: (slotKey: string) => `slot:${slotKey}:name`,
  slotMin: (slotKey: string) => `slot:${slotKey}:minSelections`,
  slotMax: (slotKey: string) => `slot:${slotKey}:maxSelections`,
  optionItem: (slotKey: string, optionKey: string) =>
    `slot:${slotKey}:option:${optionKey}:menuItemId`,
  optionVariant: (slotKey: string, optionKey: string) =>
    `slot:${slotKey}:option:${optionKey}:variantId`,
  optionUpcharge: (slotKey: string, optionKey: string) =>
    `slot:${slotKey}:option:${optionKey}:upcharge`,
} as const;

export const buildComboPayload = (draft: ComboDraft): ComboPayload => ({
  name: draft.name.trim(),
  ...(draft.description.trim()
    ? { description: draft.description.trim() }
    : {}),
  pricePolicy: draft.policy,
  ...(draft.policy === "FIXED"
    ? { fixedPrice: Number(draft.amount) }
    : { percentOff: Number(draft.amount) }),
  slots: draft.slots.map((slot) => ({
    name: slot.name.trim(),
    minSelections: Number(slot.minSelections),
    maxSelections: Number(slot.maxSelections),
    options: slot.options.map((option) => ({
      menuItemId: option.menuItemId,
      ...(option.variantId ? { variantId: option.variantId } : {}),
      upcharge: Number(option.upcharge || 0),
      isUnlimitedRefill: option.isUnlimitedRefill,
    })),
  })),
});

export const validateComboDraft = (draft: ComboDraft): ComboFormErrors => {
  const errors: ComboFormErrors = {};
  if (!draft.name.trim())
    errors[comboFieldKey.name] = "Combo name is required.";

  const amount = Number(draft.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    errors[comboFieldKey.amount] = "Enter a valid non-negative amount.";
  } else if (draft.policy === "PERCENT_OFF_SUM" && amount > 100) {
    errors[comboFieldKey.amount] = "Percent off cannot exceed 100.";
  }

  if (!draft.slots.length) errors.slots = "Add at least one combo slot.";

  draft.slots.forEach((slot) => {
    const min = Number(slot.minSelections);
    const max = Number(slot.maxSelections);
    if (!slot.name.trim()) {
      errors[comboFieldKey.slotName(slot.key)] = "Slot name is required.";
    }
    if (!Number.isInteger(min) || min < 0) {
      errors[comboFieldKey.slotMin(slot.key)] = "Minimum must be 0 or more.";
    }
    if (!Number.isInteger(max) || max < 1) {
      errors[comboFieldKey.slotMax(slot.key)] = "Maximum must be at least 1.";
    } else if (Number.isInteger(min) && min > max) {
      errors[comboFieldKey.slotMax(slot.key)] =
        "Maximum must be at least the minimum.";
    }
    if (Number.isInteger(min) && min >= 0 && slot.options.length < min) {
      errors[comboFieldKey.slotMin(slot.key)] =
        "Minimum cannot exceed the number of choices.";
    }
    slot.options.forEach((option) => {
      if (!option.menuItemId) {
        errors[comboFieldKey.optionItem(slot.key, option.key)] =
          "Choose a menu item.";
      }
      const upcharge = Number(option.upcharge || 0);
      if (!Number.isFinite(upcharge)) {
        errors[comboFieldKey.optionUpcharge(slot.key, option.key)] =
          "Enter a valid upcharge.";
      }
    });
  });

  return errors;
};

const mapBackendField = (field: string, slots: DraftSlot[]): string | null => {
  if (field === "name") return comboFieldKey.name;
  if (field === "fixedPrice" || field === "percentOff")
    return comboFieldKey.amount;
  const match =
    /^slots\.(\d+)\.(name|minSelections|maxSelections|options\.(\d+)\.(menuItemId|variantId|upcharge))$/.exec(
      field,
    );
  if (!match) return null;
  const slot = slots[Number(match[1])];
  if (!slot) return null;
  if (match[2] === "name") return comboFieldKey.slotName(slot.key);
  if (match[2] === "minSelections") return comboFieldKey.slotMin(slot.key);
  if (match[2] === "maxSelections") return comboFieldKey.slotMax(slot.key);
  const option = slot.options[Number(match[3])];
  if (!option) return null;
  if (match[4] === "menuItemId")
    return comboFieldKey.optionItem(slot.key, option.key);
  if (match[4] === "variantId")
    return comboFieldKey.optionVariant(slot.key, option.key);
  return comboFieldKey.optionUpcharge(slot.key, option.key);
};

export const mapComboApiFieldErrors = (
  error: unknown,
  slots: DraftSlot[],
): { fieldErrors: ComboFormErrors; formMessages: string[] } => {
  const fieldErrors: ComboFormErrors = {};
  const formMessages: string[] = [];
  for (const [field, messages] of Object.entries(
    extractApiFieldErrors(error),
  )) {
    const message = messages.find((candidate) => candidate.trim());
    if (!message) continue;
    const mapped = mapBackendField(field, slots);
    if (mapped) fieldErrors[mapped] = message;
    else formMessages.push(message);
  }
  return { fieldErrors, formMessages: [...new Set(formMessages)] };
};
