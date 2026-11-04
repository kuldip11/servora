import type { AssistantReply } from "@pos/contracts";
import { customerMenuService } from "@/modules/customer/customer-menu.service";
import { customerSessionService } from "@/modules/customer/customer-session.service";
import { stateFromInput, type MenuSearchInput } from "./assistant.input";
import { getPopularity } from "./assistant.popularity";
import {
  matchesMessage,
  notOnMenuMessage,
  reply,
  staffReply,
  SUGGESTIONS,
  unavailableMessage,
} from "./assistant.responses";
import { searchCatalog, type Catalog, type CatalogItem } from "./assistant.search";

async function loadCatalog(token: string): Promise<Catalog> {
  const session = await customerSessionService.getSession(token);
  const [menu, popularity] = await Promise.all([
    customerMenuService.getMenu(token),
    getPopularity(session.tenantId, session.branchId),
  ]);
  return {
    available: menu.items as CatalogItem[],
    unavailable: menu.unavailableItems as CatalogItem[],
    categories: menu.categories.map((c) => ({ id: c.id, name: c.name })),
    popularity,
  };
}

async function resolveRecommendation(
  token: string,
  canCallWaiter: boolean,
  input: MenuSearchInput,
): Promise<AssistantReply> {
  if (input.needsDietaryVerification) return reply("ASK_STAFF", canCallWaiter);
  if (input.intent === "STAFF") return staffReply(canCallWaiter);
  if (input.intent === "OUT_OF_SCOPE")
    return reply("OUT_OF_SCOPE", canCallWaiter, [], {
      suggestions: SUGGESTIONS.start,
    });

  // Resolve authoritative availability/prices after classification completes.
  // No database call runs inside the provider's tool execution lifecycle.
  const catalog = await loadCatalog(token);
  const result = searchCatalog(catalog, input);
  const state = stateFromInput(input);

  if (result.items.length)
    return reply("MATCHES", canCallWaiter, result.items, {
      message: matchesMessage(state, result.items.length, {
        requested: input.intent === "POPULAR" && !input.terms.length,
        usedHistory: result.usedHistory,
      }),
      suggestions: SUGGESTIONS.afterMatch,
      state,
    });

  // Nothing orderable matched. Say why, honestly: unavailable vs. never served.
  if (result.unavailableMatches.length)
    return reply("UNAVAILABLE", canCallWaiter, result.alternatives, {
      message: unavailableMessage(
        result.unavailableMatches,
        result.alternatives.length > 0,
      ),
      suggestions: SUGGESTIONS.afterMiss,
      state,
    });
  if (result.namedButMissing || input.terms.length)
    return reply("NOT_ON_MENU", canCallWaiter, result.alternatives, {
      message: notOnMenuMessage(state, result.alternatives.length > 0),
      suggestions: SUGGESTIONS.afterMiss,
      state,
    });
  return reply("NO_MATCH", canCallWaiter, [], {
    message: matchesFilterMessage(state),
    suggestions: SUGGESTIONS.afterMiss,
    state,
  });
}

function matchesFilterMessage(state: ReturnType<typeof stateFromInput>) {
  return state.minPrice !== null || state.maxPrice !== null
    ? "I couldn't find dishes in that price range. Try a wider range, or ask the team."
    : "I couldn't find a dish for that. Try a different dish or budget, or ask the team.";
}

export const assistantRecommendationService = {
  resolve: resolveRecommendation,
};
