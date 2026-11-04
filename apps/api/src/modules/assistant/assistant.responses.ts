import type { AssistantReply } from "@pos/contracts";
import type { ConversationState } from "./assistant.input";

type Outcome = AssistantReply["outcome"];
type Item = AssistantReply["items"][number];

const DISCLAIMER =
  "Prices shown are base prices. Options, tax and charges may change the total. Dietary and allergen information must be confirmed with staff.";

const messages: Record<Outcome, string> = {
  MATCHES: "Here are dishes matching what you asked for. Open a dish to review its options.",
  NO_MATCH:
    "I couldn't find a dish for that. Try a different dish or budget, or ask the team.",
  ASK_STAFF:
    "Dietary suitability, ingredients and allergen safety are unverified. Please check with the restaurant team before ordering.",
  OUT_OF_SCOPE:
    "I can help you explore this restaurant's menu. Tell me a dish, food preference or item budget.",
  UNAVAILABLE: "That isn't available right now.",
  NOT_ON_MENU: "I couldn't find that on today's menu.",
};

export const SUGGESTIONS = {
  start: ["What's popular?", "Vegetarian under ₹200", "Show me drinks", "Dessert options"],
  afterMatch: ["Show something cheaper", "What's popular?", "Vegetarian only"],
  afterMiss: ["What's popular?", "Show me the menu", "Vegetarian options"],
};

export function reply(
  outcome: Outcome,
  canCallWaiter: boolean,
  items: Item[] = [],
  extra: {
    message?: string;
    suggestions?: string[];
    state?: ConversationState;
  } = {},
): AssistantReply {
  return {
    language: "en",
    outcome,
    message: extra.message ?? messages[outcome],
    disclaimer: DISCLAIMER,
    items,
    canCallWaiter,
    ...(extra.suggestions ? { suggestions: extra.suggestions } : {}),
    ...(extra.state ? { state: extra.state } : {}),
  };
}

export function staffReply(canCallWaiter: boolean): AssistantReply {
  return reply("ASK_STAFF", canCallWaiter, [], {
    message:
      "For waiter help, bill requests, order status or restaurant details, please use the order and service controls or ask the restaurant team.",
  });
}

export function greetingReply(canCallWaiter: boolean): AssistantReply {
  return reply("OUT_OF_SCOPE", canCallWaiter, [], {
    message:
      "Hi! I'm the Servora Concierge. Ask me what's on the menu, what's popular, or for dishes by taste, diet or budget.",
    suggestions: SUGGESTIONS.start,
  });
}

const list = (names: string[]) =>
  names.length <= 1
    ? (names[0] ?? "")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/** Human description of what was searched, built only from validated filters. */
export function describeFilters(state: ConversationState): string {
  const parts: string[] = [];
  if (state.foodType === "VEG") parts.push("vegetarian");
  if (state.foodType === "NON_VEG") parts.push("non-vegetarian");
  if (state.foodType === "EGG") parts.push("egg");
  if (state.mild) parts.push("mild");
  const what = state.terms.length ? list(state.terms) : "dishes";
  let text = `${parts.join(", ")}${parts.length ? " " : ""}${what}`;
  if (state.minPrice !== null && state.maxPrice !== null)
    text += ` between ₹${state.minPrice} and ₹${state.maxPrice}`;
  else if (state.maxPrice !== null) text += ` under ₹${state.maxPrice}`;
  else if (state.minPrice !== null) text += ` above ₹${state.minPrice}`;
  return text;
}

export function matchesMessage(
  state: ConversationState,
  count: number,
  popular: { requested: boolean; usedHistory: boolean },
): string {
  if (popular.requested)
    return popular.usedHistory
      ? "Here's what guests order most at this restaurant. Open a dish to review its options."
      : "Here are some highlights from today's menu. Open a dish to review its options.";
  const noun = count === 1 ? "match" : "matches";
  return `Here ${count === 1 ? "is" : "are"} ${count} ${noun} for ${describeFilters(state)}. Open a dish to review its options.`;
}

export function unavailableMessage(
  names: string[],
  hasAlternatives: boolean,
): string {
  const verb = names.length === 1 ? "is" : "are";
  return `Sorry, ${list(names)} ${verb} not available right now.${hasAlternatives ? " Here are some things you can order instead." : " Please ask the team if it will be back soon."}`;
}

export function notOnMenuMessage(
  state: ConversationState,
  hasAlternatives: boolean,
): string {
  const asked = state.terms.length ? list(state.terms) : "that";
  const filtered =
    state.minPrice !== null ||
    state.maxPrice !== null ||
    state.foodType !== "ANY" ||
    state.mild;
  const why = filtered
    ? `I couldn't find ${asked} that fits ${describeFilters({ ...state, terms: [] }).replace(/ dishes/, "") || "those filters"}.`
    : `We don't have ${asked} on the menu right now.`;
  return `${why}${hasAlternatives ? " You might like these instead." : " Try another dish or ask the team."}`;
}
