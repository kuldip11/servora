import { describe, expect, it } from "vitest";
import {
  demoEvaluationMenu,
  evaluateAssistant,
  evaluationCases,
  type EvaluationRunner,
} from "../assistant.evaluation";
const defaults = {
  intent: "MENU",
  foodType: "ANY",
  mild: false,
  minPrice: null,
  maxPrice: null,
  terms: [],
  mealTime: null,
  needsDietaryVerification: false,
} as const;
describe("live-model evaluation harness", () => {
  it("covers every demo concept with unique, grounded catalog rows", () => {
    const menu = demoEvaluationMenu();
    expect(menu).toHaveLength(160);
    expect(new Set(menu.map((item) => item.id)).size).toBe(160);
    expect(evaluationCases.some((row) => row.id.startsWith("hi-"))).toBe(true);
    expect(evaluationCases.some((row) => row.id.startsWith("hinglish-"))).toBe(
      true,
    );
    expect(
      evaluationCases.filter((row) => row.id.includes("injection")).length,
    ).toBeGreaterThanOrEqual(2);
  });
  it("reports passing classifications and aggregate usage without logging prompts", async () => {
    const run: EvaluationRunner = async (message, execute) => {
      const test = evaluationCases.find((row) => row.question === message)!;
      await execute({
        ...defaults,
        ...test.expected,
        terms: test.requiredTerm ? [test.requiredTerm] : [],
      });
      return { inputTokens: 10, outputTokens: 5 };
    };
    const result = await evaluateAssistant(run);
    expect(result.passed).toBe(true);
    expect(result.cases).toBe(18);
    expect(result.inputTokens).toBe(180);
    expect(result.outputTokens).toBe(90);
    expect(JSON.stringify(result)).not.toContain(evaluationCases[0]!.question);
  });
  it("fails the evaluation for incorrect dietary, language or scope classifications", async () => {
    const result = await evaluateAssistant(async (_message, execute) => {
      await execute({ ...defaults, terms: [] });
      return { inputTokens: 1, outputTokens: 1 };
    });
    expect(result.passed).toBe(false);
    expect(result.failed).toBeGreaterThan(10);
    expect(
      result.results.find((row) => row.id === "implicit-allergy")?.failures,
    ).toContain("Incorrect needsDietaryVerification");
  });
  it("records a failed request and continues the bounded set", async () => {
    const result = await evaluateAssistant(
      async () => {
        throw new Error("private provider payload");
      },
      evaluationCases.slice(0, 2),
    );
    expect(result.failed).toBe(2);
    expect(JSON.stringify(result)).not.toContain("private provider payload");
  });
});
