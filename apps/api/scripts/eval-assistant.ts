import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
// This command intentionally makes paid model calls only after explicit opt-in.
if (
  process.env["ASSISTANT_EVAL_LIVE"] !== "true" ||
  !process.env["AI_GATEWAY_API_KEY"] ||
  !process.env["ASSISTANT_MODEL"]
) {
  console.error(
    "Set ASSISTANT_EVAL_LIVE=true, AI_GATEWAY_API_KEY and ASSISTANT_MODEL explicitly to run the bounded live evaluation. No model calls were made.",
  );
  process.exit(1);
}
// Classification evaluation imports no database or Redis client and runs in its own process.
process.env["NODE_ENV"] = "test";
process.env["DATABASE_URL"] ??= "postgresql://unused:unused@127.0.0.1/unused";
process.env["REDIS_URL"] ??= "redis://127.0.0.1:6379";
process.env["JWT_SECRET"] ??= "evaluation-process-only-unused-secret";
const { runMenuTool } =
  await import("../src/modules/assistant/assistant.model");
const { evaluateAssistant } =
  await import("../src/modules/assistant/assistant.evaluation");
const result = await evaluateAssistant(runMenuTool);
const directory = resolve(process.cwd(), ".cache");
await mkdir(directory, { recursive: true });
await writeFile(
  resolve(directory, "assistant-evaluation.json"),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    passed: result.passed,
    cases: result.cases,
    failed: result.failed,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    failedCaseIds: result.results
      .filter((row) => !row.passed)
      .map((row) => row.id),
  }),
);
process.exitCode = result.passed ? 0 : 1;
