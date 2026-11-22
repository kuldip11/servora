import { createLogger } from "@/core/logger";
import { AssistantProtocolError } from "./assistant.errors";
import { metrics } from "@/core/observability/metrics";

export type AssistantFailureStage =
  "reservation" | "model" | "menu" | "protocol";
const logger = createLogger({}, "assistant");

export function reportAssistantFailure(
  stage: AssistantFailureStage,
  scope: { tenantId: string; branchId: string; durationMs?: number },
  error: unknown,
) {
  // Never log raw errors: provider messages/stacks may include customer text,
  // request headers, credentials or response bodies. Status is allowlisted.
  const status =
    error !== null && typeof error === "object" && "statusCode" in error
      ? error.statusCode
      : undefined;
  let timingReason: "timeout" | "aborted" | undefined;
  let cause: unknown = error;
  const seen = new Set<unknown>();
  for (
    let depth = 0;
    depth < 4 && cause && typeof cause === "object" && !seen.has(cause);
    depth++
  ) {
    seen.add(cause);
    const name = "name" in cause ? cause.name : undefined;
    if (name === "TimeoutError") {
      timingReason = "timeout";
      break;
    }
    if (name === "AbortError") timingReason = "aborted";
    cause = "cause" in cause ? cause.cause : undefined;
  }
  metrics.increment("servora_assistant_failures_total", { stage });
  logger.warn("assistant.request_failed", {
    ...scope,
    stage,
    ...(error instanceof AssistantProtocolError
      ? { reason: error.reason }
      : timingReason
        ? { reason: timingReason }
        : {}),
    ...(typeof status === "number" &&
    Number.isInteger(status) &&
    status >= 400 &&
    status <= 599
      ? { upstreamStatus: status }
      : {}),
  });
}
