import { redis } from "@/lib/redis";
import { metrics } from "@/core/observability/metrics";
// Aggregate counters only: never persist prompts, replies, session tokens or personal data.
export async function recordAssistantUsage(
  tenantId: string,
  inputTokens: number,
  outputTokens: number,
) {
  const key = `assistant:usage:${tenantId}:${new Date().toISOString().slice(0, 10)}`;
  try {
    const result = await redis
      .multi()
      .hincrby(key, "inputTokens", inputTokens)
      .hincrby(key, "outputTokens", outputTokens)
      .hincrby(key, "modelCalls", 1)
      .expire(key, 31 * 86400)
      .exec();
    if (!result || result.some(([error]) => error))
      throw new Error("Usage storage unavailable");
  } catch {
    // The reserved turn remains consumed even when telemetry fails.
    metrics.increment("servora_assistant_usage_write_failures_total");
  }
}
