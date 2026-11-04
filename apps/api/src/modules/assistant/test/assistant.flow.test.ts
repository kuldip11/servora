import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AssistantReply } from "@pos/contracts";
import { Elysia } from "elysia";
import { MockLanguageModelV4 } from "ai/test";

const state = vi.hoisted(() => ({
  model: undefined as unknown,
  session: vi.fn(),
  menu: vi.fn(),
  reserve: vi.fn(),
}));
vi.mock("ai", async (original) => ({
  ...(await original<typeof import("ai")>()),
  createGateway: () => () => state.model,
}));
vi.mock("@/modules/customer/customer-session.service", () => ({
  customerSessionService: { getSession: state.session },
}));
vi.mock("@/modules/customer/customer-menu.service", () => ({
  customerMenuService: { getMenu: state.menu },
}));
vi.mock("../assistant.config", () => ({
  assistantEnabledForBranch: () => true,
}));
vi.mock("../assistant.limits", () => ({ reserveAssistantTurn: state.reserve }));
vi.mock("../assistant.usage", () => ({ recordAssistantUsage: vi.fn() }));
import { assistantRouter } from "../assistant.route";
import { handleApiError } from "@/core/errors";
vi.mock("../assistant.popularity", () => ({
  getPopularity: vi.fn(async () => new Map()),
}));

// Only external boundaries are replaced. HTTP contracts, orchestration, the
// installed SDK tool protocol, safety, filtering and response projection are real.
const preferences = {
  intent: "MENU",
  foodType: "VEG",
  mild: true,
  minPrice: null,
  maxPrice: 300,
  terms: [],
  mealTime: null,
  needsDietaryVerification: false,
};
const item = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Restaurant paneer",
  basePrice: "250",
  description: "Current menu dish",
  foodType: "VEG",
  spiceLevel: "MILD",
  pricingMode: "FIXED",
  categoryId: "cat-1",
  variants: [],
  modifierGroupLinks: [],
  tagLinks: [],
};
function provider(args: unknown = preferences, count = 1) {
  return new MockLanguageModelV4({
    doGenerate: {
      content: Array.from({ length: count }, (_, i) => ({
        type: "tool-call" as const,
        toolCallId: String(i),
        toolName: "search_menu",
        input: JSON.stringify(args),
      })),
      finishReason: { unified: "tool-calls", raw: undefined },
      usage: {
        inputTokens: {
          total: 10,
          noCache: 10,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: { total: 10, text: 10, reasoning: undefined },
      },
      warnings: [],
    },
  });
}
const post = (message: string, language = "en") =>
  new Elysia()
    .onError(handleApiError)
    .use(assistantRouter)
    .handle(
      new Request("http://localhost/api/customer/assistant/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Customer-Session": "session-token",
        },
        body: JSON.stringify({ message, language }),
      }),
    );

const readReply = (response: Response) =>
  response.json() as Promise<{ data: AssistantReply }>;

beforeEach(() => {
  vi.clearAllMocks();
  state.session.mockResolvedValue({
    id: "session",
    tenantId: "tenant",
    branchId: "branch",
    mode: "DINE_IN",
    expiresAt: new Date(Date.now() + 60000),
  });
  state.reserve.mockResolvedValue(undefined);
  state.menu.mockResolvedValue({
    categories: [{ id: "cat-1", name: "Mains" }],
    unavailableItems: [],
    items: [
      item,
      { ...item, id: "22222222-2222-4222-8222-222222222222", basePrice: "400" },
    ],
  });
  state.model = provider();
});

describe("Concierge HTTP to SDK to menu flow", () => {
  it("returns only eligible menu-service facts through the real response contract", async () => {
    const response = await post("Vegetarian, not spicy, under 300");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await readReply(response);
    expect(body.data.outcome).toBe("MATCHES");
    expect(body.data.items).toEqual([
      {
        id: item.id,
        name: item.name,
        basePrice: item.basePrice,
        foodType: item.foodType,
        spiceLevel: item.spiceLevel,
      },
    ]);
    expect(state.menu).toHaveBeenCalledWith("session-token");
    expect((state.model as MockLanguageModelV4).doGenerateCalls).toHaveLength(
      1,
    );
  });
  it("handles Hindi dietary questions without a provider or menu lookup", async () => {
    const response = await post("जैन विकल्प?", "hi");
    expect(response.status).toBe(200);
    expect((await readReply(response)).data.outcome).toBe("ASK_STAFF");
    expect(state.menu).not.toHaveBeenCalled();
    expect((state.model as MockLanguageModelV4).doGenerateCalls).toHaveLength(
      0,
    );
  });
  it.each(["invalid", "duplicate"])(
    "falls back to the deterministic parser for %s model output, never echoing it",
    async (kind) => {
      state.model =
        kind === "invalid"
          ? provider({ ...preferences, foodType: "invented" })
          : provider(preferences, 2);
      const response = await post("Not spicy");
      expect(response.status).toBe(200);
      expect(state.menu).toHaveBeenCalledTimes(1);
      const body = JSON.stringify(await response.json());
      expect(body).not.toContain("invented");
      expect(body).not.toContain("toolInput");
    },
  );
  it("reads the current menu for every request and never reuses removed cards", async () => {
    expect((await readReply(await post("Not spicy"))).data.outcome).toBe(
      "MATCHES",
    );
    state.menu.mockResolvedValue({
      categories: [],
      unavailableItems: [],
      items: [],
    });
    const second = await post("Not spicy");
    expect((await readReply(second)).data.outcome).toBe("NO_MATCH");
    expect(state.menu).toHaveBeenCalledTimes(2);
  });
});
