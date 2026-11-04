import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  session: vi.fn(),
  menu: vi.fn(),
  enabled: vi.fn(),
  reserve: vi.fn(),
  model: vi.fn(),
  failure: vi.fn(),
}));
vi.mock("../assistant.popularity", () => ({
  getPopularity: vi.fn(async () => new Map()),
}));
vi.mock("@/modules/customer/customer-session.service", () => ({
  customerSessionService: { getSession: mock.session },
}));
vi.mock("@/modules/customer/customer-menu.service", () => ({
  customerMenuService: { getMenu: mock.menu },
}));
vi.mock("../assistant.config", () => ({
  assistantEnabledForBranch: mock.enabled,
}));
vi.mock("../assistant.limits", () => ({ reserveAssistantTurn: mock.reserve }));
vi.mock("../assistant.model", () => ({ runMenuTool: mock.model }));
vi.mock("../assistant.usage", () => ({ recordAssistantUsage: vi.fn() }));
vi.mock("../assistant.diagnostics", () => ({
  reportAssistantFailure: mock.failure,
}));
import { AssistantProtocolError } from "../assistant.errors";
import { assistantService } from "../assistant.service";
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
beforeEach(() => {
  vi.clearAllMocks();
  mock.enabled.mockReturnValue(true);
  mock.session.mockResolvedValue({
    id: "session",
    tenantId: "tenant-A",
    branchId: "branch-A",
    mode: "DINE_IN",
    expiresAt: new Date(Date.now() + 60000),
  });
  mock.reserve.mockResolvedValue(undefined);
  mock.model.mockImplementation(async (_message, execute) => {
    await execute(preferences);
    return { inputTokens: 10, outputTokens: 20 };
  });
  mock.menu.mockResolvedValue({
    categories: [{ id: "cat-A", name: "Mains" }],
    unavailableItems: [],
    items: [
      {
        id: "item-A",
        name: "Paneer",
        description: null,
        basePrice: "200",
        foodType: "VEG",
        spiceLevel: "MILD",
        pricingMode: "FIXED",
        categoryId: "cat-A",
        variants: [],
        modifierGroupLinks: [],
        tagLinks: [],
      },
    ],
  });
});
describe("session-scoped read-only assistant", () => {
  it("rejects invalid/expired sessions before limits or provider access", async () => {
    mock.session.mockRejectedValue(new Error("expired"));
    await expect(
      assistantService.ask("bad", { message: "veg", language: "en" }),
    ).rejects.toThrow("expired");
    expect(mock.reserve).not.toHaveBeenCalled();
    expect(mock.model).not.toHaveBeenCalled();
  });
  it("requires an enabled session branch, never a user-provided tenant", async () => {
    mock.enabled.mockReturnValue(false);
    await expect(
      assistantService.ask("token", { message: "veg", language: "en" }),
    ).rejects.toThrow("not enabled");
    expect(mock.enabled).toHaveBeenCalledWith("branch-A");
    expect(mock.model).not.toHaveBeenCalled();
  });
  it("uses the existing session menu and limits only the authenticated tenant/session", async () => {
    const result = await assistantService.ask("token-A", {
      message: "veg under 300",
      language: "en",
    });
    expect(mock.menu).toHaveBeenCalledWith("token-A");
    expect(mock.reserve).toHaveBeenCalledWith(
      "tenant-A",
      "session",
      expect.any(Date),
    );
    expect(result.items.map((i) => i.id)).toEqual(["item-A"]);
  });
  it("does not let missing menu items be resurrected by model arguments", async () => {
    mock.menu.mockResolvedValue({
      categories: [],
      unavailableItems: [],
      items: [],
    });
    const result = await assistantService.ask("token", {
      message: "paneer",
      language: "en",
    });
    expect(result.outcome).toBe("NO_MATCH");
    expect(result.items).toEqual([]);
  });
  it("short-circuits dietary questions without sending them to a provider", async () => {
    expect(
      (
        await assistantService.ask("token", {
          message: "peanut allergy",
          language: "hinglish",
        })
      ).outcome,
    ).toBe("ASK_STAFF");
    expect(mock.model).not.toHaveBeenCalled();
    expect(mock.menu).not.toHaveBeenCalled();
  });
  it("honors model-detected dietary uncertainty and suppresses recommendations", async () => {
    mock.model.mockImplementation(async (_message, execute) => {
      await execute({ ...preferences, needsDietaryVerification: true });
      return { inputTokens: 10, outputTokens: 10 };
    });
    expect(
      (
        await assistantService.ask("token", {
          message: "special dietary question",
          language: "hi",
        })
      ).outcome,
    ).toBe("ASK_STAFF");
    expect(mock.menu).not.toHaveBeenCalled();
  });
  it("gives relevant service guidance for waiter/bill questions", async () => {
    mock.model.mockImplementation(async (_message, execute) => {
      await execute({ ...preferences, intent: "STAFF" });
      return { inputTokens: 10, outputTokens: 10 };
    });
    const answer = await assistantService.ask("token", {
      message: "bring my bill",
      language: "en",
    });
    expect(answer.outcome).toBe("ASK_STAFF");
    expect(answer.message).toContain("bill requests");
    expect(answer.message).not.toContain("unverified");
    expect(mock.menu).not.toHaveBeenCalled();
  });
  it("does not offer waiter calls for takeaway sessions", async () => {
    const session = await mock.session();
    mock.session.mockResolvedValue({ ...session, mode: "TAKEAWAY" });
    expect(
      (await assistantService.ask("token", { message: "Jain", language: "en" }))
        .canCallWaiter,
    ).toBe(false);
  });
  it("fails closed when quota storage fails", async () => {
    mock.reserve.mockRejectedValue(new Error("limit unavailable"));
    await expect(
      assistantService.ask("token", { message: "veg", language: "en" }),
    ).rejects.toThrow("limit unavailable");
    expect(mock.model).not.toHaveBeenCalled();
  });
  it("answers from the deterministic parser when the provider fails, without leaking its error", async () => {
    mock.model.mockRejectedValue(new Error("secret provider payload"));
    const result = await assistantService.ask("token", {
      message: "veg under 300",
      language: "en",
    });
    expect(result.outcome).toBe("MATCHES");
    expect(result.items.map((i) => i.id)).toEqual(["item-A"]);
    expect(JSON.stringify(result)).not.toContain("secret provider payload");
    expect(mock.failure).toHaveBeenCalledWith(
      "model",
      expect.objectContaining({ tenantId: "tenant-A" }),
      expect.any(Error),
    );
  });
  it("still serves the menu when the provider fails after calling its tool", async () => {
    mock.model.mockImplementation(async (_message, execute) => {
      await execute(preferences);
      throw new Error("provider failed after tool execution");
    });
    const result = await assistantService.ask("token", {
      message: "veg under 300",
      language: "en",
    });
    expect(result.outcome).toBe("MATCHES");
    expect(mock.failure).toHaveBeenCalledWith(
      "model",
      expect.objectContaining({ tenantId: "tenant-A" }),
      expect.any(Error),
    );
  });
  it("identifies menu failures separately from provider failures", async () => {
    mock.menu.mockRejectedValue(new Error("database unavailable"));
    await expect(
      assistantService.ask("token", { message: "veg", language: "en" }),
    ).rejects.toThrow("temporarily unavailable");
    expect(mock.failure).toHaveBeenCalledWith(
      "menu",
      { tenantId: "tenant-A", branchId: "branch-A" },
      expect.any(Error),
    );
  });
  it("falls back to the parser when the model returns no validated preferences", async () => {
    mock.model.mockResolvedValue({ inputTokens: 10, outputTokens: 10 });
    const result = await assistantService.ask("token", {
      message: "veg under 300",
      language: "en",
    });
    expect(result.outcome).toBe("MATCHES");
    expect(mock.failure).toHaveBeenCalledWith(
      "protocol",
      expect.objectContaining({ tenantId: "tenant-A" }),
      expect.any(Error),
    );
  });
  it("classifies rejected tool completions as protocol failures and still answers", async () => {
    mock.model.mockRejectedValue(new AssistantProtocolError("duplicate_tools"));
    const result = await assistantService.ask("token", {
      message: "veg under 300",
      language: "en",
    });
    expect(result.outcome).toBe("MATCHES");
    expect(mock.failure).toHaveBeenCalledWith(
      "protocol",
      expect.objectContaining({ tenantId: "tenant-A" }),
      expect.objectContaining({ reason: "duplicate_tools" }),
    );
  });
  it("does not swallow a diner-initiated abort", async () => {
    const abort = new AbortController();
    abort.abort();
    mock.model.mockRejectedValue(new Error("aborted"));
    await expect(
      assistantService.ask("token", { message: "veg", language: "en" }, abort.signal),
    ).rejects.toThrow();
  });
  it("tells the diner a dish is unavailable instead of 'not found'", async () => {
    mock.model.mockImplementation(async (_message, execute) => {
      await execute({ ...preferences, maxPrice: null, terms: ["brownie"] });
      return { inputTokens: 1, outputTokens: 1 };
    });
    mock.menu.mockResolvedValue({
      categories: [{ id: "cat-A", name: "Mains" }],
      items: [],
      unavailableItems: [
        {
          id: "item-B", name: "Chocolate Brownie", description: null,
          basePrice: "150", foodType: "VEG", spiceLevel: null,
          pricingMode: "FIXED", categoryId: "cat-A", variants: [],
          modifierGroupLinks: [], tagLinks: [],
        },
      ],
    });
    const result = await assistantService.ask("token", {
      message: "do you have brownie",
      language: "en",
    });
    expect(result.outcome).toBe("UNAVAILABLE");
    expect(result.message).toContain("Chocolate Brownie");
    expect(result.message).toContain("not available right now");
  });
  it("answers greetings without calling the provider or the menu", async () => {
    const result = await assistantService.ask("token", { message: "hi", language: "en" });
    expect(result.suggestions?.length).toBeGreaterThan(0);
    expect(mock.model).not.toHaveBeenCalled();
    expect(mock.menu).not.toHaveBeenCalled();
  });
});
