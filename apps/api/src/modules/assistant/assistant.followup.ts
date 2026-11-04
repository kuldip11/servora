import { conversationState, type MenuSearchInput } from "./assistant.input";
import type { ParsedQuestion } from "./assistant.nlu";

/**
 * Lets "and above 300?" or "make it vegetarian" refine the previous search.
 * The client echoes back the filters the server returned last turn; they are
 * re-validated here, so a tampered value can only change this diner's own
 * search. A question that names a new dish or asks for popular/browse starts
 * fresh, with only the explicit constraints it contains.
 */
export function applyFollowUp(
  input: MenuSearchInput,
  parsed: ParsedQuestion,
  rawState: unknown,
): MenuSearchInput {
  if (input.intent !== "MENU" || input.terms.length || parsed.browse)
    return input;
  const previous = conversationState.safeParse(rawState);
  if (!previous.success) return input;
  const prev = previous.data;
  const addsConstraint =
    input.minPrice !== null ||
    input.maxPrice !== null ||
    input.foodType !== "ANY" ||
    input.mild ||
    input.mealTime !== null;
  // A bare "what's on the menu?" is a reset, not a refinement.
  if (!addsConstraint) return input;
  const priceChanged = input.minPrice !== null || input.maxPrice !== null;
  return {
    ...input,
    terms: prev.terms,
    foodType: input.foodType === "ANY" ? prev.foodType : input.foodType,
    mild: input.mild || prev.mild,
    mealTime: input.mealTime ?? prev.mealTime,
    minPrice: priceChanged ? input.minPrice : prev.minPrice,
    maxPrice: priceChanged ? input.maxPrice : prev.maxPrice,
  };
}
