import { z } from "zod";

export const mealTimes = [
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "SNACKS",
  "DRINKS",
  "DESSERT",
] as const;
export type MealTime = (typeof mealTimes)[number];

// The model classifies preferences only. No IDs, prices or public prose are accepted.
// Unknown keys are dropped (not rejected) and *missing* optional fields get safe
// defaults, but an *invalid* value (negative budget, 7 terms, unknown food type)
// is still rejected: silently widening a veg/budget filter would be unsafe.
export const menuSearchInput = z.object({
  intent: z.enum(["MENU", "POPULAR", "STAFF", "OUT_OF_SCOPE"]),
  foodType: z.enum(["ANY", "VEG", "NON_VEG", "EGG"]).default("ANY"),
  mild: z.boolean().default(false),
  minPrice: z.number().min(0).max(100000).nullable().default(null),
  maxPrice: z.number().min(0).max(100000).nullable().default(null),
  terms: z.array(z.string().max(40)).max(6).default([]),
  mealTime: z.enum(mealTimes).nullable().default(null),
  needsDietaryVerification: z.boolean(),
});
export type MenuSearchInput = z.infer<typeof menuSearchInput>;

// Filters carried between turns so "and above 300?" works as a follow-up.
export const conversationState = z
  .object({
    foodType: z.enum(["ANY", "VEG", "NON_VEG", "EGG"]),
    mild: z.boolean(),
    minPrice: z.number().min(0).max(100000).nullable(),
    maxPrice: z.number().min(0).max(100000).nullable(),
    terms: z.array(z.string().max(40)).max(6),
    mealTime: z.enum(mealTimes).nullable(),
  })
  .strip();
export type ConversationState = z.infer<typeof conversationState>;

export const stateFromInput = (input: MenuSearchInput): ConversationState => ({
  foodType: input.foodType,
  mild: input.mild,
  minPrice: input.minPrice,
  maxPrice: input.maxPrice,
  terms: input.terms,
  mealTime: input.mealTime,
});
