import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockLanguageModelV4 } from "ai/test";
const state = vi.hoisted(() => ({ model: undefined as unknown }));
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  createGateway: () => () => state.model,
}));
import { runMenuTool } from "../assistant.model";
const input = {
  intent: "MENU",
  foodType: "VEG",
  mild: true,
  minPrice: null,
  maxPrice: 300,
  terms: [],
  mealTime: null,
  needsDietaryVerification: false,
};
const usage = {
  inputTokens: {
    total: 100,
    noCache: 100,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 20, text: 20, reasoning: undefined },
};
function model(args: unknown = input, count = 1, truncated = false) {
  return new MockLanguageModelV4({
    doGenerate: {
      content: Array.from({ length: count }, (_, i) => ({
        type: "tool-call" as const,
        toolCallId: String(i),
        toolName: "search_menu",
        input: JSON.stringify(args),
      })),
      finishReason: {
        unified: truncated ? "length" : "tool-calls",
        raw: undefined,
      },
      usage,
      warnings: [],
    },
  });
}
beforeEach(() => {
  state.model = model();
});
describe("AI SDK tool protocol", () => {
  it("executes exactly one validated menu tool with bounded output", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    expect(await runMenuTool("veg under 300", execute)).toEqual({
      inputTokens: 100,
      outputTokens: 20,
    });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(input);
    const calls = (state.model as MockLanguageModelV4).doGenerateCalls;
    expect(calls).toHaveLength(1);
    expect(calls[0]?.maxOutputTokens).toBe(400);
    expect(calls[0]?.toolChoice).toEqual({
      type: "tool",
      toolName: "search_menu",
    });
  });
  it("does not send customer identifiers or common PII patterns", async () => {
    await runMenuTool(
      "veg, me@example.com +91 9876543210",
      vi.fn().mockResolvedValue(undefined),
    );
    const prompt = JSON.stringify(
      (state.model as MockLanguageModelV4).doGenerateCalls[0]?.prompt,
    );
    expect(prompt).not.toContain("me@example.com");
    expect(prompt).not.toContain("9876543210");
  });
  it("rejects invalid model arguments before they can reach the menu service", async () => {
    state.model = model({ ...input, tenantId: "foreign" });
    const execute = vi.fn();
    await expect(runMenuTool("veg", execute)).rejects.toThrow();
    expect(execute).not.toHaveBeenCalled();
  });
  it("rejects duplicate tool calls, executing the menu lookup at most once", async () => {
    state.model = model(input, 2);
    const execute = vi.fn().mockResolvedValue(undefined);
    await expect(runMenuTool("veg", execute)).rejects.toMatchObject({
      reason: "duplicate_tools",
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });
  it("rejects a completion without a tool call", async () => {
    state.model = model(input, 0);
    const execute = vi.fn();
    await expect(runMenuTool("veg", execute)).rejects.toMatchObject({
      reason: "missing_tool",
    });
    expect(execute).not.toHaveBeenCalled();
  });
  it("rejects output that hit the token limit even if a tool was parsed", async () => {
    state.model = model(input, 1, true);
    await expect(runMenuTool("veg", vi.fn())).rejects.toMatchObject({
      reason: "truncated_output",
    });
  });
});
