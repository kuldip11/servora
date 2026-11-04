import type { AssistantQuestion, AssistantReply } from "@pos/contracts";
import {
  ForbiddenError,
  ServiceUnavailableError,
  ValidationError,
} from "@/core/errors";
import { customerSessionService } from "@/modules/customer/customer-session.service";
import { metrics } from "@/core/observability/metrics";
import { assistantEnabledForBranch } from "./assistant.config";
import { reserveAssistantTurn } from "./assistant.limits";
import { recordAssistantUsage } from "./assistant.usage";
import { runMenuTool } from "./assistant.model";
import { needsStaff } from "./assistant.safety";
import { greetingReply, reply } from "./assistant.responses";
import { applyFollowUp } from "./assistant.followup";
import { mergeClassification, parseQuestion } from "./assistant.nlu";

import { AssistantProtocolError } from "./assistant.errors";
import type { MenuSearchInput } from "./assistant.input";
import { assistantRecommendationService } from "./assistant-recommendation.service";
import {
  reportAssistantFailure,
  type AssistantFailureStage,
} from "./assistant.diagnostics";

export const assistantService = {
  async capabilities(token: string) {
    const session = await customerSessionService.getSession(token);
    return { enabled: assistantEnabledForBranch(session.branchId) };
  },
  async ask(
    token: string,
    question: AssistantQuestion,
    signal?: AbortSignal,
  ): Promise<AssistantReply> {
    const session = await customerSessionService.getSession(token);
    if (!assistantEnabledForBranch(session.branchId))
      throw new ForbiddenError(
        "Menu assistant is not enabled for this restaurant.",
      );
    const message = question.message.trim();
    if (!message) throw new ValidationError("Please enter a menu question.");
    const scope = { tenantId: session.tenantId, branchId: session.branchId };
    try {
      await reserveAssistantTurn(
        session.tenantId,
        session.id,
        session.expiresAt,
      );
    } catch (error) {
      // Keep quota rejection and fail-closed storage behavior intact.
      if (error instanceof ServiceUnavailableError)
        reportAssistantFailure("reservation", scope, error);
      throw error;
    }
    const canCallWaiter = session.mode === "DINE_IN";
    // Safety responses never require sending diner text to a provider.
    if (needsStaff(message)) return reply("ASK_STAFF", canCallWaiter);
    const parsed = parseQuestion(message);
    if (parsed.greeting) return greetingReply(canCallWaiter);

    let modelInput: MenuSearchInput | undefined;
    let stage: AssistantFailureStage = "model";
    const started = Date.now();
    try {
      let classified: MenuSearchInput | null = null;
      try {
        const usage = await runMenuTool(
          message,
          async (input) => {
            modelInput = input;
          },
          signal,
        );
        await recordAssistantUsage(
          session.tenantId,
          usage.inputTokens,
          usage.outputTokens,
        );
        metrics.increment(
          "servora_assistant_input_tokens_total",
          {},
          usage.inputTokens,
        );
        metrics.increment(
          "servora_assistant_output_tokens_total",
          {},
          usage.outputTokens,
        );
        stage = "protocol";
        if (!modelInput) throw new AssistantProtocolError("missing_tool");
        classified = modelInput;
      } catch (error) {
        // The diner closed the sheet: nothing to answer.
        if (signal?.aborted) throw error;
        // Provider hiccup, timeout or malformed tool call. The deterministic
        // parser answers the common questions (price, veg, popular, dish
        // names) so a flaky provider never means "assistant unavailable".
        reportAssistantFailure(
          error instanceof AssistantProtocolError ? "protocol" : "model",
          { ...scope, durationMs: Math.max(0, Date.now() - started) },
          error,
        );
        metrics.increment("servora_assistant_fallback_total");
      }
      stage = "menu";
      const merged = mergeClassification(classified, parsed);
      const input = applyFollowUp(merged, parsed, question.state);
      return await assistantRecommendationService.resolve(
        token,
        canCallWaiter,
        input,
      );
    } catch (error) {
      if (signal?.aborted) throw error;
      reportAssistantFailure(
        error instanceof AssistantProtocolError ? "protocol" : stage,
        { ...scope, durationMs: Math.max(0, Date.now() - started) },
        error,
      );
      throw new ServiceUnavailableError(
        "Menu assistant is temporarily unavailable. Please browse the menu or ask staff.",
      );
    } finally {
      metrics.observeDuration(
        "servora_assistant_duration_ms",
        Date.now() - started,
      );
    }
  },
};
